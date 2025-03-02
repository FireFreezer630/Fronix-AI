// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';
import { fetchChatCompletion, performWebSearch } from './services/api';
import { Bars3Icon, PencilIcon, CheckIcon } from '@heroicons/react/24/solid';
import './App.css';

function App() {
  // Load conversations from localStorage
  const [conversations, setConversations] = useState(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      try {
        return JSON.parse(savedConversations);
      } catch (error) {
        console.error('Error parsing saved conversations:', error);
        return [{ id: Date.now(), title: 'New Chat', messages: [] }];
      }
    }
    return [{ id: Date.now(), title: 'New Chat', messages: [] }];
  });

  // Load current conversation ID from localStorage
  const [currentConversationId, setCurrentConversationId] = useState(() => {
    const savedId = localStorage.getItem('currentConversationId');
    if (savedId) {
      return parseInt(savedId, 10);
    }
    return conversations[0]?.id;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [apiSettings, setApiSettings] = useState(() => {
    const saved = localStorage.getItem('apiSettings');
    return saved ? JSON.parse(saved) : {
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      tavilyApiKey: import.meta.env.VITE_TAVILY_API_KEY || '',
      endpoint: import.meta.env.VITE_API_ENDPOINT || 'https://models.inference.ai.azure.com',
      modelName: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 8000,
      darkMode: false
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant with web search capabilities.');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const titleInputRef = useRef(null);
  
  // Fetch system prompt with current date from external API on mount
  useEffect(() => {
    fetch('http://worldtimeapi.org/api/timezone/UTC')
      .then(response => response.json())
      .then(data => {
        const date = new Date(data.utc_datetime);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'long',
          day: '2-digit',
          year: 'numeric'
        });
        const prompt = `You are a helpful assistant with web search capabilities. The current date is ${formattedDate}. 
        
When performing web searches, you can customize the search parameters based on the user's query:
- search_depth: Use 'advanced' for complex queries requiring in-depth information, 'basic' for simple queries (default: basic)
- max_results: Number of results to return, 1-20 (default: 5)
- time_range: Filter by time - 'day', 'week', 'month', 'year' (use for time-sensitive queries)
- include_answer: Set to true to include an AI-generated summary of the search results (default: true)
- include_images: Set to true to include image search results (useful for visual topics)
- include_domains/exclude_domains: Arrays of specific domains to include or exclude

Guidelines for choosing parameters:
- For recent news or events: use time_range='day' or 'week' and max_results=10
- For research topics: use search_depth='advanced' and max_results=15
- For simple factual questions: use search_depth='basic' and max_results=3
- For visual topics (art, design, places): use include_images=true
- For technical documentation: consider using include_domains with specific technical sites

Always choose parameters that best serve the user's information needs.`;
        setSystemPrompt(prompt);
      })
      .catch(error => {
        console.error('Error fetching date from WorldTimeAPI:', error);
        // Fallback to local date if API fails
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', {
          month: 'long',
          day: '2-digit',
          year: 'numeric'
        });
        setSystemPrompt(`You are a helpful assistant with web search capabilities. The current date is ${formattedDate} (local fallback).
        
When performing web searches, you can customize the search parameters based on the user's query:
- search_depth: Use 'advanced' for complex queries requiring in-depth information, 'basic' for simple queries (default: basic)
- max_results: Number of results to return, 1-20 (default: 5)
- time_range: Filter by time - 'day', 'week', 'month', 'year' (use for time-sensitive queries)
- include_answer: Set to true to include an AI-generated summary of the search results (default: true)
- include_images: Set to true to include image search results (useful for visual topics)
- include_domains/exclude_domains: Arrays of specific domains to include or exclude

Guidelines for choosing parameters:
- For recent news or events: use time_range='day' or 'week' and max_results=10
- For research topics: use search_depth='advanced' and max_results=15
- For simple factual questions: use search_depth='basic' and max_results=3
- For visual topics (art, design, places): use include_images=true
- For technical documentation: consider using include_domains with specific technical sites

Always choose parameters that best serve the user's information needs.
`);
      });
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (apiSettings.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [apiSettings.darkMode]);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
    localStorage.setItem('currentConversationId', currentConversationId);
    localStorage.setItem('apiSettings', JSON.stringify(apiSettings));
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
  }, [conversations, currentConversationId, apiSettings, isSidebarCollapsed]);

  // Find the current conversation
  const currentConversation = conversations.find(conv => conv.id === currentConversationId) || conversations[0];

  // Update edited title when conversation changes
  useEffect(() => {
    if (currentConversation) {
      setEditedTitle(currentConversation.title);
    }
  }, [currentConversation]);

  const createNewConversation = () => {
    const newConversation = {
      id: Date.now(),
      title: 'New Chat',
      messages: []
    };
    setConversations([...conversations, newConversation]);
    setCurrentConversationId(newConversation.id);
  };

  const deleteConversation = (id) => {
    const newConversations = conversations.filter(conv => conv.id !== id);
    setConversations(newConversations);
    if (newConversations.length === 0) {
      const newConversation = { id: Date.now(), title: 'New Chat', messages: [] };
      setConversations([newConversation]);
      setCurrentConversationId(newConversation.id);
    } else if (id === currentConversationId) {
      setCurrentConversationId(newConversations[0].id);
    }
  };

  const updateConversationTitle = (id, title) => {
    setConversations(conversations.map(conv =>
      conv.id === id ? { ...conv, title } : conv
    ));
  };

  const sendMessage = async (messageContent) => {
    if (!messageContent.trim()) return;
    if (!apiSettings.apiKey || !apiSettings.tavilyApiKey) {
      setIsSettingsOpen(true);
      return;
    }

    const userMessage = { role: 'user', content: messageContent, timestamp: Date.now() };
    const isFirstMessage = currentConversation.messages.length === 0;
    let newConversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, userMessage]
    };
    if (isFirstMessage) {
      newConversation.title = messageContent.substring(0, 30) + (messageContent.length > 30 ? '...' : '');
    }
    setConversations(prev => prev.map(conv => conv.id === currentConversationId ? newConversation : conv));

    setIsLoading(true);
    let messages = [
      { role: 'system', content: systemPrompt }, // Use dynamic system prompt here
      ...newConversation.messages.map(msg => ({ role: msg.role, content: msg.content }))
    ];

    try {
      const response = await fetchChatCompletion(messages, apiSettings);
      if (response.finish_reason === 'tool_calls') {
        const toolCall = response.message.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'performWebSearch') {
          const functionArgs = JSON.parse(toolCall.function.arguments);
          const searchingMessage = { role: 'system', content: 'Searching the web...', timestamp: Date.now() };
          setConversations(prev => prev.map(conv => conv.id === currentConversationId ? {
            ...conv,
            messages: [...conv.messages, searchingMessage]
          } : conv));

          // Extract search parameters from functionArgs
          const { query, ...searchOptions } = functionArgs;
          
          // Log search parameters for debugging
          console.log('Web search query:', query);
          console.log('Web search options:', searchOptions);
          
          // Create a description of the search parameters for the user
          let searchDescription = `Searching for: "${query}"`;
          
          // Add search parameters details
          const searchParams = [];
          
          if (searchOptions.search_depth === 'advanced') {
            searchParams.push('advanced search');
          }
          
          if (searchOptions.max_results) {
            const resultsText = searchOptions.max_results === 1 ? 'result' : 'results';
            searchParams.push(`${searchOptions.max_results} ${resultsText}`);
          }
          
          if (searchOptions.time_range) {
            const timeRangeMap = {
              'day': 'past day',
              'd': 'past day',
              'week': 'past week',
              'w': 'past week',
              'month': 'past month',
              'm': 'past month',
              'year': 'past year',
              'y': 'past year'
            };
            searchParams.push(timeRangeMap[searchOptions.time_range] || searchOptions.time_range);
          }
          
          if (searchOptions.include_images) {
            searchParams.push('with images');
          }
          
          if (searchOptions.include_answer) {
            searchParams.push('with AI summary');
          }
          
          if (searchParams.length > 0) {
            searchDescription += ` (${searchParams.join(', ')})`;
          }
          
          // Update the searching message with the description
          const updatedSearchingMessage = { 
            role: 'system', 
            content: searchDescription, 
            timestamp: Date.now() 
          };
          
          setConversations(prev => prev.map(conv => conv.id === currentConversationId ? {
            ...conv,
            messages: [...conv.messages.filter(msg => msg.content !== 'Searching the web...'), updatedSearchingMessage]
          } : conv));

          const searchResult = await performWebSearch(query, apiSettings.tavilyApiKey, searchOptions);
          const toolResponse = {
            role: 'tool',
            content: searchResult,
            tool_call_id: toolCall.id,
          };
          messages = [...messages, response.message, toolResponse];
          const finalResponse = await fetchChatCompletion(messages, apiSettings);
          const assistantMessage = { role: 'assistant', content: finalResponse.message.content, timestamp: Date.now() };
          setConversations(prev => prev.map(conv => conv.id === currentConversationId ? {
            ...conv,
            messages: [...conv.messages.filter(msg => msg.content.startsWith('Searching')), assistantMessage]
          } : conv));
        }
      } else {
        const assistantMessage = { role: 'assistant', content: response.message.content, timestamp: Date.now() };
        setConversations(prev => prev.map(conv => conv.id === currentConversationId ? {
          ...conv,
          messages: [...conv.messages, assistantMessage]
        } : conv));
      }
    } catch (error) {
      const errorMessage = { role: 'system', content: `Error: ${error.message || 'Failed to get response.'}`, timestamp: Date.now() };
      setConversations(prev => prev.map(conv => conv.id === currentConversationId ? {
        ...conv,
        messages: [...conv.messages, errorMessage]
      } : conv));
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing the title
  const startEditing = () => {
    setEditedTitle(currentConversation.title);
    setIsEditing(true);
    // Focus the input after it renders
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 10);
  };

  // Save the edited title
  const saveTitle = () => {
    if (editedTitle.trim()) {
      updateConversationTitle(currentConversation.id, editedTitle.trim());
    } else {
      setEditedTitle(currentConversation.title);
    }
    setIsEditing(false);
  };

  // Handle key press in title input
  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedTitle(currentConversation.title);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className={`app ${apiSettings.darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className={`sidebar-container ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={setCurrentConversationId}
          onNewConversation={createNewConversation}
          onDeleteConversation={deleteConversation}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isCollapsed={isSidebarCollapsed}
        />
      </div>
      <main className="main-content">
        <div className="chat-header glassmorphic-card">
          <button className="menu-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <Bars3Icon className="icon-sm" />
          </button>
          {isEditing ? (
            <div className="chat-title-edit">
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={handleTitleKeyDown}
                className="chat-title-input"
                maxLength={50}
              />
              <button className="title-action-btn" onClick={saveTitle}>
                <CheckIcon className="icon-sm" />
              </button>
            </div>
          ) : (
            <div className="chat-title">
              <h2>{currentConversation?.title || 'New Chat'}</h2>
              <button className="title-action-btn" onClick={startEditing}>
                <PencilIcon className="icon-sm" />
              </button>
            </div>
          )}
        </div>
        <ChatWindow
          conversation={currentConversation}
          onSendMessage={sendMessage}
          isLoading={isLoading}
          onRenameConversation={updateConversationTitle}
        />
      </main>
      {isSettingsOpen && (
        <SettingsModal
          settings={apiSettings}
          onSave={(settings) => {
            setApiSettings(settings);
            setIsSettingsOpen(false);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';
import { fetchChatCompletion, performWebSearch, generateImage } from './services/api';
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

  // Load API settings from environment variables first, then localStorage
  const [apiSettings, setApiSettings] = useState(() => {
    const saved = localStorage.getItem('apiSettings');
    const savedSettings = saved ? JSON.parse(saved) : {};
    
    return {
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || savedSettings.apiKey || '',
      tavilyApiKey: import.meta.env.VITE_TAVILY_API_KEY || savedSettings.tavilyApiKey || '',
      endpoint: import.meta.env.VITE_API_ENDPOINT || savedSettings.endpoint || 'https://models.inference.ai.azure.com',
      modelName: savedSettings.modelName || 'gpt-4o',
      temperature: savedSettings.temperature || 0.7,
      maxTokens: savedSettings.maxTokens || 8000,
      darkMode: savedSettings.darkMode || false
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant with web search and image generation capabilities.');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const titleInputRef = useRef(null);
  const sidebarRef = useRef(null);
  const mainContentRef = useRef(null);
  
  // Set system prompt with current date
  useEffect(() => {
    // Get current date locally instead of relying on external API
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric'
    });
    
    const prompt = `You are a helpful assistant with web search and image generation capabilities. The current date is ${formattedDate}. 
    For image generation, you can create images by using the generateImage function with a descriptive prompt.
The image will be generated using Pollinations.ai and displayed directly in the chat.

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

  // Handle click outside sidebar to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !isSidebarCollapsed && 
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target) &&
        mainContentRef.current && 
        mainContentRef.current.contains(event.target)
      ) {
        setIsSidebarCollapsed(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarCollapsed]);

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
    if (!apiSettings.apiKey) {
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
        
        // Handle web search
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
        // Handle image generation
        else if (toolCall.type === 'function' && toolCall.function.name === 'generateImage') {
          const functionArgs = JSON.parse(toolCall.function.arguments);
          const generatingMessage = { 
            role: 'system', 
            content: `Generating image: "${functionArgs.prompt}"`, 
            timestamp: Date.now() 
          };
          
          setConversations(prev => prev.map(conv => conv.id === currentConversationId ? {
            ...conv,
            messages: [...conv.messages, generatingMessage]
          } : conv));

          const imageUrl = await generateImage(functionArgs.prompt);
          const toolResponse = {
            role: 'tool',
            content: JSON.stringify({ url: imageUrl }),
            tool_call_id: toolCall.id,
          };
          
          messages = [...messages, response.message, toolResponse];
          const finalResponse = await fetchChatCompletion(messages, apiSettings);
          
          // Process the response to convert image URLs to markdown
          let processedContent = finalResponse.message.content;
          
          // Create a message with the processed content
          const assistantMessage = { 
            role: 'assistant', 
            content: processedContent, 
            timestamp: Date.now(),
            imageUrl: imageUrl // Store the image URL directly in the message
          };
          
          setConversations(prev => prev.map(conv => conv.id === currentConversationId ? {
            ...conv,
            messages: [...conv.messages.filter(msg => !msg.content.startsWith('Generating image')), assistantMessage]
          } : conv));
        }
      } else {
        // Process regular text responses
        let processedContent = response.message.content;
        
        // Check for pollinations.ai URLs and convert them to markdown image syntax
        const pollinationsRegex = /https:\/\/pollinations\.ai\/prompt\/([^)\s]+)/g;
        processedContent = processedContent.replace(pollinationsRegex, (match) => {
          return `![Generated Image](${match})`;
        });
        
        const assistantMessage = { 
          role: 'assistant', 
          content: processedContent, 
          timestamp: Date.now() 
        };
        
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
      <div className={`sidebar-container ${isSidebarCollapsed ? 'collapsed' : ''}`} ref={sidebarRef}>
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={setCurrentConversationId}
          onNewConversation={createNewConversation}
          onDeleteConversation={deleteConversation}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onCollapseSidebar={() => setIsSidebarCollapsed(true)}
        />
      </div>
      <main className="main-content" ref={mainContentRef}>
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
// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';
import { fetchChatCompletion, performWebSearch, generateImage, performReasoning } from './services/api.jsx';
import { Bars3Icon, PencilIcon, CheckIcon } from '@heroicons/react/24/solid';
import './App.css';

// Helper function to create status message for tool calls
const getStatusMessage = (functionName, args) => {
  switch (functionName) {
    case 'performWebSearch':
      const searchParams = [];
      if (args.search_depth === 'advanced') searchParams.push('advanced search');
      if (args.max_results) searchParams.push(`${args.max_results} results`);
      if (args.time_range) searchParams.push(`from ${args.time_range}`);
      return `Searching for: "${args.query}"${searchParams.length ? ` (${searchParams.join(', ')})` : ''}`;
    case 'performReasoning':
      return `Reasoning about: "${args.query}"`;
    case 'generateImage':
      return `Generating image: "${args.prompt}"`;
    default:
      return 'Processing...';
  }
};

// Helper function to process assistant response with tool results
// Enhanced image handling in processAssistantResponse
const processAssistantResponse = (response, toolResponses) => {
  let processedContent = response.message.content;
  const timestamp = Date.now();

  // Check for image URLs in tool responses
  const imageToolResponses = toolResponses.filter(tr => {
    try {
      const content = JSON.parse(tr.content);
      return content.url && content.url.includes('pollinations.ai');
    } catch (e) {
      return false;
    }
  });

  if (imageToolResponses.length > 0) {
    // You can handle multiple images if needed
    const imageUrls = imageToolResponses.map(tr => {
      try {
        return JSON.parse(tr.content).url;
      } catch (e) {
        return null;
      }
    }).filter(url => url);

    return { 
      role: 'assistant',
      content: processedContent,
      timestamp,
      imageUrls: imageUrls,
      // Keep the first one for backward compatibility
      imageUrl: imageUrls[0]
    };
  }

  // Process any pollinations.ai URLs in the content
  const pollinationsRegex = /https:\/\/pollinations\.ai\/prompt\/([^)\s]+)/g;
  processedContent = processedContent.replace(pollinationsRegex, (match) => {
    return `![Generated Image](${match})`;
  });

  return {
    role: 'assistant',
    content: processedContent,
    timestamp
  };
};

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
      darkMode: savedSettings.darkMode || false,
      streamingEnabled: savedSettings.streamingEnabled !== undefined ? savedSettings.streamingEnabled : true
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant with web search and image generation capabilities.');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const titleInputRef = useRef(null);
  const sidebarRef = useRef(null);
  const mainContentRef = useRef(null);
  
  // For streaming support
  const [currentlyStreamingId, setCurrentlyStreamingId] = useState(null);
  const abortControllerRef = useRef(null);
  
  // Set system prompt with current date
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric'
    });
    
    const prompt = `# AI Assistant System Prompt## General Guidelines- You are an AI assistant with web search and image generation capabilities. - The current date is ${formattedDate}. - Keep responses **clear, concise, and direct**. - Avoid **unnecessary fluff or marketing language**. - Adapt your tone to **match the user's style and preferences**. ---## Tools### Web SearchThe **web search tool** helps find recent news, verify facts, and research up-to-date topics. Use this tool when responding to:- **Breaking News** – Get the latest updates on politics, technology, finance, and other time-sensitive topics. - **Fact-Checking** – Verify claims, statistics, or statements with reliable sources. - **In-Depth Research** – Retrieve articles, reports, or expert insights on technical or niche subjects. - **Industry Trends** – Find recent developments in AI, cryptocurrency, business, and science. #### Search Parameters- **Breaking news**: time_range='day' or 'week', max_results=10+. - **In-depth research**: search_depth='advanced', max_results=15. - **Quick facts**: search_depth='basic', max_results=3-5. - **Visual topics**: Enable include_images=true for image-based searches. - **Technical subjects**: Use include_domains for industry-specific sources. ---### Image GenerationThe **image generation tool** creates AI-generated images based on detailed descriptions. Use this tool for:- **Creative Illustrations** – Concept art, landscapes, fantasy scenes, etc. - **Visual Explanations** – Diagrams, infographics, or representations of abstract concepts. - **Aesthetic Designs** – Artistic renderings in various styles and moods. #### How to Use- Be **specific** in your prompt: include **subject, style, composition, lighting, mood, and colors**. - Example: "A futuristic city skyline at sunset, neon lights reflecting on wet streets, cyberpunk style." - Describe every important detail **clearly**. - **Generate only one image per request**. ---### Reasoning ToolThe **reasoning tool** allows for **complex problem-solving, logical reasoning, and structured analysis**. Use this tool for:- **Breaking down complex concepts** – Explain intricate subjects step by step. - **Evaluating arguments** – Analyze pros, cons, and logical consistency. - **Solving puzzles or riddles** – Work through logical sequences and patterns. - **Providing data-driven insights** – Interpret trends, probabilities, or structured datasets. - **Making decisions** – Compare different options with clear reasoning. #### How It Works- Uses **structured reasoning**, logical deductions, and systematic comparisons. - Breaks down problems into **manageable parts**. - Does **not** retrieve new data but works with provided information, logical rules, and general knowledge. #### Example Uses- **Logical analysis**: "Is this argument logically valid?" - **Decision-making**: "Which of these two investment strategies is better?" - **Pattern recognition**: "What's the next number in this sequence?" - **Strategic thinking**: "What is the best way to approach this business challenge?" ---## Guidelines- **Be accurate and concise** – Get to the point without unnecessary words. - **Cite sources** when providing web search results. - **Explain reasoning** when answering complex questions. - **Suggest web searches** when recent or detailed information is needed. - **Use structured reasoning**, not factual lookups. If current data is needed, suggest a web search. - **Explain each step clearly** in multi-step problems. - **Keep responses clear and natural** – No marketing language or filler words. - **Avoid speculation** – Base reasoning on logic and known principles. - **Offer image generation** for visually-oriented topics.`;
    
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

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  const updateConversationTitle = async (id, title) => {
    try {
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === id ? { ...conv, title } : conv
        )
      );
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  const handleStreamingResponse = (chunk, conversationId, messageId) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      
      const messages = [...conv.messages];
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex !== -1) {
        // Update existing message
        messages[messageIndex] = {
          ...messages[messageIndex],
          content: messages[messageIndex].content + chunk
        };
      }
      
      return { ...conv, messages };
    }));
  };

  // Function to stop streaming
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setCurrentlyStreamingId(null);
    }
  };

  const sendMessage = async (messageContent, file) => {
    if (!messageContent.trim() && !file) return;
    if (!apiSettings.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    // Create a new abort controller for this request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let userMessage = { role: 'user', content: messageContent, timestamp: Date.now() };
    
    if (file) {
      try {
        const uploadingMessage = { role: 'system', content: `Uploading ${file.name}...`, timestamp: Date.now() };
        setConversations(prev => prev.map(conv => conv.id === currentConversationId ? {
          ...conv,
          messages: [...conv.messages, uploadingMessage]
        } : conv));
        
        const fileBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        
        const fileType = file.type.includes('image') ? 'image' : 'document';
        const imageUrl = fileType === 'image' ? fileBase64 : null;
        userMessage = { 
          role: 'user', 
          content: messageContent ? messageContent : `[Uploaded ${fileType}: ${file.name}]`, 
          timestamp: Date.now(),
          file: {
            name: file.name,
            type: file.type,
            data: fileBase64
          },
          uploadedImage: imageUrl
        };
        
        setConversations(prev => prev.map(conv => conv.id === currentConversationId ? {
          ...conv,
          messages: conv.messages.filter(msg => !msg.content.startsWith('Uploading'))
        } : conv));
      } catch (error) {
        console.error('Error processing file:', error);
        const errorMessage = { role: 'system', content: `Error uploading file: ${error.message}`, timestamp: Date.now() };
        setConversations(prev => prev.map(conv => conv.id === currentConversationId ? {
          ...conv,
          messages: [...conv.messages.filter(msg => !msg.content.startsWith('Uploading')), errorMessage]
        } : conv));
        return;
      }
    }

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
      { role: 'system', content: systemPrompt },
      ...newConversation.messages.map(msg => {
        if (msg.file) {
          return {
            role: msg.role,
            content: msg.content,
            uploadedImage: msg.uploadedImage
          };
        }
        return { role: msg.role, content: msg.content };
      })
    ];

    try {
      // Determine if we should use streaming based on settings
      const useStreaming = false; //apiSettings.streamingEnabled;

      // Initial completion request
      if (useStreaming) {
        
      } else {
        // Non-streaming implementation (original code)
        const response = await fetchChatCompletion(messages, apiSettings);

        // Handle tool calls if present
        if (response.requiresToolCalls && response.message.tool_calls) {
          const toolResponses = [];

          // Process each tool call sequentially
          for (const toolCall of response.message.tool_calls) {
            if (toolCall.type !== 'function') continue;

            let toolResult;
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            // Add temporary message to show tool status
            const statusMessage = { 
              role: 'system',
              content: getStatusMessage(functionName, functionArgs),
              timestamp: Date.now()
            };

            setConversations(prev => prev.map(conv =>
              conv.id === currentConversationId
                ? { ...conv, messages: [...conv.messages, statusMessage] }
                : conv
            ));

            if (functionName === 'performWebSearch') {
              const { query, ...searchOptions } = functionArgs;
              toolResult = await performWebSearch(query, apiSettings.tavilyApiKey, searchOptions);
            } else if (functionName === 'performReasoning') {
              toolResult = await performReasoning(functionArgs.query, {
                depth: functionArgs.depth || 'advanced'
              });
            } else if (functionName === 'generateImage') {
              const imageUrl = await generateImage(functionArgs.prompt);
              toolResult = JSON.stringify({ url: imageUrl });
            }

            // Create tool response
            const toolResponse = {
              role: 'tool',
              content: toolResult,
              tool_call_id: toolCall.id
            };
            toolResponses.push(toolResponse);
          }

          // Make final completion request with all tool responses
          const finalMessages = [...messages, response.message, ...toolResponses];
          const finalResponse = await fetchChatCompletion(
            finalMessages,
            apiSettings
          );

          // Process the final response
          const assistantMessage = processAssistantResponse(finalResponse, toolResponses);
          
          // Update conversation with final response
          setConversations(prev => prev.map(conv => 
            conv.id === currentConversationId 
              ? {
                  ...conv,
                  messages: [
                    ...conv.messages.filter(msg => !msg.content.startsWith('Searching') && 
                                               !msg.content.startsWith('Reasoning') && 
                                               !msg.content.startsWith('Generating')),
                    assistantMessage
                  ]
                }
              : conv
          ));
        } else {
          // Handle regular response without tool calls
          let processedContent = response.message.content;
          
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
      }
    } catch (error) {
      // Don't show error for aborted requests
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
      } else {
        const errorMessage = { 
          role: 'system', 
          content: `Error: ${error.message || 'Failed to get response.'}`, 
          timestamp: Date.now() 
        };
        
        setConversations(prev => prev.map(conv => conv.id === currentConversationId ? {
          ...conv,
          messages: [...conv.messages, errorMessage]
        } : conv));
      }
    } finally {
      setIsLoading(false);
      setCurrentlyStreamingId(null);
      abortControllerRef.current = null;
    }
  };

  const startEditing = () => {
    setEditedTitle(currentConversation.title);
    setIsEditing(true);
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 10);
  };

  const saveTitle = () => {
    if (editedTitle.trim()) {
      updateConversationTitle(currentConversation.id, editedTitle.trim());
    } else {
      setEditedTitle(currentConversation.title);
    }
    setIsEditing(false);
  };

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

  // Auto chat renaming logic: Rename when conversation has exactly 2 messages and title is still 'New Chat'
  useEffect(() => {
    const currentConv = conversations.find(conv => conv.id === currentConversationId);
    if (currentConv && currentConv.title === 'New Chat' && currentConv.messages.length === 2) {
      renameConversation(currentConv.id);
    }
  }, [conversations, currentConversationId]);

  // Function to rename conversation using mistral-small model
  const renameConversation = async (conversationId) => {
    const currentConv = conversations.find(conv => conv.id === conversationId);
    if (!currentConv || currentConv.messages.length < 2) return;

    const summaryMessages = [
      {
        role: 'system',
        content: 'Summarize the following conversation into a short title (max 5 words):'
      },
      ...currentConv.messages.slice(0, 2)
    ];

    try {
      const response = await fetchChatCompletion(summaryMessages, {
        ...apiSettings,
        modelName: 'Mistral-small', // Corrected to lowercase
        temperature: 0.8, // More deterministic output
        maxTokens: 20 // Short output for a title
      });

      const newTitle = response.message.content.trim();
      if (newTitle) {
        updateConversationTitle(conversationId, newTitle);
        console.log('Conversation renamed to:', newTitle);
      } else {
        console.warn('Generated title is empty');
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
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
          settings={apiSettings}
          isStreaming={currentlyStreamingId !== null}
          onStopStreaming={stopStreaming}
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

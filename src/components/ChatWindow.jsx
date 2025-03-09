// src/components/ChatWindow.jsx
import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, ArrowPathIcon, ClipboardDocumentIcon, PhotoIcon, DocumentIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';

export const ChatWindow = ({ conversation, onSendMessage, isLoading, onRenameConversation, settings }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const endOfMessagesRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((message.trim() || selectedFile) && !isLoading) {
      onSendMessage(message, selectedFile);
      setMessage('');
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    fileInputRef.current.value = '';
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Debug logging
  useEffect(() => {
    console.log('Current conversation:', conversation);
    if (conversation?.messages) {
      console.log('Messages count:', conversation.messages.length);
      conversation.messages.forEach((msg, i) => {
        console.log(`Message ${i}:`, msg.role, msg.content.substring(0, 50) + '...');
      });
    }
  }, [conversation]);

  // Process message content to handle special formats
  const processMessageContent = (content, imageUrl) => {
    // Check if the message has a direct imageUrl property (from image generation)
    if (imageUrl) {
      return (
        <>
          <div className="markdown-content">
            <ReactMarkdown components={{
              img: () => null // Prevent rendering images from markdown content
            }}>
              {content}
            </ReactMarkdown>
          </div>
          <div className="generated-image-container">
            <img 
              src={imageUrl} 
              alt="Generated" 
              className="generated-image" 
              loading="lazy"
            />
            <p className="image-caption">Generated image</p>
          </div>
        </>
      );
    }
    
    // Regular content with markdown rendering
    return <ReactMarkdown>{content}</ReactMarkdown>;
  };

  // Render messages safely
  const renderMessages = () => {
    // Check if conversation and messages exist
    if (!conversation || !conversation.messages || !Array.isArray(conversation.messages)) {
      console.error('Invalid conversation or messages:', conversation);
      return (
        <div className="error-message">
          <p>Error: Could not load messages. Please refresh the page.</p>
        </div>
      );
    }

    // If no messages, show empty state
    if (conversation.messages.length === 0) {
      return (
        <div className="empty-state">
          <h2>Welcome to AI Chat Assistant</h2>
          <p>Ask me anything, search the web, or generate images!</p>
        </div>
      );
    }

    // Render messages
    return conversation.messages.map((msg, index) => {
      if (!msg || !msg.role || !msg.content) {
        console.error('Invalid message at index', index, msg);
        return null;
      }
      
      return (
        <div key={msg.timestamp || index} className={`message ${msg.role}`}>
          <div className="message-content">
            {processMessageContent(msg.content, msg.imageUrl)}
            {msg.role === 'assistant' && (
              <button
                className="copy-button"
                onClick={() => navigator.clipboard.writeText(msg.content)}
                title="Copy to clipboard"
              >
                <ClipboardDocumentIcon className="icon" />
              </button>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="chat-window">
      <div className="messages-container" ref={messagesContainerRef}>
        {renderMessages()}
        
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content thinking">
              Thinking<span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>
      
      <form className="message-input-container glassmorphic-card" onSubmit={handleSubmit}>
        {selectedFile && (
          <div className="selected-file">
            <span className="file-name">
              {selectedFile.type.includes('image') ? (
                <PhotoIcon className="file-icon" />
              ) : (
                <DocumentIcon className="file-icon" />
              )}
              {selectedFile.name}
            </span>
            <button 
              type="button" 
              className="remove-file-btn" 
              onClick={removeSelectedFile}
              aria-label="Remove file"
            >
              ×
            </button>
          </div>
        )}
        <div className="input-row">
          <div className="input-actions">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,.pdf"
            />
            <button
              type="button"
              className="upload-button"
              onClick={triggerFileInput}
              aria-label="Upload file"
            >
              <PhotoIcon className="icon-sm" />
            </button>
          </div>
          <textarea
            ref={textareaRef}
            className="message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message, ask a question, or upload a file..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="input-actions">
            <button
              type="submit"
              className="send-button"
              disabled={(!message.trim() && !selectedFile) || isLoading}
              aria-label="Send message"
            >
              {isLoading ? (
                <ArrowPathIcon className="icon spinning" />
              ) : (
                <PaperAirplaneIcon className="icon" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
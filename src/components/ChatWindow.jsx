import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';

export const ChatWindow = ({ conversation, onSendMessage, isLoading, onRenameConversation }) => {
  const [message, setMessage] = useState('');
  const endOfMessagesRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
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
          <p>Ask me anything or type a command to get started.</p>
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
          <div className="message-avatar">
            {msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '🤖' : '⚠️'}
          </div>
          <div className="message-content">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
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
      
      <form className="message-input-container" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="message-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!message.trim() || isLoading}
          aria-label="Send message"
        >
          {isLoading ? (
            <ArrowPathIcon className="icon spinning" />
          ) : (
            <PaperAirplaneIcon className="icon" />
          )}
        </button>
      </form>
    </div>
  );
};
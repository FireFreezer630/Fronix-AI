import React from 'react';
import { PlusIcon, TrashIcon, Cog6ToothIcon, ChatBubbleLeftRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

export const Sidebar = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenSettings,
  isCollapsed,
  onCollapseSidebar
}) => {
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header glassmorphic-card">
        <button className="new-chat-btn" onClick={onNewConversation}>
          {isCollapsed ? <PlusIcon className="icon-sm" /> : (
            <>
              <PlusIcon className="icon" /> New Chat
            </>
          )}
        </button>
        {!isCollapsed && (
          <button 
            className="sidebar-close-btn" 
            onClick={onCollapseSidebar}
            aria-label="Close sidebar"
          >
            <ChevronLeftIcon className="icon-sm" />
          </button>
        )}
      </div>
      
      <div className="conversations-list">
        {conversations.length === 0 ? (
          <div className="empty-conversations">
            {!isCollapsed && <p>No conversations yet</p>}
          </div>
        ) : (
          conversations.map(conversation => (
            <div
              key={conversation.id}
              className={`conversation-item ${conversation.id === currentConversationId ? 'active' : ''}`}
              onClick={() => onSelectConversation(conversation.id)}
              title={conversation.title}
            >
              <div className="conversation-icon">
                <ChatBubbleLeftRightIcon className="icon-sm" />
              </div>
              {!isCollapsed && <span className="conversation-title">{conversation.title}</span>}
              {!isCollapsed && (
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                  aria-label="Delete conversation"
                >
                  <TrashIcon className="icon-sm" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="sidebar-footer">
        <button className="settings-btn" onClick={onOpenSettings}>
          {isCollapsed ? <Cog6ToothIcon className="icon-sm" /> : (
            <>
              <Cog6ToothIcon className="icon" /> Settings
            </>
          )}
        </button>
        {!isCollapsed && (
          <div className="app-info">
            <p className="app-version">AI Chat Assistant v1.0</p>
          </div>
        )}
      </div>
    </aside>
  );
};
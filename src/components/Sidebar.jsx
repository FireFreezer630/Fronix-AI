import React from 'react';
import { PlusIcon, TrashIcon, Cog6ToothIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export const Sidebar = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenSettings,
  isCollapsed
}) => {
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onNewConversation}>
          {isCollapsed ? <PlusIcon className="icon-sm" /> : (
            <>
              <PlusIcon className="icon" /> New Chat
            </>
          )}
        </button>
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
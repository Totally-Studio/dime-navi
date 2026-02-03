import React from 'react';
import { ChatHistory } from '../../../types';
import { useAuth } from '../../../src/hooks/useAuth';

interface LeftSidebarProps {
  conversations: ChatHistory[];
  onNewChat: () => void;
  onLoadChat: (chat: ChatHistory) => void;
  onDeleteChat?: (chatId: string) => void;
  onDeleteAllChats?: () => void;
  activeChatId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  sourceCount: number;
  hasMessages: boolean;
  // Mobile overlay props
  isMobileOverlay?: boolean;
  onClose?: () => void;
  // Sign-in prompt callback (optional - if provided, shows prompt instead of direct Google sign-in)
  onShowSignInPrompt?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  conversations,
  onNewChat,
  onLoadChat,
  onDeleteChat,
  onDeleteAllChats,
  activeChatId,
  isCollapsed,
  onToggleCollapse,
  sourceCount,
  hasMessages,
  isMobileOverlay = false,
  onClose,
  onShowSignInPrompt,
}) => {
  const { user, isAnonymous, signInWithGoogle, logout } = useAuth();
  const [isLogoutConfirm, setIsLogoutConfirm] = React.useState(false);

  // Extract short display name: first name from displayName, or email prefix as fallback
  const getShortName = (u: typeof user): string => {
    if (u?.displayName) {
      return u.displayName.split(' ')[0];
    }
    if (u?.email) {
      return u.email.split('@')[0];
    }
    return 'User';
  };

  const handleLoginClick = async () => {
    // If sign-in prompt callback is provided, use it; otherwise direct Google sign-in
    if (onShowSignInPrompt) {
      onShowSignInPrompt();
    } else {
      await signInWithGoogle();
    }
  };

  const handleLogoutClick = async () => {
    if (!isLogoutConfirm) {
      // First click - show confirmation
      setIsLogoutConfirm(true);
      // Reset after 3 seconds if not confirmed
      setTimeout(() => setIsLogoutConfirm(false), 3000);
    } else {
      // Second click - actually logout
      setIsLogoutConfirm(false);
      await logout();
    }
  };

  if (isCollapsed) {
    return (
      <aside className="navi-left-sidebar collapsed">
        <button
          onClick={onToggleCollapse}
          className="navi-sidebar-toggle"
          aria-label="Expand sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="navi-collapsed-icons">
          <button onClick={onNewChat} className="navi-icon-btn primary" aria-label="New Chat" title="New Chat">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button className="navi-icon-btn" aria-label="Chats" title="Recent Chats">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="navi-collapsed-footer">
          {user && !isAnonymous ? (
            <button
              onClick={handleLogoutClick}
              className="navi-icon-btn"
              aria-label={isLogoutConfirm ? "Confirm Logout" : "Logout"}
              title={isLogoutConfirm ? "Click again to confirm logout" : `Logout (${user.displayName || user.email})`}
              style={isLogoutConfirm ? { backgroundColor: '#dc2626', color: 'white' } : {}}
            >
              {isLogoutConfirm ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              ) : user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ) : (
            <button
              onClick={handleLoginClick}
              className="navi-icon-btn"
              aria-label="Login"
              title="Login with Google"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className={`navi-left-sidebar${isMobileOverlay ? ' mobile-overlay' : ''}`}>
      {/* Panel Header Bar */}
      <div className="navi-panel-header">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h2>Chats</h2>
        {isMobileOverlay && onClose && (
          <button
            onClick={onClose}
            className="navi-mobile-panel-close"
            aria-label="Close panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      <div className="navi-sidebar-content">
        {/* Recent Conversations Header */}
        <div className="navi-sidebar-section">
          <p className={`navi-section-snippet ${!(user && !isAnonymous) ? '' : conversations.length === 0 ? 'state-empty' : 'state-active'}`}>
            {user && !isAnonymous
              ? conversations.length === 0
                ? 'Your conversation history with NaVi will be saved here.'
                : 'Your chat history is automatically saved.'
              : 'Login with Google to save your chat history.'}
          </p>
        </div>

        {/* Scrollable Conversation List */}
        <div className="navi-conversation-list">
          {conversations.length === 0 ? (
            <div className="navi-conversation-group">
              <div className="navi-conversation-group-label">Today</div>
              <div className="navi-chat-placeholder">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>No conversations yet</span>
              </div>
            </div>
          ) : (
            groupConversations(conversations).map(({ group, chats }) => (
              <div key={group} className="navi-conversation-group">
                <div className="navi-conversation-group-label">{group}</div>
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`navi-conversation-item ${activeChatId === chat.id ? 'active' : ''}`}
                  >
                    <button
                      className="navi-conversation-content"
                      onClick={() => onLoadChat(chat)}
                    >
                      <span className="navi-conversation-title">{chat.query}</span>
                    </button>
                    <div className="navi-conversation-actions">
                      <span className="navi-conversation-time">{formatTimeAgo(new Date(chat.timestamp))}</span>
                      {onDeleteChat && (
                        <button
                          className="navi-delete-chat-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                          }}
                          title="Delete chat"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

      </div>

      {/* Footer with New Chat and Login/Logout Buttons */}
      <div className="navi-login-footer">
        {/* New Chat Button */}
        <button
          className={`navi-login-btn ${!hasMessages ? 'disabled' : ''}`}
          onClick={onNewChat}
          disabled={!hasMessages}
          title={hasMessages ? "Start new chat" : "No messages yet"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Start new chat</span>
        </button>

        {/* Login/Logout Button */}
        {user && !isAnonymous ? (
          <button
            className={`navi-login-btn ${isLogoutConfirm ? 'logout-confirm' : ''}`}
            onClick={handleLogoutClick}
            style={isLogoutConfirm ? { backgroundColor: '#dc2626', color: 'white' } : {}}
          >
            {isLogoutConfirm ? (
              <span className="flex-1 text-center font-semibold">Confirm Logout?</span>
            ) : (
              <>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <span className="flex-1 text-left truncate">
                  {getShortName(user)}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </>
            )}
          </button>
        ) : (
          <button className="navi-login-btn ghost" onClick={handleLoginClick}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <span>Login with Google</span>
          </button>
        )}
      </div>
    </aside>
  );
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'now';
  }
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  if (diffDays === 1) {
    return 'yest';
  }
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  return `${Math.floor(diffDays / 7)}w`;
}

function getTimeGroup(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (chatDate.getTime() >= today.getTime()) {
    return 'Today';
  }
  if (chatDate.getTime() >= yesterday.getTime()) {
    return 'Yesterday';
  }
  if (chatDate.getTime() >= weekAgo.getTime()) {
    return 'This Week';
  }
  return 'Earlier';
}

function groupConversations(conversations: ChatHistory[]): { group: string; chats: ChatHistory[] }[] {
  const groups: { [key: string]: ChatHistory[] } = {};
  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Earlier'];

  conversations.forEach(chat => {
    const group = getTimeGroup(new Date(chat.timestamp));
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(chat);
  });

  return groupOrder
    .filter(group => groups[group] && groups[group].length > 0)
    .map(group => ({ group, chats: groups[group] }));
}

export default LeftSidebar;

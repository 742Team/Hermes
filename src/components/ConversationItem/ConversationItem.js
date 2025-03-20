import React from 'react';
import './ConversationItem.css';

// Importez le composant GroupAvatar
import GroupAvatar from '../GroupAvatar/GroupAvatar';

// Assurez-vous que cette fonction est bien définie et exportée
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }
};

// Dans votre composant ConversationItem
const ConversationItem = ({ conversation, isActive, onClick }) => {
  // Dans le rendu du composant ConversationItem
  return (
    <div className={`conversation-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="conversation-avatar">
        {conversation.isGroup ? (
          // Avatar de groupe
          <div className="group-avatar" style={{ 
            backgroundColor: getRandomColor(conversation.name),
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            {conversation.name.substring(0, 2).toUpperCase()}
          </div>
        ) : (
          // Avatar utilisateur normal
          <img 
            src={conversation.avatar || '/assets/default-avatar.png'} 
            alt={conversation.name} 
            className="avatar"
          />
        )}
      </div>
      
      <div className="conversation-info">
        <div className="conversation-header">
          <h3 className="conversation-name">{conversation.name}</h3>
          {conversation.lastMessageTime && (
            <span className="conversation-time">{formatTime(conversation.lastMessageTime)}</span>
          )}
        </div>
        <div className="conversation-preview">
          <p className="conversation-last-message">{conversation.lastMessage || ''}</p>
          {conversation.unreadCount > 0 && (
            <span className="unread-count">{conversation.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Fonction utilitaire pour générer une couleur aléatoire mais cohérente
function getRandomColor(str) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA5A5', '#98D8C8',
    '#F9C784', '#A5DEF1', '#D4A5F9', '#B5EAD7', '#C7CEEA'
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export default ConversationItem;
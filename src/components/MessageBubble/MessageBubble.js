import React from 'react';
import './MessageBubble.css';

const MessageBubble = ({ 
  message, 
  isSent, 
  timestamp, 
  isRead, 
  showTimestamp,
  hasAttachment,
  attachment,
  isOwnMessage
}) => {
  // Fonction pour extraire le contenu du message
  const getMessageContent = () => {
    // Si le message est une chaîne de caractères
    if (typeof message === 'string') {
      // Vérifier s'il s'agit d'un message formaté du serveur
      if (message.includes('<span style=\'color: #FFFFFF\'>')) {
        // Extraire le contenu du message après le nom d'utilisateur
        const parts = message.split('</span>');
        if (parts.length > 1) {
          return parts[1].trim();
        }
      }
      return message;
    }
    
    // Si le message est un objet avec une propriété content
    if (message && message.content) {
      if (typeof message.content === 'string' && message.content.includes('<span style=\'color: #FFFFFF\'>')) {
        const parts = message.content.split('</span>');
        if (parts.length > 1) {
          return parts[1].trim();
        }
      }
      return message.content;
    }
    
    // Si aucun format reconnu
    return '';
  };
  
  // Fonction pour extraire le nom de l'expéditeur
  const getSenderName = () => {
    if (typeof message === 'string' && message.includes('<span style=\'color: #FFFFFF\'>')) {
      const regex = /<span style='color: #FFFFFF'>(.*?)<\/span>/;
      const match = message.match(regex);
      return match ? match[1] : 'Inconnu';
    }
    
    if (message && message.content && typeof message.content === 'string' && 
        message.content.includes('<span style=\'color: #FFFFFF\'>')) {
      const regex = /<span style='color: #FFFFFF'>(.*?)<\/span>/;
      const match = message.content.match(regex);
      return match ? match[1] : 'Inconnu';
    }
    
    if (message && message.senderName) {
      return message.senderName;
    }
    
    if (message && message.sender) {
      return message.sender;
    }
    
    return isSent ? 'Vous' : 'Inconnu';
  };
  
  // Obtenir le contenu et l'expéditeur du message
  const messageContent = getMessageContent();
  const senderName = getSenderName();
  
  // Extraire l'horodatage du message
  const getMessageTimestamp = () => {
    if (timestamp) return timestamp;
    
    if (typeof message === 'string' && message.includes('[')) {
      const regex = /\[(.*?)\]/;
      const match = message.match(regex);
      return match ? match[1] : '';
    }
    
    if (message && message.content && typeof message.content === 'string' && 
        message.content.includes('[')) {
      const regex = /\[(.*?)\]/;
      const match = message.content.match(regex);
      return match ? match[1] : '';
    }
    
    if (message && message.timestamp) {
      return new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return '';
  };
  
  const messageTimestamp = getMessageTimestamp();
  
  return (
    <div className={`message-container ${isSent ? 'sent' : 'received'}`}>
      {!isSent && (
        <div className="message-sender">{senderName}</div>
      )}
      
      <div className="message-bubble">
        {hasAttachment && attachment && (
          <div className="attachment-container">
            {attachment.type === 'image' ? (
              <div className="image-attachment">
                <img src={attachment.url} alt="Attachment" />
              </div>
            ) : (
              <div className="file-attachment">
                <div className="file-icon">📄</div>
                <div className="file-details">
                  <div className="file-name">{attachment.name}</div>
                  <div className="file-size">{formatFileSize(attachment.size)}</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {messageContent && <div className="message-text">{messageContent}</div>}
        
        <div className="message-meta">
          <span className="message-time">{messageTimestamp}</span>
          {isSent && (
            <span className={`message-status ${isRead ? 'read' : ''}`}>
              {isRead ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 7L9.42857 17L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
          )}
        </div>
      </div>
      
      {showTimestamp && (
        <div className="timestamp-divider">
          <span>{messageTimestamp}</span>
        </div>
      )}
    </div>
  );
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
};

export default MessageBubble;
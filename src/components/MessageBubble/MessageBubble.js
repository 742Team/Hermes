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
  // Function to extract the content from the message
  // Update the getMessageContent function to better handle HTML content
  const getMessageContent = () => {
    // If the message is an object with type 'html_content'
    if (message && typeof message === 'object' && message.type === 'html_content') {
      return message.content;
    }
    
    // If the message is a string
    if (typeof message === 'string') {
      // Check if it's a server-formatted message with HTML
      if (message.includes('<span style=') || 
          message.includes('media-embed') || 
          message.includes('file-attachment')) {
        return message;
      }
      return message;
    }
    
    // Default case
    return JSON.stringify(message);
  };
  
  // Function to render HTML content safely
  // Improve the renderHtmlContent function to better handle HTML entities
  const renderHtmlContent = (htmlContent) => {
    // Decode HTML entities if needed
    const decodedContent = htmlContent
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&');
      
    return (
      <div 
        className="message-html-content"
        dangerouslySetInnerHTML={{ __html: decodedContent }} 
      />
    );
  };
  
  // Function to determine if content contains HTML
  const containsHtml = (content) => {
    return typeof content === 'string' && (
      content.includes('<div') || 
      content.includes('<span') || 
      content.includes('<audio') || 
      content.includes('<video') || 
      content.includes('<img') ||
      content.includes('<a') ||
      content.includes('&lt;') // For encoded HTML
    );
  };
  
  // Extract text from HTML content for plain display
  const extractTextFromHtml = (htmlContent) => {
    // Simple regex to remove HTML tags
    return htmlContent.replace(/<[^>]*>/g, '');
  };
  
  // Render the message content
  const renderMessageContent = () => {
    const content = getMessageContent();
    
    // If content contains HTML, render it as HTML
    if (containsHtml(content)) {
      return renderHtmlContent(content);
    }
    
    // Otherwise render as plain text
    return <p className="message-text">{content}</p>;
  };
  
  // Format the timestamp
  const messageTimestamp = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className={`message-container ${isSent ? 'sent' : 'received'}`}>
      {showTimestamp && (
        <div className="timestamp-divider">
          <span>{messageTimestamp}</span>
        </div>
      )}
      
      <div className={`message-bubble ${isSent ? 'sent' : 'received'}`}>
        {hasAttachment && attachment && (
          <div className="attachment-container">
            {attachment.type === 'image' ? (
              <div className="image-attachment">
                <img src={attachment.url} alt="Attachment" />
              </div>
            ) : (
              <div className="file-attachment">
                <span className="file-icon">📎</span>
                <div className="file-details">
                  <div className="file-name">{attachment.name}</div>
                  <div className="file-size">{attachment.size}</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {renderMessageContent()}
        
        <div className="message-meta">
          <span className="message-time">{messageTimestamp}</span>
          {isSent && (
            <span className={`message-status ${isRead ? 'read' : ''}`}>
              {isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
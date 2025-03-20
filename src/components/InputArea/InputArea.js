import React, { useState, useRef, useEffect } from 'react';
import './InputArea.css';

const InputArea = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef(null);

  // Ajuster automatiquement la hauteur du textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() || attachment) {
      onSendMessage(message, attachment);
      setMessage('');
      setAttachment(null);
      
      // Réinitialiser la hauteur du textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    // Envoyer le message avec Enter (sans Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleAttachment = async () => {
    if (window.electron) {
      try {
        const result = await window.electron.selectAttachment();
        if (result) {
          setAttachment(result);
        }
      } catch (error) {
        console.error('Error selecting attachment:', error);
      }
    } else {
      // Fallback pour la version web
      alert('Les pièces jointes sont uniquement disponibles dans l\'application desktop');
    }
  };

  return (
    <div className="input-area">
      <button 
        className="attachment-button" 
        aria-label="Ajouter une pièce jointe"
        onClick={handleAttachment}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.44 11.05L12.25 20.24C11.1242 21.3658 9.59723 21.9983 8.005 21.9983C6.41277 21.9983 4.88584 21.3658 3.76 20.24C2.63416 19.1142 2.00166 17.5872 2.00166 15.995C2.00166 14.4028 2.63416 12.8758 3.76 11.75L12.33 3.18C13.0806 2.42975 14.0991 2.00129 15.16 2.00129C16.2209 2.00129 17.2394 2.42975 17.99 3.18C18.7403 3.93063 19.1687 4.94905 19.1687 6.01C19.1687 7.07095 18.7403 8.08938 17.99 8.84L9.41 17.41C9.03472 17.7853 8.52573 17.9961 7.995 17.9961C7.46427 17.9961 6.95528 17.7853 6.58 17.41C6.20472 17.0347 5.99389 16.5257 5.99389 15.995C5.99389 15.4643 6.20472 14.9553 6.58 14.58L15.07 6.1" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      <form onSubmit={handleSubmit} className="message-form">
        {attachment && (
          <div className="attachment-preview">
            {attachment.type === 'image' ? (
              <div className="image-preview">
                <img src={attachment.url} alt={attachment.name} />
                <button 
                  className="remove-attachment" 
                  onClick={(e) => {
                    e.preventDefault();
                    setAttachment(null);
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="file-preview">
                <span className="file-icon">📄</span>
                <span className="file-name">{attachment.name}</span>
                <button 
                  className="remove-attachment" 
                  onClick={(e) => {
                    e.preventDefault();
                    setAttachment(null);
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}
        
        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder={attachment ? "Ajouter un commentaire..." : "Message"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          rows="1"
        />
      </form>
      
      <button 
        className={`send-button ${(message.trim() || attachment) ? 'active' : ''}`}
        onClick={handleSubmit}
        disabled={!message.trim() && !attachment}
        aria-label="Envoyer le message"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
};

export default InputArea;
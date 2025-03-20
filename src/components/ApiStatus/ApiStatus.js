import React, { useState, useEffect } from 'react';
import ChatService from '../../services/ChatService';
import './ApiStatus.css';

const ApiStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  useEffect(() => {
    const unsubscribe = ChatService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });
    
    return () => unsubscribe();
  }, []);
  
  return (
    <div 
      className={`api-status ${isConnected ? 'connected' : 'disconnected'}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {showTooltip && (
        <div className="api-status-tooltip">
          {isConnected ? 'Connecté au serveur' : 'Déconnecté du serveur'}
        </div>
      )}
    </div>
  );
};

export default ApiStatus;
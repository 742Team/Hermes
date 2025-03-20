import React from 'react';
import './GroupAvatar.css';

const GroupAvatar = ({ name = '', size = 40 }) => {
  // Générer une couleur de fond basée sur le nom du groupe
  const getBackgroundColor = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA5A5', '#98D8C8',
      '#F9C784', '#A5DEF1', '#D4A5F9', '#B5EAD7', '#C7CEEA'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Obtenir les initiales du nom du groupe (max 2 caractères)
  const getInitials = (name) => {
    if (!name) return 'G';
    
    const words = name.split(' ');
    if (words.length === 1) {
      return name.substring(0, 2).toUpperCase();
    }
    
    return (words[0][0] + words[1][0]).toUpperCase();
  };
  
  const backgroundColor = getBackgroundColor(name);
  const initials = getInitials(name);
  
  return (
    <div 
      className="group-avatar" 
      style={{ 
        width: size, 
        height: size, 
        backgroundColor,
        fontSize: size * 0.4
      }}
    >
      <span className="group-initials">{initials}</span>
      <div className="group-icon-overlay">
        <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="rgba(255, 255, 255, 0.8)">
          <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.62c0-1.17.68-2.25 1.76-2.73 1.17-.51 2.61-.9 4.24-.9zM12 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
          <path d="M18 8.25c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1-2.1-.94-2.1-2.1.94-2.1 2.1-2.1M18 6c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zM6 8.25c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1-2.1-.94-2.1-2.1.94-2.1 2.1-2.1M6 6c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
        </svg>
      </div>
    </div>
  );
};

export default GroupAvatar;
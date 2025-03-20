import React, { useState, useEffect } from 'react';
import ThemeService from '../../services/ThemeService';
import './Settings.css';

const Settings = ({ isOpen, onClose }) => {
  const [theme, setTheme] = useState(ThemeService.getTheme());
  const [notifications, setNotifications] = useState(
    process.env.REACT_APP_ENABLE_NOTIFICATIONS === 'true'
  );
  const [readReceipts, setReadReceipts] = useState(
    process.env.REACT_APP_ENABLE_READ_RECEIPTS === 'true'
  );
  
  useEffect(() => {
    const removeListener = ThemeService.addListener(() => {
      setTheme(ThemeService.getTheme());
    });
    
    return () => removeListener();
  }, []);
  
  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    ThemeService.setTheme(newTheme);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3>Appearance</h3>
            <div className="setting-item">
              <label htmlFor="theme-select">Theme</label>
              <select 
                id="theme-select" 
                value={theme} 
                onChange={handleThemeChange}
                className="theme-select"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
          
          <div className="settings-section">
            <h3>Notifications</h3>
            <div className="setting-item">
              <label htmlFor="notifications-toggle">Enable Notifications</label>
              <div className="toggle-switch">
                <input 
                  type="checkbox" 
                  id="notifications-toggle" 
                  checked={notifications} 
                  onChange={() => setNotifications(!notifications)}
                />
                <label htmlFor="notifications-toggle"></label>
              </div>
            </div>
          </div>
          
          <div className="settings-section">
            <h3>Privacy</h3>
            <div className="setting-item">
              <label htmlFor="read-receipts-toggle">Send Read Receipts</label>
              <div className="toggle-switch">
                <input 
                  type="checkbox" 
                  id="read-receipts-toggle" 
                  checked={readReceipts} 
                  onChange={() => setReadReceipts(!readReceipts)}
                />
                <label htmlFor="read-receipts-toggle"></label>
              </div>
            </div>
          </div>
          
          <div className="settings-section">
            <h3>About</h3>
            <div className="about-info">
              <p>Hermes Chat v{process.env.REACT_APP_VERSION || '1.0.0'}</p>
              <p>A modern desktop chat application</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
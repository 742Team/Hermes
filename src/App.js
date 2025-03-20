import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import ChatInterface from './components/ChatInterface/ChatInterface';
import Settings from './components/Settings/Settings';
import UserProfile from './components/UserProfile/UserProfile';
import IntroVideo from './components/IntroVideo/IntroVideo';
import AuthScreen from './components/Auth/AuthScreen';
import AuthService from './services/AuthService';
import ThemeService from './services/ThemeService';
import './App.css';

const App = () => {
  // États pour l'authentification et l'introduction
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [showIntro, setShowIntro] = useState(!localStorage.getItem('has_seen_intro'));
  const [currentUser, setCurrentUser] = useState(AuthService.getCurrentUser());
  
  // États pour l'application
  const [activeView, setActiveView] = useState('chat');
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Effet pour charger les conversations
  useEffect(() => {
    if (isAuthenticated) {
      // Charger les conversations depuis l'API
      fetch(`${process.env.REACT_APP_API_URL}/conversations`, {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch conversations');
          }
          return response.json();
        })
        .then(data => {
          setConversations(data);
          if (data.length > 0) {
            setActiveConversation(data[0]);
          }
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching conversations:', error);
          setIsLoading(false);
        });
    }
  }, [isAuthenticated]);

  // Effet pour s'abonner aux changements d'authentification
  useEffect(() => {
    const unsubscribe = AuthService.onAuthChange((user) => {
      setIsAuthenticated(!!user);
      setCurrentUser(user);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Gestionnaire pour la fin de l'introduction
  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  // Gestionnaire pour l'authentification réussie
  const handleAuthenticated = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  // Gestionnaire pour la déconnexion
  const handleLogout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Gestionnaire pour le changement de conversation
  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  // Gestionnaire pour le changement de vue
  const handleViewChange = (view) => {
    setActiveView(view);
  };

  // Rendu conditionnel basé sur l'état d'authentification et d'introduction
  if (showIntro) {
    return <IntroVideo onComplete={handleIntroComplete} />;
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app">
      <Sidebar 
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={handleSelectConversation}
        onViewChange={handleViewChange}
        activeView={activeView}
        currentUser={currentUser}
      />
      
      <main className="main-content">
        {activeView === 'chat' && (
          <ChatInterface 
            conversation={activeConversation}
            currentUser={currentUser}
          />
        )}
        
        {activeView === 'settings' && (
          <Settings 
            onLogout={handleLogout}
          />
        )}
        
        {activeView === 'profile' && (
          <UserProfile 
            user={currentUser}
          />
        )}
      </main>
    </div>
  );
};

export default App;

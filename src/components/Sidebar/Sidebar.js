import React, { useState, useEffect } from 'react';
import ConversationItem from '../ConversationItem/ConversationItem';
import RoomService from '../../services/RoomService';
import AuthService from '../../services/AuthService';
import './Sidebar.css';

const Sidebar = ({ onSelectConversation, activeConversation }) => {
  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Charger les conversations au chargement du composant
  useEffect(() => {
    loadConversations();

    // S'abonner aux changements de la liste des salons
    const unsubscribe = RoomService.onRoomsChange((rooms) => {
      console.log('Rooms updated in sidebar:', rooms);
      setConversations(prevConversations => {
        // Créer une nouvelle liste avec les conversations existantes
        const updatedConversations = [...prevConversations];

        // Ajouter les salons qui ne sont pas déjà dans les conversations
        rooms.forEach(room => {
          const existingIndex = updatedConversations.findIndex(conv => conv.id === room.id);
          if (existingIndex >= 0) {
            // Mettre à jour la conversation existante
            updatedConversations[existingIndex] = { ...updatedConversations[existingIndex], ...room };
          } else {
            // Ajouter la nouvelle conversation
            updatedConversations.push(room);
          }
        });

        return updatedConversations;
      });
    });

    // S'abonner aux événements de création de groupe
    const handleGroupCreated = (event) => {
      console.log('Group created event received:', event.detail);
      // Ajouter le nouveau groupe aux conversations si nécessaire
      setConversations(prevConversations => {
        const newGroup = event.detail;
        // Vérifier si le groupe existe déjà
        if (!prevConversations.some(conv => conv.name === newGroup.name)) {
          return [...prevConversations, {
            id: `group-${Date.now()}`,
            name: newGroup.name,
            isGroup: true,
            lastMessage: '',
            unreadCount: 0
          }];
        }
        return prevConversations;
      });

      // Rafraîchir la liste des conversations
      loadConversations();
    };

    window.addEventListener('groupCreated', handleGroupCreated);

    return () => {
      unsubscribe();
      window.removeEventListener('groupCreated', handleGroupCreated);
    };
  }, []);

  // Charger les conversations depuis le service
  const loadConversations = async () => {
    setIsLoading(true);
    try {
      await RoomService.getAllRooms();
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setIsLoading(false);
    }
  };

  // Filtrer les conversations en fonction du terme de recherche
  const filteredConversations = conversations.filter(conversation =>
    conversation && conversation.name && conversation.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Modifier la fonction de clic sur une conversation
  const handleConversationClick = async (conversation) => {
    try {
      // Si c'est une room de groupe, essayer de la rejoindre d'abord
      if (conversation.isGroup) {
        await RoomService.joinRoom(conversation);
      }

      // Puis notifier le parent que la conversation a été sélectionnée
      onSelectConversation(conversation);
    } catch (error) {
      console.error('Error joining room:', error);
      // Afficher un message d'erreur à l'utilisateur
      alert(`Impossible de rejoindre la room: ${error.message}`);
    }
  };

  return (
    <div className="sidebar-container">
      <div className="navigation-sidebar">
        {/* Icônes de navigation */}
      </div>

      <div className="conversations-sidebar">
        <div className="sidebar-header">
          <h2>Messages</h2>
          <button className="new-message-button" onClick={loadConversations}>
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>

        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Rechercher"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="conversations-list">
          {isLoading ? (
            <div className="loading-conversations"></div>
          ) : filteredConversations.length === 0 ? (
            <div className="no-conversations">
            </div>
          ) : (
            filteredConversations.map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={activeConversation && activeConversation.id === conversation.id}
                onClick={() => handleConversationClick(conversation)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

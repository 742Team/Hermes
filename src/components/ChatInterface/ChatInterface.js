import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from '../MessageBubble/MessageBubble';
import InputArea from '../InputArea/InputArea';
import ChatService from '../../services/ChatService';
import AuthService from '../../services/AuthService';
import RoomService from '../../services/RoomService';
import GroupIcon from '../Icons/GroupIcon';
import './ChatInterface.css';

const ChatInterface = ({ conversation, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // États pour la création de groupe
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupPassword, setGroupPassword] = useState('');

  // Fonction utilitaire pour déterminer si l'horodatage doit être affiché
  const shouldShowTimestamp = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    
    const currentTime = currentMsg.timestamp ? new Date(currentMsg.timestamp) : new Date();
    const prevTime = prevMsg.timestamp ? new Date(prevMsg.timestamp) : new Date();
    
    // Afficher l'horodatage si plus de 10 minutes se sont écoulées entre les messages
    return (currentTime - prevTime) > 10 * 60 * 1000;
  };

  // Fonction pour grouper les messages par date - définie en dehors du JSX
  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp || Date.now());
      const dateKey = date.toLocaleDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages
    }));
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Fallback if the ref isn't available
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  };

  // Make sure to call scrollToBottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Modifier la fonction handleSendMessage pour gérer les rooms
  const handleSendMessage = (content, attachments = []) => {
    if (!conversation || (!content.trim() && attachments.length === 0)) return;
  
    // Si c'est une room, envoyer directement la commande
    if (conversation.isGroup) {
      AuthService.sendCommand(content)
        .then(response => {
          console.log('Message envoyé à la room:', response);
        })
        .catch(error => {
          console.error('Erreur lors de l\'envoi du message à la room:', error);
        });
      return;
    }
  
    // Pour les conversations normales, utiliser le ChatService
    const newMessage = {
      id: Date.now().toString(),
      conversationId: conversation.id,
      sender: currentUser.id,
      senderName: currentUser.username,
      content,
      attachments,
      timestamp: new Date().toISOString()
    };
  
    // Envoyer le message
    ChatService.sendMessage(newMessage)
      .catch(error => {
        console.error('Error sending message:', error);
      });
  };

  // Fonction pour créer un groupe
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      alert('Veuillez entrer un nom de groupe');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Utiliser le RoomService pour créer la room
      const result = await RoomService.createRoom(groupName, groupPassword || null);
      
      console.log('Groupe créé avec succès:', result);
      
      // Fermer le modal
      setShowCreateGroupModal(false);
      setGroupName('');
      setGroupPassword('');
      
      // Déclencher un événement pour informer l'application qu'un groupe a été créé
      const event = new CustomEvent('groupCreated', { 
        detail: { name: groupName, password: groupPassword } 
      });
      window.dispatchEvent(event);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Erreur lors de la création du groupe:', error);
      alert(`Erreur lors de la création du groupe: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Effet pour charger les messages lorsque la conversation change
  useEffect(() => {
    if (!conversation) return;
  
    setIsLoading(true);
    setMessages([]); // Reset messages when conversation changes
  
    // Handle differently based on conversation type
    if (conversation.isGroup) {
      // For group rooms, we need to join the room first
      console.log('Joining room:', conversation.name);
      AuthService.sendCommand(`/cd ${conversation.name}`)
        .then(() => {
          // Après avoir rejoint la room, demander l'historique des messages
          return AuthService.sendCommand('/history');
        })
        .then(() => {
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error joining room or fetching history:', error);
          setIsLoading(false);
        });
    } else {
      // For regular conversations, fetch messages
      ChatService.getMessages(conversation.id)
        .then(data => {
          setMessages(data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching messages:', error);
          setIsLoading(false);
        });
    }
  }, [conversation]);

  // Effet pour s'abonner aux nouveaux messages
  useEffect(() => {
    if (!conversation) return;
    
    console.log('Setting up message listeners for conversation:', conversation.name);
    
    // S'abonner aux nouveaux messages
    const unsubscribe = ChatService.onMessageReceived((message) => {
      console.log('Message reçu dans ChatInterface:', message);
      
      // Traiter différents formats de messages
      if (typeof message === 'string') {
        // Pour les messages texte bruts du serveur
        const newMessage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          content: message,
          timestamp: new Date().toISOString(),
          isRawText: true
        };
        setMessages(prev => {
          // Vérifier si le message n'est pas déjà présent
          const isDuplicate = prev.some(m => 
            m.isRawText && m.content === message
          );
          return isDuplicate ? prev : [...prev, newMessage];
        });
      } else if (message.conversationId === conversation.id || 
                (conversation.isGroup && message.content && 
                 (typeof message.content === 'string'))) {
        // Pour les messages formatés
        setMessages(prev => {
          // Vérifier si le message n'est pas déjà présent
          const isDuplicate = prev.some(m => 
            m.id === message.id || 
            (m.content === message.content && m.timestamp === message.timestamp)
          );
          return isDuplicate ? prev : [...prev, message];
        });
      } else if (conversation.isGroup) {
        // Pour les messages de groupe sans conversationId spécifique
        setMessages(prev => {
          // Vérifier si le message n'est pas déjà présent
          const isDuplicate = prev.some(m => 
            (m.id === message.id) || 
            (m.content === message.content && m.timestamp === message.timestamp)
          );
          return isDuplicate ? prev : [...prev, message];
        });
      }
      
      setIsTyping(false);
      scrollToBottom();
    });
  
    // S'abonner aux messages d'AuthService également
    const unsubscribeAuth = AuthService.onMessage((message) => {
      console.log('Message reçu depuis AuthService:', message);
      
      // Check if the message is already in the correct format
      if (message && typeof message === 'object' && message.type === 'html_content') {
        // Add the message directly to the messages state
        setMessages(prevMessages => [...prevMessages, {
          id: Date.now().toString(),
          content: message.content,
          sender: message.sender,
          timestamp: message.timestamp,
          isHtml: true,
          isSent: message.sender === currentUser?.username
        }]);
      } 
      // If it's a string message
      else if (typeof message === 'string') {
        // Check if it's a server message with HTML
        if (message.includes('<span style=') || message.includes('<div class=')) {
          // Extract sender if possible
          let sender = 'Server';
          const senderMatch = message.match(/<span style='color: #[A-F0-9]+'>(.*?)<\/span>/);
          if (senderMatch && senderMatch[1]) {
            sender = senderMatch[1];
          }
          
          setMessages(prevMessages => [...prevMessages, {
            id: Date.now().toString(),
            content: message,
            sender: sender,
            timestamp: new Date().toISOString(),
            isHtml: true,
            isSent: sender === currentUser?.username
          }]);
        } 
        // Regular text message
        else {
          setMessages(prevMessages => [...prevMessages, {
            id: Date.now().toString(),
            content: message,
            sender: 'Unknown',
            timestamp: new Date().toISOString(),
            isHtml: false,
            isSent: false
          }]);
        }
      }
    });
  
    return () => {
      console.log('Cleaning up message listeners');
      unsubscribe();
      unsubscribeAuth();
    };
  }, [conversation]); // Retirez messages de la dépendance pour éviter les boucles infinies

  // Effet pour faire défiler vers le bas lorsque les messages changent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!conversation) {
    return (
      <div className="chat-interface empty-state">
        <div className="chat-header">
          <div className="chat-header-info">
          </div>

          <div className="chat-header-actions">
            <button
              className="create-group-button"
              onClick={() => setShowCreateGroupModal(true)}
            >
              <GroupIcon width={18} height={18} color="white" />
              <span>Créer un groupe</span>
            </button>
          </div>
        </div>

        <div className="empty-state-content">
          <h2>Sélectionnez une conversation</h2>
          <p>Choisissez une conversation dans la barre latérale pour commencer à discuter.</p>
        </div>

        {showCreateGroupModal && (
          <div className="create-group-modal">
            <form className="create-group-form" onSubmit={handleCreateGroup}>
              <h3>Créer un nouveau groupe</h3>
              <div className="form-group">
                <label htmlFor="group-name">Nom du groupe</label>
                <input
                  id="group-name"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Entrez le nom du groupe"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="group-password">Mot de passe (optionnel)</label>
                <input
                  id="group-password"
                  type="password"
                  value={groupPassword}
                  onChange={(e) => setGroupPassword(e.target.value)}
                  placeholder="Entrez un mot de passe (optionnel)"
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="cancel-button"
                >
                  Annuler
                </button>
                <button type="submit" className="submit-button">
                  Créer
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="chat-header-info">
          <h2>{conversation.name}</h2>
          <div className="chat-participants">
            {conversation.participants} participants
          </div>
        </div>
  
        <div className="chat-header-actions">
          <button
            className="create-group-button"
            onClick={() => setShowCreateGroupModal(true)}
          >
            <GroupIcon width={18} height={18} color="white" />
            <span>Créer un groupe</span>
          </button>
        </div>
      </div>
  
      {/* Add a wrapper div for the content area */}
      <div className="chat-content">
        <div className="messages-container">
          {isLoading ? (
            <div className="loading-messages">Chargement des messages...</div>
          ) : messages.length === 0 ? (
            <div className="no-messages">
              <p>Aucun message dans cette conversation.</p>
              <p>Soyez le premier à envoyer un message!</p>
            </div>
          ) : (
            groupMessagesByDate(messages).map(group => (
              <React.Fragment key={group.date}>
                <div className="message-date-separator">
                  {new Date(group.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                {group.messages.map((message, index) => {
                  // Déterminer si le message est envoyé par l'utilisateur actuel
                  let isOwnMessage = false;
                  let senderName = '';
                  let messageContent = '';
                  let messageTime = '';
                  
                  // Check if currentUser exists before accessing its properties
                  const userUsername = currentUser?.username || '';
                  const userId = currentUser?.id || '';
                  
                  // Extraire les informations du message selon son format
                  if (typeof message === 'string') {
                    // Message texte brut
                    if (message.includes('<span style=\'color: #FFFFFF\'>')) {
                      const regex = /<span style='color: #FFFFFF'>(.*?)<\/span>\s*(.*)/;
                      const match = message.match(regex);
                      if (match) {
                        senderName = match[1];
                        messageContent = match[2];
                        isOwnMessage = userUsername && (
                          senderName.includes(userUsername) || 
                          senderName.includes(`User_${userId}`)
                        );
                        
                        // Extraire l'horodatage s'il est présent
                        const timeRegex = /\[(.*?)\]/;
                        const timeMatch = message.match(timeRegex);
                        if (timeMatch) {
                          messageTime = timeMatch[1];
                        }
                      } else {
                        messageContent = message;
                      }
                    } else {
                      messageContent = message;
                    }
                  } else if (message.isRawText && message.content) {
                    // Message avec format HTML
                    if (typeof message.content === 'string' && message.content.includes('<span style=\'color: #FFFFFF\'>')) {
                      const regex = /<span style='color: #FFFFFF'>(.*?)<\/span>\s*(.*)/;
                      const match = message.content.match(regex);
                      if (match) {
                        senderName = match[1];
                        messageContent = match[2];
                        isOwnMessage = userUsername && (
                          senderName.includes(userUsername) || 
                          senderName.includes(`User_${userId}`)
                        );
                        
                        // Extraire l'horodatage s'il est présent
                        const timeRegex = /\[(.*?)\]/;
                        const timeMatch = message.content.match(timeRegex);
                        if (timeMatch) {
                          messageTime = timeMatch[1];
                        }
                      } else {
                        messageContent = message.content;
                      }
                    } else {
                      messageContent = message.content;
                    }
                  } else if (message.sender || message.senderName) {
                    // Message avec expéditeur explicite
                    senderName = message.senderName || message.sender;
                    messageContent = message.content;
                    isOwnMessage = userUsername && (
                      message.sender === userId || 
                      message.senderName === userUsername
                    );
                    messageTime = message.timestamp ? 
                      new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                  }
                  
                  // Si aucun temps n'a été extrait, utiliser l'horodatage du message ou l'heure actuelle
                  if (!messageTime && message.timestamp) {
                    messageTime = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  } else if (!messageTime) {
                    messageTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  }
                  
                  // Ne pas afficher les messages vides ou les messages système non pertinents
                  if (!messageContent || messageContent.trim() === '') {
                    return null;
                  }
                  
                  return (
                    <div 
                      key={message.id || `msg-${index}`}
                      className={`message-bubble ${isOwnMessage ? 'sent' : 'received'}`}
                    >
                      {!isOwnMessage && senderName && (
                        <div className="message-sender">{senderName}</div>
                      )}
                      <div className="message-content">{messageContent}</div>
                      <div className="message-time">{messageTime}</div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          )}
          {isTyping && (
            <div className="typing-indicator">
              <span>En train d'écrire</span>
              <div className="typing-indicator-dots">
                <div className="typing-indicator-dot"></div>
                <div className="typing-indicator-dot"></div>
                <div className="typing-indicator-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <InputArea 
        onSendMessage={handleSendMessage} 
        onTyping={(isTyping) => setIsTyping(isTyping)}
      />
      
      {/* Modal de création de groupe */}
      {showCreateGroupModal && (
        <div className="create-group-modal">
          <div className="create-group-form">
            <h3>Créer un nouveau groupe</h3>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label htmlFor="group-name">Nom du groupe</label>
                <input
                  id="group-name"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Entrez le nom du groupe"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="group-password">Mot de passe (optionnel)</label>
                <input
                  id="group-password"
                  type="password"
                  value={groupPassword}
                  onChange={(e) => setGroupPassword(e.target.value)}
                  placeholder="Laissez vide pour un groupe public"
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowCreateGroupModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="submit-button">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;

// Remove these lines that are causing the errors:
// {messages.map((msg) => (
//   <MessageBubble
//     key={msg.id}
//     message={msg.isHtml ? { type: 'html_content', content: msg.content } : msg.content}
//     isSent={msg.isSent || msg.sender === currentUser?.username}
//     timestamp={msg.timestamp}
//     isRead={msg.isRead}
//     showTimestamp={false}
//   />
// ))}

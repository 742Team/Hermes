/**
 * Service for handling chat operations
 */
class ChatService {
  constructor() {
    // Utiliser les URLs du VPS depuis les variables d'environnement
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://195.35.1.108:3630/';
    this.wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://195.35.1.108:3630/ws';
    this.socket = null;
    this.messageListeners = [];
    this.connectionListeners = [];
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;

    // Initialiser la connexion WebSocket si nous sommes dans un navigateur
    if (typeof window !== 'undefined') {
      this.initWebSocket();
    }
  }

  /**
   * Initialiser la connexion WebSocket
   */
  initWebSocket() {
    try {
      console.log(`Connecting to WebSocket at ${this.wsUrl}`);
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connection established to VPS');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionListeners(true);
      };

      // Modify the WebSocket message handler
      this.socket.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        
        try {
          // Try to parse as JSON
          let data;
          try {
            data = JSON.parse(event.data);
            
            // Process JSON message
            if (data.type === 'message') {
              this.notifyMessageListeners(data.payload);
            } else {
              // Handle other message types
              this.notifyMessageListeners(data);
            }
          } catch (error) {
            // If not valid JSON, handle as text message
            console.log('Received text message:', event.data);
            
            // Notify listeners with the raw text
            this.messageListeners.forEach(listener => {
              try {
                listener(event.data);
              } catch (listenerError) {
                console.error('Error in message listener:', listenerError);
              }
            });
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      };

      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnected = false;
        this.notifyConnectionListeners(false);

        // Tenter de se reconnecter après un délai avec backoff exponentiel
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 30000);
          console.log(`Attempting to reconnect in ${delay/1000} seconds...`);
          this.reconnectAttempts++;
          setTimeout(() => this.initWebSocket(), delay);
        } else {
          console.error('Maximum reconnection attempts reached');
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
        this.notifyConnectionListeners(false);
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  /**
   * Envoyer un message
   * @param {Object} message - Message à envoyer
   * @returns {Promise} - Promise qui se résout lorsque le message est envoyé
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      // Si nous avons une connexion WebSocket active, utiliser celle-ci
      if (this.socket && this.isConnected) {
        this.socket.send(JSON.stringify({
          type: 'message',
          payload: message
        }));
        resolve();
        return;
      }

      // Sinon, utiliser l'API REST
      fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to send message');
          }
          return response.json();
        })
        .then(data => resolve(data))
        .catch(error => reject(error));
    });
  }

  /**
   * Récupérer les messages d'une conversation
   * @param {string} conversationId - ID de la conversation
   * @returns {Promise} - Promise qui se résout avec les messages
   */
  getMessages(conversationId) {
    return fetch(`${this.baseUrl}/conversations/${conversationId}/messages`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        return response.json();
      });
  }

  /**
   * Récupérer les conversations
   * @returns {Promise} - Promise qui se résout avec les conversations
   */
  getConversations() {
    return fetch(`${this.baseUrl}/conversations`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }
        return response.json();
      });
  }

  /**
   * S'abonner aux nouveaux messages
   * @param {Function} listener - Fonction à appeler lorsqu'un nouveau message est reçu
   * @returns {Function} - Fonction pour se désabonner
   */
  onMessageReceived(listener) {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  /**
   * S'abonner aux changements de connexion
   * @param {Function} listener - Fonction à appeler lorsque l'état de la connexion change
   * @returns {Function} - Fonction pour se désabonner
   */
  onConnectionChange(listener) {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notifier les abonnés aux messages
   * @param {Object} message - Message reçu
   */
  notifyMessageListeners(message) {
    this.messageListeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  /**
   * Notifier les abonnés aux changements de connexion
   * @param {boolean} isConnected - État de la connexion
   */
  notifyConnectionListeners(isConnected) {
    this.connectionListeners.forEach(listener => {
      try {
        listener(isConnected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }
}

export default new ChatService();

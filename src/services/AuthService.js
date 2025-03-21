/**
 * Service pour gérer l'authentification
 */
class AuthService {
  constructor() {
    // Utiliser l'URL du backend Sinatra
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://195.35.1.108:4567';
    this.token = localStorage.getItem('auth_token');
    this.user = null;
    this.authListeners = [];
    this.chatRooms = [];
    this.socket = null;
    this.pendingCommands = {};

    // Charger l'utilisateur si un token existe
    if (this.token) {
      this.fetchCurrentUser();
    }

    // Initialiser la connexion WebSocket
    this.initWebSocket();
  }

  /**
   * Récupérer l'utilisateur actuel depuis l'API
   * @returns {Promise} - Promise qui se résout avec l'utilisateur
   */
  async fetchCurrentUser() {
    try {
      const response = await fetch(`${this.baseUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const userData = await response.json();
      this.user = userData;
      this.notifyAuthListeners(userData);
      return userData;
    } catch (error) {
      console.error('Error fetching current user:', error);
      this.logout();
      return null;
    }
  }

  /**
   * Connecter un utilisateur
   * @param {string} email - Email de l'utilisateur
   * @param {string} password - Mot de passe de l'utilisateur
   * @returns {Promise} - Promise qui se résout avec l'utilisateur
   */
  async login(email, password) {
    try {
      // Mise à jour pour utiliser le endpoint Sinatra
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          client_type: 'electron' // Indiquer que c'est un client Electron
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Échec de connexion');
      }

      const data = await response.json();

      // Stocker le token d'authentification
      this.token = data.token;
      localStorage.setItem('auth_token', data.token);

      // Stocker les informations de l'utilisateur
      this.user = {
        id: data.user_id,
        username: data.username,
        email: data.email,
        color: data.color || '#FFFFFF',
        joinedRooms: data.joined_rooms || []
      };

      // Récupérer les salons de chat disponibles
      if (data.chat_rooms) {
        this.chatRooms = data.chat_rooms;
      }

      this.notifyAuthListeners(this.user);

      return this.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Inscrire un nouvel utilisateur
   * @param {Object} userData - Données de l'utilisateur
   * @returns {Promise} - Promise qui se résout avec l'utilisateur
   */
  async register(userData) {
    try {
      // Formatage de la requête selon le format attendu par le backend
      const registerCommand = `/register ${userData.email} ${userData.password} ${userData.username}`;

      const response = await fetch(`${this.baseUrl}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: registerCommand,
          client_type: 'electron'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Échec d\'inscription');
      }

      const data = await response.json();

      // Stocker le token d'authentification
      this.token = data.token;
      localStorage.setItem('auth_token', data.token);

      // Stocker les informations de l'utilisateur
      this.user = {
        id: data.user_id || userData.username, // Utiliser le username comme ID si user_id n'est pas fourni
        username: userData.username,
        email: userData.email,
        color: data.color || '#FFFFFF',
        joinedRooms: []
      };

      this.notifyAuthListeners(this.user);

      return this.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Déconnecter l'utilisateur
   */
  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    this.notifyAuthListeners(null);
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   * @returns {boolean} - True si l'utilisateur est authentifié
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Obtenir l'utilisateur actuel
   * @returns {Object} - Utilisateur actuel
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Obtenir le token d'authentification
   * @returns {string} - Token d'authentification
   */
  getToken() {
    return this.token;
  }

  /**
   * S'abonner aux changements d'authentification
   * @param {Function} listener - Fonction à appeler lors d'un changement d'authentification
   * @returns {Function} - Fonction pour se désabonner
   */
  onAuthChange(listener) {
    this.authListeners.push(listener);

    // Notifier immédiatement avec l'état actuel
    if (this.user) {
      listener(this.user);
    }

    return () => {
      this.authListeners = this.authListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notifier les abonnés aux changements d'authentification
   * @param {Object} user - Utilisateur actuel
   */
  notifyAuthListeners(user) {
    this.authListeners.forEach(listener => {
      try {
        listener(user);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  /**
   * Obtenir la liste des salons de chat
   * @returns {Array} - Liste des salons de chat
   */
  getChatRooms() {
    return this.chatRooms;
  }

  /**
   * Mettre à jour la liste des salons de chat
   * @param {Array} rooms - Nouvelle liste des salons
   */
  updateChatRooms(rooms) {
    this.chatRooms = rooms;
    // Notifier les écouteurs que les salons ont changé
    if (this.user) {
      this.notifyAuthListeners(this.user);
    }
  }

  /**
   * Obtenir la liste des salons rejoints par l'utilisateur
   * @returns {Array} - Liste des salons rejoints
   */
  getJoinedRooms() {
    return this.user ? this.user.joinedRooms || [] : [];
  }

  /**
   * Récupérer la liste des salons disponibles
   * @returns {Promise} - Promise qui se résout avec la liste des salons
   */
  async fetchChatRooms() {
    try {
      // Utiliser la commande /rooms pour obtenir la liste des salons
      const data = await this.sendCommand('/rooms');

      if (!data.success) {
        throw new Error(data.message || 'Échec de récupération des salons');
      }

      // Mettre à jour la liste des salons
      if (data.rooms) {
        this.chatRooms = data.rooms;
      }

      return this.chatRooms;
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      throw error;
    }
  }

  /**
   * Envoyer une commande au serveur
   * @param {string} command - Commande à envoyer
   * @returns {Promise} - Promise qui se résout avec le résultat
   */
  async sendCommand(command) {
    try {
      // Si nous avons une connexion WebSocket active, utiliser celle-ci
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Envoyer la commande directement sans ID
        this.socket.send(command);

        // Pour les commandes WebSocket, on retourne une promesse résolue immédiatement
        // car nous ne pouvons pas facilement associer les réponses aux commandes
        return Promise.resolve({ success: true, message: 'Command sent via WebSocket' });
      }

      // Sinon, utiliser l'API REST comme fallback
      const response = await fetch(`${this.baseUrl}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.token ? `Bearer ${this.token}` : undefined
        },
        body: JSON.stringify({
          command: command,
          client_type: 'electron'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Échec de la commande');
      }

      return await response.json();
    } catch (error) {
      console.error('Command error:', error);
      throw error;
    }
  }

  /**
   * Initialiser la connexion WebSocket
   */
  initWebSocket() {
    try {
      // Construire l'URL WebSocket
      const wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://195.35.1.108:3630';
      console.log(`Connecting to WebSocket at ${wsUrl}`);

      this.socket = new WebSocket(wsUrl);
      this.pendingCommands = {};

      this.socket.onopen = () => {
        console.log('WebSocket connection established');

        // Si nous avons un token, authentifier la connexion
        if (this.token) {
          this.socket.send(`/auth ${this.token}`);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message = event.data;
          console.log('Received message:', message);
          
          // Notifier les écouteurs de messages
          if (this.messageListeners && this.messageListeners.length > 0) {
            this.messageListeners.forEach(listener => {
              try {
                listener(message);
              } catch (error) {
                console.error('Error in message listener:', error);
              }
            });
          }
          
          // Vérifier si c'est une réponse à une commande
          if (typeof message === 'string' && message.includes('|')) {
            const [commandId, response] = message.split('|', 2);
            
            if (this.pendingCommands[commandId]) {
              const { resolve } = this.pendingCommands[commandId];
              delete this.pendingCommands[commandId];
              
              try {
                // Essayer de parser la réponse comme JSON
                const jsonResponse = JSON.parse(response);
                resolve(jsonResponse);
              } catch (e) {
                // Si ce n'est pas du JSON, retourner la réponse brute
                resolve({ success: true, message: response });
              }
            }
          }
          
          // Traiter les messages normaux (non-commandes)
          try {
            // Essayer de parser comme JSON
            const jsonMessage = JSON.parse(message);
            
            // Si le message contient des informations sur les salons, mettre à jour
            if (jsonMessage.rooms) {
              this.updateChatRooms(jsonMessage.rooms);
            }
            
            // Si le message contient des informations sur l'utilisateur, mettre à jour
            if (jsonMessage.user) {
              this.user = {
                ...this.user,
                ...jsonMessage.user
              };
              this.notifyAuthListeners(this.user);
            }
            
            // Notifier les écouteurs de messages si nécessaire
            if (this.messageListeners && jsonMessage.message) {
              this.messageListeners.forEach(listener => {
                try {
                  listener(jsonMessage);
                } catch (error) {
                  console.error('Error in message listener:', error);
                }
              });
            }
          } catch (jsonError) {
            // Si ce n'est pas du JSON valide, ne pas générer d'erreur
            // Juste logger pour le débogage
            console.log('Received non-JSON message:', message);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      this.socket.onclose = () => {
        console.log('WebSocket connection closed');

        // Rejeter toutes les commandes en attente
        Object.values(this.pendingCommands).forEach(({ reject }) => {
          reject(new Error('WebSocket connection closed'));
        });

        this.pendingCommands = {};

        // Tenter de se reconnecter après un délai
        setTimeout(() => this.initWebSocket(), 5000);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  /**
   * Connecter un utilisateur
   * @param {string} email - Email de l'utilisateur
   * @param {string} password - Mot de passe de l'utilisateur
   * @returns {Promise} - Promise qui se résout avec l'utilisateur
   */
  async login(email, password) {
    try {
      // Utiliser la commande /login
      const loginCommand = `/login ${email} ${password}`;
      const data = await this.sendCommand(loginCommand);

      if (!data.success) {
        throw new Error(data.message || 'Échec de connexion');
      }

      // Stocker le token d'authentification
      this.token = data.token;
      localStorage.setItem('auth_token', data.token);

      // Stocker les informations de l'utilisateur
      this.user = {
        id: data.user_id || email,
        username: data.username,
        email: email,
        color: data.color || '#FFFFFF',
        joinedRooms: data.joined_rooms || []
      };

      // Récupérer les salons de chat disponibles
      if (data.chat_rooms) {
        this.chatRooms = data.chat_rooms;
      }

      this.notifyAuthListeners(this.user);

      return this.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Rejoindre un salon de chat
   * @param {string} roomName - Nom du salon
   * @param {string} password - Mot de passe du salon (optionnel)
   * @returns {Promise} - Promise qui se résout avec le résultat
   */
  async joinChatRoom(roomName, password = null) {
    try {
      // Utiliser la commande /cd pour rejoindre un salon
      const joinCommand = password
        ? `/cd ${roomName} ${password}`
        : `/cd ${roomName}`;

      const data = await this.sendCommand(joinCommand);

      if (!data.success) {
        throw new Error(data.message || 'Échec de connexion au salon');
      }

      // Mettre à jour la liste des salons rejoints par l'utilisateur
      if (this.user) {
        if (!this.user.joinedRooms.includes(roomName)) {
          this.user.joinedRooms = [...this.user.joinedRooms, roomName];
          this.notifyAuthListeners(this.user);
        }
      }

      return data;
    } catch (error) {
      console.error('Error joining chat room:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau salon de chat
   * @param {string} roomName - Nom du salon
   * @param {string} password - Mot de passe du salon (optionnel)
   * @returns {Promise} - Promise qui se résout avec le résultat
   */
  async createChatRoom(roomName, password = null) {
    try {
      // Utiliser la commande /cr pour créer un salon
      const createCommand = password
        ? `/cr ${roomName} ${password}`
        : `/cr ${roomName}`;

      const data = await this.sendCommand(createCommand);

      if (!data.success) {
        throw new Error(data.message || 'Échec de création du salon');
      }

      // Mettre à jour la liste des salons
      if (data.chat_rooms) {
        this.chatRooms = data.chat_rooms;
      }

      // Ajouter le salon à la liste des salons rejoints par l'utilisateur
      if (this.user) {
        if (!this.user.joinedRooms.includes(roomName)) {
          this.user.joinedRooms = [...this.user.joinedRooms, roomName];
          this.notifyAuthListeners(this.user);
        }
      }

      return data;
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  /**
   * Changer la couleur de l'utilisateur
   * @param {string} color - Couleur au format hexadécimal
   * @returns {Promise} - Promise qui se résout avec le résultat
   */
  async changeUserColor(color) {
    try {
      // Utiliser la commande /color
      const colorCommand = `/color ${color}`;
      const data = await this.sendCommand(colorCommand);

      if (!data.success) {
        throw new Error(data.message || 'Échec du changement de couleur');
      }

      // Mettre à jour la couleur de l'utilisateur
      if (this.user) {
        this.user.color = color;
        this.notifyAuthListeners(this.user);
      }

      return data;
    } catch (error) {
      console.error('Error changing user color:', error);
      throw error;
    }
  }

  /**
   * Obtenir la liste des utilisateurs dans un salon
   * @returns {Promise} - Promise qui se résout avec la liste des utilisateurs
   */
  async listUsers() {
    try {
      // Utiliser la commande /list
      const data = await this.sendCommand('/list');

      if (!data.success) {
        throw new Error(data.message || 'Échec de récupération des utilisateurs');
      }

      return data.users || [];
    } catch (error) {
      console.error('Error listing users:', error);
      throw error;
    }
  }

  /**
   * Obtenir l'historique des messages d'un salon
   * @returns {Promise} - Promise qui se résout avec l'historique des messages
   */
  async getHistory() {
    try {
      // Utiliser la commande /history
      const data = await this.sendCommand('/history');

      if (!data.success) {
        throw new Error(data.message || 'Échec de récupération de l\'historique');
      }

      return data.history || [];
    } catch (error) {
      console.error('Error getting history:', error);
      throw error;
    }
  }

  /**
   * S'abonner aux messages
   * @param {Function} listener - Fonction à appeler lors de la réception d'un message
   * @returns {Function} - Fonction pour se désabonner
   */
  onMessage(listener) {
    this.messageListeners = this.messageListeners || [];
    this.messageListeners.push(listener);

    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  /**
   * Vérifier si l'utilisateur est valide
   * @returns {boolean} - True si l'utilisateur est valide
   */
  hasValidUser() {
    return this.user !== null && this.user !== undefined;
  }
}

// Créer une instance du service d'authentification
const authService = new AuthService();

// Exporter l'instance par défaut
export default authService;

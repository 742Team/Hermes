import NotificationService from './NotificationService';

/**
 * Service for handling API connections
 */
class ApiService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3001/ws';
    this.socket = null;
    this.isConnected = false;
    this.connectionListeners = [];
    this.messageListeners = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.token = null;
    
    // Load token from storage if available
    this.loadToken();
  }
  
  /**
   * Load authentication token from storage
   */
  loadToken() {
    try {
      this.token = localStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error loading token:', error);
    }
  }
  
  /**
   * Set authentication token
   * @param {string} token - Authentication token
   */
  setToken(token) {
    this.token = token;
    try {
      localStorage.setItem('auth_token', token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }
  
  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    try {
      localStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }
  
  /**
   * Get headers for API requests
   * @returns {Object} - Headers object
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }
  
  /**
   * Make API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise} - Promise that resolves to response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: this.getHeaders(),
    };
    
    const fetchOptions = {
      ...defaultOptions,
      ...options,
    };
    
    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      
      // Check if response is empty
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  /**
   * Connect to WebSocket
   */
  connectWebSocket() {
    if (this.socket) {
      this.socket.close();
    }
    
    try {
      let wsUrlWithToken = this.wsUrl;
      if (this.token) {
        wsUrlWithToken = `${this.wsUrl}?token=${this.token}`;
      }
      
      this.socket = new WebSocket(wsUrlWithToken);
      
      this.socket.onopen = this.handleSocketOpen.bind(this);
      this.socket.onclose = this.handleSocketClose.bind(this);
      this.socket.onerror = this.handleSocketError.bind(this);
      this.socket.onmessage = this.handleSocketMessage.bind(this);
      
      this.notifyConnectionListeners('connecting');
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.notifyConnectionListeners('disconnected');
      this.scheduleReconnect();
    }
  }
  
  /**
   * Handle WebSocket open event
   */
  handleSocketOpen() {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.notifyConnectionListeners('connected');
    
    // Send a ping every 30 seconds to keep the connection alive
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }
  
  /**
   * Handle WebSocket close event
   */
  handleSocketClose() {
    console.log('WebSocket disconnected');
    this.isConnected = false;
    this.notifyConnectionListeners('disconnected');
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.scheduleReconnect();
  }
  
  /**
   * Handle WebSocket error event
   * @param {Event} error - Error event
   */
  handleSocketError(error) {
    console.error('WebSocket error:', error);
    this.isConnected = false;
    this.notifyConnectionListeners('disconnected');
  }
  
  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event - Message event
   */
  handleSocketMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle different message types
      switch (data.type) {
        case 'message':
          this.notifyMessageListeners(data.payload);
          
          // Show notification if enabled
          if (data.payload && !data.payload.isSent) {
            NotificationService.showNotification({
              title: data.payload.sender || 'New Message',
              body: data.payload.text,
              icon: data.payload.senderAvatar
            });
          }
          break;
          
        case 'typing':
          // Handle typing indicator
          this.notifyMessageListeners({
            type: 'typing',
            conversationId: data.payload.conversationId,
            userId: data.payload.userId,
            isTyping: data.payload.isTyping
          });
          break;
          
        case 'read':
          // Handle read receipts
          this.notifyMessageListeners({
            type: 'read',
            conversationId: data.payload.conversationId,
            messageIds: data.payload.messageIds
          });
          break;
          
        case 'pong':
          // Server responded to our ping
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  /**
   * Schedule WebSocket reconnection
   */
  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Scheduling reconnect in ${delay}ms`);
      
      this.reconnectTimeout = setTimeout(() => {
        console.log(`Reconnect attempt ${this.reconnectAttempts + 1}`);
        this.reconnectAttempts++;
        this.connectWebSocket();
      }, delay);
    } else {
      console.log('Max reconnect attempts reached');
      NotificationService.showNotification({
        title: 'Connection Error',
        body: 'Unable to connect to the server. Please check your internet connection.'
      });
    }
  }
  
  /**
   * Send message via WebSocket
   * @param {Object} message - Message to send
   * @returns {boolean} - True if message was sent
   */
  sendMessage(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify({
        type: 'message',
        payload: message
      }));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }
  
  /**
   * Send typing indicator
   * @param {string} conversationId - Conversation ID
   * @param {boolean} isTyping - Whether user is typing
   */
  sendTypingIndicator(conversationId, isTyping) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      this.socket.send(JSON.stringify({
        type: 'typing',
        payload: {
          conversationId,
          isTyping
        }
      }));
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }
  
  /**
   * Send read receipt
   * @param {string} conversationId - Conversation ID
   * @param {Array<string>} messageIds - Message IDs that were read
   */
  sendReadReceipt(conversationId, messageIds) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      this.socket.send(JSON.stringify({
        type: 'read',
        payload: {
          conversationId,
          messageIds
        }
      }));
    } catch (error) {
      console.error('Error sending read receipt:', error);
    }
  }
  
  /**
   * Add connection status listener
   * @param {Function} listener -
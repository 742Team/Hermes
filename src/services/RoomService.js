import AuthService from './AuthService';

class RoomService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://195.35.1.108:3630';
    this.rooms = [];
    this.roomListeners = [];
  }

  // Récupérer tous les salons publics
  async getPublicRooms() {
    try {
      // Essayer d'abord d'utiliser les salons déjà connus par AuthService
      const authRooms = AuthService.getChatRooms();
      if (Array.isArray(authRooms) && authRooms.length > 0) {
        console.log('Using rooms from AuthService:', authRooms);
        this.updateRooms(authRooms);
        return authRooms;
      }
      
      // Si pas de salons dans AuthService, essayer les endpoints API
      let response;
      try {
        response = await fetch(`${this.baseUrl}/api/rooms/public`);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        
        const data = await response.json();
        console.log('Received rooms from API:', data);
        
        const rooms = Array.isArray(data) ? data : [];
        this.updateRooms(rooms);
        return rooms;
      } catch (fetchError) {
        console.log('First endpoint failed, trying fallback endpoint');
        
        try {
          response = await fetch(`${this.baseUrl}/api/public_rooms`);
          if (!response.ok) throw new Error(`Status: ${response.status}`);
          
          const data = await response.json();
          console.log('Received rooms from fallback API:', data);
          
          const rooms = Array.isArray(data) ? data : [];
          this.updateRooms(rooms);
          return rooms;
        } catch (fallbackError) {
          console.error('All API endpoints failed');
          // Retourner les salons en cache si disponibles
          return this.rooms.length > 0 ? this.rooms : [];
        }
      }
    } catch (error) {
      console.error('Error fetching public rooms:', error);
      return this.rooms.length > 0 ? this.rooms : [];
    }
  }

  // Récupérer les salons rejoints par l'utilisateur
  async getJoinedRooms() {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        console.warn('No user logged in, cannot fetch joined rooms');
        return [];
      }
      
      // Si l'utilisateur a des salons rejoints, les retourner
      if (user.joinedRooms && Array.isArray(user.joinedRooms)) {
        return user.joinedRooms;
      }
      
      // Sinon, essayer de les récupérer via AuthService
      const rooms = AuthService.getJoinedRooms ? AuthService.getJoinedRooms() : [];
      return Array.isArray(rooms) ? rooms : [];
    } catch (error) {
      console.error('Error fetching joined rooms:', error);
      return [];
    }
  }

  // Récupérer tous les salons (publics + rejoints)
  async getAllRooms() {
    try {
      const publicRooms = await this.getPublicRooms();
      const joinedRooms = await this.getJoinedRooms();
      
      // S'assurer que publicRooms et joinedRooms sont des tableaux
      const safePublicRooms = Array.isArray(publicRooms) ? publicRooms : [];
      const safeJoinedRooms = Array.isArray(joinedRooms) ? joinedRooms : [];
      
      // Fusionner les deux listes en évitant les doublons
      const allRooms = [...safePublicRooms];
      
      safeJoinedRooms.forEach(joinedRoom => {
        // Vérifier si la room a un ID ou un nom pour la comparaison
        const joinedRoomId = joinedRoom.id || joinedRoom.name;
        if (joinedRoomId && !allRooms.some(room => (room.id || room.name) === joinedRoomId)) {
          allRooms.push(joinedRoom);
        }
      });
      
      this.updateRooms(allRooms);
      return allRooms;
    } catch (error) {
      console.error('Error fetching all rooms:', error);
      return [];
    }
  }

  // Créer un nouveau salon via WebSocket
  // Add or modify the createRoom method
  async createRoom(name, password = null) {
    try {
      const command = password ? `/cr ${name} ${password}` : `/cr ${name}`;
      const result = await AuthService.sendCommand(command);
      
      // Add the room to the local list immediately
      const newRoom = {
        id: `room-${Date.now()}`,
        name: name,
        isGroup: true,
        lastMessage: '',
        unreadCount: 0,
        password: password // Store password for later use
      };
      
      // Update rooms list
      this.rooms = [...this.rooms, newRoom];
      this.notifyRoomListeners();
      
      return result;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  // Add or modify the joinRoom method
  async joinRoom(room) {
    try {
      const command = room.password ? `/cd ${room.name} ${room.password}` : `/cd ${room.name}`;
      const result = await AuthService.sendCommand(command);
      return result;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  // Mettre à jour la liste des salons et notifier les écouteurs
  updateRooms(rooms) {
    if (!Array.isArray(rooms)) {
      console.error('Expected rooms to be an array, got:', rooms);
      rooms = [];
    }
    
    this.rooms = rooms.map(room => {
      if (!room) return null;
      
      return {
        id: room.id || room.name || `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: room.name || 'Salon sans nom',
        isGroup: true,
        creator: room.creator || 'Inconnu',
        users_count: room.users_count || 0,
        lastMessage: room.lastMessage || '',
        unreadCount: room.unreadCount || 0,
        participants: room.users_count || room.participants || 0,
        avatar: null // Pour permettre l'utilisation d'un avatar par défaut
      };
    }).filter(Boolean); // Filtrer les valeurs null
    
    this.notifyRoomListeners();
  }

  // S'abonner aux changements de la liste des salons
  onRoomsChange(listener) {
    this.roomListeners.push(listener);
    
    // Retourner une fonction pour se désabonner
    return () => {
      this.roomListeners = this.roomListeners.filter(l => l !== listener);
    };
  }

  // Notifier tous les écouteurs des changements
  notifyRoomListeners() {
    this.roomListeners.forEach(listener => {
      try {
        listener(this.rooms);
      } catch (error) {
        console.error('Error in room listener:', error);
      }
    });
  }
}

const roomService = new RoomService();
export default roomService;
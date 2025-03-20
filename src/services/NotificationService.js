/**
 * Service for handling system notifications
 */
class NotificationService {
  constructor() {
    this.isElectron = window.electron !== undefined;
    this.notificationsEnabled = process.env.REACT_APP_ENABLE_NOTIFICATIONS === 'true';
    this.hasPermission = false;
    
    // Check for notification permission
    if (this.notificationsEnabled && 'Notification' in window) {
      this.hasPermission = Notification.permission === 'granted';
      
      if (Notification.permission === 'default') {
        this.requestPermission();
      }
    }
  }
  
  /**
   * Request notification permission
   * @returns {Promise<boolean>} - Promise that resolves to true if permission is granted
   */
  requestPermission() {
    return new Promise((resolve) => {
      if (!('Notification' in window)) {
        this.hasPermission = false;
        resolve(false);
        return;
      }
      
      Notification.requestPermission().then(permission => {
        this.hasPermission = permission === 'granted';
        resolve(this.hasPermission);
      });
    });
  }
  
  /**
   * Show a notification
   * @param {Object} options - Notification options
   * @param {string} options.title - Notification title
   * @param {string} options.body - Notification body
   * @param {string} options.icon - Notification icon URL
   * @param {Function} options.onClick - Function to call when notification is clicked
   */
  showNotification({ title, body, icon, onClick }) {
    if (!this.notificationsEnabled) return;
    
    // In Electron, notifications are handled by the main process
    if (this.isElectron) {
      // Electron will handle notifications via IPC
      return;
    }
    
    // In web, use the Notification API
    if (this.hasPermission) {
      const notification = new Notification(title, {
        body,
        icon,
        silent: false
      });
      
      if (onClick) {
        notification.onclick = onClick;
      }
    }
  }
}

export default new NotificationService();
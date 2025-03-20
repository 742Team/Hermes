import StorageService from './StorageService';

const THEME_KEY = 'app_theme';

/**
 * Service for handling theme preferences
 */
class ThemeService {
  constructor() {
    this.theme = StorageService.getItem(THEME_KEY, 'system');
    this.listeners = [];
    
    // Initialize theme
    this.applyTheme(this.theme);
    
    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.handleSystemThemeChange);
    }
  }
  
  /**
   * Get current theme
   * @returns {string} - Current theme ('light', 'dark', or 'system')
   */
  getTheme() {
    return this.theme;
  }
  
  /**
   * Set theme
   * @param {string} theme - Theme to set ('light', 'dark', or 'system')
   */
  setTheme(theme) {
    if (['light', 'dark', 'system'].includes(theme)) {
      this.theme = theme;
      StorageService.setItem(THEME_KEY, theme);
      this.applyTheme(theme);
      this.notifyListeners();
    }
  }
  
  /**
   * Apply theme to document
   * @param {string} theme - Theme to apply
   */
  applyTheme(theme) {
    const isDark = theme === 'dark' || 
      (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }
  
  /**
   * Handle system theme change
   */
  handleSystemThemeChange = () => {
    if (this.theme === 'system') {
      this.applyTheme('system');
      this.notifyListeners();
    }
  }
  
  /**
   * Add theme change listener
   * @param {Function} listener - Function to call when theme changes
   * @returns {Function} - Function to remove listener
   */
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Notify all listeners of theme change
   */
  notifyListeners() {
    const isDark = this.theme === 'dark' || 
      (this.theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    this.listeners.forEach(listener => {
      listener(isDark ? 'dark' : 'light');
    });
  }
}

export default new ThemeService();
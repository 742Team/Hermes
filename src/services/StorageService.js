/**
 * Service for handling local storage
 */
class StorageService {
  /**
   * Set an item in storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  setItem(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Error storing data:', error);
    }
  }
  
  /**
   * Get an item from storage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key doesn't exist
   * @returns {any} - Stored value or default value
   */
  getItem(key, defaultValue = null) {
    try {
      const serializedValue = localStorage.getItem(key);
      if (serializedValue === null) {
        return defaultValue;
      }
      return JSON.parse(serializedValue);
    } catch (error) {
      console.error('Error retrieving data:', error);
      return defaultValue;
    }
  }
  
  /**
   * Remove an item from storage
   * @param {string} key - Storage key
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
    }
  }
  
  /**
   * Clear all storage
   */
  clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}

// At the end of the file, replace:
// export default new StorageService();
// with:
const storageServiceInstance = new StorageService();
export default storageServiceInstance;
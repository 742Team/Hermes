const { contextBridge, ipcRenderer } = require('electron');

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  sendMessage: (message) => ipcRenderer.send('message-send', message),
  onMessageReceived: (callback) => ipcRenderer.on('message-received', (event, message) => callback(message)),
  removeMessageListener: () => ipcRenderer.removeAllListeners('message-received'),
  selectAttachment: () => ipcRenderer.invoke('select-attachment')
});
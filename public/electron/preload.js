const { contextBridge, ipcRenderer } = require('electron');

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  sendMessage: (message) => ipcRenderer.send('message-send', message),
  onMessageReceived: (callback) => {
    const listener = (event, message) => callback(message);
    ipcRenderer.on('message-received', listener);
    return () => ipcRenderer.removeListener('message-received', listener);
  },
  removeMessageListener: () => ipcRenderer.removeAllListeners('message-received'),
  selectAttachment: () => ipcRenderer.invoke('select-attachment')
});
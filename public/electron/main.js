const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset', // Style Apple avec barre de titre intégrée
    vibrancy: 'under-window', // Effet de verre dépoli (macOS)
    visualEffectState: 'active',
    backgroundColor: '#00ffffff' // Transparent pour permettre l'effet de verre
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle message sending
ipcMain.on('message-send', (event, message) => {
  console.log('Message sent:', message);
  
  // Here you would implement the actual backend communication
  // For now, we'll simulate a response
  setTimeout(() => {
    const response = {
      id: Date.now(),
      conversationId: message.conversationId,
      text: `Response to: ${message.text}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSent: false,
      isRead: true
    };
    
    event.reply('message-received', response);
    
    // Show notification if window is not focused
    if (!mainWindow.isFocused()) {
      new Notification({
        title: 'New Message',
        body: response.text,
        silent: false
      }).show();
    }
  }, 2000);
});

// Handle file attachment selection
ipcMain.handle('select-attachment', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);
    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;
    
    // For images, create a data URL
    if (/\.(jpg|jpeg|png|gif)$/i.test(fileName)) {
      const fileData = fs.readFileSync(filePath);
      const base64Data = fileData.toString('base64');
      const mimeType = `image/${path.extname(filePath).substring(1)}`;
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      
      return {
        name: fileName,
        size: fileSize,
        type: 'image',
        url: dataUrl
      };
    }
    
    // For other files, just return metadata
    return {
      name: fileName,
      size: fileSize,
      type: 'file',
      path: filePath
    };
  }
  
  return null;
});
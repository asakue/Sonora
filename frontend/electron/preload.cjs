const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getUserProfile: () => ipcRenderer.invoke('get-user-profile'),
  saveUserProfile: (data) => ipcRenderer.invoke('save-user-profile', data),
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  isElectron: true,
});

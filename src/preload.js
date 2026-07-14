const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  setMode: (mode) => ipcRenderer.send('window:set-mode', mode),
  getLaunchAtLogin: () => ipcRenderer.invoke('settings:get-launch-at-login'),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke('settings:set-launch-at-login', enabled),
  getSession: () => ipcRenderer.invoke('system:get-session')
});


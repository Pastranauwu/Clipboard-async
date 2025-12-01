const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expone API segura al renderer process
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Obtener historial de portapapeles
  getHistory: () => ipcRenderer.invoke('get-history'),
  
  // Escribir ítem al portapapeles
  writeToClipboard: (itemId) => ipcRenderer.invoke('write-to-clipboard', itemId),
  
  // Limpiar historial
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  
  // Eliminar un ítem del historial
  removeFromHistory: (itemId) => ipcRenderer.invoke('remove-from-history', itemId),
  
  // Obtener estadísticas
  getStats: () => ipcRenderer.invoke('get-stats'),
  
  // Obtener configuración
  getConfig: () => ipcRenderer.invoke('get-config'),
  
  // Actualizar configuración
  updateConfig: (path, value) => ipcRenderer.invoke('update-config', path, value),
  
  // Actualizar lista de peers
  updatePeers: (peers) => ipcRenderer.invoke('update-peers', peers),

  // Agregar nuevo peer
  addPeer: (data) => ipcRenderer.invoke('add-peer', data),

  // Eliminar peer
  removePeer: (ip) => ipcRenderer.invoke('remove-peer', ip),

  // Cerrar ventana
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Minimizar ventana
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  
  // Escuchar actualizaciones de historial
  onHistoryUpdated: (callback) => {
    ipcRenderer.on('history-updated', (event, history) => callback(history));
  },

  // Escuchar actualizaciones de configuración
  onConfigUpdate: (callback) => ipcRenderer.on('config-update', (_event, value) => callback(value)),
  
  // Remover listener de historial
  removeHistoryListener: () => {
    ipcRenderer.removeAllListeners('history-updated');
  }
});

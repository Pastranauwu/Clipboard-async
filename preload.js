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
  
  // Obtener estadísticas
  getStats: () => ipcRenderer.invoke('get-stats'),
  
  // Obtener configuración
  getConfig: () => ipcRenderer.invoke('get-config'),
  
  // Actualizar configuración
  updateConfig: (path, value) => ipcRenderer.invoke('update-config', path, value),
  
  // Cerrar ventana
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Minimizar ventana
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  
  // Escuchar actualizaciones de historial
  onHistoryUpdated: (callback) => {
    ipcRenderer.on('history-updated', (event, history) => callback(history));
  },
  
  // Remover listener de historial
  removeHistoryListener: () => {
    ipcRenderer.removeAllListeners('history-updated');
  }
});

const { app, BrowserWindow, globalShortcut, ipcMain, Notification, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const ConfigManager = require('./modules/config');
const ClipboardManager = require('./modules/clipboardManager');
const SyncServer = require('./modules/syncServer');
const SyncClient = require('./modules/syncClient');

// Variables globales
let mainWindow = null;
let tray = null;
let configManager = null;
let clipboardManager = null;
let syncServer = null;
let syncClient = null;

/**
 * Crea el icono de la bandeja del sistema
 */
function createTray() {
  // Cargar icono desde archivo
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let icon;
  
  // Intentar cargar desde archivo
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  }
  
  // Si no se pudo cargar, usar icono base64 como fallback
  if (!icon || icon.isEmpty()) {
    icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKLSURBVFiFxZdPaBNBFMZ/b3Y3m2Q3TZo/mrSxaA8xFKQgCIIHD4J48OBBRPDgQRDBk+BBPHjy4EUQxIMgCB4EQfDgQbx4EAQFDx6k0Fob2rRJ0yTbZHd2dmdedtNuN9lNutV+sLCZ/fu99775Zt4uhBBYR5IkSZIkSZKknxJCYB0piiJJkiRJkiT9lBACGyCEwAYIIbABQghsgBACGyCEwAYIIbABQghsgBACGyCEwAYIIbABQghsgBACGyCEwAYIIbABQghsgBACGyCEwAYIIbABQghsgBACGyCEwAYIIbABQghsgBACGyCEwAYIIbABQghsQLskRVEkSZIkSZL+SgjRpv8KIVqEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEBBCQAgBIQSEEPgD9P6yz+vV5QMAAAAASUVORK5CYII=');
  }
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar ventana',
      click: () => {
        toggleWindow();
      }
    },
    {
      label: 'Ver historial',
      click: () => {
        if (!mainWindow) {
          createWindow();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Estadísticas',
      click: async () => {
        const stats = clipboardManager.getStats();
        showNotification('Estadísticas', `Total: ${stats.total} | Texto: ${stats.text} | Imágenes: ${stats.images}`);
      }
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Clipboard Manager');
  tray.setContextMenu(contextMenu);
  
  // Click en el icono abre/cierra la ventana
  tray.on('click', () => {
    toggleWindow();
  });
  
  console.log('Tray icon created');
}

/**
 * Inicializa la aplicación
 */
function initialize() {
  // Cargar configuración
  configManager = new ConfigManager();
  const config = configManager.loadConfig();
  
  console.log('=== Clipboard Manager Starting ===');
  console.log('Config loaded from:', configManager.configPath);
  
  // Inicializar clipboard manager
  clipboardManager = new ClipboardManager(config);
  
  // Inicializar servidor de sincronización
  syncServer = new SyncServer(config, configManager);
  
  // Inicializar cliente de sincronización
  syncClient = new SyncClient(config, configManager);
  
  // Configurar event handlers
  setupEventHandlers();
  
  // Iniciar servicios
  clipboardManager.startMonitoring();
  
  if (config.sync.enabled) {
    syncServer.start();
    syncClient.connectToPeers();
  }
  
  console.log('=== Clipboard Manager Initialized ===');
}

/**
 * Configura los event handlers entre módulos
 */
function setupEventHandlers() {
  // Clipboard cambió localmente -> enviar a peers
  clipboardManager.on('clipboard-changed', (item) => {
    syncClient.sendClipboardItem(item);
  });
  
  // Historial actualizado -> notificar a UI
  clipboardManager.on('history-updated', (history) => {
    if (mainWindow) {
      mainWindow.webContents.send('history-updated', history);
    }
  });
  
  // Imagen muy grande
  clipboardManager.on('image-too-large', (size) => {
    showNotification('Imagen muy grande', `La imagen (${formatBytes(size)}) excede el límite configurado`);
  });
  
  // Servidor recibió clipboard de peer -> agregar a historial
  syncServer.on('clipboard-received', (item) => {
    clipboardManager.addRemoteItem(item);
  });
  
  // Solicitud de historial del servidor
  syncServer.on('history-request', (callback) => {
    const history = clipboardManager.getHistory();
    callback(history);
  });
  
  // Cliente recibió clipboard de peer -> agregar a historial
  syncClient.on('clipboard-received', (item) => {
    clipboardManager.addRemoteItem(item);
  });
  
  // Cliente conectado/desconectado
  syncClient.on('peer-connected', (peer) => {
    console.log(`Peer connected: ${peer.name} (${peer.ip})`);
    showNotification('Peer conectado', `${peer.name} (${peer.ip})`);
  });
  
  syncClient.on('peer-disconnected', (peer) => {
    console.log(`Peer disconnected: ${peer.name} (${peer.ip})`);
  });
}

/**
 * Crea la ventana flotante
 */
function createWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  // Cargar icono para la ventana
  const windowIconPath = path.join(__dirname, 'assets', 'window-icon.png');
  let windowIcon = null;
  if (fs.existsSync(windowIconPath)) {
    windowIcon = nativeImage.createFromPath(windowIconPath);
  }

  mainWindow = new BrowserWindow({
    width: 450,
    height: 650,
    show: false,
    frame: false,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: false,
    icon: windowIcon, // Agregar icono a la ventana
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('renderer/index.html');

  // Mostrar cuando esté listo
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Ocultar en lugar de cerrar
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('blur', () => {
    // Ocultar ventana al perder foco (opcional, puede ser molesto)
    // mainWindow.hide();
  });
}

/**
 * Registra el atajo global
 */
function registerGlobalShortcut() {
  const config = configManager.config;
  const hotkey = config.ui.globalShortcut;

  const ret = globalShortcut.register(hotkey, () => {
    console.log('Global shortcut triggered:', hotkey);
    toggleWindow();
  });

  if (!ret) {
    console.error('Global shortcut registration failed:', hotkey);
    showNotification('Error', `No se pudo registrar el atajo ${hotkey}`);
  } else {
    console.log('Global shortcut registered:', hotkey);
  }
}

/**
 * Alterna la visibilidad de la ventana
 */
function toggleWindow() {
  if (!mainWindow) {
    createWindow();
  } else if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

/**
 * Muestra una notificación
 */
function showNotification(title, body) {
  const config = configManager.config;
  if (!config.ui.showNotifications) return;

  const notification = new Notification({
    title: title,
    body: body,
    silent: true
  });

  notification.show();
}

/**
 * Formatea bytes a tamaño legible
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ===== IPC Handlers =====

ipcMain.handle('get-history', async () => {
  return clipboardManager.getHistory();
});

ipcMain.handle('write-to-clipboard', async (event, itemId) => {
  const result = clipboardManager.writeToClipboard(itemId);
  if (result && mainWindow) {
    mainWindow.hide();
  }
  return result;
});

ipcMain.handle('clear-history', async () => {
  clipboardManager.clearHistory();
  return true;
});

ipcMain.handle('remove-from-history', async (event, itemId) => {
  return clipboardManager.removeFromHistory(itemId);
});

ipcMain.handle('get-stats', async () => {
  return {
    clipboard: clipboardManager.getStats(),
    server: syncServer.getStats(),
    client: syncClient.getStats()
  };
});

ipcMain.handle('get-config', async () => {
  return configManager.config;
});

ipcMain.handle('update-config', async (event, path, value) => {
  configManager.updateConfig(path, value);
  return true;
});

ipcMain.handle('update-peers', async (event, peers) => {
  const config = configManager.getConfig();
  config.sync.peers = peers;
  configManager.saveConfig();
  
  // Actualizar conexiones en tiempo real
  if (syncClient) {
      // Desconectar peers deshabilitados
      peers.forEach(p => {
          if (!p.enabled) {
              syncClient.disconnectFromPeer(p.ip);
          } else {
              // Intentar conectar si está habilitado y no conectado
              syncClient.connectToPeer(p.ip, p.name || 'Manual');
          }
      });
  }
  return true;
});

ipcMain.handle('add-peer', async (event, { ip, name }) => {
  const config = configManager.getConfig();
  
  // Asegurar que existe el array
  if (!config.sync.peers) config.sync.peers = [];

  // Verificar duplicados
  const exists = config.sync.peers.find(p => p.ip === ip);
  if (exists) return false;

  // Agregar nuevo peer
  config.sync.peers.push({
      ip: ip,
      name: name || 'Manual',
      enabled: true
  });

  // Guardar configuración
  configManager.saveConfig();
  
  // Intentar conectar inmediatamente
  if (syncClient) {
      syncClient.connectToPeer(ip, name || 'Manual');
  }

  // Enviar actualización a la UI para que aparezca en la lista
  if (mainWindow) {
      mainWindow.webContents.send('config-update', config);
  }
  
  return true;
});

ipcMain.handle('remove-peer', async (event, ip) => {
  const config = configManager.getConfig();
  
  if (!config.sync.peers) return false;

  // Filtrar el peer a eliminar
  const initialLength = config.sync.peers.length;
  config.sync.peers = config.sync.peers.filter(p => p.ip !== ip);

  if (config.sync.peers.length === initialLength) return false; // No se encontró

  // Guardar configuración
  configManager.saveConfig();

  // Desconectar
  if (syncClient) {
      syncClient.disconnectFromPeer(ip);
  }

  // Enviar actualización a la UI
  if (mainWindow) {
      mainWindow.webContents.send('config-update', config);
  }

  return true;
});

ipcMain.handle('close-window', async () => {
  if (mainWindow) {
    mainWindow.hide();
  }
  return true;
});

ipcMain.handle('minimize-window', async () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
  return true;
});

// ===== Lifecycle de la aplicación =====

app.whenReady().then(() => {
  initialize();
  createTray();
  registerGlobalShortcut();
  
  // No abrir ventana al inicio, solo en background
  // La ventana se abrirá con el atajo global o click en tray
});

app.on('window-all-closed', () => {
  // No cerrar la aplicación, mantener en background
  console.log('All windows closed, but app continues running in background');
});

app.on('activate', () => {
  // En macOS, re-crear ventana al hacer click en el dock si no hay ventanas
  if (process.platform === 'darwin' && !mainWindow) {
    createWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  // Limpiar recursos
  globalShortcut.unregisterAll();
  
  if (clipboardManager) {
    clipboardManager.stopMonitoring();
  }
  
  if (syncServer) {
    syncServer.stop();
  }
  
  if (syncClient) {
    syncClient.disconnectAll();
  }
  
  console.log('=== Clipboard Manager Stopped ===');
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

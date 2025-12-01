const WebSocket = require('ws');
const os = require('os');
const EventEmitter = require('events');

/**
 * Servidor WebSocket para recibir actualizaciones de peers
 */
class SyncServer extends EventEmitter {
  constructor(config, configManager) {
    super();
    this.config = config;
    this.configManager = configManager;
    this.server = null;
    this.clients = new Set();
  }

  /**
   * Detecta la IP de Tailscale
   */
  getTailscaleIP() {
    const interfaces = os.networkInterfaces();
    
    for (const name in interfaces) {
      // Buscar interfaces de Tailscale
      if (name.startsWith('tailscale') || name.startsWith('utun')) {
        for (const iface of interfaces[name]) {
          // Tailscale usa el rango 100.x.x.x
          if (iface.address.startsWith('100.') && iface.family === 'IPv4') {
            return iface.address;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Inicia el servidor WebSocket
   */
  start() {
    if (this.server) {
      console.log('Server already running');
      return;
    }

    const tailscaleIP = this.getTailscaleIP();
    const host = tailscaleIP || '0.0.0.0';
    const port = this.config.sync.port;

    try {
      this.server = new WebSocket.Server({ 
        host: host,
        port: port 
      });

      this.server.on('listening', () => {
        console.log(`WebSocket server listening on ${host}:${port}`);
        if (tailscaleIP) {
          console.log(`Tailscale IP detected: ${tailscaleIP}`);
        } else {
          console.warn('Tailscale IP not detected, listening on all interfaces');
        }
        this.emit('server-started', { host, port });
      });

      this.server.on('connection', (ws, req) => {
        this.handleConnection(ws, req);
      });

      this.server.on('error', (error) => {
        console.error('WebSocket server error:', error);
        this.emit('server-error', error);
      });

    } catch (error) {
      console.error('Failed to start WebSocket server:', error);
      this.emit('server-error', error);
    }
  }

  /**
   * Maneja nueva conexión de cliente
   */
  handleConnection(ws, req) {
    const clientIP = req.socket.remoteAddress;
    console.log(`New connection from ${clientIP}`);

    // Verificar autenticación
    if (this.config.security.requireAuth) {
      const token = req.headers['x-auth-token'];
      const timestamp = parseInt(req.headers['x-timestamp']);

      if (!this.authenticateConnection(token, timestamp)) {
        console.warn(`Authentication failed from ${clientIP}`);
        ws.close(1008, 'Unauthorized');
        return;
      }
    }

    // Agregar cliente
    this.clients.add(ws);
    console.log(`Client authenticated: ${clientIP}, total clients: ${this.clients.size}`);

    // Manejar mensajes
    ws.on('message', (data) => {
      this.handleMessage(ws, data, clientIP);
    });

    // Manejar desconexión
    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`Client disconnected: ${clientIP}, total clients: ${this.clients.size}`);
    });

    // Manejar errores
    ws.on('error', (error) => {
      console.error(`WebSocket error from ${clientIP}:`, error);
    });

    // Enviar confirmación de conexión
    ws.send(JSON.stringify({
      type: 'connection-ack',
      timestamp: Date.now()
    }));
  }

  /**
   * Autentica una conexión
   */
  authenticateConnection(token, timestamp) {
    if (!token || !timestamp) {
      console.warn('Missing authentication credentials');
      return false;
    }

    // Verificar validez del timestamp
    if (!this.configManager.isTimestampValid(timestamp)) {
      console.warn('Token expired or timestamp invalid');
      return false;
    }

    // Verificar token HMAC
    if (!this.configManager.verifyToken(token, timestamp)) {
      console.warn('Token verification failed');
      return false;
    }

    return true;
  }

  /**
   * Maneja mensaje recibido
   */
  handleMessage(ws, data, clientIP) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'clipboard-update':
          this.handleClipboardUpdate(message.item, clientIP);
          break;
        
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        
        case 'history-request':
          this.handleHistoryRequest(ws);
          break;
        
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Maneja actualización de portapapeles
   */
  handleClipboardUpdate(item, clientIP) {
    // Validar el ítem
    if (!this.validateClipboardItem(item)) {
      console.warn('Invalid clipboard item received');
      return;
    }

    console.log(`Received clipboard update from ${clientIP}: ${item.type} (${item.sizeBytes} bytes)`);

    // Emitir evento para que ClipboardManager lo procese
    this.emit('clipboard-received', item);
  }

  /**
   * Valida un ítem de portapapeles
   */
  validateClipboardItem(item) {
    if (!item || typeof item !== 'object') return false;
    if (!item.id || !item.type || !item.timestamp) return false;
    if (!['text', 'image'].includes(item.type)) return false;
    if (typeof item.sizeBytes !== 'number') return false;
    if (item.sizeBytes > this.config.clipboard.maxImageSize) {
      console.warn(`Item too large: ${item.sizeBytes} bytes`);
      return false;
    }
    if (!item.data) return false;
    
    return true;
  }

  /**
   * Maneja solicitud de historial
   */
  handleHistoryRequest(ws) {
    // Emitir evento para obtener historial
    this.emit('history-request', (history) => {
      ws.send(JSON.stringify({
        type: 'history-response',
        history: history,
        timestamp: Date.now()
      }));
    });
  }

  /**
   * Broadcast a todos los clientes conectados
   */
  broadcast(message) {
    const data = JSON.stringify(message);
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
        sentCount++;
      }
    });

    console.log(`Broadcast to ${sentCount} clients`);
  }

  /**
   * Detiene el servidor
   */
  stop() {
    if (!this.server) return;

    console.log('Stopping WebSocket server...');

    // Cerrar todas las conexiones de clientes
    this.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });
    this.clients.clear();

    // Cerrar el servidor
    this.server.close(() => {
      console.log('WebSocket server stopped');
      this.emit('server-stopped');
    });

    this.server = null;
  }

  /**
   * Obtiene estadísticas del servidor
   */
  getStats() {
    return {
      running: this.server !== null,
      connectedClients: this.clients.size,
      tailscaleIP: this.getTailscaleIP(),
      port: this.config.sync.port
    };
  }
}

module.exports = SyncServer;

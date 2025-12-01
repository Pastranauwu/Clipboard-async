const WebSocket = require('ws');
const EventEmitter = require('events');

/**
 * Cliente de sincronización para conectar a peers
 */
class SyncClient extends EventEmitter {
  constructor(config, configManager) {
    super();
    this.config = config;
    this.configManager = configManager;
    this.connections = new Map(); // peer IP -> WebSocket
    this.reconnectTimers = new Map(); // peer IP -> timer
    this.reconnectAttempts = new Map(); // peer IP -> attempt count
  }

  /**
   * Conecta a todos los peers configurados
   */
  async connectToPeers() {
    if (!this.config.sync.enabled || !this.config.sync.autoConnect) {
      console.log('Sync disabled or autoConnect off');
      return;
    }

    // Intentar descubrir peers de Tailscale
    try {
      const tailscalePeers = await this.getTailscalePeers();
      if (tailscalePeers.length > 0) {
        console.log(`Found ${tailscalePeers.length} Tailscale peers`);
        
        let configChanged = false;
        // Usar la referencia directa a la configuración para poder guardar
        const currentPeers = this.config.sync.peers;

        tailscalePeers.forEach(tp => {
          // Agregar si no existe ya
          if (!currentPeers.find(p => p.ip === tp.ip)) {
            currentPeers.push(tp);
            configChanged = true;
            console.log(`New Tailscale peer detected: ${tp.name} (${tp.ip})`);
          }
        });

        // Si hubo nuevos peers, guardar en config.json
        if (configChanged) {
          this.configManager.updateConfig('sync.peers', currentPeers);
          console.log('Configuration updated with new peers');
        }
      }
    } catch (err) {
      console.warn('Tailscale discovery failed:', err.message);
    }

    // Usar la lista actualizada de la configuración
    const peers = this.config.sync.peers;

    if (peers.length === 0) {
      console.log('No peers configured or found');
      return;
    }

    console.log(`Connecting to ${peers.length} peer(s)...`);
    peers.forEach(peer => {
      this.connectToPeer(peer.ip, peer.name);
    });
  }

  /**
   * Obtiene peers desde Tailscale CLI
   */
  async getTailscalePeers() {
    try {
      const { stdout } = await execAsync('tailscale status --json');
      const status = JSON.parse(stdout);
      const peers = [];
      
      if (status.Peer) {
        Object.values(status.Peer).forEach(peer => {
          // Solo peers online y con IP válida
          if (peer.Online && peer.TailscaleIPs && peer.TailscaleIPs.length > 0) {
            peers.push({
              ip: peer.TailscaleIPs[0],
              name: peer.HostName
            });
          }
        });
      }
      return peers;
    } catch (error) {
      // Silencioso si no está instalado o falla
      return [];
    }
  }

  /**
   * Conecta a un peer específico con reintentos
   */
  async connectToPeer(peerIP, peerName = 'Unknown', retries = 3) {
    // Evitar conexiones duplicadas
    if (this.connections.has(peerIP)) {
      console.log(`Already connected to ${peerIP}`);
      return;
    }

    // Intentar conexión con reintentos inmediatos
    for (let i = 0; i < retries; i++) {
      try {
        await this._connect(peerIP, peerName);
        return; // Éxito
      } catch (err) {
        console.warn(`Connection attempt ${i + 1}/${retries} failed for ${peerIP}: ${err.message}`);
        if (i === retries - 1) {
          // Si fallaron todos los intentos inmediatos, programar reconexión lenta
          console.error(`All immediate connection attempts failed for ${peerIP}`);
          this.scheduleReconnect(peerIP, peerName);
        } else {
          // Esperar antes del siguiente intento inmediato
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
  }

  /**
   * Promesa interna para establecer conexión
   */
  _connect(peerIP, peerName) {
    return new Promise((resolve, reject) => {
      const port = this.config.sync.port;
      const url = `ws://${peerIP}:${port}`;

      console.log(`Connecting to ${peerName} (${peerIP})...`);

      try {
        const timestamp = Date.now();
        const token = this.configManager.generateToken(timestamp);

        const ws = new WebSocket(url, {
          headers: {
            'X-Auth-Token': token,
            'X-Timestamp': timestamp.toString()
          },
          maxPayload: 100 * 1024 * 1024
        });

        // Timeout de conexión
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.terminate();
            reject(new Error('Connection timeout'));
          }
        }, 5000);

        // Handlers temporales para la promesa
        const onOpen = () => {
          clearTimeout(connectionTimeout);
          cleanup();
          this.handleConnectionOpen(ws, peerIP, peerName);
          
          // Re-asignar handlers permanentes
          ws.on('message', (data) => this.handleMessage(data, peerIP));
          ws.on('close', (code, reason) => this.handleConnectionClose(peerIP, peerName, code, reason));
          ws.on('error', (error) => this.handleConnectionError(peerIP, peerName, error));
          
          // Guardar conexión
          this.connections.set(peerIP, ws);
          resolve(ws);
        };

        const onError = (error) => {
          clearTimeout(connectionTimeout);
          cleanup();
          reject(error);
        };

        const onClose = (code, reason) => {
          clearTimeout(connectionTimeout);
          cleanup();
          reject(new Error(`Closed immediately: ${code} ${reason}`));
        };

        const cleanup = () => {
          ws.removeListener('open', onOpen);
          ws.removeListener('error', onError);
          ws.removeListener('close', onClose);
        };

        ws.on('open', onOpen);
        ws.on('error', onError);
        ws.on('close', onClose);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Maneja apertura de conexión
   */
  handleConnectionOpen(ws, peerIP, peerName) {
    console.log(`Connected to ${peerName} (${peerIP})`);
    this.reconnectAttempts.set(peerIP, 0); // Reset intentos
    this.emit('peer-connected', { ip: peerIP, name: peerName });

    // Iniciar ping periódico
    this.startPing(ws, peerIP);
  }

  /**
   * Maneja cierre de conexión
   */
  handleConnectionClose(peerIP, peerName, code, reason) {
    console.log(`Disconnected from ${peerName} (${peerIP}): ${code} - ${reason}`);
    this.connections.delete(peerIP);
    this.emit('peer-disconnected', { ip: peerIP, name: peerName });

    // Programar reconexión si no fue cierre limpio del servidor
    if (code !== 1000 && code !== 1001) {
      this.scheduleReconnect(peerIP, peerName);
    }
  }

  /**
   * Maneja error de conexión
   */
  handleConnectionError(peerIP, peerName, error) {
    console.error(`Connection error with ${peerName} (${peerIP}):`, error.message);
    this.connections.delete(peerIP);
    this.emit('peer-error', { ip: peerIP, name: peerName, error });
    this.scheduleReconnect(peerIP, peerName);
  }

  /**
   * Maneja mensajes recibidos
   */
  handleMessage(data, peerIP) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'clipboard-update':
          console.log(`Received clipboard update from ${peerIP}`);
          this.emit('clipboard-received', message.item);
          break;
        
        case 'pong':
          // Respuesta a ping
          break;
        
        case 'connection-ack':
          console.log(`Connection acknowledged by ${peerIP}`);
          break;
        
        case 'history-response':
          this.emit('history-received', { peer: peerIP, history: message.history });
          break;
        
        default:
          console.warn(`Unknown message type from ${peerIP}: ${message.type}`);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  /**
   * Programa reconexión con backoff exponencial
   */
  scheduleReconnect(peerIP, peerName) {
    // Cancelar timer anterior si existe
    if (this.reconnectTimers.has(peerIP)) {
      clearTimeout(this.reconnectTimers.get(peerIP));
    }

    const attempts = this.reconnectAttempts.get(peerIP) || 0;
    const maxAttempts = 10;

    if (attempts >= maxAttempts) {
      console.error(`Max reconnection attempts reached for ${peerIP}`);
      this.reconnectAttempts.delete(peerIP);
      return;
    }

    // Backoff exponencial: 1s, 2s, 4s, 8s, 16s, 32s...
    const delay = Math.min(1000 * Math.pow(2, attempts), 60000); // max 60s
    
    console.log(`Scheduling reconnection to ${peerIP} in ${delay}ms (attempt ${attempts + 1}/${maxAttempts})`);

    const timer = setTimeout(() => {
      this.reconnectAttempts.set(peerIP, attempts + 1);
      this.connectToPeer(peerIP, peerName);
    }, delay);

    this.reconnectTimers.set(peerIP, timer);
  }

  /**
   * Envía ítem de portapapeles a todos los peers
   */
  sendClipboardItem(item) {
    if (this.connections.size === 0) {
      console.log('No peers connected, clipboard not synced');
      return;
    }

    const message = JSON.stringify({
      type: 'clipboard-update',
      item: item,
      timestamp: Date.now()
    });

    console.log(`Sending ${item.type} to peers (${item.sizeBytes} bytes, ${message.length} chars)`);

    let sentCount = 0;
    this.connections.forEach((ws, peerIP) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
          sentCount++;
          console.log(`Sent to ${peerIP}: ${item.type}`);
        } catch (error) {
          console.error(`Failed to send to ${peerIP}:`, error.message);
        }
      } else {
        console.warn(`Peer ${peerIP} not ready, state: ${ws.readyState}`);
      }
    });

    console.log(`Clipboard item sent to ${sentCount}/${this.connections.size} peer(s)`);
  }

  /**
   * Solicita historial a un peer
   */
  requestHistory(peerIP) {
    const ws = this.connections.get(peerIP);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error(`Cannot request history, not connected to ${peerIP}`);
      return;
    }

    ws.send(JSON.stringify({
      type: 'history-request',
      timestamp: Date.now()
    }));

    console.log(`History requested from ${peerIP}`);
  }

  /**
   * Inicia ping periódico para mantener conexión viva
   */
  startPing(ws, peerIP) {
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping cada 30 segundos

    // Guardar referencia para limpieza
    ws._pingInterval = pingInterval;
  }

  /**
   * Desconecta de todos los peers
   */
  disconnectAll() {
    console.log('Disconnecting from all peers...');

    // Cancelar todos los timers de reconexión
    this.reconnectTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.reconnectTimers.clear();
    this.reconnectAttempts.clear();

    // Cerrar todas las conexiones
    this.connections.forEach((ws, peerIP) => {
      if (ws._pingInterval) {
        clearInterval(ws._pingInterval);
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Client shutting down');
      }
    });

    this.connections.clear();
    console.log('All peers disconnected');
  }

  /**
   * Desconecta de un peer específico
   */
  disconnectFromPeer(peerIP) {
    const ws = this.connections.get(peerIP);
    if (!ws) return;

    if (ws._pingInterval) {
      clearInterval(ws._pingInterval);
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'Disconnected by user');
    }

    this.connections.delete(peerIP);
    
    // Cancelar reconexión si existe
    if (this.reconnectTimers.has(peerIP)) {
      clearTimeout(this.reconnectTimers.get(peerIP));
      this.reconnectTimers.delete(peerIP);
    }

    console.log(`Disconnected from ${peerIP}`);
  }

  /**
   * Obtiene estadísticas de conexiones
   */
  getStats() {
    const connectedPeers = [];
    this.connections.forEach((ws, peerIP) => {
      const peer = this.config.sync.peers.find(p => p.ip === peerIP);
      connectedPeers.push({
        ip: peerIP,
        name: peer ? peer.name : 'Unknown',
        state: ws.readyState,
        connected: ws.readyState === WebSocket.OPEN
      });
    });

    return {
      totalConfigured: this.config.sync.peers.length,
      connected: connectedPeers.filter(p => p.connected).length,
      peers: connectedPeers
    };
  }
}

module.exports = SyncClient;

const { clipboard, nativeImage } = require('electron');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

/**
 * Circular Buffer para mantener historial limitado
 */
class CircularBuffer {
  constructor(maxSize = 10) {
    this.buffer = [];
    this.maxSize = maxSize;
  }

  /**
   * Agrega un ítem al buffer
   */
  add(item) {
    // Evitar duplicados (mismo contenido)
    const existingIndex = this.buffer.findIndex(i => i.contentHash === item.contentHash);
    if (existingIndex !== -1) {
      // Actualizar timestamp pero mantener posición
      this.buffer[existingIndex].timestamp = item.timestamp;
      return;
    }

    // Agregar al inicio
    this.buffer.unshift(item);

    // Limitar tamaño
    if (this.buffer.length > this.maxSize) {
      this.buffer.pop();
    }
  }

  /**
   * Obtiene todos los ítems (más recientes primero)
   */
  getAll() {
    return [...this.buffer];
  }

  /**
   * Obtiene un ítem por ID
   */
  getById(id) {
    return this.buffer.find(item => item.id === id);
  }

  /**
   * Limpia el buffer
   */
  clear() {
    this.buffer = [];
  }

  /**
   * Obtiene el tamaño actual
   */
  size() {
    return this.buffer.length;
  }

  /**
   * Actualiza el tamaño máximo
   */
  setMaxSize(maxSize) {
    this.maxSize = maxSize;
    if (this.buffer.length > maxSize) {
      this.buffer = this.buffer.slice(0, maxSize);
    }
  }
}

/**
 * Gestor del portapapeles con historial
 */
class ClipboardManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.history = new CircularBuffer(config.clipboard.historySize);
    this.lastContentHash = null;
    this.polling = false;
    this.pollInterval = null;
  }

  /**
   * Inicia el monitoreo del portapapeles
   */
  startMonitoring() {
    if (this.polling) return;

    this.polling = true;
    this.pollInterval = setInterval(() => {
      this.checkClipboard();
    }, this.config.clipboard.pollInterval);

    console.log('Clipboard monitoring started');
  }

  /**
   * Detiene el monitoreo del portapapeles
   */
  stopMonitoring() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.polling = false;
    console.log('Clipboard monitoring stopped');
  }

  /**
   * Verifica cambios en el portapapeles
   */
  checkClipboard() {
    try {
      // Verificar formatos disponibles
      const formats = clipboard.availableFormats();
      
      // Priorizar imágenes si están habilitadas
      if (this.config.clipboard.enableImages && formats.some(f => f.includes('image'))) {
        this.handleImageClipboard();
      } else if (formats.includes('text/plain')) {
        this.handleTextClipboard();
      }
    } catch (error) {
      console.error('Error checking clipboard:', error);
    }
  }

  /**
   * Maneja portapapeles de texto
   */
  handleTextClipboard() {
    const text = clipboard.readText();
    
    if (!text || text.trim() === '') return;

    const contentHash = this.calculateHash(text);
    
    if (contentHash === this.lastContentHash) return;

    this.lastContentHash = contentHash;

    const item = {
      id: uuidv4(),
      type: 'text',
      mimeType: 'text/plain',
      data: text,
      contentHash: contentHash,
      sizeBytes: Buffer.byteLength(text, 'utf8'),
      timestamp: Date.now(),
      fromRemote: false
    };

    this.addToHistory(item);
  }

  /**
   * Maneja portapapeles de imagen
   */
  handleImageClipboard() {
    const image = clipboard.readImage();
    
    if (image.isEmpty()) return;

    // Convertir a PNG
    const pngBuffer = image.toPNG();
    const contentHash = this.calculateHash(pngBuffer);

    if (contentHash === this.lastContentHash) return;

    this.lastContentHash = contentHash;

    // Verificar tamaño
    if (pngBuffer.length > this.config.clipboard.maxImageSize) {
      console.warn(`Image too large: ${pngBuffer.length} bytes, max: ${this.config.clipboard.maxImageSize}`);
      this.emit('image-too-large', pngBuffer.length);
      return;
    }

    // Convertir a base64
    const base64 = pngBuffer.toString('base64');
    const dataURL = `data:image/png;base64,${base64}`;

    const dimensions = image.getSize();

    const item = {
      id: uuidv4(),
      type: 'image',
      mimeType: 'image/png',
      data: dataURL,
      contentHash: contentHash,
      sizeBytes: pngBuffer.length,
      width: dimensions.width,
      height: dimensions.height,
      timestamp: Date.now(),
      fromRemote: false
    };

    this.addToHistory(item);
  }

  /**
   * Calcula hash del contenido
   */
  calculateHash(content) {
    const hash = crypto.createHash('sha256');
    hash.update(typeof content === 'string' ? content : content);
    return hash.digest('hex');
  }

  /**
   * Agrega un ítem al historial
   */
  addToHistory(item) {
    this.history.add(item);
    console.log(`Added ${item.type} to history (${item.sizeBytes} bytes)`);
    
    // Emitir evento para sincronización
    if (!item.fromRemote) {
      this.emit('clipboard-changed', item);
    }
    
    // Emitir evento para UI
    this.emit('history-updated', this.history.getAll());
  }

  /**
   * Agrega un ítem remoto al historial
   */
  addRemoteItem(item) {
    // Validar tamaño
    if (item.sizeBytes > this.config.clipboard.maxImageSize) {
      console.warn('Remote item too large, discarding');
      return false;
    }

    // Marcar como remoto
    item.fromRemote = true;

    // Agregar al historial
    this.addToHistory(item);
    
    return true;
  }

  /**
   * Escribe un ítem al portapapeles
   */
  writeToClipboard(itemId) {
    const item = this.history.getById(itemId);
    
    if (!item) {
      console.error('Item not found:', itemId);
      return false;
    }

    try {
      if (item.type === 'text') {
        clipboard.writeText(item.data);
        console.log('Text written to clipboard');
      } else if (item.type === 'image') {
        // Convertir data URL a NativeImage
        const image = nativeImage.createFromDataURL(item.data);
        clipboard.writeImage(image);
        console.log('Image written to clipboard');
      }

      // Actualizar el último hash para evitar re-captura inmediata
      this.lastContentHash = item.contentHash;

      return true;
    } catch (error) {
      console.error('Error writing to clipboard:', error);
      return false;
    }
  }

  /**
   * Obtiene el historial completo
   */
  getHistory() {
    return this.history.getAll();
  }

  /**
   * Limpia el historial
   */
  clearHistory() {
    this.history.clear();
    this.lastContentHash = null;
    this.emit('history-updated', []);
    console.log('History cleared');
  }

  /**
   * Actualiza el tamaño del historial
   */
  updateHistorySize(newSize) {
    this.history.setMaxSize(newSize);
    this.emit('history-updated', this.history.getAll());
  }

  /**
   * Obtiene estadísticas del historial
   */
  getStats() {
    const items = this.history.getAll();
    const textItems = items.filter(i => i.type === 'text').length;
    const imageItems = items.filter(i => i.type === 'image').length;
    const remoteItems = items.filter(i => i.fromRemote).length;
    const totalSize = items.reduce((sum, i) => sum + i.sizeBytes, 0);

    return {
      total: items.length,
      text: textItems,
      images: imageItems,
      remote: remoteItems,
      totalSizeBytes: totalSize
    };
  }
}

module.exports = ClipboardManager;

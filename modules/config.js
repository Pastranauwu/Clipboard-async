const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { app } = require('electron');

class ConfigManager {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.config = null;
  }

  /**
   * Devuelve la configuración por defecto
   */
  getDefaultConfig() {
    return {
      version: '1.0.0',
      clipboard: {
        historySize: 10,
        pollInterval: 500,
        maxImageSize: 10485760, // 10 MB
        enableImages: true
      },
      sync: {
        enabled: true,
        port: 8900,
        sharedSecret: this.generateSharedSecret(),
        peers: [],
        autoConnect: true
      },
      ui: {
        globalShortcut: 'CommandOrControl+Alt+V',
        theme: 'dark',
        showNotifications: true
      },
      security: {
        tokenExpiry: 60000, // 60 segundos
        requireAuth: true
      }
    };
  }

  /**
   * Genera un secreto compartido aleatorio
   */
  generateSharedSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Carga la configuración desde el archivo
   */
  loadConfig() {
    try {
      // Verificar si existe el archivo
      if (!fs.existsSync(this.configPath)) {
        console.log('Config file not found, creating default config');
        this.config = this.getDefaultConfig();
        this.saveConfig();
        return this.config;
      }

      // Leer y parsear el archivo
      const data = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(data);

      // Validar la configuración
      if (!this.validateConfig(this.config)) {
        console.warn('Invalid config detected, using defaults');
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }

      // Migrar si es necesario
      this.config = this.migrateConfig(this.config);

      return this.config;
    } catch (error) {
      console.error('Error loading config:', error);
      this.config = this.getDefaultConfig();
      this.saveConfig();
      return this.config;
    }
  }

  /**
   * Guarda la configuración en el archivo
   */
  saveConfig() {
    try {
      // Crear el directorio si no existe
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Guardar el archivo
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log('Config saved to', this.configPath);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * Valida la estructura de configuración
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') return false;
    
    // Validar secciones principales
    if (!config.clipboard || typeof config.clipboard !== 'object') return false;
    if (!config.sync || typeof config.sync !== 'object') return false;
    if (!config.ui || typeof config.ui !== 'object') return false;

    // Validar tipos de datos
    if (typeof config.clipboard.historySize !== 'number') return false;
    if (typeof config.clipboard.pollInterval !== 'number') return false;
    if (typeof config.sync.port !== 'number') return false;
    if (!Array.isArray(config.sync.peers)) return false;

    return true;
  }

  /**
   * Migra configuraciones antiguas a nuevas versiones
   */
  migrateConfig(config) {
    // Si no tiene sharedSecret, generarlo
    if (!config.sync.sharedSecret) {
      config.sync.sharedSecret = this.generateSharedSecret();
      console.log('Generated new shared secret');
    }

    // Asegurar que tiene todas las propiedades por defecto
    const defaultConfig = this.getDefaultConfig();
    config = this.mergeDeep(defaultConfig, config);

    return config;
  }

  /**
   * Merge profundo de objetos
   */
  mergeDeep(target, source) {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  /**
   * Verifica si un valor es un objeto
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Actualiza una propiedad de la configuración
   */
  updateConfig(path, value) {
    const keys = path.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    this.saveConfig();
  }

  /**
   * Obtiene una propiedad de la configuración
   */
  getConfig(path) {
    if (!path) return this.config;

    const keys = path.split('.');
    let current = this.config;

    for (const key of keys) {
      if (!(key in current)) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Genera un token HMAC para autenticación
   */
  generateToken(timestamp) {
    const secret = this.config.sync.sharedSecret;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(timestamp.toString());
    return hmac.digest('hex');
  }

  /**
   * Verifica un token HMAC
   */
  verifyToken(token, timestamp) {
    try {
      const secret = this.config.sync.sharedSecret;
      const expectedToken = this.generateToken(timestamp);
      
      // Verificar que los tokens tengan la misma longitud
      if (token.length !== expectedToken.length) {
        return false;
      }

      // Comparación segura contra timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(token, 'hex'),
        Buffer.from(expectedToken, 'hex')
      );
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  }

  /**
   * Verifica si un timestamp está dentro de la ventana válida
   */
  isTimestampValid(timestamp) {
    const now = Date.now();
    const expiry = this.config.security.tokenExpiry;
    return Math.abs(now - timestamp) <= expiry;
  }
}

module.exports = ConfigManager;

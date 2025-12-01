# Guía de Uso - Clipboard Manager

## 📦 Instalación

### Prerrequisitos

1. **Node.js 18+** instalado
2. **Tailscale** instalado y configurado en todos los dispositivos
3. Sistemas operativos soportados: Windows 10/11, Linux (Ubuntu, Fedora, etc.)

### Pasos de instalación

```bash
# 1. Navegar al directorio del proyecto
cd clipboard-manager

# 2. Instalar dependencias
npm install

# 3. Iniciar la aplicación
npm start
```

## ⚙️ Configuración

### Primera ejecución

Al ejecutar la aplicación por primera vez, se generará automáticamente un archivo de configuración en:

- **Linux**: `~/.config/clipboard-manager/config.json`
- **Windows**: `%APPDATA%/clipboard-manager/config.json`

### Configurar peers (dispositivos a sincronizar)

1. Obtén las IPs Tailscale de cada dispositivo:
   ```bash
   tailscale ip -4
   ```
   Ejemplo de salida: `100.64.1.2`

2. Edita el archivo `config.json` y agrega los peers:
   ```json
   {
     "sync": {
       "peers": [
         { "ip": "100.64.1.2", "name": "Mi Escritorio" },
         { "ip": "100.64.1.3", "name": "Mi Laptop" }
       ]
     }
   }
   ```

3. Reinicia la aplicación para aplicar los cambios

### Compartir el sharedSecret entre dispositivos

El `sharedSecret` se genera automáticamente en la primera ejecución. **Debe ser el mismo en todos los dispositivos** para que puedan autenticarse entre sí.

**Método 1: Copiar manualmente**
1. En el primer dispositivo, abre `config.json` y copia el valor de `sync.sharedSecret`
2. En los demás dispositivos, pega ese mismo valor en sus respectivos archivos `config.json`

**Método 2: Usar el mismo archivo de config**
1. Configura el primer dispositivo completamente
2. Copia el archivo `config.json` a los demás dispositivos (ajustando solo el array de `peers` si es necesario)

### Opciones de configuración avanzadas

```json
{
  "clipboard": {
    "historySize": 10,           // Número de ítems en historial (5-100)
    "pollInterval": 500,         // Intervalo de polling en ms (300-1000)
    "maxImageSize": 10485760,    // Tamaño máximo de imagen en bytes (10 MB)
    "enableImages": true         // Habilitar sincronización de imágenes
  },
  "sync": {
    "enabled": true,             // Habilitar sincronización
    "port": 8900,                // Puerto WebSocket (8900 recomendado)
    "autoConnect": true          // Conectar automáticamente al iniciar
  },
  "ui": {
    "globalShortcut": "CommandOrControl+Alt+V",  // Atajo global
    "showNotifications": true    // Mostrar notificaciones
  },
  "security": {
    "tokenExpiry": 60000,        // Validez del token en ms (60s)
    "requireAuth": true          // Requerir autenticación
  }
}
```

## 🎯 Uso

### Icono en Bandeja del Sistema

La aplicación se ejecuta en segundo plano con un icono en la bandeja del sistema (system tray):

- **Click izquierdo**: Abre/cierra la ventana flotante
- **Click derecho**: Menú contextual con opciones:
  - Mostrar ventana
  - Ver historial
  - Estadísticas
  - Salir

### Atajo global

Por defecto: **Ctrl+Alt+V** (Windows/Linux) o **Cmd+Alt+V** (macOS)

- Presiona el atajo para abrir/cerrar la ventana flotante
- También puedes usar **ESC** para cerrar la ventana

### Ventana de historial

La ventana muestra:
- **Lista de ítems**: Texto e imágenes copiadas recientemente
- **Estadísticas**: Número de ítems, peers conectados, tamaño total
- **Botones de acción**:
  - 🔄 **Actualizar**: Recargar el historial
  - 🗑️ **Limpiar**: Borrar todo el historial

### Seleccionar un ítem

1. Abre la ventana con el atajo global
2. Haz clic en cualquier ítem de la lista
3. El ítem se copiará al portapapeles automáticamente
4. La ventana se cerrará
5. Pega normalmente con **Ctrl+V** donde lo necesites

### Eliminar un ítem individual

1. Abre la ventana con el atajo global
2. Pasa el mouse sobre el ítem que deseas eliminar
3. Aparecerá un botón de eliminar (🗑️) en la esquina superior derecha
4. Haz clic en el botón para eliminar solo ese elemento

### Identificar ítems remotos

Los ítems que provienen de otros dispositivos se muestran con:
- Borde azul a la izquierda
- Badge "REMOTO" en la metadata

## 🔍 Verificación de funcionamiento

### Verificar conexión a peers

1. Abre la ventana del clipboard manager
2. Observa la estadística "Peers" en la barra superior
3. Debe mostrar algo como `2/2` (2 conectados de 2 configurados)

### Probar sincronización

1. En el **Dispositivo A**: Copia un texto
2. En el **Dispositivo B**: Abre la ventana del clipboard manager
3. Debes ver el texto copiado en el Dispositivo A con el badge "REMOTO"

### Logs de depuración

Para ver logs detallados, ejecuta:
```bash
npm run dev
```

Los logs mostrarán:
- Conexiones de peers
- Ítems sincronizados
- Errores de red o autenticación

## 🛠️ Solución de problemas

### Los peers no se conectan

**Posibles causas:**

1. **Tailscale no está corriendo**
   ```bash
   # Verificar estado
   tailscale status
   ```

2. **IPs incorrectas en config.json**
   - Verifica que las IPs sean del rango `100.x.x.x`
   - Actualiza las IPs si cambiaron

3. **Puerto bloqueado por firewall**
   ```bash
   # Linux: Abrir puerto 8900
   sudo ufw allow 8900/tcp
   
   # Windows: Agregar regla en Windows Defender Firewall
   ```

4. **sharedSecret diferente**
   - Verifica que todos los dispositivos tengan el mismo `sharedSecret`

### El atajo global no funciona

1. **Otro programa está usando el mismo atajo**
   - Cambia el atajo en `config.json`:
     ```json
     "globalShortcut": "CommandOrControl+Shift+V"
     ```

2. **Permisos de accesibilidad (macOS)**
   - Ve a System Preferences → Security & Privacy → Accessibility
   - Agrega Electron/clipboard-manager a la lista

### Imágenes no se sincronizan

1. **Imágenes muy grandes**
   - Las imágenes mayores a `maxImageSize` se descartan
   - Aumenta el límite en `config.json` si es necesario:
     ```json
     "maxImageSize": 20971520  // 20 MB
     ```

2. **Imágenes deshabilitadas**
   - Verifica en `config.json`:
     ```json
     "enableImages": true
     ```

### Alto uso de CPU/RAM

1. **Reducir frecuencia de polling**
   ```json
   "pollInterval": 1000  // 1 segundo en vez de 500ms
   ```

2. **Reducir tamaño del historial**
   ```json
   "historySize": 5  // En vez de 10
   ```

3. **Deshabilitar imágenes**
   ```json
   "enableImages": false
   ```

## 🔒 Seguridad

### Comunicación cifrada

- Todo el tráfico viaja por **Tailscale**, que usa WireGuard
- Autenticación adicional con **HMAC-SHA256**
- Tokens con ventana de validez de 60 segundos

### Mejores prácticas

1. **No compartas el sharedSecret públicamente**
2. **Usa Tailscale ACLs** para restringir acceso entre dispositivos
3. **Limita maxImageSize** para evitar saturación de red
4. **Revisa los peers configurados** periódicamente

## 📊 Arquitectura de red

```
Dispositivo A (100.64.1.2:8900)
    ↕ WebSocket cifrado (Tailscale)
Dispositivo B (100.64.1.3:8900)
    ↕ WebSocket cifrado (Tailscale)
Dispositivo C (100.64.1.4:8900)
```

Cada dispositivo:
- **Servidor WebSocket**: Escucha en puerto 8900
- **Cliente WebSocket**: Conecta a todos los peers configurados
- **Sin servidor central**: Comunicación P2P directa

## 🚀 Inicio automático (Opcional)

### Linux (systemd)

**Instalación rápida:**

```bash
# Instalar como servicio de usuario
./install-service.sh

# Habilitar inicio automático (incluso sin login)
loginctl enable-linger $USER
```

**Comandos útiles:**

```bash
# Ver estado
systemctl --user status clipboard-manager@$USER.service

# Ver logs en tiempo real
journalctl --user -u clipboard-manager@$USER.service -f

# Reiniciar
systemctl --user restart clipboard-manager@$USER.service

# Detener
systemctl --user stop clipboard-manager@$USER.service

# Desinstalar
./uninstall-service.sh
```

### Windows

Consulta el archivo [windows-setup.md](./windows-setup.md) para instrucciones detalladas.

**Opciones disponibles:**
1. **Task Scheduler** (Recomendado) - Ejecutar al inicio de sesión
2. **Carpeta de inicio** - Método simple con script
3. **NSSM** - Servicio completo de Windows

## 📝 Comandos útiles

```bash
# Iniciar aplicación
npm start

# Iniciar con logs detallados
npm run dev

# Ver estado de Tailscale
tailscale status

# Ver IP de Tailscale
tailscale ip -4

# Probar conexión a un peer
ping 100.64.1.2

# Ver puerto en uso
# Linux
sudo netstat -tulpn | grep 8900
# Windows
netstat -ano | findstr 8900
```

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs en la consola (`npm run dev`)
2. Verifica el archivo de configuración
3. Comprueba la conectividad Tailscale entre dispositivos
4. Revisa que el puerto 8900 esté abierto en todos los dispositivos

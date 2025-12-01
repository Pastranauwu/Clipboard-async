# Clipboard Manager

Gestor de portapapeles multiplataforma (Windows + Linux) con sincronización P2P via Tailscale.

## Características

- ✂️ Sincronización automática del portapapeles entre dispositivos Tailscale
- 📋 Historial de portapapeles configurable (texto e imágenes)
- ⌨️ Atajo global para abrir ventana flotante (Ctrl+Alt+V / Cmd+Alt+V)
- 🔒 Comunicación segura con autenticación HMAC
- 🖼️ Soporte para texto e imágenes
- 🌐 Comunicación P2P sin servidor central

## Instalación

```bash
npm install
```

## Uso

```bash
npm start
```

## Configuración

La configuración se encuentra en `~/.config/clipboard-manager/config.json` (Linux) o `%APPDATA%/clipboard-manager/config.json` (Windows).

### Configuración de peers

Edita el archivo de configuración para agregar las IPs Tailscale de otros dispositivos:

```json
{
  "sync": {
    "peers": [
      { "ip": "100.64.1.2", "name": "Desktop" },
      { "ip": "100.64.1.3", "name": "Laptop" }
    ]
  }
}
```

### Atajo global

Por defecto: `CommandOrControl+Alt+V`

Puede cambiarse en la configuración con formato Electron Accelerator.

## Arquitectura

- **Electron**: Framework para la aplicación
- **WebSocket**: Comunicación P2P en tiempo real
- **HMAC-SHA256**: Autenticación entre peers
- **Tailscale**: Red VPN para comunicación cifrada

## Requisitos

- Node.js 18+
- Electron 28+
- Tailscale instalado y configurado

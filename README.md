# Clipboard Manager

Gestor de portapapeles multiplataforma (Windows + Linux) con sincronización P2P via Tailscale.

## Características

- ✂️ Sincronización automática del portapapeles entre dispositivos Tailscale
- 📋 Historial de portapapeles configurable (texto e imágenes)
- ⌨️ Atajo global para abrir ventana flotante (Ctrl+Alt+V / Cmd+Alt+V)
- 🔒 Comunicación segura con autenticación HMAC
- 🖼️ Soporte para texto e imágenes
- 🌐 Comunicación P2P sin servidor central
- 🎯 Icono en bandeja del sistema (system tray)
- 🗑️ Eliminación individual de elementos del historial
- 🚀 Ejecución en segundo plano como servicio

## Instalación

```bash
npm install
```

## Uso

```bash
npm start
```

La aplicación se ejecutará en segundo plano con un icono en la bandeja del sistema. Usa el atajo global `Ctrl+Alt+V` para abrir la ventana flotante.

### Configuración como servicio

#### Linux (systemd)

Para configurar la aplicación como servicio de usuario en Linux:

```bash
# Instalar como servicio
./install-service.sh

# El servicio se iniciará automáticamente con tu sesión
# Para habilitarlo al inicio del sistema (incluso sin login):
loginctl enable-linger $USER
```

Comandos útiles:
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

#### Windows

Para Windows, consulta el archivo [windows-setup.md](./windows-setup.md) que incluye tres opciones:
1. **Task Scheduler** (Recomendado) - Ejecutar al inicio de sesión
2. **Carpeta de inicio** - Método simple con script
3. **NSSM** - Servicio completo de Windows

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

# Clipboard Manager

Gestor de portapapeles multiplataforma (Windows + Linux) con sincronización P2P via Tailscale.

## Características

- ✂️ Sincronización automática del portapapeles entre dispositivos Tailscale
- 📋 Historial de portapapeles configurable (texto e imágenes)
- ⌨️ Atajo global para abrir ventana flotante (Ctrl+Alt+V / Cmd+Alt+V)
- 🔒 Comunicación segura con autenticación HMAC
- 🖼️ Soporte para texto e imágenes (hasta 10 MB por defecto)
- 🌐 Comunicación P2P sin servidor central
- 🗑️ Eliminación individual de elementos del historial
- 🎯 Ejecución en segundo plano con icono en bandeja del sistema
- 🚀 Inicio automático con el sistema (Linux/Windows)

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Pastranauwu/Clipboard-async.git
cd Clipboard-async
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configuración inicial

La aplicación genera automáticamente la configuración en la primera ejecución en:
- **Linux**: `~/.config/clipboard-manager/config.json`
- **Windows**: `%APPDATA%/clipboard-manager/config.json`

### 4. Iniciar la aplicación

```bash
npm start
```

La aplicación se ejecutará en segundo plano con un icono en la bandeja del sistema.

## Configuración de sincronización

Para sincronizar entre dispositivos, necesitas configurar los peers de Tailscale:

### 1. Obtener IP de Tailscale

En cada dispositivo ejecuta:
```bash
tailscale ip -4
```

Ejemplo: `100.88.127.73`

### 2. Configurar peers

Edita el archivo de configuración (`~/.config/clipboard-manager/config.json` en Linux o `%APPDATA%/clipboard-manager/config.json` en Windows):

```json
{
  "sync": {
    "enabled": true,
    "sharedSecret": "tu-secret-aqui",
    "peers": [
      { "ip": "100.88.127.XX", "name": "Dispositivo 1" },
      { "ip": "100.112.133.XX", "name": "Dispositivo 2" }
    ]
  }
}
```

**IMPORTANTE:** Todos los dispositivos deben tener el **mismo `sharedSecret`**. Copia el valor generado automáticamente en el primer dispositivo y úsalo en todos los demás.

### 3. Reiniciar la aplicación

Después de configurar los peers, reinicia la aplicación para aplicar los cambios.

### Configuración para inicio automático

#### Linux (Autostart)

Para que la aplicación inicie automáticamente con tu sesión:

```bash
# Instalar en autostart
./scripts/install-autostart.sh
```

La aplicación se iniciará automáticamente en el próximo login.

**Desinstalar:**
```bash
rm ~/.config/autostart/clipboard-manager.desktop
```

**Nota:** También disponible `scripts/install-service.sh` para systemd, pero autostart es más compatible con aplicaciones Electron

#### Windows

Para Windows, consulta el archivo [scripts/windows-setup.md](./scripts/windows-setup.md) que incluye tres opciones:
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

## Notas

### Warnings de GPU/Vulkan
Es normal ver warnings como:
```
ERROR:gl_surface_presentation_helper.cc
Failed to detect any valid GPUs in the current config
```

Estos son warnings de Electron relacionados con la aceleración por hardware y **no afectan la funcionalidad** de la aplicación. La aplicación funciona correctamente sin GPU/Vulkan.

Para reducir estos warnings (opcional):
```bash
# Iniciar con software rendering
npm start -- --disable-gpu
```

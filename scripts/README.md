# Scripts de Instalación y Configuración

Esta carpeta contiene todos los scripts necesarios para instalar y configurar Clipboard Manager como servicio en diferentes sistemas operativos.

## Linux

### Autostart (Recomendado)

Inicia la aplicación automáticamente al iniciar sesión:

```bash
./install-autostart.sh
```

Desinstalar:
```bash
rm ~/.config/autostart/clipboard-manager.desktop
```

### Systemd Service (Alternativa)

Para ejecutar como servicio de systemd:

```bash
./install-service.sh
```

**Nota:** Systemd puede tener problemas con aplicaciones Electron que requieren interfaz gráfica. Se recomienda usar el método de autostart.

Desinstalar:
```bash
./uninstall-service.sh
```

## Windows

Consulta [windows-setup.md](./windows-setup.md) para instrucciones detalladas con tres métodos:
1. Task Scheduler (recomendado)
2. Carpeta de inicio
3. NSSM (servicio de Windows)

## Generación de Iconos

Los iconos de la aplicación se generan automáticamente desde tu `icon.png` original al ejecutar `npm install`.

**Iconos generados:**
- `tray-icon.png` (16x16) - Para la bandeja del sistema
- `window-icon.png` (256x256) - Para la ventana de la aplicación

Si necesitas regenerar los iconos manualmente:

```bash
# Desde la raíz del proyecto
npm run generate-icons

# O directamente
node scripts/generate-icons.js
```

Esto tomará tu `assets/icon.png` original (2048x2048, ~4.5MB) y creará versiones optimizadas.

## Archivos

- `install-autostart.sh` - Instalador de autostart para Linux
- `install-service.sh` - Instalador de servicio systemd
- `uninstall-service.sh` - Desinstalador de servicio systemd
- `clipboard-manager.desktop` - Archivo desktop entry para autostart
- `clipboard-manager@.service` - Unit file de systemd
- `windows-setup.md` - Guía de instalación para Windows
- `generate-tray-icon.js` - Generador de icono del tray

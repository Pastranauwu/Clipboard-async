# Guía de contribución

## Estructura del proyecto

```
clipboard-manager/
├── assets/              # Recursos (iconos)
│   ├── icon.png
│   ├── icon.svg
│   └── ICON_GUIDE.md
├── modules/             # Módulos principales
│   ├── clipboardManager.js
│   ├── config.js
│   ├── syncClient.js
│   └── syncServer.js
├── renderer/            # Interfaz de usuario
│   ├── index.html
│   ├── renderer.js
│   └── styles.css
├── main.js              # Proceso principal de Electron
├── preload.js           # Script de preload
├── package.json         # Dependencias y scripts
├── config.example.json  # Ejemplo de configuración
├── install-autostart.sh # Script de instalación Linux
├── install-service.sh   # Script servicio systemd (alternativo)
├── uninstall-service.sh # Desinstalación servicio
├── clipboard-manager@.service  # Archivo systemd
├── clipboard-manager.desktop   # Archivo desktop
├── windows-setup.md     # Guía para Windows
├── README.md            # Documentación principal
└── USAGE.md             # Guía de uso detallada
```

## Archivos que NO deben estar en Git

- `config.json` - Configuración personal del usuario
- `node_modules/` - Dependencias de npm
- `.vscode/`, `.idea/` - Configuraciones de IDE
- Archivos de logs

Estos están excluidos en `.gitignore`

## Para desarrollo

1. Clona el repositorio
2. `npm install`
3. `npm start` para desarrollo
4. `npm run dev` para logs detallados

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

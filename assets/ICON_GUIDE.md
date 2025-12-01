# Generación de icono ICO para Windows

## Usando ImageMagick (recomendado)

Si tienes ImageMagick instalado:

```bash
# En Linux/Mac
convert assets/icon.png -define icon:auto-resize=256,128,64,48,32,16 assets/icon.ico

# En Windows con ImageMagick
magick convert assets\icon.png -define icon:auto-resize=256,128,64,48,32,16 assets\icon.ico
```

## Usando herramientas online

1. Sube `assets/icon.png` a una de estas páginas:
   - https://convertio.co/es/png-ico/
   - https://cloudconvert.com/png-to-ico
   - https://icoconvert.com/

2. Descarga el archivo `.ico` generado

3. Guárdalo como `assets/icon.ico`

## Usando el icono en el ejecutable de Electron

Si quieres compilar la aplicación como ejecutable (.exe) con el icono:

```bash
npm install --save-dev electron-builder

# Agrega a package.json:
"build": {
  "appId": "com.clipboard.manager",
  "productName": "Clipboard Manager",
  "win": {
    "icon": "assets/icon.ico",
    "target": "nsis"
  },
  "linux": {
    "icon": "assets/icon.png",
    "target": "AppImage"
  }
}

# Luego construye:
npm run build
```

## Verificar el icono

El icono debe aparecer:
- ✅ En la bandeja del sistema (system tray)
- ✅ En la barra de tareas de Windows
- ✅ En el ejecutable si usas electron-builder

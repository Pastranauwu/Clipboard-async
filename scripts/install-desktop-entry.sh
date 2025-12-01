#!/bin/bash

# Script para instalar la entrada de escritorio (para el menú de aplicaciones)
# Uso: ./install-desktop-entry.sh

set -e

echo "=== Instalación de entrada de escritorio ==="

# Obtener el directorio del proyecto (parent del directorio scripts)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
APPLICATIONS_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="clipboard-manager.desktop"

# Crear directorio de aplicaciones si no existe
mkdir -p "$APPLICATIONS_DIR"

# Crear archivo .desktop
echo "Creando archivo .desktop en $APPLICATIONS_DIR..."
cat > "$APPLICATIONS_DIR/$DESKTOP_FILE" << EOF
[Desktop Entry]
Type=Application
Name=Clipboard Manager
Comment=Gestor de portapapeles con sincronización P2P
Exec=/usr/bin/npm start
Path=$SCRIPT_DIR
Icon=$SCRIPT_DIR/assets/icon.png
Terminal=false
StartupNotify=false
StartupWMClass=clipboard-manager
Categories=Utility;
EOF

# Dar permisos de ejecución
chmod +x "$APPLICATIONS_DIR/$DESKTOP_FILE"

echo ""
echo "=== Instalación completada ==="
echo "Clipboard Manager debería aparecer ahora en tu menú de aplicaciones."

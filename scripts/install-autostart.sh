#!/bin/bash

# Script de instalación para inicio automático con la sesión gráfica
# Uso: ./install-autostart.sh

set -e

echo "=== Instalación de Clipboard Manager en Autostart ==="

# Obtener el directorio del proyecto (parent del directorio scripts)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP_FILE="clipboard-manager.desktop"

# Crear directorio de autostart si no existe
mkdir -p "$AUTOSTART_DIR"

# Crear archivo .desktop personalizado
echo "Creando archivo de autostart..."
cat > "$AUTOSTART_DIR/$DESKTOP_FILE" << EOF
[Desktop Entry]
Type=Application
Name=Clipboard Manager
Comment=Gestor de portapapeles con sincronización P2P
Exec=/usr/bin/npm start
Path=$SCRIPT_DIR
Terminal=false
StartupNotify=false
X-GNOME-Autostart-enabled=true
Hidden=false
EOF

# Dar permisos de ejecución
chmod +x "$AUTOSTART_DIR/$DESKTOP_FILE"

echo ""
echo "=== Instalación completada ==="
echo "Clipboard Manager se iniciará automáticamente en el próximo login."
echo ""
echo "Para verificar:"
echo "  ls -la ~/.config/autostart/"
echo ""
echo "Para desinstalar:"
echo "  rm ~/.config/autostart/$DESKTOP_FILE"
echo ""
echo "Para iniciar ahora mismo (sin reiniciar):"
echo "  npm start"

#!/bin/bash

# Script de instalación del servicio de Clipboard Manager para Linux (systemd)
# Uso: ./install-service.sh

set -e

echo "=== Instalación de Clipboard Manager como servicio systemd ==="

# Obtener el directorio actual
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_NAME="clipboard-manager"
SERVICE_FILE="${SERVICE_NAME}@.service"
USER_SERVICE_DIR="$HOME/.config/systemd/user"

# Crear directorio de servicios de usuario si no existe
mkdir -p "$USER_SERVICE_DIR"

# Copiar archivo de servicio
echo "Copiando archivo de servicio a $USER_SERVICE_DIR..."
sed "s|WorkingDirectory=.*|WorkingDirectory=$SCRIPT_DIR|g" "$SCRIPT_DIR/$SERVICE_FILE" > "$USER_SERVICE_DIR/$SERVICE_FILE"

# Actualizar la ruta del ejecutable si npm está en otra ubicación
NPM_PATH=$(which npm)
if [ -n "$NPM_PATH" ]; then
    sed -i "s|ExecStart=.*|ExecStart=$NPM_PATH start|g" "$USER_SERVICE_DIR/$SERVICE_FILE"
fi

# Recargar systemd
echo "Recargando systemd..."
systemctl --user daemon-reload

# Habilitar el servicio
echo "Habilitando el servicio..."
systemctl --user enable "${SERVICE_NAME}@${USER}.service"

# Iniciar el servicio
echo "Iniciando el servicio..."
systemctl --user start "${SERVICE_NAME}@${USER}.service"

# Mostrar estado
echo ""
echo "=== Estado del servicio ==="
systemctl --user status "${SERVICE_NAME}@${USER}.service" --no-pager

echo ""
echo "=== Instalación completada ==="
echo "Comandos útiles:"
echo "  Ver estado:    systemctl --user status ${SERVICE_NAME}@${USER}.service"
echo "  Ver logs:      journalctl --user -u ${SERVICE_NAME}@${USER}.service -f"
echo "  Detener:       systemctl --user stop ${SERVICE_NAME}@${USER}.service"
echo "  Reiniciar:     systemctl --user restart ${SERVICE_NAME}@${USER}.service"
echo "  Deshabilitar:  systemctl --user disable ${SERVICE_NAME}@${USER}.service"
echo ""
echo "Para que el servicio se inicie automáticamente con el sistema:"
echo "  loginctl enable-linger ${USER}"

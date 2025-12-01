#!/bin/bash

# Script de desinstalación del servicio de Clipboard Manager
# Uso: ./uninstall-service.sh

set -e

echo "=== Desinstalación de Clipboard Manager como servicio systemd ==="

SERVICE_NAME="clipboard-manager"
USER_SERVICE_DIR="$HOME/.config/systemd/user"

# Detener el servicio si está corriendo
echo "Deteniendo el servicio..."
systemctl --user stop "${SERVICE_NAME}@${USER}.service" 2>/dev/null || true

# Deshabilitar el servicio
echo "Deshabilitando el servicio..."
systemctl --user disable "${SERVICE_NAME}@${USER}.service" 2>/dev/null || true

# Eliminar archivo de servicio
echo "Eliminando archivo de servicio..."
rm -f "$USER_SERVICE_DIR/${SERVICE_NAME}@.service"

# Recargar systemd
echo "Recargando systemd..."
systemctl --user daemon-reload

echo ""
echo "=== Desinstalación completada ==="
echo "El servicio ha sido eliminado del sistema."

# Configuración como servicio en Windows

Este documento explica cómo configurar Clipboard Manager para que se ejecute automáticamente en segundo plano en Windows.

## Opción 1: Ejecutar al inicio con Task Scheduler (Recomendado)

### Usando la interfaz gráfica:

1. Presiona `Win + R` y escribe `taskschd.msc`
2. En el panel derecho, haz clic en "Crear tarea básica..."
3. Configura los siguientes parámetros:

   **General:**
   - Nombre: `Clipboard Manager`
   - Descripción: `Gestor de portapapeles con sincronización P2P`
   - Marca: "Ejecutar tanto si el usuario inició sesión como si no"
   - Marca: "Ejecutar con los privilegios más altos" (opcional)

   **Desencadenadores:**
   - Haz clic en "Nuevo..."
   - Iniciar la tarea: "Al iniciar sesión"
   - Configuración: Cualquier usuario
   - OK

   **Acciones:**
   - Haz clic en "Nueva..."
   - Acción: "Iniciar un programa"
   - Programa o script: `C:\Program Files\nodejs\npm.cmd`
   - Agregar argumentos: `start`
   - Iniciar en: `C:\ruta\a\tu\clipboard-manager` (reemplaza con la ruta real)
   - OK

   **Condiciones:**
   - Desmarca: "Iniciar la tarea solo si el equipo está conectado a la corriente alterna"

   **Configuración:**
   - Marca: "Permitir que la tarea se ejecute a petición"
   - Marca: "Ejecutar la tarea lo antes posible después de perder una ejecución programada"
   - Si la tarea en ejecución no finaliza cuando se solicite, forzar detención: Marcado
   - OK

### Usando PowerShell (como administrador):

```powershell
# Definir variables
$taskName = "Clipboard Manager"
$workingDir = "C:\ruta\a\tu\clipboard-manager"  # Reemplaza con tu ruta
$npmPath = "C:\Program Files\nodejs\npm.cmd"   # Ajusta si npm está en otro lugar

# Crear acción
$action = New-ScheduledTaskAction -Execute $npmPath -Argument "start" -WorkingDirectory $workingDir

# Crear desencadenador (al iniciar sesión)
$trigger = New-ScheduledTaskTrigger -AtLogon

# Configurar opciones
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Crear la tarea
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Gestor de portapapeles con sincronización P2P"

# Iniciar la tarea
Start-ScheduledTask -TaskName $taskName
```

## Opción 2: Carpeta de inicio

1. Crea un archivo `.bat` o `.vbs` para lanzar la aplicación:

### clipboard-manager.bat:
```batch
@echo off
cd /d "C:\ruta\a\tu\clipboard-manager"
npm start
```

### clipboard-manager.vbs (se ejecuta sin ventana de consola):
```vbscript
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\ruta\a\tu\clipboard-manager"
WshShell.Run "npm start", 0, False
Set WshShell = Nothing
```

2. Presiona `Win + R` y escribe `shell:startup`
3. Copia el archivo `.bat` o `.vbs` en esa carpeta

## Opción 3: Servicio de Windows con NSSM

NSSM (Non-Sucking Service Manager) permite ejecutar cualquier aplicación como servicio de Windows.

1. Descarga NSSM desde: https://nssm.cc/download
2. Extrae el archivo y copia `nssm.exe` a una ubicación permanente
3. Abre PowerShell como administrador y ejecuta:

```powershell
# Instalar el servicio
nssm install ClipboardManager "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" start

# Configurar directorio de trabajo
nssm set ClipboardManager AppDirectory "C:\ruta\a\tu\clipboard-manager"

# Configurar opciones de reinicio
nssm set ClipboardManager AppStdout "C:\ruta\a\tu\clipboard-manager\logs\stdout.log"
nssm set ClipboardManager AppStderr "C:\ruta\a\tu\clipboard-manager\logs\stderr.log"

# Iniciar el servicio
nssm start ClipboardManager
```

### Comandos útiles de NSSM:

```powershell
# Ver estado
nssm status ClipboardManager

# Detener servicio
nssm stop ClipboardManager

# Reiniciar servicio
nssm restart ClipboardManager

# Editar configuración (abre GUI)
nssm edit ClipboardManager

# Desinstalar servicio
nssm remove ClipboardManager confirm
```

## Verificación

Para verificar que la aplicación está corriendo:

1. Busca el icono en la bandeja del sistema (system tray)
2. Prueba el atajo global: `Ctrl + Alt + V`
3. Verifica en el Administrador de tareas que el proceso `electron.exe` está corriendo

## Solución de problemas

### La aplicación no inicia:
- Verifica que Node.js y npm estén instalados correctamente
- Verifica las rutas en la configuración
- Revisa los logs en: `%APPDATA%\clipboard-manager\logs\`

### El atajo global no funciona:
- Asegúrate de que no haya otra aplicación usando el mismo atajo
- Verifica que la aplicación tenga permisos para registrar atajos globales

### La aplicación se cierra inesperadamente:
- Revisa los logs del sistema
- Asegúrate de que Tailscale esté instalado y corriendo
- Verifica la configuración en: `%APPDATA%\clipboard-manager\config.json`

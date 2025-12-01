// Variables globales
let currentHistory = [];

/**
 * Inicializa la aplicación
 */
async function initialize() {
  console.log('Initializing renderer...');
  
  // Cargar historial inicial
  await loadHistory();
  
  // Cargar estadísticas
  await updateStats();
  
  // Configurar event listeners
  setupEventListeners();
  
  // Escuchar actualizaciones de historial
  window.electronAPI.onHistoryUpdated((history) => {
    console.log('History updated:', history.length, 'items');
    currentHistory = history;
    renderHistory();
    updateStats();
  });
  
  console.log('Renderer initialized');
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
  // Botones de ventana
  document.getElementById('btn-close').addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });
  
  document.getElementById('btn-minimize').addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });
  
  // Botones de acción
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    await loadHistory();
    await updateStats();
  });
  
  document.getElementById('btn-clear').addEventListener('click', async () => {
    if (confirm('¿Estás seguro de que quieres limpiar todo el historial?')) {
      try {
        await window.electronAPI.clearHistory();
        // Esperar un momento para que el evento se propague
        await new Promise(resolve => setTimeout(resolve, 100));
        // Recargar el historial para asegurar que esté vacío
        await loadHistory();
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }
  });
  
  // Atajos de teclado
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      window.electronAPI.closeWindow();
    } else if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
      event.preventDefault();
      loadHistory();
      updateStats();
    }
  });
}

/**
 * Carga el historial desde el main process
 */
async function loadHistory() {
  try {
    currentHistory = await window.electronAPI.getHistory();
    console.log('Loaded history:', currentHistory.length, 'items');
    renderHistory();
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

/**
 * Renderiza el historial en la UI
 */
function renderHistory() {
  const historyList = document.getElementById('history-list');
  const emptyState = document.getElementById('empty-state');
  
  // Limpiar lista
  historyList.innerHTML = '';
  
  // Mostrar/ocultar empty state
  if (currentHistory.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  // Renderizar cada ítem
  currentHistory.forEach((item) => {
    const element = createHistoryItemElement(item);
    historyList.appendChild(element);
  });
}

/**
 * Crea el elemento HTML para un ítem de historial
 */
function createHistoryItemElement(item) {
  const div = document.createElement('div');
  div.className = 'history-item';
  if (item.fromRemote) {
    div.classList.add('remote');
  }
  
  // Icono
  const icon = document.createElement('div');
  icon.className = 'item-icon';
  icon.innerHTML = getIconForType(item.type);
  
  // Contenido
  const content = document.createElement('div');
  content.className = 'item-content';
  
  // Preview
  const preview = document.createElement('div');
  preview.className = 'item-preview';
  
  if (item.type === 'text') {
    preview.textContent = item.data;
    if (item.data.includes('\n')) {
      preview.classList.add('multiline');
    }
  } else if (item.type === 'image') {
    const img = document.createElement('img');
    img.src = item.data;
    img.className = 'item-image';
    img.alt = 'Clipboard image';
    preview.appendChild(img);
  }
  
  // Metadata
  const meta = document.createElement('div');
  meta.className = 'item-meta';
  
  // Tipo
  const typeSpan = document.createElement('span');
  typeSpan.className = 'meta-item';
  typeSpan.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${item.type === 'text' ? 
        '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>' :
        '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>'
      }
    </svg>
    ${item.type === 'text' ? 'Texto' : 'Imagen'}
  `;
  
  // Tamaño
  const sizeSpan = document.createElement('span');
  sizeSpan.className = 'meta-item';
  sizeSpan.textContent = formatBytes(item.sizeBytes);
  
  // Tiempo
  const timeSpan = document.createElement('span');
  timeSpan.className = 'meta-item';
  timeSpan.textContent = formatTime(item.timestamp);
  
  meta.appendChild(typeSpan);
  meta.appendChild(sizeSpan);
  meta.appendChild(timeSpan);
  
  // Badge remoto
  if (item.fromRemote) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'Remoto';
    meta.appendChild(badge);
  }
  
  content.appendChild(preview);
  content.appendChild(meta);
  
  // Botón de eliminar
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.title = 'Eliminar';
  deleteBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;
  
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation(); // Evitar que se active el click del ítem
    await handleItemDelete(item);
  });
  
  div.appendChild(icon);
  div.appendChild(content);
  div.appendChild(deleteBtn);
  
  // Click handler para copiar
  div.addEventListener('click', async () => {
    await handleItemClick(item);
  });
  
  return div;
}

/**
 * Maneja el click en un ítem
 */
async function handleItemClick(item) {
  try {
    const success = await window.electronAPI.writeToClipboard(item.id);
    if (success) {
      console.log('Item written to clipboard:', item.id);
      // La ventana se cierra automáticamente en el main process
    } else {
      console.error('Failed to write to clipboard');
    }
  } catch (error) {
    console.error('Error writing to clipboard:', error);
  }
}

/**
 * Maneja la eliminación de un ítem
 */
async function handleItemDelete(item) {
  try {
    const success = await window.electronAPI.removeFromHistory(item.id);
    if (success) {
      console.log('Item removed from history:', item.id);
      // El historial se actualizará automáticamente via evento
    } else {
      console.error('Failed to remove item');
    }
  } catch (error) {
    console.error('Error removing item:', error);
  }
}

/**
 * Actualiza las estadísticas en la UI
 */
async function updateStats() {
  try {
    const stats = await window.electronAPI.getStats();
    
    // Ítems totales
    document.getElementById('stat-total').textContent = stats.clipboard.total;
    
    // Peers conectados
    const peersText = `${stats.client.connected}/${stats.client.totalConfigured}`;
    document.getElementById('stat-peers').textContent = peersText;
    
    // Tamaño total
    document.getElementById('stat-size').textContent = formatBytes(stats.clipboard.totalSizeBytes);
    
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

/**
 * Obtiene el icono SVG para un tipo de ítem
 */
function getIconForType(type) {
  if (type === 'text') {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="4 7 4 4 20 4 20 7"></polyline>
        <line x1="9" y1="20" x2="15" y2="20"></line>
        <line x1="12" y1="4" x2="12" y2="20"></line>
      </svg>
    `;
  } else if (type === 'image') {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    `;
  }
  return '';
}

/**
 * Formatea bytes a tamaño legible
 */
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formatea timestamp a tiempo relativo
 */
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return 'Ahora';
  } else if (minutes < 60) {
    return `Hace ${minutes}m`;
  } else if (hours < 24) {
    return `Hace ${hours}h`;
  } else if (days < 7) {
    return `Hace ${days}d`;
  } else {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

/**
 * Panel Resize Module
 *
 * Handles drag-to-resize functionality for sidebars.
 * Supports both left (session history) and right (agent panel) sidebars.
 */

const STORAGE_KEY = 'panel-widths';

// Default and constraint values
const PANEL_CONFIG = {
  'session-history': {
    minWidth: 180,
    maxWidth: 500,
    defaultWidth: 260
  },
  'agent-panel': {
    minWidth: 250,
    maxWidth: 600,
    defaultWidth: 350
  }
};

// State
let isResizing = false;
let currentHandle = null;
let currentPanel = null;
let startX = 0;
let startWidth = 0;

/**
 * Load saved panel widths from localStorage
 */
function loadPanelWidths() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load panel widths:', e);
  }
  return {};
}

/**
 * Save panel widths to localStorage
 */
function savePanelWidths(widths) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch (e) {
    console.warn('Failed to save panel widths:', e);
  }
}

/**
 * Apply saved width to a panel
 */
function applyPanelWidth(panelId, width) {
  const panel = document.getElementById(panelId);
  if (panel && width) {
    const config = PANEL_CONFIG[panelId];
    const clampedWidth = Math.max(config.minWidth, Math.min(config.maxWidth, width));
    panel.style.width = `${clampedWidth}px`;
  }
}

/**
 * Initialize resize handles
 */
export function initPanelResize() {
  const handles = document.querySelectorAll('.resize-handle');

  // Load and apply saved widths
  const savedWidths = loadPanelWidths();
  Object.entries(savedWidths).forEach(([panelId, width]) => {
    applyPanelWidth(panelId, width);
  });

  handles.forEach(handle => {
    handle.addEventListener('mousedown', handleMouseDown);
    // Touch support
    handle.addEventListener('touchstart', handleTouchStart, { passive: false });
  });

  // Global mouse/touch move and up handlers
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);

  // Double-click to reset to default width
  handles.forEach(handle => {
    handle.addEventListener('dblclick', handleDoubleClick);
  });
}

/**
 * Handle mouse down on resize handle
 */
function handleMouseDown(e) {
  e.preventDefault();
  startResize(e.target, e.clientX);
}

/**
 * Handle touch start on resize handle
 */
function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  startResize(e.target, touch.clientX);
}

/**
 * Start the resize operation
 */
function startResize(handle, clientX) {
  isResizing = true;
  currentHandle = handle;

  const panelId = handle.dataset.panel;
  currentPanel = document.getElementById(panelId);

  if (!currentPanel) return;

  startX = clientX;
  startWidth = currentPanel.offsetWidth;

  // Add visual feedback
  handle.classList.add('dragging');
  document.body.classList.add('resizing');
}

/**
 * Handle mouse move during resize
 */
function handleMouseMove(e) {
  if (!isResizing) return;
  e.preventDefault();
  updateResize(e.clientX);
}

/**
 * Handle touch move during resize
 */
function handleTouchMove(e) {
  if (!isResizing) return;
  e.preventDefault();
  const touch = e.touches[0];
  updateResize(touch.clientX);
}

/**
 * Update panel width during resize
 */
function updateResize(clientX) {
  if (!currentPanel || !currentHandle) return;

  const panelId = currentHandle.dataset.panel;
  const config = PANEL_CONFIG[panelId];
  const isLeftPanel = currentHandle.classList.contains('resize-handle-right');

  let delta = clientX - startX;

  // For right panel, invert the delta (dragging left increases width)
  if (!isLeftPanel) {
    delta = -delta;
  }

  let newWidth = startWidth + delta;

  // Clamp to min/max
  newWidth = Math.max(config.minWidth, Math.min(config.maxWidth, newWidth));

  // Apply new width
  currentPanel.style.width = `${newWidth}px`;
}

/**
 * Handle mouse up - end resize
 */
function handleMouseUp() {
  endResize();
}

/**
 * Handle touch end - end resize
 */
function handleTouchEnd() {
  endResize();
}

/**
 * End the resize operation
 */
function endResize() {
  if (!isResizing) return;

  isResizing = false;

  // Save the new width
  if (currentPanel && currentHandle) {
    const panelId = currentHandle.dataset.panel;
    const newWidth = currentPanel.offsetWidth;

    const savedWidths = loadPanelWidths();
    savedWidths[panelId] = newWidth;
    savePanelWidths(savedWidths);
  }

  // Remove visual feedback
  if (currentHandle) {
    currentHandle.classList.remove('dragging');
  }
  document.body.classList.remove('resizing');

  currentHandle = null;
  currentPanel = null;
}

/**
 * Handle double-click to reset to default width
 */
function handleDoubleClick(e) {
  const handle = e.target;
  const panelId = handle.dataset.panel;
  const panel = document.getElementById(panelId);
  const config = PANEL_CONFIG[panelId];

  if (panel && config) {
    // Animate to default width
    panel.style.transition = 'width var(--duration-slow) var(--ease-out)';
    panel.style.width = `${config.defaultWidth}px`;

    // Remove transition after animation
    setTimeout(() => {
      panel.style.transition = '';
    }, 300);

    // Save the default width
    const savedWidths = loadPanelWidths();
    savedWidths[panelId] = config.defaultWidth;
    savePanelWidths(savedWidths);
  }
}

/**
 * Get the current width of a panel
 */
export function getPanelWidth(panelId) {
  const panel = document.getElementById(panelId);
  return panel ? panel.offsetWidth : null;
}

/**
 * Set the width of a panel programmatically
 */
export function setPanelWidth(panelId, width) {
  applyPanelWidth(panelId, width);

  const savedWidths = loadPanelWidths();
  savedWidths[panelId] = width;
  savePanelWidths(savedWidths);
}

// ============================================
// DASHBOARD WIDGETS CONFIGURATION
// ============================================

/**
 * Default widget definitions - order and visibility
 * Each widget corresponds to a stat card in the dashboard
 */
const DEFAULT_WIDGETS = [
    { id: 'total-actions', icon: '⚡', name: 'Total Actions', desc: 'All recorded activities', enabled: true },
    { id: 'onchain', icon: '⛓️', name: 'On-Chain', desc: 'Activities signed to Solana', enabled: true },
    { id: 'commits', icon: '📝', name: 'Commits', desc: 'Git commits made', enabled: true },
    { id: 'builds', icon: '🔧', name: 'Builds', desc: 'Builds, deploys, decisions', enabled: true },
    { id: 'trades', icon: '💱', name: 'Trades', desc: 'Trades and transfers', enabled: true },
    { id: 'messages', icon: '💬', name: 'Messages', desc: 'Messages sent', enabled: true },
    { id: 'tweets', icon: '🐦', name: 'Tweets', desc: 'Twitter activity', enabled: true },
    { id: 'uptime', icon: '⏱️', name: 'Uptime', desc: 'Time since first activity', enabled: true },
    { id: 'volume', icon: '💰', name: 'Trade Volume', desc: 'Total trading volume in USD', enabled: true },
    { id: 'streak', icon: '🔥', name: 'Day Streak', desc: 'Consecutive active days', enabled: true },
    { id: 'mood', icon: '🧠', name: 'Agent Mood', desc: 'Current agent state', enabled: true },
    { id: 'sol-position', icon: '◎', name: 'Net SOL', desc: 'Net SOL position', enabled: true }
];

let widgetConfig = JSON.parse(localStorage.getItem('pow_widget_config')) || null;
let pendingWidgetConfig = null; // Temp config during editing

/**
 * Get the current widget configuration (order + visibility)
 */
function getWidgetConfig() {
    if (!widgetConfig) {
        widgetConfig = JSON.parse(JSON.stringify(DEFAULT_WIDGETS));
    }
    return widgetConfig;
}

/**
 * Save widget configuration to localStorage
 */
function saveWidgetConfig(config) {
    widgetConfig = config;
    localStorage.setItem('pow_widget_config', JSON.stringify(config));
}

/**
 * Open the widgets configuration modal
 */
function openWidgetsModal() {
    const modal = document.getElementById('widgetsModal');
    if (!modal) return;
    
    // Clone current config for editing
    pendingWidgetConfig = JSON.parse(JSON.stringify(getWidgetConfig()));
    
    renderWidgetsList();
    modal.style.display = 'flex';
    
    // Focus management for accessibility
    const firstToggle = modal.querySelector('.widget-toggle');
    if (firstToggle) firstToggle.focus();
    
    // Trap focus in modal
    modal.addEventListener('keydown', handleWidgetsModalKeydown);
    
    announceToScreenReader('Widgets configuration modal opened. Drag to reorder, toggle to show or hide.');
}

/**
 * Close the widgets modal
 */
function closeWidgetsModal() {
    const modal = document.getElementById('widgetsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.removeEventListener('keydown', handleWidgetsModalKeydown);
    }
    pendingWidgetConfig = null;
}

/**
 * Handle keyboard navigation in widgets modal
 */
function handleWidgetsModalKeydown(e) {
    if (e.key === 'Escape') {
        closeWidgetsModal();
    }
}

/**
 * Render the widgets list in the modal
 */
function renderWidgetsList() {
    const list = document.getElementById('widgetsList');
    if (!list || !pendingWidgetConfig) return;
    
    list.innerHTML = pendingWidgetConfig.map((widget, index) => `
        <div class="widget-item ${widget.enabled ? '' : 'hidden-widget'}" 
             data-index="${index}" 
             draggable="true"
             role="listitem"
             aria-label="${widget.name} widget, ${widget.enabled ? 'visible' : 'hidden'}">
            <span class="widget-drag-handle" aria-hidden="true">⠿</span>
            <span class="widget-icon">${widget.icon}</span>
            <div class="widget-info">
                <div class="widget-name">${widget.name}</div>
                <div class="widget-desc">${widget.desc}</div>
            </div>
            <button class="widget-toggle ${widget.enabled ? 'enabled' : ''}" 
                    onclick="toggleWidget(${index})"
                    aria-pressed="${widget.enabled}"
                    aria-label="Toggle ${widget.name} visibility">
            </button>
        </div>
    `).join('');
    
    // Add drag-and-drop event listeners
    initWidgetDragDrop();
}

/**
 * Initialize drag and drop for widget reordering
 */
function initWidgetDragDrop() {
    const list = document.getElementById('widgetsList');
    if (!list) return;
    
    const items = list.querySelectorAll('.widget-item');
    let draggedItem = null;
    let draggedIndex = -1;
    
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            draggedIndex = parseInt(item.dataset.index);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedIndex);
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            items.forEach(i => i.classList.remove('drag-over'));
            draggedItem = null;
            draggedIndex = -1;
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedItem && item !== draggedItem) {
                item.classList.add('drag-over');
            }
        });
        
        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            
            if (!draggedItem || item === draggedItem) return;
            
            const targetIndex = parseInt(item.dataset.index);
            
            // Reorder the config array
            const movedWidget = pendingWidgetConfig.splice(draggedIndex, 1)[0];
            pendingWidgetConfig.splice(targetIndex, 0, movedWidget);
            
            // Re-render the list
            renderWidgetsList();
            
            announceToScreenReader(`${movedWidget.name} moved to position ${targetIndex + 1}`);
        });
    });
}

/**
 * Toggle widget visibility
 */
function toggleWidget(index) {
    if (!pendingWidgetConfig || !pendingWidgetConfig[index]) return;
    
    pendingWidgetConfig[index].enabled = !pendingWidgetConfig[index].enabled;
    renderWidgetsList();
    
    const widget = pendingWidgetConfig[index];
    announceToScreenReader(`${widget.name} ${widget.enabled ? 'shown' : 'hidden'}`);
}

/**
 * Reset widgets to default configuration
 */
function resetWidgets() {
    pendingWidgetConfig = JSON.parse(JSON.stringify(DEFAULT_WIDGETS));
    renderWidgetsList();
    announceToScreenReader('Widgets reset to default configuration');
}

/**
 * Save and close widgets modal
 */
function saveAndCloseWidgets() {
    if (pendingWidgetConfig) {
        saveWidgetConfig(pendingWidgetConfig);
        
        // Re-render stat cards with new configuration
        if (window.cachedActivities) {
            statsInitialized = false;
            updateStats(window.cachedActivities);
        }
        
        showToast('Widget configuration saved!', 'success');
    }
    closeWidgetsModal();
}

// Make functions globally available
window.openWidgetsModal = openWidgetsModal;
window.closeWidgetsModal = closeWidgetsModal;
window.toggleWidget = toggleWidget;
window.resetWidgets = resetWidgets;
window.saveAndCloseWidgets = saveAndCloseWidgets;

// ============================================
// DRAG-AND-DROP DASHBOARD LAYOUT
// ============================================

let dashboardDragEnabled = false;
let dashboardEditMode = false;
let draggedCard = null;
let draggedWidgetId = null;

/**
 * Initialize drag-and-drop on the stats grid
 * Called after stat cards are rendered
 */
function initDashboardDragDrop() {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;
    
    // Add class to enable drag styles
    statsGrid.classList.add('drag-enabled');
    
    // Make all stat cards draggable
    const statCards = statsGrid.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.classList.add('draggable');
        card.setAttribute('draggable', 'true');
        
        // Drag start
        card.addEventListener('dragstart', handleDashboardDragStart);
        
        // Drag end
        card.addEventListener('dragend', handleDashboardDragEnd);
        
        // Drag over (needed for drop to work)
        card.addEventListener('dragover', handleDashboardDragOver);
        
        // Drag enter (visual feedback)
        card.addEventListener('dragenter', handleDashboardDragEnter);
        
        // Drag leave (remove visual feedback)
        card.addEventListener('dragleave', handleDashboardDragLeave);
        
        // Drop
        card.addEventListener('drop', handleDashboardDrop);
    });
    
    dashboardDragEnabled = true;
}

/**
 * Handle drag start on stat card
 */
function handleDashboardDragStart(e) {
    draggedCard = this;
    draggedWidgetId = getWidgetIdFromCard(this);
    
    this.classList.add('dragging');
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedWidgetId);
    
    // Create custom drag image (optional)
    // e.dataTransfer.setDragImage(this, this.offsetWidth / 2, this.offsetHeight / 2);
    
    announceToScreenReader(`Dragging ${getWidgetNameById(draggedWidgetId)} widget`);
}

/**
 * Handle drag end
 */
function handleDashboardDragEnd(e) {
    this.classList.remove('dragging');
    
    // Remove all drag-over states
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
        statsGrid.querySelectorAll('.stat-card').forEach(card => {
            card.classList.remove('drag-over');
        });
    }
    
    draggedCard = null;
    draggedWidgetId = null;
}

/**
 * Handle drag over (enables drop)
 */
function handleDashboardDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

/**
 * Handle drag enter (visual feedback)
 */
function handleDashboardDragEnter(e) {
    e.preventDefault();
    if (this !== draggedCard) {
        this.classList.add('drag-over');
    }
}

/**
 * Handle drag leave
 */
function handleDashboardDragLeave(e) {
    // Only remove if actually leaving (not entering a child element)
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

/**
 * Handle drop on stat card
 */
function handleDashboardDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    this.classList.remove('drag-over');
    
    if (!draggedCard || this === draggedCard) return;
    
    const targetWidgetId = getWidgetIdFromCard(this);
    if (!targetWidgetId || !draggedWidgetId) return;
    
    // Get current config
    const config = getWidgetConfig();
    const draggedIndex = config.findIndex(w => w.id === draggedWidgetId);
    const targetIndex = config.findIndex(w => w.id === targetWidgetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Reorder: remove dragged item and insert at target position
    const [movedWidget] = config.splice(draggedIndex, 1);
    config.splice(targetIndex, 0, movedWidget);
    
    // Save the new order
    saveWidgetConfig(config);
    
    // Re-render stat cards with new order
    statsInitialized = false;
    if (window.cachedActivities) {
        updateStats(window.cachedActivities);
    }
    
    // Re-initialize drag-drop on new elements
    setTimeout(() => {
        initDashboardDragDrop();
    }, 100);
    
    // Show success feedback
    showDragToast(`${movedWidget.name} moved`);
    announceToScreenReader(`${movedWidget.name} moved to position ${targetIndex + 1}`);
}

/**
 * Get widget ID from a stat card element
 */
function getWidgetIdFromCard(card) {
    // Try to match card ID to widget ID
    const cardId = card.id || '';
    
    // Map card IDs to widget IDs
    const idMap = {
        'card-total-actions': 'total-actions',
        'card-onchain': 'onchain',
        'card-commits': 'commits',
        'card-builds': 'builds',
        'card-trades': 'trades',
        'card-messages': 'messages',
        'card-tweets': 'tweets',
        'card-uptime': 'uptime',
        'card-volume': 'volume',
        'streak-card': 'streak',
        'mood-card': 'mood',
        'sol-position-card': 'sol-position'
    };
    
    if (idMap[cardId]) return idMap[cardId];
    
    // Fallback: try to find by position
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return null;
    
    const cards = Array.from(statsGrid.querySelectorAll('.stat-card'));
    const index = cards.indexOf(card);
    
    if (index !== -1) {
        const config = getWidgetConfig();
        const enabledWidgets = config.filter(w => w.enabled);
        if (enabledWidgets[index]) {
            return enabledWidgets[index].id;
        }
    }
    
    return null;
}

/**
 * Get widget name by ID
 */
function getWidgetNameById(widgetId) {
    const config = getWidgetConfig();
    const widget = config.find(w => w.id === widgetId);
    return widget ? widget.name : 'Widget';
}

/**
 * Show a toast notification for drag actions
 */
function showDragToast(message) {
    // Use existing toast if available, or create simple one
    if (typeof showToast === 'function') {
        showToast(`📌 ${message}`, 'success');
    } else {
        // Fallback: create a simple toast
        let toast = document.querySelector('.drag-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'drag-toast';
            document.body.appendChild(toast);
        }
        
        toast.textContent = `📌 ${message}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
}

/**
 * Toggle edit mode for dashboard layout
 * Shows visual indicators that cards can be dragged
 */
function toggleDashboardEditMode() {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;
    
    dashboardEditMode = !dashboardEditMode;
    statsGrid.classList.toggle('edit-mode', dashboardEditMode);
    
    if (dashboardEditMode) {
        showToast('📐 Edit mode: Drag cards to reorder', 'info');
        announceToScreenReader('Dashboard edit mode enabled. Drag stat cards to reorder.');
    } else {
        showToast('✅ Layout saved', 'success');
        announceToScreenReader('Dashboard edit mode disabled. Layout saved.');
    }
}

// Make drag functions globally available
window.initDashboardDragDrop = initDashboardDragDrop;
window.toggleDashboardEditMode = toggleDashboardEditMode;

// ============================================
// INFINITE SCROLL / LAZY LOADING
// ============================================
const ACTIVITIES_PER_PAGE = 50;
let currentDisplayCount = ACTIVITIES_PER_PAGE;
let isLoadingMore = false;
let infiniteScrollObserver = null;

/**
 * Initialize infinite scroll observer
 * Watches for when the load-more sentinel enters viewport
 */
function initInfiniteScroll() {
    // Clean up any existing observer
    if (infiniteScrollObserver) {
        infiniteScrollObserver.disconnect();
    }
    
    infiniteScrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoadingMore) {
                loadMoreActivities();
            }
        });
    }, {
        root: null, // viewport
        rootMargin: '200px', // Load 200px before reaching bottom
        threshold: 0.1
    });
    
    // Observe the sentinel element if it exists
    const sentinel = document.getElementById('load-more-sentinel');
    if (sentinel) {
        infiniteScrollObserver.observe(sentinel);
    }
}

/**
 * Load more activities into the feed
 */
function loadMoreActivities() {
    if (isLoadingMore) return;
    
    const activities = window.cachedActivities || [];
    if (currentDisplayCount >= activities.length) {
        // All activities are loaded
        hideLoadMoreUI();
        return;
    }
    
    isLoadingMore = true;
    showLoadingIndicator();
    
    // Simulate a small delay for smooth UX (prevents jarring instant loads)
    setTimeout(() => {
        currentDisplayCount = Math.min(currentDisplayCount + ACTIVITIES_PER_PAGE, activities.length);
        
        // Re-render with the new display count
        const feed = document.getElementById('feed');
        if (feed && activities.length > 0) {
            feed.classList.add('refreshing');
            feed.innerHTML = renderGroupedActivitiesLimited(activities, currentDisplayCount, false);
            lastRenderedCount = activities.length;
            setTimeout(() => feed.classList.remove('refreshing'), 300);
        }
        
        isLoadingMore = false;
        hideLoadingIndicator();
        
        // Update the load more button text
        updateLoadMoreButton();
        
        // Re-observe sentinel for next load
        const sentinel = document.getElementById('load-more-sentinel');
        if (sentinel && infiniteScrollObserver) {
            infiniteScrollObserver.observe(sentinel);
        }
        
        // Announce to screen readers
        announceToScreenReader(`Loaded more activities. Now showing ${currentDisplayCount} of ${activities.length}.`);
    }, 150);
}

/**
 * Show loading indicator in load-more area
 */
function showLoadingIndicator() {
    const btn = document.getElementById('load-more-btn');
    if (btn) {
        btn.innerHTML = '<span class="loading-spinner"></span> Loading...';
        btn.disabled = true;
    }
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator() {
    updateLoadMoreButton();
}

/**
 * Update load more button text with remaining count
 */
function updateLoadMoreButton() {
    const btn = document.getElementById('load-more-btn');
    const activities = window.cachedActivities || [];
    const remaining = activities.length - currentDisplayCount;
    
    if (btn) {
        if (remaining > 0) {
            const loadCount = Math.min(remaining, ACTIVITIES_PER_PAGE);
            btn.innerHTML = `📜 Load ${loadCount} More (${remaining} remaining)`;
            btn.disabled = false;
            btn.style.display = 'inline-flex';
        } else {
            btn.style.display = 'none';
        }
    }
}

/**
 * Hide load more UI when all items are loaded
 */
function hideLoadMoreUI() {
    const container = document.getElementById('load-more-container');
    if (container) {
        container.innerHTML = `
            <div class="all-loaded-message">
                ✅ All ${window.cachedActivities?.length || 0} activities loaded
            </div>
        `;
    }
}

/**
 * Reset infinite scroll state (called when filters change or activities reload)
 */
function resetInfiniteScroll() {
    currentDisplayCount = ACTIVITIES_PER_PAGE;
    isLoadingMore = false;
}

// ============================================
// NOTIFICATION SOUND SYSTEM
// ============================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

// Play a pleasant notification sound using Web Audio API
function playNotificationSound(type = 'new') {
    if (!soundEnabled) return;
    
    try {
        const ctx = initAudio();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        
        const now = ctx.currentTime;
        
        if (type === 'new') {
            // Pleasant ascending chime for new activities
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)
            
            frequencies.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                const startTime = now + (i * 0.08);
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
                
                osc.start(startTime);
                osc.stop(startTime + 0.5);
            });
        } else if (type === 'trade') {
            // Special sound for trades - coin-like
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
            
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'decision') {
            // Special sound for decisions - deeper, more significant
            const frequencies = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
            
            frequencies.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                const startTime = now + (i * 0.1);
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
                
                osc.start(startTime);
                osc.stop(startTime + 0.7);
            });
        }
    } catch (e) {
        console.log('Audio notification failed:', e);
    }
}

// Initialize audio on first user interaction (required by browsers)
document.addEventListener('click', () => initAudio(), { once: true });

// Toggle sound on/off
function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggle');
    if (btn) {
        btn.textContent = soundEnabled ? '🔔 Sounds On' : '🔕 Sounds Off';
        btn.classList.toggle('muted', !soundEnabled);
        btn.setAttribute('aria-pressed', soundEnabled);
        btn.setAttribute('aria-label', `Sound notifications: ${soundEnabled ? 'On' : 'Off'}`);
    }
    // Play a test sound when enabling
    if (soundEnabled) {
        playNotificationSound('new');
    }
}

// ============================================
// MULTI-THEME SUPPORT (Dark, Light, Ocean, Forest, Sunset, Cyberpunk + Auto)
// ============================================
const AVAILABLE_THEMES = ['auto', 'dark', 'light', 'ocean', 'forest', 'sunset', 'cyberpunk'];
const THEME_EMOJIS = {
    auto: '🔄',
    dark: '🌙',
    light: '☀️',
    ocean: '🌊',
    forest: '🌲',
    sunset: '🌅',
    cyberpunk: '🔮'
};

// System preference media query for auto mode
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function getSystemTheme() {
    return systemPrefersDark.matches ? 'dark' : 'light';
}

function getPreferredTheme() {
    const stored = localStorage.getItem('jarvis-pow-theme');
    if (stored && AVAILABLE_THEMES.includes(stored)) return stored;
    // Default to auto for new users
    return 'auto';
}

function getEffectiveTheme(theme) {
    // If auto, return system preference; otherwise return the theme
    return theme === 'auto' ? getSystemTheme() : theme;
}

function setTheme(theme) {
    if (!AVAILABLE_THEMES.includes(theme)) theme = 'dark';
    
    // Store the user's preference (including 'auto')
    localStorage.setItem('jarvis-pow-theme', theme);
    
    // Apply the effective theme (auto resolves to system preference)
    const effectiveTheme = getEffectiveTheme(theme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    
    // Store which mode we're in for the listener
    document.documentElement.setAttribute('data-theme-mode', theme);
    
    updateThemeButton(theme);
    updateThemeDropdownSelection(theme);
    closeThemeDropdown();
}

// Listen for system preference changes (for auto mode)
systemPrefersDark.addEventListener('change', () => {
    const currentMode = localStorage.getItem('jarvis-pow-theme');
    if (currentMode === 'auto') {
        // Re-apply to update to new system preference
        const effectiveTheme = getSystemTheme();
        document.documentElement.setAttribute('data-theme', effectiveTheme);
        console.log(`🔄 System preference changed to ${effectiveTheme}`);
    }
});

function updateThemeButton(theme) {
    const btn = document.getElementById('themeToggle');
    if (btn) {
        const emoji = THEME_EMOJIS[theme] || '🎨';
        btn.textContent = `${emoji} ${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
        btn.setAttribute('aria-label', `Current theme: ${theme}`);
    }
}

function updateThemeDropdownSelection(theme) {
    const dropdown = document.getElementById('themeDropdown');
    if (!dropdown) return;
    dropdown.querySelectorAll('.theme-option').forEach(opt => {
        const isActive = opt.dataset.theme === theme;
        opt.classList.toggle('active', isActive);
        opt.setAttribute('aria-selected', isActive);
    });
}

function toggleThemeDropdown() {
    const dropdown = document.getElementById('themeDropdown');
    const btn = document.getElementById('themeToggle');
    if (dropdown) {
        const isOpen = dropdown.classList.toggle('open');
        btn?.setAttribute('aria-expanded', isOpen);
    }
}

function closeThemeDropdown() {
    const dropdown = document.getElementById('themeDropdown');
    const btn = document.getElementById('themeToggle');
    if (dropdown) {
        dropdown.classList.remove('open');
        btn?.setAttribute('aria-expanded', 'false');
    }
}

// ============================================
// FEED SUBSCRIPTION DROPDOWN
// ============================================
function toggleFeedDropdown() {
    const dropdown = document.getElementById('feedDropdown');
    const btn = document.getElementById('feedSubscribeBtn');
    if (dropdown) {
        const isOpen = dropdown.classList.toggle('open');
        btn?.setAttribute('aria-expanded', isOpen);
    }
}

function closeFeedDropdown() {
    const dropdown = document.getElementById('feedDropdown');
    const btn = document.getElementById('feedSubscribeBtn');
    if (dropdown) {
        dropdown.classList.remove('open');
        btn?.setAttribute('aria-expanded', 'false');
    }
}

function copyFeedUrl(type) {
    const baseUrl = window.location.origin + '/pow/api/feed.';
    const url = baseUrl + type;
    
    navigator.clipboard.writeText(url).then(() => {
        // Show toast notification
        const toast = document.createElement('div');
        toast.className = 'feed-copied-toast';
        toast.textContent = `${type.toUpperCase()} URL copied to clipboard!`;
        document.body.appendChild(toast);
        
        // Remove toast after animation
        setTimeout(() => toast.remove(), 2300);
        
        // Close the dropdown
        closeFeedDropdown();
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback: show URL in alert
        alert(`Feed URL: ${url}`);
    });
}

// Close feed dropdown when clicking outside
document.addEventListener('click', (e) => {
    const feedWrapper = e.target.closest('.feed-subscribe-dropdown');
    if (!feedWrapper) {
        closeFeedDropdown();
    }
});

// Legacy toggle function for keyboard shortcut (cycles through themes)
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const currentIndex = AVAILABLE_THEMES.indexOf(current);
    const nextIndex = (currentIndex + 1) % AVAILABLE_THEMES.length;
    setTheme(AVAILABLE_THEMES[nextIndex]);
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const wrapper = e.target.closest('.theme-selector-wrapper');
    if (!wrapper) {
        closeThemeDropdown();
    }
});

// Initialize theme on page load
(function initTheme() {
    const theme = getPreferredTheme();
    setTheme(theme);
})();

// ============================================
// TAB SWITCHING (with smooth transitions)
// ============================================
function switchTab(tabName) {
    // Update tab buttons and ARIA states
    document.querySelectorAll('.feed-tab').forEach(tab => {
        const isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive);
    });
    
    // Get all feed containers
    const feeds = {
        timeline: document.getElementById('feed'),
        milestones: document.getElementById('milestones-feed'),
        tweets: document.getElementById('tweets-feed'),
        decisions: document.getElementById('decisions-feed'),
        meta: document.getElementById('meta-story'),
        verify: document.getElementById('verify-feed'),
        performance: document.getElementById('performance-feed'),
        heatmap: document.getElementById('heatmap-feed'),
        wordcloud: document.getElementById('wordcloud-feed')
    };
    
    // Hide all with transition
    Object.keys(feeds).forEach(key => {
        if (feeds[key]) {
            if (key !== tabName) {
                feeds[key].style.display = 'none';
            }
        }
    });
    
    // Show selected with entrance animation
    const targetFeed = feeds[tabName];
    if (targetFeed) {
        targetFeed.style.display = 'block';
        targetFeed.classList.add('feed-transitioning');
        
        // Trigger reflow then remove class for animation
        void targetFeed.offsetWidth;
        requestAnimationFrame(() => {
            targetFeed.classList.remove('feed-transitioning');
        });
    }
    
    // Render recent hashes when switching to verify tab
    if (tabName === 'verify' && window.cachedActivities) {
        renderRecentHashes(window.cachedActivities);
    }
    
    // Render tweets when switching to tweets tab
    if (tabName === 'tweets' && window.cachedActivities) {
        renderTweets(window.cachedActivities);
    }
    
    // Initialize performance dashboard when switching to performance tab
    if (tabName === 'performance') {
        initPerformanceDashboard();
    }
    
    // Initialize heatmap when switching to heatmap tab
    if (tabName === 'heatmap' && window.cachedActivities) {
        renderHeatmap(window.cachedActivities);
    }
    
    // Initialize word cloud when switching to wordcloud tab
    if (tabName === 'wordcloud' && window.cachedActivities) {
        renderWordCloud(window.cachedActivities);
    }
}

// ============================================
// RENDER TWEETS (Twitter-like feed)
// ============================================
function renderTweets(activities) {
    const tweets = activities.filter(a => a.type === 'tweet');
    const list = document.getElementById('tweets-list');
    
    if (!tweets.length) {
        list.innerHTML = `
            <div class="tweets-empty">
                <div class="tweets-empty-icon">🐦</div>
                <h4>No tweets yet</h4>
                <p>Jarvis hasn't posted any tweets during this hackathon yet.<br>
                Follow <a href="https://x.com/jarvis_avo" target="_blank">@jarvis_avo</a> for updates!</p>
            </div>
        `;
        return;
    }
    
    const sorted = [...tweets].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    list.innerHTML = sorted.map((tweet, i) => {
        const content = tweet.metadata?.content || tweet.description.replace(/^🐦 Posted tweet: "?/, '').replace(/"$/, '');
        const tweetType = tweet.metadata?.tweetType || 'tweet';
        const tweetUrl = tweet.metadata?.url || `https://x.com/jarvis_avo`;
        
        // Format content: highlight hashtags and links
        const formattedContent = escapeHtml(content)
            .replace(/(#\w+)/g, '<span class="hashtag">$1</span>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        
        const typeLabel = tweetType === 'reply' ? '↩️ Reply' :
                          tweetType === 'thread' ? '🧵 Thread' :
                          tweetType === 'quote' ? '💬 Quote' :
                          tweetType === 'retweet' ? '🔄 Retweet' : '';
        
        return `
        <div class="tweet-card" style="animation-delay: ${i * 0.08}s">
            <div class="tweet-header">
                <div class="tweet-avatar-small">🤖</div>
                <div class="tweet-main">
                    <div class="tweet-author-row">
                        <span class="tweet-author">Jarvis</span>
                        <span class="tweet-author-handle">@jarvis_avo</span>
                        <span class="tweet-time">· ${formatTime(tweet.timestamp)}</span>
                        ${typeLabel ? `<span class="tweet-type-badge">${typeLabel}</span>` : ''}
                    </div>
                    <div class="tweet-content">${formattedContent}</div>
                    <div class="tweet-footer">
                        <span class="tweet-action" title="Replies">
                            <svg viewBox="0 0 24 24"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z"/></svg>
                        </span>
                        <span class="tweet-action" title="Retweets">
                            <svg viewBox="0 0 24 24"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/></svg>
                        </span>
                        <span class="tweet-action" title="Likes">
                            <svg viewBox="0 0 24 24"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z"/></svg>
                        </span>
                        <span class="tweet-action" title="Views">
                            <svg viewBox="0 0 24 24"><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"/></svg>
                        </span>
                        <div class="tweet-proof">
                            ${tweet.signature ? `
                                <a class="proof-link" href="https://solscan.io/tx/${tweet.signature}" target="_blank">
                                    <span class="proof-badge onchain">⛓️ On-Chain</span>
                                </a>
                            ` : '<span class="proof-badge pending">⏳ Pending</span>'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

// ============================================
// RENDER DECISIONS (POLISHED)
// ============================================
function renderDecisions(activities) {
    const decisions = activities.filter(a => a.type === 'decision');
    const feed = document.getElementById('decisions-feed');
    
    if (!decisions.length) {
        feed.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🧠</div>
                <h4>No Key Decisions Yet</h4>
                <p>Strategic decisions and their rationales will appear here as the agent makes them.</p>
                <div class="empty-state-hint">
                    Decisions include architecture choices, trading strategies, and project pivots.
                </div>
            </div>
        `;
        return;
    }
    
    const sorted = [...decisions].reverse();
    
    feed.innerHTML = sorted.map((d, i) => {
        const rationale = d.metadata?.rationale || d.metadata?.reason || 'No rationale recorded';
        const cycle = d.metadata?.cycle ? `Cycle ${d.metadata.cycle}` : '';
        
        return `
        <div class="decision-item" style="animation-delay: ${i * 0.1}s">
            <div class="decision-header">
                <span class="decision-type">🧠 Key Decision ${cycle}</span>
                <span class="decision-time">${formatTime(d.timestamp)}</span>
            </div>
            <div class="decision-desc">${escapeHtml(d.description)}</div>
            <div class="decision-rationale">
                <div class="decision-rationale-label">Rationale</div>
                ${escapeHtml(rationale)}
            </div>
            ${d.signature ? `
                <div style="margin-top: 1rem;">
                    <a class="proof-link" href="https://solscan.io/tx/${d.signature}" target="_blank">
                        <span class="proof-badge onchain">⛓️ Decision verified on-chain</span>
                    </a>
                </div>
            ` : ''}
        </div>
    `}).join('');
}

// ============================================
// RENDER MILESTONES
// ============================================
function renderMilestones(activities) {
    const feed = document.getElementById('milestones-feed');
    if (!feed) return;
    
    // Define milestones with conditions
    const milestoneDefinitions = [
        {
            id: 'first-activity',
            emoji: '🎬',
            title: 'First Activity Logged',
            desc: 'The journey begins - first action recorded in the proof-of-work system.',
            condition: (a) => a.length >= 1,
            getDate: (a) => a.length > 0 ? new Date(a[0].timestamp) : null,
            threshold: 1
        },
        {
            id: 'first-onchain',
            emoji: '⛓️',
            title: 'First On-Chain Proof',
            desc: 'First activity cryptographically signed and posted to Solana mainnet.',
            condition: (a) => a.some(x => x.signature || x.proof?.txSignature),
            getDate: (a) => {
                const first = a.find(x => x.signature || x.proof?.txSignature);
                return first ? new Date(first.timestamp) : null;
            },
            threshold: 1
        },
        {
            id: 'first-trade',
            emoji: '💱',
            title: 'First Trade Executed',
            desc: 'First autonomous swap executed on Solana DEX.',
            condition: (a) => a.some(x => x.type === 'trade'),
            getDate: (a) => {
                const first = a.find(x => x.type === 'trade');
                return first ? new Date(first.timestamp) : null;
            },
            threshold: 1
        },
        {
            id: 'ten-activities',
            emoji: '🔟',
            title: '10 Activities Milestone',
            desc: 'Double digits! Ten verified actions recorded.',
            condition: (a) => a.length >= 10,
            getDate: (a) => a.length >= 10 ? new Date(a[9].timestamp) : null,
            threshold: 10,
            showProgress: true,
            getCurrent: (a) => Math.min(a.length, 10)
        },
        {
            id: 'dashboard-live',
            emoji: '🌐',
            title: 'Dashboard Goes Public',
            desc: 'Proof-of-work dashboard deployed and accessible to the world.',
            condition: (a) => a.some(x => x.type === 'deploy' || x.description?.toLowerCase().includes('dashboard')),
            getDate: (a) => {
                const deploy = a.find(x => x.type === 'deploy' || x.description?.toLowerCase().includes('dashboard'));
                return deploy ? new Date(deploy.timestamp) : null;
            },
            threshold: 1
        },
        {
            id: 'twentyfive-activities',
            emoji: '🎯',
            title: '25 Activities Milestone',
            desc: 'Quarter century! Twenty-five verified actions recorded.',
            condition: (a) => a.length >= 25,
            getDate: (a) => a.length >= 25 ? new Date(a[24].timestamp) : null,
            threshold: 25,
            showProgress: true,
            getCurrent: (a) => Math.min(a.length, 25)
        },
        {
            id: 'fifty-activities',
            emoji: '🔥',
            title: '50 Activities Milestone',
            desc: 'Half century! Fifty verified on-chain proofs.',
            condition: (a) => a.length >= 50,
            getDate: (a) => a.length >= 50 ? new Date(a[49].timestamp) : null,
            threshold: 50,
            showProgress: true,
            getCurrent: (a) => Math.min(a.length, 50)
        },
        {
            id: 'first-decision',
            emoji: '🧠',
            title: 'First Key Decision',
            desc: 'First strategic decision recorded with on-chain verification.',
            condition: (a) => a.some(x => x.type === 'decision'),
            getDate: (a) => {
                const first = a.find(x => x.type === 'decision');
                return first ? new Date(first.timestamp) : null;
            },
            threshold: 1
        },
        {
            id: 'hundred-activities',
            emoji: '💯',
            title: '100 Activities Milestone',
            desc: 'Triple digits! One hundred verified on-chain proofs.',
            condition: (a) => a.length >= 100,
            getDate: (a) => a.length >= 100 ? new Date(a[99].timestamp) : null,
            threshold: 100,
            showProgress: true,
            getCurrent: (a) => Math.min(a.length, 100)
        },
        {
            id: 'multi-day',
            emoji: '📅',
            title: 'Multi-Day Streak',
            desc: 'Activity recorded across multiple consecutive days.',
            condition: (a) => {
                const days = new Set(a.map(x => new Date(x.timestamp).toISOString().split('T')[0]));
                return days.size >= 2;
            },
            getDate: (a) => {
                const days = [...new Set(a.map(x => new Date(x.timestamp).toISOString().split('T')[0]))].sort();
                return days.length >= 2 ? new Date(days[1] + 'T12:00:00') : null;
            },
            threshold: 2,
            showProgress: true,
            getCurrent: (a) => new Set(a.map(x => new Date(x.timestamp).toISOString().split('T')[0])).size
        },
        {
            id: 'all-onchain',
            emoji: '✅',
            title: '100% On-Chain',
            desc: 'Every single activity cryptographically signed and verified on Solana.',
            condition: (a) => a.length > 0 && a.every(x => x.signature || x.proof?.txSignature),
            getDate: (a) => {
                if (a.length === 0) return null;
                const allSigned = a.every(x => x.signature || x.proof?.txSignature);
                if (!allSigned) return null;
                // Find when the last one was signed
                const sorted = [...a].sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp));
                return new Date(sorted[0].timestamp);
            },
            threshold: 1
        }
    ];
    
    // Sort activities by timestamp
    const sorted = [...activities].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Evaluate milestones
    const milestones = milestoneDefinitions.map(m => {
        const completed = m.condition(sorted);
        const date = completed ? m.getDate(sorted) : null;
        const current = m.getCurrent ? m.getCurrent(sorted) : (completed ? m.threshold : 0);
        const progress = Math.min(100, (current / m.threshold) * 100);
        
        return {
            ...m,
            completed,
            date,
            current,
            progress
        };
    });
    
    // Separate completed and in-progress
    const completedMilestones = milestones.filter(m => m.completed).sort((a, b) => a.date - b.date);
    const inProgressMilestones = milestones.filter(m => !m.completed && m.showProgress);
    
    // Build summary
    const summaryHtml = `
        <div class="milestones-summary">
            <div class="summary-stat">
                <div class="value completed-value">${completedMilestones.length}</div>
                <div class="label">Completed</div>
            </div>
            <div class="summary-stat">
                <div class="value">${inProgressMilestones.length}</div>
                <div class="label">In Progress</div>
            </div>
            <div class="summary-stat">
                <div class="value">${milestones.length}</div>
                <div class="label">Total Milestones</div>
            </div>
        </div>
    `;
    
    // Build milestone cards
    const completedHtml = completedMilestones.map((m, i) => `
        <div class="milestone-item completed" style="animation-delay: ${i * 0.1}s">
            <div class="milestone-header">
                <span class="milestone-badge completed">🏆 Achieved</span>
                <span class="milestone-time">${m.date ? formatTime(m.date) : ''}</span>
            </div>
            <div class="milestone-title">
                <span class="emoji">${m.emoji}</span>
                ${escapeHtml(m.title)}
            </div>
            <div class="milestone-desc">${escapeHtml(m.desc)}</div>
        </div>
    `).join('');
    
    const inProgressHtml = inProgressMilestones.map((m, i) => `
        <div class="milestone-item" style="animation-delay: ${(completedMilestones.length + i) * 0.1}s">
            <div class="milestone-header">
                <span class="milestone-badge">🎯 In Progress</span>
            </div>
            <div class="milestone-title">
                <span class="emoji">${m.emoji}</span>
                ${escapeHtml(m.title)}
            </div>
            <div class="milestone-desc">${escapeHtml(m.desc)}</div>
            <div class="milestone-progress">
                <div class="milestone-progress-label">
                    <span>${m.current} / ${m.threshold}</span>
                    <span>${Math.round(m.progress)}%</span>
                </div>
                <div class="milestone-progress-bar">
                    <div class="milestone-progress-fill" style="width: ${m.progress}%"></div>
                </div>
            </div>
        </div>
    `).join('');
    
    feed.innerHTML = summaryHtml + 
        (completedHtml ? '<h3 style="color: var(--accent-green); margin: 1rem 0;">✅ Completed Milestones</h3>' + completedHtml : '') +
        (inProgressHtml ? '<h3 style="color: #ffd700; margin: 1.5rem 0 1rem;">🎯 In Progress</h3>' + inProgressHtml : '');
}

// Countdown to hackathon end
function updateCountdown() {
    const end = new Date('2026-02-12T23:59:59-08:00');
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) {
        document.getElementById('countdown').textContent = 'Ended';
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    document.getElementById('countdown').textContent = `${days}d ${hours}h remaining`;
}

updateCountdown();
setInterval(updateCountdown, 60000);

function getProofBadge(activity) {
    if (activity.signature) {
        const shortSig = activity.signature.slice(0, 8) + '...';
        return `<a class="proof-link" href="https://solscan.io/tx/${activity.signature}" target="_blank" title="${activity.signature}">
            <span class="proof-badge onchain">⛓️ On-Chain</span>
        </a>`;
    }
    if (activity.proof?.txSignature) {
        return `<a class="proof-link" href="https://solscan.io/tx/${activity.proof.txSignature}" target="_blank">
            <span class="proof-badge onchain">⛓️ On-Chain</span>
        </a>`;
    }
    if (activity.proof?.signature || activity.hash) {
        return '<span class="proof-badge signed">🔐 Signed</span>';
    }
    return '<span class="proof-badge pending">⏳ Pending</span>';
}

// ============================================
// MULTI-WALLET SUPPORT
// ============================================

/**
 * Known wallets for display purposes
 * Maps wallet addresses to friendly names
 */
const KNOWN_WALLETS = {
    'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX': { name: 'Jarvis', color: '#00aaff' },
    // Add more wallets here as needed
};

/**
 * Get short wallet address (first 4 + last 4 chars)
 */
function shortWallet(address) {
    if (!address || address.length <= 12) return address || '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Get wallet display name
 */
function getWalletName(address) {
    if (!address) return '';
    const known = KNOWN_WALLETS[address];
    return known ? known.name : shortWallet(address);
}

/**
 * Get wallet color
 */
function getWalletColor(address) {
    if (!address) return '#888';
    const known = KNOWN_WALLETS[address];
    return known ? known.color : '#888';
}

/**
 * Render wallet badge for activity cards
 */
function renderWalletBadge(walletAddress) {
    if (!walletAddress) return '';
    
    const name = getWalletName(walletAddress);
    const color = getWalletColor(walletAddress);
    const shortAddr = shortWallet(walletAddress);
    
    return `<a class="wallet-badge" href="https://solscan.io/account/${walletAddress}" target="_blank" 
               title="${walletAddress}" style="--wallet-color: ${color};">
        <span class="wallet-icon">💼</span>
        <span class="wallet-name">${name}</span>
    </a>`;
}

/**
 * Get unique wallets from activities
 */
function getUniqueWallets(activities) {
    const wallets = new Set();
    activities.forEach(a => {
        if (a.wallet) wallets.add(a.wallet);
    });
    return Array.from(wallets);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 hour ago
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return mins <= 1 ? 'Just now' : `${mins}m ago`;
    }
    
    // Less than 24 hours ago
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }
    
    // Show date
    return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

// Track last rendered activity count for new activity detection
let lastRenderedCount = 0;

function renderActivities(activities, highlightNew = false) {
    const feed = document.getElementById('feed');
    if (!activities.length) {
        feed.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🤖</div>
                <h4>Agent Warming Up</h4>
                <p>Activities will appear here as the agent works — commits, builds, trades, and more.</p>
                <div class="empty-state-hint">
                    Every action is cryptographically signed and verified on <code>Solana</code>
                </div>
            </div>
        `;
        return;
    }
    
    // Separate pinned and unpinned activities
    const pinned = activities.filter(a => a.pinned);
    const unpinned = activities.filter(a => !a.pinned);
    
    // Sort pinned by pinnedAt (most recently pinned first), unpinned by timestamp (most recent first)
    pinned.sort((a, b) => new Date(b.pinnedAt || 0) - new Date(a.pinnedAt || 0));
    unpinned.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Combine: pinned first, then recent unpinned
    const sorted = [...pinned, ...unpinned];
    
    const newCount = sorted.length - lastRenderedCount;
    const shouldHighlight = highlightNew && newCount > 0;
    
    feed.classList.add('refreshing');
    
    feed.innerHTML = sorted.map((a, i) => {
        const hash = a.hash || a.proof?.hash;
        const hashDisplay = hash ? `SHA256: ${hash.slice(0, 12)}...${hash.slice(-6)}` : '';
        const isNew = shouldHighlight && i < newCount && !a.pinned;
        const tagsHtml = renderActivityTags(a.tags);
        const walletHtml = renderWalletBadge(a.wallet);
        const activityId = getActivityId(a);
        const isPinned = !!a.pinned;
        const bookmarked = hash ? isBookmarked(hash) : false;
        const activityStatus = a.status || 'completed';
        
        const ariaLabel = `${bookmarked ? 'Bookmarked ' : ''}${isPinned ? 'Pinned ' : ''}${activityStatus !== 'completed' ? activityStatus + ' ' : ''}${a.type} activity: ${escapeHtml(a.description.substring(0, 80))}${a.description.length > 80 ? '...' : ''}`;
        const notesHtml = renderActivityNotes(a, hash);
        const attachmentsHtml = renderActivityAttachments(a, hash);
        const pinButtonHtml = renderPinButton(hash, isPinned);
        const bookmarkButtonHtml = renderBookmarkButton(hash);
        const statusButtonHtml = renderStatusButton(hash, activityStatus);
        const statusBadgeHtml = renderStatusBadge(activityStatus);
        
        const compareButtonHtml = renderCompareButton(hash);
        
        const compareSelected = typeof compareSelections !== 'undefined' && compareSelections.includes(hash);
        const compareCheckboxHtml = typeof renderCompareCheckbox === 'function' ? renderCompareCheckbox(hash) : '';
        const bulkSelected = typeof bulkSelections !== 'undefined' && bulkSelections.includes(hash);
        const bulkCheckboxHtml = typeof renderBulkCheckbox === 'function' ? renderBulkCheckbox(hash) : '';
        const importanceBadgeHtml = renderImportanceBadge(a);
        const sentimentBadgeHtml = typeof renderSentimentBadge === 'function' ? renderSentimentBadge(a) : '';
        const linksIndicatorHtml = renderLinksIndicator(a);
        
        return `
        <div class="activity-item ${a.type}${isNew ? ' new-activity' : ''}${isPinned ? ' pinned' : ''}${bookmarked ? ' bookmarked' : ''}${compareSelected ? ' compare-selected' : ''}${bulkSelected ? ' bulk-selected' : ''}${activityStatus !== 'completed' ? ' status-' + activityStatus : ''}" 
             style="animation-delay: ${i * 0.04}s" 
             data-wallet="${a.wallet || ''}" 
             data-activity-id="${activityId}"
             data-hash="${hash || ''}"
             data-pinned="${isPinned}"
             data-bookmarked="${bookmarked}"
             data-status="${activityStatus}"
             tabindex="0"
             role="article"
             aria-label="${ariaLabel}">
            ${compareCheckboxHtml}
            ${bulkCheckboxHtml}
            ${renderShareButton(activityId, hash)}
            ${renderCompareButton(hash)}
            ${bookmarkButtonHtml}
            ${pinButtonHtml}
            ${statusButtonHtml}
            <div class="activity-header">
                <div class="activity-badges">
                    ${isPinned ? '<span class="pinned-badge" title="Pinned activity">📌</span>' : ''}
                    ${bookmarked ? '<span class="bookmarked-badge" title="Bookmarked">⭐</span>' : ''}
                    ${statusBadgeHtml}
                    <span class="activity-type">${a.type}</span>
                    ${importanceBadgeHtml}
                    ${sentimentBadgeHtml}
                    ${getProofBadge(a)}
                    ${walletHtml}
                </div>
                <div class="activity-time">${formatTime(a.timestamp)}</div>
            </div>
            <div class="activity-desc">${escapeHtml(a.description)}</div>
            ${typeof renderAISummary === 'function' ? renderAISummary(a) : ''}
            ${tagsHtml}
            ${notesHtml}
            ${attachmentsHtml}
            <div class="activity-footer">
                ${hashDisplay ? `<div class="activity-hash">${hashDisplay}</div>` : ''}
                ${renderActivitySparkline(a)}
            </div>
        </div>
    `}).join('');
    
    lastRenderedCount = sorted.length;
    setTimeout(() => feed.classList.remove('refreshing'), 500);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Calculate day streak (consecutive days with activity)
function calculateStreak(activities) {
    if (!activities.length) return { streak: 0, isActive: false };
    
    // Get unique days with activity (in local timezone)
    const daysWithActivity = new Set();
    activities.forEach(a => {
        const date = new Date(a.timestamp);
        const dayKey = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        daysWithActivity.add(dayKey);
    });
    
    // Sort days in descending order (most recent first)
    const sortedDays = Array.from(daysWithActivity).sort().reverse();
    
    if (sortedDays.length === 0) return { streak: 0, isActive: false };
    
    // Check if today or yesterday has activity (streak is "active")
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    const isActive = daysWithActivity.has(today) || daysWithActivity.has(yesterday);
    
    // Count consecutive days starting from the most recent activity day
    let streak = 1;
    for (let i = 0; i < sortedDays.length - 1; i++) {
        const current = new Date(sortedDays[i] + 'T12:00:00');
        const next = new Date(sortedDays[i + 1] + 'T12:00:00');
        const diffDays = (current - next) / (1000 * 60 * 60 * 24);
        
        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    
    return { streak, isActive };
}

function updateStreak(activities) {
    const { streak, isActive } = calculateStreak(activities);
    const streakEl = document.getElementById('streak');
    const streakCard = document.getElementById('streak-card');
    
    if (streakEl) {
        const fireEmoji = streak >= 7 ? '🔥🔥' : (streak >= 3 ? '🔥' : (isActive ? '🔥' : ''));
        
        if (isActive && streak > 0) {
            streakEl.innerHTML = `<span class="streak-fire">${fireEmoji}</span>${streak}`;
            streakEl.style.color = streak >= 7 ? '#ff4500' : (streak >= 3 ? '#ff6b00' : '#ffaa00');
        } else if (streak > 0) {
            streakEl.innerHTML = `${streak}`;
            streakEl.style.color = '#888'; // Dimmed if streak broken
        } else {
            streakEl.innerHTML = '0';
            streakEl.style.color = '#444';
        }
        
        // Add status label
        const streakLabel = streakCard.querySelector('.stat-label');
        let statusEl = streakCard.querySelector('.streak-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.className = 'streak-status';
            statusEl.style.cssText = 'font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.25rem;';
            streakLabel.after(statusEl);
        }
        
        if (isActive && streak >= 7) {
            statusEl.textContent = '🏆 Epic!';
            statusEl.style.color = '#ff4500';
        } else if (isActive && streak >= 3) {
            statusEl.textContent = 'On fire!';
            statusEl.style.color = '#ff6b00';
        } else if (isActive) {
            statusEl.textContent = 'Active';
            statusEl.style.color = '#ffaa00';
        } else {
            statusEl.textContent = 'Paused';
            statusEl.style.color = '#888';
        }
    }
}

// Calculate agent mood based on activity patterns
function calculateMood(activities) {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    // Count activities in different time windows
    const lastHour = activities.filter(a => new Date(a.timestamp) > oneHourAgo).length;
    const lastFourHours = activities.filter(a => new Date(a.timestamp) > fourHoursAgo).length;
    const lastDay = activities.filter(a => new Date(a.timestamp) > oneDayAgo).length;
    
    // Get activity types in last 4 hours
    const recentTypes = new Set(
        activities
            .filter(a => new Date(a.timestamp) > fourHoursAgo)
            .map(a => a.type)
    );
    
    // Check for specific recent activities
    const recentDecisions = activities.filter(a => 
        a.type === 'decision' && new Date(a.timestamp) > fourHoursAgo
    ).length;
    const recentTrades = activities.filter(a => 
        (a.type === 'trade' || a.type === 'transfer') && new Date(a.timestamp) > fourHoursAgo
    ).length;
    const recentCommits = activities.filter(a => 
        a.type === 'commit' && new Date(a.timestamp) > fourHoursAgo
    ).length;
    
    // Determine mood based on patterns
    let emoji, status, color;
    
    if (lastHour >= 5) {
        // Very high activity - on fire!
        emoji = '🔥';
        status = 'On Fire';
        color = '#ff6b6b';
    } else if (lastHour >= 3) {
        // High activity - energetic
        emoji = '⚡';
        status = 'Energetic';
        color = '#ffaa00';
    } else if (lastFourHours >= 8 && recentTypes.size >= 3) {
        // Diverse activity - focused work
        emoji = '🎯';
        status = 'Focused';
        color = '#00aaff';
    } else if (recentDecisions >= 2) {
        // Making decisions - strategic thinking
        emoji = '🧠';
        status = 'Strategic';
        color = '#aa00ff';
    } else if (recentTrades >= 2) {
        // Trading activity - trading mode
        emoji = '📈';
        status = 'Trading';
        color = '#ff6b6b';
    } else if (recentCommits >= 3) {
        // Lots of commits - building
        emoji = '🛠️';
        status = 'Building';
        color = '#00ffaa';
    } else if (lastFourHours >= 4) {
        // Moderate activity - working
        emoji = '💪';
        status = 'Working';
        color = '#00ffaa';
    } else if (lastFourHours >= 1) {
        // Low recent activity - cruising
        emoji = '🚀';
        status = 'Cruising';
        color = '#00aaff';
    } else if (lastDay >= 10) {
        // No recent but active day - taking a break
        emoji = '☕';
        status = 'Break Time';
        color = '#ffaa00';
    } else if (lastDay >= 1) {
        // Very low activity - resting
        emoji = '😴';
        status = 'Resting';
        color = '#888';
    } else {
        // No activity - sleeping/offline
        emoji = '🌙';
        status = 'Offline';
        color = '#444';
    }
    
    return { emoji, status, color };
}

function updateMood(activities) {
    const mood = calculateMood(activities);
    const moodEl = document.getElementById('mood');
    const moodCard = document.getElementById('mood-card');
    
    if (moodEl) {
        moodEl.textContent = mood.emoji;
        moodEl.style.color = mood.color;
        
        // Add status label below the stat label
        const moodLabel = moodCard.querySelector('.stat-label');
        let statusEl = moodCard.querySelector('.mood-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.className = 'mood-status';
            moodLabel.after(statusEl);
        }
        statusEl.textContent = mood.status;
        statusEl.style.color = mood.color;
    }
}

// ============================================
// VERIFICATION FUNCTIONS
// ============================================
async function verifyHash() {
    const input = document.getElementById('verify-hash-input');
    const resultDiv = document.getElementById('verify-result');
    const hash = input.value.trim();
    
    if (!hash || hash.length < 8) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'verify-result error';
        resultDiv.innerHTML = `
            <h4>❌ Invalid Hash</h4>
            <p>Please enter at least 8 characters of a valid SHA-256 hash.</p>
        `;
        return;
    }
    
    resultDiv.style.display = 'block';
    resultDiv.className = 'verify-result';
    resultDiv.innerHTML = '<p>🔍 Verifying...</p>';
    
    try {
        const response = await fetch(basePath + '/api/verify/' + hash);
        const data = await response.json();
        
        if (!response.ok) {
            resultDiv.className = 'verify-result error';
            resultDiv.innerHTML = `
                <h4>❌ ${data.error || 'Verification Failed'}</h4>
                <p>${data.message || 'Activity not found.'}</p>
                ${data.hint ? `<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem;">${data.hint}</p>` : ''}
            `;
            return;
        }
        
        // Success - show verification details
        resultDiv.className = 'verify-result success';
        const status = data.verification.status === 'on-chain' ? '✅ Verified On-Chain' : '⏳ Pending Signature';
        const statusColor = data.verification.status === 'on-chain' ? 'var(--accent-green)' : 'var(--accent-yellow)';
        
        resultDiv.innerHTML = `
            <h4>${status}</h4>
            <div class="verify-result-grid">
                <span class="verify-result-label">Type:</span>
                <span class="verify-result-value">${data.activity.type}</span>
                
                <span class="verify-result-label">Description:</span>
                <span class="verify-result-value">${escapeHtml(data.activity.description)}</span>
                
                <span class="verify-result-label">Timestamp:</span>
                <span class="verify-result-value">${new Date(data.activity.timestamp).toLocaleString()}</span>
                
                <span class="verify-result-label">Hash (SHA-256):</span>
                <span class="verify-result-value" style="font-family: monospace; font-size: 0.75rem;">${data.proof.hash}</span>
                
                <span class="verify-result-label">Wallet:</span>
                <span class="verify-result-value">
                    <a href="https://solscan.io/account/${data.proof.wallet}" target="_blank">${data.proof.wallet}</a>
                </span>
                
                ${data.verification.solscan ? `
                <span class="verify-result-label">Solscan:</span>
                <span class="verify-result-value">
                    <a href="${data.verification.solscan}" target="_blank">View Transaction ↗</a>
                </span>
                ` : ''}
            </div>
            
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">
                    <strong style="color: ${statusColor};">Verification Steps:</strong>
                </p>
                <ol style="color: var(--text-muted); font-size: 0.8rem; margin-left: 1.5rem;">
                    ${data.verification.instructions.map(i => `<li>${i}</li>`).join('')}
                </ol>
            </div>
        `;
        
        playNotificationSound('decision');
    } catch (err) {
        resultDiv.className = 'verify-result error';
        resultDiv.innerHTML = `
            <h4>❌ Network Error</h4>
            <p>Could not reach the verification API: ${err.message}</p>
        `;
    }
}

function renderRecentHashes(activities) {
    const container = document.getElementById('recent-hashes');
    if (!container) return;
    
    // Get last 15 activities with hashes
    const withHashes = activities.filter(a => a.hash || a.proof?.hash).slice(-15).reverse();
    
    if (!withHashes.length) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 1.5rem; margin: 0;">
                <div class="empty-state-icon" style="font-size: 2rem; margin-bottom: 0.5rem;">🔐</div>
                <h4 style="font-size: 0.95rem;">No Hashes to Verify</h4>
                <p style="font-size: 0.8rem;">Activity hashes will appear here once the agent starts logging work.</p>
            </div>
        `;
        return;
    }
    
    // Muted color palette for verification badges
    const typeColors = {
        browser: '#3498db',
        calendar: '#9b59b6',
        commit: '#c9a227',
        build: '#5a9fd4',
        trade: '#d47a7a',
        decision: '#9b87f5',
        tweet: '#5a9fd4',
        message: '#5abd8c',
        email: '#e67e22',
        heartbeat: '#c47ab8',
        session: '#5ac4b8',
        transfer: '#d47a7a'
    };
    
    container.innerHTML = withHashes.map(a => {
        const hash = a.hash || a.proof?.hash || '';
        const shortHash = hash.substring(0, 16) + '...';
        const color = typeColors[a.type] || '#888';
        
        return `
            <div class="hash-item" onclick="document.getElementById('verify-hash-input').value='${hash}'; verifyHash();">
                <span class="type-badge" style="background: ${color}22; color: ${color};">${a.type}</span>
                <span class="hash-text">${shortHash}</span>
                <span class="hash-desc">${escapeHtml(a.description?.substring(0, 40) || '')}</span>
            </div>
        `;
    }).join('');
}

// ============================================
// ANIMATED NUMBER COUNTER
// ============================================
function animateNumber(element, targetValue, duration = 600, prefix = '', suffix = '', delay = 0) {
    if (!element) return;
    
    const startValue = parseInt(element.dataset.currentValue || '0', 10);
    const target = parseInt(targetValue, 10);
    
    // Skip animation if value unchanged
    if (startValue === target) return;
    
    // Delay animation for staggered effect
    setTimeout(() => {
        element.dataset.currentValue = target;
        
        // If difference is small, just set it with pop
        if (Math.abs(target - startValue) <= 2) {
            element.textContent = prefix + target + suffix;
            element.classList.add('updated');
            setTimeout(() => element.classList.remove('updated'), 400);
            return;
        }
        
        // Add counting pulse animation during count-up
        element.classList.add('counting');
        
        const startTime = performance.now();
        const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
        
        function updateNumber(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);
            
            const currentValue = Math.round(startValue + (target - startValue) * easedProgress);
            element.textContent = prefix + currentValue + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            } else {
                element.textContent = prefix + target + suffix;
                // Remove counting pulse and add final pop
                element.classList.remove('counting');
                element.classList.add('updated');
                setTimeout(() => element.classList.remove('updated'), 400);
            }
        }
        
        requestAnimationFrame(updateNumber);
    }, delay);
}

// Animate decimal numbers (for volume, etc.)
function animateDecimal(element, targetValue, duration = 600, prefix = '', suffix = '', decimals = 2, delay = 0) {
    if (!element) return;
    
    const startValue = parseFloat(element.dataset.currentValue || '0');
    const target = parseFloat(targetValue);
    
    if (Math.abs(startValue - target) < 0.001) return;
    
    setTimeout(() => {
        element.dataset.currentValue = target;
        element.classList.add('counting');
        
        const startTime = performance.now();
        const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
        
        function updateNumber(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);
            
            const currentValue = startValue + (target - startValue) * easedProgress;
            element.textContent = prefix + currentValue.toFixed(decimals) + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            } else {
                element.textContent = prefix + target.toFixed(decimals) + suffix;
                element.classList.remove('counting');
                element.classList.add('updated');
                setTimeout(() => element.classList.remove('updated'), 400);
            }
        }
        
        requestAnimationFrame(updateNumber);
    }, delay);
}

// Widget definitions with HTML generation info
const WIDGET_HTML_MAP = {
    'total-actions': {
        iconClass: 'icon-total',
        valueId: 'total-actions',
        valueClass: '',
        defaultValue: '0',
        label: 'Total Actions'
    },
    'onchain': {
        iconClass: 'icon-chain',
        valueId: 'onchain',
        valueClass: 'chain',
        defaultValue: '0',
        label: 'On-Chain',
        cardId: 'card-onchain'
    },
    'commits': {
        iconClass: 'icon-commits',
        valueId: 'commits',
        valueClass: 'commits',
        defaultValue: '0',
        label: 'Commits'
    },
    'builds': {
        iconClass: 'icon-builds',
        valueId: 'builds',
        valueClass: 'builds',
        defaultValue: '0',
        label: 'Builds'
    },
    'trades': {
        iconClass: 'icon-trades',
        valueId: 'trades',
        valueClass: 'trades',
        defaultValue: '0',
        label: 'Trades'
    },
    'messages': {
        iconClass: 'icon-messages',
        valueId: 'messages',
        valueClass: 'messages',
        defaultValue: '0',
        label: 'Messages'
    },
    'tweets': {
        iconClass: 'icon-tweets',
        valueId: 'tweets',
        valueClass: 'tweets',
        defaultValue: '0',
        label: 'Tweets'
    },
    'uptime': {
        iconClass: 'icon-uptime',
        valueId: 'uptime',
        valueClass: 'uptime',
        defaultValue: '0h',
        label: 'Uptime'
    },
    'volume': {
        iconClass: 'icon-volume',
        valueId: 'volume',
        valueClass: 'volume',
        defaultValue: '$0',
        label: 'Trade Volume'
    },
    'streak': {
        iconClass: 'icon-streak',
        valueId: 'streak',
        valueClass: 'streak',
        defaultValue: '<span class="streak-fire">🔥</span>0',
        label: 'Day Streak',
        cardId: 'streak-card'
    },
    'mood': {
        iconClass: 'icon-mood',
        valueId: 'mood',
        valueClass: 'mood',
        defaultValue: '🤖',
        label: 'Agent Mood',
        cardId: 'mood-card'
    },
    'sol-position': {
        iconClass: 'icon-sol',
        valueId: 'sol-position',
        valueClass: 'sol-position',
        defaultValue: '0 SOL',
        label: 'Net SOL',
        cardId: 'sol-position-card'
    }
};

// Initialize stat cards from skeleton state with entry animations
function initializeStatCards() {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;
    
    // Get widget configuration (order + visibility)
    const config = getWidgetConfig();
    
    // Generate HTML for enabled widgets only, in configured order
    const cardsHtml = config
        .filter(widget => widget.enabled)
        .map(widget => {
            const htmlDef = WIDGET_HTML_MAP[widget.id];
            if (!htmlDef) return '';
            
            const cardIdAttr = htmlDef.cardId ? ` id="${htmlDef.cardId}"` : '';
            const valueClass = htmlDef.valueClass ? ` ${htmlDef.valueClass}` : '';
            
            // Add sparkline container for applicable widgets
            const sparklineHtml = ['total-actions', 'onchain', 'commits', 'builds', 'trades', 'messages', 'tweets'].includes(widget.id)
                ? `<div class="sparkline-container" id="sparkline-${widget.id}" title="7-day trend"></div>`
                : '';
            
            return `
        <div class="stat-card animate-entry"${cardIdAttr} data-widget-id="${widget.id}">
            <div class="stat-icon ${htmlDef.iconClass}">${widget.icon}</div>
            <div class="stat-value${valueClass}" id="${htmlDef.valueId}">${htmlDef.defaultValue}</div>
            ${sparklineHtml}
            <div class="stat-label">${htmlDef.label}</div>
        </div>`;
        })
        .join('');
    
    statsGrid.innerHTML = cardsHtml;
    
    // Remove entry animation class after animations complete to allow hover effects
    setTimeout(() => {
        statsGrid.querySelectorAll('.stat-card.animate-entry').forEach(card => {
            card.classList.remove('animate-entry');
        });
        
        // Initialize drag-and-drop after animations complete
        if (typeof initDashboardDragDrop === 'function') {
            initDashboardDragDrop();
        }
    }, 1200); // Wait for all staggered animations to finish
}

let statsInitialized = false;

function updateStats(activities) {
    // Initialize stat cards on first data load (replaces skeleton)
    if (!statsInitialized) {
        initializeStatCards();
        statsInitialized = true;
    }
    
    // Cache activities for verify tab
    window.cachedActivities = activities;
    window.allActivities = activities;
    
    // Build hourly index for sparklines
    buildHourlyIndex();
    
    // Update judge quick-stats in meta-story
    const judgeCount = document.getElementById('judge-activity-count');
    if (judgeCount) judgeCount.textContent = activities.length;
    
    // Animate stat number updates with staggered delays for cascade effect
    // On first load, delay matches card entry animation (60ms stagger per card)
    const isFirstLoad = !window.statsFirstLoadDone;
    const baseDelay = isFirstLoad ? 300 : 0; // Wait for card entry to start
    const stagger = isFirstLoad ? 60 : 0; // Stagger delay between stats
    window.statsFirstLoadDone = true;
    
    animateNumber(document.getElementById('total-actions'), activities.length, 600, '', '', baseDelay + stagger * 0);
    animateNumber(document.getElementById('onchain'), activities.filter(a => 
        a.signature || a.proof?.txSignature
    ).length, 600, '', '', baseDelay + stagger * 1);
    animateNumber(document.getElementById('commits'), activities.filter(a => a.type === 'commit').length, 600, '', '', baseDelay + stagger * 2);
    animateNumber(document.getElementById('builds'), activities.filter(a => 
        a.type === 'build' || a.type === 'deploy' || a.type === 'decision'
    ).length, 600, '', '', baseDelay + stagger * 3);
    animateNumber(document.getElementById('trades'), activities.filter(a => 
        a.type === 'trade' || a.type === 'transfer'
    ).length, 600, '', '', baseDelay + stagger * 4);
    animateNumber(document.getElementById('messages'), activities.filter(a => 
        a.type === 'message'
    ).length, 600, '', '', baseDelay + stagger * 5);
    animateNumber(document.getElementById('tweets'), activities.filter(a => 
        a.type === 'tweet'
    ).length, 600, '', '', baseDelay + stagger * 6);
    
    // Calculate trade volume (sum of all trade amounts in USD equivalent)
    let totalVolume = 0;
    const SOL_PRICE = 200; // Approximate SOL price for display
    activities.filter(a => a.type === 'trade').forEach(a => {
        const meta = a.metadata || {};
        // Try to extract USD value from trade
        if (meta.from?.token === 'SOL' && meta.from?.amount) {
            totalVolume += meta.from.amount * SOL_PRICE;
        } else if (meta.to?.token === 'SOL' && meta.to?.amount) {
            totalVolume += meta.to.amount * SOL_PRICE;
        } else if (meta.from?.token === 'USDC' && meta.from?.amount) {
            totalVolume += meta.from.amount;
        } else if (meta.to?.token === 'USDC' && meta.to?.amount) {
            totalVolume += meta.to.amount;
        } else if (meta.amount) {
            // Fallback: assume SOL if just amount given
            totalVolume += meta.amount * SOL_PRICE;
        }
    });
    const volumeEl = document.getElementById('volume');
    if (totalVolume >= 1) {
        animateNumber(volumeEl, Math.round(totalVolume), 600, '$');
    } else {
        animateDecimal(volumeEl, totalVolume, 600, '$', '', 2);
    }
    
    // Calculate net SOL position (spent vs earned)
    let netSOL = 0;
    activities.filter(a => a.type === 'trade' || a.type === 'transfer').forEach(a => {
        const meta = a.metadata || {};
        // SOL spent (from SOL trades)
        if (meta.from?.token === 'SOL' && meta.from?.amount) {
            netSOL -= meta.from.amount;
        }
        // SOL received (to SOL trades)
        if (meta.to?.token === 'SOL' && meta.to?.amount) {
            netSOL += meta.to.amount;
        }
        // Handle SOL transfers
        if (meta.token === 'SOL' && meta.amount) {
            if (a.description?.toLowerCase().includes('received') || 
                a.description?.toLowerCase().includes('incoming')) {
                netSOL += meta.amount;
            } else {
                netSOL -= meta.amount;
            }
        }
    });
    
    const solEl = document.getElementById('sol-position');
    if (solEl) {
        const formatted = netSOL >= 0 
            ? `+${netSOL.toFixed(4)}` 
            : netSOL.toFixed(4);
        solEl.textContent = `${formatted} SOL`;
        solEl.classList.remove('negative', 'positive', 'neutral');
        if (netSOL < -0.0001) {
            solEl.classList.add('negative');
        } else if (netSOL > 0.0001) {
            solEl.classList.add('positive');
        } else {
            solEl.classList.add('neutral');
        }
    }
    
    // Update agent mood based on activity patterns
    updateMood(activities);
    
    // Update streak (consecutive days with activity)
    updateStreak(activities);
    
    // Calculate uptime from first activity
    if (activities.length > 0) {
        const sorted = [...activities].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
        const firstActivity = new Date(sorted[0].timestamp);
        const now = new Date();
        const uptimeMs = now - firstActivity;
        const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const uptimeDays = Math.floor(uptimeHours / 24);
        
        if (uptimeDays >= 1) {
            document.getElementById('uptime').textContent = `${uptimeDays}d ${uptimeHours % 24}h`;
        } else {
            document.getElementById('uptime').textContent = `${uptimeHours}h`;
        }
    }
    
    // Render sparkline trend charts for stat cards
    renderSparklines(activities);
}

/**
 * Render sparklines for stat cards showing 7-day activity trends
 * Uses SVG for crisp, lightweight inline charts
 */
function renderSparklines(activities) {
    // Get last 7 days of data
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
    }
    
    // Build daily counts index
    const dailyCounts = new Map();
    days.forEach(d => dailyCounts.set(d, {
        total: 0, onchain: 0, commits: 0, builds: 0, trades: 0, messages: 0, tweets: 0
    }));
    
    activities.forEach(a => {
        const day = a.timestamp.slice(0, 10);
        if (!dailyCounts.has(day)) return;
        
        const dc = dailyCounts.get(day);
        dc.total++;
        if (a.signature || a.proof?.txSignature) dc.onchain++;
        if (a.type === 'commit') dc.commits++;
        if (a.type === 'build' || a.type === 'deploy' || a.type === 'decision') dc.builds++;
        if (a.type === 'trade' || a.type === 'transfer') dc.trades++;
        if (a.type === 'message') dc.messages++;
        if (a.type === 'tweet') dc.tweets++;
    });
    
    // Sparkline configuration per widget
    const sparklineConfig = {
        'total-actions': { key: 'total', color: '#00ffaa' },
        'onchain': { key: 'onchain', color: '#00e5ff' },
        'commits': { key: 'commits', color: '#a78bfa' },
        'builds': { key: 'builds', color: '#fbbf24' },
        'trades': { key: 'trades', color: '#34d399' },
        'messages': { key: 'messages', color: '#60a5fa' },
        'tweets': { key: 'tweets', color: '#f472b6' }
    };
    
    // Theme-specific colors
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const themeColors = {
        light: { 'total-actions': '#059669', onchain: '#0891b2', commits: '#7c3aed', builds: '#d97706', trades: '#059669', messages: '#2563eb', tweets: '#db2777' },
        ocean: { 'total-actions': '#22d3ee', onchain: '#06b6d4', commits: '#818cf8', builds: '#fcd34d', trades: '#4ade80', messages: '#60a5fa', tweets: '#f9a8d4' },
        forest: { 'total-actions': '#4ade80', onchain: '#86efac', commits: '#a3e635', builds: '#fef08a', trades: '#22c55e', messages: '#6ee7b7', tweets: '#bef264' },
        sunset: { 'total-actions': '#fb923c', onchain: '#fbbf24', commits: '#f87171', builds: '#facc15', trades: '#fb7185', messages: '#fdba74', tweets: '#f472b6' },
        cyberpunk: { 'total-actions': '#f0abfc', onchain: '#e879f9', commits: '#c084fc', builds: '#fde047', trades: '#a78bfa', messages: '#818cf8', tweets: '#f472b6' }
    };
    
    // Render each sparkline
    Object.entries(sparklineConfig).forEach(([widgetId, config]) => {
        const container = document.getElementById(`sparkline-${widgetId}`);
        if (!container) return;
        
        // Get data for this sparkline
        const data = days.map(d => dailyCounts.get(d)?.[config.key] || 0);
        const max = Math.max(...data, 1); // At least 1 to avoid division by zero
        
        // Determine color based on theme
        const color = themeColors[theme]?.[widgetId] || config.color;
        
        // Calculate trend (up, down, flat)
        const first3Avg = (data[0] + data[1] + data[2]) / 3;
        const last3Avg = (data[4] + data[5] + data[6]) / 3;
        const trend = last3Avg > first3Avg * 1.1 ? 'up' : last3Avg < first3Avg * 0.9 ? 'down' : 'flat';
        const trendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';
        const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#9ca3af';
        
        // Generate SVG sparkline path
        const width = 60;
        const height = 20;
        const padding = 2;
        const innerWidth = width - padding * 2;
        const innerHeight = height - padding * 2;
        
        const points = data.map((v, i) => {
            const x = padding + (i / (data.length - 1)) * innerWidth;
            const y = padding + innerHeight - (v / max) * innerHeight;
            return `${x},${y}`;
        });
        
        // Create filled area path (for gradient effect)
        const areaPath = `M${points[0]} L${points.join(' L')} L${padding + innerWidth},${height - padding} L${padding},${height - padding} Z`;
        
        // Create line path
        const linePath = `M${points[0]} L${points.join(' L')}`;
        
        // Generate SVG
        container.innerHTML = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg" aria-label="7-day trend: ${data.join(', ')}">
                <defs>
                    <linearGradient id="sparkline-grad-${widgetId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:0.3"/>
                        <stop offset="100%" style="stop-color:${color};stop-opacity:0"/>
                    </linearGradient>
                </defs>
                <path d="${areaPath}" fill="url(#sparkline-grad-${widgetId})" />
                <path d="${linePath}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                ${data.map((v, i) => {
                    const x = padding + (i / (data.length - 1)) * innerWidth;
                    const y = padding + innerHeight - (v / max) * innerHeight;
                    return `<circle cx="${x}" cy="${y}" r="2" fill="${color}" class="sparkline-dot" data-day="${days[i]}" data-value="${v}" />`;
                }).join('')}
            </svg>
            <span class="sparkline-trend" style="color: ${trendColor}">${trendIcon}</span>
        `;
        
        // Update tooltip with summary
        container.title = `7-day trend: ${data.join(' → ')} (${trend === 'up' ? 'trending up' : trend === 'down' ? 'trending down' : 'stable'})`;
    });
}

// Chart instances
let timelineChart = null;
let breakdownChart = null;
let cumulativeChart = null;
let dailyChart = null;

// Mobile-responsive chart configuration
function isMobile() {
    return window.innerWidth <= 600;
}

function getChartFontSize(base) {
    return isMobile() ? Math.max(base + 1, 11) : base;
}

function getMobileChartOptions() {
    const mobile = isMobile();
    return {
        tickFont: { size: mobile ? 11 : 10 },
        legendFont: { size: mobile ? 11 : 11 },
        maxTicksLimit: mobile ? 4 : 8,
        pointRadius: mobile ? 4 : 3,
        pointHoverRadius: mobile ? 7 : 5,
        legendPosition: mobile ? 'bottom' : 'right',
        axisTitleDisplay: !mobile
    };
}

function renderCharts(activities) {
    // Hide all chart loading states and update ARIA
    const hideLoading = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            // Set aria-busy=false on parent chart container
            const chartCard = el.closest('.chart-card');
            if (chartCard) chartCard.setAttribute('aria-busy', 'false');
        }
    };
    
    // Add ARIA labels to chart canvases for screen readers
    const setChartAccessibility = (canvasId, label, description) => {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', label);
            canvas.setAttribute('aria-describedby', `${canvasId}-desc`);
            // Add hidden description if not exists
            if (!document.getElementById(`${canvasId}-desc`)) {
                const desc = document.createElement('span');
                desc.id = `${canvasId}-desc`;
                desc.className = 'sr-only';
                desc.textContent = description;
                canvas.parentNode.appendChild(desc);
            }
        }
    };
    
    // Activity over time (by hour)
    const hourCounts = {};
    // Muted color palette for charts - one accent shade per type
    const typeColors = {
        'browser': '#3498db',    // bright blue
        'calendar': '#9b59b6',   // muted purple
        'commit': '#c9a227',     // muted gold
        'build': '#5a9fd4',      // muted blue
        'decision': '#d45a84',   // muted rose
        'deploy': '#5a9fd4',     // muted blue
        'trade': '#d47a7a',      // muted coral
        'transfer': '#d47a7a',   // muted coral
        'email': '#e67e22',      // muted orange
        'heartbeat': '#c47ab8',  // muted magenta
        'session': '#5ac4b8',    // muted teal
        'message': '#5abd8c',    // muted green
        'tweet': '#5a9fd4'       // muted blue
    };
    
    activities.forEach(a => {
        const date = new Date(a.timestamp);
        // Round to nearest hour
        date.setMinutes(0, 0, 0);
        const key = date.toISOString();
        hourCounts[key] = (hourCounts[key] || 0) + 1;
    });

    // Sort by time
    const sortedHours = Object.keys(hourCounts).sort();
    const labels = sortedHours.map(h => {
        const d = new Date(h);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' });
    });
    const data = sortedHours.map(h => hourCounts[h]);

    // Timeline Chart
    const timelineCtx = document.getElementById('timelineChart').getContext('2d');
    
    if (timelineChart) {
        timelineChart.destroy();
    }

    const mobileOpts = getMobileChartOptions();
    
    timelineChart = new Chart(timelineCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Activities',
                data: data,
                borderColor: '#4ecdc4',
                backgroundColor: 'rgba(78, 205, 196, 0.08)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4ecdc4',
                pointBorderColor: '#4ecdc4',
                pointRadius: mobileOpts.pointRadius,
                pointHoverRadius: mobileOpts.pointHoverRadius
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#6b6b6b',
                        stepSize: 1,
                        font: mobileOpts.tickFont,
                        maxTicksLimit: mobileOpts.maxTicksLimit
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)'
                    }
                },
                x: {
                    ticks: {
                        color: '#6b6b6b',
                        maxRotation: isMobile() ? 60 : 45,
                        font: mobileOpts.tickFont,
                        maxTicksLimit: mobileOpts.maxTicksLimit
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    hideLoading('timeline-loading');
    setChartAccessibility('timelineChart', 
        `Activity over time chart showing ${activities.length} total activities`,
        'Line chart displaying agent activity frequency over time by hour');

    // Activity breakdown by type
    const typeCounts = {};
    activities.forEach(a => {
        const type = a.type || 'other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const breakdownLabels = Object.keys(typeCounts);
    const breakdownData = Object.values(typeCounts);
    // Muted color palette for doughnut chart
    const mutedTypeColors = {
        'commit': '#c9a227',     // muted gold
        'build': '#5a9fd4',      // muted blue
        'decision': '#d45a84',   // muted pink
        'deploy': '#5a9fd4',     // muted blue
        'trade': '#d47a7a',      // muted coral
        'transfer': '#d47a7a',   // muted coral
        'heartbeat': '#c47ab8',  // muted pink
        'session': '#5ac4b8',    // muted teal
        'message': '#5abd8c',    // muted green
        'tweet': '#5a9fd4'       // muted blue
    };
    const breakdownColors = breakdownLabels.map(t => mutedTypeColors[t] || '#5abd8c');

    const breakdownCtx = document.getElementById('breakdownChart').getContext('2d');
    
    if (breakdownChart) {
        breakdownChart.destroy();
    }

    breakdownChart = new Chart(breakdownCtx, {
        type: 'doughnut',
        data: {
            labels: breakdownLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
            datasets: [{
                data: breakdownData,
                backgroundColor: breakdownColors,
                borderColor: '#0d0d12',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: mobileOpts.legendPosition,
                    labels: {
                        color: '#888',
                        padding: isMobile() ? 8 : 10,
                        font: mobileOpts.legendFont,
                        boxWidth: isMobile() ? 12 : 40
                    }
                }
            }
        }
    });
    hideLoading('breakdown-loading');
    setChartAccessibility('breakdownChart',
        `Activity breakdown: ${breakdownLabels.map((l, i) => `${l}: ${breakdownData[i]}`).join(', ')}`,
        'Doughnut chart showing distribution of activity types');

    // Cumulative on-chain proofs over time
    const onChainActivities = activities
        .filter(a => a.signature || a.proof?.txSignature)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const cumulativeLabels = [];
    const cumulativeData = [];
    let cumulative = 0;
    
    onChainActivities.forEach((a, i) => {
        cumulative++;
        const date = new Date(a.timestamp);
        cumulativeLabels.push(date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric'
        }));
        cumulativeData.push(cumulative);
    });

    const cumulativeCtx = document.getElementById('cumulativeChart').getContext('2d');
    
    if (cumulativeChart) {
        cumulativeChart.destroy();
    }

    cumulativeChart = new Chart(cumulativeCtx, {
        type: 'line',
        data: {
            labels: cumulativeLabels,
            datasets: [{
                label: 'On-Chain Proofs',
                data: cumulativeData,
                borderColor: '#9b87f5',
                backgroundColor: 'rgba(155, 135, 245, 0.08)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#9b87f5',
                pointBorderColor: '#9b87f5',
                pointRadius: mobileOpts.pointRadius,
                pointHoverRadius: mobileOpts.pointHoverRadius,
                stepped: 'after'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.raw} proofs on-chain`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#6b6b6b',
                        stepSize: isMobile() ? 5 : 2,
                        font: mobileOpts.tickFont,
                        maxTicksLimit: mobileOpts.maxTicksLimit
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)'
                    },
                    title: {
                        display: mobileOpts.axisTitleDisplay,
                        text: 'Total Proofs',
                        color: '#6b6b6b'
                    }
                },
                x: {
                    ticks: {
                        color: '#6b6b6b',
                        maxRotation: isMobile() ? 60 : 45,
                        font: mobileOpts.tickFont,
                        maxTicksLimit: mobileOpts.maxTicksLimit
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    hideLoading('cumulative-loading');
    setChartAccessibility('cumulativeChart',
        `Cumulative on-chain proofs: ${cumulative} total proofs on Solana blockchain`,
        'Area chart showing cumulative growth of cryptographically signed on-chain proofs over time');

    // Daily activity breakdown (stacked bar chart)
    const dailyCounts = {};
    const allTypes = ['commit', 'build', 'decision', 'deploy', 'trade', 'transfer', 'heartbeat', 'session', 'message', 'tweet'];
    
    activities.forEach(a => {
        const date = new Date(a.timestamp);
        const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const type = a.type || 'other';
        
        if (!dailyCounts[dayKey]) {
            dailyCounts[dayKey] = {};
            allTypes.forEach(t => dailyCounts[dayKey][t] = 0);
            dailyCounts[dayKey]['other'] = 0;
        }
        
        if (allTypes.includes(type)) {
            dailyCounts[dayKey][type]++;
        } else {
            dailyCounts[dayKey]['other']++;
        }
    });

    const sortedDays = Object.keys(dailyCounts).sort();
    const dailyLabels = sortedDays.map(d => {
        const date = new Date(d + 'T12:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });

    // Create datasets for each activity type (only include types with data)
    const dailyDatasets = [];
    const displayTypes = allTypes.concat(['other']);
    
    displayTypes.forEach(type => {
        const hasData = sortedDays.some(day => dailyCounts[day][type] > 0);
        if (hasData) {
            dailyDatasets.push({
                label: type.charAt(0).toUpperCase() + type.slice(1),
                data: sortedDays.map(day => dailyCounts[day][type] || 0),
                backgroundColor: typeColors[type] || '#00ffaa',
                borderColor: 'rgba(0,0,0,0.3)',
                borderWidth: 1
            });
        }
    });

    const dailyCtx = document.getElementById('dailyChart').getContext('2d');
    
    if (dailyChart) {
        dailyChart.destroy();
    }

    dailyChart = new Chart(dailyCtx, {
        type: 'bar',
        data: {
            labels: dailyLabels,
            datasets: dailyDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#6b6b6b',
                        padding: isMobile() ? 8 : 15,
                        font: mobileOpts.legendFont,
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        boxWidth: isMobile() ? 10 : 40
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: (items) => items[0]?.label || '',
                        footer: (items) => {
                            const total = items.reduce((sum, item) => sum + item.raw, 0);
                            return `Total: ${total} actions`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    ticks: {
                        color: '#6b6b6b',
                        stepSize: isMobile() ? 10 : 5,
                        font: mobileOpts.tickFont,
                        maxTicksLimit: mobileOpts.maxTicksLimit
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)'
                    },
                    title: {
                        display: mobileOpts.axisTitleDisplay,
                        text: 'Actions',
                        color: '#6b6b6b'
                    }
                },
                x: {
                    stacked: true,
                    ticks: {
                        color: '#6b6b6b',
                        font: mobileOpts.tickFont,
                        maxTicksLimit: isMobile() ? 5 : 10
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    hideLoading('daily-loading');
    const totalDays = Object.keys(dailyCounts).length;
    setChartAccessibility('dailyChart',
        `Daily activity chart showing activity across ${totalDays} days`,
        'Stacked bar chart showing daily breakdown of activities by type');
}

// Render GitHub-style activity heatmap
function renderHeatmap(activities) {
    const grid = document.getElementById('heatmapGrid');
    const monthsContainer = document.getElementById('heatmapMonths');
    if (!grid || !monthsContainer) return;
    
    // Hide loading state and update ARIA
    const heatmapLoading = document.getElementById('heatmap-loading');
    if (heatmapLoading) heatmapLoading.style.display = 'none';
    const heatmapCard = document.getElementById('heatmap-chart-card');
    if (heatmapCard) heatmapCard.setAttribute('aria-busy', 'false');
    
    // Count activities per day
    const dayCounts = {};
    activities.forEach(a => {
        const date = new Date(a.timestamp);
        const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    });
    
    // Determine date range (show last 16 weeks ~ 4 months)
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday
    
    const weeksToShow = 16;
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (weeksToShow * 7) + 1);
    
    // Find max count for scaling
    const maxCount = Math.max(1, ...Object.values(dayCounts));
    
    // Generate cells
    grid.innerHTML = '';
    const cells = [];
    const currentDate = new Date(startDate);
    const monthLabels = new Map();
    
    while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().split('T')[0];
        const count = dayCounts[dayKey] || 0;
        const isFuture = currentDate > today;
        
        // Determine level (0-4)
        let level = 0;
        if (count > 0) {
            if (count >= maxCount * 0.75) level = 4;
            else if (count >= maxCount * 0.5) level = 3;
            else if (count >= maxCount * 0.25) level = 2;
            else level = 1;
        }
        
        // Track month labels (first day of week with new month)
        const weekNum = Math.floor((currentDate - startDate) / (7 * 24 * 60 * 60 * 1000));
        if (currentDate.getDay() === 0) { // Sunday (first of week in our grid)
            const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
            if (!monthLabels.has(monthName) || monthLabels.get(monthName).week > weekNum) {
                monthLabels.set(monthName, { week: weekNum, date: new Date(currentDate) });
            }
        }
        
        const cell = document.createElement('div');
        cell.className = `heatmap-cell level-${level}${isFuture ? ' future' : ''}`;
        cell.dataset.date = dayKey;
        cell.dataset.count = count;
        const dateLabel = currentDate.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        cell.title = `${dateLabel}: ${count} action${count !== 1 ? 's' : ''}`;
        // Accessibility: make cells focusable and announce content
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `${dateLabel}: ${count} ${count === 1 ? 'activity' : 'activities'}`);
        
        // Tooltip on hover
        cell.addEventListener('mouseenter', showHeatmapTooltip);
        cell.addEventListener('mouseleave', hideHeatmapTooltip);
        
        grid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Render month labels
    const sortedMonths = [...monthLabels.entries()].sort((a, b) => a[1].week - b[1].week);
    monthsContainer.innerHTML = '';
    
    let lastWeek = -1;
    sortedMonths.forEach(([month, { week }], idx) => {
        if (idx > 0) {
            // Add spacer for weeks without label
            const spacer = document.createElement('div');
            spacer.className = 'heatmap-month';
            spacer.style.flex = `${week - lastWeek - 1}`;
            if (week - lastWeek > 1) monthsContainer.appendChild(spacer);
        }
        
        const label = document.createElement('div');
        label.className = 'heatmap-month';
        label.textContent = month;
        label.style.flex = '1';
        monthsContainer.appendChild(label);
        
        lastWeek = week;
    });
}

// Heatmap tooltip
let heatmapTooltip = null;

function showHeatmapTooltip(e) {
    const cell = e.target;
    const date = cell.dataset.date;
    const count = parseInt(cell.dataset.count, 10);
    
    if (!heatmapTooltip) {
        heatmapTooltip = document.createElement('div');
        heatmapTooltip.className = 'heatmap-tooltip';
        document.body.appendChild(heatmapTooltip);
    }
    
    const dateObj = new Date(date + 'T12:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    
    heatmapTooltip.innerHTML = `<strong>${count}</strong> action${count !== 1 ? 's' : ''} on ${formattedDate}`;
    heatmapTooltip.style.display = 'block';
    
    // Position tooltip above the cell
    const rect = cell.getBoundingClientRect();
    heatmapTooltip.style.left = `${rect.left + rect.width / 2 - heatmapTooltip.offsetWidth / 2}px`;
    heatmapTooltip.style.top = `${rect.top - heatmapTooltip.offsetHeight - 8}px`;
}

function hideHeatmapTooltip() {
    if (heatmapTooltip) {
        heatmapTooltip.style.display = 'none';
    }
}

// ============================================
// ACHIEVEMENT BADGES
// ============================================

let achievementsData = null;
let achievementsFilter = 'all';

/**
 * Load and render achievement badges from the API
 * Fetches earned status, progress, and tier information
 */
async function loadAchievements() {
    try {
        const res = await fetch(basePath + '/api/achievements');
        if (!res.ok) throw new Error('Failed to load achievements');
        achievementsData = await res.json();
        renderAchievements();
    } catch (e) {
        console.error('Error loading achievements:', e);
        const loading = document.getElementById('achievements-loading');
        if (loading) {
            loading.innerHTML = '<span class="loading-text">Unable to load achievements</span>';
        }
    }
}

/**
 * Render achievement badges based on loaded data and current filter
 */
function renderAchievements() {
    if (!achievementsData) return;
    
    // Hide loading state
    const loading = document.getElementById('achievements-loading');
    if (loading) loading.style.display = 'none';
    const panel = document.getElementById('achievements-panel');
    if (panel) panel.setAttribute('aria-busy', 'false');
    
    const { summary, nextToUnlock, byCategory, allBadges } = achievementsData;
    
    // Update summary
    document.getElementById('rankEmoji').textContent = summary.rankEmoji;
    document.getElementById('rankName').textContent = summary.rank;
    document.getElementById('achievementsEarned').textContent = summary.earnedBadges;
    document.getElementById('achievementsTotal').textContent = summary.totalBadges;
    document.getElementById('achievementsPoints').textContent = summary.totalPoints;
    document.getElementById('achievementsProgressFill').style.width = summary.completionPercent + '%';
    
    // Render next to unlock
    const nextContainer = document.getElementById('nextBadges');
    if (nextToUnlock && nextToUnlock.length > 0) {
        nextContainer.innerHTML = nextToUnlock.map(badge => `
            <div class="next-badge">
                <div class="next-badge-emoji">${badge.emoji}</div>
                <div class="next-badge-info">
                    <div class="next-badge-name">${badge.name}</div>
                    <div class="next-badge-progress">
                        <div class="next-badge-bar">
                            <div class="next-badge-bar-fill" style="width: ${badge.progress}%"></div>
                        </div>
                        <span class="next-badge-percent">${badge.progress}%</span>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        nextContainer.innerHTML = '<div class="next-badge"><span>All badges unlocked! 🎉</span></div>';
    }
    
    // Render badges grid based on filter
    const grid = document.getElementById('achievementsGrid');
    let badges = allBadges;
    
    if (achievementsFilter !== 'all') {
        badges = byCategory[achievementsFilter] || [];
    }
    
    // Sort: earned first, then by progress descending
    badges = [...badges].sort((a, b) => {
        if (a.earned !== b.earned) return b.earned ? 1 : -1;
        return b.progress - a.progress;
    });
    
    if (badges.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No badges in this category</p></div>';
        return;
    }
    
    grid.innerHTML = badges.map(badge => `
        <div class="achievement-badge ${badge.earned ? 'earned' : ''}" data-badge-id="${badge.id}">
            ${badge.earned ? '<div class="badge-earned-check">✓</div>' : ''}
            <div class="badge-emoji">${badge.emoji}</div>
            <div class="badge-content">
                <div class="badge-header">
                    <span class="badge-name">${badge.name}</span>
                    ${badge.tier ? `<span class="badge-tier ${badge.tier}">${badge.tier}</span>` : ''}
                </div>
                <div class="badge-description">${badge.description}</div>
                <div class="badge-progress">
                    <div class="badge-progress-bar">
                        <div class="badge-progress-fill" style="width: ${badge.progress}%"></div>
                    </div>
                    <span class="badge-progress-text">${badge.earned ? '✓' : badge.progress + '%'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Filter achievements by category
 * @param {string} category - Category to filter by ('all', 'activity', 'streak', 'onchain', 'diversity', 'special')
 */
function filterAchievements(category) {
    achievementsFilter = category;
    
    // Update active button
    document.querySelectorAll('.achievement-category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    renderAchievements();
}

// ============================================
// ACTIVITY VELOCITY CHART
// ============================================

let velocityChart = null;

/**
 * Render activity velocity chart - shows rolling average of actions per hour over time
 * This visualizes productivity momentum and identifies high/low activity periods
 */
function renderVelocityChart(activities) {
    if (!activities || activities.length === 0) return;
    
    // Hide loading state
    const loadingEl = document.getElementById('velocity-loading');
    if (loadingEl) loadingEl.style.display = 'none';
    const chartCard = document.getElementById('velocity-chart-card');
    if (chartCard) chartCard.setAttribute('aria-busy', 'false');
    
    // Sort activities by timestamp
    const sorted = [...activities].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    if (sorted.length < 2) return;
    
    // Get time range
    const firstTime = new Date(sorted[0].timestamp);
    const lastTime = new Date(sorted[sorted.length - 1].timestamp);
    
    // Create 4-hour rolling window data points
    // Sample at each hour, calculate activities in the past 4 hours
    const windowSizeMs = 4 * 60 * 60 * 1000; // 4 hours
    const sampleIntervalMs = 60 * 60 * 1000; // 1 hour
    
    const dataPoints = [];
    const labels = [];
    
    // Start from 4 hours after first activity to have meaningful data
    let currentTime = new Date(firstTime.getTime() + windowSizeMs);
    
    while (currentTime <= lastTime) {
        const windowStart = new Date(currentTime.getTime() - windowSizeMs);
        
        // Count activities in this window
        const activitiesInWindow = sorted.filter(a => {
            const t = new Date(a.timestamp);
            return t >= windowStart && t <= currentTime;
        }).length;
        
        // Calculate velocity (activities per hour over 4-hour window)
        const velocity = activitiesInWindow / 4;
        
        dataPoints.push(velocity);
        labels.push(currentTime.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric'
        }));
        
        currentTime = new Date(currentTime.getTime() + sampleIntervalMs);
    }
    
    // Calculate stats
    const maxVelocity = Math.max(...dataPoints);
    const avgVelocity = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
    const currentVelocity = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1] : 0;
    
    // Update velocity stats in UI
    const currentEl = document.getElementById('currentVelocity');
    const peakEl = document.getElementById('peakVelocity');
    const avgEl = document.getElementById('avgVelocity');
    
    if (currentEl) {
        currentEl.textContent = currentVelocity.toFixed(1);
        currentEl.classList.add('current');
    }
    if (peakEl) {
        peakEl.textContent = maxVelocity.toFixed(1);
        peakEl.classList.add('peak');
    }
    if (avgEl) {
        avgEl.textContent = avgVelocity.toFixed(1);
    }
    
    // Get mobile options
    const mobileOpts = getMobileChartOptions();
    
    // Render Chart.js velocity chart
    const ctx = document.getElementById('velocityChart');
    if (!ctx) return;
    
    if (velocityChart) {
        velocityChart.destroy();
    }
    
    // Create gradient fill
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(78, 205, 196, 0.3)');
    gradient.addColorStop(1, 'rgba(78, 205, 196, 0.02)');
    
    velocityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Activity Velocity',
                data: dataPoints,
                borderColor: '#4ecdc4',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: (ctx) => {
                    // Highlight peak point
                    return ctx.raw === maxVelocity ? '#ffaa00' : '#4ecdc4';
                },
                pointBorderColor: (ctx) => {
                    return ctx.raw === maxVelocity ? '#ffaa00' : '#4ecdc4';
                },
                pointRadius: (ctx) => {
                    // Larger point for peak
                    return ctx.raw === maxVelocity ? 6 : mobileOpts.pointRadius;
                },
                pointHoverRadius: mobileOpts.pointHoverRadius,
                borderWidth: 2
            }, {
                label: 'Average',
                data: dataPoints.map(() => avgVelocity),
                borderColor: 'rgba(155, 135, 245, 0.5)',
                borderDash: [5, 5],
                borderWidth: 1,
                pointRadius: 0,
                pointHoverRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            if (ctx.datasetIndex === 0) {
                                return `${ctx.raw.toFixed(2)} actions/hour`;
                            }
                            return `Avg: ${avgVelocity.toFixed(2)} actions/hour`;
                        },
                        afterLabel: (ctx) => {
                            if (ctx.datasetIndex === 0 && ctx.raw === maxVelocity) {
                                return '⚡ Peak velocity!';
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#6b6b6b',
                        font: mobileOpts.tickFont,
                        maxTicksLimit: 5,
                        callback: (value) => value.toFixed(1)
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)'
                    },
                    title: {
                        display: !isMobile(),
                        text: 'Actions/Hour',
                        color: '#6b6b6b',
                        font: { size: 10 }
                    }
                },
                x: {
                    ticks: {
                        color: '#6b6b6b',
                        maxRotation: isMobile() ? 60 : 45,
                        font: mobileOpts.tickFont,
                        maxTicksLimit: mobileOpts.maxTicksLimit
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Set accessibility
    ctx.setAttribute('role', 'img');
    ctx.setAttribute('aria-label', 
        `Activity velocity chart showing productivity rate. Current: ${currentVelocity.toFixed(1)}, Peak: ${maxVelocity.toFixed(1)}, Average: ${avgVelocity.toFixed(1)} actions per hour`
    );
}

// ============================================
// PRODUCTIVITY CLOCK (Hour Distribution)
// ============================================

let productivityClockChart = null;

/**
 * Render Productivity Clock - a polar area chart showing activity distribution
 * across 24 hours of the day. Helps visualize when the agent is most active.
 */
function renderProductivityClock(activities) {
    if (!activities || activities.length === 0) return;
    
    // Hide loading state
    const loadingEl = document.getElementById('productivity-clock-loading');
    if (loadingEl) loadingEl.style.display = 'none';
    const chartCard = document.getElementById('productivity-clock-card');
    if (chartCard) chartCard.setAttribute('aria-busy', 'false');
    
    // Calculate hourly distribution
    const hourlyCount = new Array(24).fill(0);
    activities.forEach(a => {
        const hour = new Date(a.timestamp).getHours();
        hourlyCount[hour]++;
    });
    
    // Generate labels (12am, 1am, ..., 11pm)
    const labels = [];
    for (let h = 0; h < 24; h++) {
        if (h === 0) labels.push('12am');
        else if (h === 12) labels.push('12pm');
        else if (h < 12) labels.push(`${h}am`);
        else labels.push(`${h - 12}pm`);
    }
    
    // Calculate stats
    const maxHour = hourlyCount.indexOf(Math.max(...hourlyCount));
    const minHour = hourlyCount.indexOf(Math.min(...hourlyCount.filter(c => c >= 0)));
    
    // Calculate day vs night activity
    const dayActivity = hourlyCount.slice(6, 18).reduce((a, b) => a + b, 0);
    const nightActivity = [...hourlyCount.slice(0, 6), ...hourlyCount.slice(18)].reduce((a, b) => a + b, 0);
    const totalActivity = dayActivity + nightActivity;
    
    const dayPct = totalActivity > 0 ? Math.round((dayActivity / totalActivity) * 100) : 0;
    const nightPct = totalActivity > 0 ? Math.round((nightActivity / totalActivity) * 100) : 0;
    
    // Update stats display
    const peakHourEl = document.getElementById('peakHour');
    const quietHourEl = document.getElementById('quietHour');
    const dayPctEl = document.getElementById('dayActivityPct');
    const nightPctEl = document.getElementById('nightActivityPct');
    
    if (peakHourEl) {
        peakHourEl.textContent = labels[maxHour];
        peakHourEl.classList.add('peak');
    }
    if (quietHourEl) {
        quietHourEl.textContent = labels[minHour];
        quietHourEl.classList.add('quiet');
    }
    if (dayPctEl) dayPctEl.textContent = `${dayPct}%`;
    if (nightPctEl) nightPctEl.textContent = `${nightPct}%`;
    
    // Generate colors - gradient from midnight blue through day colors
    const colors = hourlyCount.map((_, h) => {
        // Color intensity based on time of day
        if (h >= 6 && h < 12) {
            // Morning: warm oranges/yellows
            return `rgba(251, 191, 36, ${0.4 + (hourlyCount[h] / Math.max(...hourlyCount)) * 0.6})`;
        } else if (h >= 12 && h < 18) {
            // Afternoon: bright greens/teals
            return `rgba(52, 211, 153, ${0.4 + (hourlyCount[h] / Math.max(...hourlyCount)) * 0.6})`;
        } else if (h >= 18 && h < 22) {
            // Evening: purples
            return `rgba(167, 139, 250, ${0.4 + (hourlyCount[h] / Math.max(...hourlyCount)) * 0.6})`;
        } else {
            // Night: blues
            return `rgba(96, 165, 250, ${0.4 + (hourlyCount[h] / Math.max(...hourlyCount)) * 0.6})`;
        }
    });
    
    // Get theme colors
    const getThemeAccent = () => {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const accents = {
            dark: '#00ffaa',
            light: '#10b981',
            ocean: '#38bdf8',
            forest: '#22c55e',
            sunset: '#f97316',
            cyberpunk: '#d946ef'
        };
        return accents[theme] || accents.dark;
    };
    
    // Render Chart.js polar area chart
    const ctx = document.getElementById('productivityClockChart');
    if (!ctx) return;
    
    if (productivityClockChart) {
        productivityClockChart.destroy();
    }
    
    productivityClockChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: labels,
            datasets: [{
                label: 'Activities',
                data: hourlyCount,
                backgroundColor: colors,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const count = ctx.raw;
                            const pct = totalActivity > 0 ? Math.round((count / totalActivity) * 100) : 0;
                            return `${count} activities (${pct}%)`;
                        },
                        afterLabel: (ctx) => {
                            const idx = ctx.dataIndex;
                            if (idx === maxHour) return '🌟 Most active hour';
                            if (hourlyCount[idx] === 0) return '💤 No activity';
                            return '';
                        }
                    }
                }
            },
            scales: {
                r: {
                    ticks: {
                        display: false
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    pointLabels: {
                        color: '#6b6b6b',
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
    
    // Set accessibility
    ctx.setAttribute('role', 'img');
    ctx.setAttribute('aria-label', 
        `Productivity clock showing activity by hour. Peak hour: ${labels[maxHour]} with ${hourlyCount[maxHour]} activities. Day activity: ${dayPct}%, Night activity: ${nightPct}%`
    );
}

// ============================================
// ACTIVITY INSIGHTS PANEL
// ============================================

function renderInsights(activities) {
    if (!activities || activities.length === 0) return;
    
    // Calculate hourly distribution
    const hourlyCount = new Array(24).fill(0);
    activities.forEach(a => {
        const hour = new Date(a.timestamp).getHours();
        hourlyCount[hour]++;
    });
    
    // Find peak hours (top 3)
    const hourlyWithIndex = hourlyCount.map((count, hour) => ({ hour, count }));
    hourlyWithIndex.sort((a, b) => b.count - a.count);
    const peakHours = hourlyWithIndex.slice(0, 3).filter(h => h.count > 0);
    
    // Format peak hours
    const formatHour = h => {
        if (h === 0) return '12am';
        if (h === 12) return '12pm';
        return h < 12 ? `${h}am` : `${h - 12}pm`;
    };
    const peakHoursStr = peakHours.map(h => formatHour(h.hour)).join(', ');
    document.getElementById('insightPeakHours').textContent = peakHoursStr || 'N/A';
    const peakCountEl = document.getElementById('insightPeakHoursDetail');
    if (peakHours.length > 0) {
        // Animate the peak count
        peakCountEl.innerHTML = '<span id="peakCountNum">0</span> activities at peak';
        animateNumber(document.getElementById('peakCountNum'), peakHours[0].count, 600);
    } else {
        peakCountEl.textContent = '';
    }
    
    // Calculate day of week distribution
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCount = new Array(7).fill(0);
    activities.forEach(a => {
        const day = new Date(a.timestamp).getDay();
        dayCount[day]++;
    });
    
    const peakDayIndex = dayCount.indexOf(Math.max(...dayCount));
    document.getElementById('insightPeakDay').textContent = dayNames[peakDayIndex];
    const peakDayDetail = document.getElementById('insightPeakDayDetail');
    peakDayDetail.innerHTML = '<span id="peakDayNum">0</span> total activities';
    animateNumber(document.getElementById('peakDayNum'), dayCount[peakDayIndex], 600);
    
    // Calculate daily average
    const uniqueDays = new Set();
    activities.forEach(a => {
        uniqueDays.add(new Date(a.timestamp).toDateString());
    });
    const avgDailyNum = uniqueDays.size > 0 ? (activities.length / uniqueDays.size) : 0;
    const avgDailyEl = document.getElementById('insightAvgDaily');
    avgDailyEl.classList.add('updated');
    setTimeout(() => avgDailyEl.classList.remove('updated'), 600);
    animateDecimal(avgDailyEl, avgDailyNum, 800, '', '/day', 1);
    const avgDailyDetail = document.getElementById('insightAvgDailyDetail');
    avgDailyDetail.innerHTML = 'Across <span id="avgActiveDays">0</span> active days';
    animateNumber(document.getElementById('avgActiveDays'), uniqueDays.size, 600);
    
    // Calculate top activity type
    const typeCounts = {};
    activities.forEach(a => {
        const type = a.type || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    const typeEmoji = {
        'build': '🔨', 'commit': '📝', 'trade': '💹', 'message': '💬',
        'email': '📧', 'tweet': '🐦', 'decision': '🧠', 'heartbeat': '💓',
        'calendar': '📅', 'browser': '🌐'
    };
    const emoji = typeEmoji[topType?.[0]] || '📊';
    document.getElementById('insightTopType').textContent = topType ? `${emoji} ${topType[0]}` : 'N/A';
    const topTypeDetail = document.getElementById('insightTopTypeDetail');
    if (topType) {
        const topTypePercent = Math.round(topType[1] / activities.length * 100);
        topTypeDetail.innerHTML = '<span id="topTypeNum">0</span> activities (<span id="topTypePercent">0</span>%)';
        animateNumber(document.getElementById('topTypeNum'), topType[1], 600);
        animateNumber(document.getElementById('topTypePercent'), topTypePercent, 600);
    } else {
        topTypeDetail.textContent = '';
    }
    
    // Calculate productivity score (based on variety and consistency)
    const typeVariety = Object.keys(typeCounts).length;
    const dayVariety = uniqueDays.size;
    const onChainCount = activities.filter(a => a.signature).length;
    const onChainRate = activities.length > 0 ? onChainCount / activities.length : 0;
    
    // Score: variety of types (max 30) + active days (max 30) + on-chain rate (max 40)
    const varietyScore = Math.min(typeVariety / 8, 1) * 30;
    const consistencyScore = Math.min(dayVariety / 30, 1) * 30;
    const onChainScore = onChainRate * 40;
    const productivityScore = Math.round(varietyScore + consistencyScore + onChainScore);
    
    // Animate productivity score count-up with glow effect
    const productivityEl = document.getElementById('insightProductivity');
    productivityEl.classList.add('updated');
    setTimeout(() => productivityEl.classList.remove('updated'), 600);
    animateNumber(productivityEl, productivityScore, 800, '', '/100');
    
    // Animate progress bar from 0 (CSS transition handles the animation)
    const progressBar = document.getElementById('insightProductivityBar');
    progressBar.style.width = '0%';
    setTimeout(() => {
        progressBar.style.width = `${productivityScore}%`;
    }, 50);
    
    // On-chain rate with animated percentage and glow
    const onChainPercent = (onChainRate * 100);
    const onChainEl = document.getElementById('insightOnchainRate');
    onChainEl.classList.add('updated');
    setTimeout(() => onChainEl.classList.remove('updated'), 600);
    animateDecimal(onChainEl, onChainPercent, 800, '', '%', 1);
    const onChainDetail = document.getElementById('insightOnchainDetail');
    onChainDetail.innerHTML = '<span id="onChainSigned">0</span> of <span id="onChainTotal">0</span> signed';
    animateNumber(document.getElementById('onChainSigned'), onChainCount, 600);
    animateNumber(document.getElementById('onChainTotal'), activities.length, 600);
    
    // Render hourly distribution bars
    const maxHourly = Math.max(...hourlyCount, 1);
    const hourlyBarsContainer = document.getElementById('hourlyBars');
    hourlyBarsContainer.innerHTML = '';
    
    hourlyCount.forEach((count, hour) => {
        const bar = document.createElement('div');
        bar.className = 'hourly-bar' + (peakHours[0]?.hour === hour ? ' peak' : '');
        const heightPercent = (count / maxHourly) * 100;
        bar.style.height = `${Math.max(heightPercent, 2)}%`;
        bar.setAttribute('data-tooltip', `${formatHour(hour)}: ${count} activities`);
        bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', `${formatHour(hour)}: ${count} activities`);
        hourlyBarsContainer.appendChild(bar);
    });
    
    // Also render weekly comparison
    renderWeeklyComparison(activities);
}

// ============================================
// WEEKLY COMPARISON
// ============================================

/**
 * Calculate and render weekly comparison (this week vs last week)
 */
function renderWeeklyComparison(activities) {
    if (!activities || activities.length === 0) return;
    
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    
    // Calculate start of this week (Monday)
    const startOfThisWeek = new Date(now);
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfThisWeek.setDate(now.getDate() - daysToMonday);
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    // Calculate start of last week
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    // End of last week (start of this week)
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setMilliseconds(-1);
    
    // Filter activities for each week
    const thisWeekActivities = activities.filter(a => {
        const date = new Date(a.timestamp);
        return date >= startOfThisWeek && date <= now;
    });
    
    const lastWeekActivities = activities.filter(a => {
        const date = new Date(a.timestamp);
        return date >= startOfLastWeek && date < startOfThisWeek;
    });
    
    // Calculate counts
    const thisWeekCount = thisWeekActivities.length;
    const lastWeekCount = lastWeekActivities.length;
    
    // Calculate on-chain rates
    const thisWeekOnchain = thisWeekActivities.filter(a => a.signature).length;
    const lastWeekOnchain = lastWeekActivities.filter(a => a.signature).length;
    const thisWeekOnchainRate = thisWeekCount > 0 ? (thisWeekOnchain / thisWeekCount * 100) : 0;
    const lastWeekOnchainRate = lastWeekCount > 0 ? (lastWeekOnchain / lastWeekCount * 100) : 0;
    
    // Calculate daily counts for each week
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const thisWeekDaily = new Array(7).fill(0);
    const lastWeekDaily = new Array(7).fill(0);
    
    thisWeekActivities.forEach(a => {
        const date = new Date(a.timestamp);
        let day = date.getDay() - 1; // Convert to Mon=0
        if (day < 0) day = 6; // Sunday becomes 6
        thisWeekDaily[day]++;
    });
    
    lastWeekActivities.forEach(a => {
        const date = new Date(a.timestamp);
        let day = date.getDay() - 1;
        if (day < 0) day = 6;
        lastWeekDaily[day]++;
    });
    
    // Find peak days
    const thisWeekPeakIndex = thisWeekDaily.indexOf(Math.max(...thisWeekDaily));
    const lastWeekPeakIndex = lastWeekDaily.indexOf(Math.max(...lastWeekDaily));
    
    // Calculate daily averages (only count days that have passed this week)
    const daysPassed = Math.min(daysToMonday + 1, 7); // How many days of this week have passed
    const thisWeekAvg = daysPassed > 0 ? (thisWeekCount / daysPassed) : 0;
    const lastWeekAvg = lastWeekCount / 7;
    
    // Update UI - Count comparison
    document.getElementById('weeklyThisCount').textContent = thisWeekCount;
    document.getElementById('weeklyLastCount').textContent = lastWeekCount;
    updateChangeIndicator('weeklyCountChange', thisWeekCount, lastWeekCount);
    
    // On-chain rate comparison
    document.getElementById('weeklyThisOnchain').textContent = thisWeekOnchainRate.toFixed(0) + '%';
    document.getElementById('weeklyLastOnchain').textContent = lastWeekOnchainRate.toFixed(0) + '%';
    updateChangeIndicator('weeklyOnchainChange', thisWeekOnchainRate, lastWeekOnchainRate, true);
    
    // Peak day comparison
    const thisWeekPeakDay = thisWeekDaily[thisWeekPeakIndex] > 0 ? dayNames[thisWeekPeakIndex] : '--';
    const lastWeekPeakDay = lastWeekDaily[lastWeekPeakIndex] > 0 ? dayNames[lastWeekPeakIndex] : '--';
    document.getElementById('weeklyThisPeakDay').textContent = thisWeekPeakDay;
    document.getElementById('weeklyLastPeakDay').textContent = lastWeekPeakDay;
    
    // Daily average comparison
    document.getElementById('weeklyThisAvg').textContent = thisWeekAvg.toFixed(1);
    document.getElementById('weeklyLastAvg').textContent = lastWeekAvg.toFixed(1);
    updateChangeIndicator('weeklyAvgChange', thisWeekAvg, lastWeekAvg);
    
    // Render bar charts
    renderWeeklyBars('weeklyBarsThis', thisWeekDaily, 'This Week', thisWeekPeakIndex);
    renderWeeklyBars('weeklyBarsLast', lastWeekDaily, 'Last Week', lastWeekPeakIndex);
}

/**
 * Update change indicator with positive/negative styling
 */
function updateChangeIndicator(elementId, thisValue, lastValue, isPercentage = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const diff = thisValue - lastValue;
    let percentChange = 0;
    
    if (lastValue > 0) {
        percentChange = ((thisValue - lastValue) / lastValue) * 100;
    } else if (thisValue > 0) {
        percentChange = 100;
    }
    
    const arrow = el.querySelector('.change-arrow');
    const value = el.querySelector('.change-value');
    
    el.classList.remove('positive', 'negative', 'neutral');
    
    if (diff > 0) {
        el.classList.add('positive');
        arrow.textContent = '↑';
        value.textContent = '+' + (isPercentage ? diff.toFixed(0) + 'pp' : Math.round(percentChange) + '%');
    } else if (diff < 0) {
        el.classList.add('negative');
        arrow.textContent = '↓';
        value.textContent = (isPercentage ? diff.toFixed(0) + 'pp' : Math.round(percentChange) + '%');
    } else {
        el.classList.add('neutral');
        arrow.textContent = '→';
        value.textContent = '0%';
    }
}

/**
 * Render weekly bar chart for a given week
 */
function renderWeeklyBars(containerId, dailyCounts, label, peakIndex) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxCount = Math.max(...dailyCounts, 1);
    
    // Create bars row
    let html = `<div class="weekly-bars-label">${label}</div>`;
    html += '<div class="weekly-bars-row">';
    
    dailyCounts.forEach((count, index) => {
        const heightPercent = (count / maxCount) * 100;
        const isPeak = index === peakIndex && count > 0;
        html += `
            <div class="weekly-day-bar${isPeak ? ' peak' : ''}" 
                 style="height: ${Math.max(heightPercent, 3)}%"
                 data-tooltip="${dayNames[index]}: ${count} activities"
                 role="img"
                 aria-label="${dayNames[index]}: ${count} activities">
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// DAILY GOAL TRACKING
// ============================================

const GOAL_STORAGE_KEY = 'jarvis-pow-daily-goal';
const GOAL_HISTORY_KEY = 'jarvis-pow-goal-history';

/**
 * Load goal settings from localStorage
 */
function loadGoalSettings() {
    const stored = localStorage.getItem(GOAL_STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to parse goal settings:', e);
        }
    }
    return { target: 10, lastUpdated: null };
}

/**
 * Save goal settings to localStorage
 */
function saveGoalSettings(settings) {
    localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Load goal history from localStorage
 * Format: { "YYYY-MM-DD": { achieved: boolean, count: number, target: number } }
 */
function loadGoalHistory() {
    const stored = localStorage.getItem(GOAL_HISTORY_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to parse goal history:', e);
        }
    }
    return {};
}

/**
 * Save goal history to localStorage
 */
function saveGoalHistory(history) {
    localStorage.setItem(GOAL_HISTORY_KEY, JSON.stringify(history));
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Set daily goal from input
 */
function setDailyGoal() {
    const input = document.getElementById('goalInput');
    const value = parseInt(input.value, 10);
    
    if (isNaN(value) || value < 1 || value > 500) {
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 500);
        return;
    }
    
    const settings = loadGoalSettings();
    settings.target = value;
    settings.lastUpdated = getTodayStr();
    saveGoalSettings(settings);
    
    // Re-render goal tracker with cached activities
    if (window.cachedActivities) {
        renderGoalTracker(window.cachedActivities);
    }
    
    // Visual feedback
    input.classList.add('success');
    setTimeout(() => input.classList.remove('success'), 500);
    
    playNotificationSound('new');
}

/**
 * Set goal to preset value
 */
function setGoalPreset(value) {
    const input = document.getElementById('goalInput');
    input.value = value;
    setDailyGoal();
}

/**
 * Calculate goal streak (consecutive days goal was met)
 */
function calculateGoalStreak(history) {
    const today = getTodayStr();
    const days = Object.keys(history).sort().reverse();
    
    let streak = 0;
    let checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday (today might not be done yet)
    
    for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayData = history[dateStr];
        
        if (dayData && dayData.achieved) {
            streak++;
        } else if (dayData && !dayData.achieved) {
            break; // Streak broken
        } else {
            // No data for this day, skip (might be before tracking started)
            break;
        }
        
        checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Check if today's goal is met and add to streak
    const todayData = history[today];
    if (todayData && todayData.achieved) {
        streak++;
    }
    
    return streak;
}

/**
 * Calculate best streak ever
 */
function calculateBestStreak(history) {
    const days = Object.keys(history).sort();
    let bestStreak = 0;
    let currentStreak = 0;
    let prevDate = null;
    
    for (const dateStr of days) {
        const dayData = history[dateStr];
        const date = new Date(dateStr + 'T12:00:00');
        
        if (dayData && dayData.achieved) {
            if (prevDate) {
                const diff = (date - prevDate) / (1000 * 60 * 60 * 24);
                if (diff === 1) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
            } else {
                currentStreak = 1;
            }
            
            if (currentStreak > bestStreak) {
                bestStreak = currentStreak;
            }
            prevDate = date;
        } else {
            currentStreak = 0;
            prevDate = null;
        }
    }
    
    return bestStreak;
}

/**
 * Render the goal tracker with current data
 */
function renderGoalTracker(activities) {
    if (!activities) return;
    
    const settings = loadGoalSettings();
    const history = loadGoalHistory();
    const today = getTodayStr();
    
    // Count today's activities
    const todayActivities = activities.filter(a => {
        const date = new Date(a.timestamp).toISOString().split('T')[0];
        return date === today;
    });
    const todayCount = todayActivities.length;
    const target = settings.target;
    const progress = Math.min(100, (todayCount / target) * 100);
    const achieved = todayCount >= target;
    
    // Update history for today
    history[today] = {
        achieved,
        count: todayCount,
        target
    };
    saveGoalHistory(history);
    
    // Calculate streaks
    const currentStreak = calculateGoalStreak(history);
    const bestStreak = calculateBestStreak(history);
    const remaining = Math.max(0, target - todayCount);
    
    // Update UI elements
    const currentEl = document.getElementById('goalCurrent');
    const targetEl = document.getElementById('goalTarget');
    const ringFill = document.getElementById('goalRingFill');
    const progressRing = document.getElementById('goalProgressRing');
    const statusEl = document.getElementById('goalStatus');
    const streakEl = document.getElementById('goalStreak');
    const bestStreakEl = document.getElementById('goalBestStreak');
    const remainingEl = document.getElementById('goalRemaining');
    const inputEl = document.getElementById('goalInput');
    
    if (currentEl) currentEl.textContent = todayCount;
    if (targetEl) targetEl.textContent = target;
    if (inputEl) inputEl.value = target;
    
    // Animate progress ring
    if (ringFill) {
        const circumference = 326.73; // 2 * PI * 52
        const offset = circumference - (progress / 100) * circumference;
        ringFill.style.strokeDashoffset = offset;
        
        // Color based on progress
        if (achieved) {
            ringFill.style.stroke = 'var(--accent-green)';
        } else if (progress >= 75) {
            ringFill.style.stroke = 'var(--accent-yellow)';
        } else if (progress >= 50) {
            ringFill.style.stroke = 'var(--accent-blue)';
        } else {
            ringFill.style.stroke = 'var(--accent-purple)';
        }
    }
    
    if (progressRing) {
        progressRing.setAttribute('aria-valuenow', Math.round(progress));
        progressRing.classList.toggle('achieved', achieved);
    }
    
    // Update status
    if (statusEl) {
        if (achieved) {
            statusEl.innerHTML = '<span class="goal-status-icon">🎉</span><span class="goal-status-text">Goal Achieved!</span>';
            statusEl.classList.add('achieved');
        } else if (progress >= 75) {
            statusEl.innerHTML = '<span class="goal-status-icon">🔥</span><span class="goal-status-text">Almost There!</span>';
            statusEl.classList.remove('achieved');
        } else if (progress >= 50) {
            statusEl.innerHTML = '<span class="goal-status-icon">💪</span><span class="goal-status-text">Halfway There</span>';
            statusEl.classList.remove('achieved');
        } else {
            statusEl.innerHTML = '<span class="goal-status-icon">⏳</span><span class="goal-status-text">In Progress</span>';
            statusEl.classList.remove('achieved');
        }
    }
    
    // Update stats
    if (streakEl) streakEl.textContent = currentStreak;
    if (bestStreakEl) bestStreakEl.textContent = bestStreak;
    if (remainingEl) remainingEl.textContent = remaining;
    
    // Render history bars
    renderGoalHistory(activities, history, target);
}

/**
 * Render 7-day goal history visualization
 */
function renderGoalHistory(activities, history, currentTarget) {
    const container = document.getElementById('goalHistoryBars');
    if (!container) return;
    
    const bars = [];
    const today = new Date();
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Count activities for this day
        const dayActivities = activities.filter(a => {
            const aDate = new Date(a.timestamp).toISOString().split('T')[0];
            return aDate === dateStr;
        });
        const count = dayActivities.length;
        
        // Get target for that day (use stored target or current)
        const dayData = history[dateStr];
        const target = dayData?.target || currentTarget;
        const achieved = count >= target;
        const percent = Math.min(100, (count / target) * 100);
        const isToday = i === 0;
        
        bars.push(`
            <div class="goal-history-bar ${achieved ? 'achieved' : ''} ${isToday ? 'today' : ''}"
                 style="height: ${Math.max(percent, 8)}%"
                 data-tooltip="${count}/${target} activities"
                 role="img"
                 aria-label="${isToday ? 'Today' : i + ' days ago'}: ${count} of ${target} activities${achieved ? ' (goal met)' : ''}">
                ${achieved ? '<span class="goal-check">✓</span>' : ''}
            </div>
        `);
    }
    
    container.innerHTML = bars.join('');
}

// Store activities globally for export
let cachedActivities = [];

// Detect base path for API calls (handles /pow/ proxy)
const basePath = window.location.pathname.replace(/\/$/, '').replace(/\/index\.html$/, '') || '';

async function loadActivities() {
    try {
        const res = await fetch(basePath + '/api/activities');
        const activities = await res.json();
        cachedActivities = activities;
        renderActivities(activities);
        renderDecisions(activities);
        renderMilestones(activities);
        renderTweets(activities);
        updateStats(activities);
        renderCharts(activities);
        renderHeatmap(activities);
        renderInsights(activities);
        renderWeeklyComparison(activities);
        renderVelocityChart(activities);
        renderProductivityClock(activities);
        renderGoalTracker(activities);
        populateTagFilters(activities);
        initTimelineSlider(activities);
        loadAchievements();
    } catch (e) {
        try {
            const res = await fetch(basePath + '/activity.json');
            const activities = await res.json();
            cachedActivities = activities;
            renderActivities(activities);
            renderDecisions(activities);
            renderMilestones(activities);
            renderTweets(activities);
            updateStats(activities);
            renderCharts(activities);
            renderHeatmap(activities);
            renderInsights(activities);
            renderWeeklyComparison(activities);
            renderVelocityChart(activities);
            renderProductivityClock(activities);
            renderGoalTracker(activities);
            populateTagFilters(activities);
            initTimelineSlider(activities);
            loadAchievements();
        } catch (e2) {
            document.getElementById('feed').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📡</div>
                    <h4>Connecting to Agent</h4>
                    <p>Unable to load activities. The agent may be offline or the connection is unavailable.</p>
                    <div class="empty-state-hint">
                        Try refreshing or check back in a moment.
                    </div>
                </div>
            `;
        }
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportJSON() {
    if (!cachedActivities.length) {
        alert('No activities to export');
        return;
    }
    
    // Create a verification wrapper with metadata
    const exportData = {
        exportedAt: new Date().toISOString(),
        agentId: '45',
        agentName: 'Jarvis',
        wallet: 'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX',
        hackathon: 'Colosseum Agent Hackathon 2026',
        totalActivities: cachedActivities.length,
        onChainProofs: cachedActivities.filter(a => a.signature || a.proof?.txSignature).length,
        verificationInstructions: {
            description: 'Each activity with a signature field has been cryptographically signed and posted to Solana mainnet.',
            howToVerify: '1. Take the signature field value. 2. Go to https://solscan.io/tx/{signature}. 3. Verify the memo matches the activity hash.',
            hashMethod: 'SHA-256 of (timestamp + type + description + metadata JSON)'
        },
        activities: cachedActivities
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `jarvis-proof-of-work-${getDateStr()}.json`);
    
    // Play notification sound
    playNotificationSound('new');
}

function exportCSV() {
    if (!cachedActivities.length) {
        alert('No activities to export');
        return;
    }
    
    // Define CSV headers
    const headers = [
        'timestamp',
        'type',
        'description',
        'hash',
        'signature',
        'solscan_link',
        'metadata'
    ];
    
    // Build rows
    const rows = cachedActivities.map(a => {
        const hash = a.hash || a.proof?.hash || '';
        const sig = a.signature || a.proof?.txSignature || '';
        const solscanLink = sig ? `https://solscan.io/tx/${sig}` : '';
        const metadata = a.metadata ? JSON.stringify(a.metadata).replace(/"/g, '""') : '';
        
        return [
            a.timestamp,
            a.type,
            `"${(a.description || '').replace(/"/g, '""')}"`,
            hash,
            sig,
            solscanLink,
            `"${metadata}"`
        ].join(',');
    });
    
    // Combine headers and rows
    const csv = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `jarvis-proof-of-work-${getDateStr()}.csv`);
    
    // Play notification sound
    playNotificationSound('new');
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================
// SOCIAL SHARING
// ============================================
function shareOnTwitter() {
    const activityCount = cachedActivities ? cachedActivities.length : 0;
    const text = `🤖 Check out Jarvis's Proof of Work Dashboard!\n\n${activityCount} activities, ALL cryptographically signed and verified on Solana.\n\nThis is what agent autonomy looks like. 👀\n\n#Colosseum #AI #Solana`;
    const url = window.location.href;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, '_blank', 'width=550,height=420');
    playNotificationSound('new');
}

function copyDashboardLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        // Show brief confirmation
        const btn = document.querySelector('.copy-link');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '✓ Copied!';
        btn.style.borderColor = 'var(--accent-green)';
        btn.style.color = 'var(--accent-green)';
        playNotificationSound('new');
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

function getDateStr() {
    return new Date().toISOString().split('T')[0];
}

// WebSocket connection for real-time updates
let ws = null;
let wsReconnectTimer = null;
let wsConnected = false;

function connectWebSocket() {
    // Determine WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('🔌 WebSocket connected');
            wsConnected = true;
            updateConnectionStatus(true);
            
            // Clear reconnect timer if any
            if (wsReconnectTimer) {
                clearTimeout(wsReconnectTimer);
                wsReconnectTimer = null;
            }
        };
        
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                
                if (msg.type === 'init' || msg.type === 'new_activities') {
                    console.log(`📡 Received ${msg.type}: ${msg.data.activities.length} activities`);
                    cachedActivities = msg.data.activities;
                    
                    // Pass highlightNew=true for new activities to trigger pulse animation
                    const isNewActivity = msg.type === 'new_activities' && msg.data.newItems?.length > 0;
                    renderActivities(msg.data.activities, isNewActivity);
                    renderDecisions(msg.data.activities);
                    renderMilestones(msg.data.activities);
                    renderTweets(msg.data.activities);
                    updateStats(msg.data.activities);
                    renderCharts(msg.data.activities);
                    renderHeatmap(msg.data.activities);
                    renderInsights(msg.data.activities);
                    renderVelocityChart(msg.data.activities);
                    renderProductivityClock(msg.data.activities);
                    renderGoalTracker(msg.data.activities);
                    populateTagFilters(msg.data.activities);
                    
                    // Flash notification + sound for new activities
                    if (isNewActivity) {
                        flashNewActivity(msg.data.newItems.length, msg.data.newItems);
                        // Announce new activities to screen readers
                        const count = msg.data.newItems.length;
                        const firstItem = msg.data.newItems[0];
                        const desc = firstItem?.description?.substring(0, 50) || firstItem?.type || 'activity';
                        announceToScreenReader(`${count} new ${count === 1 ? 'activity' : 'activities'}: ${desc}`);
                    }
                }
            } catch (e) {
                console.error('WebSocket message error:', e);
            }
        };
        
        ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            wsConnected = false;
            updateConnectionStatus(false);
            
            // Reconnect after 5 seconds
            wsReconnectTimer = setTimeout(connectWebSocket, 5000);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        // Keepalive ping every 30 seconds
        setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send('ping');
            }
        }, 30000);
        
    } catch (e) {
        console.error('WebSocket connection failed:', e);
        wsConnected = false;
        // Fallback to polling
    }
}

function updateConnectionStatus(connected) {
    const indicator = document.querySelector('.live-indicator');
    if (indicator) {
        indicator.title = connected ? 'Live - WebSocket connected' : 'Polling - WebSocket reconnecting';
        indicator.style.background = connected ? 'var(--accent-green)' : '#ffaa00';
    }
}

function flashNewActivity(count, newItems = []) {
    // Play notification sound based on activity type
    if (newItems.length > 0) {
        const firstItem = newItems[0];
        if (firstItem.type === 'trade' || firstItem.type === 'transfer') {
            playNotificationSound('trade');
        } else if (firstItem.type === 'decision') {
            playNotificationSound('decision');
        } else {
            playNotificationSound('new');
        }
        
        // Announce new activity to screen readers
        const activityDesc = firstItem.description ? `: ${firstItem.description.substring(0, 50)}` : '';
        announceToScreenReader(`New ${firstItem.type} activity${count > 1 ? ` and ${count - 1} more` : ''}${activityDesc}`);
    } else {
        playNotificationSound('new');
        announceToScreenReader(`${count} new ${count === 1 ? 'activity' : 'activities'}`);
    }
    
    // Flash the activity feed header
    const header = document.querySelector('.activity-feed h2');
    if (header) {
        header.style.textShadow = '0 0 20px var(--accent-green)';
        setTimeout(() => {
            header.style.textShadow = 'none';
        }, 1000);
    }
    
    // Update document title briefly
    const originalTitle = document.title;
    document.title = `🔔 (${count} new) ${originalTitle}`;
    setTimeout(() => {
        document.title = originalTitle;
    }, 3000);
}

// Initial load
loadActivities();

// Connect WebSocket for real-time updates
connectWebSocket();

// Re-render charts on window resize (for mobile orientation changes)
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (cachedActivities && cachedActivities.length > 0) {
            renderCharts(cachedActivities);
        }
    }, 250);
});

// Fallback polling every 30 seconds (only if WebSocket disconnected)
setInterval(() => {
    if (!wsConnected) {
        console.log('📡 Polling fallback...');
        loadActivities();
    }
}, 30000);

// ============================================
// ACTIVITY SEARCH & FILTER
// ============================================
let currentTypeFilter = 'all';
let currentSearchQuery = '';
let currentTagFilter = null; // null means "all tags"
let currentWalletFilter = null; // null means "all wallets"
let currentStatusFilter = 'all'; // 'all', 'pending', 'completed', 'failed'
let currentDateFrom = null; // null means no start date filter
let currentDateTo = null; // null means no end date filter
let availableTags = new Set();

// Default wallet for signing (matches first wallet in KNOWN_WALLETS above)
const DEFAULT_WALLET = 'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX';

// ============================================
// FUZZY SEARCH UTILITIES
// ============================================

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[b.length][a.length];
}

/**
 * Check if query fuzzy matches text with typo tolerance
 * @param {string} text - Text to search in
 * @param {string} query - Search query
 * @param {number} maxDistance - Maximum edit distance allowed (default: based on query length)
 * @returns {object} { matches: boolean, score: number, matchType: string }
 */
function fuzzyMatch(text, query) {
    if (!text || !query) return { matches: false, score: 0, matchType: 'none' };
    
    text = text.toLowerCase();
    query = query.toLowerCase();
    
    // Exact substring match (highest score)
    if (text.includes(query)) {
        // Bonus for word boundary match
        const wordBoundary = new RegExp(`\\b${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        if (wordBoundary.test(text)) {
            return { matches: true, score: 100, matchType: 'exact-word' };
        }
        return { matches: true, score: 90, matchType: 'exact-substring' };
    }
    
    // Word-by-word matching for multi-word queries
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);
    if (queryWords.length > 1) {
        const allWordsMatch = queryWords.every(word => text.includes(word));
        if (allWordsMatch) {
            return { matches: true, score: 85, matchType: 'all-words' };
        }
    }
    
    // Calculate typo tolerance based on query length
    // Short queries (1-3 chars): 0 typos allowed
    // Medium queries (4-6 chars): 1 typo allowed
    // Longer queries (7+ chars): 2 typos allowed
    const maxDistance = query.length <= 3 ? 0 : query.length <= 6 ? 1 : 2;
    
    if (maxDistance === 0) {
        return { matches: false, score: 0, matchType: 'none' };
    }
    
    // Check each word in text for fuzzy match
    const textWords = text.split(/\s+/);
    for (const textWord of textWords) {
        // Skip very short words for fuzzy matching
        if (textWord.length < 3) continue;
        
        // Check if query is similar to any word
        const distance = levenshteinDistance(query, textWord);
        if (distance <= maxDistance) {
            const similarity = 1 - (distance / Math.max(query.length, textWord.length));
            return { 
                matches: true, 
                score: Math.round(70 * similarity), 
                matchType: 'fuzzy',
                distance 
            };
        }
        
        // Also check if query fuzzy matches start of word (for prefix typos)
        if (textWord.length >= query.length) {
            const prefix = textWord.substring(0, query.length);
            const prefixDistance = levenshteinDistance(query, prefix);
            if (prefixDistance <= maxDistance) {
                const similarity = 1 - (prefixDistance / query.length);
                return { 
                    matches: true, 
                    score: Math.round(60 * similarity), 
                    matchType: 'fuzzy-prefix',
                    distance: prefixDistance 
                };
            }
        }
    }
    
    // Check if query fuzzy matches any substring (more expensive, but catches more)
    if (query.length >= 4 && text.length <= 500) {
        for (let i = 0; i <= text.length - query.length; i++) {
            const substr = text.substring(i, i + query.length);
            const distance = levenshteinDistance(query, substr);
            if (distance <= maxDistance) {
                const similarity = 1 - (distance / query.length);
                return { 
                    matches: true, 
                    score: Math.round(50 * similarity), 
                    matchType: 'fuzzy-substring',
                    distance 
                };
            }
        }
    }
    
    return { matches: false, score: 0, matchType: 'none' };
}

/**
 * Calculate overall fuzzy search score for an activity
 * @param {object} activity - Activity object
 * @param {string} query - Search query
 * @returns {object} { matches: boolean, score: number, matchDetails: array }
 */
function fuzzySearchActivity(activity, query) {
    const fields = [
        { name: 'description', value: activity.description || '', weight: 1.5 },
        { name: 'type', value: activity.type || '', weight: 1.3 },
        { name: 'hash', value: activity.hash || '', weight: 0.5 },
        { name: 'metadata', value: JSON.stringify(activity.metadata || {}), weight: 0.8 },
        { name: 'tags', value: (activity.tags || []).join(' '), weight: 1.2 },
        { name: 'wallet', value: activity.wallet || '', weight: 0.3 }
    ];
    
    let bestScore = 0;
    let matches = false;
    const matchDetails = [];
    
    for (const field of fields) {
        const result = fuzzyMatch(field.value, query);
        if (result.matches) {
            matches = true;
            const weightedScore = result.score * field.weight;
            matchDetails.push({ field: field.name, ...result, weightedScore });
            if (weightedScore > bestScore) {
                bestScore = weightedScore;
            }
        }
    }
    
    return { matches, score: bestScore, matchDetails };
}

// Fuzzy search mode toggle (can be disabled for performance)
let fuzzySearchEnabled = localStorage.getItem('pow_fuzzy_search') !== 'false';

/**
 * Toggle fuzzy search mode
 */
function toggleFuzzySearch() {
    fuzzySearchEnabled = !fuzzySearchEnabled;
    localStorage.setItem('pow_fuzzy_search', fuzzySearchEnabled);
    
    // Update UI indicator if it exists
    const indicator = document.getElementById('fuzzySearchIndicator');
    if (indicator) {
        indicator.textContent = fuzzySearchEnabled ? '🔍 Fuzzy' : '🔎 Exact';
        indicator.title = fuzzySearchEnabled 
            ? 'Fuzzy search enabled (typo tolerant)' 
            : 'Exact search only';
    }
    
    // Re-apply filters with new mode
    if (currentSearchQuery) {
        applyFilters();
    }
    
    showToast(fuzzySearchEnabled 
        ? 'Fuzzy search enabled - typos will be tolerated' 
        : 'Exact search only - no typo tolerance', 
        'info'
    );
}

/**
 * Initialize fuzzy search indicator on page load
 */
function initFuzzySearchIndicator() {
    const indicator = document.getElementById('fuzzySearchIndicator');
    if (indicator) {
        indicator.textContent = fuzzySearchEnabled ? '🔍 Fuzzy' : '🔎 Exact';
        indicator.title = fuzzySearchEnabled 
            ? 'Fuzzy search enabled (typo tolerant) - click to switch to exact' 
            : 'Exact search only - click to enable fuzzy (typo tolerant)';
        indicator.classList.toggle('exact-mode', !fuzzySearchEnabled);
    }
}

// Initialize fuzzy search indicator on DOM load
document.addEventListener('DOMContentLoaded', initFuzzySearchIndicator);

function setTypeFilter(type) {
    currentTypeFilter = type;
    
    // Update active state and ARIA on buttons
    document.querySelectorAll('.type-filter').forEach(btn => {
        const isActive = btn.dataset.type === type;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive);
    });
    
    applyFilters();
}

function setTagFilter(tag) {
    // Toggle off if clicking same tag, or 'all' clears filter
    if (tag === 'all' || currentTagFilter === tag) {
        currentTagFilter = null;
    } else {
        currentTagFilter = tag;
    }
    
    // Update active state on tag buttons
    document.querySelectorAll('.tag-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tag === currentTagFilter);
    });
    
    applyFilters();
}

/**
 * Set status filter (pending/completed/failed/all)
 * @param {string} status - The status to filter by
 */
function setStatusFilter(status) {
    currentStatusFilter = status;
    
    // Update active state and ARIA on buttons
    document.querySelectorAll('.status-filter-btn').forEach(btn => {
        const isActive = btn.dataset.status === status;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive);
    });
    
    applyFilters();
}

// Extract all unique tags from activities and populate filter buttons
function populateTagFilters(activities) {
    const tagCounts = {};
    
    activities.forEach(a => {
        if (a.tags && Array.isArray(a.tags)) {
            a.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });
    
    const container = document.getElementById('tagFilterButtons');
    const tagFiltersDiv = document.getElementById('tagFilters');
    
    if (!container || !tagFiltersDiv) return;
    
    // Hide if no tags exist in activities
    if (Object.keys(tagCounts).length === 0) {
        tagFiltersDiv.style.display = 'none';
        return;
    }
    
    tagFiltersDiv.style.display = 'flex';
    
    // Sort tags by count (most used first)
    const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);
    
    // Build buttons - each tag as a clickable filter
    const html = sortedTags.map(tag => {
        const isActive = currentTagFilter === tag;
        return `<button class="tag-filter${isActive ? ' active' : ''}" 
                data-tag="${escapeHtml(tag)}" 
                onclick="setTagFilter('${escapeHtml(tag)}')">
            ${escapeHtml(tag)}
            <span class="tag-count">${tagCounts[tag]}</span>
        </button>`;
    }).join('');
    
    container.innerHTML = html;
}

// ============================================
// WALLET FILTER FUNCTIONS
// ============================================

function setWalletFilter(wallet) {
    // Toggle off if clicking same wallet, or 'all' clears filter
    if (wallet === 'all' || currentWalletFilter === wallet) {
        currentWalletFilter = null;
    } else {
        currentWalletFilter = wallet;
    }
    
    // Update active state on wallet buttons
    document.querySelectorAll('.wallet-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.wallet === currentWalletFilter);
    });
    
    applyFilters();
}

// Extract all unique wallets from activities and populate filter buttons
function populateWalletFilters(activities) {
    const walletCounts = {};
    
    activities.forEach(a => {
        // Use wallet field if present, otherwise default to Jarvis wallet if signed
        const wallet = a.wallet || (a.signature ? DEFAULT_WALLET : null);
        if (wallet) {
            walletCounts[wallet] = (walletCounts[wallet] || 0) + 1;
        }
    });
    
    const container = document.getElementById('walletFilterButtons');
    const walletFiltersDiv = document.getElementById('walletFilters');
    
    if (!container || !walletFiltersDiv) return;
    
    // Hide if only one or no wallets (no need to filter)
    const walletAddresses = Object.keys(walletCounts);
    if (walletAddresses.length <= 1) {
        walletFiltersDiv.style.display = 'none';
        return;
    }
    
    walletFiltersDiv.style.display = 'flex';
    
    // Sort wallets by count (most used first)
    const sortedWallets = Object.entries(walletCounts)
        .sort((a, b) => b[1] - a[1]);
    
    // Build buttons - each wallet as a clickable filter
    const html = sortedWallets.map(([wallet, count]) => {
        const isActive = currentWalletFilter === wallet;
        const name = getWalletName(wallet);
        return `<button class="wallet-filter${isActive ? ' active' : ''}" 
                data-wallet="${escapeHtml(wallet)}" 
                onclick="setWalletFilter('${escapeHtml(wallet)}')"
                title="${wallet}">
            <span class="wallet-icon">💳</span>
            ${escapeHtml(name)}
            <span class="wallet-count">${count}</span>
        </button>`;
    }).join('');
    
    container.innerHTML = html;
}

function clearSearch() {
    const input = document.getElementById('activitySearch');
    if (input) {
        input.value = '';
        currentSearchQuery = '';
    }
    applyFilters();
}

function applyFilters() {
    const input = document.getElementById('activitySearch');
    const clearBtn = document.getElementById('searchClear');
    currentSearchQuery = input ? input.value.toLowerCase().trim() : '';
    
    // Show/hide clear button
    if (clearBtn) {
        clearBtn.classList.toggle('visible', currentSearchQuery.length > 0);
    }
    
    // Read date range inputs
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    currentDateFrom = dateFromInput && dateFromInput.value ? new Date(dateFromInput.value + 'T00:00:00') : null;
    currentDateTo = dateToInput && dateToInput.value ? new Date(dateToInput.value + 'T23:59:59') : null;
    
    // Sync timeline slider with date inputs (if not currently being dragged)
    if (typeof syncTimelineSliderFromInputs === 'function' && !timelineSliderData?.isDragging) {
        syncTimelineSliderFromInputs();
    }
    
    // Re-render with filters
    if (window.cachedActivities) {
        renderFilteredActivities(window.cachedActivities);
    }
    
    // Update export filter indicator
    updateExportFilterIndicator();
}

/**
 * Update the export filter indicator visibility
 * Shows when any filter is active to inform users that export will be filtered
 */
function updateExportFilterIndicator() {
    const indicator = document.getElementById('export-filter-indicator');
    if (!indicator) return;
    
    const hasActiveFilters = 
        currentTypeFilter !== 'all' ||
        (currentSearchQuery && currentSearchQuery.length > 0) ||
        currentTagFilter !== null ||
        currentWalletFilter !== null ||
        currentDateFrom !== null ||
        currentDateTo !== null ||
        window.bookmarkFilterActive ||
        currentStatusFilter !== 'all' ||
        (typeof currentSentimentFilter !== 'undefined' && currentSentimentFilter !== 'all');
    
    if (hasActiveFilters) {
        indicator.style.display = 'inline-flex';
        
        // Get filtered count from stats element
        const statsEl = document.getElementById('filterStats');
        const countMatch = statsEl?.innerHTML?.match(/Showing <span[^>]*>(\d+)<\/span>/);
        const filteredCount = countMatch ? countMatch[1] : '?';
        
        // Update indicator text with count
        indicator.innerHTML = `🔍 ${filteredCount}`;
        
        // Build filter summary for tooltip
        const activeFilters = [];
        if (currentTypeFilter !== 'all') activeFilters.push(`Type: ${currentTypeFilter}`);
        if (currentSearchQuery) activeFilters.push(`Search: "${currentSearchQuery}"`);
        if (currentTagFilter) activeFilters.push(`Tag: ${currentTagFilter}`);
        if (currentWalletFilter) activeFilters.push(`Wallet: ${currentWalletFilter.slice(0, 8)}...`);
        if (currentStatusFilter !== 'all') activeFilters.push(`Status: ${currentStatusFilter}`);
        if (typeof currentSentimentFilter !== 'undefined' && currentSentimentFilter !== 'all') activeFilters.push(`Sentiment: ${currentSentimentFilter}`);
        if (currentDateFrom || currentDateTo) {
            const from = currentDateFrom ? currentDateFrom.toLocaleDateString() : 'start';
            const to = currentDateTo ? currentDateTo.toLocaleDateString() : 'now';
            activeFilters.push(`Date: ${from} → ${to}`);
        }
        if (window.bookmarkFilterActive) activeFilters.push('Bookmarked only');
        
        indicator.title = `Export will include ${filteredCount} filtered activities:\n${activeFilters.join('\n')}`;
    } else {
        indicator.style.display = 'none';
        indicator.innerHTML = '🔍 Filtered';
    }
}

// Quick date range presets
function setQuickDateRange(preset) {
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    const now = new Date();
    
    // Clear active state on all quick buttons
    document.querySelectorAll('.date-quick-btn').forEach(btn => btn.classList.remove('active'));
    
    if (preset === 'today') {
        const today = now.toISOString().split('T')[0];
        if (dateFromInput) dateFromInput.value = today;
        if (dateToInput) dateToInput.value = today;
        event.target.classList.add('active');
    } else if (preset === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (dateFromInput) dateFromInput.value = weekAgo.toISOString().split('T')[0];
        if (dateToInput) dateToInput.value = now.toISOString().split('T')[0];
        event.target.classList.add('active');
    } else if (preset === 'all') {
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';
    }
    
    applyFilters();
}

// ============================================
// TIMELINE SLIDER - Visual Time Range Selector
// ============================================

let timelineSliderData = {
    minDate: null,
    maxDate: null,
    startPercent: 0,
    endPercent: 100,
    isDragging: false,
    activeHandle: null,
    buckets: [] // Activity counts per bucket for visualization
};

const TIMELINE_BUCKET_COUNT = 50; // Number of buckets for activity density visualization

/**
 * Initialize the timeline slider with activity data
 */
function initTimelineSlider(activities) {
    if (!activities || activities.length === 0) {
        hideTimelineSlider();
        return;
    }
    
    // Calculate date range
    const timestamps = activities.map(a => new Date(a.timestamp).getTime());
    timelineSliderData.minDate = new Date(Math.min(...timestamps));
    timelineSliderData.maxDate = new Date(Math.max(...timestamps));
    
    // Calculate activity density buckets
    calculateActivityBuckets(activities);
    
    // Render the slider
    renderTimelineSlider();
    
    // Initialize drag handlers
    initTimelineSliderDrag();
    
    // Update date labels
    updateTimelineDateLabels();
    
    // Show the container
    const container = document.getElementById('timelineSliderContainer');
    if (container) container.style.display = 'block';
}

/**
 * Hide the timeline slider
 */
function hideTimelineSlider() {
    const container = document.getElementById('timelineSliderContainer');
    if (container) container.style.display = 'none';
}

/**
 * Calculate activity density for each bucket
 */
function calculateActivityBuckets(activities) {
    const { minDate, maxDate } = timelineSliderData;
    const range = maxDate.getTime() - minDate.getTime();
    
    // Reset buckets
    timelineSliderData.buckets = new Array(TIMELINE_BUCKET_COUNT).fill(0);
    
    if (range === 0) {
        // All activities on same timestamp
        timelineSliderData.buckets[Math.floor(TIMELINE_BUCKET_COUNT / 2)] = activities.length;
        return;
    }
    
    // Count activities in each bucket
    activities.forEach(activity => {
        const timestamp = new Date(activity.timestamp).getTime();
        const position = (timestamp - minDate.getTime()) / range;
        const bucketIndex = Math.min(
            Math.floor(position * TIMELINE_BUCKET_COUNT),
            TIMELINE_BUCKET_COUNT - 1
        );
        timelineSliderData.buckets[bucketIndex]++;
    });
}

/**
 * Render the activity density bars
 */
function renderTimelineSlider() {
    const barsContainer = document.getElementById('timelineActivityBars');
    const labelsContainer = document.getElementById('timelineSliderLabels');
    
    if (!barsContainer) return;
    
    // Render density bars
    const maxCount = Math.max(...timelineSliderData.buckets, 1);
    barsContainer.innerHTML = timelineSliderData.buckets.map((count, i) => {
        const height = (count / maxCount) * 100;
        const percent = (i / TIMELINE_BUCKET_COUNT) * 100;
        const inRange = percent >= timelineSliderData.startPercent && 
                        percent <= timelineSliderData.endPercent;
        return `<div class="timeline-activity-bar ${inRange ? 'in-range' : ''}" 
                     style="height: ${Math.max(height, 2)}%;" 
                     title="${count} activities"></div>`;
    }).join('');
    
    // Render date labels (5 evenly spaced)
    if (labelsContainer && timelineSliderData.minDate && timelineSliderData.maxDate) {
        const range = timelineSliderData.maxDate.getTime() - timelineSliderData.minDate.getTime();
        const labels = [];
        for (let i = 0; i <= 4; i++) {
            const date = new Date(timelineSliderData.minDate.getTime() + (range * i / 4));
            labels.push(formatShortDate(date));
        }
        labelsContainer.innerHTML = labels.map(l => `<span>${l}</span>`).join('');
    }
}

/**
 * Format date for short display
 */
function formatShortDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Initialize drag handlers for timeline slider
 */
function initTimelineSliderDrag() {
    const track = document.getElementById('timelineSliderTrack');
    const handleStart = document.getElementById('timelineHandleStart');
    const handleEnd = document.getElementById('timelineHandleEnd');
    
    if (!track) return;
    
    // Track click to set range
    track.addEventListener('mousedown', handleTrackClick);
    track.addEventListener('touchstart', handleTrackTouch, { passive: false });
    
    // Handle drag events
    if (handleStart) {
        handleStart.addEventListener('mousedown', (e) => startDrag(e, 'start'));
        handleStart.addEventListener('touchstart', (e) => startDrag(e, 'start'), { passive: false });
        handleStart.addEventListener('keydown', (e) => handleKeyboard(e, 'start'));
    }
    
    if (handleEnd) {
        handleEnd.addEventListener('mousedown', (e) => startDrag(e, 'end'));
        handleEnd.addEventListener('touchstart', (e) => startDrag(e, 'end'), { passive: false });
        handleEnd.addEventListener('keydown', (e) => handleKeyboard(e, 'end'));
    }
    
    // Global mouse/touch events for drag
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', handleDrag, { passive: false });
    document.addEventListener('touchend', endDrag);
}

/**
 * Handle click on the track to set initial range
 */
function handleTrackClick(e) {
    if (e.target.classList.contains('timeline-slider-handle')) return;
    
    const track = document.getElementById('timelineSliderTrack');
    const rect = track.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Create a range centered on the click (10% width)
    const rangeWidth = 10;
    timelineSliderData.startPercent = Math.max(0, percent - rangeWidth / 2);
    timelineSliderData.endPercent = Math.min(100, percent + rangeWidth / 2);
    
    updateSliderUI();
    applyTimelineRange();
}

/**
 * Handle touch on track
 */
function handleTrackTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    handleTrackClick({ clientX: touch.clientX, target: e.target });
}

/**
 * Start dragging a handle
 */
function startDrag(e, handle) {
    e.preventDefault();
    e.stopPropagation();
    
    timelineSliderData.isDragging = true;
    timelineSliderData.activeHandle = handle;
    
    const handleEl = handle === 'start' ? 
        document.getElementById('timelineHandleStart') : 
        document.getElementById('timelineHandleEnd');
    if (handleEl) handleEl.classList.add('dragging');
}

/**
 * Handle drag movement
 */
function handleDrag(e) {
    if (!timelineSliderData.isDragging) return;
    
    e.preventDefault();
    
    const track = document.getElementById('timelineSliderTrack');
    if (!track) return;
    
    const rect = track.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let percent = ((clientX - rect.left) / rect.width) * 100;
    percent = Math.max(0, Math.min(100, percent));
    
    if (timelineSliderData.activeHandle === 'start') {
        timelineSliderData.startPercent = Math.min(percent, timelineSliderData.endPercent - 2);
    } else {
        timelineSliderData.endPercent = Math.max(percent, timelineSliderData.startPercent + 2);
    }
    
    updateSliderUI();
}

/**
 * End dragging
 */
function endDrag() {
    if (!timelineSliderData.isDragging) return;
    
    timelineSliderData.isDragging = false;
    
    document.querySelectorAll('.timeline-slider-handle').forEach(h => h.classList.remove('dragging'));
    
    applyTimelineRange();
    timelineSliderData.activeHandle = null;
}

/**
 * Handle keyboard navigation for handles
 */
function handleKeyboard(e, handle) {
    const step = e.shiftKey ? 10 : 2; // Larger steps with shift
    
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (handle === 'start') {
            timelineSliderData.startPercent = Math.max(0, timelineSliderData.startPercent - step);
        } else {
            timelineSliderData.endPercent = Math.max(
                timelineSliderData.startPercent + 2,
                timelineSliderData.endPercent - step
            );
        }
        updateSliderUI();
        applyTimelineRange();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (handle === 'start') {
            timelineSliderData.startPercent = Math.min(
                timelineSliderData.endPercent - 2,
                timelineSliderData.startPercent + step
            );
        } else {
            timelineSliderData.endPercent = Math.min(100, timelineSliderData.endPercent + step);
        }
        updateSliderUI();
        applyTimelineRange();
    }
}

/**
 * Update the slider UI (handles, selection, bars)
 */
function updateSliderUI() {
    const handleStart = document.getElementById('timelineHandleStart');
    const handleEnd = document.getElementById('timelineHandleEnd');
    const selection = document.getElementById('timelineSliderSelection');
    const tooltipStart = document.getElementById('handleTooltipStart');
    const tooltipEnd = document.getElementById('handleTooltipEnd');
    
    const { startPercent, endPercent, minDate, maxDate } = timelineSliderData;
    
    // Position handles
    if (handleStart) {
        handleStart.style.left = `${startPercent}%`;
        handleStart.classList.add('visible');
    }
    if (handleEnd) {
        handleEnd.style.left = `${endPercent}%`;
        handleEnd.classList.add('visible');
    }
    
    // Update selection highlight
    if (selection) {
        selection.style.left = `${startPercent}%`;
        selection.style.width = `${endPercent - startPercent}%`;
        selection.classList.add('active');
    }
    
    // Update tooltips with dates
    if (minDate && maxDate) {
        const range = maxDate.getTime() - minDate.getTime();
        const startDate = new Date(minDate.getTime() + (range * startPercent / 100));
        const endDate = new Date(minDate.getTime() + (range * endPercent / 100));
        
        if (tooltipStart) tooltipStart.textContent = formatShortDate(startDate);
        if (tooltipEnd) tooltipEnd.textContent = formatShortDate(endDate);
    }
    
    // Update bars opacity (in-range vs out-of-range)
    const bars = document.querySelectorAll('.timeline-activity-bar');
    bars.forEach((bar, i) => {
        const percent = (i / TIMELINE_BUCKET_COUNT) * 100;
        const bucketEnd = ((i + 1) / TIMELINE_BUCKET_COUNT) * 100;
        const inRange = bucketEnd >= startPercent && percent <= endPercent;
        bar.classList.toggle('in-range', inRange);
    });
    
    updateTimelineDateLabels();
}

/**
 * Update the date labels above the slider
 */
function updateTimelineDateLabels() {
    const startLabel = document.getElementById('timelineStartDate');
    const endLabel = document.getElementById('timelineEndDate');
    const selectedLabel = document.getElementById('timelineSelectedRange');
    
    const { minDate, maxDate, startPercent, endPercent } = timelineSliderData;
    
    if (!minDate || !maxDate) return;
    
    // Show overall range
    if (startLabel) startLabel.textContent = formatShortDate(minDate);
    if (endLabel) endLabel.textContent = formatShortDate(maxDate);
    
    // Show selected range
    if (selectedLabel && startPercent !== 0 || endPercent !== 100) {
        const range = maxDate.getTime() - minDate.getTime();
        const selectedStart = new Date(minDate.getTime() + (range * startPercent / 100));
        const selectedEnd = new Date(minDate.getTime() + (range * endPercent / 100));
        selectedLabel.textContent = `${formatShortDate(selectedStart)} → ${formatShortDate(selectedEnd)}`;
    } else if (selectedLabel) {
        selectedLabel.textContent = 'All time';
    }
}

/**
 * Apply the current timeline range to filters
 */
function applyTimelineRange() {
    const { minDate, maxDate, startPercent, endPercent } = timelineSliderData;
    
    if (!minDate || !maxDate) return;
    
    const range = maxDate.getTime() - minDate.getTime();
    const startDate = new Date(minDate.getTime() + (range * startPercent / 100));
    const endDate = new Date(minDate.getTime() + (range * endPercent / 100));
    
    // Update the date inputs
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    
    if (startPercent > 0 || endPercent < 100) {
        if (dateFromInput) dateFromInput.value = startDate.toISOString().split('T')[0];
        if (dateToInput) dateToInput.value = endDate.toISOString().split('T')[0];
    } else {
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';
    }
    
    // Update zoom preset buttons
    updateZoomPresetButtons();
    
    // Clear quick date range buttons active state
    document.querySelectorAll('.date-quick-btn').forEach(btn => btn.classList.remove('active'));
    
    applyFilters();
}

/**
 * Set timeline zoom preset
 */
function setTimelineZoom(preset) {
    const { maxDate } = timelineSliderData;
    if (!maxDate) return;
    
    const now = maxDate;
    let startDate;
    
    switch (preset) {
        case '1d':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '1w':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '1m':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'all':
        default:
            resetTimelineSlider();
            return;
    }
    
    // Calculate percentages
    const { minDate } = timelineSliderData;
    const range = maxDate.getTime() - minDate.getTime();
    
    if (range === 0) return;
    
    const startPercent = Math.max(0, ((startDate.getTime() - minDate.getTime()) / range) * 100);
    
    timelineSliderData.startPercent = startPercent;
    timelineSliderData.endPercent = 100;
    
    updateSliderUI();
    applyTimelineRange();
}

/**
 * Update zoom preset button active states
 */
function updateZoomPresetButtons() {
    const { startPercent, endPercent, minDate, maxDate } = timelineSliderData;
    
    document.querySelectorAll('.zoom-preset-btn').forEach(btn => btn.classList.remove('active'));
    
    if (startPercent === 0 && endPercent === 100) {
        document.querySelector('.zoom-preset-btn[data-zoom="all"]')?.classList.add('active');
        return;
    }
    
    if (!minDate || !maxDate) return;
    
    const range = maxDate.getTime() - minDate.getTime();
    const selectedRange = range * (endPercent - startPercent) / 100;
    const selectedEnd = minDate.getTime() + (range * endPercent / 100);
    
    // Check if end is at max (within 1 hour tolerance)
    const isAtEnd = Math.abs(selectedEnd - maxDate.getTime()) < 60 * 60 * 1000;
    
    if (!isAtEnd) return;
    
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    
    // Check which preset matches (within 10% tolerance)
    const tolerance = 0.1;
    if (Math.abs(selectedRange - oneDay) / oneDay < tolerance) {
        document.querySelector('.zoom-preset-btn[data-zoom="1d"]')?.classList.add('active');
    } else if (Math.abs(selectedRange - oneWeek) / oneWeek < tolerance) {
        document.querySelector('.zoom-preset-btn[data-zoom="1w"]')?.classList.add('active');
    } else if (Math.abs(selectedRange - oneMonth) / oneMonth < tolerance) {
        document.querySelector('.zoom-preset-btn[data-zoom="1m"]')?.classList.add('active');
    }
}

/**
 * Reset timeline slider to show all
 */
function resetTimelineSlider() {
    timelineSliderData.startPercent = 0;
    timelineSliderData.endPercent = 100;
    
    // Hide handles and selection
    const handleStart = document.getElementById('timelineHandleStart');
    const handleEnd = document.getElementById('timelineHandleEnd');
    const selection = document.getElementById('timelineSliderSelection');
    
    if (handleStart) handleStart.classList.remove('visible');
    if (handleEnd) handleEnd.classList.remove('visible');
    if (selection) selection.classList.remove('active');
    
    // Update bars
    document.querySelectorAll('.timeline-activity-bar').forEach(bar => bar.classList.add('in-range'));
    
    updateTimelineDateLabels();
    updateZoomPresetButtons();
    
    // Clear date inputs
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    
    applyFilters();
}

/**
 * Sync timeline slider when date inputs change externally
 */
function syncTimelineSliderFromInputs() {
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    const { minDate, maxDate } = timelineSliderData;
    
    if (!minDate || !maxDate) return;
    
    const range = maxDate.getTime() - minDate.getTime();
    if (range === 0) return;
    
    if (!dateFromInput?.value && !dateToInput?.value) {
        // Reset to show all
        timelineSliderData.startPercent = 0;
        timelineSliderData.endPercent = 100;
    } else {
        const fromDate = dateFromInput?.value ? new Date(dateFromInput.value + 'T00:00:00') : minDate;
        const toDate = dateToInput?.value ? new Date(dateToInput.value + 'T23:59:59') : maxDate;
        
        timelineSliderData.startPercent = Math.max(0, ((fromDate.getTime() - minDate.getTime()) / range) * 100);
        timelineSliderData.endPercent = Math.min(100, ((toDate.getTime() - minDate.getTime()) / range) * 100);
    }
    
    updateSliderUI();
    updateZoomPresetButtons();
}

function renderFilteredActivities(activities) {
    let filtered = activities;
    
    // Apply type filter
    if (currentTypeFilter !== 'all') {
        filtered = filtered.filter(a => a.type === currentTypeFilter);
    }
    
    // Apply tag filter
    if (currentTagFilter) {
        filtered = filtered.filter(a => 
            a.tags && Array.isArray(a.tags) && a.tags.includes(currentTagFilter)
        );
    }
    
    // Apply wallet filter
    if (currentWalletFilter) {
        filtered = filtered.filter(a => {
            const wallet = a.wallet || (a.signature ? DEFAULT_WALLET : null);
            return wallet === currentWalletFilter;
        });
    }
    
    // Apply date range filter
    if (currentDateFrom || currentDateTo) {
        filtered = filtered.filter(a => {
            const activityDate = new Date(a.timestamp);
            if (currentDateFrom && activityDate < currentDateFrom) return false;
            if (currentDateTo && activityDate > currentDateTo) return false;
            return true;
        });
    }
    
    // Apply search filter (with optional fuzzy matching)
    if (currentSearchQuery) {
        if (fuzzySearchEnabled) {
            // Use fuzzy search with scoring
            const searchResults = filtered.map(a => ({
                activity: a,
                ...fuzzySearchActivity(a, currentSearchQuery)
            })).filter(r => r.matches);
            
            // Sort by relevance score (highest first)
            searchResults.sort((a, b) => b.score - a.score);
            filtered = searchResults.map(r => r.activity);
        } else {
            // Use exact substring matching (faster)
            filtered = filtered.filter(a => {
                const desc = (a.description || '').toLowerCase();
                const type = (a.type || '').toLowerCase();
                const hash = (a.hash || '').toLowerCase();
                const metadata = JSON.stringify(a.metadata || {}).toLowerCase();
                const tags = (a.tags || []).join(' ').toLowerCase();
                const wallet = (a.wallet || '').toLowerCase();
                return desc.includes(currentSearchQuery) || 
                       type.includes(currentSearchQuery) ||
                       hash.includes(currentSearchQuery) ||
                       metadata.includes(currentSearchQuery) ||
                       tags.includes(currentSearchQuery) ||
                       wallet.includes(currentSearchQuery);
            });
        }
    }
    
    // Apply bookmark filter
    if (window.bookmarkFilterActive) {
        const bookmarks = getBookmarks();
        filtered = filtered.filter(a => {
            const hash = a.hash || a.proof?.hash;
            return hash && bookmarks.has(hash);
        });
    }
    
    // Apply status filter
    if (currentStatusFilter !== 'all') {
        filtered = filtered.filter(a => {
            const activityStatus = a.status || 'completed';
            return activityStatus === currentStatusFilter;
        });
    }
    
    // Apply sentiment filter
    if (typeof currentSentimentFilter !== 'undefined' && currentSentimentFilter !== 'all') {
        filtered = filtered.filter(a => {
            const { sentiment } = analyzeSentiment(a);
            return sentiment === currentSentimentFilter;
        });
    }
    
    // Update filter stats
    const statsEl = document.getElementById('filterStats');
    if (statsEl) {
        const hasDateFilter = currentDateFrom || currentDateTo;
        const isFiltered = currentTypeFilter !== 'all' || currentSearchQuery || currentTagFilter || currentWalletFilter || hasDateFilter || window.bookmarkFilterActive || currentStatusFilter !== 'all';
        if (isFiltered) {
            const filterParts = [];
            if (window.bookmarkFilterActive) filterParts.push('⭐ bookmarked');
            if (currentTypeFilter !== 'all') filterParts.push(`type: ${currentTypeFilter}`);
            if (currentTagFilter) filterParts.push(`tag: ${currentTagFilter}`);
            if (currentWalletFilter) filterParts.push(`wallet: ${getWalletName(currentWalletFilter)}`);
            if (currentStatusFilter !== 'all') filterParts.push(`status: ${currentStatusFilter}`);
            if (hasDateFilter) {
                const fromStr = currentDateFrom ? currentDateFrom.toLocaleDateString() : '...';
                const toStr = currentDateTo ? currentDateTo.toLocaleDateString() : '...';
                filterParts.push(`date: ${fromStr} → ${toStr}`);
            }
            if (currentSearchQuery) filterParts.push(`search: "${currentSearchQuery}"`);
            statsEl.innerHTML = `Showing <span class="count">${filtered.length}</span> of ${activities.length} activities`;
            statsEl.classList.add('visible');
            
            // Announce filter results to screen readers
            announceToScreenReader(`Filtered to ${filtered.length} of ${activities.length} activities`);
        } else {
            statsEl.classList.remove('visible');
        }
    }
    
    // Render the filtered activities
    const feed = document.getElementById('feed');
    if (!filtered.length) {
        const hasDateFilter = currentDateFrom || currentDateTo;
        const hasFilters = currentTypeFilter !== 'all' || currentSearchQuery || currentTagFilter || currentWalletFilter || hasDateFilter || currentStatusFilter !== 'all';
        feed.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${hasFilters ? '🔍' : '🤖'}</div>
                <h4>${hasFilters ? 'No Matching Activities' : 'Agent Warming Up'}</h4>
                <p>${hasFilters 
                    ? `No activities match your current filters. Try adjusting your search, type, wallet, date range, or tag filters.`
                    : 'Activities will appear here as the agent works — commits, builds, trades, and more.'
                }</p>
                ${hasFilters ? `
                <button class="reset-filters-btn" onclick="resetFilters()">
                    ↺ Reset Filters
                </button>
                ` : ''}
            </div>
        `;
        return;
    }
    
    // Use day-grouped rendering for filtered activities
    feed.innerHTML = renderGroupedActivitiesFiltered(filtered);
}

/**
 * Render filtered activities with day grouping
 * Similar to renderGroupedActivities but uses renderActivityWallet instead of renderWalletBadge
 */
function renderGroupedActivitiesFiltered(activities) {
    const sorted = [...activities].reverse(); // Newest first
    const groups = groupActivitiesByDay(sorted);
    
    let html = '';
    
    // Add expand/collapse all controls
    html += `
        <div class="day-group-controls">
            <button class="day-control-btn" onclick="expandAllDays()" title="Expand all days">
                <span>⊞</span> Expand All
            </button>
            <button class="day-control-btn" onclick="collapseAllDays()" title="Collapse all days">
                <span>⊟</span> Collapse All
            </button>
        </div>
    `;
    
    for (const [dateKey, dayActivities] of groups) {
        const isCollapsed = collapsedDays.has(dateKey);
        const dayLabel = formatDayHeader(dateKey, dayActivities.length);
        const onChainCount = dayActivities.filter(a => a.signature || a.proof?.txSignature).length;
        
        html += `
            <div class="day-group ${isCollapsed ? 'collapsed' : ''}" data-date="${dateKey}" role="region" aria-labelledby="day-label-${dateKey}">
                <div class="day-header" 
                     onclick="toggleDayGroup('${dateKey}')"
                     tabindex="0"
                     role="button"
                     aria-expanded="${!isCollapsed}"
                     aria-controls="day-activities-${dateKey}">
                    <div class="day-header-left">
                        <span class="day-toggle" aria-hidden="true">${isCollapsed ? '▶' : '▼'}</span>
                        <span class="day-label" id="day-label-${dateKey}">${dayLabel}</span>
                    </div>
                    <div class="day-header-right">
                        <span class="day-count">${dayActivities.length} activit${dayActivities.length === 1 ? 'y' : 'ies'}</span>
                        ${onChainCount > 0 ? `<span class="day-onchain">⛓️ ${onChainCount}</span>` : ''}
                    </div>
                </div>
                <div class="day-activities" id="day-activities-${dateKey}">
        `;
        
        dayActivities.forEach((a, dayIndex) => {
            const hash = a.hash || a.proof?.hash;
            const hashDisplay = hash ? `SHA256: ${hash.slice(0, 12)}...${hash.slice(-6)}` : '';
            const tagsHtml = renderActivityTags(a.tags);
            const walletHtml = renderActivityWallet(a);
            const activityId = getActivityId(a);
            const compareSelected = typeof compareSelections !== 'undefined' && compareSelections.includes(hash);
            const compareCheckboxHtml = typeof renderCompareCheckbox === 'function' ? renderCompareCheckbox(hash) : '';
            const bulkSelected = typeof bulkSelections !== 'undefined' && bulkSelections.includes(hash);
            const bulkCheckboxHtml = typeof renderBulkCheckbox === 'function' ? renderBulkCheckbox(hash) : '';
            
            html += `
                <div class="activity-item ${a.type}${compareSelected ? ' compare-selected' : ''}${bulkSelected ? ' bulk-selected' : ''}" 
                     style="animation-delay: ${Math.min(dayIndex, 5) * 0.04}s" 
                     data-activity-id="${activityId}"
                     data-hash="${hash || ''}"
                     tabindex="0"
                     role="article"
                     aria-label="${a.type} activity: ${escapeHtml(a.description.substring(0, 80))}${a.description.length > 80 ? '...' : ''}">
                    ${compareCheckboxHtml}
                    ${bulkCheckboxHtml}
                    ${renderShareButton(activityId, hash)}
                    <div class="activity-header">
                        <div class="activity-badges">
                            <span class="activity-type">${a.type}</span>
                            ${getProofBadge(a)}
                            ${walletHtml}
                        </div>
                        <div class="activity-time">${formatTime(a.timestamp)}</div>
                    </div>
                    <div class="activity-desc">${escapeHtml(a.description)}</div>
                    ${tagsHtml}
                    <div class="activity-footer">
                        ${hashDisplay ? `<div class="activity-hash">${hashDisplay}</div>` : ''}
                        ${renderActivitySparkline(a)}
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    return html;
}

function renderActivityWallet(activity) {
    // Get wallet from activity or infer from signature
    const wallet = activity.wallet || (activity.signature ? DEFAULT_WALLET : null);
    if (!wallet) return '';
    
    const name = getWalletName(wallet);
    const short = shortWallet(wallet);
    
    // Only show wallet badge if there are multiple wallets in the system
    // For single-wallet systems, the badge is redundant
    const walletFilterDiv = document.getElementById('walletFilters');
    if (!walletFilterDiv || walletFilterDiv.style.display === 'none') return '';
    
    return `<span class="activity-wallet" 
            title="${wallet}" 
            onclick="event.stopPropagation(); setWalletFilter('${escapeHtml(wallet)}')"
            data-wallet="${escapeHtml(wallet)}">
        💳 ${escapeHtml(name)}
    </span>`;
}

// ============================================
// BOOKMARK / FAVORITES SYSTEM (Client-Side)
// ============================================

/**
 * Get bookmarked activity hashes from localStorage
 * @returns {Set} Set of bookmarked hashes
 */
function getBookmarks() {
    try {
        const stored = localStorage.getItem('jarvis-pow-bookmarks');
        return new Set(stored ? JSON.parse(stored) : []);
    } catch (e) {
        console.error('Failed to load bookmarks:', e);
        return new Set();
    }
}

/**
 * Save bookmarks to localStorage
 * @param {Set} bookmarks - Set of hashes to save
 */
function saveBookmarks(bookmarks) {
    try {
        localStorage.setItem('jarvis-pow-bookmarks', JSON.stringify([...bookmarks]));
    } catch (e) {
        console.error('Failed to save bookmarks:', e);
    }
}

/**
 * Check if an activity is bookmarked
 * @param {string} hash - Activity hash
 * @returns {boolean}
 */
function isBookmarked(hash) {
    return getBookmarks().has(hash);
}

/**
 * Toggle bookmark status on an activity
 * @param {string} hash - The activity hash
 */
function toggleBookmark(hash) {
    const bookmarks = getBookmarks();
    const activityItem = document.querySelector(`[data-hash="${hash}"]`);
    const bookmarkBtn = activityItem?.querySelector('.bookmark-btn');
    const wasBookmarked = bookmarks.has(hash);
    
    if (wasBookmarked) {
        bookmarks.delete(hash);
    } else {
        bookmarks.add(hash);
    }
    
    saveBookmarks(bookmarks);
    
    // Update UI
    if (activityItem) {
        activityItem.classList.toggle('bookmarked', !wasBookmarked);
        activityItem.dataset.bookmarked = !wasBookmarked;
        
        // Update button state
        if (bookmarkBtn) {
            bookmarkBtn.classList.toggle('bookmarked', !wasBookmarked);
            bookmarkBtn.innerHTML = !wasBookmarked ? '⭐' : '☆';
            bookmarkBtn.title = !wasBookmarked ? 'Remove bookmark' : 'Add to bookmarks';
            bookmarkBtn.setAttribute('aria-label', !wasBookmarked ? 'Remove bookmark' : 'Add to bookmarks');
        }
        
        // Update badge
        const badges = activityItem.querySelector('.activity-badges');
        const existingBadge = badges?.querySelector('.bookmarked-badge');
        if (!wasBookmarked && !existingBadge) {
            const pinnedBadge = badges?.querySelector('.pinned-badge');
            if (pinnedBadge) {
                pinnedBadge.insertAdjacentHTML('afterend', '<span class="bookmarked-badge" title="Bookmarked">⭐</span>');
            } else {
                badges?.insertAdjacentHTML('afterbegin', '<span class="bookmarked-badge" title="Bookmarked">⭐</span>');
            }
        } else if (wasBookmarked && existingBadge) {
            existingBadge.remove();
        }
    }
    
    // Update bookmark count
    updateBookmarkCount();
    
    // Play sound feedback
    if (typeof playNotificationSound === 'function') {
        playNotificationSound(!wasBookmarked ? 'new' : 'misc');
    }
    
    // Announce to screen readers
    announceToScreenReader(!wasBookmarked ? 'Activity bookmarked' : 'Bookmark removed');
    
    // Re-apply bookmark filter if active
    if (window.bookmarkFilterActive) {
        applyFilters();
    }
}

/**
 * Render bookmark button for an activity
 * @param {string} hash - The activity hash
 * @returns {string} HTML string for the bookmark button
 */
function renderBookmarkButton(hash) {
    if (!hash) return '';
    
    const bookmarked = isBookmarked(hash);
    return `
        <button class="bookmark-btn ${bookmarked ? 'bookmarked' : ''}" 
                onclick="toggleBookmark('${hash}')" 
                title="${bookmarked ? 'Remove bookmark' : 'Add to bookmarks'}"
                aria-label="${bookmarked ? 'Remove bookmark' : 'Add to bookmarks'}">
            ${bookmarked ? '⭐' : '☆'}
        </button>
    `;
}

/**
 * Update bookmark count display in filter button
 */
function updateBookmarkCount() {
    const bookmarks = getBookmarks();
    const countEl = document.getElementById('bookmark-count');
    if (countEl) {
        countEl.textContent = bookmarks.size > 0 ? `(${bookmarks.size})` : '';
    }
}

/**
 * Toggle bookmark filter - show only bookmarked activities
 */
function toggleBookmarkFilter() {
    window.bookmarkFilterActive = !window.bookmarkFilterActive;
    
    const btn = document.getElementById('bookmark-filter-btn');
    if (btn) {
        btn.classList.toggle('active', window.bookmarkFilterActive);
    }
    
    applyFilters();
    
    announceToScreenReader(window.bookmarkFilterActive ? 
        'Showing bookmarked activities only' : 
        'Showing all activities');
}

// Initialize bookmark filter state
window.bookmarkFilterActive = false;

/**
 * Render pin button for an activity
 * @param {string} hash - The activity hash for API calls
 * @param {boolean} isPinned - Current pin status
 * @returns {string} HTML string for the pin button
 */
function renderPinButton(hash, isPinned) {
    if (!hash) return '';
    
    return `
        <button class="pin-btn ${isPinned ? 'pinned' : ''}" 
                onclick="togglePin('${hash}')" 
                title="${isPinned ? 'Unpin activity' : 'Pin to top'}"
                aria-label="${isPinned ? 'Unpin activity' : 'Pin activity to top'}">
            📌
        </button>
    `;
}

/**
 * Toggle pin status on an activity
 * @param {string} hash - The activity hash
 */
async function togglePin(hash) {
    const activityItem = document.querySelector(`[data-hash="${hash}"]`);
    const pinBtn = activityItem?.querySelector('.pin-btn');
    
    if (pinBtn) {
        pinBtn.disabled = true;
        pinBtn.classList.add('loading');
    }
    
    try {
        const response = await fetch(`/api/activities/${hash}/pin`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to toggle pin');
        }
        
        const result = await response.json();
        
        // Update the activity item's pin status
        if (activityItem) {
            activityItem.dataset.pinned = result.pinned;
            activityItem.classList.toggle('pinned', result.pinned);
            
            // Update pin button
            if (pinBtn) {
                pinBtn.classList.toggle('pinned', result.pinned);
                pinBtn.title = result.pinned ? 'Unpin activity' : 'Pin to top';
                pinBtn.setAttribute('aria-label', result.pinned ? 'Unpin activity' : 'Pin activity to top');
            }
            
            // Update badge
            const badges = activityItem.querySelector('.activity-badges');
            const existingBadge = badges?.querySelector('.pinned-badge');
            if (result.pinned && !existingBadge) {
                badges.insertAdjacentHTML('afterbegin', '<span class="pinned-badge" title="Pinned activity">📌</span>');
            } else if (!result.pinned && existingBadge) {
                existingBadge.remove();
            }
        }
        
        // Announce to screen readers
        announceToScreenReader(result.message);
        
        // Re-render to move pinned items to top
        // This triggers a full re-render with correct ordering
        if (window.allActivities) {
            // Update the activity in allActivities
            const idx = window.allActivities.findIndex(a => (a.hash || a.proof?.hash) === hash);
            if (idx !== -1) {
                window.allActivities[idx].pinned = result.pinned;
                window.allActivities[idx].pinnedAt = result.pinnedAt;
            }
            renderActivities(window.allActivities);
        }
        
    } catch (error) {
        console.error('Failed to toggle pin:', error);
        alert(`Failed to toggle pin: ${error.message}`);
    } finally {
        if (pinBtn) {
            pinBtn.disabled = false;
            pinBtn.classList.remove('loading');
        }
    }
}

// ==============================================
// STATUS INDICATOR FUNCTIONS
// ==============================================

/**
 * Render status badge for an activity
 * @param {string} status - The status (pending/completed/failed)
 * @returns {string} HTML string for the status badge
 */
function renderStatusBadge(status) {
    if (!status || status === 'completed') return '';
    
    const statusConfig = {
        pending: { emoji: '⏳', label: 'Pending', class: 'status-pending' },
        failed: { emoji: '❌', label: 'Failed', class: 'status-failed' }
    };
    
    const config = statusConfig[status];
    if (!config) return '';
    
    return `<span class="status-badge ${config.class}" title="${config.label}">${config.emoji}</span>`;
}

/**
 * Render status button for cycling through statuses
 * @param {string} hash - The activity hash
 * @param {string} currentStatus - Current status
 * @returns {string} HTML string for the status button
 */
function renderStatusButton(hash, currentStatus) {
    if (!hash) return '';
    
    const statusConfig = {
        pending: { emoji: '⏳', next: 'completed', title: 'Mark as completed' },
        completed: { emoji: '✅', next: 'failed', title: 'Mark as failed' },
        failed: { emoji: '❌', next: 'pending', title: 'Mark as pending' }
    };
    
    const config = statusConfig[currentStatus] || statusConfig.completed;
    
    return `
        <button class="status-btn status-${currentStatus}" 
                onclick="cycleStatus('${hash}', '${config.next}')" 
                title="${config.title}"
                aria-label="${config.title}">
            ${config.emoji}
        </button>
    `;
}

/**
 * Cycle activity status (pending -> completed -> failed -> pending)
 * @param {string} hash - The activity hash
 * @param {string} newStatus - The new status to set
 */
async function cycleStatus(hash, newStatus) {
    const activityItem = document.querySelector(`[data-hash="${hash}"]`);
    const statusBtn = activityItem?.querySelector('.status-btn');
    
    if (statusBtn) {
        statusBtn.disabled = true;
        statusBtn.classList.add('loading');
    }
    
    try {
        const response = await fetch(`/api/activities/${hash}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update status');
        }
        
        const result = await response.json();
        
        // Update the activity item's status
        if (activityItem) {
            // Remove old status classes
            activityItem.classList.remove('status-pending', 'status-failed');
            activityItem.dataset.status = result.status;
            
            // Add new status class if not completed
            if (result.status !== 'completed') {
                activityItem.classList.add('status-' + result.status);
            }
            
            // Update status button
            const statusConfig = {
                pending: { emoji: '⏳', next: 'completed', title: 'Mark as completed' },
                completed: { emoji: '✅', next: 'failed', title: 'Mark as failed' },
                failed: { emoji: '❌', next: 'pending', title: 'Mark as pending' }
            };
            const config = statusConfig[result.status];
            
            if (statusBtn && config) {
                statusBtn.className = `status-btn status-${result.status}`;
                statusBtn.innerHTML = config.emoji;
                statusBtn.title = config.title;
                statusBtn.setAttribute('aria-label', config.title);
                statusBtn.onclick = () => cycleStatus(hash, config.next);
            }
            
            // Update badge
            const badges = activityItem.querySelector('.activity-badges');
            const existingBadge = badges?.querySelector('.status-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            if (result.status !== 'completed') {
                const badgeConfig = {
                    pending: { emoji: '⏳', label: 'Pending', class: 'status-pending' },
                    failed: { emoji: '❌', label: 'Failed', class: 'status-failed' }
                };
                const bc = badgeConfig[result.status];
                if (bc) {
                    const pinnedBadge = badges?.querySelector('.pinned-badge');
                    const bookmarkBadge = badges?.querySelector('.bookmarked-badge');
                    const insertAfter = bookmarkBadge || pinnedBadge;
                    const newBadge = `<span class="status-badge ${bc.class}" title="${bc.label}">${bc.emoji}</span>`;
                    if (insertAfter) {
                        insertAfter.insertAdjacentHTML('afterend', newBadge);
                    } else {
                        badges.insertAdjacentHTML('afterbegin', newBadge);
                    }
                }
            }
            
            // Update the activity in allActivities array
            const idx = window.allActivities.findIndex(a => (a.hash || a.proof?.hash) === hash);
            if (idx !== -1) {
                if (result.status === 'completed') {
                    delete window.allActivities[idx].status;
                    delete window.allActivities[idx].statusUpdatedAt;
                } else {
                    window.allActivities[idx].status = result.status;
                    window.allActivities[idx].statusUpdatedAt = result.statusUpdatedAt;
                }
            }
        }
        
        showToast(`Status updated to ${result.status}`, 'success');
        
    } catch (error) {
        console.error('Failed to update status:', error);
        showToast(`Failed to update status: ${error.message}`, 'error');
    } finally {
        if (statusBtn) {
            statusBtn.disabled = false;
            statusBtn.classList.remove('loading');
        }
    }
}

/**
 * Render activity notes section with view/edit functionality
 * @param {Object} activity - The activity object
 * @param {string} hash - The activity hash for API calls
 * @returns {string} HTML string for the notes section
 */
function renderActivityNotes(activity, hash) {
    if (!hash) return ''; // Can't edit without a hash
    
    const hasNotes = activity.notes && activity.notes.trim();
    const notesContent = hasNotes ? escapeHtml(activity.notes) : '';
    const shortHash = hash.slice(0, 16);
    
    return `
        <div class="activity-notes-section" data-hash="${hash}">
            ${hasNotes ? `
                <div class="activity-notes-display" id="notes-display-${shortHash}">
                    <div class="activity-notes-header">
                        <span class="activity-notes-icon">📝</span>
                        <span class="activity-notes-label">Note</span>
                        <button class="notes-edit-btn" onclick="toggleNotesEdit('${hash}')" title="Edit note" aria-label="Edit note">
                            ✏️
                        </button>
                    </div>
                    <div class="activity-notes-content">${notesContent}</div>
                </div>
            ` : `
                <button class="notes-add-btn" id="notes-add-${shortHash}" onclick="toggleNotesEdit('${hash}')" title="Add a note">
                    📝 Add note
                </button>
            `}
            <div class="activity-notes-edit" id="notes-edit-${shortHash}" style="display: none;">
                <textarea 
                    class="notes-textarea" 
                    id="notes-textarea-${shortHash}"
                    placeholder="Add a note to this activity..."
                    maxlength="1000"
                    rows="2"
                >${notesContent}</textarea>
                <div class="notes-edit-actions">
                    <span class="notes-char-count" id="notes-count-${shortHash}">${notesContent.length}/1000</span>
                    <button class="notes-cancel-btn" onclick="cancelNotesEdit('${hash}')">Cancel</button>
                    <button class="notes-save-btn" onclick="saveActivityNotes('${hash}')">Save</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Toggle notes edit mode for an activity
 * @param {string} hash - The activity hash
 */
function toggleNotesEdit(hash) {
    const shortHash = hash.slice(0, 16);
    const editSection = document.getElementById(`notes-edit-${shortHash}`);
    const displaySection = document.getElementById(`notes-display-${shortHash}`);
    const addBtn = document.getElementById(`notes-add-${shortHash}`);
    const textarea = document.getElementById(`notes-textarea-${shortHash}`);
    
    if (editSection) {
        const isHidden = editSection.style.display === 'none';
        editSection.style.display = isHidden ? 'block' : 'none';
        
        if (displaySection) displaySection.style.display = isHidden ? 'none' : 'block';
        if (addBtn) addBtn.style.display = isHidden ? 'none' : 'inline-flex';
        
        if (isHidden && textarea) {
            textarea.focus();
            // Update character count
            updateNotesCharCount(hash);
            textarea.addEventListener('input', () => updateNotesCharCount(hash));
        }
    }
}

/**
 * Cancel notes edit mode
 * @param {string} hash - The activity hash
 */
function cancelNotesEdit(hash) {
    const shortHash = hash.slice(0, 16);
    const editSection = document.getElementById(`notes-edit-${shortHash}`);
    const displaySection = document.getElementById(`notes-display-${shortHash}`);
    const addBtn = document.getElementById(`notes-add-${shortHash}`);
    const textarea = document.getElementById(`notes-textarea-${shortHash}`);
    
    if (editSection) editSection.style.display = 'none';
    if (displaySection) displaySection.style.display = 'block';
    if (addBtn) addBtn.style.display = 'inline-flex';
    
    // Reset textarea to original value
    if (textarea) {
        const activityItem = textarea.closest('.activity-item');
        if (activityItem) {
            const notesContent = activityItem.querySelector('.activity-notes-content');
            textarea.value = notesContent ? notesContent.textContent : '';
        }
    }
}

/**
 * Update character count for notes textarea
 * @param {string} hash - The activity hash
 */
function updateNotesCharCount(hash) {
    const shortHash = hash.slice(0, 16);
    const textarea = document.getElementById(`notes-textarea-${shortHash}`);
    const countEl = document.getElementById(`notes-count-${shortHash}`);
    
    if (textarea && countEl) {
        const length = textarea.value.length;
        countEl.textContent = `${length}/1000`;
        countEl.classList.toggle('near-limit', length > 900);
        countEl.classList.toggle('at-limit', length >= 1000);
    }
}

/**
 * Save activity notes via API
 * @param {string} hash - The activity hash
 */
async function saveActivityNotes(hash) {
    const shortHash = hash.slice(0, 16);
    const textarea = document.getElementById(`notes-textarea-${shortHash}`);
    const saveBtn = document.querySelector(`#notes-edit-${shortHash} .notes-save-btn`);
    
    if (!textarea) return;
    
    const notes = textarea.value.trim();
    
    // Disable button while saving
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }
    
    try {
        const response = await fetch(`/api/activities/${hash}/notes`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save notes');
        }
        
        // Update the local activity data
        const activityItem = textarea.closest('.activity-item');
        if (activityItem) {
            // Refresh the notes section
            const notesSection = activityItem.querySelector('.activity-notes-section');
            if (notesSection) {
                // Create a mock activity with the new notes
                const mockActivity = { notes: notes || null };
                notesSection.outerHTML = renderActivityNotes(mockActivity, hash);
            }
        }
        
        // Show success feedback
        announceToScreenReader(`Note ${notes ? 'saved' : 'removed'} successfully`);
        
    } catch (error) {
        console.error('Failed to save notes:', error);
        alert(`Failed to save notes: ${error.message}`);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    }
}

/**
 * Render attachments section for an activity
 * @param {Object} activity - The activity object
 * @param {string} hash - The activity hash
 * @returns {string} HTML string for the attachments section
 */
function renderActivityAttachments(activity, hash) {
    const attachments = activity.attachments || [];
    if (attachments.length === 0) return '';
    
    const attachmentItems = attachments.map(att => {
        const typeIcon = att.type === 'image' ? '🖼️' : att.type === 'file' ? '📄' : '🔗';
        const isImage = att.type === 'image' || (att.mimeType && att.mimeType.startsWith('image/'));
        const sizeStr = att.size ? ` (${formatBytes(att.size)})` : '';
        
        if (isImage) {
            return `
                <a href="${escapeHtml(att.url)}" target="_blank" rel="noopener" class="attachment-item attachment-image" title="${escapeHtml(att.name)}">
                    <img src="${escapeHtml(att.url)}" alt="${escapeHtml(att.name)}" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><text y=%2232%22 font-size=%2232%22>🖼️</text></svg>';">
                    <span class="attachment-name">${escapeHtml(att.name)}</span>
                </a>
            `;
        }
        
        return `
            <a href="${escapeHtml(att.url)}" target="_blank" rel="noopener" class="attachment-item attachment-${att.type}" title="${escapeHtml(att.name)}${sizeStr}">
                <span class="attachment-icon">${typeIcon}</span>
                <span class="attachment-name">${escapeHtml(att.name)}</span>
                ${sizeStr ? `<span class="attachment-size">${sizeStr}</span>` : ''}
            </a>
        `;
    }).join('');
    
    return `
        <div class="activity-attachments" data-hash="${hash}">
            <div class="attachments-header">
                <span class="attachments-icon">📎</span>
                <span class="attachments-label">Attachments (${attachments.length})</span>
            </div>
            <div class="attachments-list">${attachmentItems}</div>
        </div>
    `;
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ============================================
// IMPORTANCE SCORING
// ============================================

/**
 * Type weights for activity importance scoring.
 */
const IMPORTANCE_TYPE_WEIGHTS = {
    'deploy': 30, 'decision': 30, 'build': 28, 'commit': 25, 'trade': 25,
    'transfer': 22, 'email': 20, 'calendar': 18, 'research': 15, 'browser': 12,
    'message': 10, 'tweet': 10, 'session': 8, 'heartbeat': 5
};

/**
 * Keywords that boost importance.
 */
const IMPORTANCE_KEYWORDS = {
    'critical': 15, 'urgent': 15, 'emergency': 15, 'breaking': 15, 'outage': 15,
    'milestone': 12, 'deployed': 12, 'shipped': 12, 'launched': 12, 'released': 12,
    'fix': 10, 'bug': 10, 'security': 10, 'production': 10, 'hotfix': 10,
    'feature': 8, 'implement': 8, 'complete': 8, 'finished': 8, 'added': 8,
    'progress': 5, 'update': 5, 'improve': 5, 'refactor': 5, 'cycle': 5
};

/**
 * Calculate importance score for an activity (client-side mirror of server logic).
 * @param {Object} activity - The activity object
 * @returns {Object} Importance score with level, emoji, and score
 */
function calculateImportance(activity) {
    let score = 0;
    
    // Type weight (0-30)
    const type = (activity.type || '').toLowerCase();
    score += IMPORTANCE_TYPE_WEIGHTS[type] || 10;
    
    // Keyword boost (0-25)
    const text = ((activity.description || '') + ' ' + JSON.stringify(activity.metadata || {})).toLowerCase();
    let keywordBoost = 0;
    for (const [kw, pts] of Object.entries(IMPORTANCE_KEYWORDS)) {
        if (text.includes(kw)) keywordBoost += pts;
    }
    score += Math.min(keywordBoost, 25);
    
    // Metadata richness (0-15)
    if (activity.metadata && Object.keys(activity.metadata).length > 0) {
        score += Math.min(5 + Object.keys(activity.metadata).length * 2, 15);
    }
    
    // On-chain bonus (0-15)
    if (activity.signature) score += 15;
    
    // Time pattern (0-15)
    try {
        const ts = new Date(activity.timestamp);
        const hour = ts.getUTCHours();
        const day = ts.getUTCDay();
        if (hour >= 9 && hour <= 18) score += 10;
        else if (hour >= 6 && hour <= 22) score += 5;
        if (day === 0 || day === 6) score += 5;
    } catch (e) {}
    
    score = Math.min(score, 100);
    
    // Determine level
    let level, emoji;
    if (score >= 80) { level = 'critical'; emoji = '🔴'; }
    else if (score >= 60) { level = 'high'; emoji = '🟠'; }
    else if (score >= 40) { level = 'medium'; emoji = '🟡'; }
    else if (score >= 20) { level = 'low'; emoji = '🟢'; }
    else { level = 'minimal'; emoji = '⚪'; }
    
    return { score, level, emoji };
}

/**
 * Render importance badge for an activity.
 * @param {Object} activity - The activity object
 * @returns {string} HTML string for importance badge
 */
function renderImportanceBadge(activity) {
    const { score, level, emoji } = calculateImportance(activity);
    return `<span class="importance-badge importance-${level}" title="Importance: ${score}/100 (${level})">${emoji} ${score}</span>`;
}

// ============================================
// SENTIMENT ANALYSIS
// ============================================

/**
 * Positive sentiment words and their weights
 * Higher weight = stronger positive signal
 */
const SENTIMENT_POSITIVE_WORDS = {
    // Success indicators
    'success': 3, 'successful': 3, 'succeeded': 3, 'complete': 2, 'completed': 2,
    'accomplish': 3, 'accomplished': 3, 'achieve': 3, 'achieved': 3, 'done': 1,
    'finished': 2, 'win': 3, 'won': 3, 'perfect': 3, 'excellent': 3,
    // Improvement
    'improve': 2, 'improved': 2, 'improvement': 2, 'better': 2, 'enhance': 2,
    'enhanced': 2, 'upgrade': 2, 'upgraded': 2, 'optimize': 2, 'optimized': 2,
    // Creation/Building
    'create': 2, 'created': 2, 'build': 2, 'built': 2, 'implement': 2,
    'implemented': 2, 'add': 1, 'added': 1, 'new': 1, 'launch': 3, 'launched': 3,
    'ship': 2, 'shipped': 2, 'deploy': 2, 'deployed': 2, 'release': 2, 'released': 2,
    // Fix/Resolution
    'fix': 2, 'fixed': 2, 'resolve': 2, 'resolved': 2, 'solve': 2, 'solved': 2,
    'repair': 2, 'repaired': 2, 'patch': 1, 'patched': 1,
    // Positive emotions
    'great': 2, 'good': 1, 'nice': 1, 'awesome': 3, 'amazing': 3, 'fantastic': 3,
    'wonderful': 3, 'happy': 2, 'excited': 2, 'proud': 2, 'love': 2, 'loved': 2,
    // Progress
    'progress': 2, 'advance': 2, 'advanced': 2, 'forward': 1, 'growth': 2,
    'grow': 2, 'grew': 2, 'expand': 2, 'expanded': 2, 'increase': 1, 'increased': 1,
    // Positive outcomes
    'profit': 3, 'gain': 2, 'gains': 2, 'earn': 2, 'earned': 2, 'reward': 2,
    'bonus': 2, 'milestone': 2, 'achievement': 3, 'breakthrough': 3,
    // Verification
    'verified': 2, 'confirmed': 2, 'approved': 2, 'passed': 2, 'valid': 1,
    // Productivity
    'productive': 2, 'efficient': 2, 'effective': 2, 'working': 1, 'works': 2
};

/**
 * Negative sentiment words and their weights
 * Higher weight = stronger negative signal
 */
const SENTIMENT_NEGATIVE_WORDS = {
    // Failure indicators
    'fail': 3, 'failed': 3, 'failure': 3, 'error': 2, 'errors': 2,
    'bug': 2, 'bugs': 2, 'issue': 1, 'issues': 1, 'problem': 2, 'problems': 2,
    'broken': 3, 'break': 2, 'broke': 2, 'crash': 3, 'crashed': 3, 'crashes': 3,
    // Negative outcomes
    'loss': 3, 'lost': 2, 'lose': 2, 'losing': 2, 'miss': 1, 'missed': 2,
    'missing': 2, 'reject': 2, 'rejected': 3, 'deny': 2, 'denied': 2,
    // Difficulty
    'difficult': 1, 'hard': 1, 'struggle': 2, 'struggling': 2, 'stuck': 2,
    'block': 1, 'blocked': 2, 'blocker': 2, 'obstacle': 2,
    // Destruction
    'delete': 1, 'deleted': 1, 'remove': 1, 'removed': 1, 'destroy': 2,
    'destroyed': 2, 'revert': 2, 'reverted': 2, 'rollback': 2, 'undo': 1,
    // Negative emotions
    'bad': 2, 'terrible': 3, 'awful': 3, 'horrible': 3, 'worst': 3,
    'wrong': 2, 'sad': 2, 'angry': 2, 'frustrated': 2, 'annoyed': 2,
    'worried': 1, 'concern': 1, 'concerned': 1, 'anxious': 2,
    // Problems
    'warning': 1, 'warnings': 1, 'critical': 2, 'severe': 3, 'urgent': 2,
    'emergency': 3, 'alert': 1, 'alarm': 2, 'danger': 2, 'risk': 1, 'risky': 2,
    // Technical issues
    'timeout': 2, 'exception': 2, 'invalid': 2, 'malformed': 2, 'corrupt': 3,
    'corrupted': 3, 'overflow': 2, 'leak': 2, 'vulnerability': 3, 'exploit': 3,
    // Delays
    'delay': 1, 'delayed': 2, 'slow': 1, 'slower': 2, 'late': 1, 'overdue': 2,
    // Decline
    'decline': 2, 'declined': 2, 'decrease': 1, 'decreased': 1, 'drop': 1, 'dropped': 2,
    'down': 1, 'downgrade': 2, 'downgraded': 2, 'regression': 3
};

/**
 * Current sentiment filter state
 */
let currentSentimentFilter = 'all';

/**
 * Analyze sentiment of an activity.
 * @param {Object} activity - The activity object
 * @returns {Object} Sentiment analysis result { sentiment, score, emoji, confidence }
 */
function analyzeSentiment(activity) {
    const text = ((activity.description || '') + ' ' + 
                  JSON.stringify(activity.metadata || {})).toLowerCase();
    
    let positiveScore = 0;
    let negativeScore = 0;
    let positiveMatches = 0;
    let negativeMatches = 0;
    
    // Count positive words
    for (const [word, weight] of Object.entries(SENTIMENT_POSITIVE_WORDS)) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = (text.match(regex) || []).length;
        if (matches > 0) {
            positiveScore += weight * matches;
            positiveMatches += matches;
        }
    }
    
    // Count negative words
    for (const [word, weight] of Object.entries(SENTIMENT_NEGATIVE_WORDS)) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = (text.match(regex) || []).length;
        if (matches > 0) {
            negativeScore += weight * matches;
            negativeMatches += matches;
        }
    }
    
    // Calculate net score (-100 to +100)
    const totalMatches = positiveMatches + negativeMatches;
    const netScore = positiveScore - negativeScore;
    
    // Determine confidence (0-1) based on number of matched words
    const confidence = Math.min(totalMatches / 5, 1);
    
    // Determine sentiment category
    let sentiment, emoji;
    if (totalMatches === 0) {
        // No sentiment words found - neutral
        sentiment = 'neutral';
        emoji = '😐';
    } else if (netScore > 3) {
        sentiment = 'positive';
        emoji = '😊';
    } else if (netScore < -3) {
        sentiment = 'negative';
        emoji = '😟';
    } else {
        sentiment = 'neutral';
        emoji = '😐';
    }
    
    return {
        sentiment,
        score: netScore,
        emoji,
        confidence,
        positiveScore,
        negativeScore,
        positiveMatches,
        negativeMatches
    };
}

/**
 * Render sentiment badge for an activity.
 * @param {Object} activity - The activity object
 * @returns {string} HTML string for sentiment badge
 */
function renderSentimentBadge(activity) {
    const { sentiment, score, emoji, confidence } = analyzeSentiment(activity);
    
    // Only show badge if we have some confidence
    if (confidence < 0.2) {
        return `<span class="sentiment-badge sentiment-neutral" title="Sentiment: neutral (low confidence)">😐</span>`;
    }
    
    const scoreDisplay = score > 0 ? `+${score}` : score;
    const confidencePercent = Math.round(confidence * 100);
    const tooltip = `Sentiment: ${sentiment} (score: ${scoreDisplay}, confidence: ${confidencePercent}%)`;
    
    return `<span class="sentiment-badge sentiment-${sentiment}" title="${tooltip}">${emoji}</span>`;
}

/**
 * Set the sentiment filter and re-render activities.
 * @param {string} sentiment - 'all', 'positive', 'negative', or 'neutral'
 */
function setSentimentFilter(sentiment) {
    currentSentimentFilter = sentiment;
    
    // Update button states
    document.querySelectorAll('.sentiment-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sentiment === sentiment);
        btn.setAttribute('aria-pressed', btn.dataset.sentiment === sentiment);
    });
    
    applyFilters();
    
    // Announce for screen readers
    announceToScreenReader(`Filtered to ${sentiment === 'all' ? 'all sentiments' : sentiment + ' activities'}`);
}

// Make sentiment functions globally available
window.setSentimentFilter = setSentimentFilter;
window.analyzeSentiment = analyzeSentiment;
window.renderSentimentBadge = renderSentimentBadge;

// ============================================================
// AI SUMMARY - Local keyword-based activity summarization
// ============================================================

/**
 * Keywords for extracting entities from activity descriptions
 */
const AI_SUMMARY_PATTERNS = {
    // Technical entities
    files: /(?:[\w-]+\.(?:ts|js|tsx|jsx|css|html|json|md|py|rs|go|java|sh|yml|yaml))/gi,
    urls: /(?:https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi,
    commits: /(?:[a-f0-9]{7,40})/gi,
    numbers: /(?:\d+(?:\.\d+)?(?:\s*(?:SOL|USDC|USD|%|ms|sec|min|hr|KB|MB|GB))?)/gi,
    functions: /(?:[\w]+(?:Component|Handler|Listener|Manager|Service|Provider|Hook|Modal|Button|Chart|View|Page))/g,
    versions: /(?:v?\d+\.\d+(?:\.\d+)?(?:-[a-z]+(?:\.\d+)?)?)/gi,
    
    // Activity type-specific
    trades: /(?:(?:buy|sell|swap|trade|stake|unstake)(?:ing)?)/gi,
    apis: /(?:\/api\/[\w/-]+|GET|POST|PUT|DELETE|PATCH)/gi,
    features: /(?:(?:add|implement|create|build|fix|update|refactor|optimize|enhance)(?:ed|ing)?)/gi
};

/**
 * Summary templates by activity type
 */
const AI_SUMMARY_TEMPLATES = {
    commit: [
        (data) => `Code ${data.action || 'changes'} affecting ${data.fileCount || 'files'}${data.mainFile ? ` (${data.mainFile})` : ''}.`,
        (data) => data.action ? `${capitalize(data.action)} implementation${data.mainFile ? ` in ${data.mainFile}` : ''}.` : 'Code changes committed.'
    ],
    build: [
        (data) => `Build cycle ${data.number ? '#' + data.number : ''} - ${data.features?.length ? data.features.join(', ') : 'development work'}.`,
        (data) => `Engineering work${data.features?.length ? `: ${data.features.slice(0, 2).join(', ')}` : ''}.`
    ],
    trade: [
        (data) => `${capitalize(data.tradeAction || 'Trade')} activity${data.amounts?.length ? ` involving ${data.amounts[0]}` : ''}.`,
        (data) => `Swap/trade executed${data.amounts?.length ? ` (${data.amounts.slice(0, 2).join(' → ')})` : ''}.`
    ],
    message: [
        (data) => `Communication activity${data.platform ? ` on ${data.platform}` : ''}.`,
        (data) => 'Message sent/received.'
    ],
    tweet: [
        (data) => `Social post${data.metrics ? ` (${data.metrics})` : ''}.`,
        (data) => 'Twitter/social media activity.'
    ],
    email: [
        (data) => `Email ${data.action || 'activity'}${data.recipient ? ` to ${data.recipient}` : ''}.`,
        (data) => 'Email communication.'
    ],
    calendar: [
        (data) => `Calendar ${data.action || 'event'}${data.eventName ? `: ${data.eventName}` : ''}.`,
        (data) => 'Calendar activity.'
    ],
    browser: [
        (data) => `Web research${data.domain ? ` on ${data.domain}` : ''}.`,
        (data) => 'Browser/research activity.'
    ],
    default: [
        (data) => `${capitalize(data.type || 'Activity')} recorded${data.keyInfo ? `: ${data.keyInfo}` : ''}.`,
        (data) => 'Activity logged.'
    ]
};

/**
 * Whether AI summaries are enabled
 */
let aiSummariesEnabled = localStorage.getItem('aiSummariesEnabled') === 'true';

/**
 * Capitalize first letter
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Extract key data from activity description for summarization
 * @param {Object} activity - The activity object
 * @returns {Object} Extracted data
 */
function extractActivityData(activity) {
    const text = activity.description || '';
    const type = activity.type || 'unknown';
    
    const data = {
        type,
        text,
        // Extract files
        files: (text.match(AI_SUMMARY_PATTERNS.files) || []).filter((v, i, a) => a.indexOf(v) === i),
        // Extract URLs
        urls: (text.match(AI_SUMMARY_PATTERNS.urls) || []).filter((v, i, a) => a.indexOf(v) === i),
        // Extract numbers/amounts
        amounts: (text.match(AI_SUMMARY_PATTERNS.numbers) || []).filter((v, i, a) => a.indexOf(v) === i),
        // Extract functions/components
        functions: (text.match(AI_SUMMARY_PATTERNS.functions) || []).filter((v, i, a) => a.indexOf(v) === i),
        // Extract feature keywords
        features: (text.match(AI_SUMMARY_PATTERNS.features) || []).filter((v, i, a) => a.indexOf(v) === i),
        // Extract trade actions
        tradeActions: (text.match(AI_SUMMARY_PATTERNS.trades) || []).filter((v, i, a) => a.indexOf(v) === i),
        // Extract API paths
        apis: (text.match(AI_SUMMARY_PATTERNS.apis) || []).filter((v, i, a) => a.indexOf(v) === i),
        // Extract versions
        versions: (text.match(AI_SUMMARY_PATTERNS.versions) || []).filter((v, i, a) => a.indexOf(v) === i)
    };
    
    // Derive additional info
    data.fileCount = data.files.length || null;
    data.mainFile = data.files[0] || null;
    data.action = data.features[0] || null;
    data.tradeAction = data.tradeActions[0] || null;
    
    // Check for cycle number in build activities
    const cycleMatch = text.match(/Cycle\s*(\d+)/i);
    if (cycleMatch) {
        data.number = cycleMatch[1];
    }
    
    // Extract domain from URLs
    if (data.urls.length > 0) {
        try {
            const url = new URL(data.urls[0]);
            data.domain = url.hostname.replace('www.', '');
        } catch (e) {}
    }
    
    // Key info is the most salient extracted piece
    data.keyInfo = data.functions[0] || data.mainFile || data.versions[0] || data.amounts[0] || null;
    
    return data;
}

/**
 * Generate an AI summary for an activity.
 * Uses local keyword extraction and templates - no API calls.
 * @param {Object} activity - The activity object  
 * @returns {string} Generated summary
 */
function generateAISummary(activity) {
    const data = extractActivityData(activity);
    const type = activity.type || 'default';
    const templates = AI_SUMMARY_TEMPLATES[type] || AI_SUMMARY_TEMPLATES.default;
    
    // Try templates in order, use first one that produces a good result
    for (const template of templates) {
        try {
            const summary = template(data);
            if (summary && summary.length > 5) {
                return summary;
            }
        } catch (e) {}
    }
    
    // Fallback
    return `${capitalize(type)} activity recorded.`;
}

/**
 * Render AI summary for an activity.
 * Returns empty string if summaries are disabled.
 * @param {Object} activity - The activity object
 * @returns {string} HTML string for AI summary
 */
function renderAISummary(activity) {
    if (!aiSummariesEnabled) return '';
    
    const summary = generateAISummary(activity);
    const data = extractActivityData(activity);
    
    // Build entity badges
    let entitiesBadges = '';
    if (data.files.length > 0) {
        entitiesBadges += `<span class="ai-entity ai-file" title="Files: ${data.files.join(', ')}">📄 ${data.files.length}</span>`;
    }
    if (data.functions.length > 0) {
        entitiesBadges += `<span class="ai-entity ai-func" title="Components: ${data.functions.join(', ')}">⚡ ${data.functions.length}</span>`;
    }
    if (data.apis.length > 0) {
        entitiesBadges += `<span class="ai-entity ai-api" title="APIs: ${data.apis.join(', ')}">🔌 ${data.apis.length}</span>`;
    }
    if (data.amounts.length > 0 && (activity.type === 'trade' || activity.type === 'build')) {
        entitiesBadges += `<span class="ai-entity ai-num" title="Values: ${data.amounts.join(', ')}">💰 ${data.amounts[0]}</span>`;
    }
    
    return `
        <div class="ai-summary">
            <div class="ai-summary-header">
                <span class="ai-summary-icon">🤖</span>
                <span class="ai-summary-label">AI Summary</span>
            </div>
            <div class="ai-summary-text">${escapeHtml(summary)}</div>
            ${entitiesBadges ? `<div class="ai-summary-entities">${entitiesBadges}</div>` : ''}
        </div>
    `;
}

/**
 * Toggle AI summaries on/off
 */
function toggleAISummaries() {
    aiSummariesEnabled = !aiSummariesEnabled;
    localStorage.setItem('aiSummariesEnabled', aiSummariesEnabled);
    
    // Update toggle button
    const btn = document.getElementById('aiSummaryToggle');
    if (btn) {
        btn.classList.toggle('active', aiSummariesEnabled);
        btn.textContent = aiSummariesEnabled ? '🤖 AI On' : '🤖 AI Off';
        btn.setAttribute('aria-pressed', aiSummariesEnabled);
    }
    
    // Re-render activities
    if (window.allActivities) {
        renderActivities(window.allActivities);
    }
    
    // Toast notification
    showToast(aiSummariesEnabled ? '🤖 AI Summaries enabled' : '🤖 AI Summaries disabled');
    
    // Announce for screen readers
    announceToScreenReader(`AI Summaries ${aiSummariesEnabled ? 'enabled' : 'disabled'}`);
}

// Make AI summary functions globally available
window.generateAISummary = generateAISummary;
window.renderAISummary = renderAISummary;
window.toggleAISummaries = toggleAISummaries;

/**
 * Initialize AI summary button state on page load
 */
function initAISummaries() {
    const btn = document.getElementById('aiSummaryToggle');
    if (btn) {
        btn.classList.toggle('active', aiSummariesEnabled);
        btn.textContent = aiSummariesEnabled ? '🤖 AI On' : '🤖 AI Off';
        btn.setAttribute('aria-pressed', aiSummariesEnabled);
        btn.setAttribute('aria-label', `AI Summaries: ${aiSummariesEnabled ? 'On' : 'Off'}`);
    }
}

document.addEventListener('DOMContentLoaded', initAISummaries);

/**
 * Render links indicator for an activity.
 * Shows a badge when activity has relationships to other activities.
 * @param {Object} activity - The activity object
 * @returns {string} HTML string for links indicator
 */
function renderLinksIndicator(activity) {
    if (!activity.links || activity.links.length === 0) return '';
    
    const count = activity.links.length;
    const relationships = activity.links.map(l => l.relationship).filter((v, i, a) => a.indexOf(v) === i);
    const tooltip = `${count} linked activit${count === 1 ? 'y' : 'ies'}: ${relationships.join(', ')}`;
    
    return `<span class="links-indicator" title="${tooltip}" onclick="event.stopPropagation(); openLinksModal('${activity.hash}')">
        🔗 ${count}
    </span>`;
}

/**
 * Open the links modal for an activity.
 * Shows existing links and allows adding new ones.
 * @param {string} hash - Activity hash
 */
async function openLinksModal(hash) {
    const activities = window.allActivities || [];
    const activity = activities.find(a => a.hash === hash);
    
    if (!activity) {
        console.error('Activity not found:', hash);
        return;
    }
    
    // Fetch related activities from API for full details
    let relatedData = { related: [] };
    try {
        const response = await fetch(`/api/activities/${hash}/related?depth=2`);
        if (response.ok) {
            relatedData = await response.json();
        }
    } catch (e) {
        console.error('Failed to fetch related activities:', e);
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'links-modal-overlay';
    modal.innerHTML = `
        <div class="links-modal">
            <div class="links-modal-header">
                <h3>🔗 Activity Relationships</h3>
                <button class="links-modal-close" onclick="closeLinksModal()">&times;</button>
            </div>
            <div class="links-modal-source">
                <div class="links-source-type">${activity.type}</div>
                <div class="links-source-desc">${escapeHtml(activity.description.substring(0, 100))}${activity.description.length > 100 ? '...' : ''}</div>
            </div>
            <div class="links-modal-section">
                <h4>Linked Activities (${relatedData.related.length})</h4>
                <div class="links-list" id="linksList">
                    ${relatedData.related.length === 0 ? 
                        '<div class="links-empty">No linked activities yet</div>' :
                        relatedData.related.map(r => `
                            <div class="links-item" data-hash="${r.activity.hash}">
                                <div class="links-item-rel">
                                    <span class="rel-badge rel-${r.relationship}">${getRelationshipEmoji(r.relationship)} ${r.relationship}</span>
                                    ${r.distance > 1 ? `<span class="rel-distance">${r.distance} hops</span>` : ''}
                                </div>
                                <div class="links-item-type">${r.activity.type}</div>
                                <div class="links-item-desc">${escapeHtml(r.activity.description.substring(0, 80))}...</div>
                                <div class="links-item-actions">
                                    <button class="links-goto-btn" onclick="gotoActivity('${r.activity.hash}')" title="Go to activity">↗️</button>
                                    ${r.distance === 1 ? `<button class="links-remove-btn" onclick="removeLink('${hash}', '${r.activity.hash}')" title="Remove link">🗑️</button>` : ''}
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
            <div class="links-modal-section">
                <h4>Add New Link</h4>
                <div class="links-add-form">
                    <select id="linkRelationship" class="links-select">
                        <option value="relates">🔄 relates to</option>
                        <option value="causes">➡️ causes</option>
                        <option value="blocks">🚫 blocks</option>
                        <option value="parent">⬆️ parent of</option>
                        <option value="child">⬇️ child of</option>
                    </select>
                    <input type="text" id="linkTargetSearch" class="links-search" placeholder="Search activities to link..." onkeyup="searchActivitiesToLink(event, '${hash}')">
                </div>
                <div class="links-search-results" id="linkSearchResults"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeLinksModal();
    });
    
    // Close on Escape
    const escHandler = (e) => {
        if (e.key === 'Escape') closeLinksModal();
    };
    document.addEventListener('keydown', escHandler);
    modal._escHandler = escHandler;
}

/**
 * Close the links modal.
 */
function closeLinksModal() {
    const modal = document.querySelector('.links-modal-overlay');
    if (modal) {
        if (modal._escHandler) {
            document.removeEventListener('keydown', modal._escHandler);
        }
        modal.remove();
    }
}

/**
 * Get emoji for relationship type.
 * @param {string} relationship - Relationship type
 * @returns {string} Emoji
 */
function getRelationshipEmoji(relationship) {
    const emojis = {
        'relates': '🔄',
        'causes': '➡️',
        'caused-by': '⬅️',
        'blocks': '🚫',
        'blocked-by': '⛔',
        'parent': '⬆️',
        'child': '⬇️'
    };
    return emojis[relationship] || '🔗';
}

/**
 * Search activities to link.
 * @param {Event} event - Keyup event
 * @param {string} sourceHash - Source activity hash
 */
function searchActivitiesToLink(event, sourceHash) {
    const query = event.target.value.toLowerCase().trim();
    const resultsContainer = document.getElementById('linkSearchResults');
    
    if (query.length < 2) {
        resultsContainer.innerHTML = '<div class="links-search-hint">Type at least 2 characters to search...</div>';
        return;
    }
    
    const activities = window.allActivities || [];
    const matches = activities
        .filter(a => 
            a.hash !== sourceHash && 
            (a.description.toLowerCase().includes(query) || 
             a.type.toLowerCase().includes(query) ||
             (a.hash && a.hash.startsWith(query)))
        )
        .slice(0, 5);
    
    if (matches.length === 0) {
        resultsContainer.innerHTML = '<div class="links-search-empty">No matching activities found</div>';
        return;
    }
    
    resultsContainer.innerHTML = matches.map(a => `
        <div class="links-search-result" onclick="createLink('${sourceHash}', '${a.hash}')">
            <div class="links-result-type">${a.type}</div>
            <div class="links-result-desc">${escapeHtml(a.description.substring(0, 60))}...</div>
            <div class="links-result-time">${formatTime(a.timestamp)}</div>
        </div>
    `).join('');
}

/**
 * Create a link between two activities.
 * @param {string} sourceHash - Source activity hash
 * @param {string} targetHash - Target activity hash
 */
async function createLink(sourceHash, targetHash) {
    const relationship = document.getElementById('linkRelationship')?.value || 'relates';
    
    try {
        const response = await fetch(`/api/activities/${sourceHash}/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetHash, relationship })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update local activity data
            const activities = window.allActivities || [];
            const sourceActivity = activities.find(a => a.hash === sourceHash);
            const targetActivity = activities.find(a => a.hash === targetHash);
            
            if (sourceActivity) {
                if (!sourceActivity.links) sourceActivity.links = [];
                sourceActivity.links.push({ hash: targetHash, relationship, createdAt: new Date().toISOString() });
            }
            
            if (targetActivity) {
                const inverse = { 'causes': 'caused-by', 'blocks': 'blocked-by', 'parent': 'child', 'child': 'parent', 'relates': 'relates' };
                if (!targetActivity.links) targetActivity.links = [];
                targetActivity.links.push({ hash: sourceHash, relationship: inverse[relationship] || 'relates', createdAt: new Date().toISOString() });
            }
            
            // Close and reopen modal to refresh
            closeLinksModal();
            openLinksModal(sourceHash);
            
            // Refresh activity feed
            renderActivities(activities);
        } else {
            alert(data.error || 'Failed to create link');
        }
    } catch (e) {
        console.error('Failed to create link:', e);
        alert('Failed to create link: ' + e.message);
    }
}

/**
 * Remove a link between two activities.
 * @param {string} sourceHash - Source activity hash
 * @param {string} targetHash - Target activity hash
 */
async function removeLink(sourceHash, targetHash) {
    if (!confirm('Remove this link?')) return;
    
    try {
        const response = await fetch(`/api/activities/${sourceHash}/link/${targetHash}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Update local activity data
            const activities = window.allActivities || [];
            const sourceActivity = activities.find(a => a.hash === sourceHash);
            const targetActivity = activities.find(a => a.hash === targetHash);
            
            if (sourceActivity?.links) {
                sourceActivity.links = sourceActivity.links.filter(l => l.hash !== targetHash);
                if (sourceActivity.links.length === 0) delete sourceActivity.links;
            }
            
            if (targetActivity?.links) {
                targetActivity.links = targetActivity.links.filter(l => l.hash !== sourceHash);
                if (targetActivity.links.length === 0) delete targetActivity.links;
            }
            
            // Refresh modal
            closeLinksModal();
            openLinksModal(sourceHash);
            
            // Refresh activity feed
            renderActivities(activities);
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to remove link');
        }
    } catch (e) {
        console.error('Failed to remove link:', e);
        alert('Failed to remove link: ' + e.message);
    }
}

/**
 * Navigate to a specific activity by hash.
 * @param {string} hash - Activity hash
 */
function gotoActivity(hash) {
    closeLinksModal();
    
    // Find the activity element
    const activityEl = document.querySelector(`[data-hash="${hash}"]`);
    if (activityEl) {
        activityEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        activityEl.classList.add('highlight-flash');
        setTimeout(() => activityEl.classList.remove('highlight-flash'), 2000);
    } else {
        // Activity might be filtered out - reset filters and try again
        resetFilters();
        setTimeout(() => {
            const el = document.querySelector(`[data-hash="${hash}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('highlight-flash');
                setTimeout(() => el.classList.remove('highlight-flash'), 2000);
            }
        }, 300);
    }
}

// ============================================
// ACTIVITY SPARKLINES (Trend Visualization)
// ============================================

/**
 * Build hourly activity index for sparkline lookups
 * Called once when activities are loaded
 * @returns {Map} Map of hour key (YYYY-MM-DDTHH) to activity count
 */
function buildHourlyIndex() {
    const activities = window.allActivities || [];
    const hourlyIndex = new Map();
    
    activities.forEach(a => {
        const ts = new Date(a.timestamp);
        // Round down to the hour
        const hourKey = ts.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
        hourlyIndex.set(hourKey, (hourlyIndex.get(hourKey) || 0) + 1);
    });
    
    window.hourlyActivityIndex = hourlyIndex;
    return hourlyIndex;
}

/**
 * Get hourly counts for a time window around a timestamp
 * @param {string} timestamp - ISO timestamp
 * @param {number} hoursBefore - Hours to look back
 * @param {number} hoursAfter - Hours to look forward
 * @returns {number[]} Array of hourly counts
 */
function getHourlyCountsAround(timestamp, hoursBefore = 12, hoursAfter = 12) {
    const hourlyIndex = window.hourlyActivityIndex || buildHourlyIndex();
    const centerTs = new Date(timestamp);
    const counts = [];
    
    const totalHours = hoursBefore + 1 + hoursAfter;
    const startTs = new Date(centerTs.getTime() - hoursBefore * 60 * 60 * 1000);
    
    for (let i = 0; i < totalHours; i++) {
        const hourTs = new Date(startTs.getTime() + i * 60 * 60 * 1000);
        const hourKey = hourTs.toISOString().slice(0, 13);
        counts.push(hourlyIndex.get(hourKey) || 0);
    }
    
    return counts;
}

/**
 * Render an inline SVG sparkline showing activity trend
 * @param {Object} activity - Activity object
 * @returns {string} SVG HTML string
 */
function renderActivitySparkline(activity) {
    if (!activity.timestamp) return '';
    
    const counts = getHourlyCountsAround(activity.timestamp, 11, 12); // 24 hours total
    const maxCount = Math.max(...counts, 1);
    
    const width = 80;
    const height = 20;
    const padding = 2;
    const barWidth = (width - padding * 2) / counts.length;
    const centerIndex = 11; // The hour of this activity
    
    // Build bars
    const bars = counts.map((count, i) => {
        const barHeight = (count / maxCount) * (height - padding * 2);
        const x = padding + i * barWidth;
        const y = height - padding - barHeight;
        const isCenter = i === centerIndex;
        const opacity = count === 0 ? 0 : (isCenter ? 1 : 0.5);
        
        return `<rect x="${x}" y="${y}" width="${barWidth - 0.5}" height="${barHeight}" rx="0.5" class="sparkline-bar${isCenter ? ' sparkline-center' : ''}" style="opacity: ${opacity}"/>`;
    }).join('');
    
    // Trend line (polyline connecting midpoints of bars)
    const points = counts.map((count, i) => {
        const x = padding + i * barWidth + barWidth / 2;
        const y = height - padding - (count / maxCount) * (height - padding * 2);
        return `${x},${y}`;
    }).join(' ');
    
    const totalNearby = counts.reduce((a, b) => a + b, 0);
    const avgPerHour = (totalNearby / counts.length).toFixed(1);
    
    return `
        <div class="activity-sparkline" title="Activity trend: ${totalNearby} activities in 24h window (${avgPerHour}/hr avg)">
            <svg width="${width}" height="${height}" class="sparkline-svg" aria-hidden="true">
                <polyline points="${points}" class="sparkline-line" fill="none" stroke-width="1"/>
                ${bars}
            </svg>
            <span class="sparkline-label">${totalNearby}</span>
        </div>
    `;
}

function renderActivityTags(tags) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) return '';
    
    return `<div class="activity-tags">${tags.map(tag => 
        `<span class="activity-tag" data-tag="${escapeHtml(tag)}" onclick="setTagFilter('${escapeHtml(tag)}')">${escapeHtml(tag)}</span>`
    ).join('')}</div>`;
}

function resetFilters() {
    currentTypeFilter = 'all';
    currentSearchQuery = '';
    currentTagFilter = null;
    currentWalletFilter = null;
    currentDateFrom = null;
    currentDateTo = null;
    currentSentimentFilter = 'all';
    
    // Reset UI
    document.querySelectorAll('.type-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'all');
    });
    
    document.querySelectorAll('.tag-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.wallet-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.date-quick-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Reset sentiment filter buttons
    document.querySelectorAll('.sentiment-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sentiment === 'all');
        btn.setAttribute('aria-pressed', btn.dataset.sentiment === 'all');
    });
    
    const input = document.getElementById('activitySearch');
    if (input) input.value = '';
    
    const clearBtn = document.getElementById('searchClear');
    if (clearBtn) clearBtn.classList.remove('visible');
    
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    
    applyFilters();
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export activities to JSON or CSV format
 * Respects current filters - exports what's currently visible
 * @param {string} format - 'json' or 'csv'
 */
function exportActivities(format) {
    const activities = window.cachedActivities || [];
    if (activities.length === 0) {
        showToast('No activities to export', '⚠️');
        return;
    }
    
    // Apply current filters to get the activities to export
    let filtered = [...activities];
    
    // Apply type filter
    if (currentTypeFilter !== 'all') {
        filtered = filtered.filter(a => a.type === currentTypeFilter);
    }
    
    // Apply search filter (with optional fuzzy matching)
    if (currentSearchQuery) {
        if (fuzzySearchEnabled) {
            // Use fuzzy search with scoring
            const searchResults = filtered.map(a => ({
                activity: a,
                ...fuzzySearchActivity(a, currentSearchQuery)
            })).filter(r => r.matches);
            searchResults.sort((a, b) => b.score - a.score);
            filtered = searchResults.map(r => r.activity);
        } else {
            const query = currentSearchQuery.toLowerCase();
            filtered = filtered.filter(a => 
                (a.description && a.description.toLowerCase().includes(query)) ||
                (a.type && a.type.toLowerCase().includes(query)) ||
                (a.hash && a.hash.toLowerCase().includes(query))
            );
        }
    }
    
    // Apply tag filter
    if (currentTagFilter) {
        filtered = filtered.filter(a => a.tags && a.tags.includes(currentTagFilter));
    }
    
    // Apply wallet filter
    if (currentWalletFilter) {
        filtered = filtered.filter(a => a.wallet === currentWalletFilter);
    }
    
    // Apply date range filter
    if (currentDateFrom) {
        const fromDate = new Date(currentDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(a => new Date(a.timestamp) >= fromDate);
    }
    if (currentDateTo) {
        const toDate = new Date(currentDateTo);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(a => new Date(a.timestamp) <= toDate);
    }
    
    if (filtered.length === 0) {
        showToast('No matching activities to export', '⚠️');
        return;
    }
    
    // Generate export based on format
    let content, filename, mimeType;
    const timestamp = new Date().toISOString().slice(0, 10);
    
    if (format === 'json') {
        content = JSON.stringify(filtered, null, 2);
        filename = `jarvis-activities-${timestamp}.json`;
        mimeType = 'application/json';
    } else if (format === 'csv') {
        content = activitiesToCSV(filtered);
        filename = `jarvis-activities-${timestamp}.csv`;
        mimeType = 'text/csv';
    } else {
        showToast('Unknown export format', '❌');
        return;
    }
    
    // Trigger download
    downloadFile(content, filename, mimeType);
    
    // Show success toast
    const filterInfo = currentTypeFilter !== 'all' || currentSearchQuery || currentTagFilter || currentWalletFilter || currentDateFrom || currentDateTo
        ? ' (filtered)'
        : '';
    showToast(`Exported ${filtered.length} activities${filterInfo}`, '✅');
}

/**
 * Convert activities array to CSV string
 * @param {Array} activities - Array of activity objects
 * @returns {string} CSV formatted string
 */
function activitiesToCSV(activities) {
    // Define CSV columns
    const columns = ['timestamp', 'type', 'description', 'hash', 'signature', 'onchain', 'tags', 'wallet'];
    
    // Create header row
    const header = columns.join(',');
    
    // Create data rows
    const rows = activities.map(activity => {
        return columns.map(col => {
            let value = activity[col];
            
            // Handle special cases
            if (col === 'tags' && Array.isArray(value)) {
                value = value.join('; ');
            }
            if (col === 'onchain') {
                value = value ? 'Yes' : 'No';
            }
            if (value === null || value === undefined) {
                value = '';
            }
            
            // Escape and quote values containing commas, quotes, or newlines
            value = String(value);
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            
            return value;
        }).join(',');
    });
    
    return [header, ...rows].join('\n');
}

/**
 * Trigger file download in browser
 * @param {string} content - File content
 * @param {string} filename - Name for downloaded file
 * @param {string} mimeType - MIME type of content
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

// ============================================
// DAY GROUPING (Collapsible Sections)
// ============================================

// Track collapsed state of day groups (persisted in localStorage)
let collapsedDays = new Set();

/**
 * Initialize collapsed days from localStorage
 */
function initCollapsedDays() {
    try {
        const stored = localStorage.getItem('jarvis-pow-collapsed-days');
        if (stored) {
            collapsedDays = new Set(JSON.parse(stored));
        }
    } catch (e) {
        console.error('Failed to load collapsed days state:', e);
    }
}

/**
 * Save collapsed days to localStorage
 */
function saveCollapsedDays() {
    try {
        localStorage.setItem('jarvis-pow-collapsed-days', JSON.stringify([...collapsedDays]));
    } catch (e) {
        console.error('Failed to save collapsed days state:', e);
    }
}

/**
 * Toggle a day group's collapsed state
 */
function toggleDayGroup(dateKey) {
    const dayGroup = document.querySelector(`.day-group[data-date="${dateKey}"]`);
    if (!dayGroup) return;
    
    const isCollapsed = collapsedDays.has(dateKey);
    const dayHeader = dayGroup.querySelector('.day-header');
    
    if (isCollapsed) {
        collapsedDays.delete(dateKey);
        dayGroup.classList.remove('collapsed');
        if (dayHeader) dayHeader.setAttribute('aria-expanded', 'true');
        announceToScreenReader('Day group expanded');
    } else {
        collapsedDays.add(dateKey);
        dayGroup.classList.add('collapsed');
        if (dayHeader) dayHeader.setAttribute('aria-expanded', 'false');
        announceToScreenReader('Day group collapsed');
    }
    
    saveCollapsedDays();
    
    // Play subtle sound feedback
    if (soundEnabled) {
        try {
            const ctx = initAudio();
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = isCollapsed ? 600 : 400;
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {}
    }
}

/**
 * Expand all day groups
 */
function expandAllDays() {
    collapsedDays.clear();
    saveCollapsedDays();
    document.querySelectorAll('.day-group.collapsed').forEach(g => g.classList.remove('collapsed'));
}

/**
 * Collapse all day groups
 */
function collapseAllDays() {
    document.querySelectorAll('.day-group').forEach(g => {
        const dateKey = g.dataset.date;
        if (dateKey) {
            collapsedDays.add(dateKey);
            g.classList.add('collapsed');
        }
    });
    saveCollapsedDays();
}

/**
 * Group activities by day
 * @param {Array} activities - Array of activity objects (should be sorted newest first)
 * @returns {Map} Map of date keys to activity arrays
 */
function groupActivitiesByDay(activities) {
    const groups = new Map();
    
    activities.forEach(activity => {
        const date = new Date(activity.timestamp);
        // Use local date as key (YYYY-MM-DD format)
        const dateKey = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
        
        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }
        groups.get(dateKey).push(activity);
    });
    
    return groups;
}

/**
 * Format a day header with relative date label
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @param {number} count - Number of activities on this day
 * @returns {string} Formatted header text
 */
function formatDayHeader(dateKey, count) {
    const date = new Date(dateKey + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA');
    const isYesterday = date.toLocaleDateString('en-CA') === yesterday.toLocaleDateString('en-CA');
    
    let label;
    if (isToday) {
        label = 'Today';
    } else if (isYesterday) {
        label = 'Yesterday';
    } else {
        // Show full date for older days
        label = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    }
    
    return label;
}

/**
 * Render activities grouped by day
 * @param {Array} activities - Array sorted newest first
 * @param {boolean} highlightNew - Whether to highlight new activities
 * @returns {string} HTML string for grouped activities
 */
function renderGroupedActivities(activities, highlightNew = false) {
    const sorted = [...activities].reverse(); // Newest first
    const groups = groupActivitiesByDay(sorted);
    const newCount = sorted.length - lastRenderedCount;
    const shouldHighlight = highlightNew && newCount > 0;
    
    let html = '';
    let itemIndex = 0;
    
    // Add expand/collapse all controls
    html += `
        <div class="day-group-controls">
            <button class="day-control-btn" onclick="expandAllDays()" title="Expand all days">
                <span>⊞</span> Expand All
            </button>
            <button class="day-control-btn" onclick="collapseAllDays()" title="Collapse all days">
                <span>⊟</span> Collapse All
            </button>
        </div>
    `;
    
    for (const [dateKey, dayActivities] of groups) {
        const isCollapsed = collapsedDays.has(dateKey);
        const dayLabel = formatDayHeader(dateKey, dayActivities.length);
        const onChainCount = dayActivities.filter(a => a.signature || a.proof?.txSignature).length;
        
        html += `
            <div class="day-group ${isCollapsed ? 'collapsed' : ''}" data-date="${dateKey}" role="region" aria-labelledby="main-day-label-${dateKey}">
                <div class="day-header" tabindex="0" role="button" aria-expanded="${!isCollapsed}" aria-controls="main-day-activities-${dateKey}" onclick="toggleDayGroup('${dateKey}')">
                    <div class="day-header-left">
                        <span class="day-toggle" aria-hidden="true">${isCollapsed ? '▶' : '▼'}</span>
                        <span class="day-label" id="main-day-label-${dateKey}">${dayLabel}</span>
                    </div>
                    <div class="day-header-right">
                        <span class="day-count">${dayActivities.length} activit${dayActivities.length === 1 ? 'y' : 'ies'}</span>
                        ${onChainCount > 0 ? `<span class="day-onchain">⛓️ ${onChainCount}</span>` : ''}
                    </div>
                </div>
                <div class="day-activities" id="main-day-activities-${dateKey}">
        `;
        
        dayActivities.forEach((a, dayIndex) => {
            const hash = a.hash || a.proof?.hash;
            const hashDisplay = hash ? `SHA256: ${hash.slice(0, 12)}...${hash.slice(-6)}` : '';
            const isNew = shouldHighlight && itemIndex < newCount;
            const tagsHtml = renderActivityTags(a.tags);
            const walletHtml = renderWalletBadge(a.wallet);
            const activityId = getActivityId(a);
            const ariaLabel = `${a.type} activity: ${escapeHtml(a.description.substring(0, 80))}${a.description.length > 80 ? "..." : ""}`;
            const compareSelected = typeof compareSelections !== 'undefined' && compareSelections.includes(hash);
            const compareCheckboxHtml = typeof renderCompareCheckbox === 'function' ? renderCompareCheckbox(hash) : '';
            const bulkSelected = typeof bulkSelections !== 'undefined' && bulkSelections.includes(hash);
            const bulkCheckboxHtml = typeof renderBulkCheckbox === 'function' ? renderBulkCheckbox(hash) : '';
            
            html += `
                <div class="activity-item ${a.type}${isNew ? ' new-activity' : ''}${compareSelected ? ' compare-selected' : ''}${bulkSelected ? ' bulk-selected' : ''}" 
                     style="animation-delay: ${Math.min(dayIndex, 5) * 0.04}s" 
                     data-wallet="${a.wallet || ''}" 
                     data-activity-id="${activityId}"
                     data-hash="${hash || ''}"
                     tabindex="0" role="article" aria-label="${ariaLabel}">
                    ${compareCheckboxHtml}
                    ${bulkCheckboxHtml}
                    ${renderShareButton(activityId, hash)}
                    <div class="activity-header">
                        <div class="activity-badges">
                            <span class="activity-type">${a.type}</span>
                            ${getProofBadge(a)}
                            ${walletHtml}
                        </div>
                        <div class="activity-time">${formatTime(a.timestamp)}</div>
                    </div>
                    <div class="activity-desc">${escapeHtml(a.description)}</div>
                    ${tagsHtml}
                    <div class="activity-footer">
                        ${hashDisplay ? `<div class="activity-hash">${hashDisplay}</div>` : \'\'}
                        ${renderActivitySparkline(a)}
                    </div>
                </div>
            `;
            itemIndex++;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    return html;
}

/**
 * Render activities grouped by day with a limit (for infinite scroll)
 * @param {Array} activities - Array of all activities
 * @param {number} limit - Maximum number of activities to render
 * @param {boolean} highlightNew - Whether to highlight new activities
 * @returns {string} HTML string for grouped activities with load-more UI
 */
function renderGroupedActivitiesLimited(activities, limit, highlightNew = false) {
    const sorted = [...activities].reverse(); // Newest first
    const limited = sorted.slice(0, limit);
    const groups = groupActivitiesByDay(limited);
    const newCount = sorted.length - lastRenderedCount;
    const shouldHighlight = highlightNew && newCount > 0;
    const remaining = sorted.length - limit;
    
    let html = '';
    let itemIndex = 0;
    
    // Add expand/collapse all controls
    html += `
        <div class="day-group-controls">
            <button class="day-control-btn" onclick="expandAllDays()" title="Expand all days" aria-label="Expand all day groups">
                <span>⊞</span> Expand All
            </button>
            <button class="day-control-btn" onclick="collapseAllDays()" title="Collapse all days" aria-label="Collapse all day groups">
                <span>⊟</span> Collapse All
            </button>
            <span class="activity-counter" aria-live="polite">
                Showing ${Math.min(limit, sorted.length)} of ${sorted.length}
            </span>
        </div>
    `;
    
    for (const [dateKey, dayActivities] of groups) {
        const isCollapsed = collapsedDays.has(dateKey);
        const dayLabel = formatDayHeader(dateKey, dayActivities.length);
        const onChainCount = dayActivities.filter(a => a.signature || a.proof?.txSignature).length;
        
        html += `
            <div class="day-group ${isCollapsed ? 'collapsed' : ''}" data-date="${dateKey}" role="region" aria-labelledby="inf-day-label-${dateKey}">
                <div class="day-header" tabindex="0" role="button" aria-expanded="${!isCollapsed}" aria-controls="inf-day-activities-${dateKey}" onclick="toggleDayGroup('${dateKey}')">
                    <div class="day-header-left">
                        <span class="day-toggle" aria-hidden="true">${isCollapsed ? '▶' : '▼'}</span>
                        <span class="day-label" id="inf-day-label-${dateKey}">${dayLabel}</span>
                    </div>
                    <div class="day-header-right">
                        <span class="day-count">${dayActivities.length} activit${dayActivities.length === 1 ? 'y' : 'ies'}</span>
                        ${onChainCount > 0 ? `<span class="day-onchain">⛓️ ${onChainCount}</span>` : ''}
                    </div>
                </div>
                <div class="day-activities" id="inf-day-activities-${dateKey}">
        `;
        
        dayActivities.forEach((a, dayIndex) => {
            const hash = a.hash || a.proof?.hash;
            const hashDisplay = hash ? `SHA256: ${hash.slice(0, 12)}...${hash.slice(-6)}` : '';
            const isNew = shouldHighlight && itemIndex < newCount;
            const tagsHtml = renderActivityTags(a.tags);
            const walletHtml = renderWalletBadge(a.wallet);
            const activityId = getActivityId(a);
            const ariaLabel = `${a.type} activity: ${escapeHtml(a.description.substring(0, 80))}${a.description.length > 80 ? "..." : ""}`;
            const compareSelected = typeof compareSelections !== 'undefined' && compareSelections.includes(hash);
            const compareCheckboxHtml = typeof renderCompareCheckbox === 'function' ? renderCompareCheckbox(hash) : '';
            const bulkSelected = typeof bulkSelections !== 'undefined' && bulkSelections.includes(hash);
            const bulkCheckboxHtml = typeof renderBulkCheckbox === 'function' ? renderBulkCheckbox(hash) : '';
            
            html += `
                <div class="activity-item ${a.type}${isNew ? ' new-activity' : ''}${compareSelected ? ' compare-selected' : ''}${bulkSelected ? ' bulk-selected' : ''}" 
                     style="animation-delay: ${Math.min(dayIndex, 5) * 0.04}s" 
                     data-wallet="${a.wallet || ''}" 
                     data-activity-id="${activityId}"
                     data-hash="${hash || ''}"
                     tabindex="0" role="article" aria-label="${ariaLabel}">
                    ${compareCheckboxHtml}
                    ${bulkCheckboxHtml}
                    ${renderShareButton(activityId, hash)}
                    <div class="activity-header">
                        <div class="activity-badges">
                            <span class="activity-type">${a.type}</span>
                            ${getProofBadge(a)}
                            ${walletHtml}
                        </div>
                        <div class="activity-time">${formatTime(a.timestamp)}</div>
                    </div>
                    <div class="activity-desc">${escapeHtml(a.description)}</div>
                    ${tagsHtml}
                    <div class="activity-footer">
                        ${hashDisplay ? `<div class="activity-hash">${hashDisplay}</div>` : \'\'}
                        ${renderActivitySparkline(a)}
                    </div>
                </div>
            `;
            itemIndex++;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Add load more container
    if (remaining > 0) {
        const loadCount = Math.min(remaining, ACTIVITIES_PER_PAGE);
        html += `
            <div id="load-more-container" class="load-more-container">
                <button id="load-more-btn" class="load-more-btn" onclick="loadMoreActivities()" aria-label="Load ${loadCount} more activities">
                    📜 Load ${loadCount} More (${remaining} remaining)
                </button>
                <div id="load-more-sentinel" class="load-more-sentinel" aria-hidden="true"></div>
            </div>
        `;
    } else {
        html += `
            <div id="load-more-container" class="load-more-container">
                <div class="all-loaded-message">
                    ✅ All ${sorted.length} activities loaded
                </div>
            </div>
        `;
    }
    
    return html;
}

// Initialize collapsed days state on load
initCollapsedDays();

// Override renderActivities to use filtered rendering when filters are active
const originalRenderActivities = renderActivities;
renderActivities = function(activities, highlightNew = false) {
    // Cache activities for filtering
    window.cachedActivities = activities;
    
    // Update filter buttons when activities change
    populateTagFilters(activities);
    populateWalletFilters(activities);
    
    // If filters are active, use filtered rendering (no infinite scroll for filtered results)
    if (currentTypeFilter !== 'all' || currentSearchQuery || currentTagFilter || currentWalletFilter || currentDateFrom || currentDateTo) {
        renderFilteredActivities(activities);
    } else {
        // Use day-grouped rendering with infinite scroll
        const feed = document.getElementById('feed');
        if (!activities.length) {
            feed.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🤖</div>
                    <h4>Agent Warming Up</h4>
                    <p>Activities will appear here as the agent works — commits, builds, trades, and more.</p>
                    <div class="empty-state-hint">
                        Every action is cryptographically signed and verified on <code>Solana</code>
                    </div>
                </div>
            `;
            return;
        }
        
        feed.classList.add('refreshing');
        // Use limited rendering for infinite scroll performance
        feed.innerHTML = renderGroupedActivitiesLimited(activities, currentDisplayCount, highlightNew);
        lastRenderedCount = activities.length;
        setTimeout(() => {
            feed.classList.remove('refreshing');
            // Initialize infinite scroll observer after render
            initInfiniteScroll();
        }, 500);
    }
};

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

// Track if keyboard shortcuts modal is open
let shortcutsModalOpen = false;

// Define keyboard shortcuts
const KEYBOARD_SHORTCUTS = {
    '/': { action: 'focusSearch', description: 'Focus search box' },
    'Escape': { action: 'clearFocus', description: 'Clear search / Close modal' },
    '1': { action: () => switchTab('timeline'), description: 'Activity Feed tab' },
    '2': { action: () => switchTab('milestones'), description: 'Milestones tab' },
    '3': { action: () => switchTab('tweets'), description: 'Tweets tab' },
    '4': { action: () => switchTab('decisions'), description: 'Key Decisions tab' },
    '5': { action: () => switchTab('meta'), description: 'Meta Story tab' },
    '6': { action: () => switchTab('verify'), description: 'Verify tab' },
    '7': { action: () => switchTab('heatmap'), description: 'Heatmap tab' },
    '8': { action: () => switchTab('wordcloud'), description: 'Word Cloud tab' },
    'r': { action: 'resetFilters', description: 'Reset all filters' },
    'e': { action: 'exportJSON', description: 'Export as JSON' },
    'E': { action: 'exportCSV', description: 'Export as CSV' },
    'd': { action: 'toggleEditMode', description: 'Toggle dashboard edit mode' },
    'l': { action: 'loadMore', description: 'Load more activities' },
    'b': { action: 'toggleBookmarkFilter', description: 'Toggle bookmark filter' },
    'B': { action: 'bookmarkFocused', description: 'Bookmark focused activity' },
    'z': { action: 'toggleFocusMode', description: 'Toggle focus mode' },
    'w': { action: 'openWidgets', description: 'Open widgets configuration' },
    'y': { action: 'celebrate', description: 'Fire confetti celebration' },
    'Y': { action: 'celebrateEpic', description: 'Fire epic confetti cannons' },
    'f': { action: 'toggleFuzzySearch', description: 'Toggle fuzzy search (typo tolerance)' },
    's': { action: 'cycleSentiment', description: 'Cycle sentiment filter (all → positive → neutral → negative)' },
    'a': { action: 'toggleAISummaries', description: 'Toggle AI-generated summaries' },
    '?': { action: 'showShortcuts', description: 'Show keyboard shortcuts' },
};

// Create and inject shortcuts modal HTML
function createShortcutsModal() {
    if (document.getElementById('shortcuts-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'shortcuts-modal';
    modal.className = 'shortcuts-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'shortcuts-modal-title');
    modal.innerHTML = `
        <div class="shortcuts-modal-content" role="document">
            <div class="shortcuts-header">
                <h3 id="shortcuts-modal-title">⌨️ Keyboard Shortcuts</h3>
                <button class="shortcuts-close" onclick="hideShortcutsModal()" aria-label="Close keyboard shortcuts modal">×</button>
            </div>
            <div class="shortcuts-grid">
                <div class="shortcut-section">
                    <h4>Navigation</h4>
                    <div class="shortcut-row"><kbd>/</kbd> Focus search</div>
                    <div class="shortcut-row"><kbd>Esc</kbd> Clear search / Close modal</div>
                    <div class="shortcut-row"><kbd>r</kbd> Reset all filters</div>
                    <div class="shortcut-row"><kbd>f</kbd> Toggle fuzzy search</div>
                    <div class="shortcut-row"><kbd>s</kbd> Cycle sentiment filter</div>
                    <div class="shortcut-row"><kbd>a</kbd> Toggle AI summaries</div>
                </div>
                <div class="shortcut-section">
                    <h4>Tabs</h4>
                    <div class="shortcut-row"><kbd>1</kbd> Activity Feed</div>
                    <div class="shortcut-row"><kbd>2</kbd> Milestones</div>
                    <div class="shortcut-row"><kbd>3</kbd> Tweets</div>
                    <div class="shortcut-row"><kbd>4</kbd> Key Decisions</div>
                    <div class="shortcut-row"><kbd>5</kbd> Meta Story</div>
                    <div class="shortcut-row"><kbd>6</kbd> Verify</div>
                </div>
                <div class="shortcut-section">
                    <h4>Export & More</h4>
                    <div class="shortcut-row"><kbd>e</kbd> Export as JSON</div>
                    <div class="shortcut-row"><kbd>Shift+e</kbd> Export as CSV</div>
                    <div class="shortcut-row"><kbd>l</kbd> Load more activities</div>
                </div>
                <div class="shortcut-section">
                    <h4>Bookmarks</h4>
                    <div class="shortcut-row"><kbd>b</kbd> Toggle bookmark filter</div>
                    <div class="shortcut-row"><kbd>Shift+b</kbd> Bookmark focused activity</div>
                </div>
                <div class="shortcut-section">
                    <h4>View & Actions</h4>
                    <div class="shortcut-row"><kbd>z</kbd> Toggle focus mode</div>
                    <div class="shortcut-row"><kbd>c</kbd> Toggle compare mode</div>
                    <div class="shortcut-row"><kbd>x</kbd> Toggle bulk select mode</div>
                    <div class="shortcut-row"><kbd>d</kbd> Toggle layout edit mode</div>
                    <div class="shortcut-row"><kbd>v</kbd> Voice activity input</div>
                    <div class="shortcut-row"><kbd>w</kbd> Configure widgets</div>
                    <div class="shortcut-row"><kbd>y</kbd> Fire confetti 🎉</div>
                    <div class="shortcut-row"><kbd>Shift+y</kbd> Epic confetti cannons 🎆</div>
                    <div class="shortcut-row"><kbd>?</kbd> Show this help</div>
                </div>
            </div>
            <p class="shortcuts-tip">💡 Tip: Press <kbd>?</kbd> anytime to see shortcuts</p>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show keyboard shortcuts modal
function showShortcutsModal() {
    createShortcutsModal();
    const modal = document.getElementById('shortcuts-modal');
    modal.classList.add('visible');
    shortcutsModalOpen = true;
    // Focus the close button for keyboard accessibility
    const closeBtn = modal.querySelector('.shortcuts-close');
    if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 50);
    }
    // Announce modal opening to screen readers
    announceToScreenReader('Keyboard shortcuts modal opened. Press Escape to close.');
}

// Hide keyboard shortcuts modal
function hideShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) {
        modal.classList.remove('visible');
    }
    shortcutsModalOpen = false;
    announceToScreenReader('Keyboard shortcuts modal closed');
}

// Focus the search input
function focusSearchInput() {
    const searchInput = document.getElementById('activitySearch');
    if (searchInput) {
        searchInput.focus();
        searchInput.select();
    }
}

// Handle keyboard shortcut actions
function handleShortcutAction(action) {
    if (typeof action === 'function') {
        action();
    } else if (action === 'focusSearch') {
        focusSearchInput();
    } else if (action === 'clearFocus') {
        if (focusModeActive) {
            hideFocusMode();
        } else if (shortcutsModalOpen) {
            hideShortcutsModal();
        } else {
            const searchInput = document.getElementById('activitySearch');
            if (document.activeElement === searchInput) {
                searchInput.blur();
                clearSearch();
            }
        }
    } else if (action === 'toggleFocusMode') {
        toggleFocusMode();
    } else if (action === 'resetFilters') {
        resetFilters();
    } else if (action === 'showShortcuts') {
        showShortcutsModal();
    } else if (action === 'exportJSON') {
        exportActivities('json');
    } else if (action === 'exportCSV') {
        exportActivities('csv');
    } else if (action === 'loadMore') {
        loadMoreActivities();
    } else if (action === 'toggleBookmarkFilter') {
        toggleBookmarkFilter();
    } else if (action === 'bookmarkFocused') {
        // Bookmark the currently focused activity
        const focused = document.activeElement;
        if (focused && focused.classList.contains('activity-item')) {
            const hash = focused.dataset.hash;
            if (hash) {
                toggleBookmark(hash);
            }
        } else {
            announceToScreenReader('Focus an activity first to bookmark it');
        }
    } else if (action === 'openWidgets') {
        openWidgetsModal();
    } else if (action === 'celebrate') {
        celebrate('normal');
    } else if (action === 'celebrateEpic') {
        celebrate('epic');
    } else if (action === 'toggleEditMode') {
        toggleDashboardEditMode();
    } else if (action === 'toggleFuzzySearch') {
        toggleFuzzySearch();
    } else if (action === 'cycleSentiment') {
        cycleSentimentFilter();
    } else if (action === 'toggleAISummaries') {
        toggleAISummaries();
    }
}

/**
 * Cycle through sentiment filters: all → positive → neutral → negative → all
 */
function cycleSentimentFilter() {
    const sentiments = ['all', 'positive', 'neutral', 'negative'];
    const currentIndex = sentiments.indexOf(currentSentimentFilter || 'all');
    const nextIndex = (currentIndex + 1) % sentiments.length;
    setSentimentFilter(sentiments[nextIndex]);
}

// Main keyboard event listener
document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input fields (except for specific keys)
    const isInputFocused = document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || 
         document.activeElement.tagName === 'TEXTAREA' ||
         document.activeElement.isContentEditable);
    
    // Always allow Escape
    if (e.key === 'Escape') {
        handleShortcutAction('clearFocus');
        return;
    }
    
    // Don't process other shortcuts when typing in inputs
    if (isInputFocused) return;
    
    // Don't process if modifier keys are pressed (except for Shift+?)
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    
    // Handle ? key (Shift+/)
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        handleShortcutAction('showShortcuts');
        return;
    }
    
    // Handle / key for search
    if (e.key === '/') {
        e.preventDefault();
        handleShortcutAction('focusSearch');
        return;
    }
    
    // Check for registered shortcuts
    const shortcut = KEYBOARD_SHORTCUTS[e.key];
    if (shortcut) {
        e.preventDefault();
        handleShortcutAction(shortcut.action);
    }
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('shortcuts-modal');
    if (modal && shortcutsModalOpen && e.target === modal) {
        hideShortcutsModal();
    }
});

// Add keyboard hint to header
function addKeyboardHint() {
    const header = document.querySelector('header');
    if (!header) return;
    
    // Check if hint already exists
    if (document.getElementById('keyboard-hint')) return;
    
    const hint = document.createElement('div');
    hint.id = 'keyboard-hint';
    hint.className = 'keyboard-hint';
    hint.innerHTML = `<span class="keyboard-hint-text">Press <kbd>?</kbd> for keyboard shortcuts</span>`;
    hint.onclick = showShortcutsModal;
    
    // Insert after the theme toggle buttons
    const toggleContainer = header.querySelector('div[style*="display: flex"]');
    if (toggleContainer) {
        toggleContainer.appendChild(hint);
    }
}

// Initialize keyboard shortcuts on load
document.addEventListener('DOMContentLoaded', addKeyboardHint);

// Initialize bookmark count on page load
document.addEventListener('DOMContentLoaded', updateBookmarkCount);

// ============================================
// COMMAND PALETTE (Cmd+K)
// ============================================

let commandPaletteOpen = false;
let commandPaletteSelectedIndex = 0;
let filteredCommands = [];

/**
 * Command definitions for the palette
 * Each command has: id, title, description, icon, shortcut (optional), action, group
 */
const PALETTE_COMMANDS = [
    // Navigation
    { id: 'tab-feed', title: 'Activity Feed', description: 'View recent activities', icon: '📋', shortcut: '1', action: () => switchTab('timeline'), group: 'Navigation' },
    { id: 'tab-milestones', title: 'Milestones', description: 'View achievement milestones', icon: '🏆', shortcut: '2', action: () => switchTab('milestones'), group: 'Navigation' },
    { id: 'tab-tweets', title: 'Tweets', description: 'View tweet activities', icon: '🐦', shortcut: '3', action: () => switchTab('tweets'), group: 'Navigation' },
    { id: 'tab-decisions', title: 'Key Decisions', description: 'View important decisions', icon: '🎯', shortcut: '4', action: () => switchTab('decisions'), group: 'Navigation' },
    { id: 'tab-meta', title: 'Meta Story', description: 'View project narrative', icon: '📖', shortcut: '5', action: () => switchTab('meta'), group: 'Navigation' },
    { id: 'tab-verify', title: 'Verify', description: 'Verify activity proofs', icon: '🔐', shortcut: '6', action: () => switchTab('verify'), group: 'Navigation' },
    { id: 'tab-heatmap', title: 'Activity Heatmap', description: 'GitHub-style contribution calendar', icon: '📅', shortcut: '7', action: () => switchTab('heatmap'), group: 'Navigation' },
    { id: 'tab-wordcloud', title: 'Word Cloud', description: 'Visualize common terms in activities', icon: '☁️', shortcut: '8', action: () => switchTab('wordcloud'), group: 'Navigation' },
    
    // Search & Filter
    { id: 'search', title: 'Search Activities', description: 'Focus the search input', icon: '🔍', shortcut: '/', action: () => focusSearchInput(), group: 'Search & Filter' },
    { id: 'fuzzy-search', title: 'Toggle Fuzzy Search', description: 'Enable/disable typo-tolerant search', icon: '🔎', shortcut: 'F', action: () => { toggleFuzzySearch(); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'ai-summaries', title: 'Toggle AI Summaries', description: 'Show/hide AI-generated activity summaries', icon: '🤖', shortcut: 'A', action: () => { toggleAISummaries(); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'reset-filters', title: 'Reset All Filters', description: 'Clear all active filters', icon: '🔄', shortcut: 'R', action: () => resetFilters(), group: 'Search & Filter' },
    { id: 'filter-bookmarks', title: 'Toggle Bookmarks Filter', description: 'Show only bookmarked items', icon: '⭐', shortcut: 'B', action: () => toggleBookmarkFilter(), group: 'Search & Filter' },
    { id: 'filter-build', title: 'Filter: Build', description: 'Show only build activities', icon: '🔨', action: () => { setTypeFilter('build'); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'filter-commit', title: 'Filter: Commits', description: 'Show only commit activities', icon: '📝', action: () => { setTypeFilter('commit'); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'filter-trade', title: 'Filter: Trades', description: 'Show only trade activities', icon: '💰', action: () => { setTypeFilter('trade'); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'filter-tweet', title: 'Filter: Tweets', description: 'Show only tweet activities', icon: '🐦', action: () => { setTypeFilter('tweet'); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'filter-message', title: 'Filter: Messages', description: 'Show only message activities', icon: '💬', action: () => { setTypeFilter('message'); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'filter-sentiment-positive', title: 'Sentiment: Positive', description: 'Show only positive sentiment activities', icon: '😊', action: () => { setSentimentFilter('positive'); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'filter-sentiment-neutral', title: 'Sentiment: Neutral', description: 'Show only neutral sentiment activities', icon: '😐', action: () => { setSentimentFilter('neutral'); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'filter-sentiment-negative', title: 'Sentiment: Negative', description: 'Show only negative sentiment activities', icon: '😟', action: () => { setSentimentFilter('negative'); hideCommandPalette(); }, group: 'Search & Filter' },
    
    // Export
    { id: 'export-json', title: 'Export as JSON', description: 'Download activities as JSON file', icon: '📄', shortcut: 'E', action: () => exportActivities('json'), group: 'Export' },
    { id: 'export-csv', title: 'Export as CSV', description: 'Download activities as CSV file', icon: '📊', shortcut: '⇧E', action: () => exportActivities('csv'), group: 'Export' },
    
    // Settings
    { id: 'widgets', title: 'Customize Widgets', description: 'Configure dashboard stat cards', icon: '🧩', shortcut: 'W', action: () => { openWidgetsModal(); hideCommandPalette(); }, group: 'Settings' },
    { id: 'edit-layout', title: 'Toggle Layout Edit Mode', description: 'Drag stat cards to reorder on dashboard', icon: '📐', shortcut: 'D', action: () => { toggleDashboardEditMode(); hideCommandPalette(); }, group: 'Settings' },
    { id: 'reminders', title: 'View Reminders', description: 'Manage activity reminders and follow-ups', icon: '⏰', shortcut: 'R', action: () => { openRemindersModal(); hideCommandPalette(); }, group: 'Actions' },
    { id: 'new-reminder', title: 'New Reminder', description: 'Create a new reminder', icon: '➕', action: () => { openReminderFormModal(); hideCommandPalette(); }, group: 'Actions' },
    { id: 'relationships', title: 'View Relationships', description: 'Browse activity links and connections', icon: '🔗', shortcut: 'L', action: () => { openRelationshipsModal(); hideCommandPalette(); }, group: 'Actions' },
    { id: 'relationship-graph', title: 'View Relationship Network', description: 'Interactive force-directed graph of activity connections', icon: '🕸️', shortcut: 'G', action: () => { document.getElementById('relationship-graph-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); hideCommandPalette(); }, group: 'Actions' },
    { id: 'theme-auto', title: 'Theme: Auto (System)', description: 'Follow system dark/light preference', icon: '🔄', action: () => { setTheme('auto'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'theme-dark', title: 'Theme: Dark', description: 'Switch to dark theme', icon: '🌙', action: () => { setTheme('dark'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'theme-light', title: 'Theme: Light', description: 'Switch to light theme', icon: '☀️', action: () => { setTheme('light'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'theme-ocean', title: 'Theme: Ocean', description: 'Switch to ocean theme', icon: '🌊', action: () => { setTheme('ocean'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'theme-forest', title: 'Theme: Forest', description: 'Switch to forest theme', icon: '🌲', action: () => { setTheme('forest'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'theme-sunset', title: 'Theme: Sunset', description: 'Switch to sunset theme', icon: '🌅', action: () => { setTheme('sunset'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'theme-cyberpunk', title: 'Theme: Cyberpunk', description: 'Switch to cyberpunk theme', icon: '🔮', action: () => { setTheme('cyberpunk'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'toggle-sound', title: 'Toggle Sound', description: 'Turn notification sounds on/off', icon: '🔔', action: () => { toggleSound(); hideCommandPalette(); }, group: 'Settings' },
    { id: 'toggle-notifs', title: 'Toggle Browser Notifications', description: 'Enable/disable browser notifications', icon: '🔕', action: () => { toggleNotifications(); hideCommandPalette(); }, group: 'Settings' },
    
    // Actions
    { id: 'load-more', title: 'Load More Activities', description: 'Load additional activities', icon: '⬇️', action: () => loadMoreActivities(), group: 'Actions' },
    { id: 'scroll-top', title: 'Scroll to Top', description: 'Jump to top of page', icon: '⬆️', shortcut: 'T', action: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); hideCommandPalette(); }, group: 'Actions' },
    { id: 'refresh', title: 'Refresh Data', description: 'Reload activity data', icon: '🔃', action: () => { fetchActivities(); hideCommandPalette(); }, group: 'Actions' },
    { id: 'celebrate', title: 'Celebrate! 🎉', description: 'Fire confetti to celebrate milestones', icon: '🎊', shortcut: 'Y', action: () => { celebrate('normal'); hideCommandPalette(); }, group: 'Actions' },
    { id: 'celebrate-epic', title: 'Epic Celebration! 🎆', description: 'Fire epic confetti cannons from both sides', icon: '🎇', action: () => { celebrate('epic'); hideCommandPalette(); }, group: 'Actions' },
    
    // Help
    { id: 'shortcuts', title: 'Keyboard Shortcuts', description: 'View all keyboard shortcuts', icon: '⌨️', shortcut: '?', action: () => { showShortcutsModal(); hideCommandPalette(); }, group: 'Help' },
    { id: 'api-docs', title: 'API Documentation', description: 'Open OpenAPI/Swagger docs', icon: '📚', action: () => { window.open('/pow/api/docs', '_blank'); hideCommandPalette(); }, group: 'Help' },
    { id: 'github', title: 'GitHub Repository', description: 'View source code', icon: '🐙', action: () => { window.open('https://github.com/jarvis-plus/hackathon', '_blank'); hideCommandPalette(); }, group: 'Help' },
];

/**
 * Create and inject command palette HTML
 */
function createCommandPalette() {
    if (document.getElementById('command-palette-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'command-palette-overlay';
    overlay.className = 'command-palette-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Command palette');
    
    overlay.innerHTML = `
        <div class="command-palette" role="combobox" aria-expanded="true" aria-haspopup="listbox">
            <div class="command-palette-search">
                <span class="command-palette-search-icon">🔍</span>
                <input 
                    type="text" 
                    class="command-palette-input" 
                    id="command-palette-input"
                    placeholder="Type a command or search..."
                    autocomplete="off"
                    spellcheck="false"
                    aria-label="Search commands"
                    aria-autocomplete="list"
                    aria-controls="command-palette-list"
                >
                <div class="command-palette-shortcut">
                    <kbd>Esc</kbd> to close
                </div>
            </div>
            <div class="command-palette-results" id="command-palette-results" role="listbox" aria-label="Commands">
            </div>
            <div class="command-palette-footer">
                <div class="command-palette-footer-hint">
                    <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
                    <span><kbd>Enter</kbd> Select</span>
                    <span><kbd>Esc</kbd> Close</span>
                </div>
                <span>⌘K to open anytime</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Set up event listeners
    const input = overlay.querySelector('#command-palette-input');
    input.addEventListener('input', handleCommandPaletteInput);
    input.addEventListener('keydown', handleCommandPaletteKeydown);
    
    // Close when clicking overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hideCommandPalette();
        }
    });
}

/**
 * Filter commands based on search query
 */
function filterCommands(query) {
    query = query.toLowerCase().trim();
    
    if (!query) {
        return [...PALETTE_COMMANDS];
    }
    
    return PALETTE_COMMANDS.filter(cmd => {
        const titleMatch = cmd.title.toLowerCase().includes(query);
        const descMatch = cmd.description.toLowerCase().includes(query);
        const groupMatch = cmd.group.toLowerCase().includes(query);
        return titleMatch || descMatch || groupMatch;
    }).sort((a, b) => {
        // Prioritize title matches
        const aTitle = a.title.toLowerCase().indexOf(query);
        const bTitle = b.title.toLowerCase().indexOf(query);
        if (aTitle !== -1 && bTitle === -1) return -1;
        if (bTitle !== -1 && aTitle === -1) return 1;
        if (aTitle !== -1 && bTitle !== -1) return aTitle - bTitle;
        return 0;
    });
}

/**
 * Render command palette results
 */
function renderCommandPaletteResults() {
    const resultsEl = document.getElementById('command-palette-results');
    if (!resultsEl) return;
    
    if (filteredCommands.length === 0) {
        resultsEl.innerHTML = `
            <div class="command-palette-empty">
                <div class="command-palette-empty-icon">🔍</div>
                <div class="command-palette-empty-text">No commands found</div>
            </div>
        `;
        return;
    }
    
    // Group commands
    const groups = {};
    filteredCommands.forEach((cmd, index) => {
        if (!groups[cmd.group]) {
            groups[cmd.group] = [];
        }
        groups[cmd.group].push({ ...cmd, index });
    });
    
    let html = '';
    for (const [groupName, commands] of Object.entries(groups)) {
        html += `<div class="command-palette-group">`;
        html += `<div class="command-palette-group-title">${groupName}</div>`;
        
        for (const cmd of commands) {
            const isSelected = cmd.index === commandPaletteSelectedIndex;
            html += `
                <div class="command-palette-item${isSelected ? ' selected' : ''}" 
                     data-index="${cmd.index}" 
                     role="option"
                     aria-selected="${isSelected}"
                     onclick="executeCommandPaletteItem(${cmd.index})">
                    <span class="command-palette-item-icon">${cmd.icon}</span>
                    <div class="command-palette-item-content">
                        <div class="command-palette-item-title">${cmd.title}</div>
                        <div class="command-palette-item-description">${cmd.description}</div>
                    </div>
                    ${cmd.shortcut ? `<div class="command-palette-item-shortcut"><kbd>${cmd.shortcut}</kbd></div>` : ''}
                </div>
            `;
        }
        
        html += `</div>`;
    }
    
    resultsEl.innerHTML = html;
    
    // Ensure selected item is visible
    const selectedEl = resultsEl.querySelector('.command-palette-item.selected');
    if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
    }
}

/**
 * Handle input changes in command palette
 */
function handleCommandPaletteInput(e) {
    const query = e.target.value;
    filteredCommands = filterCommands(query);
    commandPaletteSelectedIndex = 0;
    renderCommandPaletteResults();
}

/**
 * Handle keyboard navigation in command palette
 */
function handleCommandPaletteKeydown(e) {
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            commandPaletteSelectedIndex = Math.min(commandPaletteSelectedIndex + 1, filteredCommands.length - 1);
            renderCommandPaletteResults();
            break;
        case 'ArrowUp':
            e.preventDefault();
            commandPaletteSelectedIndex = Math.max(commandPaletteSelectedIndex - 1, 0);
            renderCommandPaletteResults();
            break;
        case 'Enter':
            e.preventDefault();
            executeCommandPaletteItem(commandPaletteSelectedIndex);
            break;
        case 'Escape':
            e.preventDefault();
            hideCommandPalette();
            break;
    }
}

/**
 * Execute a command palette item
 */
function executeCommandPaletteItem(index) {
    const cmd = filteredCommands[index];
    if (cmd && cmd.action) {
        hideCommandPalette();
        cmd.action();
    }
}

/**
 * Show the command palette
 */
function showCommandPalette() {
    createCommandPalette();
    
    const overlay = document.getElementById('command-palette-overlay');
    const input = document.getElementById('command-palette-input');
    
    // Reset state
    filteredCommands = [...PALETTE_COMMANDS];
    commandPaletteSelectedIndex = 0;
    if (input) input.value = '';
    
    // Render and show
    renderCommandPaletteResults();
    overlay.classList.add('visible');
    commandPaletteOpen = true;
    
    // Focus input
    setTimeout(() => {
        if (input) input.focus();
    }, 50);
    
    announceToScreenReader('Command palette opened. Type to search commands.');
}

/**
 * Hide the command palette
 */
function hideCommandPalette() {
    const overlay = document.getElementById('command-palette-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
    commandPaletteOpen = false;
    announceToScreenReader('Command palette closed');
}

/**
 * Toggle command palette visibility
 */
function toggleCommandPalette() {
    if (commandPaletteOpen) {
        hideCommandPalette();
    } else {
        showCommandPalette();
    }
}

// Add Cmd+K / Ctrl+K handler
document.addEventListener('keydown', (e) => {
    // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
    }
    
    // Also handle Escape to close palette if open
    if (e.key === 'Escape' && commandPaletteOpen) {
        e.preventDefault();
        e.stopPropagation();
        hideCommandPalette();
    }
});

// Update keyboard hint to mention Cmd+K
function updateKeyboardHintForPalette() {
    const hint = document.getElementById('keyboard-hint');
    if (hint) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdKey = isMac ? '⌘' : 'Ctrl';
        hint.innerHTML = `<span class="keyboard-hint-text">Press <kbd>${cmdKey}+K</kbd> for commands</span>`;
    }
}

document.addEventListener('DOMContentLoaded', updateKeyboardHintForPalette);

// ============================================
// BROWSER NOTIFICATIONS
// ============================================

let notificationsEnabled = false;
let notificationPermission = 'default';

/**
 * Check if browser supports notifications
 */
function supportsNotifications() {
    return 'Notification' in window;
}

/**
 * Get stored notification preference
 */
function getNotificationPreference() {
    return localStorage.getItem('jarvis-pow-notifications') === 'enabled';
}

/**
 * Store notification preference
 */
function setNotificationPreference(enabled) {
    localStorage.setItem('jarvis-pow-notifications', enabled ? 'enabled' : 'disabled');
    notificationsEnabled = enabled;
    updateNotificationButton();
}

/**
 * Request notification permission from user
 */
async function requestNotificationPermission() {
    if (!supportsNotifications()) {
        console.log('Browser does not support notifications');
        return false;
    }
    
    notificationPermission = Notification.permission;
    
    if (notificationPermission === 'granted') {
        return true;
    }
    
    if (notificationPermission === 'denied') {
        showCopyToast('Notifications blocked. Enable in browser settings.', true);
        return false;
    }
    
    // Request permission
    const permission = await Notification.requestPermission();
    notificationPermission = permission;
    
    if (permission === 'granted') {
        setNotificationPreference(true);
        showCopyToast('🔔 Notifications enabled!');
        return true;
    } else {
        showCopyToast('Notification permission denied', true);
        return false;
    }
}

/**
 * Toggle notifications on/off
 */
async function toggleNotifications() {
    if (!supportsNotifications()) {
        showCopyToast('Your browser doesn\'t support notifications', true);
        return;
    }
    
    if (notificationsEnabled) {
        // Disable
        setNotificationPreference(false);
        showCopyToast('🔕 Notifications disabled');
    } else {
        // Enable - may need to request permission
        const granted = await requestNotificationPermission();
        if (granted) {
            setNotificationPreference(true);
        }
    }
}

/**
 * Update the notification toggle button state
 */
function updateNotificationButton() {
    const btn = document.getElementById('notificationToggle');
    if (!btn) return;
    
    const isEnabled = notificationsEnabled && notificationPermission === 'granted';
    if (isEnabled) {
        btn.textContent = '🔔 Notifs On';
        btn.classList.remove('muted');
        btn.title = 'Browser notifications enabled - click to disable';
    } else {
        btn.textContent = '🔕 Notifs Off';
        btn.classList.add('muted');
        btn.title = 'Browser notifications disabled - click to enable';
    }
    btn.setAttribute('aria-pressed', isEnabled);
    btn.setAttribute('aria-label', `Browser notifications: ${isEnabled ? 'On' : 'Off'}`);
}

/**
 * Show a browser notification for new activity
 */
function showActivityNotification(activity) {
    if (!notificationsEnabled || notificationPermission !== 'granted') {
        return;
    }
    
    // Don't show notifications if page is visible
    if (document.visibilityState === 'visible') {
        return;
    }
    
    // Activity type emoji mapping
    const typeEmoji = {
        'build': '🔧',
        'commit': '📝',
        'trade': '💱',
        'transfer': '💸',
        'decision': '🧠',
        'tweet': '🐦',
        'message': '💬',
        'email': '📧',
        'browser': '🌐',
        'calendar': '📅',
        'session': '🔌',
        'heartbeat': '💓',
        'deploy': '🚀'
    };
    
    const emoji = typeEmoji[activity.type] || '⚡';
    const title = `${emoji} New ${activity.type} activity`;
    const body = activity.description?.slice(0, 100) || 'New activity logged';
    const activityId = getActivityId(activity);
    
    try {
        const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `jarvis-activity-${activityId}`, // Prevents duplicate notifications
            renotify: false,
            silent: true // We already have audio
        });
        
        // Click notification to focus window and scroll to activity
        notification.onclick = () => {
            window.focus();
            scrollToActivity(activityId);
            notification.close();
        };
        
        // Auto-close after 8 seconds
        setTimeout(() => notification.close(), 8000);
        
    } catch (e) {
        console.error('Failed to show notification:', e);
    }
}

/**
 * Show notifications for multiple new activities
 */
function showNewActivitiesNotifications(newItems) {
    if (!newItems || newItems.length === 0) return;
    
    if (newItems.length === 1) {
        // Single activity - show detailed notification
        showActivityNotification(newItems[0]);
    } else {
        // Multiple activities - show summary notification
        if (!notificationsEnabled || notificationPermission !== 'granted') return;
        if (document.visibilityState === 'visible') return;
        
        try {
            const notification = new Notification(`⚡ ${newItems.length} new activities`, {
                body: `${newItems.map(a => a.type).join(', ')}`,
                icon: '/favicon.ico',
                tag: 'jarvis-activity-batch',
                silent: true
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            setTimeout(() => notification.close(), 8000);
        } catch (e) {
            console.error('Failed to show batch notification:', e);
        }
    }
}

/**
 * Initialize notifications system
 */
function initNotifications() {
    if (!supportsNotifications()) {
        // Hide notification button if not supported
        const btn = document.getElementById('notificationToggle');
        if (btn) btn.style.display = 'none';
        return;
    }
    
    // Check current permission
    notificationPermission = Notification.permission;
    
    // Check stored preference
    notificationsEnabled = getNotificationPreference() && notificationPermission === 'granted';
    
    // Update button state
    updateNotificationButton();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initNotifications);

// Hook into flashNewActivity to also show browser notification
const originalFlashNewActivity = flashNewActivity;
flashNewActivity = function(count, newItems = []) {
    // Call original function (plays sound, flashes header)
    originalFlashNewActivity(count, newItems);
    
    // Also show browser notification
    showNewActivitiesNotifications(newItems);
};

// ============================================
// ACTIVITY DEEP LINKS
// ============================================

/**
 * Get a short unique ID for an activity (first 8 chars of hash)
 */
function getActivityId(activity) {
    const hash = activity.hash || activity.proof?.hash;
    if (hash) return hash.slice(0, 8);
    // Fallback: create ID from timestamp + type
    const ts = new Date(activity.timestamp).getTime();
    return `${activity.type}-${ts.toString(36)}`;
}

/**
 * Generate full URL with activity hash
 * @param {string} activityId - Short activity ID (first 8 chars of hash)
 * @param {string} fullHash - Full SHA256 hash for social share URL
 */
function getActivityUrl(activityId, fullHash = null) {
    // If full hash provided, use the share page URL with OG meta tags
    if (fullHash && fullHash.length === 64) {
        const baseUrl = window.location.origin;
        return `${baseUrl}/share/${fullHash}`;
    }
    // Fallback to hash-based deep link
    const url = new URL(window.location.href);
    url.hash = `activity-${activityId}`;
    return url.toString();
}

/**
 * Copy activity link to clipboard and show feedback
 * @param {string} activityId - Short activity ID
 * @param {HTMLElement} buttonElement - Button element for visual feedback
 * @param {string} fullHash - Full SHA256 hash for social share URL
 */
function copyActivityLink(activityId, buttonElement, fullHash = null) {
    const url = getActivityUrl(activityId, fullHash);
    
    navigator.clipboard.writeText(url).then(() => {
        // Update button state
        if (buttonElement) {
            const originalContent = buttonElement.innerHTML;
            buttonElement.classList.add('copied');
            buttonElement.innerHTML = '';
            
            setTimeout(() => {
                buttonElement.classList.remove('copied');
                buttonElement.innerHTML = originalContent;
            }, 1500);
        }
        
        // Show toast
        showCopyToast('Link copied to clipboard!');
        
        // Play sound
        playNotificationSound('new');
        
        // Update URL without scrolling
        history.replaceState(null, '', url);
    }).catch(err => {
        console.error('Failed to copy link:', err);
        showCopyToast('Failed to copy link', true);
    });
}

/**
 * Show a toast notification
 */
function showCopyToast(message, isError = false) {
    // Remove existing toast if any
    const existing = document.querySelector('.copy-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = message;
    // ARIA: announce toast as an alert for screen readers
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    if (isError) {
        toast.style.background = 'var(--accent-red)';
        toast.style.color = '#fff';
        toast.setAttribute('aria-live', 'assertive');
    }
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

/**
 * Show an undo toast with action button for delete operations
 * @param {string} message - Message to display
 * @param {Object} options - Options for undo action
 * @param {string[]} options.hashes - Array of activity hashes that were deleted
 * @param {Function} options.onUndo - Callback when undo is clicked
 * @param {number} options.timeout - Auto-dismiss timeout in ms (default 5000)
 */
let undoToastTimeout = null;
function showUndoToast(message, options = {}) {
    const { hashes = [], onUndo = null, timeout = 5000 } = options;
    
    // Remove any existing undo toast
    const existing = document.querySelector('.undo-toast');
    if (existing) {
        existing.remove();
        if (undoToastTimeout) clearTimeout(undoToastTimeout);
    }
    
    const toast = document.createElement('div');
    toast.className = 'copy-toast undo-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    
    // Create toast content
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = `🗑️ ${message}`;
    
    const undoBtn = document.createElement('button');
    undoBtn.className = 'undo-btn';
    undoBtn.textContent = 'Undo';
    undoBtn.setAttribute('aria-label', 'Undo delete action');
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    
    // Progress bar for visual countdown
    const progress = document.createElement('div');
    progress.className = 'toast-progress';
    progress.style.animationDuration = `${timeout}ms`;
    
    toast.appendChild(messageSpan);
    toast.appendChild(undoBtn);
    toast.appendChild(closeBtn);
    toast.appendChild(progress);
    
    document.body.appendChild(toast);
    
    // Helper to dismiss toast
    const dismissToast = () => {
        if (undoToastTimeout) clearTimeout(undoToastTimeout);
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    };
    
    // Undo button click handler
    undoBtn.addEventListener('click', async () => {
        dismissToast();
        
        if (hashes.length === 0) {
            announceToScreenReader('Nothing to undo');
            return;
        }
        
        try {
            let restored = 0;
            let failed = 0;
            
            // Restore each deleted activity
            for (const hash of hashes) {
                try {
                    const response = await fetch(`/api/activities/${hash}/restore`, {
                        method: 'PATCH'
                    });
                    if (response.ok) {
                        restored++;
                    } else {
                        failed++;
                    }
                } catch (e) {
                    failed++;
                }
            }
            
            // Update local cache
            const activities = window.cachedActivities || allActivities || [];
            hashes.forEach(hash => {
                const activity = activities.find(a => (a.hash || a.proof?.hash) === hash);
                if (activity) {
                    activity.deleted = false;
                    delete activity.deletedAt;
                    activity.restoredAt = new Date().toISOString();
                }
            });
            
            // Re-render to show restored activities
            if (typeof applyFilters === 'function') {
                applyFilters();
            }
            
            // Update trash badge
            if (typeof updateTrashBadge === 'function') {
                updateTrashBadge();
            }
            
            // Feedback
            const msg = restored === 1 
                ? 'Activity restored' 
                : `${restored} activit${restored === 1 ? 'y' : 'ies'} restored`;
            showCopyToast(`♻️ ${msg}`, false);
            announceToScreenReader(msg);
            
            // Callback if provided
            if (onUndo) onUndo({ restored, failed });
            
        } catch (err) {
            console.error('Undo failed:', err);
            showCopyToast('❌ Undo failed', true);
            announceToScreenReader('Failed to undo delete');
        }
    });
    
    // Close button click handler
    closeBtn.addEventListener('click', dismissToast);
    
    // Keyboard support - Escape to dismiss, Enter on undo button
    toast.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dismissToast();
        }
    });
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('visible');
        undoBtn.focus(); // Focus undo button for keyboard access
    });
    
    // Auto-dismiss after timeout
    undoToastTimeout = setTimeout(() => {
        dismissToast();
    }, timeout);
}

/**
 * Show a toast notification with optional icon
 * @param {string} message - Message to display
 * @param {string} icon - Optional emoji icon to prepend
 */
function showToast(message, icon = '') {
    const fullMessage = icon ? `${icon} ${message}` : message;
    const isError = icon === '❌' || icon === '⚠️';
    showCopyToast(fullMessage, isError);
}

/**
 * Check URL hash and scroll to activity on page load
 */
function handleDeepLink() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#activity-')) return;
    
    const activityId = hash.replace('#activity-', '');
    scrollToActivity(activityId);
}

/**
 * Scroll to and highlight a specific activity
 */
function scrollToActivity(activityId, retryCount = 0) {
    const maxRetries = 10;
    const element = document.querySelector(`[data-activity-id="${activityId}"]`);
    
    if (element) {
        // Remove any existing highlights
        document.querySelectorAll('.activity-item.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
        
        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight after a short delay (let scroll complete)
        setTimeout(() => {
            element.classList.add('highlighted');
            
            // Remove highlight class after animation completes (but keep subtle border)
            setTimeout(() => {
                element.classList.remove('highlighted');
                element.style.borderColor = 'var(--accent-green)';
            }, 2500);
        }, 300);
        
        return true;
    } else if (retryCount < maxRetries) {
        // Activities might not be loaded yet, retry
        setTimeout(() => scrollToActivity(activityId, retryCount + 1), 300);
        return false;
    }
    
    return false;
}

// Handle deep link on page load
document.addEventListener('DOMContentLoaded', handleDeepLink);

// Handle hash changes (e.g., browser back/forward)
window.addEventListener('hashchange', handleDeepLink);

/**
 * Render share button HTML for activity cards
 */
function renderShareButton(activityId, fullHash = null) {
    const hashArg = fullHash ? `'${fullHash}'` : 'null';
    return `<button class="activity-share-btn" 
                    onclick="event.stopPropagation(); copyActivityLink('${activityId}', this, ${hashArg});" 
                    title="Copy shareable link (with social preview)">
        🔗
    </button>`;
}

// ============================================
// ACTIVITY DIFF VIEW
// ============================================

/**
 * Render compare button for activity cards
 * @param {string} hash - The activity hash
 */
function renderCompareButton(hash) {
    if (!hash) return '';
    return `<button class="compare-btn" 
                    onclick="event.stopPropagation(); showDiffModal('${hash}');" 
                    title="Compare with previous activity"
                    aria-label="Compare with previous activity of same type">
        ⚖️
    </button>`;
}

/**
 * Show diff modal comparing activity with previous same-type
 * @param {string} hash - The activity hash
 */
async function showDiffModal(hash) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('diff-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'diff-modal';
        modal.className = 'diff-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'diff-modal-title');
        modal.innerHTML = `
            <div class="diff-modal-content" role="document">
                <div class="diff-modal-header">
                    <h3 id="diff-modal-title">⚖️ Activity Comparison</h3>
                    <button class="diff-close" onclick="hideDiffModal()" aria-label="Close comparison modal">×</button>
                </div>
                <div class="diff-modal-body" id="diff-modal-body">
                    <div class="diff-loading">Loading comparison...</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideDiffModal();
        });
    }
    
    // Show modal with loading state
    modal.classList.add('visible');
    document.getElementById('diff-modal-body').innerHTML = `
        <div class="diff-loading">
            <div class="loading-spinner"></div>
            <span>Loading comparison...</span>
        </div>
    `;
    
    // Focus close button for accessibility
    setTimeout(() => {
        modal.querySelector('.diff-close').focus();
    }, 100);
    
    // Trap focus in modal
    modal.addEventListener('keydown', handleDiffModalKeydown);
    
    try {
        const response = await fetch(`/api/activities/${hash}/diff`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load diff');
        }
        
        document.getElementById('diff-modal-body').innerHTML = renderDiffContent(data);
        announceToScreenReader('Activity comparison loaded');
    } catch (error) {
        document.getElementById('diff-modal-body').innerHTML = `
            <div class="diff-error">
                <span class="error-icon">❌</span>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

/**
 * Hide the diff modal
 */
function hideDiffModal() {
    const modal = document.getElementById('diff-modal');
    if (modal) {
        modal.classList.remove('visible');
        modal.removeEventListener('keydown', handleDiffModalKeydown);
    }
}

/**
 * Handle keyboard events in diff modal
 */
function handleDiffModalKeydown(e) {
    if (e.key === 'Escape') {
        e.preventDefault();
        hideDiffModal();
    }
}

/**
 * Render the diff content HTML
 * @param {object} data - Diff data from API
 */
function renderDiffContent(data) {
    if (!data.hasPrevious) {
        return `
            <div class="diff-no-previous">
                <span class="info-icon">ℹ️</span>
                <p>${escapeHtml(data.message)}</p>
                <div class="diff-current-only">
                    <h4>Current Activity</h4>
                    <div class="diff-activity">
                        <div class="diff-type"><span class="activity-type">${escapeHtml(data.current.type)}</span></div>
                        <div class="diff-desc">${escapeHtml(data.current.description)}</div>
                        <div class="diff-time">${formatTime(data.current.timestamp)}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    const { current, previous, timeDelta, descriptionDiff, metadataDiff } = data;
    
    // Build metadata diff HTML
    let metadataHtml = '';
    const hasMetaChanges = Object.keys(metadataDiff.added).length > 0 || 
                           Object.keys(metadataDiff.removed).length > 0 || 
                           Object.keys(metadataDiff.changed).length > 0;
    
    if (hasMetaChanges) {
        metadataHtml = '<div class="diff-metadata">';
        metadataHtml += '<h4>📋 Metadata Changes</h4>';
        
        // Added fields
        for (const [key, value] of Object.entries(metadataDiff.added)) {
            metadataHtml += `<div class="meta-change added">
                <span class="meta-key">+ ${escapeHtml(key)}:</span>
                <span class="meta-value">${escapeHtml(JSON.stringify(value))}</span>
            </div>`;
        }
        
        // Removed fields
        for (const [key, value] of Object.entries(metadataDiff.removed)) {
            metadataHtml += `<div class="meta-change removed">
                <span class="meta-key">- ${escapeHtml(key)}:</span>
                <span class="meta-value">${escapeHtml(JSON.stringify(value))}</span>
            </div>`;
        }
        
        // Changed fields
        for (const [key, change] of Object.entries(metadataDiff.changed)) {
            metadataHtml += `<div class="meta-change changed">
                <span class="meta-key">~ ${escapeHtml(key)}:</span>
                <div class="meta-diff">
                    <div class="meta-from">${escapeHtml(JSON.stringify(change.from))}</div>
                    <span class="meta-arrow">→</span>
                    <div class="meta-to">${escapeHtml(JSON.stringify(change.to))}</div>
                </div>
            </div>`;
        }
        
        metadataHtml += '</div>';
    }
    
    // Similarity indicator
    const similarityClass = descriptionDiff.similarity >= 80 ? 'high' : 
                            descriptionDiff.similarity >= 50 ? 'medium' : 'low';
    
    return `
        <div class="diff-summary">
            <div class="diff-stat">
                <span class="stat-label">Time Between</span>
                <span class="stat-value">⏱️ ${escapeHtml(timeDelta.display)}</span>
            </div>
            <div class="diff-stat">
                <span class="stat-label">Description Similarity</span>
                <span class="stat-value similarity-${similarityClass}">${descriptionDiff.similarity}%</span>
            </div>
        </div>
        
        <div class="diff-comparison">
            <div class="diff-side previous">
                <div class="diff-side-header">
                    <h4>⬅️ Previous</h4>
                    <span class="diff-time">${formatTime(previous.timestamp)}</span>
                </div>
                <div class="diff-activity">
                    <div class="diff-type"><span class="activity-type">${escapeHtml(previous.type)}</span></div>
                    <div class="diff-desc">${escapeHtml(previous.description)}</div>
                    <div class="diff-hash">${escapeHtml(previous.hash.slice(0, 12))}...</div>
                </div>
            </div>
            
            <div class="diff-arrow">➡️</div>
            
            <div class="diff-side current">
                <div class="diff-side-header">
                    <h4>➡️ Current</h4>
                    <span class="diff-time">${formatTime(current.timestamp)}</span>
                </div>
                <div class="diff-activity">
                    <div class="diff-type"><span class="activity-type">${escapeHtml(current.type)}</span></div>
                    <div class="diff-desc">${escapeHtml(current.description)}</div>
                    <div class="diff-hash">${escapeHtml(current.hash.slice(0, 12))}...</div>
                </div>
            </div>
        </div>
        
        ${metadataHtml}
    `;
}

// ============================================
// SCROLL TO TOP BUTTON
// ============================================

let scrollToTopBtn = null;
let scrollTimeout = null;
const SCROLL_THRESHOLD = 400; // Show button after scrolling 400px

/**
 * Initialize scroll to top button
 */
function initScrollToTop() {
    scrollToTopBtn = document.getElementById('scrollToTop');
    if (!scrollToTopBtn) return;
    
    // Listen for scroll events with throttling
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    updateScrollButtonVisibility();
}

/**
 * Handle scroll event with throttling
 */
function handleScroll() {
    if (scrollTimeout) return;
    
    scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
        updateScrollButtonVisibility();
    }, 100);
}

/**
 * Update scroll to top button visibility
 */
function updateScrollButtonVisibility() {
    if (!scrollToTopBtn) return;
    
    const scrollY = window.scrollY || window.pageYOffset;
    
    if (scrollY > SCROLL_THRESHOLD) {
        scrollToTopBtn.classList.add('visible');
    } else {
        scrollToTopBtn.classList.remove('visible');
    }
}

/**
 * Scroll to top of page smoothly
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // Optional: play a subtle sound
    playNotificationSound('new');
    
    // Focus on the header after scroll
    setTimeout(() => {
        const logo = document.querySelector('.logo-section');
        if (logo) logo.focus();
    }, 500);
}

// Add keyboard shortcut 't' for scroll to top
const originalHandleShortcutAction = handleShortcutAction;
handleShortcutAction = function(action) {
    if (action === 'scrollToTop') {
        scrollToTop();
    } else {
        originalHandleShortcutAction(action);
    }
};

// Add 't' key to keyboard shortcuts
KEYBOARD_SHORTCUTS['t'] = { action: 'scrollToTop', description: 'Scroll to top' };

// Update shortcuts modal to include the new shortcut
const originalCreateShortcutsModal = createShortcutsModal;
createShortcutsModal = function() {
    if (document.getElementById('shortcuts-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'shortcuts-modal';
    modal.className = 'shortcuts-modal';
    modal.innerHTML = `
        <div class="shortcuts-modal-content">
            <div class="shortcuts-header">
                <h3>⌨️ Keyboard Shortcuts</h3>
                <button class="shortcuts-close" onclick="hideShortcutsModal()">×</button>
            </div>
            <div class="shortcuts-grid">
                <div class="shortcut-section">
                    <h4>Navigation</h4>
                    <div class="shortcut-row"><kbd>/</kbd> Focus search</div>
                    <div class="shortcut-row"><kbd>Esc</kbd> Clear search / Close modal</div>
                    <div class="shortcut-row"><kbd>r</kbd> Reset all filters</div>
                    <div class="shortcut-row"><kbd>t</kbd> Scroll to top</div>
                </div>
                <div class="shortcut-section">
                    <h4>Tabs</h4>
                    <div class="shortcut-row"><kbd>1</kbd> Activity Feed</div>
                    <div class="shortcut-row"><kbd>2</kbd> Milestones</div>
                    <div class="shortcut-row"><kbd>3</kbd> Tweets</div>
                    <div class="shortcut-row"><kbd>4</kbd> Key Decisions</div>
                    <div class="shortcut-row"><kbd>5</kbd> Meta Story</div>
                    <div class="shortcut-row"><kbd>6</kbd> Verify</div>
                </div>
                <div class="shortcut-section">
                    <h4>Export & More</h4>
                    <div class="shortcut-row"><kbd>e</kbd> Export as JSON</div>
                    <div class="shortcut-row"><kbd>Shift+e</kbd> Export as CSV</div>
                    <div class="shortcut-row"><kbd>l</kbd> Load more activities</div>
                </div>
                <div class="shortcut-section">
                    <h4>Bookmarks</h4>
                    <div class="shortcut-row"><kbd>b</kbd> Toggle bookmark filter</div>
                    <div class="shortcut-row"><kbd>Shift+b</kbd> Bookmark focused activity</div>
                </div>
                <div class="shortcut-section">
                    <h4>View & Actions</h4>
                    <div class="shortcut-row"><kbd>z</kbd> Toggle focus mode</div>
                    <div class="shortcut-row"><kbd>c</kbd> Toggle compare mode</div>
                    <div class="shortcut-row"><kbd>x</kbd> Toggle bulk select mode</div>
                    <div class="shortcut-row"><kbd>v</kbd> Voice activity input</div>
                    <div class="shortcut-row"><kbd>?</kbd> Show this help</div>
                </div>
            </div>
            <p class="shortcuts-tip">💡 Tip: Press <kbd>?</kbd> anytime to see shortcuts</p>
        </div>
    `;
    document.body.appendChild(modal);
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', initScrollToTop);

// ============================================
// SERVICE WORKER REGISTRATION (PWA Support)
// ============================================

/**
 * Register service worker for PWA features:
 * - Offline support
 * - Installable app experience  
 * - Background sync
 * - Push notifications
 */
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('[PWA] Service workers not supported');
        return;
    }
    
    try {
        const registration = await navigator.serviceWorker.register('/pow/sw.js', {
            scope: '/pow/'
        });
        
        console.log('[PWA] Service worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('[PWA] New service worker installing...');
            
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New version available
                    showUpdateToast();
                }
            });
        });
        
        // Handle controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[PWA] Service worker updated, refreshing...');
        });
        
    } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
    }
}

/**
 * Show toast when app update is available
 */
function showUpdateToast() {
    const toast = document.createElement('div');
    toast.className = 'update-toast';
    toast.innerHTML = `
        <span>🔄 New version available!</span>
        <button onclick="location.reload()">Refresh</button>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    document.body.appendChild(toast);
    
    // Auto-dismiss after 30 seconds
    setTimeout(() => toast.remove(), 30000);
}

/**
 * Check if app is installed (standalone mode)
 */
function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}

/**
 * Prompt user to install the PWA
 */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default browser install prompt
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom install button if not already installed
    if (!isAppInstalled()) {
        showInstallButton();
    }
});

function showInstallButton() {
    // Check if install button already exists
    if (document.getElementById('pwaInstallBtn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'pwaInstallBtn';
    btn.className = 'sound-toggle';
    btn.innerHTML = '📲 Install App';
    btn.title = 'Install as app for offline access';
    btn.onclick = promptInstall;
    
    // Add to header button group
    const headerBtns = document.querySelector('header > div[style*="display: flex"]');
    if (headerBtns) {
        headerBtns.appendChild(btn);
    }
}

async function promptInstall() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[PWA] Install prompt outcome:', outcome);
    
    if (outcome === 'accepted') {
        // Hide install button
        const btn = document.getElementById('pwaInstallBtn');
        if (btn) btn.remove();
    }
    
    deferredPrompt = null;
}

// Track installation
window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully!');
    deferredPrompt = null;
    
    // Hide install button
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.remove();
    
    // Log installation as activity (if we have the API)
    if (window.cachedActivities) {
        console.log('[PWA] Dashboard installed as app');
    }
});

// Register service worker on page load
registerServiceWorker();

// ============================================
// ACCESSIBILITY HELPERS
// ============================================

/**
 * Announce a message to screen readers
 * @param {string} message - Message to announce
 */
function announceToScreenReader(message) {
    const announcer = document.getElementById('sr-announcements');
    if (announcer) {
        // Clear and set new message (triggers ARIA live region)
        announcer.textContent = '';
        setTimeout(() => {
            announcer.textContent = message;
        }, 100);
    }
}

/**
 * Initialize keyboard navigation for tabs
 */
function initTabKeyboardNav() {
    const tabList = document.querySelector('[role="tablist"]');
    if (!tabList) return;
    
    tabList.addEventListener('keydown', (e) => {
        const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
        const currentIndex = tabs.findIndex(tab => tab === document.activeElement);
        
        if (currentIndex === -1) return;
        
        let newIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = (currentIndex + 1) % tabs.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                newIndex = tabs.length - 1;
                break;
            default:
                return;
        }
        
        // Focus and activate the new tab
        tabs[newIndex].focus();
        const tabName = tabs[newIndex].dataset.tab;
        if (tabName) {
            switchTab(tabName);
            announceToScreenReader(`${tabName} tab selected`);
        }
    });
}

/**
 * Initialize keyboard navigation for activity feed
 * Arrow keys navigate between activities, Enter opens share menu
 */
function initActivityKeyboardNav() {
    const feed = document.getElementById('feed');
    if (!feed) return;
    
    feed.addEventListener('keydown', (e) => {
        const target = e.target;
        
        // Handle activity item navigation
        if (target.classList.contains('activity-item')) {
            const items = Array.from(feed.querySelectorAll('.activity-item[tabindex="0"]'));
            const currentIndex = items.indexOf(target);
            
            if (currentIndex === -1) return;
            
            let newIndex = currentIndex;
            
            switch (e.key) {
                case 'ArrowDown':
                case 'j': // vim-style
                    e.preventDefault();
                    newIndex = Math.min(currentIndex + 1, items.length - 1);
                    break;
                case 'ArrowUp':
                case 'k': // vim-style
                    e.preventDefault();
                    newIndex = Math.max(currentIndex - 1, 0);
                    break;
                case 'Enter':
                case ' ':
                    // Activate share button or expand details
                    e.preventDefault();
                    const shareBtn = target.querySelector('.share-activity-btn');
                    if (shareBtn) shareBtn.click();
                    break;
                default:
                    return;
            }
            
            if (newIndex !== currentIndex) {
                items[newIndex].focus();
                // Scroll into view smoothly
                items[newIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
        
        // Handle day header navigation (toggle collapse with Enter/Space)
        if (target.classList.contains('day-header')) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                target.click();
            }
        }
    });
}

/**
 * Make day headers keyboard accessible
 */
function initDayHeaderKeyboardNav() {
    // Use event delegation on feed container
    const feed = document.getElementById('feed');
    if (!feed) return;
    
    // Make day headers focusable when they're added
    const observer = new MutationObserver(() => {
        feed.querySelectorAll('.day-header:not([tabindex])').forEach(header => {
            header.setAttribute('tabindex', '0');
            header.setAttribute('role', 'button');
            const isCollapsed = header.closest('.day-group')?.classList.contains('collapsed');
            header.setAttribute('aria-expanded', !isCollapsed);
        });
    });
    
    observer.observe(feed, { childList: true, subtree: true });
}

/**
 * Initialize all accessibility features
 */
function initAccessibility() {
    initTabKeyboardNav();
    initActivityKeyboardNav();
    initDayHeaderKeyboardNav();
    
    // Announce initial page load
    setTimeout(() => {
        const count = window.cachedActivities?.length || 0;
        if (count > 0) {
            announceToScreenReader(`Dashboard loaded with ${count} activities`);
        }
    }, 2000);
}

// Initialize accessibility on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccessibility);
} else {
    initAccessibility();
}

// ============================================
// PERFORMANCE DASHBOARD
// ============================================

let performanceData = null;
let performanceRefreshInterval = null;

/**
 * Initialize performance dashboard when tab is selected
 */
function initPerformanceDashboard() {
    refreshPerformance();
    
    // Auto-refresh every 30 seconds while on the performance tab
    if (!performanceRefreshInterval) {
        performanceRefreshInterval = setInterval(() => {
            const activeTab = document.querySelector('.feed-tab.active');
            if (activeTab?.dataset.tab === 'performance') {
                refreshPerformance(true); // Silent refresh (no loading state)
            }
        }, 30000);
    }
}

/**
 * Fetch and display performance metrics
 * @param {boolean} silent - If true, don't show loading state
 */
async function refreshPerformance(silent = false) {
    const tbody = document.getElementById('perfEndpointsBody');
    
    if (!silent && tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="perf-loading">Loading metrics...</td></tr>';
    }
    
    try {
        const response = await fetch('/api/performance');
        if (!response.ok) throw new Error('Failed to load performance data');
        
        performanceData = await response.json();
        renderPerformanceData(performanceData);
    } catch (error) {
        console.error('[Performance] Failed to load:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="perf-error">Failed to load metrics: ${escapeHtml(error.message)}</td></tr>`;
        }
    }
}

/**
 * Render performance data to the dashboard
 * @param {object} data - Performance data from API
 */
function renderPerformanceData(data) {
    // Update summary cards
    updatePerfCard('perfUptime', data.uptime.formatted);
    updatePerfCard('perfMemory', `${data.memory.heapUsed} MB`);
    updatePerfCard('perfAvgResponse', `${data.requests.avgResponseTimeMs} ms`);
    updatePerfCard('perfReqPerMin', data.requests.requestsPerMinute.toFixed(1));
    updatePerfCard('perfTotalReq', data.requests.total.toLocaleString());
    
    const errorRate = data.requests.total > 0 
        ? ((data.requests.errors / data.requests.total) * 100).toFixed(2)
        : '0';
    updatePerfCard('perfErrorRate', `${errorRate}%`);
    
    // Color-code error rate
    const errorEl = document.getElementById('perfErrorRate');
    if (errorEl) {
        errorEl.classList.remove('good', 'warning', 'bad');
        if (parseFloat(errorRate) === 0) {
            errorEl.classList.add('good');
        } else if (parseFloat(errorRate) < 5) {
            errorEl.classList.add('warning');
        } else {
            errorEl.classList.add('bad');
        }
    }
    
    // Render endpoint table
    const tbody = document.getElementById('perfEndpointsBody');
    if (tbody) {
        const endpoints = Object.entries(data.endpoints);
        
        if (endpoints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="perf-empty">No endpoint data yet. Make some API requests!</td></tr>';
        } else {
            tbody.innerHTML = endpoints.map(([endpoint, metrics]) => {
                const avgClass = metrics.avgTimeMs < 50 ? 'good' : metrics.avgTimeMs < 200 ? 'ok' : 'slow';
                const p95Class = metrics.p95Ms < 100 ? 'good' : metrics.p95Ms < 500 ? 'ok' : 'slow';
                
                return `
                    <tr>
                        <td class="perf-endpoint" title="${escapeHtml(endpoint)}">${escapeHtml(endpoint)}</td>
                        <td>${metrics.count.toLocaleString()}</td>
                        <td class="perf-time ${avgClass}">${metrics.avgTimeMs}</td>
                        <td>${metrics.p50Ms}</td>
                        <td class="perf-time ${p95Class}">${metrics.p95Ms}</td>
                        <td class="${metrics.errorsCount > 0 ? 'perf-errors' : ''}">${metrics.errorsCount}</td>
                    </tr>
                `;
            }).join('');
        }
    }
    
    // Render recommendations
    const recsSection = document.getElementById('perfRecommendations');
    const recsList = document.getElementById('perfRecommendationsList');
    
    if (recsSection && recsList) {
        if (data.summary.recommendations.length > 0) {
            recsSection.style.display = 'block';
            recsList.innerHTML = data.summary.recommendations
                .map(rec => `<li>${escapeHtml(rec)}</li>`)
                .join('');
        } else {
            recsSection.style.display = 'none';
        }
    }
}

/**
 * Update a performance card value with animation
 */
function updatePerfCard(id, value) {
    const el = document.getElementById(id);
    if (el) {
        const oldValue = el.textContent;
        if (oldValue !== value) {
            el.textContent = value;
            el.classList.add('perf-updated');
            setTimeout(() => el.classList.remove('perf-updated'), 500);
        }
    }
}

// (Performance tab switching is handled in the main switchTab function above)

// ============================================
// FOCUS MODE (Zen Mode) - Distraction-free view
// ============================================

let focusModeActive = false;

/**
 * Create the Focus Mode overlay HTML
 */
function createFocusModeOverlay() {
    if (document.getElementById('focus-mode-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'focus-mode-overlay';
    overlay.className = 'focus-mode-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Focus mode - distraction-free view');
    
    overlay.innerHTML = `
        <div class="focus-mode-header">
            <div class="focus-mode-title">
                <span class="focus-icon">🎯</span>
                <h2>Focus Mode</h2>
            </div>
            <button class="focus-mode-close" onclick="toggleFocusMode()" title="Exit focus mode (Z)" aria-label="Close focus mode">×</button>
        </div>
        <div class="focus-mode-stats" id="focusModeStats">
            <!-- Stats populated by JS -->
        </div>
        <div class="focus-activities">
            <div class="focus-activities-header">
                <span class="focus-activities-title">
                    <span class="focus-live-dot"></span>
                    Latest Activities
                </span>
            </div>
            <div class="focus-activity-list" id="focusActivityList">
                <!-- Activities populated by JS -->
            </div>
        </div>
        <div class="focus-mode-footer">
            Press <kbd>Z</kbd> or <kbd>Esc</kbd> to exit focus mode
        </div>
    `;
    
    document.body.appendChild(overlay);
}

/**
 * Toggle Focus Mode on/off
 */
function toggleFocusMode() {
    focusModeActive = !focusModeActive;
    
    if (focusModeActive) {
        showFocusMode();
    } else {
        hideFocusMode();
    }
}

/**
 * Show Focus Mode overlay
 */
function showFocusMode() {
    createFocusModeOverlay();
    
    const overlay = document.getElementById('focus-mode-overlay');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    focusModeActive = true;
    
    // Populate with current data
    updateFocusModeContent();
    
    // Focus the close button for keyboard nav
    const closeBtn = overlay.querySelector('.focus-mode-close');
    if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 50);
    }
    
    announceToScreenReader('Focus mode activated. Showing key stats and latest activities.');
}

/**
 * Hide Focus Mode overlay
 */
function hideFocusMode() {
    const overlay = document.getElementById('focus-mode-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
    document.body.style.overflow = '';
    focusModeActive = false;
    announceToScreenReader('Focus mode closed.');
}

/**
 * Update Focus Mode content with current data
 */
function updateFocusModeContent() {
    const activities = window.cachedActivities || [];
    
    // Update stats
    const statsContainer = document.getElementById('focusModeStats');
    if (statsContainer) {
        const totalActivities = activities.length;
        const onChainCount = activities.filter(a => a.signature).length;
        const onChainPercent = totalActivities > 0 ? Math.round((onChainCount / totalActivities) * 100) : 0;
        
        // Calculate streak (simplified - count consecutive days with activity)
        const streakInfo = calculateFocusStreak(activities);
        
        statsContainer.innerHTML = `
            <div class="focus-stat-card">
                <span class="focus-stat-icon">📊</span>
                <div class="focus-stat-value">${totalActivities}</div>
                <div class="focus-stat-label">Total Activities</div>
            </div>
            <div class="focus-stat-card">
                <span class="focus-stat-icon">⛓️</span>
                <div class="focus-stat-value onchain">${onChainPercent}%</div>
                <div class="focus-stat-label">On-Chain Verified</div>
            </div>
            <div class="focus-stat-card">
                <span class="focus-stat-icon">🔥</span>
                <div class="focus-stat-value streak">${streakInfo.current}</div>
                <div class="focus-stat-label">Day Streak</div>
            </div>
        `;
    }
    
    // Update activities list (show latest 5)
    const activityList = document.getElementById('focusActivityList');
    if (activityList) {
        const latest5 = activities.slice(0, 5);
        
        if (latest5.length === 0) {
            activityList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">No activities yet</div>';
            return;
        }
        
        activityList.innerHTML = latest5.map(activity => {
            const emoji = getActivityEmoji(activity.type);
            const timestamp = new Date(activity.timestamp);
            const timeAgo = formatTimeAgo(timestamp);
            const isOnChain = !!activity.signature;
            
            return `
                <div class="focus-activity-item">
                    <div class="focus-activity-emoji">${emoji}</div>
                    <div class="focus-activity-content">
                        <div class="focus-activity-desc">${escapeHtml(activity.description || activity.content || 'No description')}</div>
                        <div class="focus-activity-meta">
                            <span class="focus-activity-type">${activity.type}</span>
                            <span>${timeAgo}</span>
                            ${isOnChain ? '<span class="focus-activity-onchain">⛓️ On-chain</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

/**
 * Calculate streak for focus mode
 */
function calculateFocusStreak(activities) {
    if (!activities || activities.length === 0) {
        return { current: 0, longest: 0 };
    }
    
    // Get unique days with activities
    const days = new Set();
    activities.forEach(a => {
        const date = new Date(a.timestamp).toISOString().split('T')[0];
        days.add(date);
    });
    
    const sortedDays = Array.from(days).sort().reverse();
    
    // Count consecutive days from today/yesterday
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Start counting if today or yesterday has activity
    if (sortedDays.includes(today) || sortedDays.includes(yesterday)) {
        let checkDate = new Date(sortedDays[0]);
        
        for (let i = 0; i < sortedDays.length; i++) {
            const expected = new Date(checkDate);
            expected.setDate(expected.getDate() - i);
            const expectedStr = expected.toISOString().split('T')[0];
            
            if (sortedDays[i] === expectedStr) {
                currentStreak++;
            } else {
                break;
            }
        }
    }
    
    return { current: currentStreak, longest: currentStreak };
}

/**
 * Get emoji for activity type
 */
function getActivityEmoji(type) {
    const emojis = {
        'commit': '📝',
        'build': '🔨',
        'trade': '💰',
        'message': '💬',
        'email': '📧',
        'calendar': '📅',
        'tweet': '🐦',
        'decision': '🧠',
        'heartbeat': '💓',
        'browser': '🌐',
        'milestone': '🏆',
        'default': '⚡'
    };
    return emojis[type?.toLowerCase()] || emojis.default;
}

/**
 * Format time ago helper
 */
function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
}

/**
 * Escape HTML helper
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ======== MINI ACTIVITY PREVIEW ON HOVER ========
// Shows a quick peek tooltip when hovering over activity cards

let activityPreviewEl = null;
let activityPreviewTimeout = null;
let currentPreviewActivity = null;

/**
 * Initialize the activity preview system
 */
function initActivityPreview() {
    // Create the preview element if it doesn't exist
    if (!activityPreviewEl) {
        activityPreviewEl = document.createElement('div');
        activityPreviewEl.className = 'activity-preview';
        activityPreviewEl.setAttribute('role', 'tooltip');
        activityPreviewEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(activityPreviewEl);
    }
    
    // Attach hover listeners to activity feed
    const feed = document.querySelector('.activity-feed');
    if (feed) {
        feed.addEventListener('mouseenter', handleActivityHover, true);
        feed.addEventListener('mouseleave', handleActivityLeave, true);
        feed.addEventListener('mousemove', handleActivityMove, true);
    }
}

/**
 * Handle mouse entering an activity item
 */
function handleActivityHover(e) {
    const item = e.target.closest('.activity-item');
    if (!item) return;
    
    // Clear any existing timeout
    if (activityPreviewTimeout) {
        clearTimeout(activityPreviewTimeout);
    }
    
    // Delay showing preview (200ms debounce for smooth UX)
    activityPreviewTimeout = setTimeout(() => {
        showActivityPreview(item, e);
    }, 200);
}

/**
 * Handle mouse leaving an activity item
 */
function handleActivityLeave(e) {
    const item = e.target.closest('.activity-item');
    const relatedTarget = e.relatedTarget;
    
    // Check if we're leaving the activity item
    if (item && (!relatedTarget || !item.contains(relatedTarget))) {
        hideActivityPreview();
    }
    
    // Clear pending timeout
    if (activityPreviewTimeout) {
        clearTimeout(activityPreviewTimeout);
        activityPreviewTimeout = null;
    }
}

/**
 * Handle mouse movement for preview positioning
 */
function handleActivityMove(e) {
    const item = e.target.closest('.activity-item');
    if (!item || !activityPreviewEl.classList.contains('visible')) return;
    
    // Update position to follow cursor (with offset)
    positionPreview(e.clientX, e.clientY);
}

/**
 * Show the activity preview for an item
 */
function showActivityPreview(item, event) {
    const hash = item.dataset.hash;
    if (!hash || !allActivities) return;
    
    // Find the activity data
    const activity = allActivities.find(a => (a.hash || a.proof?.hash) === hash);
    if (!activity) return;
    
    currentPreviewActivity = activity;
    
    // Render the preview content
    activityPreviewEl.innerHTML = renderPreviewContent(activity);
    activityPreviewEl.setAttribute('aria-hidden', 'false');
    
    // Position and show
    positionPreview(event.clientX, event.clientY);
    activityPreviewEl.classList.add('visible');
}

/**
 * Hide the activity preview
 */
function hideActivityPreview() {
    if (activityPreviewEl) {
        activityPreviewEl.classList.remove('visible');
        activityPreviewEl.setAttribute('aria-hidden', 'true');
    }
    currentPreviewActivity = null;
}

/**
 * Position the preview tooltip near the cursor
 */
function positionPreview(x, y) {
    if (!activityPreviewEl) return;
    
    const padding = 16;
    const previewRect = activityPreviewEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate position (prefer below and to the right of cursor)
    let left = x + padding;
    let top = y + padding;
    
    // Flip horizontally if going off-screen
    if (left + previewRect.width > viewportWidth - padding) {
        left = x - previewRect.width - padding;
    }
    
    // Flip vertically if going off-screen
    const flipVertical = top + previewRect.height > viewportHeight - padding;
    if (flipVertical) {
        top = y - previewRect.height - padding;
        activityPreviewEl.classList.add('flip-arrow');
    } else {
        activityPreviewEl.classList.remove('flip-arrow');
    }
    
    // Ensure minimum bounds
    left = Math.max(padding, left);
    top = Math.max(padding, top);
    
    activityPreviewEl.style.left = `${left}px`;
    activityPreviewEl.style.top = `${top}px`;
}

/**
 * Render the preview content HTML
 */
function renderPreviewContent(activity) {
    const hash = activity.hash || activity.proof?.hash || '';
    const type = activity.type || 'activity';
    const emoji = getActivityEmoji(type);
    const timestamp = new Date(activity.timestamp);
    const timeAgo = formatTimeAgo(timestamp);
    const formattedTime = timestamp.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
    
    const isOnChain = !!(activity.signature || activity.proof?.signature);
    const wallet = activity.wallet;
    const tags = activity.tags || [];
    const isPinned = !!activity.pinned;
    const hasNotes = !!activity.notes;
    
    // Tags HTML
    const tagsHtml = tags.length > 0 
        ? `<div class="preview-tags">${tags.slice(0, 5).map(t => `<span class="preview-tag">${escapeHtml(t)}</span>`).join('')}</div>`
        : '';
    
    // Meta items
    const metaItems = [];
    
    if (isOnChain) {
        metaItems.push(`<span class="preview-meta-item onchain">⛓️ On-chain verified</span>`);
    } else {
        metaItems.push(`<span class="preview-meta-item pending">⏳ Pending signature</span>`);
    }
    
    if (wallet) {
        const shortWallet = wallet.slice(0, 4) + '...' + wallet.slice(-4);
        metaItems.push(`<span class="preview-meta-item">👛 ${shortWallet}</span>`);
    }
    
    if (isPinned) {
        metaItems.push(`<span class="preview-meta-item">📌 Pinned</span>`);
    }
    
    if (hasNotes) {
        metaItems.push(`<span class="preview-meta-item">📝 Has notes</span>`);
    }
    
    // Hash display
    const hashDisplay = hash ? `<span class="preview-meta-item">🔗 ${hash.slice(0, 8)}...${hash.slice(-4)}</span>` : '';
    
    return `
        <div class="preview-header">
            <div class="preview-emoji">${emoji}</div>
            <div class="preview-title-group">
                <div class="preview-type type-${type}">${type}</div>
                <div class="preview-time" title="${formattedTime}">${timeAgo}</div>
            </div>
        </div>
        <div class="preview-desc">${escapeHtml(activity.description || '')}</div>
        ${tagsHtml}
        <div class="preview-meta">
            ${metaItems.join('')}
            ${hashDisplay}
        </div>
        <div class="preview-footer">
            <span>💡 Click for full details</span>
            <kbd>Enter</kbd>
        </div>
    `;
}

// Initialize activity preview when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActivityPreview);
} else {
    // DOM already loaded, init now
    setTimeout(initActivityPreview, 100);
}

// ============================================
// ACTIVITY COMPARISON MODE
// Select any 2 activities to compare side-by-side
// ============================================

let compareModeActive = false;
let compareSelections = []; // Array of selected activity hashes (max 2)
let compareBar = null;
let compareModal = null;

/**
 * Initialize comparison mode (called on DOM ready)
 */
function initCompareMode() {
    // Create floating compare bar
    createCompareBar();
    
    // Create compare modal
    createCompareModal();
    
    // Add keyboard shortcut 'c' for compare mode toggle
    KEYBOARD_SHORTCUTS['c'] = { action: 'toggleCompareMode', description: 'Toggle comparison mode' };
    
    // Update command palette with compare commands
    if (typeof PALETTE_COMMANDS !== 'undefined') {
        PALETTE_COMMANDS.push(
            { id: 'compare-mode', title: 'Toggle Comparison Mode', description: 'Select 2 activities to compare', icon: '⚖️', shortcut: 'C', action: () => toggleCompareMode(), group: 'Actions' },
            { id: 'clear-compare', title: 'Clear Comparison Selection', description: 'Deselect all activities', icon: '🗑️', action: () => clearCompareSelections(), group: 'Actions' }
        );
    }
    
    console.log('[Compare Mode] Initialized');
}

// NOTE: toggleCompareMode is defined below in the consolidated implementation

/**
 * Create the floating comparison bar
 */
function createCompareBar() {
    if (document.getElementById('compare-bar')) return;
    
    compareBar = document.createElement('div');
    compareBar.id = 'compare-bar';
    compareBar.className = 'compare-bar';
    compareBar.setAttribute('role', 'status');
    compareBar.setAttribute('aria-live', 'polite');
    compareBar.innerHTML = `
        <div class="compare-bar-status">
            <span class="compare-bar-icon">⚖️</span>
            <div class="compare-bar-text">
                <span class="compare-bar-title">Comparison Mode</span>
                <span class="compare-bar-subtitle" id="compare-bar-hint">Select 2 activities</span>
            </div>
        </div>
        <div class="compare-bar-count">
            <span class="compare-bar-count-num" id="compare-count">0</span>
            <span class="compare-bar-count-label">/ 2</span>
        </div>
        <div class="compare-bar-actions">
            <button class="compare-bar-btn primary" id="compare-btn" onclick="showCompareModal()" disabled>
                Compare
            </button>
            <button class="compare-bar-btn secondary" onclick="clearCompareSelections()">
                Clear
            </button>
            <button class="compare-bar-btn secondary" onclick="toggleCompareMode()">
                Exit
            </button>
        </div>
    `;
    document.body.appendChild(compareBar);
}

/**
 * Create the comparison modal
 */
function createCompareModal() {
    if (document.getElementById('compare-modal')) return;
    
    compareModal = document.createElement('div');
    compareModal.id = 'compare-modal';
    compareModal.className = 'compare-modal';
    compareModal.setAttribute('role', 'dialog');
    compareModal.setAttribute('aria-modal', 'true');
    compareModal.setAttribute('aria-labelledby', 'compare-modal-title');
    compareModal.innerHTML = `
        <div class="compare-modal-content" role="document">
            <div class="compare-modal-header">
                <h3 id="compare-modal-title">⚖️ Activity Comparison</h3>
                <button class="compare-modal-close" onclick="hideCompareModal()" aria-label="Close comparison">×</button>
            </div>
            <div class="compare-modal-body" id="compare-modal-body">
                <p>Select two activities to compare.</p>
            </div>
        </div>
    `;
    document.body.appendChild(compareModal);
    
    // Close on backdrop click
    compareModal.addEventListener('click', (e) => {
        if (e.target === compareModal) hideCompareModal();
    });
    
    // Close on Escape
    compareModal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideCompareModal();
    });
}

/**
 * Update the compare bar UI
 */
function updateCompareBar() {
    if (!compareBar) return;
    
    const count = compareSelections.length;
    const countEl = document.getElementById('compare-count');
    const hintEl = document.getElementById('compare-bar-hint');
    const compareBtn = document.getElementById('compare-btn');
    
    if (countEl) countEl.textContent = count;
    
    if (count === 0) {
        hintEl.textContent = 'Select 2 activities';
        compareBtn.disabled = true;
    } else if (count === 1) {
        hintEl.textContent = 'Select 1 more activity';
        compareBtn.disabled = true;
    } else {
        hintEl.textContent = 'Ready to compare!';
        compareBtn.disabled = false;
    }
    
    // Show bar when in compare mode
    if (compareModeActive) {
        compareBar.classList.add('visible');
    }
}

/**
 * Hide the compare bar
 */
function hideCompareBar() {
    if (compareBar) {
        compareBar.classList.remove('visible');
    }
}

/**
 * Toggle selection of an activity for comparison
 */
function toggleCompareSelection(hash) {
    if (!compareModeActive) return;
    
    const index = compareSelections.indexOf(hash);
    
    if (index > -1) {
        // Remove from selection
        compareSelections.splice(index, 1);
    } else if (compareSelections.length < 2) {
        // Add to selection
        compareSelections.push(hash);
    } else {
        // Already have 2 selected - replace the first one
        compareSelections.shift();
        compareSelections.push(hash);
    }
    
    updateCompareSelectionUI();
    updateCompareBar();
}

/**
 * Update the visual selection state on activity items
 */
function updateCompareSelectionUI() {
    // Remove all selection states
    document.querySelectorAll('.activity-item.compare-selected').forEach(item => {
        item.classList.remove('compare-selected');
        const badge = item.querySelector('.compare-order-badge');
        if (badge) badge.remove();
        const checkbox = item.querySelector('.activity-select-checkbox');
        if (checkbox) checkbox.classList.remove('selected');
    });
    
    // Apply selection states
    compareSelections.forEach((hash, index) => {
        const item = document.querySelector(`.activity-item[data-hash="${hash}"]`);
        if (item) {
            item.classList.add('compare-selected');
            
            // Add order badge
            let badge = item.querySelector('.compare-order-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'compare-order-badge';
                item.appendChild(badge);
            }
            badge.textContent = index + 1;
            
            // Update checkbox
            const checkbox = item.querySelector('.activity-select-checkbox');
            if (checkbox) checkbox.classList.add('selected');
        }
    });
}

/**
 * Clear all comparison selections
 */
function clearCompareSelections() {
    compareSelections = [];
    updateCompareSelectionUI();
    updateCompareBar();
}

/**
 * Show the comparison modal with selected activities
 * (wrapper for openComparisonModal to work with HTML button)
 */
function showCompareModal() {
    // Use the consolidated compareSelectedActivities array
    if (compareSelectedActivities.length !== 2) return;
    openComparisonModal();
}
    
    announceToScreenReader('Activity comparison modal opened');
}

/**
 * Hide the comparison modal
 */
function hideCompareModal() {
    if (compareModal) {
        compareModal.classList.remove('visible');
    }
}

/**
 * Render the comparison content HTML
 */
function renderComparisonContent(a1, a2) {
    const getEmoji = (type) => {
        const emojis = {
            commit: '📝', build: '🔨', trade: '💹', message: '💬',
            tweet: '🐦', decision: '🧠', heartbeat: '💓', email: '📧',
            calendar: '📅', browser: '🌐', research: '🔍'
        };
        return emojis[type] || '📋';
    };
    
    const formatTimeCompare = (ts) => {
        const d = new Date(ts);
        return d.toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });
    };
    
    const formatTimeAgoCompare = (ts) => {
        const now = Date.now();
        const diff = now - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (mins > 0) return `${mins}m ago`;
        return 'Just now';
    };
    
    // Calculate differences
    const time1 = new Date(a1.timestamp).getTime();
    const time2 = new Date(a2.timestamp).getTime();
    const timeDiff = Math.abs(time2 - time1);
    const timeDiffHours = Math.floor(timeDiff / 3600000);
    const timeDiffMins = Math.floor((timeDiff % 3600000) / 60000);
    let timeDeltaStr = '';
    if (timeDiffHours > 24) {
        timeDeltaStr = `${Math.floor(timeDiffHours / 24)}d ${timeDiffHours % 24}h`;
    } else if (timeDiffHours > 0) {
        timeDeltaStr = `${timeDiffHours}h ${timeDiffMins}m`;
    } else {
        timeDeltaStr = `${timeDiffMins}m`;
    }
    
    const sameType = a1.type === a2.type;
    const sameWallet = (a1.wallet || 'default') === (a2.wallet || 'default');
    
    // Render activity card
    const renderCard = (a, num) => {
        const hash = a.hash || a.proof?.hash || '';
        const sig = a.signature || a.proof?.signature || '';
        const tags = a.tags || [];
        const isOnChain = !!sig;
        
        return `
            <div class="compare-card">
                <div class="compare-card-header">
                    <div class="compare-card-number">${num}</div>
                    <span class="compare-card-label">Activity ${num}</span>
                    <span class="compare-card-time">${formatTimeAgoCompare(a.timestamp)}</span>
                </div>
                
                <div class="compare-field">
                    <div class="compare-field-label">Type</div>
                    <div class="compare-field-value type">
                        ${getEmoji(a.type)} <span class="activity-type">${escapeHtml(a.type || 'unknown')}</span>
                    </div>
                </div>
                
                <div class="compare-field">
                    <div class="compare-field-label">Description</div>
                    <div class="compare-field-value">${escapeHtml(a.description || 'No description')}</div>
                </div>
                
                <div class="compare-field">
                    <div class="compare-field-label">Timestamp</div>
                    <div class="compare-field-value">${formatTimeCompare(a.timestamp)}</div>
                </div>
                
                ${hash ? `
                <div class="compare-field">
                    <div class="compare-field-label">Hash</div>
                    <div class="compare-field-value hash">${escapeHtml(hash)}</div>
                </div>
                ` : ''}
                
                ${sig ? `
                <div class="compare-field">
                    <div class="compare-field-label">On-Chain Signature</div>
                    <div class="compare-field-value signature">${escapeHtml(sig)}</div>
                </div>
                ` : `
                <div class="compare-field">
                    <div class="compare-field-label">On-Chain Status</div>
                    <div class="compare-field-value">⏳ Pending signature</div>
                </div>
                `}
                
                ${tags.length > 0 ? `
                <div class="compare-field">
                    <div class="compare-field-label">Tags</div>
                    <div class="compare-field-value tags">
                        ${tags.map(t => `<span class="tag-item">${escapeHtml(t)}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${a.wallet ? `
                <div class="compare-field">
                    <div class="compare-field-label">Wallet</div>
                    <div class="compare-field-value" style="font-family: monospace; font-size: 0.8rem;">${escapeHtml(a.wallet)}</div>
                </div>
                ` : ''}
            </div>
        `;
    };
    
    return `
        <div class="compare-grid">
            ${renderCard(a1, 1)}
            
            <div class="compare-divider">
                <div class="compare-divider-line"></div>
                <span class="compare-divider-icon">⚖️</span>
                <div class="compare-divider-line"></div>
            </div>
            
            ${renderCard(a2, 2)}
        </div>
        
        <div class="compare-diff-section">
            <div class="compare-diff-title">📊 Comparison Summary</div>
            <div class="compare-diff-grid">
                <div class="compare-diff-item">
                    <div class="compare-diff-item-label">Time Between</div>
                    <div class="compare-diff-item-value time-delta">⏱️ ${timeDeltaStr}</div>
                </div>
                <div class="compare-diff-item">
                    <div class="compare-diff-item-label">Type Match</div>
                    <div class="compare-diff-item-value ${sameType ? 'same' : 'different'}">
                        ${sameType ? '✓ Same type' : '✗ Different types'}
                    </div>
                </div>
                <div class="compare-diff-item">
                    <div class="compare-diff-item-label">Wallet Match</div>
                    <div class="compare-diff-item-value ${sameWallet ? 'same' : 'different'}">
                        ${sameWallet ? '✓ Same wallet' : '✗ Different wallets'}
                    </div>
                </div>
                <div class="compare-diff-item">
                    <div class="compare-diff-item-label">Both On-Chain</div>
                    <div class="compare-diff-item-value ${(a1.signature && a2.signature) ? 'same' : 'different'}">
                        ${(a1.signature && a2.signature) ? '✓ Both verified' : 
                          (!a1.signature && !a2.signature) ? '✗ Neither verified' :
                          '⚠️ One verified'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render the selection checkbox for activity cards (called during activity rendering)
 */
function renderCompareCheckbox(hash) {
    if (!hash) return '';
    const isSelected = compareSelections.includes(hash);
    return `<div class="activity-select-checkbox ${isSelected ? 'selected' : ''}" 
                onclick="event.stopPropagation(); toggleCompareSelection('${hash}')"
                role="checkbox" 
                aria-checked="${isSelected}"
                aria-label="Select for comparison"
                tabindex="0"></div>`;
}

// Update the handleShortcutAction function to include compare mode toggle
const _originalHandleShortcutActionCompare = typeof handleShortcutAction === 'function' ? handleShortcutAction : null;
handleShortcutAction = function(action) {
    if (action === 'toggleCompareMode') {
        toggleCompareMode();
    } else if (_originalHandleShortcutActionCompare) {
        _originalHandleShortcutActionCompare(action);
    }
};

// Initialize comparison mode on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCompareMode);
} else {
    setTimeout(initCompareMode, 150);
}

// ============================================
// ACTIVITY COMPARISON MODE
// Select 2 activities to compare side-by-side
// ============================================

let compareModeActive = false;
let compareSelectedActivities = []; // Array of {hash, activity} objects
let compareSelectionPanelEl = null;

/**
 * Initialize the comparison mode system
 */
function initComparisonMode() {
    // Create floating selection panel
    createCompareSelectionPanel();
    
    // Add comparison mode toggle button to filter section
    const filterSection = document.querySelector('.filter-section') || document.querySelector('.filters');
    if (filterSection) {
        const existingToggle = document.getElementById('compare-mode-toggle');
        if (!existingToggle) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'compare-mode-toggle';
            toggleBtn.className = 'compare-mode-toggle';
            toggleBtn.title = 'Compare Mode - Select 2 activities to compare (C)';
            toggleBtn.innerHTML = '<span class="toggle-icon">⚖️</span> Compare';
            toggleBtn.onclick = toggleCompareMode;
            filterSection.appendChild(toggleBtn);
        }
    }
    
    // Listen for activity card clicks when in compare mode
    document.addEventListener('click', handleCompareClick);
}

/**
 * Create the floating comparison selection panel
 */
function createCompareSelectionPanel() {
    if (document.getElementById('compare-selection-panel')) return;
    
    const panel = document.createElement('div');
    panel.id = 'compare-selection-panel';
    panel.className = 'compare-selection-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Activity comparison selection');
    
    panel.innerHTML = `
        <div class="compare-panel-title">Compare Activities</div>
        <div class="compare-selected-items">
            <div class="compare-slot" id="compare-slot-1" data-slot="1">
                <span class="compare-slot-num">1</span>
                <div class="compare-slot-content">
                    <span class="compare-slot-empty">Select first activity</span>
                </div>
            </div>
            <span class="compare-vs">VS</span>
            <div class="compare-slot" id="compare-slot-2" data-slot="2">
                <span class="compare-slot-num">2</span>
                <div class="compare-slot-content">
                    <span class="compare-slot-empty">Select second activity</span>
                </div>
            </div>
        </div>
        <div class="compare-actions">
            <button class="compare-btn-action compare-btn-primary" id="compare-start-btn" disabled onclick="openComparisonModal()">
                ⚖️ Compare
            </button>
            <button class="compare-btn-action compare-btn-secondary" onclick="clearCompareSelection()">
                ✕ Clear
            </button>
        </div>
    `;
    
    document.body.appendChild(panel);
    compareSelectionPanelEl = panel;
}

/**
 * Toggle comparison mode on/off
 */
function toggleCompareMode() {
    compareModeActive = !compareModeActive;
    
    const toggleBtn = document.getElementById('compare-mode-toggle');
    const panel = document.getElementById('compare-selection-panel');
    const compareBar = document.getElementById('compare-bar');
    const feed = document.getElementById('feed');
    
    if (compareModeActive) {
        document.body.classList.add('compare-mode-active');
        feed?.classList.add('compare-mode-active');
        if (toggleBtn) {
            toggleBtn.classList.add('active');
            toggleBtn.innerHTML = '<span class="toggle-icon">✓</span><span class="toggle-text">Compare ON</span>';
        }
        if (panel) panel.classList.add('visible');
        if (compareBar) compareBar.classList.add('visible');
        updateCompareBarUI();
        announceToScreenReader('Compare mode activated. Click on activities to select them for comparison.');
    } else {
        document.body.classList.remove('compare-mode-active');
        feed?.classList.remove('compare-mode-active');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
            toggleBtn.innerHTML = '<span class="toggle-icon">⚖️</span><span class="toggle-text">Compare</span>';
        }
        if (panel) panel.classList.remove('visible');
        if (compareBar) compareBar.classList.remove('visible');
        clearCompareSelection();
        announceToScreenReader('Compare mode deactivated.');
    }
    
    // Update command palette button if visible
    if (typeof hideCommandPalette === 'function') hideCommandPalette();
}

/**
 * Handle clicks on activity cards during compare mode
 */
function handleCompareClick(event) {
    if (!compareModeActive) return;
    
    // Find if click was on an activity item
    const activityItem = event.target.closest('.activity-item');
    if (!activityItem) return;
    
    // Ignore clicks on buttons inside the activity
    if (event.target.closest('button') || event.target.closest('a')) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const hash = activityItem.dataset.hash;
    if (!hash) return;
    
    // Find the activity data
    const activities = window.cachedActivities || allActivities || [];
    const activity = activities.find(a => (a.hash || a.proof?.hash) === hash);
    if (!activity) return;
    
    // Check if already selected
    const existingIndex = compareSelectedActivities.findIndex(s => s.hash === hash);
    
    if (existingIndex >= 0) {
        // Deselect
        compareSelectedActivities.splice(existingIndex, 1);
        activityItem.classList.remove('compare-selected');
    } else if (compareSelectedActivities.length < 2) {
        // Select
        compareSelectedActivities.push({ hash, activity });
        activityItem.classList.add('compare-selected');
    } else {
        // Already have 2 selected, show hint
        announceToScreenReader('Maximum 2 activities can be selected. Clear selection to choose different activities.');
    }
    
    updateCompareSelectionUI();
}

/**
 * Update the floating selection panel UI
 */
function updateCompareSelectionUI() {
    const slot1 = document.getElementById('compare-slot-1');
    const slot2 = document.getElementById('compare-slot-2');
    const compareBtn = document.getElementById('compare-start-btn');
    
    // Update slot 1
    if (compareSelectedActivities[0]) {
        const a = compareSelectedActivities[0].activity;
        slot1.classList.add('filled');
        slot1.querySelector('.compare-slot-content').innerHTML = `
            <div class="compare-slot-type">${getActivityEmoji(a.type)} ${a.type}</div>
            <div class="compare-slot-desc">${escapeHtml(a.description.substring(0, 40))}${a.description.length > 40 ? '...' : ''}</div>
            <button class="compare-slot-remove" onclick="removeFromCompare(0)" title="Remove">×</button>
        `;
    } else {
        slot1.classList.remove('filled');
        slot1.querySelector('.compare-slot-content').innerHTML = '<span class="compare-slot-empty">Select first activity</span>';
    }
    
    // Update slot 2
    if (compareSelectedActivities[1]) {
        const a = compareSelectedActivities[1].activity;
        slot2.classList.add('filled');
        slot2.querySelector('.compare-slot-content').innerHTML = `
            <div class="compare-slot-type">${getActivityEmoji(a.type)} ${a.type}</div>
            <div class="compare-slot-desc">${escapeHtml(a.description.substring(0, 40))}${a.description.length > 40 ? '...' : ''}</div>
            <button class="compare-slot-remove" onclick="removeFromCompare(1)" title="Remove">×</button>
        `;
    } else {
        slot2.classList.remove('filled');
        slot2.querySelector('.compare-slot-content').innerHTML = '<span class="compare-slot-empty">Select second activity</span>';
    }
    
    // Enable/disable compare button
    if (compareBtn) {
        compareBtn.disabled = compareSelectedActivities.length < 2;
    }
    
    // Also update the HTML compare bar
    updateCompareBarUI();
}

/**
 * Update the HTML compare bar UI (the floating bar at bottom)
 */
function updateCompareBarUI() {
    const countEl = document.getElementById('compare-count');
    const subtitleEl = document.getElementById('compare-bar-subtitle');
    const compareBtn = document.getElementById('compare-btn');
    
    const count = compareSelectedActivities.length;
    
    if (countEl) countEl.textContent = count;
    
    if (subtitleEl) {
        if (count === 0) {
            subtitleEl.textContent = 'Select 2 activities';
        } else if (count === 1) {
            subtitleEl.textContent = 'Select 1 more';
        } else {
            subtitleEl.textContent = 'Ready to compare!';
        }
    }
    
    if (compareBtn) {
        compareBtn.disabled = count < 2;
    }
}

/**
 * Remove an activity from comparison selection
 */
function removeFromCompare(index) {
    const removed = compareSelectedActivities[index];
    if (removed) {
        // Remove visual selection from the card
        const card = document.querySelector(`.activity-item[data-hash="${removed.hash}"]`);
        if (card) card.classList.remove('compare-selected');
    }
    
    compareSelectedActivities.splice(index, 1);
    updateCompareSelectionUI();
}

/**
 * Clear all comparison selections
 */
function clearCompareSelection() {
    // Remove visual selection from all cards
    compareSelectedActivities.forEach(s => {
        const card = document.querySelector(`.activity-item[data-hash="${s.hash}"]`);
        if (card) card.classList.remove('compare-selected');
    });
    
    compareSelectedActivities = [];
    updateCompareSelectionUI();
}

/**
 * Open the comparison modal showing 2 selected activities
 */
function openComparisonModal() {
    if (compareSelectedActivities.length < 2) return;
    
    const [first, second] = compareSelectedActivities;
    
    // Create modal if doesn't exist
    let modal = document.getElementById('compare-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'compare-modal';
        modal.className = 'compare-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'compare-modal-title');
        
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeComparisonModal();
        });
        
        // Close on escape
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeComparisonModal();
        });
    }
    
    // Calculate comparison stats
    const stats = calculateComparisonStats(first.activity, second.activity);
    
    modal.innerHTML = `
        <div class="compare-modal-content" role="document">
            <div class="compare-modal-header">
                <h3 id="compare-modal-title">⚖️ Activity Comparison</h3>
                <button class="compare-modal-close" onclick="closeComparisonModal()" aria-label="Close comparison">×</button>
            </div>
            <div class="compare-modal-body">
                <div class="compare-side-by-side">
                    <div class="compare-side compare-left">
                        <div class="compare-side-label">🔵 Activity 1</div>
                        ${renderCompareActivityCard(first.activity)}
                    </div>
                    <div class="compare-divider">
                        <div class="compare-divider-line"></div>
                        <div class="compare-divider-vs">VS</div>
                        <div class="compare-divider-line"></div>
                    </div>
                    <div class="compare-side compare-right">
                        <div class="compare-side-label">🟢 Activity 2</div>
                        ${renderCompareActivityCard(second.activity)}
                    </div>
                </div>
                <div class="compare-stats">
                    <div class="compare-stats-title">📊 Comparison Analysis</div>
                    <div class="compare-stats-grid">
                        ${stats.map(s => `
                            <div class="compare-stat-item">
                                <div class="compare-stat-label">${s.label}</div>
                                <div class="compare-stat-value ${s.class || ''}">${s.value}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('visible');
    
    // Focus the close button for accessibility
    setTimeout(() => {
        modal.querySelector('.compare-modal-close').focus();
    }, 100);
    
    announceToScreenReader('Activity comparison modal opened');
}

/**
 * Close the comparison modal
 */
function closeComparisonModal() {
    const modal = document.getElementById('compare-modal');
    if (modal) {
        modal.classList.remove('visible');
    }
}

/**
 * Render an activity card for the comparison modal
 */
function renderCompareActivityCard(activity) {
    const type = activity.type || 'activity';
    const emoji = getActivityEmoji(type);
    const timestamp = new Date(activity.timestamp);
    const formattedTime = timestamp.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
    const hash = activity.hash || activity.proof?.hash || '';
    const isOnChain = !!(activity.signature || activity.proof?.signature);
    const wallet = activity.wallet || '';
    const tags = activity.tags || [];
    
    return `
        <div class="compare-activity-type">${emoji} ${type}</div>
        <div class="compare-activity-desc">${escapeHtml(activity.description)}</div>
        <div class="compare-activity-meta">
            <div class="compare-activity-meta-item">
                <span class="meta-icon">📅</span>
                ${formattedTime}
            </div>
            ${isOnChain ? `<div class="compare-activity-meta-item">
                <span class="meta-icon">⛓️</span>
                On-chain verified
            </div>` : `<div class="compare-activity-meta-item">
                <span class="meta-icon">⏳</span>
                Pending
            </div>`}
            ${wallet ? `<div class="compare-activity-meta-item">
                <span class="meta-icon">👛</span>
                ${wallet.slice(0, 4)}...${wallet.slice(-4)}
            </div>` : ''}
            ${hash ? `<div class="compare-activity-meta-item">
                <span class="meta-icon">🔗</span>
                ${hash.slice(0, 8)}...${hash.slice(-4)}
            </div>` : ''}
            ${tags.length > 0 ? `<div class="compare-activity-meta-item">
                <span class="meta-icon">🏷️</span>
                ${tags.slice(0, 3).join(', ')}${tags.length > 3 ? '...' : ''}
            </div>` : ''}
        </div>
    `;
}

/**
 * Calculate comparison stats between two activities
 */
function calculateComparisonStats(a1, a2) {
    const stats = [];
    
    // Time difference
    const t1 = new Date(a1.timestamp);
    const t2 = new Date(a2.timestamp);
    const timeDiff = Math.abs(t2 - t1);
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeStr;
    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        timeStr = `${days} day${days > 1 ? 's' : ''} apart`;
    } else if (hours > 0) {
        timeStr = `${hours}h ${minutes}m apart`;
    } else {
        timeStr = `${minutes}m apart`;
    }
    stats.push({ label: 'Time Gap', value: timeStr });
    
    // Type comparison
    if (a1.type === a2.type) {
        stats.push({ label: 'Type Match', value: '✓ Same Type', class: 'positive' });
    } else {
        stats.push({ label: 'Type Match', value: '✗ Different', class: 'neutral' });
    }
    
    // On-chain status
    const onChain1 = !!(a1.signature || a1.proof?.signature);
    const onChain2 = !!(a2.signature || a2.proof?.signature);
    if (onChain1 && onChain2) {
        stats.push({ label: 'On-Chain', value: 'Both Verified', class: 'positive' });
    } else if (onChain1 || onChain2) {
        stats.push({ label: 'On-Chain', value: 'One Verified', class: 'neutral' });
    } else {
        stats.push({ label: 'On-Chain', value: 'Neither Verified', class: 'negative' });
    }
    
    // Description length comparison
    const len1 = a1.description?.length || 0;
    const len2 = a2.description?.length || 0;
    const lenDiff = Math.abs(len1 - len2);
    if (lenDiff < 20) {
        stats.push({ label: 'Detail Level', value: 'Similar', class: 'neutral' });
    } else if (len1 > len2) {
        stats.push({ label: 'Detail Level', value: '#1 More Detailed' });
    } else {
        stats.push({ label: 'Detail Level', value: '#2 More Detailed' });
    }
    
    // Wallet comparison
    if (a1.wallet && a2.wallet) {
        if (a1.wallet === a2.wallet) {
            stats.push({ label: 'Wallet', value: 'Same Wallet', class: 'positive' });
        } else {
            stats.push({ label: 'Wallet', value: 'Different Wallets' });
        }
    }
    
    // Tags comparison
    const tags1 = new Set(a1.tags || []);
    const tags2 = new Set(a2.tags || []);
    const sharedTags = [...tags1].filter(t => tags2.has(t));
    if (sharedTags.length > 0) {
        stats.push({ label: 'Shared Tags', value: sharedTags.slice(0, 2).join(', '), class: 'positive' });
    } else if (tags1.size > 0 || tags2.size > 0) {
        stats.push({ label: 'Shared Tags', value: 'None' });
    }
    
    return stats;
}

// Add 'C' keyboard shortcut for compare mode
const originalShortcutHandler = window.handleShortcutAction;
if (typeof handleShortcutAction === 'function') {
    const _originalHandleShortcutAction = handleShortcutAction;
    handleShortcutAction = function(action) {
        if (action === 'toggleCompareMode') {
            toggleCompareMode();
            return;
        }
        return _originalHandleShortcutAction(action);
    };
}

// Add to command palette
if (typeof PALETTE_COMMANDS !== 'undefined' && Array.isArray(PALETTE_COMMANDS)) {
    PALETTE_COMMANDS.push({
        id: 'compare-mode',
        title: 'Toggle Compare Mode',
        description: 'Select 2 activities to compare side-by-side',
        icon: '⚖️',
        shortcut: 'C',
        action: () => { toggleCompareMode(); hideCommandPalette(); },
        group: 'Actions'
    });
}

// Initialize comparison mode when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComparisonMode);
} else {
    setTimeout(initComparisonMode, 200);
}

// Add keyboard listener for 'C' key
document.addEventListener('keydown', (e) => {
    // Ignore if typing in an input or if modal is open
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    if (document.querySelector('.compare-modal.visible')) return;
    if (document.querySelector('.command-palette-overlay.visible')) return;
    
    if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleCompareMode();
    }
});

// ============================================
// CUSTOM ACTIVITY TYPES MANAGEMENT
// ============================================

let activityTypesCache = null;

/**
 * Fetch all activity types from the API
 */
async function fetchActivityTypes() {
    try {
        const response = await fetch('/api/activity-types');
        if (!response.ok) throw new Error('Failed to fetch activity types');
        activityTypesCache = await response.json();
        return activityTypesCache;
    } catch (e) {
        console.error('Failed to fetch activity types:', e);
        return null;
    }
}

/**
 * Render a single type card
 */
function renderTypeCard(type, isCustom = false) {
    const colorBar = type.color ? `<div class="type-color-bar" style="background: ${escapeHtml(type.color)};"></div>` : '';
    const deleteBtn = isCustom ? `<button class="type-delete-btn" onclick="deleteCustomType('${escapeHtml(type.id)}')" title="Delete type" aria-label="Delete ${escapeHtml(type.name)}">&times;</button>` : '';
    const usageText = type.usageCount !== undefined ? `${type.usageCount} ${type.usageCount === 1 ? 'activity' : 'activities'}` : '';
    
    return `
        <div class="type-card ${isCustom ? 'custom' : 'builtin'}" data-type-id="${escapeHtml(type.id)}">
            ${deleteBtn}
            <span class="type-emoji">${type.emoji || '⚡'}</span>
            <span class="type-name">${escapeHtml(type.name)}</span>
            ${usageText ? `<span class="type-usage">${usageText}</span>` : ''}
            ${colorBar}
        </div>
    `;
}

/**
 * Render the custom types modal content
 */
async function renderCustomTypesModal() {
    const data = await fetchActivityTypes();
    if (!data) return;
    
    // Render built-in types
    const builtinGrid = document.getElementById('builtinTypesList');
    if (builtinGrid) {
        builtinGrid.innerHTML = data.builtIn.map(t => renderTypeCard(t, false)).join('');
    }
    
    // Render custom types
    const customGrid = document.getElementById('customTypesList');
    if (customGrid) {
        if (data.custom.length === 0) {
            customGrid.innerHTML = '<div class="no-custom-types">No custom types yet. Create one above!</div>';
        } else {
            customGrid.innerHTML = data.custom.map(t => renderTypeCard(t, true)).join('');
        }
    }
}

/**
 * Open the custom types modal
 */
async function openCustomTypesModal() {
    const modal = document.getElementById('customTypesModal');
    if (modal) {
        modal.style.display = 'flex';
        await renderCustomTypesModal();
        // Trap focus
        modal.querySelector('.modal-close')?.focus();
    }
}

/**
 * Close the custom types modal
 */
function closeCustomTypesModal() {
    const modal = document.getElementById('customTypesModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Handle adding a new custom type
 */
async function handleAddCustomType(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('newTypeName');
    const emojiInput = document.getElementById('newTypeEmoji');
    const colorInput = document.getElementById('newTypeColor');
    const descInput = document.getElementById('newTypeDesc');
    
    const name = nameInput?.value?.trim();
    const emoji = emojiInput?.value?.trim() || '⚡';
    const color = colorInput?.value || '#6B7280';
    const description = descInput?.value?.trim() || '';
    
    if (!name) {
        alert('Please enter a type name');
        return;
    }
    
    try {
        const response = await fetch('/api/activity-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, emoji, color, description })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            alert(result.error || 'Failed to create type');
            return;
        }
        
        // Clear form
        if (nameInput) nameInput.value = '';
        if (emojiInput) emojiInput.value = '';
        if (colorInput) colorInput.value = '#6B7280';
        if (descInput) descInput.value = '';
        
        // Refresh the list
        await renderCustomTypesModal();
        
        // Show success
        console.log('✨ Custom type created:', result);
        
    } catch (e) {
        console.error('Failed to create custom type:', e);
        alert('Failed to create custom type. Check console for details.');
    }
}

/**
 * Delete a custom type
 */
async function deleteCustomType(typeId) {
    if (!typeId) return;
    
    // Get the type info for confirmation
    const types = activityTypesCache?.custom || [];
    const type = types.find(t => t.id === typeId);
    const typeName = type?.name || typeId;
    
    const confirmed = confirm(`Delete custom type "${typeName}"?\n\nNote: Existing activities using this type will keep their type label.`);
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/activity-types/${encodeURIComponent(typeId)}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            alert(result.error || 'Failed to delete type');
            return;
        }
        
        // Refresh the list
        await renderCustomTypesModal();
        
        console.log('🗑️ Custom type deleted:', result);
        
    } catch (e) {
        console.error('Failed to delete custom type:', e);
        alert('Failed to delete custom type. Check console for details.');
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('customTypesModal');
        if (modal && modal.style.display !== 'none') {
            closeCustomTypesModal();
        }
    }
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('customTypesModal');
    if (e.target === modal) {
        closeCustomTypesModal();
    }
});

// Add to command palette if available
if (typeof PALETTE_COMMANDS !== 'undefined') {
    PALETTE_COMMANDS.push({
        id: 'custom-types',
        title: 'Manage Custom Types',
        description: 'Create and manage custom activity types',
        icon: '✨',
        action: () => { openCustomTypesModal(); hideCommandPalette(); },
        group: 'Settings'
    });
}

// ==========================================
// CUSTOM ACTIVITY TYPES MANAGEMENT
// ==========================================

// Global state for custom types
let customTypesCache = [];
let customTypesModalVisible = false;

/**
 * Load custom types from API and cache them.
 */
async function loadCustomTypes() {
    try {
        const response = await fetch('/api/custom-types');
        if (!response.ok) throw new Error('Failed to load custom types');
        const data = await response.json();
        customTypesCache = data.custom || [];
        updateCustomTypeFilters();
        return customTypesCache;
    } catch (e) {
        console.error('Failed to load custom types:', e);
        return [];
    }
}

/**
 * Update the type filter buttons with custom types.
 */
function updateCustomTypeFilters() {
    const container = document.getElementById('customTypeFilters');
    if (!container) return;
    
    if (customTypesCache.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = customTypesCache.map(type => `
        <button class="type-filter custom-type-filter" 
                data-type="${escapeHtml(type.id)}" 
                onclick="setTypeFilter('${escapeHtml(type.id)}')"
                aria-pressed="false"
                style="${type.color ? `--custom-type-color: ${type.color}` : ''}">
            ${type.emoji} ${escapeHtml(type.name)}
        </button>
    `).join('');
}

/**
 * Get emoji for a type (including custom types).
 */
function getTypeEmoji(type) {
    // Check custom types first
    const customType = customTypesCache.find(t => t.id === type);
    if (customType) return customType.emoji;
    
    // Built-in types
    const builtIn = {
        'commit': '📝',
        'build': '🔨',
        'trade': '💹',
        'message': '💬',
        'email': '📧',
        'calendar': '📅',
        'tweet': '🐦',
        'decision': '🧠',
        'heartbeat': '💓',
        'browser': '🌐',
        'transfer': '💸',
        'deploy': '🚀',
        'session': '🔌',
        'research': '🔍'
    };
    return builtIn[type] || '⚡';
}

/**
 * Open the custom types management modal.
 */
function openCustomTypesModal() {
    // Remove existing modal if any
    const existing = document.querySelector('.custom-types-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.className = 'custom-types-modal';
    modal.onclick = (e) => {
        if (e.target === modal) closeCustomTypesModal();
    };
    
    modal.innerHTML = `
        <div class="custom-types-content" role="dialog" aria-modal="true" aria-labelledby="custom-types-title">
            <div class="custom-types-header">
                <h3 id="custom-types-title">📦 Custom Activity Types</h3>
                <button class="custom-types-close" onclick="closeCustomTypesModal()" aria-label="Close">&times;</button>
            </div>
            <div class="custom-types-body">
                <div class="custom-type-form">
                    <h4>Create New Type</h4>
                    <div class="form-row">
                        <div class="form-group small">
                            <label for="newTypeEmoji">Emoji</label>
                            <input type="text" id="newTypeEmoji" class="emoji-input" placeholder="🎯" maxlength="4">
                        </div>
                        <div class="form-group">
                            <label for="newTypeName">Name</label>
                            <input type="text" id="newTypeName" placeholder="Code Review" maxlength="50">
                        </div>
                        <div class="form-group small">
                            <label for="newTypeColor">Color</label>
                            <input type="color" id="newTypeColor" class="color-input" value="#00ffaa">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="newTypeDesc">Description (optional)</label>
                            <input type="text" id="newTypeDesc" placeholder="Activities related to reviewing code..." maxlength="200">
                        </div>
                    </div>
                    <div class="custom-type-actions">
                        <button class="create-type-btn" onclick="createCustomType()" id="createTypeBtn">
                            ➕ Create Type
                        </button>
                    </div>
                </div>
                
                <div class="custom-types-list">
                    <h4>Your Custom Types</h4>
                    <div id="customTypesList">
                        ${renderCustomTypesList()}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    customTypesModalVisible = true;
    
    // Focus the name input
    setTimeout(() => {
        document.getElementById('newTypeName')?.focus();
    }, 100);
    
    // Escape key to close
    document.addEventListener('keydown', handleCustomTypesEscape);
}

/**
 * Close the custom types modal.
 */
function closeCustomTypesModal() {
    const modal = document.querySelector('.custom-types-modal');
    if (modal) {
        modal.remove();
    }
    customTypesModalVisible = false;
    document.removeEventListener('keydown', handleCustomTypesEscape);
}

function handleCustomTypesEscape(e) {
    if (e.key === 'Escape' && customTypesModalVisible) {
        closeCustomTypesModal();
    }
}

/**
 * Render the list of custom types.
 */
function renderCustomTypesList() {
    if (customTypesCache.length === 0) {
        return `
            <div class="no-custom-types">
                <span>📭</span>
                No custom types yet. Create one above!
            </div>
        `;
    }
    
    // Get activity counts per type
    const typeCounts = {};
    if (window.cachedActivities) {
        window.cachedActivities.forEach(a => {
            typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
        });
    }
    
    return customTypesCache.map(type => `
        <div class="custom-type-item" data-type-id="${escapeHtml(type.id)}">
            <span class="custom-type-emoji">${type.emoji}</span>
            <div class="custom-type-info">
                <div class="custom-type-name">
                    ${escapeHtml(type.name)}
                    ${type.color ? `<span class="custom-type-color-dot" style="background: ${type.color}"></span>` : ''}
                </div>
                <div class="custom-type-id">${escapeHtml(type.id)}</div>
                ${type.description ? `<div class="custom-type-desc">${escapeHtml(type.description)}</div>` : ''}
            </div>
            <span class="custom-type-count">${typeCounts[type.id] || 0} activities</span>
            <button class="custom-type-delete" onclick="deleteCustomType('${escapeHtml(type.id)}')" title="Delete type" aria-label="Delete ${escapeHtml(type.name)}">
                🗑️
            </button>
        </div>
    `).join('');
}

/**
 * Create a new custom type.
 */
async function createCustomType() {
    const nameInput = document.getElementById('newTypeName');
    const emojiInput = document.getElementById('newTypeEmoji');
    const colorInput = document.getElementById('newTypeColor');
    const descInput = document.getElementById('newTypeDesc');
    const btn = document.getElementById('createTypeBtn');
    
    const name = nameInput?.value.trim();
    const emoji = emojiInput?.value.trim();
    const color = colorInput?.value;
    const description = descInput?.value.trim();
    
    if (!name || !emoji) {
        announceToScreenReader('Please fill in both name and emoji');
        return;
    }
    
    // Disable button while creating
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creating...';
    }
    
    try {
        const response = await fetch('/api/custom-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, emoji, color, description })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create type');
        }
        
        // Add to cache and refresh
        customTypesCache.push(data.type);
        updateCustomTypeFilters();
        
        // Update list in modal
        const listEl = document.getElementById('customTypesList');
        if (listEl) listEl.innerHTML = renderCustomTypesList();
        
        // Clear form
        if (nameInput) nameInput.value = '';
        if (emojiInput) emojiInput.value = '';
        if (descInput) descInput.value = '';
        
        announceToScreenReader(`Custom type ${name} created successfully`);
        
    } catch (e) {
        console.error('Failed to create custom type:', e);
        announceToScreenReader(`Error: ${e.message}`);
        alert(`Failed to create type: ${e.message}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '➕ Create Type';
        }
    }
}

/**
 * Delete a custom type.
 */
async function deleteCustomType(id) {
    const type = customTypesCache.find(t => t.id === id);
    if (!type) return;
    
    if (!confirm(`Delete custom type "${type.name}"?\n\nExisting activities with this type will be preserved.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/custom-types/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete type');
        }
        
        // Remove from cache and refresh
        customTypesCache = customTypesCache.filter(t => t.id !== id);
        updateCustomTypeFilters();
        
        // Update list in modal
        const listEl = document.getElementById('customTypesList');
        if (listEl) listEl.innerHTML = renderCustomTypesList();
        
        announceToScreenReader(`Custom type ${type.name} deleted`);
        
    } catch (e) {
        console.error('Failed to delete custom type:', e);
        announceToScreenReader(`Error: ${e.message}`);
        alert(`Failed to delete type: ${e.message}`);
    }
}

// Add to command palette
if (typeof PALETTE_COMMANDS !== 'undefined' && Array.isArray(PALETTE_COMMANDS)) {
    PALETTE_COMMANDS.push({
        id: 'custom-types',
        title: 'Manage Custom Types',
        description: 'Create and manage custom activity types',
        icon: '📦',
        action: () => { openCustomTypesModal(); hideCommandPalette(); },
        group: 'Settings'
    });
}

// Load custom types on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCustomTypes);
} else {
    setTimeout(loadCustomTypes, 300);
}

// ============================================
// DASHBOARD ONBOARDING TOUR
// ============================================

const TOUR_STORAGE_KEY = 'pow-tour-completed';
const TOUR_VERSION = 1; // Increment to force re-show tour for new features

/**
 * Tour steps configuration
 * Each step targets a specific element and shows an explanation
 */
const TOUR_STEPS = [
    {
        target: '.logo-section',
        title: 'Welcome to Proof of Work! 🎉',
        content: 'This dashboard shows real-time activity from Jarvis, an autonomous AI agent. Every action is cryptographically signed and verifiable on the Solana blockchain.',
        position: 'bottom'
    },
    {
        target: '.stats',
        title: 'Activity Statistics 📊',
        content: 'These cards show key metrics: total actions, on-chain verification rate, commits, builds, trades, and more. All stats update in real-time as new activities come in.',
        position: 'bottom'
    },
    {
        target: '#streak-card',
        title: 'Activity Streak 🔥',
        content: 'Track consecutive days of activity. The streak counter shows how many days in a row the agent has been active.',
        position: 'top'
    },
    {
        target: '.proof-banner',
        title: 'Cryptographic Verification 🔐',
        content: 'Every activity is hashed using SHA-256, signed with Ed25519, and the proof is stored on Solana mainnet. This ensures complete transparency and immutability.',
        position: 'bottom'
    },
    {
        target: '.charts-section',
        title: 'Analytics & Insights 📈',
        content: 'Dive deep into activity patterns with interactive charts, heatmaps, and insights. See peak hours, weekly comparisons, and set daily goals.',
        position: 'top',
        scrollTo: true
    },
    {
        target: '#achievements-panel',
        title: 'Achievement Badges 🏅',
        content: 'Earn badges by reaching milestones! Categories include Activity, Streak, On-Chain, Diversity, and Special achievements with 5 tiers from Bronze to Diamond.',
        position: 'top',
        scrollTo: true
    },
    {
        target: '.feed-tabs',
        title: 'Activity Views 📋',
        content: 'Switch between different views: Activity Feed shows all actions, Milestones highlights achievements, Tweets shows social posts, and Verify lets you check on-chain proofs.',
        position: 'bottom',
        scrollTo: true
    },
    {
        target: '.feed-filters',
        title: 'Filter & Search 🔍',
        content: 'Search activities by keyword, filter by type, tags, date range, or wallet. Use the timeline slider for visual time selection. Export your filtered results as JSON or CSV.',
        position: 'top'
    },
    {
        target: '#soundToggle',
        title: 'Sound & Notifications 🔔',
        content: 'Enable sound notifications to hear when new activities arrive. You can also enable browser notifications to stay updated even when the tab is in the background.',
        position: 'bottom'
    },
    {
        target: '#themeToggle',
        title: 'Theme Selection 🎨',
        content: 'Choose from 6 color themes: Dark, Light, Ocean, Forest, Sunset, and Cyberpunk. Your preference is saved automatically.',
        position: 'bottom'
    },
    {
        target: '#focusModeToggle',
        title: 'Focus Mode 🎯',
        content: 'Toggle Focus Mode (Z) for a distraction-free view. It hides stats and charts, showing only the activity feed.',
        position: 'bottom'
    },
    {
        target: null, // Final step with no target
        title: 'You\'re All Set! 🚀',
        content: 'Explore the dashboard and watch the AI work in real-time. Press ? for keyboard shortcuts, Ctrl+K for the command palette, and C to compare activities. Enjoy!',
        position: 'center'
    }
];

let currentTourStep = 0;
let tourOverlay = null;
let tourTooltip = null;
let tourHighlight = null;
let tourActive = false;

/**
 * Check if tour should auto-start for new visitors
 */
function shouldShowTour() {
    const stored = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!stored) return true;
    
    try {
        const data = JSON.parse(stored);
        // Show if version is outdated
        return data.version < TOUR_VERSION;
    } catch {
        return true;
    }
}

/**
 * Mark tour as completed
 */
function completeTour() {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
        completed: true,
        version: TOUR_VERSION,
        completedAt: new Date().toISOString()
    }));
}

/**
 * Create tour overlay and tooltip elements
 */
function createTourElements() {
    // Overlay
    tourOverlay = document.createElement('div');
    tourOverlay.className = 'tour-overlay';
    tourOverlay.setAttribute('role', 'dialog');
    tourOverlay.setAttribute('aria-modal', 'true');
    tourOverlay.setAttribute('aria-label', 'Dashboard tour');
    
    // Highlight ring
    tourHighlight = document.createElement('div');
    tourHighlight.className = 'tour-highlight';
    
    // Tooltip
    tourTooltip = document.createElement('div');
    tourTooltip.className = 'tour-tooltip';
    tourTooltip.innerHTML = `
        <div class="tour-tooltip-content">
            <div class="tour-header">
                <span class="tour-step-indicator"></span>
                <button class="tour-close" onclick="endTour()" aria-label="Close tour">&times;</button>
            </div>
            <h3 class="tour-title"></h3>
            <p class="tour-content"></p>
            <div class="tour-footer">
                <div class="tour-progress">
                    <div class="tour-progress-bar"></div>
                </div>
                <div class="tour-buttons">
                    <button class="tour-btn tour-btn-skip" onclick="endTour()">Skip Tour</button>
                    <button class="tour-btn tour-btn-prev" onclick="prevTourStep()">← Back</button>
                    <button class="tour-btn tour-btn-next" onclick="nextTourStep()">Next →</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(tourOverlay);
    document.body.appendChild(tourHighlight);
    document.body.appendChild(tourTooltip);
}

/**
 * Start the tour
 */
function startTour() {
    if (tourActive) return;
    
    tourActive = true;
    currentTourStep = 0;
    
    // Create elements if not exist
    if (!tourOverlay) {
        createTourElements();
    }
    
    // Show overlay
    tourOverlay.classList.add('active');
    document.body.classList.add('tour-active');
    
    // Show first step
    showTourStep(currentTourStep);
    
    // Add keyboard listener
    document.addEventListener('keydown', handleTourKeydown);
    
    announceToScreenReader('Dashboard tour started. Press Escape to skip, Enter or Right Arrow for next step.');
}

/**
 * End the tour
 */
function endTour() {
    if (!tourActive) return;
    
    tourActive = false;
    
    // Hide elements
    if (tourOverlay) tourOverlay.classList.remove('active');
    if (tourHighlight) tourHighlight.classList.remove('active');
    if (tourTooltip) tourTooltip.classList.remove('active');
    document.body.classList.remove('tour-active');
    
    // Mark as completed
    completeTour();
    
    // Remove keyboard listener
    document.removeEventListener('keydown', handleTourKeydown);
    
    announceToScreenReader('Tour completed');
}

/**
 * Show a specific tour step
 */
function showTourStep(stepIndex) {
    const step = TOUR_STEPS[stepIndex];
    if (!step) {
        endTour();
        return;
    }
    
    // Update tooltip content
    const title = tourTooltip.querySelector('.tour-title');
    const content = tourTooltip.querySelector('.tour-content');
    const indicator = tourTooltip.querySelector('.tour-step-indicator');
    const progressBar = tourTooltip.querySelector('.tour-progress-bar');
    const prevBtn = tourTooltip.querySelector('.tour-btn-prev');
    const nextBtn = tourTooltip.querySelector('.tour-btn-next');
    const skipBtn = tourTooltip.querySelector('.tour-btn-skip');
    
    title.textContent = step.title;
    content.textContent = step.content;
    indicator.textContent = `Step ${stepIndex + 1} of ${TOUR_STEPS.length}`;
    progressBar.style.width = `${((stepIndex + 1) / TOUR_STEPS.length) * 100}%`;
    
    // Show/hide nav buttons
    prevBtn.style.display = stepIndex === 0 ? 'none' : 'inline-block';
    
    // Last step shows "Finish" instead of "Next"
    if (stepIndex === TOUR_STEPS.length - 1) {
        nextBtn.textContent = 'Finish ✓';
        skipBtn.style.display = 'none';
    } else {
        nextBtn.textContent = 'Next →';
        skipBtn.style.display = 'inline-block';
    }
    
    // Position highlight and tooltip
    if (step.target) {
        const targetEl = document.querySelector(step.target);
        
        if (targetEl) {
            // Scroll to element if needed
            if (step.scrollTo) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Wait for scroll then position
                setTimeout(() => positionTourElements(targetEl, step.position), 400);
            } else {
                positionTourElements(targetEl, step.position);
            }
            
            tourHighlight.classList.add('active');
        } else {
            // Target not found, center tooltip
            positionCenteredTooltip();
            tourHighlight.classList.remove('active');
        }
    } else {
        // No target - center tooltip (final step)
        positionCenteredTooltip();
        tourHighlight.classList.remove('active');
    }
    
    tourTooltip.classList.add('active');
    
    // Announce to screen reader
    announceToScreenReader(`${step.title}. ${step.content}`);
}

/**
 * Position tour elements around target
 */
function positionTourElements(targetEl, position) {
    const rect = targetEl.getBoundingClientRect();
    const padding = 8;
    
    // Position highlight
    tourHighlight.style.top = `${rect.top + window.scrollY - padding}px`;
    tourHighlight.style.left = `${rect.left - padding}px`;
    tourHighlight.style.width = `${rect.width + padding * 2}px`;
    tourHighlight.style.height = `${rect.height + padding * 2}px`;
    
    // Position tooltip
    const tooltipRect = tourTooltip.getBoundingClientRect();
    const tooltipWidth = 360;
    const tooltipHeight = tooltipRect.height || 220;
    const gap = 16;
    
    let top, left;
    
    switch (position) {
        case 'top':
            top = rect.top + window.scrollY - tooltipHeight - gap;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            tourTooltip.setAttribute('data-position', 'top');
            break;
        case 'bottom':
            top = rect.bottom + window.scrollY + gap;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            tourTooltip.setAttribute('data-position', 'bottom');
            break;
        case 'left':
            top = rect.top + window.scrollY + rect.height / 2 - tooltipHeight / 2;
            left = rect.left - tooltipWidth - gap;
            tourTooltip.setAttribute('data-position', 'left');
            break;
        case 'right':
            top = rect.top + window.scrollY + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + gap;
            tourTooltip.setAttribute('data-position', 'right');
            break;
        default:
            top = rect.bottom + window.scrollY + gap;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            tourTooltip.setAttribute('data-position', 'bottom');
    }
    
    // Keep tooltip on screen
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, top);
    
    tourTooltip.style.top = `${top}px`;
    tourTooltip.style.left = `${left}px`;
}

/**
 * Position tooltip centered on screen
 */
function positionCenteredTooltip() {
    tourTooltip.style.top = '50%';
    tourTooltip.style.left = '50%';
    tourTooltip.style.transform = 'translate(-50%, -50%)';
    tourTooltip.setAttribute('data-position', 'center');
}

/**
 * Go to next tour step
 */
function nextTourStep() {
    if (currentTourStep >= TOUR_STEPS.length - 1) {
        endTour();
        return;
    }
    
    currentTourStep++;
    tourTooltip.style.transform = '';
    showTourStep(currentTourStep);
}

/**
 * Go to previous tour step
 */
function prevTourStep() {
    if (currentTourStep <= 0) return;
    
    currentTourStep--;
    tourTooltip.style.transform = '';
    showTourStep(currentTourStep);
}

/**
 * Handle keyboard navigation in tour
 */
function handleTourKeydown(e) {
    if (!tourActive) return;
    
    switch (e.key) {
        case 'Escape':
            endTour();
            break;
        case 'Enter':
        case 'ArrowRight':
            nextTourStep();
            break;
        case 'ArrowLeft':
            prevTourStep();
            break;
    }
}

/**
 * Reset tour to show again
 */
function resetTour() {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    announceToScreenReader('Tour has been reset. It will show on next page load, or start it now.');
}

// Add tour button to command palette
if (typeof PALETTE_COMMANDS !== 'undefined' && Array.isArray(PALETTE_COMMANDS)) {
    PALETTE_COMMANDS.push({
        id: 'start-tour',
        title: 'Start Dashboard Tour',
        description: 'Take a guided tour of dashboard features',
        icon: '🎓',
        action: () => { startTour(); hideCommandPalette(); },
        group: 'Help'
    });
    PALETTE_COMMANDS.push({
        id: 'reset-tour',
        title: 'Reset Tour',
        description: 'Reset tour to show again for new users',
        icon: '🔄',
        action: () => { resetTour(); hideCommandPalette(); },
        group: 'Help'
    });
}

// Auto-start tour for new visitors (after a brief delay for page to load)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (shouldShowTour()) {
                startTour();
            }
        }, 2000);
    });
} else {
    setTimeout(() => {
        if (shouldShowTour()) {
            startTour();
        }
    }, 2000);
}

// ============================================
// VOICE INPUT SYSTEM (Web Speech API)
// ============================================

/**
 * Voice Input System for Activity Logging
 * 
 * Uses the Web Speech API (SpeechRecognition) to allow users to log
 * activities by speaking. The transcript is automatically filled into
 * the description field, and users select the activity type from a dropdown.
 * 
 * Features:
 * - Real-time speech-to-text transcription
 * - Continuous recognition for longer descriptions
 * - Auto-stop after silence
 * - Keyboard shortcuts (V to open, Space to record)
 * - Full theme support
 */

// Check for browser support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isVoiceRecording = false;
let voiceModalOpen = false;

/**
 * Initialize the speech recognition system
 */
function initVoiceInput() {
    if (!SpeechRecognition) {
        // Browser doesn't support speech recognition
        const btn = document.getElementById('voiceInputBtn');
        if (btn) {
            btn.style.display = 'none';
        }
        const warning = document.getElementById('voiceBrowserSupport');
        if (warning) {
            warning.style.display = 'block';
        }
        console.log('Speech recognition not supported in this browser');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isVoiceRecording = true;
        updateVoiceUI(true);
        console.log('🎤 Voice recognition started');
    };

    recognition.onend = () => {
        isVoiceRecording = false;
        updateVoiceUI(false);
        console.log('🎤 Voice recognition ended');
    };

    recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        isVoiceRecording = false;
        updateVoiceUI(false);
        
        const instruction = document.getElementById('voiceInstruction');
        if (instruction) {
            if (event.error === 'not-allowed') {
                instruction.textContent = '⚠️ Microphone access denied. Please allow microphone access.';
            } else if (event.error === 'no-speech') {
                instruction.textContent = 'No speech detected. Click the microphone to try again.';
            } else {
                instruction.textContent = `Error: ${event.error}. Click the microphone to try again.`;
            }
        }
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // Update transcript display
        const transcriptEl = document.getElementById('voiceTranscript');
        const descriptionEl = document.getElementById('voiceDescription');
        
        if (transcriptEl) {
            const current = transcriptEl.value;
            transcriptEl.value = current + finalTranscript + (interimTranscript ? ` (${interimTranscript}...)` : '');
            transcriptEl.scrollTop = transcriptEl.scrollHeight;
        }

        // Also update description with final transcript
        if (descriptionEl && finalTranscript) {
            descriptionEl.value = (descriptionEl.value + ' ' + finalTranscript).trim();
        }

        // Enable submit button if we have content
        updateSubmitButton();
    };

    console.log('✅ Voice input system initialized');
}

/**
 * Toggle voice input modal
 */
function toggleVoiceInput() {
    if (voiceModalOpen) {
        closeVoiceModal();
    } else {
        openVoiceModal();
    }
}

/**
 * Open the voice input modal
 */
function openVoiceModal() {
    const modal = document.getElementById('voiceInputModal');
    if (modal) {
        modal.style.display = 'flex';
        voiceModalOpen = true;
        
        // Reset form
        const transcript = document.getElementById('voiceTranscript');
        const description = document.getElementById('voiceDescription');
        if (transcript) transcript.value = '';
        if (description) description.value = '';
        
        updateSubmitButton();
        announceToScreenReader('Voice input modal opened. Click the microphone or press Space to start recording.');
    }
}

/**
 * Close the voice input modal
 */
function closeVoiceModal() {
    const modal = document.getElementById('voiceInputModal');
    if (modal) {
        modal.style.display = 'none';
        voiceModalOpen = false;
        
        // Stop recording if active
        if (isVoiceRecording && recognition) {
            recognition.stop();
        }
        
        announceToScreenReader('Voice input modal closed');
    }
}

/**
 * Toggle voice recording
 */
function toggleVoiceRecording() {
    if (!recognition) {
        initVoiceInput();
        if (!recognition) return;
    }

    if (isVoiceRecording) {
        recognition.stop();
    } else {
        // Clear previous transcript
        const transcript = document.getElementById('voiceTranscript');
        if (transcript) transcript.value = '';
        
        recognition.start();
    }
}

/**
 * Update UI based on recording state
 */
function updateVoiceUI(recording) {
    const btn = document.getElementById('voiceRecordBtn');
    const indicator = document.getElementById('voiceIndicator');
    const instruction = document.getElementById('voiceInstruction');
    const inputBtn = document.getElementById('voiceInputBtn');

    if (btn) {
        btn.classList.toggle('recording', recording);
        btn.querySelector('.btn-text').textContent = recording ? 'Stop Recording' : 'Start Recording';
        btn.querySelector('.btn-icon').textContent = recording ? '⏹️' : '🎙️';
    }

    if (indicator) {
        indicator.classList.toggle('listening', recording);
    }

    if (instruction) {
        instruction.textContent = recording 
            ? '🔴 Listening... Speak now!' 
            : 'Click the microphone to start speaking';
    }

    if (inputBtn) {
        inputBtn.classList.toggle('recording', recording);
    }
}

/**
 * Update submit button state
 */
function updateSubmitButton() {
    const description = document.getElementById('voiceDescription');
    const submitBtn = document.getElementById('voiceSubmitBtn');
    
    if (submitBtn && description) {
        submitBtn.disabled = !description.value.trim();
    }
}

/**
 * Check for duplicate activities before logging
 * Returns { hasDuplicate, mostSimilar, duplicates } or null on error
 */
async function checkForDuplicates(type, description) {
    try {
        const params = new URLSearchParams({
            type: type,
            description: description,
            timeWindowMinutes: '30'
        });
        
        const response = await fetch(`/api/activities/check-duplicate?${params}`);
        if (!response.ok) return null;
        
        return await response.json();
    } catch (error) {
        console.error('Duplicate check failed:', error);
        return null;
    }
}

/**
 * Show duplicate warning dialog and return user's choice
 * Returns true if user wants to submit anyway, false to cancel
 */
async function showDuplicateWarning(duplicateInfo) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'duplicate-warning-modal';
        modal.setAttribute('role', 'alertdialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'duplicate-warning-title');
        
        const similarity = Math.round((duplicateInfo.mostSimilar?.similarity || 0) * 100);
        const timeDiff = duplicateInfo.mostSimilar?.timestamp 
            ? getRelativeTime(new Date(duplicateInfo.mostSimilar.timestamp))
            : 'recently';
        
        modal.innerHTML = `
            <div class="duplicate-warning-content">
                <div class="duplicate-warning-header">
                    <span class="warning-icon">⚠️</span>
                    <h3 id="duplicate-warning-title">Potential Duplicate Detected</h3>
                </div>
                <div class="duplicate-warning-body">
                    <p>A similar activity was logged <strong>${timeDiff}</strong>:</p>
                    <div class="duplicate-preview">
                        <span class="duplicate-type">${getActivityEmoji(duplicateInfo.mostSimilar?.type)} ${duplicateInfo.mostSimilar?.type}</span>
                        <p class="duplicate-description">"${(duplicateInfo.mostSimilar?.description || '').slice(0, 100)}${(duplicateInfo.mostSimilar?.description?.length || 0) > 100 ? '...' : ''}"</p>
                        <span class="duplicate-similarity">${similarity}% similar</span>
                    </div>
                    <p class="duplicate-question">Do you still want to log this activity?</p>
                </div>
                <div class="duplicate-warning-actions">
                    <button class="duplicate-cancel-btn" onclick="this.closest('.duplicate-warning-modal').dataset.result='cancel'">
                        ❌ Cancel
                    </button>
                    <button class="duplicate-submit-btn" onclick="this.closest('.duplicate-warning-modal').dataset.result='submit'">
                        ✅ Submit Anyway
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus the cancel button by default (safer option)
        modal.querySelector('.duplicate-cancel-btn').focus();
        
        // Handle clicks
        modal.addEventListener('click', (e) => {
            if (e.target === modal || modal.dataset.result) {
                const result = modal.dataset.result === 'submit';
                modal.remove();
                resolve(result);
            }
        });
        
        // Handle keyboard
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                resolve(false);
            } else if (e.key === 'Enter' && document.activeElement?.classList.contains('duplicate-submit-btn')) {
                modal.remove();
                resolve(true);
            }
        });
    });
}

/**
 * Get relative time string (e.g., "5 minutes ago")
 */
function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleString();
}

/**
 * Submit the voice-logged activity
 */
async function submitVoiceActivity(skipDuplicateCheck = false) {
    const typeSelect = document.getElementById('voiceActivityType');
    const descriptionEl = document.getElementById('voiceDescription');
    const submitBtn = document.getElementById('voiceSubmitBtn');
    
    if (!typeSelect || !descriptionEl) return;
    
    const type = typeSelect.value;
    const description = descriptionEl.value.trim();
    
    if (!description) {
        announceToScreenReader('Please enter a description for the activity');
        return;
    }

    // Check for duplicates first (unless skipped)
    if (!skipDuplicateCheck) {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.querySelector('.btn-text').textContent = 'Checking...';
        }
        
        const duplicateInfo = await checkForDuplicates(type, description);
        
        if (duplicateInfo?.hasDuplicate) {
            // Re-enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.querySelector('.btn-text').textContent = 'Log Activity';
            }
            
            // Show warning and get user's choice
            const shouldSubmit = await showDuplicateWarning(duplicateInfo);
            
            if (!shouldSubmit) {
                announceToScreenReader('Activity logging cancelled due to duplicate');
                return;
            }
            
            // User chose to submit anyway - recurse with skip flag
            return submitVoiceActivity(true);
        }
    }

    // Disable button while submitting
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').textContent = 'Logging...';
    }

    try {
        const response = await fetch('/api/activities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type,
                description,
                metadata: {
                    source: 'voice',
                    voiceLogged: true
                }
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Success!
            playNotificationSound('new');
            announceToScreenReader(`Activity logged successfully: ${type} - ${description.slice(0, 50)}`);
            
            // Close modal after brief delay
            setTimeout(() => {
                closeVoiceModal();
            }, 500);
            
            console.log('✅ Voice activity logged:', result);
        } else {
            throw new Error(result.error || 'Failed to log activity');
        }

    } catch (error) {
        console.error('Error submitting voice activity:', error);
        announceToScreenReader(`Error logging activity: ${error.message}`);
        
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').textContent = 'Log Activity';
        }
    }
}

/**
 * Handle voice modal keyboard events
 */
function handleVoiceModalKeyboard(event) {
    if (!voiceModalOpen) return;

    switch (event.key) {
        case 'Escape':
            closeVoiceModal();
            event.preventDefault();
            break;
        case ' ':
            // Only toggle recording if not focused on input
            if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA' && event.target.tagName !== 'SELECT') {
                toggleVoiceRecording();
                event.preventDefault();
            }
            break;
        case 'Enter':
            // Submit if description is filled
            if (event.target.tagName !== 'TEXTAREA') {
                const submitBtn = document.getElementById('voiceSubmitBtn');
                if (submitBtn && !submitBtn.disabled) {
                    submitVoiceActivity();
                    event.preventDefault();
                }
            }
            break;
    }
}

// Add V keyboard shortcut for voice input
document.addEventListener('keydown', (event) => {
    // V key to open/close voice modal (when not typing)
    if (event.key === 'v' || event.key === 'V') {
        const target = event.target;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
            // Check if any other modal is open
            const commandPalette = document.querySelector('.command-palette');
            const shortcutsModal = document.getElementById('keyboardShortcutsModal');
            if (commandPalette?.style.display === 'flex' || shortcutsModal?.style.display === 'flex') {
                return;
            }
            
            toggleVoiceInput();
            event.preventDefault();
        }
    }
    
    // Handle voice modal specific shortcuts
    handleVoiceModalKeyboard(event);
});

// Close modal when clicking outside
document.addEventListener('click', (event) => {
    const modal = document.getElementById('voiceInputModal');
    if (voiceModalOpen && event.target === modal) {
        closeVoiceModal();
    }
});

// Add description input listener for submit button
document.addEventListener('DOMContentLoaded', () => {
    initVoiceInput();
    
    const descriptionEl = document.getElementById('voiceDescription');
    if (descriptionEl) {
        descriptionEl.addEventListener('input', updateSubmitButton);
    }
});

// Add to command palette
if (typeof PALETTE_COMMANDS !== 'undefined' && Array.isArray(PALETTE_COMMANDS)) {
    PALETTE_COMMANDS.push({
        id: 'voice-input',
        title: 'Log Activity by Voice',
        description: 'Use speech recognition to log activities',
        icon: '🎤',
        shortcut: 'V',
        action: () => { toggleVoiceInput(); hideCommandPalette(); },
        group: 'Actions'
    });
}

// Also initialize on page load if DOM already ready
if (document.readyState !== 'loading') {
    initVoiceInput();
}

// ========================================
// ACTIVITY CALENDAR VIEW
// ========================================

let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth() + 1; // 1-indexed
let calendarTooltip = null;

async function loadCalendar(year, month) {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calendarMonthYear');
    if (!grid || !title) return;
    
    try {
        const response = await fetch(`/pow/api/calendar?year=${year}&month=${month}`);
        const data = await response.json();
        
        // Update title
        title.textContent = `${data.monthName} ${data.year}`;
        
        // Update stats
        document.getElementById('calStatTotal').textContent = data.stats.totalActivities;
        document.getElementById('calStatDays').textContent = data.stats.activeDays;
        document.getElementById('calStatAvg').textContent = data.stats.avgPerDay;
        
        // Build grid
        grid.innerHTML = '';
        
        // Add empty cells for days before start of month
        for (let i = 0; i < data.startDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            grid.appendChild(emptyCell);
        }
        
        // Check if today is in this month
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
        
        // Add day cells
        for (const day of data.days) {
            const cell = document.createElement('div');
            const hasActivities = day.count > 0;
            const isToday = isCurrentMonth && day.day === today.getDate();
            
            cell.className = `calendar-day${hasActivities ? ' has-activities' : ''}${isToday ? ' today' : ''}`;
            cell.dataset.date = day.date;
            cell.dataset.count = day.count;
            
            // Day number
            const dayNum = document.createElement('div');
            dayNum.className = 'calendar-day-number';
            dayNum.textContent = day.day;
            cell.appendChild(dayNum);
            
            if (hasActivities) {
                // Activity count
                const countLabel = document.createElement('div');
                countLabel.className = 'calendar-day-count';
                countLabel.textContent = `${day.count} action${day.count !== 1 ? 's' : ''}`;
                cell.appendChild(countLabel);
                
                // Activity dots (show up to 12)
                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'calendar-day-activities';
                
                const maxDots = 12;
                const shownActivities = day.activities.slice(0, maxDots);
                
                for (const activity of shownActivities) {
                    const dot = document.createElement('div');
                    dot.className = 'calendar-activity-dot';
                    dot.dataset.type = activity.type;
                    dot.title = `${activity.type}: ${activity.description?.substring(0, 50) || 'No description'}`;
                    dotsContainer.appendChild(dot);
                }
                
                if (day.count > maxDots) {
                    const more = document.createElement('div');
                    more.className = 'calendar-more-indicator';
                    more.textContent = `+${day.count - maxDots} more`;
                    dotsContainer.appendChild(more);
                }
                
                cell.appendChild(dotsContainer);
                
                // Store activities for tooltip
                cell.dataset.activities = JSON.stringify(day.activities.slice(0, 10));
            }
            
            // Tooltip events
            cell.addEventListener('mouseenter', showCalendarTooltip);
            cell.addEventListener('mouseleave', hideCalendarTooltip);
            cell.addEventListener('click', () => {
                // Could link to filtered activity view for this day
                if (hasActivities) {
                    // Scroll to activities or apply date filter
                    console.log('Clicked day:', day.date);
                }
            });
            
            grid.appendChild(cell);
        }
        
        // Save current state
        currentCalendarYear = year;
        currentCalendarMonth = month;
        
        // Update navigation buttons
        const now = new Date();
        const nextBtn = document.getElementById('calendarNext');
        if (nextBtn) {
            // Disable next if we're at current month
            nextBtn.disabled = (year > now.getFullYear()) || 
                               (year === now.getFullYear() && month >= now.getMonth() + 1);
        }
        
    } catch (error) {
        console.error('Failed to load calendar:', error);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">Failed to load calendar</div>';
    }
}

function navigateCalendar(direction) {
    let newMonth = currentCalendarMonth + direction;
    let newYear = currentCalendarYear;
    
    if (newMonth < 1) {
        newMonth = 12;
        newYear--;
    } else if (newMonth > 12) {
        newMonth = 1;
        newYear++;
    }
    
    loadCalendar(newYear, newMonth);
}

function showCalendarTooltip(e) {
    const cell = e.currentTarget;
    const count = parseInt(cell.dataset.count || '0', 10);
    if (count === 0) return;
    
    const activitiesStr = cell.dataset.activities;
    if (!activitiesStr) return;
    
    const activities = JSON.parse(activitiesStr);
    
    if (!calendarTooltip) {
        calendarTooltip = document.createElement('div');
        calendarTooltip.className = 'calendar-tooltip';
        document.body.appendChild(calendarTooltip);
    }
    
    const date = new Date(cell.dataset.date + 'T12:00:00');
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    
    let html = `<div class="calendar-tooltip-date">${formattedDate}</div>`;
    html += `<div class="calendar-tooltip-count">${count} activit${count !== 1 ? 'ies' : 'y'}</div>`;
    html += '<div class="calendar-tooltip-list">';
    
    for (const activity of activities) {
        const time = new Date(activity.timestamp).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit'
        });
        html += `<div class="calendar-tooltip-item">
            <span class="calendar-tooltip-type">${activity.type}</span>
            <span>${time}</span>
            ${activity.signed ? '✓' : ''}
        </div>`;
    }
    
    if (count > 10) {
        html += `<div class="calendar-tooltip-item" style="color: var(--text-secondary); font-style: italic;">
            +${count - 10} more activities...
        </div>`;
    }
    
    html += '</div>';
    calendarTooltip.innerHTML = html;
    calendarTooltip.style.display = 'block';
    
    // Position tooltip
    const rect = cell.getBoundingClientRect();
    calendarTooltip.style.left = `${rect.left + rect.width / 2 - calendarTooltip.offsetWidth / 2}px`;
    calendarTooltip.style.top = `${rect.bottom + 8}px`;
    
    // Keep tooltip on screen
    const tooltipRect = calendarTooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth - 10) {
        calendarTooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
    }
    if (tooltipRect.left < 10) {
        calendarTooltip.style.left = '10px';
    }
    if (tooltipRect.bottom > window.innerHeight - 10) {
        calendarTooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;
    }
}

function hideCalendarTooltip() {
    if (calendarTooltip) {
        calendarTooltip.style.display = 'none';
    }
}

// Load calendar on page load (add to existing init)
document.addEventListener('DOMContentLoaded', () => {
    // Load current month calendar
    loadCalendar(currentCalendarYear, currentCalendarMonth);
});

// =============================================================================
// BULK OPERATIONS - Multi-select activities for batch actions
// =============================================================================

let bulkModeActive = false;
let bulkSelections = []; // Array of selected activity hashes
let lastBulkSelectedHash = null; // For shift+click range selection

/**
 * Initialize bulk operations
 */
function initBulkOperations() {
    // Create the floating bulk operations bar
    createBulkBar();
    
    // Add keyboard shortcut for bulk mode
    if (typeof KEYBOARD_SHORTCUTS !== 'undefined') {
        KEYBOARD_SHORTCUTS['x'] = { action: 'toggleBulkMode', description: 'Toggle bulk select mode' };
    }
    
    // Add to command palette
    if (typeof COMMAND_PALETTE_COMMANDS !== 'undefined') {
        COMMAND_PALETTE_COMMANDS.push(
            { id: 'bulk-mode', title: 'Toggle Bulk Select Mode', description: 'Select multiple activities for batch actions', icon: '☑️', shortcut: 'X', action: () => toggleBulkMode(), group: 'Actions' },
            { id: 'bulk-select-all', title: 'Select All Activities', description: 'Select all visible activities', icon: '✅', action: () => selectAllActivities(), group: 'Bulk' },
            { id: 'bulk-delete', title: 'Delete Selected Activities', description: 'Move selected activities to trash', icon: '🗑️', action: () => bulkDelete(), group: 'Bulk' },
            { id: 'bulk-clear', title: 'Clear Bulk Selection', description: 'Deselect all activities', icon: '❌', action: () => clearBulkSelection(), group: 'Bulk' }
        );
    }
    
    // Add click handler for bulk selection
    document.addEventListener('click', handleBulkClick);
    
    // Add Ctrl+A / Cmd+A handler for select all when in bulk mode
    document.addEventListener('keydown', (e) => {
        if (bulkModeActive && (e.ctrlKey || e.metaKey) && e.key === 'a') {
            const isInputFocused = document.activeElement?.matches('input, textarea, select');
            if (!isInputFocused) {
                e.preventDefault();
                selectAllActivities();
            }
        }
        // X key to toggle bulk mode
        if (e.key === 'x' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const isInputFocused = document.activeElement?.matches('input, textarea, select');
            if (!isInputFocused) {
                e.preventDefault();
                toggleBulkMode();
            }
        }
    });
}

/**
 * Create the floating bulk operations bar
 */
function createBulkBar() {
    const bar = document.createElement('div');
    bar.id = 'bulk-bar';
    bar.className = 'bulk-bar';
    bar.innerHTML = `
        <div class="bulk-bar-status">
            <span class="bulk-bar-icon">☑️</span>
            <div class="bulk-bar-text">
                <span class="bulk-bar-title">Bulk Select</span>
                <span class="bulk-bar-subtitle" id="bulk-bar-subtitle">Select activities</span>
            </div>
        </div>
        <div class="bulk-bar-count">
            <span class="bulk-bar-count-num" id="bulk-count">0</span>
            <span class="bulk-bar-count-label">selected</span>
        </div>
        <div class="bulk-bar-actions">
            <button class="bulk-bar-btn select-all" onclick="selectAllActivities()" title="Select all visible (Ctrl+A)">
                ✅ All
            </button>
            <button class="bulk-bar-btn export" onclick="bulkExport('json')" title="Export selected as JSON">
                📥 JSON
            </button>
            <button class="bulk-bar-btn export" onclick="bulkExport('csv')" title="Export selected as CSV">
                📊 CSV
            </button>
            <button class="bulk-bar-btn bookmark" onclick="bulkBookmark()" title="Bookmark all selected">
                ⭐ Bookmark
            </button>
            <button class="bulk-bar-btn pin" onclick="bulkPin()" title="Pin all selected">
                📌 Pin
            </button>
            <button class="bulk-bar-btn delete danger" onclick="bulkDelete()" title="Delete all selected (move to trash)">
                🗑️ Delete
            </button>
            <button class="bulk-bar-btn clear secondary" onclick="clearBulkSelection()" title="Clear selection">
                ❌ Clear
            </button>
            <button class="bulk-bar-btn close secondary" onclick="toggleBulkMode()" title="Exit bulk mode">
                ✕
            </button>
        </div>
    `;
    document.body.appendChild(bar);
}

/**
 * Toggle bulk select mode on/off
 */
function toggleBulkMode() {
    // Don't allow both compare mode and bulk mode at once
    if (!bulkModeActive && typeof compareModeActive !== 'undefined' && compareModeActive) {
        toggleCompareMode();
    }
    
    bulkModeActive = !bulkModeActive;
    
    const toggleBtn = document.getElementById('bulk-mode-toggle');
    const bulkBar = document.getElementById('bulk-bar');
    const feed = document.getElementById('feed');
    
    if (bulkModeActive) {
        document.body.classList.add('bulk-mode-active');
        feed?.classList.add('bulk-mode-active');
        if (toggleBtn) {
            toggleBtn.classList.add('active');
            toggleBtn.innerHTML = '<span class="toggle-icon">✓</span><span class="toggle-text">Bulk ON</span>';
        }
        if (bulkBar) bulkBar.classList.add('visible');
        updateBulkBarUI();
        announceToScreenReader('Bulk select mode activated. Click activities to select them. Shift+click for range selection.');
    } else {
        document.body.classList.remove('bulk-mode-active');
        feed?.classList.remove('bulk-mode-active');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
            toggleBtn.innerHTML = '<span class="toggle-icon">☑️</span><span class="toggle-text">Bulk</span>';
        }
        if (bulkBar) bulkBar.classList.remove('visible');
        clearBulkSelection(false); // Don't announce when exiting
        announceToScreenReader('Bulk select mode deactivated.');
    }
}

/**
 * Handle clicks on activity cards during bulk mode
 */
function handleBulkClick(event) {
    if (!bulkModeActive) return;
    
    // Find if click was on an activity item
    const activityItem = event.target.closest('.activity-item');
    if (!activityItem) return;
    
    // Ignore clicks on buttons, inputs, links inside the activity
    if (event.target.closest('button, a, input, textarea, select')) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const hash = activityItem.dataset.hash;
    if (!hash) return;
    
    // Handle shift+click for range selection
    if (event.shiftKey && lastBulkSelectedHash) {
        selectRange(lastBulkSelectedHash, hash);
        return;
    }
    
    // Toggle selection
    toggleBulkSelection(hash);
    lastBulkSelectedHash = hash;
}

/**
 * Toggle selection of a single activity
 */
function toggleBulkSelection(hash) {
    const index = bulkSelections.indexOf(hash);
    
    if (index >= 0) {
        // Deselect
        bulkSelections.splice(index, 1);
    } else {
        // Select
        bulkSelections.push(hash);
    }
    
    updateActivitySelectionUI(hash);
    updateBulkBarUI();
}

/**
 * Select a range of activities (shift+click)
 */
function selectRange(startHash, endHash) {
    const feed = document.getElementById('feed');
    if (!feed) return;
    
    const items = Array.from(feed.querySelectorAll('.activity-item[data-hash]'));
    const startIndex = items.findIndex(el => el.dataset.hash === startHash);
    const endIndex = items.findIndex(el => el.dataset.hash === endHash);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const [minIndex, maxIndex] = startIndex < endIndex 
        ? [startIndex, endIndex] 
        : [endIndex, startIndex];
    
    for (let i = minIndex; i <= maxIndex; i++) {
        const hash = items[i].dataset.hash;
        if (hash && !bulkSelections.includes(hash)) {
            bulkSelections.push(hash);
            updateActivitySelectionUI(hash);
        }
    }
    
    updateBulkBarUI();
    announceToScreenReader(`Selected ${maxIndex - minIndex + 1} activities`);
}

/**
 * Select all visible activities
 */
function selectAllActivities() {
    if (!bulkModeActive) {
        toggleBulkMode();
    }
    
    const feed = document.getElementById('feed');
    if (!feed) return;
    
    const items = feed.querySelectorAll('.activity-item[data-hash]');
    let addedCount = 0;
    
    items.forEach(item => {
        const hash = item.dataset.hash;
        if (hash && !bulkSelections.includes(hash)) {
            bulkSelections.push(hash);
            updateActivitySelectionUI(hash);
            addedCount++;
        }
    });
    
    updateBulkBarUI();
    announceToScreenReader(`Selected all ${bulkSelections.length} activities`);
}

/**
 * Clear all bulk selections
 */
function clearBulkSelection(announce = true) {
    const previousCount = bulkSelections.length;
    bulkSelections.forEach(hash => {
        const item = document.querySelector(`.activity-item[data-hash="${hash}"]`);
        if (item) item.classList.remove('bulk-selected');
    });
    
    bulkSelections = [];
    lastBulkSelectedHash = null;
    updateBulkBarUI();
    
    if (announce && previousCount > 0) {
        announceToScreenReader('Selection cleared');
    }
}

/**
 * Update the visual selection state of an activity item
 */
function updateActivitySelectionUI(hash) {
    const item = document.querySelector(`.activity-item[data-hash="${hash}"]`);
    if (!item) return;
    
    if (bulkSelections.includes(hash)) {
        item.classList.add('bulk-selected');
    } else {
        item.classList.remove('bulk-selected');
    }
}

/**
 * Update the bulk bar UI with current selection count
 */
function updateBulkBarUI() {
    const countEl = document.getElementById('bulk-count');
    const subtitleEl = document.getElementById('bulk-bar-subtitle');
    
    const count = bulkSelections.length;
    
    if (countEl) countEl.textContent = count;
    
    if (subtitleEl) {
        if (count === 0) {
            subtitleEl.textContent = 'Click activities to select';
        } else if (count === 1) {
            subtitleEl.textContent = '1 activity selected';
        } else {
            subtitleEl.textContent = `${count} activities selected`;
        }
    }
    
    // Enable/disable action buttons based on selection
    const bulkBar = document.getElementById('bulk-bar');
    if (bulkBar) {
        const actionBtns = bulkBar.querySelectorAll('.bulk-bar-btn.export, .bulk-bar-btn.bookmark, .bulk-bar-btn.pin');
        actionBtns.forEach(btn => {
            btn.disabled = count === 0;
        });
    }
}

/**
 * Export selected activities
 */
function bulkExport(format = 'json') {
    if (bulkSelections.length === 0) {
        announceToScreenReader('No activities selected');
        return;
    }
    
    const activities = window.cachedActivities || allActivities || [];
    const selectedActivities = activities.filter(a => {
        const hash = a.hash || a.proof?.hash;
        return bulkSelections.includes(hash);
    });
    
    if (selectedActivities.length === 0) {
        announceToScreenReader('Could not find selected activities');
        return;
    }
    
    if (format === 'json') {
        const blob = new Blob([JSON.stringify(selectedActivities, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `jarvis-activities-bulk-${Date.now()}.json`);
    } else if (format === 'csv') {
        const headers = ['timestamp', 'type', 'description', 'hash', 'signature', 'wallet', 'tags'];
        const rows = selectedActivities.map(a => [
            a.timestamp,
            a.type,
            `"${(a.description || '').replace(/"/g, '""')}"`,
            a.hash || a.proof?.hash || '',
            a.signature || a.proof?.signature || '',
            a.wallet || '',
            (a.tags || []).join(';')
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        downloadBlob(blob, `jarvis-activities-bulk-${Date.now()}.csv`);
    }
    
    announceToScreenReader(`Exported ${selectedActivities.length} activities as ${format.toUpperCase()}`);
}

/**
 * Bookmark all selected activities
 */
function bulkBookmark() {
    if (bulkSelections.length === 0) {
        announceToScreenReader('No activities selected');
        return;
    }
    
    let addedCount = 0;
    let removedCount = 0;
    
    bulkSelections.forEach(hash => {
        if (typeof isBookmarked === 'function' && typeof toggleBookmark === 'function') {
            const wasBookmarked = isBookmarked(hash);
            if (!wasBookmarked) {
                toggleBookmark(hash);
                addedCount++;
            }
        }
    });
    
    // Re-render to update UI
    if (typeof applyFilters === 'function') {
        applyFilters();
    }
    
    announceToScreenReader(`Bookmarked ${addedCount} activities`);
}

/**
 * Pin all selected activities
 */
async function bulkPin() {
    if (bulkSelections.length === 0) {
        announceToScreenReader('No activities selected');
        return;
    }
    
    let pinnedCount = 0;
    
    for (const hash of bulkSelections) {
        try {
            const response = await fetch(`/api/activities/${hash}/pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                pinnedCount++;
                // Update local cache
                const activities = window.cachedActivities || allActivities || [];
                const activity = activities.find(a => (a.hash || a.proof?.hash) === hash);
                if (activity) {
                    activity.pinned = true;
                    activity.pinnedAt = new Date().toISOString();
                }
            }
        } catch (err) {
            console.error(`Failed to pin ${hash}:`, err);
        }
    }
    
    // Re-render
    if (typeof applyFilters === 'function') {
        applyFilters();
    }
    
    announceToScreenReader(`Pinned ${pinnedCount} activities`);
}

/**
 * Delete all selected activities (move to trash)
 * Uses bulk delete API for efficiency
 */
async function bulkDelete() {
    if (bulkSelections.length === 0) {
        announceToScreenReader('No activities selected');
        return;
    }
    
    // Confirm deletion
    const count = bulkSelections.length;
    const confirmed = confirm(`Move ${count} activit${count === 1 ? 'y' : 'ies'} to trash?\n\nYou can restore them from the trash later.`);
    
    if (!confirmed) {
        announceToScreenReader('Deletion cancelled');
        return;
    }
    
    try {
        const response = await fetch('/api/activities/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hashes: bulkSelections })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete activities');
        }
        
        const result = await response.json();
        
        // Update local cache - mark deleted activities
        const activities = window.cachedActivities || allActivities || [];
        const deletedHashes = result.details?.deleted || [];
        const now = new Date().toISOString();
        
        deletedHashes.forEach(hash => {
            const activity = activities.find(a => (a.hash || a.proof?.hash) === hash);
            if (activity) {
                activity.deleted = true;
                activity.deletedAt = now;
            }
        });
        
        // Clear selection for deleted items
        bulkSelections = bulkSelections.filter(h => !deletedHashes.includes(h));
        
        // Update UI
        updateBulkBarUI();
        
        // Re-render to hide deleted activities
        if (typeof applyFilters === 'function') {
            applyFilters();
        }
        
        // Update trash count badge
        updateTrashBadge();
        
        // Feedback message
        let message = `${result.deleted} activit${result.deleted === 1 ? 'y' : 'ies'} moved to trash`;
        if (result.notFound > 0) message += ` (${result.notFound} not found)`;
        if (result.alreadyDeleted > 0) message += ` (${result.alreadyDeleted} already deleted)`;
        
        console.log('🗑️ Bulk delete result:', result);
        
        // Show undo toast for quick restore
        showUndoToast(message, {
            hashes: deletedHashes,
            timeout: 6000 // Slightly longer for bulk operations
        });
        
    } catch (err) {
        console.error('Bulk delete failed:', err);
        announceToScreenReader(`Failed to delete activities: ${err.message}`);
        
        showCopyToast(`❌ Delete failed: ${err.message}`, true);
    }
}

/**
 * Update trash badge count (after bulk operations)
 */
async function updateTrashBadge() {
    try {
        const response = await fetch('/api/activities/trash');
        if (!response.ok) return;
        
        const data = await response.json();
        const trashItems = data.activities || [];
        
        // Update badge on trash button
        const trashBtn = document.getElementById('trash-btn');
        if (trashBtn) {
            let badge = trashBtn.querySelector('.trash-count-badge');
            if (trashItems.length > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'trash-count-badge';
                    trashBtn.appendChild(badge);
                }
                badge.textContent = trashItems.length;
                badge.style.display = 'inline-flex';
            } else if (badge) {
                badge.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Failed to update trash badge:', e);
    }
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Render bulk select checkbox for activity cards
 */
function renderBulkCheckbox(hash) {
    if (!hash) return '';
    const isSelected = bulkSelections.includes(hash);
    return `
        <div class="bulk-select-checkbox ${isSelected ? 'checked' : ''}"
             onclick="event.stopPropagation(); toggleBulkSelection('${hash}')"
             role="checkbox"
             aria-checked="${isSelected}"
             aria-label="Select activity for bulk operations"
             tabindex="0">
            ${isSelected ? '✓' : ''}
        </div>
    `;
}

// Handle keyboard shortcut actions
if (typeof handleKeyboardShortcutAction !== 'undefined') {
    const originalHandler = handleKeyboardShortcutAction;
    handleKeyboardShortcutAction = function(action) {
        if (action === 'toggleBulkMode') {
            toggleBulkMode();
            return;
        }
        return originalHandler(action);
    };
}

// Initialize bulk operations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initBulkOperations();
});

// =========================================
// Activity Templates System
// =========================================

let templates = [];

// Open templates modal
function openTemplatesModal() {
    const modal = document.getElementById('templatesModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        loadTemplates();
        announce('Templates modal opened');
    }
}

// Close templates modal
function closeTemplatesModal() {
    const modal = document.getElementById('templatesModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        announce('Templates modal closed');
    }
}

// Load templates from API
async function loadTemplates() {
    const listEl = document.getElementById('templatesList');
    if (!listEl) return;
    
    listEl.innerHTML = '<p class="templates-loading">Loading templates...</p>';
    
    try {
        const response = await fetch('/api/templates');
        if (!response.ok) throw new Error('Failed to load templates');
        
        templates = await response.json();
        renderTemplatesList();
    } catch (e) {
        console.error('Error loading templates:', e);
        listEl.innerHTML = '<p class="templates-empty">Failed to load templates. Please try again.</p>';
    }
}

// Render templates list
function renderTemplatesList() {
    const listEl = document.getElementById('templatesList');
    if (!listEl) return;
    
    if (templates.length === 0) {
        listEl.innerHTML = '<p class="templates-empty">No templates yet. Create one above!</p>';
        return;
    }
    
    const typeEmojis = {
        'build': '🔨', 'commit': '📝', 'decision': '🧠', 'research': '🔬',
        'message': '💬', 'email': '📧', 'trade': '💹', 'deploy': '🚀',
        'session': '💻', 'heartbeat': '💓', 'tweet': '🐦', 'calendar': '📅',
        'browser': '🌐', 'transfer': '💸'
    };
    
    listEl.innerHTML = templates.map(t => {
        const emoji = typeEmojis[t.type] || '📋';
        const usageText = t.usageCount === 1 ? '1 use' : `${t.usageCount} uses`;
        const lastUsed = t.lastUsedAt ? `Last: ${new Date(t.lastUsedAt).toLocaleDateString()}` : 'Never used';
        
        return `
            <div class="template-item" data-id="${t.id}">
                <div class="template-info">
                    <div class="template-name">
                        ${t.name}
                        <span class="template-type-badge">${emoji} ${t.type}</span>
                    </div>
                    <div class="template-description">${escapeHtml(t.description)}</div>
                    <div class="template-meta">
                        <span>📊 ${usageText}</span>
                        <span>⏱️ ${lastUsed}</span>
                        ${t.shortcut ? `<span class="template-shortcut">${t.shortcut}</span>` : ''}
                    </div>
                </div>
                <div class="template-actions">
                    <button class="template-use-btn" onclick="useTemplate('${t.id}')" title="Create activity from this template">
                        ⚡ Use
                    </button>
                    <button class="template-delete-btn" onclick="deleteTemplate('${t.id}')" title="Delete template">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Create a new template
async function createTemplate(event) {
    event.preventDefault();
    
    const name = document.getElementById('templateName').value.trim();
    const type = document.getElementById('templateType').value;
    const description = document.getElementById('templateDescription').value.trim();
    const shortcut = document.getElementById('templateShortcut').value.trim();
    
    if (!name || !type || !description) {
        announce('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                type,
                description,
                shortcut: shortcut || undefined
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            announce(data.error || 'Failed to create template');
            return;
        }
        
        // Clear form
        document.getElementById('templateName').value = '';
        document.getElementById('templateDescription').value = '';
        document.getElementById('templateShortcut').value = '';
        
        // Reload templates
        await loadTemplates();
        
        announce(`Template "${name}" created successfully`);
        showTemplateToast(`✅ Template "${name}" created!`);
    } catch (e) {
        console.error('Error creating template:', e);
        announce('Failed to create template');
    }
}

// Use a template to create an activity
async function useTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
        announce('Template not found');
        return;
    }
    
    try {
        const response = await fetch(`/api/templates/${templateId}/use`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            announce(data.error || 'Failed to use template');
            return;
        }
        
        // Close modal
        closeTemplatesModal();
        
        // Reload activities
        await fetchActivities();
        
        announce(`Activity logged from template "${template.name}"`);
        showTemplateToast(`⚡ Activity logged from "${template.name}"!`);
        
        // Play sound if enabled
        if (soundEnabled) {
            playNotificationSound();
        }
    } catch (e) {
        console.error('Error using template:', e);
        announce('Failed to create activity from template');
    }
}

// Delete a template
async function deleteTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    if (!confirm(`Delete template "${template.name}"?`)) return;
    
    try {
        const response = await fetch(`/api/templates/${templateId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const data = await response.json();
            announce(data.error || 'Failed to delete template');
            return;
        }
        
        await loadTemplates();
        announce(`Template "${template.name}" deleted`);
    } catch (e) {
        console.error('Error deleting template:', e);
        announce('Failed to delete template');
    }
}

// Show template action toast
function showTemplateToast(message) {
    let toast = document.querySelector('.template-used-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'template-used-toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Keyboard shortcut for templates (T key)
document.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    
    // Skip if modal is open and it's not Escape
    const templatesModal = document.getElementById('templatesModal');
    const isTemplatesOpen = templatesModal && templatesModal.style.display !== 'none';
    
    if (e.key === 'Escape' && isTemplatesOpen) {
        closeTemplatesModal();
        return;
    }
    
    // T to open templates
    if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Don't open if another modal is open
        const anyModalOpen = document.querySelector('.custom-types-modal[style*="flex"], .voice-input-modal[style*="flex"], .compare-modal[style*="flex"]');
        if (anyModalOpen) return;
        
        e.preventDefault();
        if (isTemplatesOpen) {
            closeTemplatesModal();
        } else {
            openTemplatesModal();
        }
        return;
    }
    
    // Template shortcuts (Alt+1 through Alt+9)
    if (e.altKey && /^[1-9]$/.test(e.key)) {
        const shortcut = `Alt+${e.key}`;
        const template = templates.find(t => t.shortcut && t.shortcut.toLowerCase() === shortcut.toLowerCase());
        if (template) {
            e.preventDefault();
            useTemplate(template.id);
        }
    }
});

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('templatesModal');
    if (modal && e.target === modal) {
        closeTemplatesModal();
    }
});

// Add templates to command palette
if (typeof commandPaletteCommands !== 'undefined') {
    commandPaletteCommands.push(
        { name: 'Open Templates', shortcut: 'T', action: () => openTemplatesModal() },
        { name: 'Close Templates', shortcut: 'Escape', action: () => closeTemplatesModal() }
    );
}

// Update help modal if it exists
document.addEventListener('DOMContentLoaded', () => {
    const helpContent = document.querySelector('.help-shortcuts');
    if (helpContent) {
        const templateShortcut = document.createElement('div');
        templateShortcut.className = 'shortcut-item';
        templateShortcut.innerHTML = '<kbd>T</kbd> Open templates';
        helpContent.appendChild(templateShortcut);
    }
});

// ===========================================
// TRASH BIN FUNCTIONALITY
// ===========================================

let trashItems = [];
let selectedTrashItems = new Set();

// Toggle trash modal
function toggleTrashModal() {
    const modal = document.getElementById('trashModal');
    if (modal.style.display === 'flex') {
        closeTrashModal();
    } else {
        openTrashModal();
    }
}

// Open trash modal
async function openTrashModal() {
    const modal = document.getElementById('trashModal');
    modal.style.display = 'flex';
    document.getElementById('trash-btn').setAttribute('aria-pressed', 'true');
    await loadTrashItems();
    announce('Trash bin opened');
}

// Close trash modal
function closeTrashModal() {
    const modal = document.getElementById('trashModal');
    modal.style.display = 'none';
    document.getElementById('trash-btn').setAttribute('aria-pressed', 'false');
    announce('Trash bin closed');
}

// Load trash items from API
async function loadTrashItems() {
    const container = document.getElementById('trashList');
    const selectionBar = document.getElementById('trash-selection-bar');
    container.innerHTML = '<p class="trash-loading">Loading deleted activities...</p>';
    
    // Reset selection state
    selectedTrashItems.clear();
    updateTrashSelectionUI();
    
    try {
        const response = await fetch('/api/activities/trash');
        const data = await response.json();
        trashItems = data.activities || [];
        
        // Update count badge
        updateTrashCount();
        
        // Update stats
        const stats = document.getElementById('trash-stats');
        stats.textContent = `${trashItems.length} item${trashItems.length !== 1 ? 's' : ''} in trash`;
        
        // Update empty button state
        const emptyBtn = document.getElementById('trash-empty-btn');
        emptyBtn.disabled = trashItems.length === 0;
        
        // Show/hide selection bar based on item count
        if (selectionBar) {
            selectionBar.style.display = trashItems.length > 0 ? 'flex' : 'none';
        }
        
        if (trashItems.length === 0) {
            container.innerHTML = '<p class="trash-empty-message">🎉 Trash is empty!</p>';
            return;
        }
        
        // Render trash items
        container.innerHTML = trashItems.map(item => renderTrashItem(item)).join('');
    } catch (e) {
        console.error('Error loading trash:', e);
        container.innerHTML = '<p class="trash-error">Failed to load trash</p>';
        if (selectionBar) selectionBar.style.display = 'none';
    }
}

// Render a single trash item
function renderTrashItem(item) {
    const emoji = getTypeEmoji(item.type);
    const deletedDate = new Date(item.deletedAt).toLocaleString();
    const description = (item.description || '').slice(0, 100) + ((item.description || '').length > 100 ? '...' : '');
    const isSelected = selectedTrashItems.has(item.hash);
    
    return `
        <div class="trash-item${isSelected ? ' selected' : ''}" data-hash="${item.hash}">
            <div class="trash-item-checkbox">
                <input type="checkbox" 
                       ${isSelected ? 'checked' : ''} 
                       onchange="toggleTrashItemSelect('${item.hash}')" 
                       aria-label="Select ${item.type} activity for bulk restore"
                       title="Select for bulk restore">
            </div>
            <div class="trash-item-icon">${emoji}</div>
            <div class="trash-item-content">
                <div class="trash-item-type">${item.type}</div>
                <div class="trash-item-description">${escapeHtml(description)}</div>
                <div class="trash-item-meta">Deleted: ${deletedDate}</div>
            </div>
            <div class="trash-item-actions">
                <button class="trash-restore-btn" onclick="restoreActivity('${item.hash}')" title="Restore this activity">
                    ♻️ Restore
                </button>
            </div>
        </div>
    `;
}

// Get emoji for activity type
function getTypeEmoji(type) {
    const emojiMap = {
        'commit': '📝',
        'build': '🔨',
        'trade': '💹',
        'message': '💬',
        'email': '📧',
        'calendar': '📅',
        'tweet': '🐦',
        'decision': '🧠',
        'heartbeat': '💓',
        'browser': '🌐',
        'transfer': '💸',
        'deploy': '🚀',
        'session': '🔌',
        'research': '🔍'
    };
    return emojiMap[type] || '⚡';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Restore an activity from trash
async function restoreActivity(hash) {
    try {
        const response = await fetch(`/api/activities/${hash}/restore`, {
            method: 'PATCH'
        });
        
        if (!response.ok) {
            const data = await response.json();
            announce(data.error || 'Failed to restore activity');
            return;
        }
        
        await loadTrashItems();
        announce('Activity restored');
        
        // Reload main activities list if function exists
        if (typeof loadActivities === 'function') {
            loadActivities();
        }
    } catch (e) {
        console.error('Error restoring activity:', e);
        announce('Failed to restore activity');
    }
}

// Toggle selection of a single trash item
function toggleTrashItemSelect(hash) {
    if (selectedTrashItems.has(hash)) {
        selectedTrashItems.delete(hash);
    } else {
        selectedTrashItems.add(hash);
    }
    
    // Update visual state of the item
    const item = document.querySelector(`.trash-item[data-hash="${hash}"]`);
    if (item) {
        item.classList.toggle('selected', selectedTrashItems.has(hash));
    }
    
    updateTrashSelectionUI();
}

// Toggle select all trash items
function toggleTrashSelectAll(checked) {
    if (checked) {
        // Select all
        trashItems.forEach(item => selectedTrashItems.add(item.hash));
    } else {
        // Deselect all
        selectedTrashItems.clear();
    }
    
    // Update all checkboxes visually
    document.querySelectorAll('.trash-item').forEach(el => {
        const hash = el.dataset.hash;
        const checkbox = el.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = selectedTrashItems.has(hash);
        }
        el.classList.toggle('selected', selectedTrashItems.has(hash));
    });
    
    updateTrashSelectionUI();
}

// Update the selection UI (count, button state, select-all checkbox)
function updateTrashSelectionUI() {
    const countEl = document.getElementById('trash-selection-count');
    const restoreBtn = document.getElementById('bulk-restore-btn');
    const selectAllCheckbox = document.getElementById('trash-select-all');
    
    const count = selectedTrashItems.size;
    
    if (countEl) {
        countEl.textContent = `${count} selected`;
    }
    
    if (restoreBtn) {
        restoreBtn.disabled = count === 0;
        restoreBtn.textContent = count > 0 ? `♻️ Restore Selected (${count})` : '♻️ Restore Selected';
    }
    
    if (selectAllCheckbox) {
        // Update indeterminate state
        if (count === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (count === trashItems.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

// Bulk restore selected items from trash
async function bulkRestoreFromTrash() {
    const count = selectedTrashItems.size;
    if (count === 0) {
        announce('No items selected');
        return;
    }
    
    if (!confirm(`Restore ${count} selected ${count === 1 ? 'activity' : 'activities'}?`)) {
        return;
    }
    
    const hashes = Array.from(selectedTrashItems);
    
    try {
        const response = await fetch('/api/activities/bulk-restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hashes })
        });
        
        if (!response.ok) {
            const data = await response.json();
            announce(data.error || 'Failed to restore activities');
            return;
        }
        
        const data = await response.json();
        
        // Clear selection and reload
        selectedTrashItems.clear();
        await loadTrashItems();
        
        // Announce result
        const msg = data.restored > 0 
            ? `${data.restored} ${data.restored === 1 ? 'activity' : 'activities'} restored`
            : 'No activities were restored';
        announce(msg);
        
        // Reload main activities list if function exists
        if (typeof loadActivities === 'function') {
            loadActivities();
        }
    } catch (e) {
        console.error('Error bulk restoring:', e);
        announce('Failed to restore activities');
    }
}

// Delete an activity (move to trash)
async function deleteActivity(hash) {
    if (!confirm('Move this activity to trash?')) return;
    
    try {
        const response = await fetch(`/api/activities/${hash}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const data = await response.json();
            announce(data.error || 'Failed to delete activity');
            return;
        }
        
        // Update local cache
        const activities = window.cachedActivities || allActivities || [];
        const activity = activities.find(a => (a.hash || a.proof?.hash) === hash);
        if (activity) {
            activity.deleted = true;
            activity.deletedAt = new Date().toISOString();
        }
        
        // Re-render to hide deleted activity
        if (typeof applyFilters === 'function') {
            applyFilters();
        }
        
        updateTrashCount();
        
        // Show undo toast instead of simple announcement
        showUndoToast('Activity moved to trash', {
            hashes: [hash],
            timeout: 5000
        });
        
    } catch (e) {
        console.error('Error deleting activity:', e);
        announce('Failed to delete activity');
    }
}

// Empty all trash
async function emptyTrash() {
    if (!confirm('Permanently delete all items in trash? This cannot be undone.')) return;
    
    try {
        const response = await fetch('/api/activities/trash/empty', {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const data = await response.json();
            announce(data.error || 'Failed to empty trash');
            return;
        }
        
        const data = await response.json();
        await loadTrashItems();
        announce(`${data.removedCount} activities permanently deleted`);
    } catch (e) {
        console.error('Error emptying trash:', e);
        announce('Failed to empty trash');
    }
}

// Update trash count badge
async function updateTrashCount() {
    try {
        const response = await fetch('/api/activities/trash');
        const data = await response.json();
        const count = data.count || 0;
        
        const badge = document.getElementById('trash-count');
        if (badge) {
            badge.textContent = count > 0 ? `(${count})` : '';
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
    } catch (e) {
        console.error('Error updating trash count:', e);
    }
}

// ==============================================
// SCHEDULED DELETION / TRASH SETTINGS
// ==============================================

// Toggle trash settings panel visibility
function toggleTrashSettings() {
    const body = document.getElementById('trash-settings-body');
    const icon = document.getElementById('settings-toggle-icon');
    
    if (body.style.display === 'none') {
        body.style.display = 'flex';
        icon.classList.add('expanded');
        loadTrashSettings();
    } else {
        body.style.display = 'none';
        icon.classList.remove('expanded');
    }
}

// Load and display trash settings
async function loadTrashSettings() {
    try {
        const response = await fetch('/api/settings/trash');
        const data = await response.json();
        
        // Update retention days dropdown
        const retentionSelect = document.getElementById('retention-days');
        if (retentionSelect) {
            retentionSelect.value = String(data.retentionDays);
        }
        
        // Update auto-clean checkbox
        const autoCleanCheckbox = document.getElementById('auto-clean-startup');
        if (autoCleanCheckbox) {
            autoCleanCheckbox.checked = data.autoCleanOnStartup ?? true;
        }
        
        // Update stats
        const totalCleaned = document.getElementById('total-cleaned');
        const lastCleanup = document.getElementById('last-cleanup');
        const expiredCount = document.getElementById('expired-count');
        
        if (totalCleaned) totalCleaned.textContent = data.totalCleaned ?? 0;
        if (lastCleanup) {
            lastCleanup.textContent = data.lastCleanup 
                ? new Date(data.lastCleanup).toLocaleString()
                : 'Never';
        }
        if (expiredCount) expiredCount.textContent = data.expiredCount ?? 0;
        
        // Update cleanup button state
        const cleanupBtn = document.getElementById('trash-cleanup-btn');
        if (cleanupBtn) {
            cleanupBtn.disabled = data.retentionDays <= 0 || data.expiredCount === 0;
            cleanupBtn.title = data.retentionDays <= 0 
                ? 'Enable scheduled deletion to use cleanup'
                : data.expiredCount === 0 
                    ? 'No expired items to clean'
                    : `Delete ${data.expiredCount} items older than ${data.retentionDays} days`;
        }
    } catch (e) {
        console.error('Error loading trash settings:', e);
    }
}

// Update retention days setting
async function updateRetentionDays(days) {
    try {
        const response = await fetch('/api/settings/trash', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ retentionDays: parseInt(days, 10) })
        });
        
        if (!response.ok) {
            const data = await response.json();
            announce(data.error || 'Failed to update settings');
            return;
        }
        
        const data = await response.json();
        announce(data.message);
        
        // Reload settings to update UI
        await loadTrashSettings();
    } catch (e) {
        console.error('Error updating retention days:', e);
        announce('Failed to update settings');
    }
}

// Update auto-clean on startup setting
async function updateAutoCleanStartup(enabled) {
    try {
        const response = await fetch('/api/settings/trash', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ autoCleanOnStartup: enabled })
        });
        
        if (!response.ok) {
            const data = await response.json();
            announce(data.error || 'Failed to update settings');
            return;
        }
        
        announce(enabled ? 'Cleanup on startup enabled' : 'Cleanup on startup disabled');
    } catch (e) {
        console.error('Error updating auto-clean setting:', e);
        announce('Failed to update settings');
    }
}

// Run manual cleanup of expired trash
async function cleanupExpiredTrash() {
    const cleanupBtn = document.getElementById('trash-cleanup-btn');
    if (cleanupBtn && cleanupBtn.disabled) {
        announce('No expired items to clean');
        return;
    }
    
    try {
        const response = await fetch('/api/activities/trash/cleanup', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            announce(data.message || data.error || 'Failed to cleanup');
            return;
        }
        
        announce(data.message);
        
        // Reload trash items and settings
        await loadTrashItems();
        await loadTrashSettings();
        await updateTrashCount();
    } catch (e) {
        console.error('Error running cleanup:', e);
        announce('Failed to cleanup expired trash');
    }
}

// Keyboard shortcut for trash (Del key)
document.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    
    const trashModal = document.getElementById('trashModal');
    const isTrashOpen = trashModal && trashModal.style.display !== 'none';
    
    if (e.key === 'Escape' && isTrashOpen) {
        closeTrashModal();
        return;
    }
    
    // Del or Backspace to open trash (only if no other modal is open)
    if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const anyModalOpen = document.querySelector('.custom-types-modal[style*="flex"], .voice-input-modal[style*="flex"], .compare-modal[style*="flex"], .templates-modal[style*="flex"]');
        if (anyModalOpen && !isTrashOpen) return;
        
        e.preventDefault();
        if (isTrashOpen) {
            closeTrashModal();
        } else {
            openTrashModal();
        }
    }
});

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('trashModal');
    if (modal && e.target === modal) {
        closeTrashModal();
    }
});

// Add trash to command palette
if (typeof commandPaletteCommands !== 'undefined') {
    commandPaletteCommands.push(
        { name: 'Open Trash', shortcut: 'Del', action: () => openTrashModal() },
        { name: 'Close Trash', shortcut: 'Escape', action: () => closeTrashModal() },
        { name: 'Empty Trash', action: () => emptyTrash() },
        { name: 'Restore Selected from Trash', action: () => bulkRestoreFromTrash() },
        { name: 'Cleanup Expired Trash', action: () => cleanupExpiredTrash() },
        { name: 'Trash Settings', action: () => { openTrashModal(); setTimeout(toggleTrashSettings, 100); } }
    );
}

// Load trash count on page load
document.addEventListener('DOMContentLoaded', () => {
    updateTrashCount();
    
    // Add keyboard shortcut to help
    const helpContent = document.querySelector('.help-shortcuts');
    if (helpContent) {
        const trashShortcut = document.createElement('div');
        trashShortcut.className = 'shortcut-item';
        trashShortcut.innerHTML = '<kbd>Del</kbd> Open trash';
        helpContent.appendChild(trashShortcut);
    }
});

/* ========================================
   Activity Context Menu (Right-Click Menu)
   ======================================== */

// Context menu state
let contextMenuState = {
    isOpen: false,
    targetHash: null,
    targetActivity: null
};

// Show the context menu
function showContextMenu(event, activityItem) {
    event.preventDefault();
    event.stopPropagation();
    
    const menu = document.getElementById('activityContextMenu');
    if (!menu) return;
    
    // Get activity data from the item
    const hash = activityItem.dataset.hash;
    const isPinned = activityItem.dataset.pinned === 'true';
    const isBookmarked = activityItem.dataset.bookmarked === 'true';
    const status = activityItem.dataset.status || 'completed';
    
    // Find the activity object
    const activities = window.cachedActivities || allActivities || [];
    const activity = activities.find(a => (a.hash || a.proof?.hash) === hash);
    
    if (!activity) return;
    
    // Store state
    contextMenuState = {
        isOpen: true,
        targetHash: hash,
        targetActivity: activity
    };
    
    // Update menu header
    const header = document.getElementById('contextMenuHeader');
    if (header) {
        const type = activity.type || 'activity';
        const desc = activity.description ? activity.description.substring(0, 30) + (activity.description.length > 30 ? '...' : '') : type;
        header.textContent = desc;
    }
    
    // Update pin button
    const pinBtn = document.getElementById('ctxPin');
    if (pinBtn) {
        pinBtn.querySelector('.context-menu-icon').textContent = isPinned ? '📍' : '📌';
        pinBtn.querySelector('.context-menu-label').textContent = isPinned ? 'Unpin Activity' : 'Pin Activity';
    }
    
    // Update bookmark button
    const bookmarkBtn = document.getElementById('ctxBookmark');
    if (bookmarkBtn) {
        bookmarkBtn.querySelector('.context-menu-icon').textContent = isBookmarked ? '★' : '⭐';
        bookmarkBtn.querySelector('.context-menu-label').textContent = isBookmarked ? 'Remove Bookmark' : 'Bookmark';
    }
    
    // Update status items (check current status)
    const statusItems = {
        completed: document.getElementById('ctxStatusCompleted'),
        pending: document.getElementById('ctxStatusPending'),
        failed: document.getElementById('ctxStatusFailed')
    };
    
    Object.entries(statusItems).forEach(([key, item]) => {
        if (item) {
            if (key === status) {
                item.classList.add('disabled');
                item.querySelector('.context-menu-label').textContent = `${key.charAt(0).toUpperCase() + key.slice(1)} ✓`;
            } else {
                item.classList.remove('disabled');
                item.querySelector('.context-menu-label').textContent = key.charAt(0).toUpperCase() + key.slice(1);
            }
        }
    });
    
    // Show/hide compare option based on compare mode
    const compareMode = typeof compareSelections !== 'undefined' && document.getElementById('compare-bar')?.classList.contains('visible');
    const compareBtn = document.getElementById('ctxCompare');
    const compareDivider = document.getElementById('ctxCompareDivider');
    if (compareBtn) {
        if (compareMode) {
            compareBtn.style.display = 'flex';
            compareDivider.style.display = 'block';
            const isInCompare = typeof compareSelections !== 'undefined' && compareSelections.includes(hash);
            compareBtn.querySelector('.context-menu-label').textContent = isInCompare ? 'Remove from Compare' : 'Add to Compare';
        } else {
            compareBtn.style.display = 'none';
            compareDivider.style.display = 'none';
        }
    }
    
    // Show/hide bulk select option based on bulk mode
    const bulkMode = typeof bulkSelections !== 'undefined' && document.getElementById('bulk-bar')?.classList.contains('visible');
    const bulkBtn = document.getElementById('ctxBulkSelect');
    if (bulkBtn) {
        if (bulkMode) {
            bulkBtn.style.display = 'flex';
            const isInBulk = typeof bulkSelections !== 'undefined' && bulkSelections.includes(hash);
            bulkBtn.querySelector('.context-menu-label').textContent = isInBulk ? 'Deselect' : 'Select for Bulk';
        } else {
            bulkBtn.style.display = 'none';
        }
    }
    
    // Update on-chain link visibility
    const onchainBtn = document.getElementById('ctxViewOnChain');
    if (onchainBtn) {
        const hasTx = activity.solanaSignature || (activity.proof && activity.proof.solanaSignature);
        if (hasTx) {
            onchainBtn.classList.remove('disabled');
            onchainBtn.style.display = 'flex';
        } else {
            onchainBtn.classList.add('disabled');
            onchainBtn.style.display = 'none';
        }
    }
    
    // Position menu
    positionContextMenu(menu, event.clientX, event.clientY);
    
    // Show menu with animation
    menu.classList.add('visible');
    
    // Announce for screen readers
    if (typeof announce === 'function') {
        announce('Context menu opened. Use arrow keys to navigate.');
    }
}

// Position the context menu, ensuring it stays on screen
function positionContextMenu(menu, x, y) {
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate actual menu dimensions (before positioning)
    menu.style.visibility = 'hidden';
    menu.style.display = 'block';
    const tempRect = menu.getBoundingClientRect();
    const menuWidth = tempRect.width || 200;
    const menuHeight = tempRect.height || 300;
    menu.style.visibility = '';
    
    // Adjust X position if menu would go off right edge
    let finalX = x;
    if (x + menuWidth > viewportWidth - 10) {
        finalX = viewportWidth - menuWidth - 10;
    }
    
    // Adjust Y position if menu would go off bottom edge
    let finalY = y;
    let originBottom = false;
    if (y + menuHeight > viewportHeight - 10) {
        finalY = y - menuHeight;
        originBottom = true;
        if (finalY < 10) {
            finalY = viewportHeight - menuHeight - 10;
        }
    }
    
    // Apply position
    menu.style.left = `${Math.max(10, finalX)}px`;
    menu.style.top = `${Math.max(10, finalY)}px`;
    
    // Set transform origin for animation
    if (originBottom) {
        menu.classList.add('origin-bottom');
    } else {
        menu.classList.remove('origin-bottom');
    }
}

// Hide the context menu
function hideContextMenu() {
    const menu = document.getElementById('activityContextMenu');
    if (menu) {
        menu.classList.remove('visible');
    }
    contextMenuState.isOpen = false;
    contextMenuState.targetHash = null;
    contextMenuState.targetActivity = null;
}

// Context menu action handlers
function handleContextMenuAction(actionId) {
    const { targetHash, targetActivity } = contextMenuState;
    
    if (!targetHash) {
        hideContextMenu();
        return;
    }
    
    switch (actionId) {
        case 'ctxPin':
            if (typeof togglePin === 'function') {
                togglePin(targetHash);
            }
            break;
            
        case 'ctxBookmark':
            if (typeof toggleBookmark === 'function') {
                toggleBookmark(targetHash);
            }
            break;
            
        case 'ctxCopyLink':
            const activityId = targetActivity ? getActivityId(targetActivity) : targetHash.substring(0, 8);
            const link = `${window.location.origin}${window.location.pathname}#activity-${activityId}`;
            navigator.clipboard.writeText(link).then(() => {
                if (typeof announce === 'function') announce('Link copied to clipboard');
            }).catch(() => {
                if (typeof announce === 'function') announce('Failed to copy link');
            });
            break;
            
        case 'ctxCopyHash':
            navigator.clipboard.writeText(targetHash).then(() => {
                if (typeof announce === 'function') announce('Hash copied to clipboard');
            }).catch(() => {
                if (typeof announce === 'function') announce('Failed to copy hash');
            });
            break;
            
        case 'ctxViewOnChain':
            const sig = targetActivity?.solanaSignature || targetActivity?.proof?.solanaSignature;
            if (sig) {
                window.open(`https://solscan.io/tx/${sig}`, '_blank');
            }
            break;
            
        case 'ctxStatusCompleted':
            if (typeof cycleStatus === 'function') {
                cycleStatus(targetHash, 'completed');
            }
            break;
            
        case 'ctxStatusPending':
            if (typeof cycleStatus === 'function') {
                cycleStatus(targetHash, 'pending');
            }
            break;
            
        case 'ctxStatusFailed':
            if (typeof cycleStatus === 'function') {
                cycleStatus(targetHash, 'failed');
            }
            break;
            
        case 'ctxCompare':
            if (typeof toggleCompareSelection === 'function') {
                toggleCompareSelection(targetHash);
            }
            break;
            
        case 'ctxBulkSelect':
            if (typeof toggleBulkSelection === 'function') {
                toggleBulkSelection(targetHash);
            }
            break;
            
        case 'ctxDelete':
            if (typeof deleteActivity === 'function') {
                deleteActivity(targetHash);
            }
            break;
            
        case 'ctxReminder':
            if (typeof openReminderForActivity === 'function') {
                openReminderForActivity(targetHash, targetActivity);
            }
            break;
            
        case 'ctxLinkActivity':
            if (typeof openLinkActivityModal === 'function') {
                openLinkActivityModal(targetHash);
            }
            break;
    }
    
    hideContextMenu();
}

// Initialize context menu event listeners
function initContextMenu() {
    const menu = document.getElementById('activityContextMenu');
    if (!menu) return;
    
    // Click handlers for menu items
    const menuItems = menu.querySelectorAll('.context-menu-item[id]');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!item.classList.contains('disabled')) {
                handleContextMenuAction(item.id);
            }
        });
    });
    
    // Hide menu when clicking outside
    document.addEventListener('click', (e) => {
        if (contextMenuState.isOpen && !menu.contains(e.target)) {
            hideContextMenu();
        }
    });
    
    // Hide menu on scroll
    window.addEventListener('scroll', () => {
        if (contextMenuState.isOpen) {
            hideContextMenu();
        }
    }, true);
    
    // Hide menu on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && contextMenuState.isOpen) {
            e.preventDefault();
            hideContextMenu();
        }
    });
    
    // Keyboard navigation within menu
    menu.addEventListener('keydown', (e) => {
        if (!contextMenuState.isOpen) return;
        
        const items = Array.from(menu.querySelectorAll('.context-menu-item:not([style*="display: none"]):not(.disabled)'));
        const currentIndex = items.indexOf(document.activeElement);
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            items[nextIndex]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            items[prevIndex]?.focus();
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (document.activeElement && document.activeElement.id) {
                handleContextMenuAction(document.activeElement.id);
            }
        }
    });
    
    // Right-click handler on activity items
    document.addEventListener('contextmenu', (e) => {
        const activityItem = e.target.closest('.activity-item');
        if (activityItem && activityItem.dataset.hash) {
            showContextMenu(e, activityItem);
        } else if (contextMenuState.isOpen) {
            // Right-clicking elsewhere closes the menu
            hideContextMenu();
        }
    });
    
    console.log('Activity context menu initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContextMenu);
} else {
    initContextMenu();
}

// Add to command palette
if (typeof commandPaletteCommands !== 'undefined') {
    commandPaletteCommands.push(
        { name: 'Show Context Menu (right-click on activity)', action: () => {
            if (typeof announce === 'function') announce('Right-click on any activity to open context menu');
        }}
    );
}

// ===================================
// REMINDERS SYSTEM
// ===================================

// Reminders state
let remindersCache = [];
let currentReminderTab = 'due';
let reminderCheckInterval = null;
let reminderToasts = [];

// Initialize reminders system
function initReminders() {
    loadReminders();
    
    // Check for due reminders every 60 seconds
    reminderCheckInterval = setInterval(checkDueReminders, 60000);
    
    // Initial check
    setTimeout(checkDueReminders, 3000);
    
    // Listen for WebSocket updates
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('ws_reminder_created', () => loadReminders());
        window.addEventListener('ws_reminder_updated', () => loadReminders());
        window.addEventListener('ws_reminder_completed', () => loadReminders());
        window.addEventListener('ws_reminder_deleted', () => loadReminders());
        window.addEventListener('ws_reminder_snoozed', () => loadReminders());
    }
}

// Load reminders from API
async function loadReminders() {
    try {
        const response = await fetch('/api/reminders');
        if (!response.ok) throw new Error('Failed to load reminders');
        const data = await response.json();
        remindersCache = data.reminders || [];
        updateReminderBadge(data.due || 0);
        
        // If modal is open, refresh the list
        const modal = document.getElementById('remindersModal');
        if (modal && modal.style.display !== 'none') {
            renderRemindersList();
        }
        
        return data;
    } catch (err) {
        console.error('Error loading reminders:', err);
        return { reminders: [], due: 0 };
    }
}

// Update the reminder badge count in the header
function updateReminderBadge(count) {
    const badge = document.querySelector('.reminders-count');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
    
    const dueCountEl = document.getElementById('dueCount');
    if (dueCountEl) {
        dueCountEl.textContent = count;
    }
}

// Check for due reminders and show notifications
async function checkDueReminders() {
    try {
        const response = await fetch('/api/reminders/due');
        if (!response.ok) return;
        const data = await response.json();
        
        // Show toast for each due reminder
        for (const reminder of (data.reminders || [])) {
            // Skip if toast already shown for this reminder recently
            if (reminderToasts.includes(reminder.id)) continue;
            
            showReminderToast(reminder);
            reminderToasts.push(reminder.id);
            
            // Also try browser notification if permitted
            showBrowserNotification(reminder);
        }
        
        updateReminderBadge(data.count || 0);
    } catch (err) {
        console.error('Error checking due reminders:', err);
    }
}

// Show a toast notification for a due reminder
function showReminderToast(reminder) {
    // Remove existing toast for this reminder
    const existing = document.querySelector(`.reminder-toast[data-id="${reminder.id}"]`);
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'reminder-toast';
    toast.dataset.id = reminder.id;
    
    const priorityEmoji = { high: '🔴', normal: '🟡', low: '🟢' }[reminder.priority] || '🔔';
    
    toast.innerHTML = `
        <div class="reminder-toast-header">
            <span class="reminder-toast-title">${priorityEmoji} ${escapeHtml(reminder.title)}</span>
            <button class="reminder-toast-close" onclick="dismissReminderToast('${reminder.id}')">&times;</button>
        </div>
        ${reminder.message ? `<div class="reminder-toast-message">${escapeHtml(reminder.message)}</div>` : ''}
        <div class="reminder-toast-actions">
            <button class="reminder-toast-snooze" onclick="snoozeReminder('${reminder.id}', 15)">⏸️ Snooze 15m</button>
            <button class="reminder-toast-complete" onclick="completeReminder('${reminder.id}')">✅ Done</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-dismiss after 30 seconds
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 30000);
}

// Dismiss a reminder toast
function dismissReminderToast(id) {
    const toast = document.querySelector(`.reminder-toast[data-id="${id}"]`);
    if (toast) toast.remove();
}

// Show browser notification if permitted
function showBrowserNotification(reminder) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    
    const priorityEmoji = { high: '🔴', normal: '🟡', low: '🟢' }[reminder.priority] || '🔔';
    
    new Notification(`${priorityEmoji} Reminder: ${reminder.title}`, {
        body: reminder.message || 'You have a reminder due',
        icon: '/pow/favicon.svg',
        tag: `reminder-${reminder.id}`,
        requireInteraction: true
    });
}

// Open reminders modal
function openRemindersModal() {
    const modal = document.getElementById('remindersModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    loadReminders().then(() => {
        renderRemindersList();
    });
    
    announceToScreenReader('Reminders modal opened');
}

// Close reminders modal
function closeRemindersModal() {
    const modal = document.getElementById('remindersModal');
    if (modal) modal.style.display = 'none';
}

// Switch reminder tabs
function switchReminderTab(tab) {
    currentReminderTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.reminder-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    renderRemindersList();
}

// Render the reminders list based on current tab
function renderRemindersList() {
    const list = document.getElementById('remindersList');
    if (!list) return;
    
    let filtered = [];
    const now = new Date();
    
    switch (currentReminderTab) {
        case 'due':
            filtered = remindersCache.filter(r => r.isDue && !r.completed);
            break;
        case 'upcoming':
            filtered = remindersCache.filter(r => !r.isDue && !r.completed);
            break;
        case 'completed':
            filtered = remindersCache.filter(r => r.completed);
            break;
    }
    
    if (filtered.length === 0) {
        const emptyMessages = {
            due: 'No reminders due right now! 🎉',
            upcoming: 'No upcoming reminders scheduled.',
            completed: 'No completed reminders yet.'
        };
        list.innerHTML = `<div class="empty-state">${emptyMessages[currentReminderTab]}</div>`;
        return;
    }
    
    list.innerHTML = filtered.map(r => renderReminderItem(r)).join('');
}

// Render a single reminder item
function renderReminderItem(reminder) {
    const remindAt = new Date(reminder.remindAt);
    const now = new Date();
    const isOverdue = !reminder.completed && remindAt < now;
    const diffMs = remindAt.getTime() - now.getTime();
    const diffMins = Math.abs(Math.floor(diffMs / 60000));
    
    let timeText = '';
    if (reminder.completed) {
        timeText = `Completed ${formatRelativeTime(reminder.completedAt)}`;
    } else if (isOverdue) {
        timeText = `Overdue by ${formatDuration(diffMins)}`;
    } else {
        timeText = `Due ${formatRelativeTime(reminder.remindAt)}`;
    }
    
    const priorityLabels = { high: 'High', normal: 'Normal', low: 'Low' };
    const repeatLabels = { none: '', daily: '🔄 Daily', weekly: '🔄 Weekly', monthly: '🔄 Monthly' };
    
    let classes = 'reminder-item';
    if (isOverdue) classes += ' due';
    if (reminder.completed) classes += ' completed';
    if (reminder.priority === 'high') classes += ' high-priority';
    
    return `
        <div class="${classes}" data-id="${reminder.id}">
            <div class="reminder-header">
                <span class="reminder-title">${escapeHtml(reminder.title)}</span>
                <span class="reminder-priority ${reminder.priority}">${priorityLabels[reminder.priority]}</span>
            </div>
            ${reminder.message ? `<div class="reminder-message">${escapeHtml(reminder.message)}</div>` : ''}
            <div class="reminder-meta">
                <span class="reminder-time ${isOverdue ? 'overdue' : ''}">
                    ${isOverdue ? '⚠️' : '🕐'} ${timeText}
                    ${repeatLabels[reminder.repeat] ? ` • ${repeatLabels[reminder.repeat]}` : ''}
                </span>
                ${reminder.activity ? `
                    <a class="reminder-activity-link" href="#${reminder.activityHash}" onclick="jumpToActivity('${reminder.activityHash}'); closeRemindersModal();">
                        🔗 ${reminder.activity.type}
                    </a>
                ` : ''}
            </div>
            <div class="reminder-actions">
                ${!reminder.completed ? `
                    <button class="reminder-action-btn" onclick="snoozeReminder('${reminder.id}', 15)">⏸️ 15m</button>
                    <button class="reminder-action-btn" onclick="snoozeReminder('${reminder.id}', 60)">⏸️ 1h</button>
                    <button class="reminder-action-btn complete" onclick="completeReminder('${reminder.id}')">✅ Done</button>
                ` : ''}
                <button class="reminder-action-btn danger" onclick="deleteReminder('${reminder.id}')">🗑️</button>
            </div>
        </div>
    `;
}

// Format duration in human-readable format
function formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d`;
}

// Open the add reminder form
function openAddReminderForm() {
    openReminderFormModal(null, null);
}

// Open reminder form for a specific activity
function openReminderForActivity(hash, activity) {
    openReminderFormModal(hash, activity);
}

// Open the reminder form modal
function openReminderFormModal(activityHash = null, activity = null) {
    const modal = document.getElementById('reminderFormModal');
    if (!modal) return;
    
    // Reset form
    const form = document.getElementById('reminderForm');
    form.reset();
    
    document.getElementById('reminderActivityHash').value = activityHash || '';
    document.getElementById('reminderEditId').value = '';
    
    // Set default date/time to 1 hour from now
    const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
    document.getElementById('reminderDate').value = defaultTime.toISOString().split('T')[0];
    document.getElementById('reminderTime').value = defaultTime.toTimeString().slice(0, 5);
    
    // Show/hide activity info
    const activityInfo = document.getElementById('reminderActivityInfo');
    const activityDesc = document.getElementById('reminderActivityDesc');
    if (activityHash && activity) {
        activityInfo.style.display = 'flex';
        const type = activity.type || 'Activity';
        const desc = activity.description ? activity.description.substring(0, 50) : '';
        activityDesc.textContent = `${type}: ${desc}${desc.length < activity.description?.length ? '...' : ''}`;
        
        // Pre-fill title with activity reference
        document.getElementById('reminderTitle').value = `Follow up: ${type}`;
    } else {
        activityInfo.style.display = 'none';
    }
    
    // Update title and button
    document.getElementById('reminderFormTitle').textContent = '⏰ Set Reminder';
    document.getElementById('reminderSubmitBtn').textContent = 'Set Reminder';
    
    modal.style.display = 'flex';
    document.getElementById('reminderTitle').focus();
    
    announceToScreenReader('Set reminder form opened');
}

// Close the reminder form modal
function closeReminderFormModal() {
    const modal = document.getElementById('reminderFormModal');
    if (modal) modal.style.display = 'none';
}

// Handle reminder form submission
async function handleReminderSubmit(event) {
    event.preventDefault();
    
    const title = document.getElementById('reminderTitle').value.trim();
    const message = document.getElementById('reminderMessage').value.trim();
    const date = document.getElementById('reminderDate').value;
    const time = document.getElementById('reminderTime').value;
    const repeat = document.getElementById('reminderRepeat').value;
    const priority = document.getElementById('reminderPriority').value;
    const activityHash = document.getElementById('reminderActivityHash').value || null;
    const editId = document.getElementById('reminderEditId').value || null;
    
    if (!title || !date || !time) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const remindAt = new Date(`${date}T${time}`);
    if (isNaN(remindAt.getTime())) {
        showToast('Invalid date/time', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('reminderSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    try {
        const url = editId ? `/api/reminders/${editId}` : '/api/reminders';
        const method = editId ? 'PATCH' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                message: message || undefined,
                remindAt: remindAt.toISOString(),
                repeat,
                priority,
                activityHash
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save reminder');
        }
        
        const reminder = await response.json();
        
        showToast(editId ? 'Reminder updated!' : `Reminder set for ${remindAt.toLocaleString()}`, 'success');
        closeReminderFormModal();
        loadReminders();
        
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = editId ? 'Update Reminder' : 'Set Reminder';
    }
}

// Complete a reminder
async function completeReminder(id) {
    try {
        const response = await fetch(`/api/reminders/${id}/complete`, {
            method: 'PATCH'
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to complete reminder');
        }
        
        const result = await response.json();
        
        // Remove toast if shown
        dismissReminderToast(id);
        
        // Remove from shown toasts list
        reminderToasts = reminderToasts.filter(t => t !== id);
        
        showToast(result.next 
            ? `Reminder completed! Next: ${new Date(result.next.remindAt).toLocaleString()}`
            : 'Reminder completed!', 'success');
        
        loadReminders();
        
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Snooze a reminder
async function snoozeReminder(id, minutes) {
    try {
        const response = await fetch(`/api/reminders/${id}/snooze?minutes=${minutes}`, {
            method: 'PATCH'
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to snooze reminder');
        }
        
        const result = await response.json();
        
        // Remove toast
        dismissReminderToast(id);
        
        // Remove from shown toasts list so it can show again when due
        reminderToasts = reminderToasts.filter(t => t !== id);
        
        showToast(`Snoozed for ${minutes} minutes`, 'success');
        loadReminders();
        
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Delete a reminder
async function deleteReminder(id) {
    if (!confirm('Delete this reminder?')) return;
    
    try {
        const response = await fetch(`/api/reminders/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to delete reminder');
        }
        
        showToast('Reminder deleted', 'success');
        loadReminders();
        
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Jump to an activity by hash
function jumpToActivity(hash) {
    if (!hash) return;
    
    // Update URL hash
    window.location.hash = hash;
    
    // Find and scroll to the activity
    const activityItem = document.querySelector(`[data-hash="${hash}"]`);
    if (activityItem) {
        activityItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        activityItem.classList.add('highlighted');
        setTimeout(() => activityItem.classList.remove('highlighted'), 2000);
    }
}

// Helper: escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper: format relative time
function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(Math.abs(diffMs) / 60000);
    const isPast = diffMs < 0;
    
    if (diffMins < 1) return isPast ? 'just now' : 'now';
    if (diffMins < 60) return isPast ? `${diffMins}m ago` : `in ${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return isPast ? `${diffHours}h ago` : `in ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return isPast ? `${diffDays}d ago` : `in ${diffDays}d`;
    
    return date.toLocaleDateString();
}

// Add keyboard shortcut for reminders (R key)
document.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    if (e.target.matches('input, textarea, select')) return;
    
    if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        openRemindersModal();
    }
});

// Initialize reminders on page load
document.addEventListener('DOMContentLoaded', () => {
    initReminders();
});

// ==================================
// ACTIVITY RELATIONSHIPS
// ==================================

// Cache for relationships
let relationshipsCache = [];
let activitiesForLinking = [];

// Load relationships from API
async function loadRelationships() {
    try {
        const response = await fetch('/api/relationships');
        const data = await response.json();
        relationshipsCache = data.relationships || [];
        return relationshipsCache;
    } catch (e) {
        console.error('Failed to load relationships:', e);
        return [];
    }
}

// Open relationships modal
function openRelationshipsModal() {
    const modal = document.getElementById('relationshipsModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    loadRelationships().then(() => {
        renderRelationshipsList();
    });
    
    announceToScreenReader('Relationships modal opened');
}

// Close relationships modal
function closeRelationshipsModal() {
    const modal = document.getElementById('relationshipsModal');
    if (modal) modal.style.display = 'none';
}

// Render relationships list
async function renderRelationshipsList() {
    const list = document.getElementById('relationshipsList');
    const statsTotal = document.getElementById('relTotal');
    const statsTypes = document.getElementById('relTypes');
    
    if (!list) return;
    
    if (relationshipsCache.length === 0) {
        list.innerHTML = '<div class="empty-state">No relationships yet. Link activities from the context menu (right-click).</div>';
        if (statsTotal) statsTotal.textContent = '0';
        if (statsTypes) statsTypes.textContent = '-';
        return;
    }
    
    // Update stats
    if (statsTotal) statsTotal.textContent = relationshipsCache.length;
    
    const types = [...new Set(relationshipsCache.map(r => r.type))];
    if (statsTypes) statsTypes.textContent = types.join(', ');
    
    // Fetch activity details for enrichment
    let activities = [];
    try {
        const res = await fetch('/api/activities');
        activities = await res.json();
    } catch (e) {}
    
    const activityMap = new Map(activities.map(a => [a.hash, a]));
    
    const typeLabels = {
        'follows-up': '➡️ Follows up',
        'related-to': '🔗 Related to',
        'fixes': '🔧 Fixes',
        'blocks': '🚫 Blocks',
        'implements': '✨ Implements',
        'supersedes': '⬆️ Supersedes'
    };
    
    list.innerHTML = relationshipsCache.map(rel => {
        const source = activityMap.get(rel.sourceHash);
        const target = activityMap.get(rel.targetHash);
        
        const sourceDesc = source ? `${getTypeEmoji(source.type)} ${(source.description || '').slice(0, 40)}...` : rel.sourceHash.slice(0, 12);
        const targetDesc = target ? `${getTypeEmoji(target.type)} ${(target.description || '').slice(0, 40)}...` : rel.targetHash.slice(0, 12);
        
        return `
            <div class="relationship-item" data-id="${rel.id}">
                <div class="rel-header">
                    <span class="rel-type">${typeLabels[rel.type] || rel.type}</span>
                    <button class="rel-delete" onclick="deleteRelationship('${rel.id}')" title="Delete relationship">&times;</button>
                </div>
                <div class="rel-activities">
                    <span class="rel-activity" onclick="jumpToActivity('${rel.sourceHash}')" title="Click to view">${sourceDesc}</span>
                    <span class="rel-arrow">→</span>
                    <span class="rel-activity" onclick="jumpToActivity('${rel.targetHash}')" title="Click to view">${targetDesc}</span>
                </div>
                ${rel.description ? `<div class="rel-description">"${escapeHtml(rel.description)}"</div>` : ''}
            </div>
        `;
    }).join('');
}

// Delete a relationship
async function deleteRelationship(id) {
    if (!confirm('Delete this relationship?')) return;
    
    try {
        const response = await fetch(`/api/relationships/${id}`, { method: 'DELETE' });
        if (response.ok) {
            relationshipsCache = relationshipsCache.filter(r => r.id !== id);
            renderRelationshipsList();
            showToast('Relationship deleted', 'success');
        } else {
            showToast('Failed to delete relationship', 'error');
        }
    } catch (e) {
        console.error('Failed to delete relationship:', e);
        showToast('Error deleting relationship', 'error');
    }
}

// Open link activity modal
function openLinkActivityModal(sourceHash) {
    const modal = document.getElementById('linkActivityModal');
    if (!modal) return;
    
    // Set source hash
    document.getElementById('linkSourceHash').value = sourceHash;
    
    // Load activities for searching
    loadActivitiesForLinking().then(() => {
        // Find source activity and display it
        const source = activitiesForLinking.find(a => a.hash === sourceHash);
        const display = document.getElementById('linkSourceDisplay');
        if (display && source) {
            display.innerHTML = `
                <span class="activity-type-badge">${source.type}</span>
                <span class="activity-desc">${escapeHtml((source.description || '').slice(0, 60))}</span>
            `;
        }
    });
    
    // Reset form
    document.getElementById('linkType').value = '';
    document.getElementById('linkTargetSearch').value = '';
    document.getElementById('linkTargetHash').value = '';
    document.getElementById('linkDescription').value = '';
    document.getElementById('linkTargetResults').style.display = 'none';
    
    modal.style.display = 'flex';
    announceToScreenReader('Link activity modal opened');
}

// Close link activity modal
function closeLinkActivityModal() {
    const modal = document.getElementById('linkActivityModal');
    if (modal) modal.style.display = 'none';
}

// Load activities for linking dropdown
async function loadActivitiesForLinking() {
    try {
        const response = await fetch('/api/activities');
        activitiesForLinking = await response.json();
    } catch (e) {
        console.error('Failed to load activities for linking:', e);
        activitiesForLinking = [];
    }
}

// Handle target search input
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('linkTargetSearch');
    const resultsDiv = document.getElementById('linkTargetResults');
    
    if (searchInput && resultsDiv) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const sourceHash = document.getElementById('linkSourceHash').value;
            
            if (query.length < 2) {
                resultsDiv.style.display = 'none';
                return;
            }
            
            // Filter activities matching query (exclude source)
            const matches = activitiesForLinking
                .filter(a => a.hash !== sourceHash)
                .filter(a => 
                    (a.description || '').toLowerCase().includes(query) ||
                    (a.hash || '').toLowerCase().includes(query) ||
                    (a.type || '').toLowerCase().includes(query)
                )
                .slice(0, 10);
            
            if (matches.length === 0) {
                resultsDiv.innerHTML = '<div class="target-option">No matches found</div>';
            } else {
                resultsDiv.innerHTML = matches.map(a => `
                    <div class="target-option" data-hash="${a.hash}" onclick="selectLinkTarget('${a.hash}', '${escapeHtml((a.description || '').slice(0, 50))}')">
                        <span class="target-type">${a.type}</span>
                        <span class="target-desc">${escapeHtml((a.description || '').slice(0, 60))}</span>
                    </div>
                `).join('');
            }
            
            resultsDiv.style.display = 'block';
        });
        
        // Close results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.form-group') || e.target.matches('.target-option')) {
                if (resultsDiv) resultsDiv.style.display = 'none';
            }
        });
    }
});

// Select a target activity
function selectLinkTarget(hash, description) {
    document.getElementById('linkTargetHash').value = hash;
    document.getElementById('linkTargetSearch').value = description;
    document.getElementById('linkTargetResults').style.display = 'none';
}

// Handle link activity form submit
async function handleLinkActivitySubmit(event) {
    event.preventDefault();
    
    const sourceHash = document.getElementById('linkSourceHash').value;
    const targetHash = document.getElementById('linkTargetHash').value;
    const type = document.getElementById('linkType').value;
    const description = document.getElementById('linkDescription').value.trim();
    
    if (!sourceHash || !targetHash || !type) {
        showToast('Please select a relationship type and target activity', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/relationships', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sourceHash,
                targetHash,
                type,
                description: description || undefined
            })
        });
        
        if (response.ok) {
            const relationship = await response.json();
            relationshipsCache.push(relationship);
            closeLinkActivityModal();
            showToast('Relationship created!', 'success');
        } else {
            const err = await response.json();
            showToast(err.error || 'Failed to create relationship', 'error');
        }
    } catch (e) {
        console.error('Failed to create relationship:', e);
        showToast('Error creating relationship', 'error');
    }
}

// Helper: get type emoji
function getTypeEmoji(type) {
    const emojis = {
        'commit': '💾',
        'build': '🔨',
        'deploy': '🚀',
        'trade': '💹',
        'transfer': '💸',
        'message': '💬',
        'tweet': '🐦',
        'decision': '🎯',
        'research': '🔍',
        'email': '📧',
        'calendar': '📅',
        'browser': '🌐',
        'session': '⚡',
        'heartbeat': '💓'
    };
    return emojis[type] || '📌';
}

// Jump to an activity (reuse existing functionality if available)
function jumpToActivity(hash) {
    closeRelationshipsModal();
    
    // Try to scroll to activity in the feed
    const activityEl = document.querySelector(`[data-hash="${hash}"]`);
    if (activityEl) {
        activityEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        activityEl.classList.add('highlighted');
        setTimeout(() => activityEl.classList.remove('highlighted'), 2000);
    } else {
        // Navigate via deep link
        window.location.hash = hash.slice(0, 8);
    }
}

// Add keyboard shortcut for relationships (L key)
document.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    if (e.target.matches('input, textarea, select')) return;
    
    if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        openRelationshipsModal();
    }
});

// Close modals on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeRelationshipsModal();
        closeLinkActivityModal();
    }
});

// Close modals when clicking backdrop
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('relationships-modal')) {
        closeRelationshipsModal();
    }
    if (e.target.classList.contains('link-activity-modal')) {
        closeLinkActivityModal();
    }
});

// ========================================
// RELATIONSHIP NETWORK GRAPH
// ========================================

let graphSimulation = null;
let graphSvg = null;
let graphZoom = null;
let graphData = { nodes: [], links: [] };

// Initialize the relationship graph
async function initRelationshipGraph() {
    const container = document.getElementById('relationshipGraphContainer');
    const svg = d3.select('#relationshipGraph');
    const loading = document.getElementById('graph-loading');
    const empty = document.getElementById('graphEmpty');
    
    if (!container || !svg.node()) return;
    
    try {
        // Fetch graph data
        const response = await fetch('/api/relationships/graph');
        if (!response.ok) throw new Error('Failed to fetch graph data');
        
        const data = await response.json();
        graphData = data;
        
        // Hide loading
        if (loading) loading.style.display = 'none';
        
        // Check if empty
        if (!data.nodes || data.nodes.length === 0) {
            if (empty) empty.style.display = 'block';
            updateGraphStats(0, 0, 0);
            return;
        }
        
        if (empty) empty.style.display = 'none';
        
        // Render the graph
        renderRelationshipGraph(data);
        
        // Update stats
        const clusters = countClusters(data.nodes, data.edges || []);
        updateGraphStats(data.nodes.length, (data.edges || []).length, clusters);
        
    } catch (error) {
        console.error('Failed to load relationship graph:', error);
        if (loading) loading.innerHTML = '<span class="error-text">Failed to load graph</span>';
    }
}

function renderRelationshipGraph(data) {
    const container = document.getElementById('relationshipGraphContainer');
    const svg = d3.select('#relationshipGraph');
    
    // Clear existing content
    svg.selectAll('*').remove();
    
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    
    // Create zoom behavior
    graphZoom = d3.zoom()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    
    svg.call(graphZoom);
    
    // Create main group for zoom/pan
    const g = svg.append('g');
    graphSvg = g;
    
    // Map node hashes to node objects
    const nodeMap = new Map(data.nodes.map(n => [n.hash, n]));
    
    // Prepare links (edges)
    const links = (data.edges || []).map(e => ({
        source: e.source,
        target: e.target,
        type: e.type,
        description: e.description
    })).filter(l => nodeMap.has(l.source) && nodeMap.has(l.target));
    
    // Prepare nodes
    const nodes = data.nodes.map(n => ({
        id: n.hash,
        type: n.type || 'default',
        description: n.description || n.hash.slice(0, 8),
        timestamp: n.timestamp
    }));
    
    // Color scale for link types
    const linkColors = {
        'follows-up': '#10b981',
        'related-to': '#6366f1',
        'fixes': '#f59e0b',
        'blocks': '#ef4444',
        'implements': '#8b5cf6',
        'supersedes': '#ec4899'
    };
    
    // Color scale for node types
    const nodeColors = {
        'commit': '#10b981',
        'build': '#6366f1',
        'trade': '#f59e0b',
        'tweet': '#1da1f2',
        'message': '#8b5cf6',
        'email': '#ef4444',
        'browse': '#ec4899',
        'calendar': '#14b8a6',
        'default': '#6b7280'
    };
    
    // Create arrow markers for directed edges
    const defs = svg.append('defs');
    Object.entries(linkColors).forEach(([type, color]) => {
        defs.append('marker')
            .attr('id', `arrow-${type}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('fill', color)
            .attr('d', 'M0,-5L10,0L0,5');
    });
    
    // Create force simulation
    graphSimulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30));
    
    // Create links
    const link = g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('class', d => `graph-link link-${d.type}`)
        .attr('stroke', d => linkColors[d.type] || '#6b7280')
        .attr('stroke-width', 2)
        .attr('marker-end', d => `url(#arrow-${d.type})`);
    
    // Create node groups
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .attr('class', 'graph-node')
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));
    
    // Add circles to nodes
    node.append('circle')
        .attr('r', 12)
        .attr('fill', d => nodeColors[d.type] || nodeColors.default)
        .attr('class', d => `node-${d.type || 'default'}`);
    
    // Add labels to nodes
    node.append('text')
        .attr('dy', 25)
        .attr('text-anchor', 'middle')
        .text(d => truncateText(d.description, 15));
    
    // Add tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'graph-tooltip')
        .style('display', 'none');
    
    node.on('mouseover', (event, d) => {
        tooltip.style('display', 'block')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
                <div class="tooltip-type">${getTypeEmoji(d.type)} ${d.type || 'activity'}</div>
                <div class="tooltip-desc">${d.description}</div>
                <div class="tooltip-hash" style="font-size: 0.7rem; color: #888; margin-top: 0.3rem;">${d.id.slice(0, 16)}...</div>
            `);
    })
    .on('mousemove', (event) => {
        tooltip.style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', () => {
        tooltip.style('display', 'none');
    })
    .on('click', (event, d) => {
        event.stopPropagation();
        jumpToActivity(d.id);
    });
    
    // Update positions on simulation tick
    graphSimulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragStarted(event, d) {
        if (!event.active) graphSimulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragEnded(event, d) {
        if (!event.active) graphSimulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

// Count clusters using union-find
function countClusters(nodes, edges) {
    if (nodes.length === 0) return 0;
    
    const parent = {};
    nodes.forEach(n => parent[n.hash] = n.hash);
    
    function find(x) {
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
    }
    
    function union(x, y) {
        const px = find(x);
        const py = find(y);
        if (px !== py) parent[px] = py;
    }
    
    edges.forEach(e => {
        if (parent[e.source] && parent[e.target]) {
            union(e.source, e.target);
        }
    });
    
    const roots = new Set(nodes.map(n => find(n.hash)));
    return roots.size;
}

// Update graph stats
function updateGraphStats(nodes, edges, clusters) {
    const nodeEl = document.getElementById('graphNodeCount');
    const edgeEl = document.getElementById('graphEdgeCount');
    const clusterEl = document.getElementById('graphClusterCount');
    
    if (nodeEl) nodeEl.textContent = nodes;
    if (edgeEl) edgeEl.textContent = edges;
    if (clusterEl) clusterEl.textContent = clusters;
}

// Truncate text helper
function truncateText(text, maxLen) {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

// Reset graph zoom
function resetGraphZoom() {
    const svg = d3.select('#relationshipGraph');
    if (graphZoom) {
        svg.transition().duration(500).call(graphZoom.transform, d3.zoomIdentity);
    }
}

// Toggle fullscreen
function toggleGraphFullscreen() {
    const container = document.getElementById('relationshipGraphContainer');
    const btn = document.getElementById('graphFullscreenBtn');
    
    if (!container) return;
    
    container.classList.toggle('fullscreen');
    
    if (container.classList.contains('fullscreen')) {
        btn.innerHTML = '<span>⛶</span> Exit';
        // Re-render at new size
        setTimeout(() => {
            if (graphData.nodes && graphData.nodes.length > 0) {
                renderRelationshipGraph(graphData);
            }
        }, 100);
    } else {
        btn.innerHTML = '<span>⛶</span> Expand';
        setTimeout(() => {
            if (graphData.nodes && graphData.nodes.length > 0) {
                renderRelationshipGraph(graphData);
            }
        }, 100);
    }
}

// Escape fullscreen on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const container = document.getElementById('relationshipGraphContainer');
        if (container && container.classList.contains('fullscreen')) {
            toggleGraphFullscreen();
        }
    }
});

// Add G keyboard shortcut for graph focus
document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    
    if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const graphCard = document.getElementById('relationship-graph-card');
        if (graphCard) {
            graphCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
});

// Initialize graph when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Delay initialization to allow other charts to load first
    setTimeout(initRelationshipGraph, 1500);
});

// Refresh graph when relationships change
function refreshRelationshipGraph() {
    initRelationshipGraph();
}

// ============================================
// CONFETTI CELEBRATION SYSTEM
// ============================================

/**
 * Canvas-based confetti animation for milestone celebrations
 * Triggers on major achievements, activity milestones, and special events
 */

let confettiCanvas = null;
let confettiCtx = null;
let confettiParticles = [];
let confettiAnimationId = null;
let celebrationSound = null;

// Confetti configuration
const CONFETTI_CONFIG = {
    particleCount: 150,
    spread: 70,
    startVelocity: 55,
    decay: 0.92,
    gravity: 1.2,
    ticks: 200,
    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4', '#00fa9a', '#ffd700'],
    shapes: ['square', 'circle']
};

/**
 * Initialize confetti canvas overlay
 */
function initConfettiCanvas() {
    if (confettiCanvas) return;
    
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.id = 'confetti-canvas';
    confettiCanvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
    `;
    document.body.appendChild(confettiCanvas);
    confettiCtx = confettiCanvas.getContext('2d');
    
    // Handle resize
    function resizeCanvas() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

/**
 * Create a confetti particle
 */
function createParticle(x, y, config = {}) {
    const angle = config.angle || (Math.random() * Math.PI * 2);
    const velocity = config.velocity || (CONFETTI_CONFIG.startVelocity * (0.5 + Math.random() * 0.5));
    
    return {
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity * (Math.random() * 0.5 + 0.5),
        vy: Math.sin(angle) * velocity * (Math.random() * 0.5 + 0.5) - velocity * 0.5,
        color: config.color || CONFETTI_CONFIG.colors[Math.floor(Math.random() * CONFETTI_CONFIG.colors.length)],
        shape: config.shape || CONFETTI_CONFIG.shapes[Math.floor(Math.random() * CONFETTI_CONFIG.shapes.length)],
        size: config.size || (5 + Math.random() * 10),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        life: CONFETTI_CONFIG.ticks,
        decay: CONFETTI_CONFIG.decay,
        gravity: CONFETTI_CONFIG.gravity
    };
}

/**
 * Update and draw confetti particles
 */
function updateConfetti() {
    if (!confettiCtx || confettiParticles.length === 0) {
        if (confettiAnimationId) {
            cancelAnimationFrame(confettiAnimationId);
            confettiAnimationId = null;
        }
        return;
    }
    
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    confettiParticles = confettiParticles.filter(p => {
        // Update physics
        p.vy += p.gravity * 0.1;
        p.vx *= p.decay;
        p.vy *= p.decay;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.life--;
        
        // Draw particle
        const alpha = Math.max(0, p.life / CONFETTI_CONFIG.ticks);
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rotation);
        confettiCtx.globalAlpha = alpha;
        confettiCtx.fillStyle = p.color;
        
        if (p.shape === 'circle') {
            confettiCtx.beginPath();
            confettiCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            confettiCtx.fill();
        } else {
            confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        
        confettiCtx.restore();
        
        // Keep particle if still alive and on screen
        return p.life > 0 && p.y < confettiCanvas.height + 100;
    });
    
    confettiAnimationId = requestAnimationFrame(updateConfetti);
}

/**
 * Fire confetti from a specific point
 * @param {number} x - X coordinate (defaults to center)
 * @param {number} y - Y coordinate (defaults to top)
 * @param {object} options - Optional configuration
 */
function fireConfetti(x = null, y = null, options = {}) {
    initConfettiCanvas();
    
    const centerX = x ?? confettiCanvas.width / 2;
    const centerY = y ?? confettiCanvas.height * 0.3;
    const count = options.particleCount || CONFETTI_CONFIG.particleCount;
    
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * (CONFETTI_CONFIG.spread / 180 * Math.PI);
        confettiParticles.push(createParticle(centerX, centerY, { angle, ...options }));
    }
    
    if (!confettiAnimationId) {
        updateConfetti();
    }
    
    // Play celebration sound if sounds are enabled
    if (soundEnabled && !options.silent) {
        playCelebrationSound(options.intensity || 'normal');
    }
}

/**
 * Fire confetti cannons from both sides
 */
function fireConfettiCannons() {
    initConfettiCanvas();
    
    // Left cannon
    for (let i = 0; i < 75; i++) {
        const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.5;
        confettiParticles.push(createParticle(0, confettiCanvas.height * 0.6, { angle, velocity: 70 }));
    }
    
    // Right cannon
    for (let i = 0; i < 75; i++) {
        const angle = Math.PI + Math.PI / 4 + (Math.random() - 0.5) * 0.5;
        confettiParticles.push(createParticle(confettiCanvas.width, confettiCanvas.height * 0.6, { angle, velocity: 70 }));
    }
    
    if (!confettiAnimationId) {
        updateConfetti();
    }
    
    if (soundEnabled) {
        playCelebrationSound('epic');
    }
}

/**
 * Celebration sound effects
 */
function playCelebrationSound(intensity = 'normal') {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        if (intensity === 'epic') {
            // Fanfare-like sound
            playNote(audioCtx, 523.25, 0, 0.15); // C5
            playNote(audioCtx, 659.25, 0.1, 0.15); // E5
            playNote(audioCtx, 783.99, 0.2, 0.15); // G5
            playNote(audioCtx, 1046.50, 0.3, 0.3); // C6
        } else {
            // Simple celebration chime
            playNote(audioCtx, 587.33, 0, 0.1); // D5
            playNote(audioCtx, 880, 0.08, 0.15); // A5
        }
    } catch (e) {
        console.warn('Could not play celebration sound:', e);
    }
}

function playNote(audioCtx, frequency, startTime, duration) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration);
    
    oscillator.start(audioCtx.currentTime + startTime);
    oscillator.stop(audioCtx.currentTime + startTime + duration);
}

/**
 * Celebration triggers for various milestones
 */
const MILESTONE_THRESHOLDS = [100, 200, 300, 500, 750, 1000, 1500, 2000];
let celebratedMilestones = JSON.parse(localStorage.getItem('pow_celebrated_milestones') || '[]');

/**
 * Check if a milestone should trigger celebration
 * @param {number} activityCount - Current activity count
 */
function checkMilestoneCelebration(activityCount) {
    for (const threshold of MILESTONE_THRESHOLDS) {
        if (activityCount >= threshold && !celebratedMilestones.includes(threshold)) {
            celebratedMilestones.push(threshold);
            localStorage.setItem('pow_celebrated_milestones', JSON.stringify(celebratedMilestones));
            triggerMilestoneCelebration(threshold, activityCount);
            break; // Only celebrate one at a time
        }
    }
}

/**
 * Trigger a full milestone celebration
 */
function triggerMilestoneCelebration(milestone, total) {
    // Show milestone toast
    showMilestoneToast(milestone, total);
    
    // Fire confetti based on milestone size
    if (milestone >= 1000) {
        fireConfettiCannons();
        setTimeout(() => fireConfetti(null, null, { particleCount: 200 }), 500);
    } else if (milestone >= 500) {
        fireConfettiCannons();
    } else {
        fireConfetti(null, null, { particleCount: Math.min(milestone, 200) });
    }
    
    announceToScreenReader(`Congratulations! You've reached ${milestone} activities!`);
}

/**
 * Show milestone toast notification
 */
function showMilestoneToast(milestone, total) {
    const toast = document.createElement('div');
    toast.className = 'milestone-toast';
    toast.innerHTML = `
        <div class="milestone-toast-content">
            <div class="milestone-toast-emoji">🎉</div>
            <div class="milestone-toast-text">
                <div class="milestone-toast-title">Milestone Reached!</div>
                <div class="milestone-toast-subtitle">${milestone} Activities Complete</div>
            </div>
            <button class="milestone-toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/**
 * Manual celebration trigger (for testing or special events)
 */
function celebrate(type = 'normal') {
    if (type === 'epic' || type === 'big') {
        fireConfettiCannons();
    } else {
        fireConfetti();
    }
}

// Expose celebrate function globally for console access
window.celebrate = celebrate;

// Check for milestone celebration when activities load
const originalRenderActivities = typeof renderActivities === 'function' ? renderActivities : null;
if (originalRenderActivities) {
    // Hook into activity rendering to check milestones
    const checkMilestoneHook = function() {
        const totalEl = document.getElementById('total-actions-value') || document.querySelector('[data-stat="total"]');
        if (totalEl) {
            const total = parseInt(totalEl.textContent) || 0;
            checkMilestoneCelebration(total);
        }
    };
    
    // Check on initial load
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(checkMilestoneHook, 2000);
    });
}

// ============================================
// ACTIVITY HEATMAP - GitHub-style contribution calendar
// ============================================

let heatmapYear = new Date().getFullYear();
let heatmapData = {};

/**
 * Render the activity heatmap for the current year
 */
function renderHeatmap(activities) {
    if (!activities || !activities.length) return;
    
    // Build activity counts by date
    heatmapData = {};
    activities.forEach(activity => {
        const date = new Date(activity.timestamp);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        heatmapData[dateStr] = (heatmapData[dateStr] || 0) + 1;
    });
    
    renderHeatmapGrid();
    renderHeatmapStats();
    renderHottestDays();
}

/**
 * Render the heatmap grid for the selected year
 */
function renderHeatmapGrid() {
    const grid = document.getElementById('heatmapGrid');
    const monthsRow = document.getElementById('heatmapMonths');
    if (!grid || !monthsRow) return;
    
    grid.innerHTML = '';
    monthsRow.innerHTML = '';
    
    // Update year display
    const yearEl = document.getElementById('heatmapYear');
    if (yearEl) yearEl.textContent = heatmapYear;
    
    // Disable next year button if viewing current year
    const nextBtn = document.getElementById('heatmapNextYear');
    if (nextBtn) {
        nextBtn.disabled = heatmapYear >= new Date().getFullYear();
    }
    
    // Get first day of year and calculate starting position
    const startDate = new Date(heatmapYear, 0, 1);
    const endDate = new Date(heatmapYear, 11, 31);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate first Sunday to start the grid
    const firstSunday = new Date(startDate);
    firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());
    
    // Track months for header
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let currentMonth = -1;
    let monthPositions = [];
    
    // Generate cells for each day
    const currentDate = new Date(firstSunday);
    let weekCount = 0;
    
    while (currentDate <= endDate || currentDate.getDay() !== 0) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const count = heatmapData[dateStr] || 0;
        const isFuture = currentDate > today;
        const isCurrentYear = currentDate.getFullYear() === heatmapYear;
        
        // Track month positions
        if (isCurrentYear && currentDate.getMonth() !== currentMonth && currentDate.getDay() === 0) {
            currentMonth = currentDate.getMonth();
            monthPositions.push({ month: months[currentMonth], week: weekCount });
        }
        
        // Create cell
        const cell = document.createElement('div');
        cell.className = `heatmap-cell level-${getHeatmapLevel(count)}`;
        if (isFuture) cell.classList.add('future');
        if (!isCurrentYear) cell.style.visibility = 'hidden';
        
        cell.dataset.date = dateStr;
        cell.dataset.count = count;
        
        // Tooltip events
        cell.addEventListener('mouseenter', showHeatmapTooltip);
        cell.addEventListener('mouseleave', hideHeatmapTooltip);
        cell.addEventListener('click', () => {
            if (!isFuture && count > 0) {
                // Filter activities to this day
                const searchInput = document.getElementById('activitySearch');
                if (searchInput) {
                    searchInput.value = dateStr;
                    applyFilters();
                    switchTab('timeline');
                }
            }
        });
        
        grid.appendChild(cell);
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate.getDay() === 0) weekCount++;
        
        // Safety limit
        if (weekCount > 60) break;
    }
    
    // Render month headers
    monthPositions.forEach((pos, i) => {
        const span = document.createElement('span');
        span.textContent = pos.month;
        span.style.marginLeft = i === 0 ? '0' : '';
        monthsRow.appendChild(span);
    });
}

/**
 * Get heatmap intensity level (0-4) based on count
 */
function getHeatmapLevel(count) {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 9) return 3;
    return 4;
}

/**
 * Show tooltip on hover
 */
function showHeatmapTooltip(e) {
    const cell = e.target;
    const tooltip = document.getElementById('heatmapTooltip');
    if (!tooltip) return;
    
    const date = new Date(cell.dataset.date);
    const count = parseInt(cell.dataset.count) || 0;
    
    document.getElementById('tooltipDate').textContent = date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    document.getElementById('tooltipCount').textContent = count === 0 ? 'No activities' : 
        `${count} activit${count === 1 ? 'y' : 'ies'}`;
    
    tooltip.style.display = 'flex';
    
    // Position tooltip
    const rect = cell.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
}

/**
 * Hide tooltip
 */
function hideHeatmapTooltip() {
    const tooltip = document.getElementById('heatmapTooltip');
    if (tooltip) tooltip.style.display = 'none';
}

/**
 * Render heatmap statistics
 */
function renderHeatmapStats() {
    // Calculate stats for the year
    let totalActivities = 0;
    let activeDays = 0;
    let maxCount = 0;
    let maxDate = null;
    
    // Current streak calculation
    let currentStreak = 0;
    const today = new Date();
    const checkDate = new Date(today);
    checkDate.setHours(0, 0, 0, 0);
    
    // Count backwards for streak
    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (heatmapData[dateStr] && heatmapData[dateStr] > 0) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
        // Safety limit
        if (currentStreak > 365) break;
    }
    
    // Calculate year totals
    const yearStart = `${heatmapYear}-01-01`;
    const yearEnd = `${heatmapYear}-12-31`;
    
    Object.entries(heatmapData).forEach(([date, count]) => {
        if (date >= yearStart && date <= yearEnd) {
            totalActivities += count;
            activeDays++;
            if (count > maxCount) {
                maxCount = count;
                maxDate = date;
            }
        }
    });
    
    // Update stats display
    const totalEl = document.getElementById('heatmapTotal');
    const daysEl = document.getElementById('heatmapDays');
    const streakEl = document.getElementById('heatmapStreak');
    const busiestEl = document.getElementById('heatmapBusiest');
    
    if (totalEl) totalEl.textContent = totalActivities.toLocaleString();
    if (daysEl) daysEl.textContent = activeDays;
    if (streakEl) streakEl.textContent = currentStreak;
    if (busiestEl && maxDate) {
        const busyDate = new Date(maxDate);
        busiestEl.textContent = busyDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

/**
 * Render hottest (most active) days
 */
function renderHottestDays() {
    const container = document.getElementById('hottestDaysList');
    if (!container) return;
    
    // Get top 8 days for the year
    const yearStart = `${heatmapYear}-01-01`;
    const yearEnd = `${heatmapYear}-12-31`;
    
    const sortedDays = Object.entries(heatmapData)
        .filter(([date]) => date >= yearStart && date <= yearEnd)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    if (sortedDays.length === 0) {
        container.innerHTML = '<p class="empty-state">No activities this year yet.</p>';
        return;
    }
    
    container.innerHTML = sortedDays.map(([date, count]) => {
        const dateObj = new Date(date);
        const formatted = dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        return `
            <div class="hottest-day-card" onclick="filterToDate('${date}')">
                <span class="hottest-day-date">${formatted}</span>
                <span class="hottest-day-count">${count} activities</span>
            </div>
        `;
    }).join('');
}

/**
 * Filter activities to a specific date and switch to timeline
 */
function filterToDate(dateStr) {
    const searchInput = document.getElementById('activitySearch');
    if (searchInput) {
        searchInput.value = dateStr;
        applyFilters();
        switchTab('timeline');
    }
}

/**
 * Change heatmap year
 */
function changeHeatmapYear(delta) {
    const newYear = heatmapYear + delta;
    const currentYear = new Date().getFullYear();
    
    // Don't allow future years
    if (newYear > currentYear) return;
    // Don't go too far back (reasonable limit)
    if (newYear < 2020) return;
    
    heatmapYear = newYear;
    
    if (window.cachedActivities) {
        renderHeatmapGrid();
        renderHeatmapStats();
        renderHottestDays();
    }
}

// Expose functions globally
window.renderHeatmap = renderHeatmap;
window.changeHeatmapYear = changeHeatmapYear;
window.filterToDate = filterToDate;

// ============================================
// WORD CLOUD VISUALIZATION
// ============================================

/**
 * Stop words to exclude from word cloud
 */
const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'can', 'will', 'just', 'should', 'now', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
    'did', 'doing', 'would', 'could', 'might', 'must', 'shall', 'this',
    'that', 'these', 'those', 'am', 'it', 'its', 'as', 'if', 'we', 'i',
    'my', 'me', 'you', 'your', 'he', 'she', 'they', 'them', 'what',
    'which', 'who', 'whom', 'also', 'any', 'both', 'etc', 'via', 'vs',
    'cycle', 'added', 'add', 'new', 'using', 'used', 'use', 'get', 'set'
]);

/**
 * Extract words from activity descriptions
 */
function extractWords(activities, typeFilter = 'all') {
    const wordCounts = {};
    
    activities.forEach(activity => {
        // Apply type filter
        if (typeFilter !== 'all' && activity.type !== typeFilter) return;
        
        const text = activity.description || '';
        // Extract words (letters, numbers, hyphens only)
        const words = text.toLowerCase()
            .replace(/[^\w\s-]/g, ' ')
            .split(/\s+/)
            .filter(word => {
                return word.length > 2 && 
                       !stopWords.has(word) && 
                       !/^\d+$/.test(word); // Exclude pure numbers
            });
        
        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
    });
    
    // Convert to array and sort by count
    return Object.entries(wordCounts)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Render the word cloud using D3
 */
function renderWordCloud(activities) {
    const container = document.getElementById('wordcloudContainer');
    const svg = document.getElementById('wordcloudSvg');
    const loading = document.getElementById('wordcloud-loading');
    
    if (!container || !svg) return;
    
    // Show loading
    if (loading) loading.style.display = 'flex';
    
    // Get filter value
    const typeFilter = document.getElementById('wordcloudType')?.value || 'all';
    
    // Extract words
    const wordData = extractWords(activities, typeFilter);
    
    // Take top 100 words for the cloud
    const topWords = wordData.slice(0, 100);
    
    // Update stats
    const totalWords = wordData.reduce((sum, w) => sum + w.count, 0);
    const totalEl = document.getElementById('wordcloudTotal');
    const uniqueEl = document.getElementById('wordcloudUnique');
    const topWordEl = document.getElementById('wordcloudTopWord');
    
    if (totalEl) totalEl.textContent = totalWords.toLocaleString();
    if (uniqueEl) uniqueEl.textContent = wordData.length.toLocaleString();
    if (topWordEl && topWords[0]) topWordEl.textContent = topWords[0].word;
    
    // Render top 10 list
    renderWordCloudList(topWords.slice(0, 10));
    
    // Clear existing SVG content
    svg.innerHTML = '';
    
    if (topWords.length === 0) {
        if (loading) loading.style.display = 'none';
        svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="var(--text-secondary)">No words to display</text>';
        return;
    }
    
    // Get dimensions
    const width = container.clientWidth || 600;
    const height = 400;
    
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    
    // Calculate font sizes (scale based on frequency)
    const maxCount = topWords[0].count;
    const minCount = topWords[topWords.length - 1].count;
    const fontScale = (count) => {
        const normalized = (count - minCount) / (maxCount - minCount || 1);
        return Math.floor(14 + normalized * 40); // 14px to 54px
    };
    
    // Get theme-aware colors
    const colors = getWordCloudColors();
    
    // Simple spiral layout algorithm
    const words = [];
    const centerX = width / 2;
    const centerY = height / 2;
    
    topWords.forEach((item, index) => {
        const fontSize = fontScale(item.count);
        const color = colors[index % colors.length];
        
        // Spiral placement
        const angle = index * 0.5;
        const radius = 8 * Math.sqrt(index);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        words.push({
            text: item.word,
            count: item.count,
            fontSize,
            color,
            x: Math.max(fontSize, Math.min(width - fontSize * 3, x)),
            y: Math.max(fontSize, Math.min(height - fontSize, y)),
            rotation: (Math.random() > 0.7) ? (Math.random() > 0.5 ? 90 : -90) : 0
        });
    });
    
    // Create D3 selection
    const svgSelection = d3.select(svg);
    
    // Add words with animation
    svgSelection.selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .attr('class', 'wordcloud-word')
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .attr('font-size', 0)
        .attr('fill', d => d.color)
        .attr('text-anchor', 'middle')
        .attr('transform', d => `rotate(${d.rotation}, ${d.x}, ${d.y})`)
        .attr('cursor', 'pointer')
        .text(d => d.text)
        .on('click', function(event, d) {
            // Filter activities by clicking on a word
            const searchInput = document.getElementById('activitySearch');
            if (searchInput) {
                searchInput.value = d.text;
                applyFilters();
                switchTab('timeline');
            }
        })
        .on('mouseenter', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('font-size', d.fontSize * 1.2);
            
            // Show tooltip
            showWordCloudTooltip(event, d);
        })
        .on('mouseleave', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('font-size', d.fontSize);
            
            hideWordCloudTooltip();
        })
        .transition()
        .duration(500)
        .delay((d, i) => i * 20)
        .attr('font-size', d => d.fontSize);
    
    // Hide loading
    if (loading) loading.style.display = 'none';
}

/**
 * Get theme-aware colors for the word cloud
 */
function getWordCloudColors() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    
    const colorSchemes = {
        dark: ['#00ffaa', '#14f195', '#9945ff', '#00d4ff', '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'],
        light: ['#059669', '#0891b2', '#7c3aed', '#dc2626', '#ea580c', '#0284c7', '#4f46e5', '#be185d'],
        ocean: ['#00b4d8', '#0077b6', '#48cae4', '#90e0ef', '#023e8a', '#03045e', '#00a8e8', '#007ea7'],
        forest: ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#1b4332', '#081c15', '#b7e4c7'],
        sunset: ['#ff6b35', '#f7931e', '#ffb347', '#ff7f50', '#ff6347', '#ffa07a', '#e25822', '#ff4500'],
        cyberpunk: ['#ff00ff', '#00ffff', '#ff1493', '#9400d3', '#7b68ee', '#da70d6', '#ff69b4', '#ba55d3']
    };
    
    return colorSchemes[theme] || colorSchemes.dark;
}

/**
 * Render the top words list
 */
function renderWordCloudList(topWords) {
    const container = document.getElementById('wordcloudTopList');
    if (!container) return;
    
    if (topWords.length === 0) {
        container.innerHTML = '<p class="empty-state">No words found.</p>';
        return;
    }
    
    const maxCount = topWords[0].count;
    const colors = getWordCloudColors();
    
    container.innerHTML = topWords.map((item, index) => {
        const percentage = Math.round((item.count / maxCount) * 100);
        const color = colors[index % colors.length];
        return `
            <div class="wordcloud-list-item" onclick="filterByWord('${item.word}')">
                <span class="wordcloud-rank">${index + 1}</span>
                <span class="wordcloud-word-text" style="color: ${color}">${item.word}</span>
                <span class="wordcloud-count">${item.count}</span>
                <div class="wordcloud-bar" style="width: ${percentage}%; background: ${color}"></div>
            </div>
        `;
    }).join('');
}

/**
 * Filter activities by word
 */
function filterByWord(word) {
    const searchInput = document.getElementById('activitySearch');
    if (searchInput) {
        searchInput.value = word;
        applyFilters();
        switchTab('timeline');
    }
}

let wordcloudTooltip = null;

/**
 * Show tooltip for word
 */
function showWordCloudTooltip(event, data) {
    if (!wordcloudTooltip) {
        wordcloudTooltip = document.createElement('div');
        wordcloudTooltip.className = 'wordcloud-tooltip';
        document.body.appendChild(wordcloudTooltip);
    }
    
    wordcloudTooltip.innerHTML = `
        <strong>${data.text}</strong><br>
        <span>Appears ${data.count} time${data.count !== 1 ? 's' : ''}</span>
    `;
    wordcloudTooltip.style.display = 'block';
    
    const x = event.pageX + 10;
    const y = event.pageY - 30;
    
    wordcloudTooltip.style.left = `${x}px`;
    wordcloudTooltip.style.top = `${y}px`;
}

/**
 * Hide word cloud tooltip
 */
function hideWordCloudTooltip() {
    if (wordcloudTooltip) {
        wordcloudTooltip.style.display = 'none';
    }
}

// Expose word cloud functions globally
window.renderWordCloud = renderWordCloud;
window.filterByWord = filterByWord;

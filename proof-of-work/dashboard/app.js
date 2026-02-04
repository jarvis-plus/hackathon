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
// MULTI-THEME SUPPORT (Dark, Light, Ocean, Forest, Sunset, Cyberpunk)
// ============================================
const AVAILABLE_THEMES = ['dark', 'light', 'ocean', 'forest', 'sunset', 'cyberpunk'];
const THEME_EMOJIS = {
    dark: '🌙',
    light: '☀️',
    ocean: '🌊',
    forest: '🌲',
    sunset: '🌅',
    cyberpunk: '🔮'
};

function getPreferredTheme() {
    const stored = localStorage.getItem('jarvis-pow-theme');
    if (stored && AVAILABLE_THEMES.includes(stored)) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function setTheme(theme) {
    if (!AVAILABLE_THEMES.includes(theme)) theme = 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jarvis-pow-theme', theme);
    updateThemeButton(theme);
    updateThemeDropdownSelection(theme);
    closeThemeDropdown();
}

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
        performance: document.getElementById('performance-feed')
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
        
        const ariaLabel = `${bookmarked ? 'Bookmarked ' : ''}${isPinned ? 'Pinned ' : ''}${a.type} activity: ${escapeHtml(a.description.substring(0, 80))}${a.description.length > 80 ? '...' : ''}`;
        const notesHtml = renderActivityNotes(a, hash);
        const pinButtonHtml = renderPinButton(hash, isPinned);
        const bookmarkButtonHtml = renderBookmarkButton(hash);
        
        const compareButtonHtml = renderCompareButton(hash);
        
        return `
        <div class="activity-item ${a.type}${isNew ? ' new-activity' : ''}${isPinned ? ' pinned' : ''}${bookmarked ? ' bookmarked' : ''}" 
             style="animation-delay: ${i * 0.04}s" 
             data-wallet="${a.wallet || ''}" 
             data-activity-id="${activityId}"
             data-hash="${hash || ''}"
             data-pinned="${isPinned}"
             data-bookmarked="${bookmarked}"
             tabindex="0"
             role="article"
             aria-label="${ariaLabel}">
            ${renderShareButton(activityId, hash)}
            ${renderCompareButton(hash)}
            ${bookmarkButtonHtml}
            ${pinButtonHtml}
            <div class="activity-header">
                <div class="activity-badges">
                    ${isPinned ? '<span class="pinned-badge" title="Pinned activity">📌</span>' : ''}
                    ${bookmarked ? '<span class="bookmarked-badge" title="Bookmarked">⭐</span>' : ''}
                    <span class="activity-type">${a.type}</span>
                    ${getProofBadge(a)}
                    ${walletHtml}
                </div>
                <div class="activity-time">${formatTime(a.timestamp)}</div>
            </div>
            <div class="activity-desc">${escapeHtml(a.description)}</div>
            ${tagsHtml}
            ${notesHtml}
            ${hashDisplay ? `<div class="activity-hash">${hashDisplay}</div>` : ''}
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

// Initialize stat cards from skeleton state with entry animations
function initializeStatCards() {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;
    
    // Replace skeleton cards with real stat cards (with icons and entry animation)
    statsGrid.innerHTML = `
        <div class="stat-card animate-entry">
            <div class="stat-icon icon-total">⚡</div>
            <div class="stat-value" id="total-actions">0</div>
            <div class="stat-label">Total Actions</div>
        </div>
        <div class="stat-card animate-entry" id="card-onchain">
            <div class="stat-icon icon-chain">⛓️</div>
            <div class="stat-value chain" id="onchain">0</div>
            <div class="stat-label">On-Chain</div>
        </div>
        <div class="stat-card animate-entry">
            <div class="stat-icon icon-commits">📝</div>
            <div class="stat-value commits" id="commits">0</div>
            <div class="stat-label">Commits</div>
        </div>
        <div class="stat-card animate-entry">
            <div class="stat-icon icon-builds">🔧</div>
            <div class="stat-value builds" id="builds">0</div>
            <div class="stat-label">Builds</div>
        </div>
        <div class="stat-card animate-entry">
            <div class="stat-icon icon-trades">💱</div>
            <div class="stat-value trades" id="trades">0</div>
            <div class="stat-label">Trades</div>
        </div>
        <div class="stat-card animate-entry">
            <div class="stat-icon icon-messages">💬</div>
            <div class="stat-value messages" id="messages">0</div>
            <div class="stat-label">Messages</div>
        </div>
        <div class="stat-card animate-entry">
            <div class="stat-icon icon-tweets">🐦</div>
            <div class="stat-value tweets" id="tweets">0</div>
            <div class="stat-label">Tweets</div>
        </div>
        <div class="stat-card animate-entry">
            <div class="stat-icon icon-uptime">⏱️</div>
            <div class="stat-value uptime" id="uptime">0h</div>
            <div class="stat-label">Uptime</div>
        </div>
        <div class="stat-card animate-entry">
            <div class="stat-icon icon-volume">💰</div>
            <div class="stat-value volume" id="volume">$0</div>
            <div class="stat-label">Trade Volume</div>
        </div>
        <div class="stat-card animate-entry" id="streak-card">
            <div class="stat-icon icon-streak">🔥</div>
            <div class="stat-value streak" id="streak"><span class="streak-fire">🔥</span>0</div>
            <div class="stat-label">Day Streak</div>
        </div>
        <div class="stat-card animate-entry" id="mood-card">
            <div class="stat-icon icon-mood">🧠</div>
            <div class="stat-value mood" id="mood">🤖</div>
            <div class="stat-label">Agent Mood</div>
        </div>
        <div class="stat-card animate-entry" id="sol-position-card">
            <div class="stat-icon icon-sol">◎</div>
            <div class="stat-value sol-position" id="sol-position">0 SOL</div>
            <div class="stat-label">Net SOL</div>
        </div>
    `;
    
    // Remove entry animation class after animations complete to allow hover effects
    setTimeout(() => {
        statsGrid.querySelectorAll('.stat-card.animate-entry').forEach(card => {
            card.classList.remove('animate-entry');
        });
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
let currentDateFrom = null; // null means no start date filter
let currentDateTo = null; // null means no end date filter
let availableTags = new Set();

// Default wallet for signing (matches first wallet in KNOWN_WALLETS above)
const DEFAULT_WALLET = 'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX';

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
    
    // Apply search filter
    if (currentSearchQuery) {
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
    
    // Apply bookmark filter
    if (window.bookmarkFilterActive) {
        const bookmarks = getBookmarks();
        filtered = filtered.filter(a => {
            const hash = a.hash || a.proof?.hash;
            return hash && bookmarks.has(hash);
        });
    }
    
    // Update filter stats
    const statsEl = document.getElementById('filterStats');
    if (statsEl) {
        const hasDateFilter = currentDateFrom || currentDateTo;
        const isFiltered = currentTypeFilter !== 'all' || currentSearchQuery || currentTagFilter || currentWalletFilter || hasDateFilter || window.bookmarkFilterActive;
        if (isFiltered) {
            const filterParts = [];
            if (window.bookmarkFilterActive) filterParts.push('⭐ bookmarked');
            if (currentTypeFilter !== 'all') filterParts.push(`type: ${currentTypeFilter}`);
            if (currentTagFilter) filterParts.push(`tag: ${currentTagFilter}`);
            if (currentWalletFilter) filterParts.push(`wallet: ${getWalletName(currentWalletFilter)}`);
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
        const hasFilters = currentTypeFilter !== 'all' || currentSearchQuery || currentTagFilter || currentWalletFilter || hasDateFilter;
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
            
            html += `
                <div class="activity-item ${a.type}" 
                     style="animation-delay: ${Math.min(dayIndex, 5) * 0.04}s" 
                     data-activity-id="${activityId}"
                     tabindex="0"
                     role="article"
                     aria-label="${a.type} activity: ${escapeHtml(a.description.substring(0, 80))}${a.description.length > 80 ? '...' : ''}">
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
                    ${hashDisplay ? `<div class="activity-hash">${hashDisplay}</div>` : ''}
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
    
    // Apply search filter
    if (currentSearchQuery) {
        const query = currentSearchQuery.toLowerCase();
        filtered = filtered.filter(a => 
            (a.description && a.description.toLowerCase().includes(query)) ||
            (a.type && a.type.toLowerCase().includes(query)) ||
            (a.hash && a.hash.toLowerCase().includes(query))
        );
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
            
            html += `
                <div class="activity-item ${a.type}${isNew ? ' new-activity' : ''}" 
                     style="animation-delay: ${Math.min(dayIndex, 5) * 0.04}s" 
                     data-wallet="${a.wallet || ''}" 
                     data-activity-id="${activityId}" tabindex="0" role="article" aria-label="${ariaLabel}">
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
                    ${hashDisplay ? `<div class="activity-hash">${hashDisplay}</div>` : ''}
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
            
            html += `
                <div class="activity-item ${a.type}${isNew ? ' new-activity' : ''}" 
                     style="animation-delay: ${Math.min(dayIndex, 5) * 0.04}s" 
                     data-wallet="${a.wallet || ''}" 
                     data-activity-id="${activityId}" tabindex="0" role="article" aria-label="${ariaLabel}">
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
                    ${hashDisplay ? `<div class="activity-hash">${hashDisplay}</div>` : ''}
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
    'r': { action: 'resetFilters', description: 'Reset all filters' },
    'e': { action: 'exportJSON', description: 'Export as JSON' },
    'E': { action: 'exportCSV', description: 'Export as CSV' },
    'l': { action: 'loadMore', description: 'Load more activities' },
    'b': { action: 'toggleBookmarkFilter', description: 'Toggle bookmark filter' },
    'B': { action: 'bookmarkFocused', description: 'Bookmark focused activity' },
    'z': { action: 'toggleFocusMode', description: 'Toggle focus mode' },
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
                    <h4>View</h4>
                    <div class="shortcut-row"><kbd>z</kbd> Toggle focus mode</div>
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
    }
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
    
    // Search & Filter
    { id: 'search', title: 'Search Activities', description: 'Focus the search input', icon: '🔍', shortcut: '/', action: () => focusSearchInput(), group: 'Search & Filter' },
    { id: 'reset-filters', title: 'Reset All Filters', description: 'Clear all active filters', icon: '🔄', shortcut: 'R', action: () => resetFilters(), group: 'Search & Filter' },
    { id: 'filter-bookmarks', title: 'Toggle Bookmarks Filter', description: 'Show only bookmarked items', icon: '⭐', shortcut: 'B', action: () => toggleBookmarkFilter(), group: 'Search & Filter' },
    { id: 'filter-build', title: 'Filter: Build', description: 'Show only build activities', icon: '🔨', action: () => { setTypeFilter('build'); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'filter-commit', title: 'Filter: Commits', description: 'Show only commit activities', icon: '📝', action: () => { setTypeFilter('commit'); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'filter-trade', title: 'Filter: Trades', description: 'Show only trade activities', icon: '💰', action: () => { setTypeFilter('trade'); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'filter-tweet', title: 'Filter: Tweets', description: 'Show only tweet activities', icon: '🐦', action: () => { setTypeFilter('tweet'); hideCommandPalette(); }, group: 'Search & Filter' },
    { id: 'filter-message', title: 'Filter: Messages', description: 'Show only message activities', icon: '💬', action: () => { setTypeFilter('message'); hideCommandPalette(); }, group: 'Search & Filter' },
    
    // Export
    { id: 'export-json', title: 'Export as JSON', description: 'Download activities as JSON file', icon: '📄', shortcut: 'E', action: () => exportActivities('json'), group: 'Export' },
    { id: 'export-csv', title: 'Export as CSV', description: 'Download activities as CSV file', icon: '📊', shortcut: '⇧E', action: () => exportActivities('csv'), group: 'Export' },
    
    // Settings
    { id: 'theme-dark', title: 'Theme: Dark', description: 'Switch to dark theme', icon: '🌙', action: () => { setTheme('dark'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'theme-light', title: 'Theme: Light', description: 'Switch to light theme', icon: '☀️', action: () => { setTheme('light'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'theme-ocean', title: 'Theme: Ocean', description: 'Switch to ocean theme', icon: '🌊', action: () => { setTheme('ocean'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'theme-forest', title: 'Theme: Forest', description: 'Switch to forest theme', icon: '🌲', action: () => { setTheme('forest'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'theme-sunset', title: 'Theme: Sunset', description: 'Switch to sunset theme', icon: '🌅', action: () => { setTheme('sunset'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'theme-cyberpunk', title: 'Theme: Cyberpunk', description: 'Switch to cyberpunk theme', icon: '🔮', action: () => { setTheme('cyberpunk'); hideCommandPalette(); }, group: 'Settings' },
    { id: 'toggle-sound', title: 'Toggle Sound', description: 'Turn notification sounds on/off', icon: '🔔', action: () => { toggleSound(); hideCommandPalette(); }, group: 'Settings' },
    { id: 'toggle-notifs', title: 'Toggle Browser Notifications', description: 'Enable/disable browser notifications', icon: '🔕', action: () => { toggleNotifications(); hideCommandPalette(); }, group: 'Settings' },
    
    // Actions
    { id: 'load-more', title: 'Load More Activities', description: 'Load additional activities', icon: '⬇️', shortcut: 'L', action: () => loadMoreActivities(), group: 'Actions' },
    { id: 'scroll-top', title: 'Scroll to Top', description: 'Jump to top of page', icon: '⬆️', shortcut: 'T', action: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); hideCommandPalette(); }, group: 'Actions' },
    { id: 'refresh', title: 'Refresh Data', description: 'Reload activity data', icon: '🔃', action: () => { fetchActivities(); hideCommandPalette(); }, group: 'Actions' },
    
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
                    <h4>View</h4>
                    <div class="shortcut-row"><kbd>z</kbd> Toggle focus mode</div>
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

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
// THEME TOGGLE (Dark/Light Mode)
// ============================================
function getPreferredTheme() {
    const stored = localStorage.getItem('jarvis-pow-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jarvis-pow-theme', theme);
    updateThemeButton(theme);
}

function updateThemeButton(theme) {
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.textContent = theme === 'dark' ? '🌙 Dark' : '☀️ Light';
        btn.setAttribute('aria-pressed', theme === 'dark');
        btn.setAttribute('aria-label', `Dark mode: ${theme === 'dark' ? 'On' : 'Off'}`);
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}

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
        verify: document.getElementById('verify-feed')
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
    
    const sorted = [...activities].reverse();
    const newCount = sorted.length - lastRenderedCount;
    const shouldHighlight = highlightNew && newCount > 0;
    
    feed.classList.add('refreshing');
    
    feed.innerHTML = sorted.map((a, i) => {
        const hash = a.hash || a.proof?.hash;
        const hashDisplay = hash ? `SHA256: ${hash.slice(0, 12)}...${hash.slice(-6)}` : '';
        const isNew = shouldHighlight && i < newCount;
        const tagsHtml = renderActivityTags(a.tags);
        const walletHtml = renderWalletBadge(a.wallet);
        const activityId = getActivityId(a);
        
        return `
        <div class="activity-item ${a.type}${isNew ? ' new-activity' : ''}" style="animation-delay: ${i * 0.04}s" data-wallet="${a.wallet || ''}" data-activity-id="${activityId}">
            ${renderShareButton(activityId)}
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
function animateNumber(element, targetValue, duration = 600, prefix = '', suffix = '') {
    if (!element) return;
    
    const startValue = parseInt(element.dataset.currentValue || '0', 10);
    const target = parseInt(targetValue, 10);
    
    // Skip animation if value unchanged
    if (startValue === target) return;
    
    element.dataset.currentValue = target;
    
    // Add pop animation class
    element.classList.add('updated');
    setTimeout(() => element.classList.remove('updated'), 400);
    
    // If difference is small, just set it
    if (Math.abs(target - startValue) <= 2) {
        element.textContent = prefix + target + suffix;
        return;
    }
    
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
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// Animate decimal numbers (for volume, etc.)
function animateDecimal(element, targetValue, duration = 600, prefix = '', suffix = '', decimals = 2) {
    if (!element) return;
    
    const startValue = parseFloat(element.dataset.currentValue || '0');
    const target = parseFloat(targetValue);
    
    if (Math.abs(startValue - target) < 0.001) return;
    
    element.dataset.currentValue = target;
    element.classList.add('updated');
    setTimeout(() => element.classList.remove('updated'), 400);
    
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
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// Initialize stat cards from skeleton state
function initializeStatCards() {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;
    
    // Replace skeleton cards with real stat cards (with icons)
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon icon-total">⚡</div>
            <div class="stat-value" id="total-actions">0</div>
            <div class="stat-label">Total Actions</div>
        </div>
        <div class="stat-card" id="card-onchain">
            <div class="stat-icon icon-chain">⛓️</div>
            <div class="stat-value chain" id="onchain">0</div>
            <div class="stat-label">On-Chain</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon icon-commits">📝</div>
            <div class="stat-value commits" id="commits">0</div>
            <div class="stat-label">Commits</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon icon-builds">🔧</div>
            <div class="stat-value builds" id="builds">0</div>
            <div class="stat-label">Builds</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon icon-trades">💱</div>
            <div class="stat-value trades" id="trades">0</div>
            <div class="stat-label">Trades</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon icon-messages">💬</div>
            <div class="stat-value messages" id="messages">0</div>
            <div class="stat-label">Messages</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon icon-tweets">🐦</div>
            <div class="stat-value tweets" id="tweets">0</div>
            <div class="stat-label">Tweets</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon icon-uptime">⏱️</div>
            <div class="stat-value uptime" id="uptime">0h</div>
            <div class="stat-label">Uptime</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon icon-volume">💰</div>
            <div class="stat-value volume" id="volume">$0</div>
            <div class="stat-label">Trade Volume</div>
        </div>
        <div class="stat-card" id="streak-card">
            <div class="stat-icon icon-streak">🔥</div>
            <div class="stat-value streak" id="streak"><span class="streak-fire">🔥</span>0</div>
            <div class="stat-label">Day Streak</div>
        </div>
        <div class="stat-card" id="mood-card">
            <div class="stat-icon icon-mood">🧠</div>
            <div class="stat-value mood" id="mood">🤖</div>
            <div class="stat-label">Agent Mood</div>
        </div>
        <div class="stat-card" id="sol-position-card">
            <div class="stat-icon icon-sol">◎</div>
            <div class="stat-value sol-position" id="sol-position">0 SOL</div>
            <div class="stat-label">Net SOL</div>
        </div>
    `;
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
    
    // Animate stat number updates
    animateNumber(document.getElementById('total-actions'), activities.length);
    animateNumber(document.getElementById('onchain'), activities.filter(a => 
        a.signature || a.proof?.txSignature
    ).length);
    animateNumber(document.getElementById('commits'), activities.filter(a => a.type === 'commit').length);
    animateNumber(document.getElementById('builds'), activities.filter(a => 
        a.type === 'build' || a.type === 'deploy' || a.type === 'decision'
    ).length);
    animateNumber(document.getElementById('trades'), activities.filter(a => 
        a.type === 'trade' || a.type === 'transfer'
    ).length);
    animateNumber(document.getElementById('messages'), activities.filter(a => 
        a.type === 'message'
    ).length);
    animateNumber(document.getElementById('tweets'), activities.filter(a => 
        a.type === 'tweet'
    ).length);
    
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
    // Hide all chart loading states
    const hideLoading = (id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
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
}

// Render GitHub-style activity heatmap
function renderHeatmap(activities) {
    const grid = document.getElementById('heatmapGrid');
    const monthsContainer = document.getElementById('heatmapMonths');
    if (!grid || !monthsContainer) return;
    
    // Hide loading state
    const heatmapLoading = document.getElementById('heatmap-loading');
    if (heatmapLoading) heatmapLoading.style.display = 'none';
    
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
        cell.title = `${currentDate.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        })}: ${count} action${count !== 1 ? 's' : ''}`;
        
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
        populateTagFilters(activities);
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
            populateTagFilters(activities);
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
                    populateTagFilters(msg.data.activities);
                    
                    // Flash notification + sound for new activities
                    if (isNewActivity) {
                        flashNewActivity(msg.data.newItems.length, msg.data.newItems);
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
    } else {
        playNotificationSound('new');
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
    
    // Update filter stats
    const statsEl = document.getElementById('filterStats');
    if (statsEl) {
        const hasDateFilter = currentDateFrom || currentDateTo;
        const isFiltered = currentTypeFilter !== 'all' || currentSearchQuery || currentTagFilter || currentWalletFilter || hasDateFilter;
        if (isFiltered) {
            const filterParts = [];
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
            <div class="day-group ${isCollapsed ? 'collapsed' : ''}" data-date="${dateKey}">
                <div class="day-header" onclick="toggleDayGroup('${dateKey}')">
                    <div class="day-header-left">
                        <span class="day-toggle">${isCollapsed ? '▶' : '▼'}</span>
                        <span class="day-label">${dayLabel}</span>
                    </div>
                    <div class="day-header-right">
                        <span class="day-count">${dayActivities.length} activit${dayActivities.length === 1 ? 'y' : 'ies'}</span>
                        ${onChainCount > 0 ? `<span class="day-onchain">⛓️ ${onChainCount}</span>` : ''}
                    </div>
                </div>
                <div class="day-activities">
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
                     data-activity-id="${activityId}">
                    ${renderShareButton(activityId)}
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
    
    if (isCollapsed) {
        collapsedDays.delete(dateKey);
        dayGroup.classList.remove('collapsed');
    } else {
        collapsedDays.add(dateKey);
        dayGroup.classList.add('collapsed');
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
            <div class="day-group ${isCollapsed ? 'collapsed' : ''}" data-date="${dateKey}">
                <div class="day-header" onclick="toggleDayGroup('${dateKey}')">
                    <div class="day-header-left">
                        <span class="day-toggle">${isCollapsed ? '▶' : '▼'}</span>
                        <span class="day-label">${dayLabel}</span>
                    </div>
                    <div class="day-header-right">
                        <span class="day-count">${dayActivities.length} activit${dayActivities.length === 1 ? 'y' : 'ies'}</span>
                        ${onChainCount > 0 ? `<span class="day-onchain">⛓️ ${onChainCount}</span>` : ''}
                    </div>
                </div>
                <div class="day-activities">
        `;
        
        dayActivities.forEach((a, dayIndex) => {
            const hash = a.hash || a.proof?.hash;
            const hashDisplay = hash ? `SHA256: ${hash.slice(0, 12)}...${hash.slice(-6)}` : '';
            const isNew = shouldHighlight && itemIndex < newCount;
            const tagsHtml = renderActivityTags(a.tags);
            const walletHtml = renderWalletBadge(a.wallet);
            const activityId = getActivityId(a);
            
            html += `
                <div class="activity-item ${a.type}${isNew ? ' new-activity' : ''}" 
                     style="animation-delay: ${Math.min(dayIndex, 5) * 0.04}s" 
                     data-wallet="${a.wallet || ''}" 
                     data-activity-id="${activityId}">
                    ${renderShareButton(activityId)}
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
    
    // If filters are active, use filtered rendering
    if (currentTypeFilter !== 'all' || currentSearchQuery || currentTagFilter || currentWalletFilter || currentDateFrom || currentDateTo) {
        renderFilteredActivities(activities);
    } else {
        // Use day-grouped rendering
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
        feed.innerHTML = renderGroupedActivities(activities, highlightNew);
        lastRenderedCount = activities.length;
        setTimeout(() => feed.classList.remove('refreshing'), 500);
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
                    <h4>Export</h4>
                    <div class="shortcut-row"><kbd>e</kbd> Export as JSON</div>
                    <div class="shortcut-row"><kbd>Shift+e</kbd> Export as CSV</div>
                </div>
                <div class="shortcut-section">
                    <h4>Help</h4>
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
        if (shortcutsModalOpen) {
            hideShortcutsModal();
        } else {
            const searchInput = document.getElementById('activitySearch');
            if (document.activeElement === searchInput) {
                searchInput.blur();
                clearSearch();
            }
        }
    } else if (action === 'resetFilters') {
        resetFilters();
    } else if (action === 'showShortcuts') {
        showShortcutsModal();
    } else if (action === 'exportJSON') {
        exportActivities('json');
    } else if (action === 'exportCSV') {
        exportActivities('csv');
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
 */
function getActivityUrl(activityId) {
    const url = new URL(window.location.href);
    url.hash = `activity-${activityId}`;
    return url.toString();
}

/**
 * Copy activity link to clipboard and show feedback
 */
function copyActivityLink(activityId, buttonElement) {
    const url = getActivityUrl(activityId);
    
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
    if (isError) {
        toast.style.background = 'var(--accent-red)';
        toast.style.color = '#fff';
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
function renderShareButton(activityId) {
    return `<button class="activity-share-btn" 
                    onclick="event.stopPropagation(); copyActivityLink('${activityId}', this);" 
                    title="Copy link to this activity">
        🔗
    </button>`;
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
                    <h4>Export</h4>
                    <div class="shortcut-row"><kbd>e</kbd> Export as JSON</div>
                    <div class="shortcut-row"><kbd>Shift+e</kbd> Export as CSV</div>
                </div>
                <div class="shortcut-section">
                    <h4>Help</h4>
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
 * Initialize all accessibility features
 */
function initAccessibility() {
    initTabKeyboardNav();
    
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

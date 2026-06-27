/* ==========================================================================
   FocusFlow - Main Application Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
        // Cleanup Phase 4 upgrade localStorage keys
        localStorage.removeItem('focusflow-category-data');
        localStorage.removeItem('focusflow-density-data');
        localStorage.removeItem('focusflow-active-task-id');
        localStorage.removeItem('focusflow-ai-plans-library');
    
    // 0. Initialize Database defaults
    initDatabase();

    // 1. Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 2. Set Up Dynamic Greeting
    updateGreeting();

    // 3. Navigation View Switcher
    initNavigation();

    // 4. Dark/Light Theme Controller
    initTheme();



    // 6. Initialize Settings Panel
    initSettings();
});

/**
 * Updates the welcome greeting message based on the hour of the day.
 */
function updateGreeting() {
    const greetingTitle = document.getElementById('greeting-title');
    const greetingSubtitle = document.getElementById('greeting-subtitle');
    
    if (!greetingTitle) return;

    const username = localStorage.getItem('focusflow-username') || 'Student';
    const hour = new Date().getHours();
    let greeting = 'Good Day';
    let subtitle = 'Stay focused and make today productive.';

    if (hour >= 5 && hour < 12) {
        greeting = `Good Morning, ${username}! 👋`;
        subtitle = 'Start your morning with a fresh focus session.';
    } else if (hour >= 12 && hour < 17) {
        greeting = `Good Afternoon, ${username}! ☀️`;
        subtitle = 'Keep up the momentum and tackle your tasks.';
    } else if (hour >= 17 && hour < 22) {
        greeting = `Good Evening, ${username}! 🌅`;
        subtitle = 'Reflect on your progress and stay consistent.';
    } else {
        greeting = `Good Night, ${username}! 🌙`;
        subtitle = 'Wind down or wrap up your final tasks of the day.';
    }

    greetingTitle.textContent = greeting;
    if (greetingSubtitle) {
        greetingSubtitle.textContent = subtitle;
    }
}

/**
 * Handles sidebar tab navigation clicks and toggles visible view panels.
 */
/**
 * Handles sidebar tab navigation clicks, toggles view panels, and manages sliding indicator.
 */
function initNavigation() {
    const nav = document.querySelector('.sidebar-nav');
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const viewPanels = document.querySelectorAll('.view-panel');
    
    if (!nav) return;

    // Create indicator if not present
    let indicator = nav.querySelector('.nav-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'nav-indicator';
        nav.appendChild(indicator);
    }

    // Determine initial view based on URL hash or localStorage
    let initialView = 'dashboard';
    let hash = window.location.hash.replace('#', '');
    if (hash === 'statistics') hash = 'analytics';
    let savedView = localStorage.getItem('focusflow-active-view');
    if (savedView === 'statistics') savedView = 'analytics';
    const validViews = Array.from(navItems).map(item => item.getAttribute('data-view'));

    if (validViews.includes(hash)) {
        initialView = hash;
    } else if (validViews.includes(savedView)) {
        initialView = savedView;
    }

    // Set initial active states
    let activeItem = null;
    navItems.forEach(item => {
        const viewName = item.getAttribute('data-view');
        if (viewName === initialView) {
            item.classList.add('active');
            activeItem = item;
        } else {
            item.classList.remove('active');
        }
    });

    viewPanels.forEach(panel => {
        if (panel.id === `${initialView}-view`) {
            panel.classList.add('active');
            panel.style.opacity = '1';
        } else {
            panel.classList.remove('active');
            panel.style.opacity = '0';
        }
    });

    // Handle initial active card relocation
    handleCardRelocation(initialView);

    // Set initial position of indicator on page load
    if (activeItem) {
        // Small delay to ensure browser layout is calculated
        setTimeout(() => updateNavIndicator(activeItem, false), 100);
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetView = item.getAttribute('data-view');
            if (!targetView) return;

            const currentActivePanel = document.querySelector('.view-panel.active');
            const targetPanel = document.getElementById(`${targetView}-view`);
            
            if (item.classList.contains('active')) return;

            // Save active view state
            localStorage.setItem('focusflow-active-view', targetView);
            window.location.hash = targetView;
            document.dispatchEvent(new CustomEvent('viewChanged', { detail: { view: targetView } }));

            // Update sidebar nav active classes
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            updateNavIndicator(item, true);

            // Animate panel switch (Sequential Fade)
            if (currentActivePanel && targetPanel) {
                if (typeof gsap !== 'undefined') {
                    // Fade out current panel
                    gsap.to(currentActivePanel, {
                        opacity: 0,
                        y: -10,
                        duration: 0.15,
                        ease: 'power2.in',
                        onComplete: () => {
                            currentActivePanel.classList.remove('active');
                            
                            // Relocate cards dynamically to workspaces
                            handleCardRelocation(targetView);

                            // Prep target panel
                            targetPanel.style.opacity = '0';
                            targetPanel.classList.add('active');
                            
                            // Fade in target panel
                            gsap.fromTo(targetPanel, 
                                { opacity: 0, y: 10 },
                                { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
                            );
                        }
                    });
                } else {
                    currentActivePanel.classList.remove('active');
                    handleCardRelocation(targetView);
                    targetPanel.classList.add('active');
                }
            } else if (targetPanel) {
                handleCardRelocation(targetView);
                targetPanel.classList.add('active');
            }
        });
    });

    // Handle Resize adjustments
    window.addEventListener('resize', () => {
        const active = nav.querySelector('.nav-item.active');
        if (active) {
            updateNavIndicator(active, false);
        }
    });

    // Monitor transition events or content changes to update position
    document.addEventListener('layoutchange', () => {
        const active = nav.querySelector('.nav-item.active');
        if (active) {
            updateNavIndicator(active, false);
        }
    });

    // Wire up quick calendar header button shortcut
    const headerCalendarBtn = document.getElementById('header-calendar-btn');
    if (headerCalendarBtn) {
        headerCalendarBtn.addEventListener('click', () => {
            const calendarNavItem = document.querySelector('.sidebar-nav .nav-item[data-view="calendar"]');
            if (calendarNavItem) {
                calendarNavItem.click();
            }
        });
    }
}

/**
 * Relocates dashboard cards to/from their workspace containers depending on active view.
 */
function handleCardRelocation(targetView) {
    const relocationMap = {
        'timer': [
            { card: '#dashboard-timer-card', anchor: '#db-timer-anchor', container: '#timer-workspace-content' }
        ],
        'tasks': [
            { card: '#dashboard-tasks-card', anchor: '#db-tasks-anchor', container: '#tasks-workspace-content' }
        ],
        'study-plan': [
            { card: '#dashboard-ai-plan-card', anchor: '#db-ai-plan-anchor', container: '#study-plan-workspace-content' }
        ],
        'analytics': [
            { card: '#dashboard-stats-card', anchor: '#db-stats-anchor', container: '#stats-workspace-content' },
            { card: '#dashboard-analytics-card', anchor: '#db-analytics-anchor', container: '#analytics-workspace-content' }
        ],
        'music': [
            { card: '#dashboard-music-card', anchor: '#db-music-anchor', container: '#music-workspace-content' }
        ]
    };

    // 1. Restore all cards in map back to dashboard grid if they are currently inside their workspace containers
    for (const view in relocationMap) {
        const configs = relocationMap[view];
        configs.forEach(config => {
            const cardEl = document.querySelector(config.card);
            const anchorEl = document.querySelector(config.anchor);
            const dashboardGrid = document.querySelector('.dashboard-grid');

            if (cardEl && anchorEl && dashboardGrid) {
                const containerEl = document.querySelector(config.container);
                if (containerEl && containerEl.contains(cardEl)) {
                    dashboardGrid.insertBefore(cardEl, anchorEl);
                }
            }
        });
    }

    // 2. Move active view's cards to their workspace containers
    if (relocationMap[targetView]) {
        const configs = relocationMap[targetView];
        configs.forEach(config => {
            const cardEl = document.querySelector(config.card);
            const containerEl = document.querySelector(config.container);

            if (cardEl && containerEl) {
                containerEl.appendChild(cardEl);
                
                // Animate card entrance inside its workspace view
                if (typeof gsap !== 'undefined') {
                    gsap.fromTo(cardEl, 
                        { opacity: 0, scale: 0.95 },
                        { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' }
                    );
                }
            }
        });
    }
}

/**
 * Calculates and moves the navigation background indicator to align with active item.
 */
function updateNavIndicator(activeItem, animate = true) {
    const indicator = document.querySelector('.nav-indicator');
    const nav = document.querySelector('.sidebar-nav');
    if (!indicator || !activeItem || !nav) return;

    const navRect = nav.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const isMobile = window.innerWidth <= 900;

    const targetProps = {
        top: itemRect.top - navRect.top + nav.scrollTop,
        left: itemRect.left - navRect.left + nav.scrollLeft,
        width: itemRect.width,
        height: itemRect.height
    };

    if (animate && typeof gsap !== 'undefined') {
        gsap.to(indicator, {
            top: targetProps.top,
            left: isMobile ? targetProps.left : 0,
            width: isMobile ? targetProps.width : '100%',
            height: targetProps.height,
            duration: 0.35,
            ease: 'power2.out'
        });
    } else {
        indicator.style.top = `${targetProps.top}px`;
        indicator.style.left = isMobile ? `${targetProps.left}px` : '0px';
        indicator.style.width = isMobile ? `${targetProps.width}px` : '100%';
        indicator.style.height = `${targetProps.height}px`;
    }
}

/**
 * Initializes and manages theme switching (Light / Dark mode).
 */
function initTheme() {
    const themeCheckbox = document.getElementById('theme-checkbox');
    if (!themeCheckbox) return;

    // Check for saved preference, otherwise default to Dark Mode
    const savedTheme = localStorage.getItem('focusflow-theme') || 'dark';
    
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeCheckbox.checked = true;
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeCheckbox.checked = false;
    }

    // Toggle theme on change
    themeCheckbox.addEventListener('change', () => {
        if (themeCheckbox.checked) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('focusflow-theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('focusflow-theme', 'dark');
        }
        
        // Re-trigger icon updates if dynamic styling changes are required
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });
}



/**
 * Initializes localStorage with default values if they are not already set.
 * This guarantees synchronization between stats and widgets on initial page load.
 */
function initDatabase() {
    const isResetClean = localStorage.getItem('focusflow-first-run-completed') === 'true';

    const defaults = isResetClean ? {
        'focusflow-total-time': '0',
        'focusflow-sessions-count': '0',
        'focusflow-streak': '0',
        'focusflow-last-date': '',
        'focusflow-weekly-data': JSON.stringify({
            'this-week': {
                days: [0, 0, 0, 0, 0, 0, 0],
                total: 0
            },
            'last-week': {
                days: [0, 0, 0, 0, 0, 0, 0],
                total: 0
            }
        }),
        'focusflow-tasks': JSON.stringify([])
    } : {
        'focusflow-total-time': '75',
        'focusflow-sessions-count': '3',
        'focusflow-streak': '7',
        'focusflow-last-date': new Date().toDateString(),
        'focusflow-weekly-data': JSON.stringify({
            'this-week': {
                days: [60, 90, 75, 120, 45, 60, 30],
                total: 480
            },
            'last-week': {
                days: [45, 60, 90, 60, 75, 45, 45],
                total: 420
            }
        }),
        'focusflow-tasks': JSON.stringify([
            { id: 1, text: 'Complete Math Chapter 5', completed: false },
            { id: 2, text: 'Read Physics Notes', completed: true },
            { id: 3, text: 'Solve Chemistry Questions', completed: true },
            { id: 4, text: 'Prepare for English Test', completed: false },
            { id: 5, text: 'Revise Biology Diagrams', completed: false }
        ])
    };

    for (const key in defaults) {
        if (localStorage.getItem(key) === null) {
            localStorage.setItem(key, defaults[key]);
        }
    }
}

/**
 * Initializes settings options, credentials handling, visibility toggles, and Gemini connection testing.
 */
function initSettings() {
    // Profile inputs
    const usernameInput = document.getElementById('settings-username');
    const saveProfileBtn = document.getElementById('settings-save-profile-btn');

    // Preset inputs
    const timerWorkInput = document.getElementById('settings-timer-work');
    const timerShortInput = document.getElementById('settings-timer-short');
    const timerLongInput = document.getElementById('settings-timer-long');
    const savePresetsBtn = document.getElementById('settings-save-presets-btn');

    // AI & Quotes inputs
    const apiKeyInput = document.getElementById('settings-api-key');
    const toggleVisibilityBtn = document.getElementById('api-key-toggle-visibility');
    const quotesLimitInput = document.getElementById('settings-quotes-limit');
    const quotesTodayBadge = document.getElementById('settings-quotes-today-badge');
    const resetQuotesBtn = document.getElementById('settings-reset-quotes-counter-btn');
    const testBtn = document.getElementById('settings-test-key-btn');
    const saveKeyBtn = document.getElementById('settings-save-key-btn');
    const statusBanner = document.getElementById('api-key-status');
    const statusText = document.getElementById('api-status-text');

    // 1. Load User Profile Settings
    if (usernameInput) {
        usernameInput.value = localStorage.getItem('focusflow-username') || '';
    }

    // 2. Load Timer Preset Settings
    if (timerWorkInput) timerWorkInput.value = localStorage.getItem('focusflow-timer-preset-work') || '25';
    if (timerShortInput) timerShortInput.value = localStorage.getItem('focusflow-timer-preset-short') || '5';
    if (timerLongInput) timerLongInput.value = localStorage.getItem('focusflow-timer-preset-long') || '15';

    // 3. Load AI & Quote Settings
    if (apiKeyInput) {
        apiKeyInput.value = localStorage.getItem('focusflow-gemini-key') || '';
    }
    if (quotesLimitInput) {
        quotesLimitInput.value = localStorage.getItem('focusflow-quotes-limit') || '5';
    }
    updateQuotesCounterDisplay();

    // --- Save Profile Event ---
    if (saveProfileBtn && usernameInput) {
        saveProfileBtn.addEventListener('click', () => {
            const name = usernameInput.value.trim();
            localStorage.setItem('focusflow-username', name);
            updateGreeting();
            showSaveSuccess(saveProfileBtn);
        });
    }

    // --- Save Presets Event ---
    if (savePresetsBtn) {
        savePresetsBtn.addEventListener('click', () => {
            const workVal = parseInt(timerWorkInput.value, 10);
            const shortVal = parseInt(timerShortInput.value, 10);
            const longVal = parseInt(timerLongInput.value, 10);

            if (isNaN(workVal) || workVal < 1 || workVal > 180 ||
                isNaN(shortVal) || shortVal < 1 || shortVal > 60 ||
                isNaN(longVal) || longVal < 1 || longVal > 120) {
                alert('Please enter valid positive numbers for timer presets.');
                return;
            }

            localStorage.setItem('focusflow-timer-preset-work', workVal.toString());
            localStorage.setItem('focusflow-timer-preset-short', shortVal.toString());
            localStorage.setItem('focusflow-timer-preset-long', longVal.toString());

            // Dispatch custom event to notify the Pomodoro Timer card
            const updateEvent = new CustomEvent('focusflow-settings-updated');
            window.dispatchEvent(updateEvent);

            showSaveSuccess(savePresetsBtn);
        });
    }

    // --- API Toggle Visibility ---
    if (toggleVisibilityBtn && apiKeyInput) {
        toggleVisibilityBtn.addEventListener('click', () => {
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            
            const icon = toggleVisibilityBtn.querySelector('i, svg');
            if (icon && typeof lucide !== 'undefined') {
                icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
                lucide.createIcons();
            }
        });
    }

    // --- Reset Quotes Refreshes ---
    if (resetQuotesBtn) {
        resetQuotesBtn.addEventListener('click', () => {
            localStorage.setItem('focusflow-quotes-refreshed-today', '0');
            localStorage.setItem('focusflow-quotes-refreshed-date', new Date().toDateString());
            updateQuotesCounterDisplay();
            showSaveSuccess(resetQuotesBtn);
        });
    }

    // --- Save AI & Quote Settings Event ---
    if (saveKeyBtn) {
        saveKeyBtn.addEventListener('click', () => {
            const key = apiKeyInput ? apiKeyInput.value.trim() : '';
            localStorage.setItem('focusflow-gemini-key', key);

            if (quotesLimitInput) {
                const limitVal = parseInt(quotesLimitInput.value, 10);
                if (!isNaN(limitVal) && limitVal >= 1 && limitVal <= 50) {
                    localStorage.setItem('focusflow-quotes-limit', limitVal.toString());
                }
            }

            // Dispatch update to other views
            const updateEvent = new CustomEvent('focusflow-settings-updated');
            window.dispatchEvent(updateEvent);
            
            updateQuotesCounterDisplay();

            if (statusBanner && statusText) {
                statusBanner.className = 'api-status-banner success';
                statusText.textContent = 'AI Settings saved successfully!';
                statusBanner.classList.remove('hidden');
                
                setTimeout(() => {
                    statusBanner.classList.add('hidden');
                }, 3000);
            }
            showSaveSuccess(saveKeyBtn);
        });
    }

    // --- Real-time Quote Refreshes Event Listener ---
    window.addEventListener('focusflow-quote-refreshed', () => {
        updateQuotesCounterDisplay();
    });

    // --- Test Connection ---
    if (testBtn && apiKeyInput) {
        testBtn.addEventListener('click', async () => {
            const key = apiKeyInput.value.trim();
            
            if (!key) {
                if (statusBanner && statusText) {
                    statusBanner.className = 'api-status-banner error';
                    statusText.textContent = 'Please enter an API key to test.';
                    statusBanner.classList.remove('hidden');
                }
                return;
            }

            const originalHTML = testBtn.innerHTML;
            testBtn.disabled = true;
            testBtn.innerHTML = '<div class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px; margin-right: 8px; display: inline-block; vertical-align: middle;"></div> Testing...';

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: "respond with just the word: OK"
                            }]
                        }]
                    })
                });

                if (response.ok) {
                    if (statusBanner && statusText) {
                        statusBanner.className = 'api-status-banner success';
                        statusText.textContent = 'Connection tested successfully!';
                        statusBanner.classList.remove('hidden');
                    }
                } else {
                    const data = await response.json();
                    const errMsg = data.error?.message || `HTTP error ${response.status}`;
                    if (statusBanner && statusText) {
                        statusBanner.className = 'api-status-banner error';
                        statusText.textContent = `Connection failed: ${errMsg}`;
                        statusBanner.classList.remove('hidden');
                    }
                }
            } catch (err) {
                if (statusBanner && statusText) {
                    statusBanner.className = 'api-status-banner error';
                    statusText.textContent = `Connection failed: ${err.message}`;
                    statusBanner.classList.remove('hidden');
                }
            } finally {
                testBtn.disabled = false;
                testBtn.innerHTML = originalHTML;
            }
        });
    }

    // --- Master Reset App Data ---
    const resetAllBtn = document.getElementById('settings-reset-all-btn');
    const resetConfirmRow = document.getElementById('reset-confirm-row');
    const resetConfirmYesBtn = document.getElementById('reset-confirm-yes-btn');
    const resetConfirmCancelBtn = document.getElementById('reset-confirm-cancel-btn');

    if (resetAllBtn && resetConfirmRow) {
        // Step 1: show the danger confirmation strip
        resetAllBtn.addEventListener('click', () => {
            resetConfirmRow.style.display = 'flex';
            resetAllBtn.style.display = 'none';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });

        // Step 2a: cancel — hide the strip again
        if (resetConfirmCancelBtn) {
            resetConfirmCancelBtn.addEventListener('click', () => {
                resetConfirmRow.style.display = 'none';
                resetAllBtn.style.display = '';
            });
        }

        // Step 2b: confirmed — wipe all app data and reload
        if (resetConfirmYesBtn) {
            resetConfirmYesBtn.addEventListener('click', () => {
                const keysToClear = [
                    // Tasks (tasks.js)
                    'focusflow-tasks',

                    // Timer stats (timer.js)
                    'focusflow-sessions-count',
                    'focusflow-total-time',
                    'focusflow-streak',
                    'focusflow-last-date',
                    'focusflow-timer-history',

                    // Weekly analytics (stats.js)
                    'focusflow-weekly-data',
                    'focusflow-time-distribution',
                    'focusflow-total-break-time',

                    // AI Study Plan (plan.js)
                    'focusflow-ai-plan',

                    // Goals (goals.js) — main list + form drafts
                    'focusflow-goals',
                    'focusflow-goals-draft-title',
                    'focusflow-goals-draft-category',
                    'focusflow-goals-draft-deadline',
                    'focusflow-goals-draft-milestones',

                    // Habits (habits.js) — main list + form drafts
                    'focusflow-habits',
                    'focusflow-habits-draft-title',
                    'focusflow-habits-draft-category',

                    // Calendar custom events (calendar.js)
                    'focusflow-calendar-events',

                    // Distraction Shield (blocker.js)
                    'focusflow-blocker-sites',
                    'focusflow-blocker-active',
                    'focusflow-blocker-draft-url',

                    // Music state (music.js) — reset to track 0 at 0:00
                    'focusflow-music-current-track',
                    'focusflow-music-current-time',
                    'focusflow-music-is-playing',
                    'focusflow-music-volume',

                    // Quote refresh counters
                    'focusflow-quotes-refreshed-today',
                    'focusflow-quotes-refreshed-date',
                ];

                keysToClear.forEach(key => localStorage.removeItem(key));

                // Set first-run completed flag to load empty slates on next reload
                localStorage.setItem('focusflow-first-run-completed', 'true');

                // Hard reload — all widgets re-initialize from empty/default state
                window.location.reload();
            });
        }
    }

    /**
     * Renders the current daily quote refreshes quota badge.
     */
    function updateQuotesCounterDisplay() {
        if (!quotesTodayBadge) return;
        const todayDate = new Date().toDateString();
        const lastRefreshedDate = localStorage.getItem('focusflow-quotes-refreshed-date') || '';
        let refreshedCount = parseInt(localStorage.getItem('focusflow-quotes-refreshed-today') || '0', 10);
        
        if (lastRefreshedDate !== todayDate) {
            refreshedCount = 0;
        }
        
        const limit = localStorage.getItem('focusflow-quotes-limit') || '5';
        quotesTodayBadge.textContent = `${refreshedCount} / ${limit}`;
    }

    /**
     * Standard Micro-interaction to show save feedback inside buttons.
     */
    function showSaveSuccess(btn) {
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="lucide-check-circle-2" data-lucide="check-circle-2" style="width: 14px; height: 14px; display: inline-block; margin-right: 6px;"></i> Saved!';
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 2000);
    }
}

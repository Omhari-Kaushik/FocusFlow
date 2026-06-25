/* ==========================================================================
   FocusFlow - Website Blocker (Distraction Shield) Controller
   ========================================================================== */

(function () {
    // Helper to normalize entered URL to base domain
    function normalizeDomain(inputUrl) {
        let url = inputUrl.trim().toLowerCase();
        // Remove protocol and www.
        url = url.replace(/^(https?:\/\/)?(www\.)?/, '');
        // Remove path and query string parameters
        url = url.split('/')[0];
        url = url.split('?')[0];
        url = url.split('#')[0];
        return url;
    }

    // Default sites loaded on first run
    const DEFAULT_SITES = [
        { id: 1, url: "youtube.com", category: "Entertainment" },
        { id: 2, url: "facebook.com", category: "Social" },
        { id: 3, url: "instagram.com", category: "Social" },
        { id: 4, url: "twitter.com", category: "Social" },
        { id: 5, url: "reddit.com", category: "Social" },
        { id: 6, url: "netflix.com", category: "Entertainment" },
        { id: 7, url: "tiktok.com", category: "Social" },
        { id: 8, url: "twitch.tv", category: "Entertainment" },
        { id: 9, url: "linkedin.com", category: "Social" },
        { id: 10, url: "pinterest.com", category: "Social" }
    ];

    let blockedSites = [];
    let isBlockerActive = false;

    // DOM Elements - Full Workspace View
    let masterToggle, urlInput, categorySelect, submitBtn;
    let sitesListContainer, blockerCountLabel;

    // DOM Elements - Dashboard Widget
    let dbCountLabel, dbStatusLabel, dbToggle, dbManageBtn, dbSitesListContainer;

    // DOM Elements - Overlay Intercept
    let overlayScreen, interceptedUrlLabel, closeOverlayBtn;

    // Notification Audio (Warning Chime)
    const interceptChime = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-84.wav');
    interceptChime.volume = 0.5;

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        loadBlockerState();
        initEvents();
        renderBlockedSites();
        renderDashboardBlockedSites();
        updateDashboardWidget();
        checkRedirectedBlock();
    });

    /**
     * Cache DOM Elements.
     */
    function initElements() {
        // Workspace inputs & toggle
        masterToggle = document.getElementById('blocker-master-toggle');
        urlInput = document.getElementById('block-url-input');
        categorySelect = document.getElementById('block-category-select');
        submitBtn = document.getElementById('blocker-submit-btn');
        blockerCountLabel = document.getElementById('blocker-count');
        sitesListContainer = document.getElementById('blocker-sites-list');

        // Dashboard widget elements
        dbCountLabel = document.getElementById('db-blocker-count');
        dbStatusLabel = document.getElementById('db-blocker-status');
        dbToggle = document.getElementById('db-blocker-toggle');
        dbManageBtn = document.getElementById('blocker-dashboard-manage-btn');
        dbSitesListContainer = document.getElementById('db-blocked-sites-list');

        // Full screen overlay elements
        overlayScreen = document.getElementById('blocker-overlay');
        interceptedUrlLabel = document.getElementById('blocker-intercepted-url');
        closeOverlayBtn = document.getElementById('blocker-close-overlay-btn');

        // Restore draft url input if saved
        if (urlInput) {
            const draftUrl = localStorage.getItem('focusflow-blocker-draft-url');
            if (draftUrl) urlInput.value = draftUrl;
        }
    }

    /**
     * Load blocker status and sites list from localStorage.
     */
    function loadBlockerState() {
        // Load sites blacklist
        const storedSites = localStorage.getItem('focusflow-blocker-sites');
        if (storedSites) {
            try {
                blockedSites = JSON.parse(storedSites);
                // If there is only one site stored (like youtube.com from previous testing),
                // automatically reset/expand it to the new defaults list.
                if (blockedSites.length <= 1) {
                    blockedSites = DEFAULT_SITES;
                    saveSitesToStorage();
                }
            } catch (e) {
                console.error("Error parsing blocker sites", e);
                blockedSites = DEFAULT_SITES;
                saveSitesToStorage();
            }
        } else {
            blockedSites = DEFAULT_SITES;
            saveSitesToStorage();
        }

        // Load active switch state
        const storedActive = localStorage.getItem('focusflow-blocker-active');
        isBlockerActive = storedActive === 'true';

        // Apply visual states to toggles
        if (masterToggle) masterToggle.checked = isBlockerActive;
        if (dbToggle) dbToggle.checked = isBlockerActive;
    }

    /**
     * Save blocker blacklist to localStorage.
     */
    function saveSitesToStorage() {
        localStorage.setItem('focusflow-blocker-sites', JSON.stringify(blockedSites));
        window.dispatchEvent(new CustomEvent('focusflow-blocker-update'));
    }

    /**
     * Set up event handlers.
     */
    function initEvents() {
        // Dashboard toggle switch change
        if (dbToggle) {
            dbToggle.addEventListener('change', () => {
                setBlockerActiveState(dbToggle.checked);
            });
        }

        // Workspace master toggle switch change
        if (masterToggle) {
            masterToggle.addEventListener('change', () => {
                setBlockerActiveState(masterToggle.checked);
            });
        }

        // Blocker site submit
        if (submitBtn) {
            submitBtn.addEventListener('click', addBlockedSite);
        }

        // Form draft URL persistence
        if (urlInput) {
            urlInput.addEventListener('input', () => {
                localStorage.setItem('focusflow-blocker-draft-url', urlInput.value);
            });
        }

        // Manage button navigation from dashboard
        if (dbManageBtn) {
            dbManageBtn.addEventListener('click', () => {
                const navItem = document.querySelector('.sidebar-nav .nav-item[data-view="website-blocker"]');
                if (navItem) navItem.click();
            });
        }


        // Close intervention overlay
        if (closeOverlayBtn) {
            closeOverlayBtn.addEventListener('click', () => {
                if (overlayScreen) {
                    overlayScreen.classList.add('hidden');
                }
            });
        }
    }

    /**
     * Update Blocker Active Switch globally.
     */
    function setBlockerActiveState(active) {
        isBlockerActive = active;
        localStorage.setItem('focusflow-blocker-active', active);

        // Sync visual checkboxes
        if (masterToggle) masterToggle.checked = active;
        if (dbToggle) dbToggle.checked = active;

        updateDashboardWidget();
        window.dispatchEvent(new CustomEvent('focusflow-blocker-update'));
    }

    /**
     * Add a site to the blacklist.
     */
    function addBlockedSite() {
        if (!urlInput) return;

        const rawUrl = urlInput.value.trim();
        const category = categorySelect ? categorySelect.value : 'Social';

        if (!rawUrl) {
            alert("Please enter a website URL.");
            return;
        }

        const normalized = normalizeDomain(rawUrl);
        if (!normalized) {
            alert("Please enter a valid website URL.");
            return;
        }

        // Check for duplicates
        const exists = blockedSites.some(site => site.url === normalized);
        if (exists) {
            alert(`"${normalized}" is already on your blacklist!`);
            return;
        }

        const newSite = {
            id: Date.now(),
            url: normalized,
            category: category
        };

        blockedSites.push(newSite);
        saveSitesToStorage();

        // Clear forms & drafts
        urlInput.value = '';
        localStorage.removeItem('focusflow-blocker-draft-url');

        // Re-render
        renderBlockedSites();
        renderDashboardBlockedSites();
        updateDashboardWidget();

        // Animate new item entrance if GSAP is available
        const listItems = sitesListContainer.querySelectorAll('.blocker-site-item');
        if (listItems.length > 0 && typeof gsap !== 'undefined') {
            const lastItem = listItems[listItems.length - 1];
            gsap.from(lastItem, {
                opacity: 0,
                y: 15,
                duration: 0.3,
                ease: 'power2.out'
            });
        }
    }

    /**
     * Delete site from blacklist.
     */
    function deleteBlockedSite(id) {
        const itemEl = sitesListContainer ? sitesListContainer.querySelector(`.blocker-site-item[data-id="${id}"]`) : null;
        const dbItemEl = dbSitesListContainer ? dbSitesListContainer.querySelector(`.db-blocked-site-item[data-id="${id}"]`) : null;

        let completedAnims = 0;
        let expectedAnims = 0;

        if (itemEl && typeof gsap !== 'undefined') expectedAnims++;
        if (dbItemEl && typeof gsap !== 'undefined') expectedAnims++;

        function performDeletion() {
            blockedSites = blockedSites.filter(s => s.id !== id);
            saveSitesToStorage();
            renderBlockedSites();
            renderDashboardBlockedSites();
            updateDashboardWidget();
        }

        if (expectedAnims > 0) {
            const onAnimComplete = () => {
                completedAnims++;
                if (completedAnims === expectedAnims) {
                    performDeletion();
                }
            };

            if (itemEl) {
                gsap.to(itemEl, {
                    opacity: 0,
                    x: -15,
                    duration: 0.3,
                    onComplete: onAnimComplete
                });
            }
            if (dbItemEl) {
                gsap.to(dbItemEl, {
                    opacity: 0,
                    x: -15,
                    duration: 0.3,
                    onComplete: onAnimComplete
                });
            }
        } else {
            performDeletion();
        }
    }

    /**
     * Render the list of blocked sites in the workspace.
     */
    function renderBlockedSites() {
        if (!sitesListContainer) return;

        sitesListContainer.innerHTML = '';
        
        if (blockerCountLabel) {
            blockerCountLabel.textContent = blockedSites.length;
        }

        if (blockedSites.length === 0) {
            sitesListContainer.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <i data-lucide="shield-check" style="width: 40px; height: 40px; margin-bottom: 10px; opacity: 0.5; color: var(--accent-green);"></i>
                    <p>Your blocklist is empty! Enter distracting websites on the left.</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        blockedSites.forEach(site => {
            const item = document.createElement('div');
            item.className = 'blocker-site-item';
            item.setAttribute('data-id', site.id);

            item.innerHTML = `
                <div class="blocker-site-left">
                    <div class="blocker-site-icon-wrapper">
                        <i data-lucide="globe"></i>
                    </div>
                    <div class="blocker-site-info">
                        <span class="blocker-site-url">${site.url}</span>
                        <div class="blocker-site-meta">
                            <span class="blocker-site-badge ${site.category.toLowerCase()}">${site.category}</span>
                        </div>
                    </div>
                </div>
                <button class="blocker-site-delete" title="Unblock Site">
                    <i data-lucide="trash-2"></i>
                </button>
            `;

            // Delete event handler
            const deleteBtn = item.querySelector('.blocker-site-delete');
            deleteBtn.addEventListener('click', () => {
                deleteBlockedSite(site.id);
            });

            sitesListContainer.appendChild(item);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Render the list of blocked sites in the dashboard widget.
     */
    function renderDashboardBlockedSites() {
        if (!dbSitesListContainer) return;

        dbSitesListContainer.innerHTML = '';

        if (blockedSites.length === 0) {
            dbSitesListContainer.innerHTML = `
                <div class="db-blocker-empty">
                    <i data-lucide="shield-check"></i>
                    <p>Your shield is empty! Add sites in the blocker tab.</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        blockedSites.forEach(site => {
            const item = document.createElement('li');
            item.className = 'db-blocked-site-item';
            item.setAttribute('data-id', site.id);

            item.innerHTML = `
                <div class="db-blocked-site-left">
                    <div class="db-blocked-site-icon-wrapper">
                        <i data-lucide="globe"></i>
                    </div>
                    <span class="db-blocked-site-url" title="${site.url}">${site.url}</span>
                </div>
                <div class="db-blocked-site-right">
                    <span class="blocker-site-badge ${site.category.toLowerCase()}">${site.category}</span>
                    <button class="db-blocked-site-unblock" title="Unblock Site">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;

            // Delete event handler
            const unblockBtn = item.querySelector('.db-blocked-site-unblock');
            unblockBtn.addEventListener('click', () => {
                deleteBlockedSite(site.id);
            });

            dbSitesListContainer.appendChild(item);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Update the dashboard summary blocker status widget.
     */
    function updateDashboardWidget() {
        if (dbCountLabel) {
            dbCountLabel.textContent = blockedSites.length;
        }

        if (dbStatusLabel) {
            dbStatusLabel.textContent = isBlockerActive ? "Active" : "Inactive";
            if (isBlockerActive) {
                dbStatusLabel.className = "blocker-status-badge active";
            } else {
                dbStatusLabel.className = "blocker-status-badge inactive";
            }
        }
    }


    /**
     * Check if user was redirected here from the blocker extension.
     */
    function checkRedirectedBlock() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const blockedSite = urlParams.get('blocked');
            if (blockedSite && isBlockerActive) {
                // Show intervention overlay with the blocked site
                if (interceptedUrlLabel) {
                    interceptedUrlLabel.textContent = blockedSite;
                }
                if (overlayScreen) {
                    overlayScreen.classList.remove('hidden');
                    
                    // Play warning sound
                    try {
                        interceptChime.currentTime = 0;
                        interceptChime.play().catch(err => {
                            console.log("Audio autoplay blocked by browser policies.", err);
                        });
                    } catch (e) {
                        console.error("Audio error", e);
                    }
                    
                    // Add entry animation to overlay card
                    const card = overlayScreen.querySelector('.blocker-overlay-card');
                    if (card && typeof gsap !== 'undefined') {
                        gsap.fromTo(card, 
                            { scale: 0.8, opacity: 0 },
                            { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }
                        );
                    }
                }
                
                // Clean URL search parameters without reloading page
                const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.hash;
                window.history.replaceState({ path: newUrl }, '', newUrl);
            }
        } catch (e) {
            console.error("Error checking redirected block state", e);
        }
    }
})();

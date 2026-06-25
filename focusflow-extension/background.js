// FocusFlow Distraction Shield - Background v3.2
//
// WHY THIS WORKS:
// - declarativeNetRequest = Chrome's native network-level blocker (blocks main page loads)
// - chrome.tabs.onUpdated = intercepts client-side routing (SPAs like YouTube) and URL shifts
// - Active tab scanning = immediately kicks user out of distracting sites when shield is turned ON
// - Logging to storage = allows debugging service worker events from the page console

console.log('FocusFlow Shield v3.2: background loaded');

// Helper to log state changes to storage so content script can display them in the webpage console
async function logState(msg, data = {}) {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[Background SW ${timestamp}] ${msg}`;
    console.log(logLine, data);
    try {
        const stored = await chrome.storage.local.get(['extensionLogs']);
        const logs = stored.extensionLogs || [];
        logs.push(`${logLine} ${Object.keys(data).length ? JSON.stringify(data) : ''}`);
        if (logs.length > 30) logs.shift(); // Keep last 30 logs
        await chrome.storage.local.set({ extensionLogs: logs });
    } catch (e) {
        console.error("Log failed", e);
    }
}

// Check a single tab and redirect it if it matches a blocked domain
async function checkAndRedirectTab(tab, sites, active) {
    if (!active || !sites || sites.length === 0 || !tab.url) return;

    const url = tab.url;
    // Don't intercept extension pages
    if (url.startsWith('chrome-extension://')) return;

    const blockedPage = chrome.runtime.getURL('blocked.html');

    for (const site of sites) {
        const raw = typeof site === 'object' ? (site.url || '') : String(site);
        const domain = raw
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/[/?#].*$/, '')
            .trim()
            .toLowerCase();
        
        if (!domain) continue;

        try {
            const tabUrlObj = new URL(url);
            const tabHost = tabUrlObj.hostname.toLowerCase().replace(/^www\./, '');
            
            // Match exact domain or subdomains (e.g. m.youtube.com ends with .youtube.com)
            if (tabHost === domain || tabHost.endsWith('.' + domain)) {
                await logState('Intercepted distracting tab. Redirecting...', { tabId: tab.id, url: tab.url, domain });
                await chrome.tabs.update(tab.id, { 
                    url: `${blockedPage}?blocked=${encodeURIComponent(domain)}` 
                });
                break;
            }
        } catch (e) {
            // Invalid URL in tab (e.g. chrome://)
        }
    }
}

// ── Restore saved rules whenever the extension starts or Chrome restarts ──────
async function restoreRules() {
    try {
        await logState('Restoring rules on startup/install...');
        const data = await chrome.storage.local.get(['blockerSites', 'blockerActive']);
        await applyRules(data.blockerSites || [], data.blockerActive || false);
    } catch (err) {
        await logState('Error during restoreRules', { error: err.message });
    }
}
chrome.runtime.onInstalled.addListener(restoreRules);
chrome.runtime.onStartup.addListener(restoreRules);

// ── React to state changes written by content.js ──────────────────────────────
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    
    logState('Storage changed', Object.keys(changes));

    if (!('blockerSites' in changes) && !('blockerActive' in changes)) return;

    chrome.storage.local.get(['blockerSites', 'blockerActive'], (data) => {
        logState('Applying updated rules from storage changes', {
            active: data.blockerActive,
            sitesCount: (data.blockerSites || []).length
        });
        applyRules(data.blockerSites || [], data.blockerActive || false);
    });
});

// ── Watch for in-page/history URL changes (client-side routing in SPAs) ─────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Check when URL changes or is loading
    if (changeInfo.url || changeInfo.status === 'loading') {
        try {
            const data = await chrome.storage.local.get(['blockerSites', 'blockerActive']);
            const active = data.blockerActive || false;
            const sites = data.blockerSites || [];
            if (active && sites.length > 0) {
                // Fetch fresh tab state to evaluate correct URL
                const freshTab = await chrome.tabs.get(tabId);
                await checkAndRedirectTab(freshTab, sites, active);
            }
        } catch (err) {
            // Safe ignore if tab closed
        }
    }
});

// ── Build and apply declarativeNetRequest dynamic rules ───────────────────────
async function applyRules(sites, active) {
    try {
        // Remove all existing rules first
        const existing = await chrome.declarativeNetRequest.getDynamicRules();
        const existingIds = existing.map(r => r.id);

        if (!active || !sites || sites.length === 0) {
            if (existingIds.length > 0) {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: existingIds,
                    addRules: []
                });
                await logState('Shield turned OFF: existing rules successfully cleared', { clearedIds: existingIds });
            } else {
                await logState('Shield is OFF: no active rules to clear');
            }
            return;
        }

        // Build one rule per blocked site using extensionPath (starts with /)
        const newRules = sites
            .map((site, i) => {
                const raw = typeof site === 'object' ? (site.url || '') : String(site);
                const domain = raw
                    .replace(/^https?:\/\//, '')
                    .replace(/^www\./, '')
                    .replace(/[/?#].*$/, '')
                    .trim()
                    .toLowerCase();
                if (!domain) return null;
                return {
                    id: i + 1,
                    priority: 1,
                    action: {
                        type: 'redirect',
                        redirect: { 
                            extensionPath: `/blocked.html?blocked=${encodeURIComponent(domain)}` 
                        }
                    },
                    condition: {
                        urlFilter: `||${domain}`,
                        resourceTypes: ['main_frame']
                    }
                };
            })
            .filter(Boolean);

        await logState('Updating rules', { 
            removingCount: existingIds.length, 
            addingCount: newRules.length 
        });

        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingIds,
            addRules: newRules
        });

        await logState('Shield turned ON: rules successfully applied', {
            blockedDomains: newRules.map(r => r.condition.urlFilter)
        });

        // Query all open tabs and immediately redirect any that are currently on blocked domains
        const tabs = await chrome.tabs.query({});
        await logState('Scanning open tabs for active blocks', { totalTabsCount: tabs.length });
        for (const tab of tabs) {
            await checkAndRedirectTab(tab, sites, active);
        }
    } catch (err) {
        await logState('Error applying rules in background', { error: err.message, stack: err.stack });
        console.error('FocusFlow Blocker Error:', err);
    }
}


// FocusFlow Distraction Shield - Content Script v3.1
// Runs inside the FocusFlow page (port 5500 via VS Code Live Server).
// Syncs blocker state from page localStorage → chrome.storage.local.
// Background.js reacts to storage changes and applies declarativeNetRequest rules.

async function syncToExtension() {
    try {
        const rawSites  = localStorage.getItem('focusflow-blocker-sites');
        const rawActive = localStorage.getItem('focusflow-blocker-active');
        const sites  = rawSites ? JSON.parse(rawSites) : [];
        const active = rawActive === 'true';
        console.log('FocusFlow Content Script: Syncing to extension...', { sites, active });
        
        const origin = window.location.origin;
        const href = window.location.href.split('#')[0];
        
        await chrome.storage.local.set({ 
            blockerSites: sites, 
            blockerActive: active,
            focusFlowOrigin: origin,
            focusFlowHref: href
        });
        console.log('FocusFlow Content Script: Sync successful.', { origin, href });
    } catch (e) {
        console.error('FocusFlow Content Script: Sync failed!', e);
    }
}

// Sync whenever the user toggles shield or adds/removes a site
window.addEventListener('focusflow-blocker-update', syncToExtension);

// Sync once on page load to restore state from previous session
syncToExtension();

// Print logs from the extension background worker in the webpage console
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.extensionLogs) {
        console.group('FocusFlow Shield Background logs');
        changes.extensionLogs.newValue.forEach(log => console.log(log));
        console.groupEnd();
    }
});

// Print existing logs on load
chrome.storage.local.get(['extensionLogs'], (data) => {
    if (data.extensionLogs && data.extensionLogs.length > 0) {
        console.group('FocusFlow Shield Background logs (cached)');
        data.extensionLogs.forEach(log => console.log(log));
        console.groupEnd();
    }
});


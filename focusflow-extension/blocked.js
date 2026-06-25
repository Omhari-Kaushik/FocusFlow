// FocusFlow Blocker Intercept Script - MV3 Compliant
// Loaded externally by blocked.html to comply with MV3 Content Security Policy (CSP)

document.addEventListener('DOMContentLoaded', () => {
    // Read the blocked site from the URL query parameter
    const params = new URLSearchParams(window.location.search);
    const blockedSite = params.get('blocked');
    if (blockedSite) {
        const textNode = document.getElementById('blocked-site');
        if (textNode) {
            textNode.textContent = blockedSite;
        }
    }

    // Retrieve dynamic FocusFlow origin/href from storage if available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['focusFlowHref', 'focusFlowOrigin', 'blockerActive', 'blockerSites'], (data) => {
            // 1. Build and set back-to-work link
            let backUrl = "http://127.0.0.1:5500/#website-blocker"; // Default fallback
            if (data.focusFlowHref && data.focusFlowHref !== 'null') {
                const baseUrl = data.focusFlowHref.split('#')[0];
                if (baseUrl.endsWith('.html') || baseUrl.endsWith('.htm')) {
                    backUrl = `${baseUrl}#website-blocker`;
                } else {
                    backUrl = `${baseUrl.replace(/\/$/, '')}/#website-blocker`;
                }
            } else if (data.focusFlowOrigin && data.focusFlowOrigin !== 'null') {
                backUrl = `${data.focusFlowOrigin.replace(/\/$/, '')}/#website-blocker`;
            }
            
            const backBtn = document.getElementById('back-btn');
            if (backBtn) {
                backBtn.href = backUrl;
            }

            // 2. Auto-redirect back to unblocked site if blocker turned off
            if (blockedSite) {
                const active = data.blockerActive || false;
                const sites = data.blockerSites || [];
                const domain = blockedSite.trim().toLowerCase();

                const isStillBlocked = active && sites.some(site => {
                    const raw = typeof site === 'object' ? (site.url || '') : String(site);
                    const sDomain = raw
                        .replace(/^https?:\/\//, '')
                        .replace(/^www\./, '')
                        .replace(/[/?#].*$/, '')
                        .trim()
                        .toLowerCase();
                    return sDomain === domain;
                });

                if (!isStillBlocked) {
                    console.log(`Site "${domain}" is no longer blocked. Redirecting back...`);
                    window.location.replace(`https://${domain}`);
                }
            }
        });
    }

    // Prevent going back to the blocked site via history
    history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', () => {
        history.pushState(null, '', window.location.href);
    });
});

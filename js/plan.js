/* ==========================================================================
   FocusFlow - AI Study Plan Generator Logic
   ========================================================================== */

(function () {
    // DOM Elements
    let subjectInput, timeSelect, goalSelect, generateBtn, resetBtn;
    let inputPanel, loadingPanel, loadingFill, loadingStatus, loadingTip;
    let outputPanel, outputTitle, outputSubtitle, timelineList;
    let progressPercent, progressFill;

    // Loading status updates
    const STATUS_STEPS = [
        "Analyzing study topic difficulty...",
        "Structuring optimal focus intervals...",
        "Generating active recall prompts..."
    ];

    // Cognitive science tips
    const STUDY_TIPS = [
        "Tip: Spacing study blocks with short breaks increases retention by up to 20%.",
        "Tip: Teaching a concept to someone else (Feynman Technique) is the fastest way to spot knowledge gaps.",
        "Tip: Active recall is 50% more effective for long-term retention than passive re-reading.",
        "Tip: Dehydration can reduce concentration by 15%. Keep a glass of water nearby!",
        "Tip: Reviewing your notes within 24 hours of learning prevents up to 80% of memory decay.",
        "Tip: Taking a 5-minute break to move around keeps blood flowing and maintains focus."
    ];

    // Goal translations
    const GOAL_LABELS = {
        concepts: "Learn Core Concepts",
        practice: "Practice Exercises",
        notes: "Summarize Notes",
        exam: "Exam Preparation"
    };

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        initEvents();
        checkExistingPlan();
    });

    /**
     * Cache DOM elements.
     */
    function initElements() {
        subjectInput = document.getElementById('ai-subject-input');
        timeSelect = document.getElementById('ai-time-select');
        goalSelect = document.getElementById('ai-goal-select');
        generateBtn = document.getElementById('ai-generate-btn');
        resetBtn = document.getElementById('ai-reset-btn');

        inputPanel = document.getElementById('ai-input-panel');
        loadingPanel = document.getElementById('ai-loading-panel');
        loadingFill = document.getElementById('ai-loading-fill');
        loadingStatus = document.getElementById('ai-loading-status');
        loadingTip = document.getElementById('ai-loading-tip');

        outputPanel = document.getElementById('ai-output-panel');
        outputTitle = document.getElementById('ai-output-title');
        outputSubtitle = document.getElementById('ai-output-subtitle');
        timelineList = document.getElementById('ai-timeline-list');

        progressPercent = document.getElementById('ai-plan-progress-percent');
        progressFill = document.getElementById('ai-plan-progress-fill');
    }

    /**
     * Attach Event Listeners.
     */
    function initEvents() {
        if (generateBtn) {
            generateBtn.addEventListener('click', startGeneration);
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', resetPlan);
        }
        if (subjectInput) {
            subjectInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    startGeneration();
                }
            });
        }
        
        // Synchronize button states when tasks are deleted/updated in the Task Manager
        document.addEventListener('tasksUpdated', syncPlanTasksWithTasksList);

        // Listen for external study plan generation requests (e.g. from the AI Assistant)
        document.addEventListener('generateAIPlan', (e) => {
            if (e.detail && e.detail.topic) {
                if (subjectInput) subjectInput.value = e.detail.topic;
                if (timeSelect && e.detail.duration) timeSelect.value = e.detail.duration;
                if (goalSelect && e.detail.goal) goalSelect.value = e.detail.goal;
                
                // If output panel is currently active, reset it to allow generating a new plan
                if (outputPanel && !outputPanel.classList.contains('hidden') && resetBtn) {
                    resetPlan();
                }
                
                startGeneration();
            }
        });
    }

    /**
     * Check if a plan is already stored in LocalStorage.
     */
    function checkExistingPlan() {
        const stored = localStorage.getItem('focusflow-ai-plan');
        if (stored) {
            try {
                const plan = JSON.parse(stored);
                renderPlan(plan);
                inputPanel.classList.add('hidden');
                outputPanel.classList.remove('hidden');
                
                // Perform initial synchronization check with the task list
                syncPlanTasksWithTasksList();
            } catch (e) {
                console.error("Failed to parse stored study plan", e);
                localStorage.removeItem('focusflow-ai-plan');
            }
        }
    }

    /**
     * Trigger AI compilation and generate a new study plan.
     */
    function startGeneration() {
        if (!subjectInput) return;

        const subject = subjectInput.value.trim();
        if (!subject) {
            // Premium shake animation for empty input
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(subjectInput, 
                    { x: -8 }, 
                    { x: 0, duration: 0.08, repeat: 5, yoyo: true, clearProps: 'x' }
                );
            }
            subjectInput.focus();
            return;
        }

        // Check if Gemini API key exists
        const apiKey = localStorage.getItem('focusflow-gemini-key');
        if (!apiKey) {
            showSettingsWarningModal();
            return;
        }

        const duration = parseInt(timeSelect.value, 10) || 2;
        const goal = goalSelect.value || 'concepts';

        // Set random study tip
        if (loadingTip) {
            const randomTip = STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)];
            loadingTip.textContent = randomTip;
        }

        // Enter loading state
        inputPanel.classList.add('hidden');
        loadingPanel.classList.remove('hidden');

        // Reset progress fill
        if (loadingFill) loadingFill.style.width = '0%';
        if (loadingStatus) loadingStatus.textContent = STATUS_STEPS[0];

        // Animate progress fill and status messages
        let step = 0;
        const statusInterval = setInterval(() => {
            step++;
            if (step < STATUS_STEPS.length && loadingStatus) {
                loadingStatus.textContent = STATUS_STEPS[step];
            }
        }, 1200);

        // Start GSAP progress bar animation to 90%
        let progressTween = null;
        if (typeof gsap !== 'undefined') {
            progressTween = gsap.fromTo(loadingFill,
                { width: '0%' },
                { width: '90%', duration: 4.5, ease: 'power1.out' }
            );
        } else {
            if (loadingFill) loadingFill.style.width = '90%';
        }

        let apiError = null;

        // Call Gemini API
        generateLivePlan(apiKey, subject, duration, goal)
            .then(blocks => {
                finishLoadingAndRender(blocks);
            })
            .catch(err => {
                apiError = err;
                finishLoadingAndRender(null);
            });

        function finishLoadingAndRender(blocks) {
            clearInterval(statusInterval);
            if (apiError) {
                // Return to input panel
                loadingPanel.classList.add('hidden');
                inputPanel.classList.remove('hidden');
                
                // Show modal with error message
                showErrorModal(apiError.message);
                return;
            }

            if (typeof gsap !== 'undefined') {
                if (progressTween) progressTween.kill();
                gsap.to(loadingFill, {
                    width: '100%',
                    duration: 0.4,
                    ease: 'power2.out',
                    onComplete: () => {
                        completeGeneration(subject, duration, goal, blocks);
                    }
                });
            } else {
                if (loadingFill) loadingFill.style.width = '100%';
                setTimeout(() => {
                    completeGeneration(subject, duration, goal, blocks);
                }, 400);
            }
        }
    }

    /**
     * Generate plan structure using Gemini API response.
     */
    async function generateLivePlan(apiKey, subject, duration, goal) {
        const goalLabel = GOAL_LABELS[goal] || goal;
        const promptText = `Generate a structured, cognitive science-backed hourly study plan for the topic: "${subject}".
The total duration of the study session is ${duration} hours.
The user's primary focus goal is: "${goalLabel}".

Please construct a detailed study schedule that splits the time into alternating focus (study-block) and break (break-block) segments.
Follow these constraints:
1. Use 25-minute focus blocks (type: "study-block") and 5-minute break blocks (type: "break-block").
2. If the total duration is 4 hours, insert a 15-minute long break (type: "break-block") after 2 hours (instead of a 5-minute break).
3. The final hour must wrap up with active recall and review blocks.
4. For each block, provide a short, punchy, action-oriented "title" (under 40 characters, e.g. "Intro to SQL Joins" or "Stretch & Rehydrate"). This title will be used as the task checklist item name.
5. Each study-block "desc" must be highly customized to the specific sub-topics, tasks, and steps of studying "${subject}" under the goal of "${goalLabel}". Make them actionable, specific, and detailed. Do NOT include placeholders.
6. All durations must be in minutes (integer value). The sum of all block durations must exactly equal the total duration of ${duration * 60} minutes.
7. Alternate focus and break blocks appropriately.`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: promptText
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        blocks: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    type: { type: "string", enum: ["study-block", "break-block"] },
                                    duration: { type: "integer" },
                                    title: { type: "string" },
                                    desc: { type: "string" }
                                },
                                required: ["type", "duration", "title", "desc"]
                            }
                        }
                    },
                    required: ["blocks"]
                }
            }
        };

        const maxRetries = 2;
        let lastError = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const waitTime = attempt * 1500;
                    console.log(`Gemini API busy or rate-limited. Retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = errData.error?.message || `HTTP error ${response.status}`;
                    lastError = new Error(errMsg);
                    
                    // If rate limit (429) or server busy (503), retry. Otherwise throw.
                    if (response.status !== 429 && response.status !== 503) {
                        throw lastError;
                    }
                    continue;
                }

                const resData = await response.json();
                const textResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!textResponse) {
                    throw new Error("No content returned from Gemini API.");
                }

                const parsed = JSON.parse(textResponse);
                if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
                    throw new Error("Invalid format returned from Gemini API.");
                }

                return parsed.blocks; // Success

            } catch (err) {
                lastError = err;
                if (attempt === maxRetries) {
                    throw lastError;
                }
            }
        }

        throw lastError;
    }

    /**
     * Shows a warning modal redirecting the user to Settings to configure their API Key.
     */
    function showSettingsWarningModal() {
        const customModal = document.getElementById('custom-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        let modalIcon = document.getElementById('modal-icon');
        const modalCloseBtn = document.getElementById('modal-close-btn');

        if (!customModal) return;

        modalTitle.textContent = 'API Key Required';
        modalMessage.textContent = 'To generate personalized, high-quality study plans, FocusFlow needs a Gemini API Key. Click below to go to Settings and enter your key.';
        modalCloseBtn.textContent = 'Go to Settings';

        // Swap icon to key
        if (modalIcon) {
            const parent = modalIcon.parentElement;
            if (parent) {
                const newIcon = document.createElement('i');
                newIcon.id = 'modal-icon';
                newIcon.setAttribute('data-lucide', 'key');
                parent.replaceChild(newIcon, modalIcon);
                modalIcon = newIcon;
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }

        customModal.classList.remove('hidden');
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf([customModal, '.modal-card']);
            gsap.set(customModal, { display: 'flex', opacity: 0 });
            gsap.set('.modal-card', { scale: 0.8, opacity: 0 });
            gsap.to(customModal, { opacity: 1, duration: 0.4, ease: 'power2.out' });
            gsap.to('.modal-card', { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' });
        }

        const onGoToSettings = () => {
            const settingsNavItem = document.querySelector('.sidebar-nav .nav-item[data-view="settings"]');
            if (settingsNavItem) {
                settingsNavItem.click();
            }
            closeAndCleanup();
        };

        const closeAndCleanup = () => {
            modalCloseBtn.textContent = 'Continue';
            modalCloseBtn.removeEventListener('click', onGoToSettings);
            modalCloseBtn.removeEventListener('click', closeAndCleanup);
            customModal.removeEventListener('click', closeOnOverlayClick);
        };

        const closeOnOverlayClick = (e) => {
            if (e.target === customModal) {
                closeAndCleanup();
            }
        };

        modalCloseBtn.addEventListener('click', onGoToSettings);
        modalCloseBtn.addEventListener('click', closeAndCleanup);
        customModal.addEventListener('click', closeOnOverlayClick);
    }

    /**
     * Shows an error modal when study plan generation fails.
     */
    function showErrorModal(errorMessage, type = 'plan') {
        const customModal = document.getElementById('custom-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        let modalIcon = document.getElementById('modal-icon');
        const modalCloseBtn = document.getElementById('modal-close-btn');

        if (!customModal) return;

        modalTitle.textContent = 'Generation Failed';
        const contextStr = type === 'plan' ? 'generate your study plan' : 'generate your study aids (flashcards/quiz)';
        
        const isRateLimit = errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('429');
        let extraInfo = '';
        if (isRateLimit) {
            extraInfo = `<br><br><div style="padding: 12px; background: rgba(239, 68, 68, 0.12); border-left: 3px solid #ef4444; border-radius: 4px; font-size: 0.85rem; text-align: left; line-height: 1.4;"><strong>💡 Rate Limit Note:</strong> You have hit the Gemini API Free Tier rate limit (limit: 20 requests/minute). Please wait about 60 seconds before trying again to let the quota reset.</div>`;
        }
        
        modalMessage.innerHTML = `FocusFlow was unable to ${contextStr}.<br><br><span style="opacity: 0.85; font-size: 0.9rem;"><strong>Error details:</strong> ${escapeHtml(errorMessage)}</span>${extraInfo}`;
        modalCloseBtn.textContent = 'Close';

        // Swap icon to alert-triangle
        if (modalIcon) {
            const parent = modalIcon.parentElement;
            if (parent) {
                const newIcon = document.createElement('i');
                newIcon.id = 'modal-icon';
                newIcon.setAttribute('data-lucide', 'alert-triangle');
                parent.replaceChild(newIcon, modalIcon);
                modalIcon = newIcon;
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }

        customModal.classList.remove('hidden');
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf([customModal, '.modal-card']);
            gsap.set(customModal, { display: 'flex', opacity: 0 });
            gsap.set('.modal-card', { scale: 0.8, opacity: 0 });
            gsap.to(customModal, { opacity: 1, duration: 0.4, ease: 'power2.out' });
            gsap.to('.modal-card', { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' });
        }

        const closeAndCleanup = () => {
            modalCloseBtn.textContent = 'Continue';
            modalCloseBtn.removeEventListener('click', closeAndCleanup);
            customModal.removeEventListener('click', closeOnOverlayClick);
        };

        const closeOnOverlayClick = (e) => {
            if (e.target === customModal) {
                closeAndCleanup();
            }
        };

        modalCloseBtn.addEventListener('click', closeAndCleanup);
        customModal.addEventListener('click', closeOnOverlayClick);
    }

    /**
     * Processes live AI results, saves plan, and triggers staggered rendering.
     */
    function completeGeneration(subject, duration, goal, apiBlocks) {
        let currentTime = new Date();
        // Round current minutes up to the nearest 5-minute mark for clean visual timelines
        const roundedMinutes = Math.ceil(currentTime.getMinutes() / 5) * 5;
        currentTime.setMinutes(roundedMinutes);
        currentTime.setSeconds(0);

        const blocks = apiBlocks.map((block, index) => {
            const startTimeStr = formatTime(currentTime);
            currentTime = addMinutes(currentTime, block.duration);
            const endTimeStr = formatTime(currentTime);

            return {
                id: `block-${index + 1}`,
                type: block.type,
                duration: block.duration,
                time: `${startTimeStr} - ${endTimeStr}`,
                title: block.title || (block.type === 'study-block' ? 'Study Focus Session' : 'Short Break'),
                desc: block.desc,
                completed: false,
                isTaskAdded: false
            };
        });

        const plan = {
            subject: subject,
            duration: duration,
            goal: goal,
            blocks: blocks,
            date: new Date().toISOString().split('T')[0] // Local calendar mapping date
        };

        localStorage.setItem('focusflow-ai-plan', JSON.stringify(plan));

        loadingPanel.classList.add('hidden');
        renderPlan(plan);
        outputPanel.classList.remove('hidden');

        // Stagger fade-in animation for timeline items
        if (typeof gsap !== 'undefined') {
            gsap.fromTo('.ai-timeline-item', 
                { opacity: 0, x: -15 }, 
                { opacity: 1, x: 0, duration: 0.35, stagger: 0.08, ease: 'power2.out' }
            );
        }
    }

    /**
     * Clears study plan state and returns to input form.
     */
    function resetPlan() {
        localStorage.removeItem('focusflow-ai-plan');
        if (subjectInput) {
            subjectInput.value = '';
        }

        // Notify timer to clear any custom synced title/duration
        const clearEvent = new CustomEvent('clearCustomTimerTitle');
        document.dispatchEvent(clearEvent);

        outputPanel.classList.add('hidden');
        inputPanel.classList.remove('hidden');

        if (typeof gsap !== 'undefined') {
            gsap.fromTo(inputPanel, 
                { opacity: 0, y: 10 }, 
                { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
            );
        }
    }

    /**
     * Renders plan info, statistics, progress tracker, and timelines.
     */
    function getBlockIcon(title, type) {
        const lower = title.toLowerCase();
        if (type === 'break-block' || lower.includes('break') || lower.includes('rest') || lower.includes('stretch') || lower.includes('coffee') || lower.includes('rehydrate')) {
            return 'coffee';
        }
        if (lower.includes('intro') || lower.includes('concept') || lower.includes('read') || lower.includes('learn') || lower.includes('understand')) {
            return 'book-open';
        }
        if (lower.includes('practice') || lower.includes('exercise') || lower.includes('problem') || lower.includes('solve') || lower.includes('write')) {
            return 'pen-tool';
        }
        if (lower.includes('recall') || lower.includes('review') || lower.includes('quiz') || lower.includes('test') || lower.includes('exam')) {
            return 'brain';
        }
        return type === 'study-block' ? 'book-open' : 'coffee';
    }

    function getCognitiveLoad(title, type) {
        if (type === 'break-block') return 0;
        const lower = title.toLowerCase();
        if (lower.includes('hard') || lower.includes('difficult') || lower.includes('complex') || lower.includes('advanced') || lower.includes('solve') || lower.includes('challenge') || lower.includes('exam')) {
            return 3;
        }
        if (lower.includes('intro') || lower.includes('basic') || lower.includes('warm') || lower.includes('outline')) {
            return 1;
        }
        return 2;
    }

    /**
     * Renders plan info, statistics, progress tracker, and timelines.
     */
    function renderPlan(plan) {
        if (!outputTitle || !outputSubtitle || !timelineList) return;

        // Set metadata
        outputTitle.textContent = plan.subject;
        const durationStr = plan.duration === 1 ? "1 Hour" : `${plan.duration} Hours`;
        const goalLabel = GOAL_LABELS[plan.goal] || plan.goal;
        outputSubtitle.textContent = `${durationStr} • ${goalLabel}`;

        // Build list
        timelineList.innerHTML = '';

        plan.blocks.forEach((block, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `ai-timeline-item ${block.type} ${block.completed ? 'completed' : ''}`;
            itemDiv.setAttribute('data-id', block.id);

            const iconName = getBlockIcon(block.title, block.type);
            const loadScore = getCognitiveLoad(block.title, block.type);
            let loadHtml = '';
            if (loadScore > 0) {
                const brains = '🧠'.repeat(loadScore);
                const empty = '⚪'.repeat(3 - loadScore);
                loadHtml = `
                    <div class="ai-item-load-group" title="Mental Effort Rating">
                        <span>Load:</span>
                        <span class="ai-item-load-brains">${brains}</span><span style="opacity: 0.35;">${empty}</span>
                    </div>
                `;
            }

            // Timeline items get checked state
            itemDiv.innerHTML = `
                <div class="ai-item-bullet-icon">
                    <i data-lucide="${iconName}"></i>
                </div>
                <label class="ai-item-content">
                    <input type="checkbox" class="ai-item-checkbox" ${block.completed ? 'checked' : ''}>
                    <span class="ai-item-check-custom"></span>
                    <div class="ai-item-details">
                        <span class="ai-item-time">${block.time}</span>
                        <div class="ai-item-title">${escapeHtml(block.title)}</div>
                        <span class="ai-item-desc">${escapeHtml(block.desc)}</span>
                        ${loadHtml}
                    </div>
                </label>
                <div class="ai-item-actions-group">
                    <button class="ai-item-action-btn ai-item-sync-btn" title="Sync to Timer">
                        <i data-lucide="play-circle"></i>
                    </button>
                    ${block.type === 'study-block' ? `
                        <button class="ai-item-action-btn ai-item-helper-btn" title="Active Recall Helper">
                            <i data-lucide="sparkles"></i>
                        </button>
                        <button class="ai-item-action-btn ai-item-add-task-btn ${block.isTaskAdded ? 'added' : ''}" title="${block.isTaskAdded ? 'Added to Tasks' : 'Add to Tasks'}">
                            <i data-lucide="${block.isTaskAdded ? 'check' : 'plus'}"></i>
                        </button>
                    ` : ''}
                </div>
            `;

            // Checkbox logic
            const checkbox = itemDiv.querySelector('.ai-item-checkbox');
            checkbox.addEventListener('change', () => {
                block.completed = checkbox.checked;
                if (block.completed) {
                    itemDiv.classList.add('completed');
                    // Notify timer to pause if this is the active study block
                    console.log('[Plan Debug] checkbox checked, dispatching studyBlockCompletedEarly for:', block.title);
                    const earlyEvent = new CustomEvent('studyBlockCompletedEarly', {
                        detail: { title: block.title }
                    });
                    document.dispatchEvent(earlyEvent);
                } else {
                    itemDiv.classList.remove('completed');
                }
                updateProgressIndicator(plan);
                localStorage.setItem('focusflow-ai-plan', JSON.stringify(plan));

                // Dispatch event to sync completion state with Task Manager if task was added
                if (block.type === 'study-block') {
                    const event = new CustomEvent('setTaskCompletion', {
                        detail: {
                            text: `[${plan.subject}] ${block.title || block.desc}`,
                            completed: checkbox.checked
                        }
                    });
                    document.dispatchEvent(event);
                }
            });

            // Sync to Timer logic
            const syncBtn = itemDiv.querySelector('.ai-item-sync-btn');
            if (syncBtn) {
                syncBtn.addEventListener('click', () => {
                    const blockDuration = block.duration || getDurationFromTimeStr(block.time, block.type);
                    const syncEvent = new CustomEvent('syncTimerPreset', {
                        detail: {
                            title: block.title,
                            duration: blockDuration
                        }
                    });
                    document.dispatchEvent(syncEvent);

                    if (typeof gsap !== 'undefined') {
                        gsap.fromTo(syncBtn, { scale: 0.8 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
                    }

                    // Navigate to timer tab
                    const timerNavItem = document.querySelector('.sidebar-nav .nav-item[data-view="timer"]');
                    if (timerNavItem) {
                        timerNavItem.click();
                    }
                });
            }

            // Study Helper button logic
            if (block.type === 'study-block') {
                const helperBtn = itemDiv.querySelector('.ai-item-helper-btn');
                if (helperBtn) {
                    helperBtn.addEventListener('click', () => {
                        openStudyHelper(plan.subject, block);
                    });
                }
            }

            // Add to Tasks button logic
            if (block.type === 'study-block') {
                const addTaskBtn = itemDiv.querySelector('.ai-item-add-task-btn');
                addTaskBtn.addEventListener('click', () => {
                    if (addTaskBtn.classList.contains('added')) return;

                    // Read the latest plan from localStorage to avoid stale closure references
                    const stored = localStorage.getItem('focusflow-ai-plan');
                    if (stored) {
                        try {
                            const latestPlan = JSON.parse(stored);
                            const latestBlock = latestPlan.blocks.find(b => b.id === block.id);
                            if (latestBlock) {
                                latestBlock.isTaskAdded = true;
                                localStorage.setItem('focusflow-ai-plan', JSON.stringify(latestPlan));
                            }
                        } catch (err) {
                            console.error("Failed to update isTaskAdded in localStorage plan", err);
                        }
                    }

                    // Trigger Task Manager addition event
                    const customTaskText = `[${plan.subject}] ${block.title || block.desc}`;
                    console.log("plan.js dispatching createTask event:", customTaskText);
                    const event = new CustomEvent('createTask', {
                        detail: { text: customTaskText }
                    });
                    document.dispatchEvent(event);

                    // Update button view
                    addTaskBtn.classList.add('added');
                    addTaskBtn.setAttribute('title', 'Added to Tasks');
                    addTaskBtn.innerHTML = `<i data-lucide="check"></i>`;
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons({
                            attrs: { class: ['lucide-icon'] },
                            nameAttr: 'data-lucide',
                            nodeList: [addTaskBtn.querySelector('i')]
                        });
                    }
                });
            }

            timelineList.appendChild(itemDiv);
        });

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({
                attrs: {
                    class: ['lucide-icon']
                },
                nameAttr: 'data-lucide',
                nodeList: timelineList.querySelectorAll('[data-lucide]')
            });
        }

        updateProgressIndicator(plan);
    }

    /**
     * Calculates completion percent and updates the header progress bar.
     */
    function updateProgressIndicator(plan) {
        if (!progressPercent || !progressFill) return;

        const total = plan.blocks.length;
        if (total === 0) {
            progressPercent.textContent = '0%';
            progressFill.style.width = '0%';
            return;
        }

        const completed = plan.blocks.filter(b => b.completed).length;
        const percent = Math.round((completed / total) * 100);

        progressPercent.textContent = `${percent}%`;
        progressFill.style.width = `${percent}%`;
    }

    /**
     * Core Algorithm: Generates structured timeline intervals based on subject and options.
     */
    function generatePlanBlocks(subject, durationHours, goal) {
        const blocks = [];
        const studyTemplates = {
            concepts: [
                "Master the fundamental definitions, terminology, and core formulas of [Subject].",
                "Deconstruct the logical structure of [Subject] and map its main components.",
                "Differentiate between closely related concepts in [Subject] with concrete examples.",
                "Feynman Technique: Explain the main concept of [Subject] out loud as if teaching a beginner.",
                "Analyze common misconceptions and edge cases in [Subject].",
                "Synthesize the concepts of [Subject] by drawing a mental mind map.",
                "Test yourself on the conceptual hierarchy of [Subject] using active recall.",
                "Summarize the overarching concept of [Subject] in a single comprehensive sentence."
            ],
            practice: [
                "Warm up: Solve 3 basic or introductory practice problems on [Subject].",
                "Work through medium-difficulty exercises for [Subject], detailing each step.",
                "Challenge yourself with a complex, multi-step problem on [Subject].",
                "Analyze the solution steps of previously solved [Subject] problems to find patterns.",
                "Time block: Solve a set of [Subject] questions under a strict 20-minute limit.",
                "Review incorrect answers and write down the exact logic error for each.",
                "Work on coding, scripting, or practical implementation tasks for [Subject].",
                "Perform a final review of the core rules and heuristics used in [Subject] exercises."
            ],
            notes: [
                "Active reading: Scan textbook or lecture slides on [Subject] and highlight key terms.",
                "Synthesize notes: Translate highlighted parts of [Subject] into your own words.",
                "Organize structure: Create a hierarchical outline of your [Subject] notes.",
                "Visual learning: Draw a diagram, chart, or timeline representing [Subject].",
                "Flashcard prep: Write 10 question-and-answer pairs based on your [Subject] notes.",
                "Condense notes: Summarize each major section of [Subject] into a single bullet point.",
                "Review notes: Quiz yourself using the flashcards you created for [Subject].",
                "Final synthesis: Compile a 1-page cheatsheet of the most critical [Subject] facts."
            ],
            exam: [
                "Syllabus check: Identify and rank the highest-yield exam topics for [Subject].",
                "Timed drill: Solve a past exam section or quiz on [Subject] without looking at notes.",
                "Diagnostic review: Correct your timed drill and identify weak areas in [Subject].",
                "Targeted revision: Re-read explanations for the questions you got wrong on [Subject].",
                "Formula review: Write down all key formulas and equations for [Subject] from memory.",
                "Second timed drill: Solve 5 high-difficulty exam questions on [Subject].",
                "Active recall: Quiz yourself on the definitions and exceptions likely to appear on [Subject] exam.",
                "Exam strategy: Review time-management strategy and common pitfalls for the [Subject] test."
            ]
        };

        const breakTemplates = [
            "Short Break: Stand up, stretch, and grab a glass of water.",
            "Short Break: Close your eyes, breathe deeply, and relax your mind.",
            "Short Break: Move away from your screen. Let your brain consolidate the information.",
            "Short Break: Quick walk or physical stretching to keep blood flowing.",
            "Short Break: Breathe deeply and step away from your workspace."
        ];

        const longBreakTemplate = "Long Break: Step away for a walk, have a healthy snack, or drink tea. Active recovery.";

        let currentTime = new Date();
        // Round current minutes up to the nearest 5-minute mark for clean visual timelines
        const roundedMinutes = Math.ceil(currentTime.getMinutes() / 5) * 5;
        currentTime.setMinutes(roundedMinutes);
        currentTime.setSeconds(0);

        const templates = studyTemplates[goal] || studyTemplates.concepts;
        let studyIndex = 0;

        for (let hour = 1; hour <= durationHours; hour++) {
            // Focus Block 1 (25 mins)
            let startTimeStr = formatTime(currentTime);
            currentTime = addMinutes(currentTime, 25);
            let endTimeStr = formatTime(currentTime);
            blocks.push({
                id: `block-${hour}-1`,
                type: 'study-block',
                duration: 25,
                time: `${startTimeStr} - ${endTimeStr}`,
                title: 'Study Focus Session',
                desc: templates[studyIndex % templates.length].replace('[Subject]', subject),
                completed: false,
                isTaskAdded: false
            });
            studyIndex++;

            // Break / Secondary Study blocks
            if (hour === durationHours) {
                // Final Hour Special Structure: wraps up with review
                // 5 min break
                startTimeStr = formatTime(currentTime);
                currentTime = addMinutes(currentTime, 5);
                endTimeStr = formatTime(currentTime);
                blocks.push({
                    id: `block-${hour}-2`,
                    type: 'break-block',
                    duration: 5,
                    time: `${startTimeStr} - ${endTimeStr}`,
                    title: 'Short Break',
                    desc: breakTemplates[hour % breakTemplates.length],
                    completed: false
                });

                // 20 min active study
                startTimeStr = formatTime(currentTime);
                currentTime = addMinutes(currentTime, 20);
                endTimeStr = formatTime(currentTime);
                blocks.push({
                    id: `block-${hour}-3`,
                    type: 'study-block',
                    duration: 20,
                    time: `${startTimeStr} - ${endTimeStr}`,
                    title: 'Active Recall Session',
                    desc: `Active Recall: Self-test and summarize key takeaways from today's study of ${subject}.`,
                    completed: false,
                    isTaskAdded: false
                });

                // 10 min final review
                startTimeStr = formatTime(currentTime);
                currentTime = addMinutes(currentTime, 10);
                endTimeStr = formatTime(currentTime);
                blocks.push({
                    id: `block-${hour}-4`,
                    type: 'study-block',
                    duration: 10,
                    time: `${startTimeStr} - ${endTimeStr}`,
                    title: 'Final Review',
                    desc: `Final Review: Organize notes and list next study steps for ${subject}.`,
                    completed: false,
                    isTaskAdded: false
                });
            } else {
                // Normal Intermediate Hours
                // 5 min break
                startTimeStr = formatTime(currentTime);
                currentTime = addMinutes(currentTime, 5);
                endTimeStr = formatTime(currentTime);
                blocks.push({
                    id: `block-${hour}-2`,
                    type: 'break-block',
                    duration: 5,
                    time: `${startTimeStr} - ${endTimeStr}`,
                    title: 'Short Break',
                    desc: breakTemplates[hour % breakTemplates.length],
                    completed: false
                });

                // 25 min study
                startTimeStr = formatTime(currentTime);
                currentTime = addMinutes(currentTime, 25);
                endTimeStr = formatTime(currentTime);
                blocks.push({
                    id: `block-${hour}-3`,
                    type: 'study-block',
                    duration: 25,
                    time: `${startTimeStr} - ${endTimeStr}`,
                    title: 'Study Focus Session',
                    desc: templates[studyIndex % templates.length].replace('[Subject]', subject),
                    completed: false,
                    isTaskAdded: false
                });
                studyIndex++;

                // End of hour break
                if (hour === 2 && durationHours === 4) {
                    // Cognitive science long break after 2 hours for 4-hour sessions
                    startTimeStr = formatTime(currentTime);
                    currentTime = addMinutes(currentTime, 15);
                    endTimeStr = formatTime(currentTime);
                    blocks.push({
                        id: `block-${hour}-4`,
                        type: 'break-block',
                        duration: 15,
                        time: `${startTimeStr} - ${endTimeStr}`,
                        title: 'Long Break',
                        desc: longBreakTemplate,
                        completed: false
                    });
                } else {
                    startTimeStr = formatTime(currentTime);
                    currentTime = addMinutes(currentTime, 5);
                    endTimeStr = formatTime(currentTime);
                    blocks.push({
                        id: `block-${hour}-4`,
                        type: 'break-block',
                        duration: 5,
                        time: `${startTimeStr} - ${endTimeStr}`,
                        title: 'Short Break',
                        desc: breakTemplates[(hour + 1) % breakTemplates.length],
                        completed: false
                    });
                }
            }
        }

        return blocks;
    }

    /**
     * Date Formatting Helper
     */
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const mins = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${mins}`;
    }

    /**
     * Date Increment Helper
     */
    function addMinutes(date, mins) {
        return new Date(date.getTime() + mins * 60000);
    }    /**
     * Synchronizes study block status (completion and isTaskAdded) with the actual Task Manager data in localStorage.
     */
    function syncPlanTasksWithTasksList() {
        const storedPlan = localStorage.getItem('focusflow-ai-plan');
        if (!storedPlan) return;

        try {
            const plan = JSON.parse(storedPlan);
            const storedTasks = localStorage.getItem('focusflow-tasks');
            let tasksList = [];
            if (storedTasks) {
                tasksList = JSON.parse(storedTasks);
            }

            let planChanged = false;
            plan.blocks.forEach(block => {
                if (block.type === 'study-block') {
                    const taskText = `[${plan.subject}] ${block.title || block.desc}`;
                    const matchingTask = tasksList.find(t => t.text.trim() === taskText.trim());
                    const exists = !!matchingTask;

                    // Sync task added state
                    if (block.isTaskAdded !== exists) {
                        block.isTaskAdded = exists;
                        planChanged = true;
                    }

                    // Sync completion state (bidirectional task checkbox sync)
                    if (exists && block.completed !== matchingTask.completed) {
                        block.completed = matchingTask.completed;
                        planChanged = true;
                        
                        // Notify timer to pause if this is the active study block and was checked off
                        if (block.completed) {
                            console.log('[Plan Debug] Task list synced completion, dispatching studyBlockCompletedEarly for:', block.title);
                            const earlyEvent = new CustomEvent('studyBlockCompletedEarly', {
                                detail: { title: block.title }
                            });
                            document.dispatchEvent(earlyEvent);
                        }
                    }
                }
            });

            if (planChanged) {
                localStorage.setItem('focusflow-ai-plan', JSON.stringify(plan));
            }

            // Always synchronize the DOM states to match the current plan state
            syncPlanDOMStates(plan);
        } catch (e) {
            console.error("Failed to sync plan tasks with task list", e);
        }
    }

    /**
     * Dynamically updates the checkboxes and buttons inside the timeline without a full re-render.
     */
    function syncPlanDOMStates(plan) {
        plan.blocks.forEach(block => {
            const itemEl = document.querySelector(`.ai-timeline-item[data-id="${block.id}"]`);
            if (itemEl) {
                // 1. Sync completion checkbox and class
                const checkbox = itemEl.querySelector('.ai-item-checkbox');
                if (checkbox) {
                    if (checkbox.checked !== block.completed) {
                        checkbox.checked = block.completed;
                    }
                }

                if (block.completed) {
                    itemEl.classList.add('completed');
                } else {
                    itemEl.classList.remove('completed');
                }

                // 2. Sync 'Add to Tasks' button
                if (block.type === 'study-block') {
                    const button = itemEl.querySelector('.ai-item-add-task-btn');
                    if (button) {
                        const isAdded = block.isTaskAdded;
                        if (isAdded) {
                            if (!button.classList.contains('added')) {
                                button.classList.add('added');
                                button.setAttribute('title', 'Added to Tasks');
                                button.innerHTML = `<i data-lucide="check"></i>`;
                                if (typeof lucide !== 'undefined') {
                                    lucide.createIcons({
                                        attrs: { class: ['lucide-icon'] },
                                        nameAttr: 'data-lucide',
                                        nodeList: [button.querySelector('i')]
                                    });
                                }
                            }
                        } else {
                            if (button.classList.contains('added')) {
                                button.classList.remove('added');
                                button.setAttribute('title', 'Add to Tasks');
                                button.innerHTML = `<i data-lucide="plus"></i>`;
                                if (typeof lucide !== 'undefined') {
                                    lucide.createIcons({
                                        attrs: { class: ['lucide-icon'] },
                                        nameAttr: 'data-lucide',
                                        nodeList: [button.querySelector('i')]
                                    });
                                }
                            }
                        }
                    }
                }
            }
        });

        // Update the overall progress indicator bar
        updateProgressIndicator(plan);
    } 

    /**
     * HTML escaping utility to prevent XSS.
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    // Helper Modal State Variables
    let activeBlock = null;
    let activeSubject = "";
    let recallData = null;
    let currentFlashcardIdx = 0;
    let currentQuizIdx = 0;
    let quizScore = 0;
    let hasAnsweredQuiz = false;

    function openStudyHelper(subject, block) {
        activeBlock = block;
        activeSubject = subject;

        const modal = document.getElementById('ai-helper-modal');
        const closeBtn = document.getElementById('ai-helper-close-btn');
        const loadingIndicator = document.getElementById('ai-helper-loading');
        const tabsNav = document.querySelector('.ai-helper-tabs');
        const tabFlashcards = document.getElementById('helper-tab-flashcards');
        const tabQuiz = document.getElementById('helper-tab-quiz');

        if (!modal) return;

        // Reset state
        currentFlashcardIdx = 0;
        currentQuizIdx = 0;
        quizScore = 0;
        hasAnsweredQuiz = false;
        
        // Reset card flip
        const card = document.getElementById('flashcard-card');
        if (card) card.classList.remove('flipped');

        // Setup Close Event
        const closeModal = () => {
            modal.classList.add('hidden');
            activeBlock = null;
        };
        closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        // Tab Switching Event
        const tabBtns = document.querySelectorAll('.helper-tab-btn');
        tabBtns.forEach(btn => {
            btn.onclick = () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const targetTab = btn.getAttribute('data-tab');
                if (targetTab === 'flashcards') {
                    tabFlashcards.classList.remove('hidden');
                    tabQuiz.classList.add('hidden');
                } else {
                    tabFlashcards.classList.add('hidden');
                    tabQuiz.classList.remove('hidden');
                }
            };
        });

        // Click-to-flip Event
        if (card) {
            card.onclick = () => {
                card.classList.toggle('flipped');
            };
        }

        // Show Modal
        modal.classList.remove('hidden');
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf([modal, '.ai-helper-card']);
            gsap.set(modal, { display: 'flex', opacity: 0 });
            gsap.set('.ai-helper-card', { scale: 0.85, opacity: 0 });
            gsap.to(modal, { opacity: 1, duration: 0.4, ease: 'power2.out' });
            gsap.to('.ai-helper-card', { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.5)' });
        }

        // Check if data is already cached
        if (block.recallData) {
            recallData = block.recallData;
            loadingIndicator.classList.add('hidden');
            tabsNav.classList.remove('hidden');
            // Show default active tab (flashcards)
            tabBtns[0].click();
            renderFlashcards();
            startQuiz();
        } else {
            // Check for API Key
            const apiKey = localStorage.getItem('focusflow-gemini-key');
            if (!apiKey) {
                modal.classList.add('hidden');
                showSettingsWarningModal();
                return;
            }

            // Show Loading
            loadingIndicator.classList.remove('hidden');
            tabsNav.classList.add('hidden');
            tabFlashcards.classList.add('hidden');
            tabQuiz.classList.add('hidden');

            fetchRecallAids(apiKey, subject, block.title, block.desc)
                .then(data => {
                    recallData = data;
                    
                    // Cache in current block
                    block.recallData = data;
                    
                    // Save plan back to LocalStorage
                    const stored = localStorage.getItem('focusflow-ai-plan');
                    if (stored) {
                        try {
                            const currentPlan = JSON.parse(stored);
                            const currentBlock = currentPlan.blocks.find(b => b.id === block.id);
                            if (currentBlock) {
                                currentBlock.recallData = data;
                                localStorage.setItem('focusflow-ai-plan', JSON.stringify(currentPlan));
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    }

                    // Render
                    loadingIndicator.classList.add('hidden');
                    tabsNav.classList.remove('hidden');
                    tabBtns[0].click();
                    renderFlashcards();
                    startQuiz();
                })
                .catch(err => {
                    console.error("AI Assistant study aid generation failed", err);
                    loadingIndicator.classList.add('hidden');
                    modal.classList.add('hidden');
                    showErrorModal(err.message || "Failed to connect to the Gemini API.", 'helper');
                });
        }
    }

    function renderFlashcards() {
        if (!recallData || !recallData.flashcards || recallData.flashcards.length === 0) return;

        const card = document.getElementById('flashcard-card');
        const frontText = document.getElementById('flashcard-front-text');
        const backText = document.getElementById('flashcard-back-text');
        const counter = document.getElementById('flashcard-counter');
        const prevBtn = document.getElementById('flashcard-prev-btn');
        const nextBtn = document.getElementById('flashcard-next-btn');

        if (!frontText || !backText) return;

        // Reset flip state
        if (card) card.classList.remove('flipped');

        const activeCard = recallData.flashcards[currentFlashcardIdx];
        frontText.textContent = activeCard.front;
        backText.textContent = activeCard.back;
        
        if (counter) {
            counter.textContent = `${currentFlashcardIdx + 1} / ${recallData.flashcards.length}`;
        }

        prevBtn.onclick = (e) => {
            e.stopPropagation();
            if (currentFlashcardIdx > 0) {
                currentFlashcardIdx--;
                renderFlashcards();
            }
        };

        nextBtn.onclick = (e) => {
            e.stopPropagation();
            if (currentFlashcardIdx < recallData.flashcards.length - 1) {
                currentFlashcardIdx++;
                renderFlashcards();
            }
        };
    }

    function startQuiz() {
        if (!recallData || !recallData.quiz || recallData.quiz.length === 0) return;

        currentQuizIdx = 0;
        quizScore = 0;
        hasAnsweredQuiz = false;

        // Reset Results block
        const resultsBox = document.getElementById('quiz-results-box');
        if (resultsBox) resultsBox.classList.add('hidden');

        // Show Quiz progress and question box
        const progressFill = document.getElementById('quiz-progress-fill');
        const questionCounter = document.getElementById('quiz-question-counter');
        const scoreCounter = document.getElementById('quiz-score-counter');
        const questionText = document.getElementById('quiz-question-text');
        const optionsList = document.getElementById('quiz-options-list');
        const feedbackBox = document.getElementById('quiz-feedback-box');

        if (questionCounter) questionCounter.classList.remove('hidden');
        if (scoreCounter) scoreCounter.classList.remove('hidden');
        if (progressFill) progressFill.parentElement.classList.remove('hidden');
        if (questionText) questionText.classList.remove('hidden');
        if (optionsList) optionsList.classList.remove('hidden');
        if (feedbackBox) feedbackBox.classList.add('hidden');

        renderQuizQuestion();
    }

    function renderQuizQuestion() {
        const progressFill = document.getElementById('quiz-progress-fill');
        const questionCounter = document.getElementById('quiz-question-counter');
        const scoreCounter = document.getElementById('quiz-score-counter');
        const questionText = document.getElementById('quiz-question-text');
        const optionsList = document.getElementById('quiz-options-list');
        const feedbackBox = document.getElementById('quiz-feedback-box');

        if (!recallData || !recallData.quiz || !optionsList) return;

        hasAnsweredQuiz = false;
        feedbackBox.classList.add('hidden');

        const activeQ = recallData.quiz[currentQuizIdx];
        
        // Set stats
        if (questionCounter) questionCounter.textContent = `Question ${currentQuizIdx + 1} of ${recallData.quiz.length}`;
        if (scoreCounter) scoreCounter.textContent = `Score: ${quizScore}/${currentQuizIdx}`;
        if (progressFill) {
            const pct = ((currentQuizIdx + 1) / recallData.quiz.length) * 100;
            progressFill.style.width = `${pct}%`;
        }

        if (questionText) questionText.textContent = activeQ.question;

        // Render Options
        optionsList.innerHTML = '';
        activeQ.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => {
                selectQuizOption(idx, btn);
            });
            optionsList.appendChild(btn);
        });
    }

    function selectQuizOption(selectedIdx, selectedBtn) {
        if (hasAnsweredQuiz) return;
        hasAnsweredQuiz = true;

        const activeQ = recallData.quiz[currentQuizIdx];
        const isCorrect = (selectedIdx === activeQ.correctIdx);
        if (isCorrect) {
            quizScore++;
        }

        const optionsList = document.getElementById('quiz-options-list');
        const optionBtns = optionsList.querySelectorAll('.quiz-option-btn');
        optionBtns.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === activeQ.correctIdx) {
                btn.classList.add('correct');
            } else if (idx === selectedIdx) {
                btn.classList.add('incorrect');
            }
        });

        // Feedback Block
        const feedbackBox = document.getElementById('quiz-feedback-box');
        const feedbackTitle = document.getElementById('feedback-title');
        const feedbackIcon = document.getElementById('feedback-icon');
        const explanationText = document.getElementById('quiz-explanation-text');
        const nextQuizBtn = document.getElementById('quiz-next-btn');

        if (feedbackBox) {
            feedbackBox.className = `quiz-feedback-box ${isCorrect ? 'correct' : 'incorrect'}`;
            if (feedbackTitle) feedbackTitle.textContent = isCorrect ? 'Correct!' : 'Incorrect';
            if (feedbackIcon) {
                feedbackIcon.setAttribute('data-lucide', isCorrect ? 'check-circle-2' : 'x-circle');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
            if (explanationText) explanationText.textContent = activeQ.explanation;
            
            feedbackBox.classList.remove('hidden');

            nextQuizBtn.onclick = () => {
                nextQuizQuestion();
            };
        }
    }

    function nextQuizQuestion() {
        if (currentQuizIdx < recallData.quiz.length - 1) {
            currentQuizIdx++;
            renderQuizQuestion();
        } else {
            showQuizResults();
        }
    }

    function showQuizResults() {
        const progressFill = document.getElementById('quiz-progress-fill');
        const questionCounter = document.getElementById('quiz-question-counter');
        const scoreCounter = document.getElementById('quiz-score-counter');
        const questionText = document.getElementById('quiz-question-text');
        const optionsList = document.getElementById('quiz-options-list');
        const feedbackBox = document.getElementById('quiz-feedback-box');

        const resultsBox = document.getElementById('quiz-results-box');
        const finalScore = document.getElementById('quiz-final-score');
        const resultsFeedback = document.getElementById('quiz-results-feedback');
        const restartBtn = document.getElementById('quiz-restart-btn');

        // Hide normal quiz UI
        if (questionCounter) questionCounter.classList.add('hidden');
        if (scoreCounter) scoreCounter.classList.add('hidden');
        if (progressFill) progressFill.parentElement.classList.add('hidden');
        if (questionText) questionText.classList.add('hidden');
        if (optionsList) optionsList.classList.add('hidden');
        if (feedbackBox) feedbackBox.classList.add('hidden');

        // Render Results
        if (resultsBox) {
            if (finalScore) finalScore.textContent = `You scored ${quizScore} out of ${recallData.quiz.length}`;
            
            let msg = "";
            if (quizScore === recallData.quiz.length) {
                msg = "Flawless score! You have completely mastered this study block. Keep up this amazing standard! 🏆";
            } else if (quizScore >= 2) {
                msg = "Great effort! You have a solid grasp on these concepts, but a quick review could yield perfection. 🧠";
            } else {
                msg = "A decent attempt! Re-read the notes or concepts for this session and try the quiz again to lock in your memory. 📚";
            }
            if (resultsFeedback) resultsFeedback.textContent = msg;

            resultsBox.classList.remove('hidden');

            restartBtn.onclick = () => {
                startQuiz();
            };
        }
    }

    async function fetchRecallAids(apiKey, subject, blockTitle, blockDesc) {
        const promptText = `For the study topic "${subject}" and the specific sub-block session "${blockTitle}" (Description: "${blockDesc}"), generate exactly:
1. Three (3) active recall flashcards (each having "front" for the concept/question, and "back" for the explanation/answer).
2. Three (3) multiple choice quiz questions (each having "question", "options" array of 4 strings, "correctIdx" integer 0-3, and "explanation" explaining why the correct choice is right).

Please return the results as a single JSON object. Follow this strict schema:
{
  "flashcards": [
    { "front": "string", "back": "string" }
  ],
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctIdx": 0,
      "explanation": "string"
    }
  ]
}`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: promptText
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        flashcards: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    front: { type: "string" },
                                    back: { type: "string" }
                                },
                                required: ["front", "back"]
                            }
                        },
                        quiz: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    question: { type: "string" },
                                    options: {
                                        type: "array",
                                        items: { type: "string" }
                                    },
                                    correctIdx: { type: "integer" },
                                    explanation: { type: "string" }
                                },
                                required: ["question", "options", "correctIdx", "explanation"]
                            }
                        }
                    },
                    required: ["flashcards", "quiz"]
                }
            }
        };

        const maxRetries = 2;
        let lastError = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const waitTime = attempt * 1500;
                    console.log(`Gemini API busy or rate-limited. Retrying study aids in ${waitTime}ms (attempt ${attempt}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = errData.error?.message || `HTTP error ${response.status}`;
                    lastError = new Error(errMsg);
                    
                    // If rate limit (429) or server busy (503), retry. Otherwise throw.
                    if (response.status !== 429 && response.status !== 503) {
                        throw lastError;
                    }
                    continue;
                }

                const resData = await response.json();
                const textResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!textResponse) {
                    throw new Error("No content returned from Gemini API.");
                }

                const parsed = JSON.parse(textResponse);
                if (!parsed.flashcards || !parsed.quiz) {
                    throw new Error("Invalid structure returned from Gemini.");
                }

                return parsed; // Success

            } catch (err) {
                lastError = err;
                if (attempt === maxRetries) {
                    throw lastError;
                }
            }
        }

        throw lastError;
    }

    function getDurationFromTimeStr(timeStr, type) {
        if (!timeStr || !timeStr.includes('-')) {
            return type === 'study-block' ? 25 : 5;
        }
        try {
            const parts = timeStr.split('-');
            const startParts = parts[0].trim().split(':');
            const endParts = parts[1].trim().split(':');
            
            const startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
            let endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
            
            if (endMin < startMin) {
                // Crossed midnight
                endMin += 24 * 60;
            }
            
            const diff = endMin - startMin;
            return diff > 0 ? diff : (type === 'study-block' ? 25 : 5);
        } catch (e) {
            return type === 'study-block' ? 25 : 5;
        }
    }
})();

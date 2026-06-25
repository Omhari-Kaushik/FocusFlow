/* ==========================================================================
   FocusFlow - Pomodoro Timer Logic
   ========================================================================== */

(function () {
    // 1. Durations in seconds
    const PRESETS = {
        'pomodoro': { seconds: 1500, label: 'Focus Time' },
        'short-break': { seconds: 300, label: 'Short Break' },
        'long-break': { seconds: 900, label: 'Long Break' }
    };

    /**
     * Load custom preset durations configured in settings.
     */
    function loadCustomDurations() {
        const workMin = parseInt(localStorage.getItem('focusflow-timer-preset-work') || '25', 10);
        const shortMin = parseInt(localStorage.getItem('focusflow-timer-preset-short') || '5', 10);
        const longMin = parseInt(localStorage.getItem('focusflow-timer-preset-long') || '15', 10);

        PRESETS['pomodoro'].seconds = workMin * 60;
        PRESETS['short-break'].seconds = shortMin * 60;
        PRESETS['long-break'].seconds = longMin * 60;

        // Dynamically update drop-down selection option text values
        if (presetSelect) {
            const pomodoroOpt = presetSelect.querySelector('option[value="pomodoro"]');
            const shortOpt = presetSelect.querySelector('option[value="short-break"]');
            const longOpt = presetSelect.querySelector('option[value="long-break"]');

            if (pomodoroOpt) pomodoroOpt.textContent = `Pomodoro (${workMin} min)`;
            if (shortOpt) shortOpt.textContent = `Short Break (${shortMin} min)`;
            if (longOpt) longOpt.textContent = `Long Break (${longMin} min)`;
        }
    }

    // 2. State Variables
    let currentPreset = 'pomodoro';
    let timeLeft = PRESETS[currentPreset].seconds;
    let totalDuration = PRESETS[currentPreset].seconds;
    let isRunning = false;
    let timerInterval = null;
    let customTimerTitle = null; // Store synchronized study block titles

    // SVG Circle Circumference (r=95)
    const CIRCUMFERENCE = 596.9;

    // Notification Audio (Chime Bell)
    const finishChime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
    finishChime.volume = 0.5;

    // DOM Elements
    let clockDisplay, labelDisplay, presetSelect, startBtn, resetBtn, progressCircle, timerHistoryList;
    
    // Modal Elements
    let customModal, modalTitle, modalMessage, modalIcon, modalCloseBtn;

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        loadCustomDurations();
        initEvents();
        loadTimerState(); // Load saved timer state or default
        renderTimerHistory();
    });

    // Listen to settings changes to update durations on the fly
    window.addEventListener('focusflow-settings-updated', () => {
        loadCustomDurations();
        if (!isRunning) {
            timeLeft = PRESETS[currentPreset].seconds;
            totalDuration = PRESETS[currentPreset].seconds;
            updateDisplay();
        }
    });

    /**
     * Cache DOM elements.
     */
    function initElements() {
        clockDisplay = document.getElementById('timer-clock');
        labelDisplay = document.getElementById('timer-label');
        presetSelect = document.getElementById('timer-preset');
        startBtn = document.getElementById('timer-start-btn');
        resetBtn = document.getElementById('timer-reset-btn');
        progressCircle = document.querySelector('.progress-ring-circle');
        
        // Modal selectors
        customModal = document.getElementById('custom-modal');
        modalTitle = document.getElementById('modal-title');
        modalMessage = document.getElementById('modal-message');
        modalIcon = document.getElementById('modal-icon');
        modalCloseBtn = document.getElementById('modal-close-btn');

        // History list
        timerHistoryList = document.getElementById('timer-history-list');
    }

    /**
     * Attach Event Listeners.
     */
    function initEvents() {
        if (presetSelect) {
            presetSelect.addEventListener('change', handlePresetChange);
        }
        if (startBtn) {
            startBtn.addEventListener('click', toggleTimer);
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', handleResetClick);
        }
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeModal);
        }
        if (customModal) {
            customModal.addEventListener('click', (e) => {
                if (e.target === customModal) {
                    closeModal();
                }
            });
        }

        // Listen for sync preset event (e.g. from the AI Study Planner)
        document.addEventListener('syncTimerPreset', (e) => {
            if (e.detail && e.detail.duration) {
                // Pause current timer if running
                if (isRunning) {
                    pauseTimer();
                }
                
                // Add temporary custom preset or set the active duration
                currentPreset = 'pomodoro'; // fall back to pomodoro preset slot
                if (presetSelect) {
                    presetSelect.value = 'pomodoro';
                }
                
                // Load custom title and duration
                customTimerTitle = e.detail.title || 'Focus Time';
                timeLeft = e.detail.duration * 60;
                totalDuration = timeLeft;
                
                updateDisplay();
                saveTimerState();
            }
        });

        // Listen for early subtask completion to pause the active timer
        document.addEventListener('studyBlockCompletedEarly', (e) => {
            console.log('[Timer Debug] received studyBlockCompletedEarly event:', e.detail);
            console.log('[Timer Debug] current customTimerTitle:', customTimerTitle);
            console.log('[Timer Debug] timer isRunning:', isRunning);

            if (e.detail && e.detail.title && customTimerTitle) {
                const cleanEventTitle = e.detail.title.trim().toLowerCase();
                const cleanTimerTitle = customTimerTitle.trim().toLowerCase();
                
                console.log(`[Timer Debug] Comparing event title "${cleanEventTitle}" to timer title "${cleanTimerTitle}"`);
                
                if (cleanEventTitle === cleanTimerTitle) {
                    if (isRunning) {
                        console.log('[Timer Debug] Match found & running! Pausing Pomodoro.');
                        pauseTimer();
                        playBeepNotification();
                        showModal(
                            'Session Completed Early!',
                            `Awesome! You checked off "${e.detail.title}" before the time ran out. The timer has been paused.`,
                            'check-circle'
                        );
                    }
                }
            }
        });

        // Listen for clearing custom timer title (e.g. when resetting study plan)
        document.addEventListener('clearCustomTimerTitle', () => {
            if (isRunning) {
                pauseTimer();
            }
            customTimerTitle = null;
            resetTimer();
        });
    }

    /**
     * Handles select preset changes.
     */
    function handlePresetChange(e) {
        currentPreset = e.target.value;
        totalDuration = PRESETS[currentPreset].seconds;
        customTimerTitle = null; // Clear custom title when switching presets
        
        // Stop timer if running
        if (isRunning) {
            pauseTimer();
        }

        resetTimer();
    }

    /**
     * Toggles between play and pause states.
     */
    function toggleTimer() {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    /**
     * Starts the countdown timer.
     */
    function startTimer() {
        isRunning = true;
        
        // Update button appearance
        updateStartButtonState(true);
        saveTimerState();

        timerInterval = setInterval(() => {
            timeLeft--;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timeLeft = 0;
                updateDisplay();
                saveTimerState();
                handleSessionComplete();
            } else {
                updateDisplay();
                saveTimerState();
            }
        }, 1000);
    }

    /**
     * Pauses the timer.
     */
    function pauseTimer() {
        isRunning = false;
        clearInterval(timerInterval);
        updateStartButtonState(false);
        saveTimerState();
    }

    /**
     * Handle button state switch between Play and Pause.
     */
    function updateStartButtonState(active) {
        if (!startBtn) return;
        
        const labelSpan = startBtn.querySelector('span');
        const icon = startBtn.querySelector('svg, i');
        
        if (active) {
            startBtn.classList.add('running');
            if (labelSpan) labelSpan.textContent = 'Pause';
            if (icon && typeof lucide !== 'undefined') {
                icon.setAttribute('data-lucide', 'pause');
                lucide.createIcons();
            }
        } else {
            startBtn.classList.remove('running');
            if (labelSpan) labelSpan.textContent = 'Start';
            if (icon && typeof lucide !== 'undefined') {
                icon.setAttribute('data-lucide', 'play');
                lucide.createIcons();
            }
        }
    }

    /**
     * Resets the timer values back to current preset standard.
     */
    function resetTimer() {
        timeLeft = PRESETS[currentPreset].seconds;
        totalDuration = PRESETS[currentPreset].seconds;
        customTimerTitle = null; // Clear custom title on reset
        updateDisplay();
        saveTimerState();
    }

    /**
     * Resets the timer manually from button click.
     */
    function handleResetClick() {
        pauseTimer();
        resetTimer();
        
        if (typeof gsap !== 'undefined') {
            // 1. Smooth, slow 360-degree spin on the reset icon
            const resetIcon = resetBtn.querySelector('svg, i');
            if (resetIcon) {
                gsap.fromTo(resetIcon, 
                    { rotation: 0 }, 
                    { rotation: -360, duration: 1.0, ease: 'power2.out' }
                );
            }

            // 2. Very gentle scale pulse on the reset button container (97% to 100%)
            if (resetBtn) {
                gsap.fromTo(resetBtn, 
                    { scale: 0.97 }, 
                    { scale: 1, duration: 0.8, ease: 'power2.out' }
                );
            }

            // 3. Soft scale fade and transition on the clock digits (96% to 100%)
            if (clockDisplay) {
                gsap.fromTo(clockDisplay, 
                    { scale: 0.96, opacity: 0.7 }, 
                    { scale: 1, opacity: 1, duration: 0.85, ease: 'power2.out' }
                );
            }

            // 4. Muted fade-flash on the progress circle ring
            if (progressCircle) {
                gsap.fromTo(progressCircle, 
                    { opacity: 0.7 }, 
                    { opacity: 1, duration: 0.8, ease: 'power2.out' }
                );
            }
        }
    }

    /**
     * Triggers when countdown hits zero.
     */
    function handleSessionComplete() {
        pauseTimer();
        
        // Play chime sound
        try {
            finishChime.currentTime = 0;
            finishChime.play().catch(err => {
                console.log('Audio autoplay blocked by browser policies.', err);
            });
        } catch (e) {
            console.error('Error playing sound notification', e);
        }

        // Play distinctive beep beep beep synthesized alarm
        playBeepNotification();

        // Visual flash overlay animation on timer card
        const timerCard = document.querySelector('.timer-card');
        if (timerCard && typeof gsap !== 'undefined') {
            gsap.fromTo(timerCard, 
                { outline: '2px solid transparent' }, 
                { outline: `2px solid var(--accent-green)`, duration: 0.15, repeat: 5, yoyo: true, ease: 'power1.inOut' }
            );
        }

        // Save session history log
        const durationMinutes = Math.round(totalDuration / 60);
        saveSessionToLog(durationMinutes, currentPreset);

        // Reset timer before showing modal so it doesn't display 00:00
        resetTimer();

        if (currentPreset === 'pomodoro') {
            // Save data to localStorage (only for focus sessions)
            saveCompletedSession();

            // Dispatch Custom Event for updates across other cards
            const completeEvent = new CustomEvent('focusSessionComplete', {
                detail: {
                    preset: currentPreset,
                    durationMinutes: durationMinutes
                }
            });
            document.dispatchEvent(completeEvent);

            showModal(
                'Focus Session Complete!',
                "Outstanding focus! You've successfully finished your Pomodoro session. Take a well-deserved break. ☕",
                'coffee'
            );
        } else {
            // Save break time details to localStorage
            let totalBreakTime = parseInt(localStorage.getItem('focusflow-total-break-time') || '0');
            // Check if it's first run baseline and not set
            if (!localStorage.getItem('focusflow-total-break-time') && localStorage.getItem('focusflow-first-run-completed') !== 'true') {
                totalBreakTime = 96;
            }
            totalBreakTime += durationMinutes;
            localStorage.setItem('focusflow-total-break-time', totalBreakTime.toString());

            // Dispatch Break Event
            const breakEvent = new CustomEvent('breakSessionComplete', {
                detail: {
                    preset: currentPreset,
                    durationMinutes: durationMinutes
                }
            });
            document.dispatchEvent(breakEvent);

            // Break completed (short or long break)
            const breakLabel = currentPreset === 'short-break' ? 'Short Break' : 'Long Break';
            showModal(
                'Break Completed!',
                `Your ${breakLabel.toLowerCase()} has ended. Ready to get back into focus mode and crush some more goals? 🧠`,
                'brain'
            );
        }
    }

    /**
     * Synthesizes a distinctive "beep beep beep" alarm using the Web Audio API.
     * This is extremely reliable, works offline, and continues playing even if the tab is in the background.
     */
    function playBeepNotification() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            const audioCtx = new AudioContextClass();
            
            const playSingleBeep = (time, freq, duration) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, time);
                
                gainNode.gain.setValueAtTime(0, time);
                gainNode.gain.linearRampToValueAtTime(0.4, time + 0.02);
                gainNode.gain.setValueAtTime(0.4, time + duration - 0.02);
                gainNode.gain.linearRampToValueAtTime(0, time + duration);
                
                osc.start(time);
                osc.stop(time + duration);
            };

            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            
            const now = audioCtx.currentTime;
            // Play 3 high-pitched beep tones spaced 250ms apart
            playSingleBeep(now, 880, 0.15);       // Beep 1 (A5)
            playSingleBeep(now + 0.25, 880, 0.15);  // Beep 2 (A5)
            playSingleBeep(now + 0.50, 880, 0.15);  // Beep 3 (A5)
        } catch (error) {
            console.warn('Web Audio alarm beep blocked or failed:', error);
        }
    }

    /**
     * Updates localStorage statistics when a focus session finishes.
     */
    function saveCompletedSession() {
        // Double check it is indeed a focus session
        if (currentPreset !== 'pomodoro') return;

        const today = new Date().toDateString();
        
        // Retrieve current values
        let sessions = parseInt(localStorage.getItem('focusflow-sessions-count') || '0');
        let totalTime = parseInt(localStorage.getItem('focusflow-total-time') || '0');
        let lastLoggedDate = localStorage.getItem('focusflow-last-date') || '';
        let streak = parseInt(localStorage.getItem('focusflow-streak') || '0');

        sessions++;
        
        // Add duration to total time
        const durationMinutes = Math.round(PRESETS[currentPreset].seconds / 60);
        totalTime += durationMinutes;

        // Streak check
        if (lastLoggedDate !== today) {
            if (lastLoggedDate === new Date(Date.now() - 86400000).toDateString()) {
                // Logged yesterday -> streak increments
                streak++;
            } else if (lastLoggedDate === '') {
                // First session logged
                streak = 1;
            } else {
                // Reset streak if last active day was older than yesterday
                streak = 1;
            }
            localStorage.setItem('focusflow-last-date', today);
            localStorage.setItem('focusflow-streak', streak.toString());
        }

        // Update records
        localStorage.setItem('focusflow-sessions-count', sessions.toString());
        localStorage.setItem('focusflow-total-time', totalTime.toString());
    }

    /**
     * Saves the current timer state to localStorage.
     */
    function saveTimerState() {
        localStorage.setItem('focusflow-timer-preset', currentPreset);
        localStorage.setItem('focusflow-timer-time-left', timeLeft.toString());
        localStorage.setItem('focusflow-timer-is-running', isRunning.toString());
        localStorage.setItem('focusflow-timer-last-active', Date.now().toString());
        if (customTimerTitle) {
            localStorage.setItem('focusflow-timer-custom-title', customTimerTitle);
        } else {
            localStorage.removeItem('focusflow-timer-custom-title');
        }
        localStorage.setItem('focusflow-timer-total-duration', totalDuration.toString());
    }

    /**
     * Loads saved timer state from localStorage.
     */
    function loadTimerState() {
        const savedPreset = localStorage.getItem('focusflow-timer-preset');
        const savedTimeLeft = localStorage.getItem('focusflow-timer-time-left');
        const savedIsRunning = localStorage.getItem('focusflow-timer-is-running');
        const savedLastActive = localStorage.getItem('focusflow-timer-last-active');
        
        // Only load synced custom titles/durations if an active plan actually exists in database
        const hasActivePlan = localStorage.getItem('focusflow-ai-plan');
        const savedCustomTitle = hasActivePlan ? localStorage.getItem('focusflow-timer-custom-title') : null;
        const savedTotalDuration = hasActivePlan ? localStorage.getItem('focusflow-timer-total-duration') : null;

        if (savedPreset && PRESETS[savedPreset]) {
            currentPreset = savedPreset;
            if (presetSelect) {
                presetSelect.value = currentPreset;
            }
        }

        if (savedCustomTitle) {
            customTimerTitle = savedCustomTitle;
        } else {
            customTimerTitle = null;
        }

        if (savedTotalDuration !== null) {
            totalDuration = parseInt(savedTotalDuration, 10);
        } else {
            totalDuration = PRESETS[currentPreset].seconds;
        }

        if (savedTimeLeft !== null) {
            timeLeft = parseInt(savedTimeLeft, 10);
            if (timeLeft <= 0) {
                // If it was 0, reset to totalDuration
                timeLeft = totalDuration;
            }
        } else {
            timeLeft = totalDuration;
        }

        updateDisplay();

        if (savedIsRunning === 'true' && savedLastActive !== null) {
            const elapsed = Math.floor((Date.now() - parseInt(savedLastActive, 10)) / 1000);
            if (elapsed > 0) {
                timeLeft -= elapsed;
            }

            if (timeLeft <= 0) {
                timeLeft = 0;
                updateDisplay();
                setTimeout(() => {
                    handleSessionComplete();
                }, 100);
            } else {
                startTimer();
            }
        }
    }

    /**
     * Swaps the Lucide icon in the modal dynamically.
     */
    function changeModalIcon(iconName) {
        if (!modalIcon) return;
        const parent = modalIcon.parentElement;
        if (!parent) return;

        const newIcon = document.createElement('i');
        newIcon.id = 'modal-icon';
        newIcon.setAttribute('data-lucide', iconName);
        
        parent.replaceChild(newIcon, modalIcon);
        modalIcon = newIcon;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Shows the custom modal popup.
     */
    function showModal(title, message, iconName) {
        if (!customModal) return;

        if (modalTitle) modalTitle.textContent = title;
        if (modalMessage) modalMessage.textContent = message;
        
        changeModalIcon(iconName);

        customModal.classList.remove('hidden');

        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf([customModal, '.modal-card']);
            gsap.set(customModal, { display: 'flex', opacity: 0 });
            gsap.set('.modal-card', { scale: 0.8, opacity: 0 });

            gsap.to(customModal, { opacity: 1, duration: 0.4, ease: 'power2.out' });
            gsap.to('.modal-card', { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' });
        }
    }

    /**
     * Closes the custom modal popup.
     */
    function closeModal() {
        if (!customModal) return;

        if (typeof gsap !== 'undefined') {
            gsap.to('.modal-card', { scale: 0.85, opacity: 0, duration: 0.3, ease: 'power2.in' });
            gsap.to(customModal, { 
                opacity: 0, 
                duration: 0.3, 
                ease: 'power2.in',
                onComplete: () => {
                    customModal.classList.add('hidden');
                }
            });
        } else {
            customModal.classList.add('hidden');
        }
    }

    /**
     * Updates clock digits and SVG circle dashoffset.
     */
    function updateDisplay() {
        if (!clockDisplay || !labelDisplay) return;

        // 1. Digital Clock Formatting
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        clockDisplay.textContent = formattedTime;
        if (customTimerTitle) {
            labelDisplay.textContent = customTimerTitle;
        } else {
            labelDisplay.textContent = PRESETS[currentPreset].label;
        }

        // 2. SVG Stroke-dashoffset calculation
        if (progressCircle) {
            const percentage = timeLeft / totalDuration;
            const offset = CIRCUMFERENCE * (1 - percentage);
            progressCircle.style.strokeDashoffset = offset;
        }
    }

    /**
     * Saves completed focus session or break details to localStorage history.
     */
    function saveSessionToLog(durationMinutes, presetType) {
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('focusflow-timer-history') || '[]');
        } catch (e) {
            history = [];
        }

        const logEntry = {
            id: Date.now(),
            type: presetType,
            duration: durationMinutes,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            dateStr: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };

        history.unshift(logEntry); // Add to beginning of array
        if (history.length > 10) {
            history = history.slice(0, 10); // Cap at 10 items
        }

        localStorage.setItem('focusflow-timer-history', JSON.stringify(history));
        renderTimerHistory();
    }

    /**
     * Renders session history in the Dedicated Workspace view panel.
     */
    function renderTimerHistory() {
        if (!timerHistoryList) return;

        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('focusflow-timer-history') || '[]');
        } catch (e) {
            history = [];
        }

        timerHistoryList.innerHTML = '';

        if (history.length === 0) {
            timerHistoryList.innerHTML = `
                <div class="timer-history-empty">
                    <i data-lucide="history"></i>
                    <p>No study sessions completed today. Start the timer to fill your log!</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        const typeLabels = {
            'pomodoro': 'Focus Session',
            'short-break': 'Short Break',
            'long-break': 'Long Break'
        };

        history.forEach(log => {
            const item = document.createElement('li');
            item.className = 'timer-history-item';
            item.innerHTML = `
                <div class="timer-history-item-left">
                    <span class="timer-history-type">${typeLabels[log.type] || 'Study Block'}</span>
                    <span class="timer-history-date">${log.dateStr} at ${log.timestamp}</span>
                </div>
                <span class="timer-history-duration">${log.duration} mins</span>
            `;
            timerHistoryList.appendChild(item);
        });
    }
})();

/* ==========================================================================
   FocusFlow - Statistics & Analytics Controller
   ========================================================================== */

(function () {
    // 1. Durations & Weekly Data (Defaults matching screenshot mockup)
    let WEEK_DATA = {
        'this-week': {
            days: [60, 90, 75, 120, 45, 60, 30], // Mon to Sun minutes
            total: 480
        },
        'last-week': {
            days: [45, 60, 90, 60, 75, 45, 45],
            total: 420
        }
    };

    // DOM Elements
    let focusTimeEl, sessionsEl, streakEl, tasksEl, weekSelect, totalMinutesEl, sidebarStreakEl;
    let bars, barValues;
    let insightsTotalEl, insightsAvgEl, insightsDayEl, insightsTrendEl, insightsCoachEl;
    let balanceFocusValEl, balanceBreakValEl, balanceFocusBarEl, balanceBreakBarEl, balanceFeedbackEl;

    // Cache current statistics locally to handle rolling number animations
    let currentStats = {
        focusTime: 0,
        sessions: 0,
        streak: 0,
        tasksCompleted: 0
    };

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        initEvents();
        loadInitialStats();
        animateChart('this-week');
        updateAnalyticsWorkspace('this-week');
        updateDistributionUI();
        updateBalanceUI();
    });

    /**
     * Cache DOM elements.
     */
    function initElements() {
        focusTimeEl = document.getElementById('stat-focus-time');
        sessionsEl = document.getElementById('stat-sessions');
        streakEl = document.getElementById('stat-streak');
        tasksEl = document.getElementById('stat-tasks');
        
        weekSelect = document.getElementById('analytics-week-select');
        totalMinutesEl = document.getElementById('chart-total-minutes');
        
        bars = document.querySelectorAll('.chart-bar');
        barValues = document.querySelectorAll('.chart-bar-value');
        
        sidebarStreakEl = document.querySelector('.streak-display .streak-count');

        // New Insights Elements
        insightsTotalEl = document.getElementById('insights-weekly-total');
        insightsAvgEl = document.getElementById('insights-daily-avg');
        insightsDayEl = document.getElementById('insights-productive-day');
        insightsTrendEl = document.getElementById('insights-trend-badge');
        insightsCoachEl = document.getElementById('insights-coach-tip');

        // Work-Break Balance Elements
        balanceFocusValEl = document.getElementById('balance-focus-val');
        balanceBreakValEl = document.getElementById('balance-break-val');
        balanceFocusBarEl = document.getElementById('balance-focus-bar');
        balanceBreakBarEl = document.getElementById('balance-break-bar');
        balanceFeedbackEl = document.getElementById('balance-feedback-text');
    }

    /**
     * Attach Event Listeners.
     */
    function initEvents() {
        // Week select change handler
        if (weekSelect) {
            weekSelect.addEventListener('change', (e) => {
                animateChart(e.target.value);
                updateAnalyticsWorkspace(e.target.value);
            });
        }

        // Listen for Timer completion events
        document.addEventListener('focusSessionComplete', (e) => {
            handleSessionComplete(e.detail.durationMinutes);
        });

        // Listen for Break completion events
        document.addEventListener('breakSessionComplete', (e) => {
            updateBalanceUI();
        });

        // Listen for Task list update events (add, delete, complete, clear completed)
        document.addEventListener('tasksUpdated', (e) => {
            handleTaskStatusChange();
        });
    }

    /**
     * Loads initial stats from LocalStorage.
     */
    function loadInitialStats() {
        const isResetClean = localStorage.getItem('focusflow-first-run-completed') === 'true';

        // Load Weekly Data from LocalStorage
        const storedWeekly = localStorage.getItem('focusflow-weekly-data');
        if (storedWeekly) {
            try {
                WEEK_DATA = JSON.parse(storedWeekly);
            } catch (err) {
                console.error('Failed to parse weekly focus history', err);
            }
        } else if (isResetClean) {
            WEEK_DATA = {
                'this-week': {
                    days: [0, 0, 0, 0, 0, 0, 0],
                    total: 0
                },
                'last-week': {
                    days: [0, 0, 0, 0, 0, 0, 0],
                    total: 0
                }
            };
        }

        // Read values directly from database
        const initTime = parseInt(localStorage.getItem('focusflow-total-time') || (isResetClean ? '0' : '75'));
        const initSessions = parseInt(localStorage.getItem('focusflow-sessions-count') || (isResetClean ? '0' : '3'));
        const initStreak = parseInt(localStorage.getItem('focusflow-streak') || (isResetClean ? '0' : '7'));
        
        // Count tasks from LocalStorage list
        let initTasks = 0;
        const storedTasks = localStorage.getItem('focusflow-tasks');
        if (storedTasks) {
            try {
                const parsed = JSON.parse(storedTasks);
                initTasks = parsed.filter(t => t.completed).length;
            } catch (err) {
                console.error(err);
            }
        }

        // Store current values for roll animation start points
        currentStats.focusTime = initTime;
        currentStats.sessions = initSessions;
        currentStats.streak = initStreak;
        currentStats.tasksCompleted = initTasks;

        // Render immediately
        if (focusTimeEl) focusTimeEl.textContent = formatFocusTime(initTime);
        if (sessionsEl) sessionsEl.textContent = initSessions.toString();
        if (streakEl) streakEl.textContent = initStreak.toString();
        if (tasksEl) tasksEl.textContent = initTasks.toString();
        if (sidebarStreakEl) sidebarStreakEl.textContent = `${initStreak} Days`;
    }

    /**
     * Saves weekly focus minutes to LocalStorage.
     */
    function saveWeeklyData() {
        localStorage.setItem('focusflow-weekly-data', JSON.stringify(WEEK_DATA));
    }

    /**
     * Increment stats when a Pomodoro timer session finishes.
     */
    function handleSessionComplete(minutes) {
        const prevTime = currentStats.focusTime;
        const prevSessions = currentStats.sessions;
        const prevStreak = currentStats.streak;

        // Reload updated values from storage (updated inside timer.js)
        const newTime = parseInt(localStorage.getItem('focusflow-total-time') || '75');
        const newSessions = parseInt(localStorage.getItem('focusflow-sessions-count') || '3');
        const newStreak = parseInt(localStorage.getItem('focusflow-streak') || '7');

        currentStats.focusTime = newTime;
        currentStats.sessions = newSessions;
        currentStats.streak = newStreak;

        // Roll number animations
        if (focusTimeEl) animateCount(focusTimeEl, prevTime, newTime, 'time');
        if (sessionsEl) animateCount(sessionsEl, prevSessions, newSessions);
        if (streakEl) animateCount(streakEl, prevStreak, newStreak);
        
        // Update sidebar streak text immediately
        if (sidebarStreakEl) sidebarStreakEl.textContent = `${newStreak} Days`;

        // Update chart data - add minutes to today's bar
        const todayDayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...
        // Map Sun=6, Mon=0, Tue=1...
        const mappedIdx = todayDayIndex === 0 ? 6 : todayDayIndex - 1;
        
        WEEK_DATA['this-week'].days[mappedIdx] += minutes;
        WEEK_DATA['this-week'].total += minutes;
        
        // Save the updated weekly data to LocalStorage
        saveWeeklyData();

        // Update the Peak Study Period time distribution based on current local hour
        const hour = new Date().getHours();
        let period = 'evening'; // default fallback
        if (hour >= 6 && hour < 12) {
            period = 'morning';
        } else if (hour >= 12 && hour < 18) {
            period = 'afternoon';
        } else if (hour >= 18 && hour < 24) {
            period = 'evening';
        } else {
            period = 'night';
        }

        let dist = { morning: 45, afternoon: 120, evening: 240, night: 75 };
        try {
            const stored = localStorage.getItem('focusflow-time-distribution');
            if (stored) {
                dist = JSON.parse(stored);
            }
        } catch (e) {}
        dist[period] = (dist[period] || 0) + minutes;
        localStorage.setItem('focusflow-time-distribution', JSON.stringify(dist));

        // Re-draw chart and update insights with new values
        const currentSelection = weekSelect ? weekSelect.value : 'this-week';
        animateChart(currentSelection);
        updateAnalyticsWorkspace(currentSelection);
        updateDistributionUI();
        updateBalanceUI();
    }

    /**
     * Updates completed tasks counter in Today's Stats.
     */
    function handleTaskStatusChange() {
        const prevTasks = currentStats.tasksCompleted;
        let newTasks = 0;

        const storedTasks = localStorage.getItem('focusflow-tasks');
        if (storedTasks) {
            try {
                const parsed = JSON.parse(storedTasks);
                newTasks = parsed.filter(t => t.completed).length;
            } catch (err) {
                console.error(err);
            }
        }

        currentStats.tasksCompleted = newTasks;

        if (tasksEl) {
            animateCount(tasksEl, prevTasks, newTasks);
        }
    }

    /**
     * GSAP Rolling counter animation.
     */
    function animateCount(element, start, end, suffix = '') {
        if (typeof gsap === 'undefined') {
            if (suffix === 'time') {
                element.textContent = formatFocusTime(end);
            } else {
                element.textContent = end + suffix;
            }
            return;
        }

        const obj = { value: start };
        gsap.to(obj, {
            value: end,
            duration: 0.65,
            ease: 'power2.out',
            onUpdate: () => {
                const currentVal = Math.round(obj.value);
                if (suffix === 'time') {
                    element.textContent = formatFocusTime(currentVal);
                } else {
                    element.textContent = currentVal + suffix;
                }
            }
        });
    }

    /**
     * Render and animate the Weekly Focus Bar Chart.
     */
    function animateChart(weekKey) {
        const data = WEEK_DATA[weekKey];
        if (!data || !bars || !barValues) return;

        // Update total footer
        if (totalMinutesEl) {
            const currentTotal = parseFormattedTimeToMinutes(totalMinutesEl.textContent) || 0;
            animateCount(totalMinutesEl, currentTotal, data.total, 'time');
        }

        // SVG Chart coordinates:
        // Base line is at y=140. Max value is 120 (which matches y=20).
        // Max bar height = 120px.
        // Bar height = (value / 120) * 120 = value.
        // Bar y = 140 - height.
        data.days.forEach((minutes, idx) => {
            const bar = bars[idx];
            const textVal = barValues[idx];

            if (!bar) return;

            // Cap value height at 120px for safety
            const cappedMinutes = Math.min(minutes, 120); 
            const targetHeight = cappedMinutes;
            const targetY = 140 - targetHeight;

            if (typeof gsap !== 'undefined') {
                // Animate bar rect properties
                gsap.to(bar, {
                    attr: { y: targetY, height: targetHeight },
                    duration: 0.85,
                    ease: 'power2.out',
                    delay: idx * 0.05 // Stagger effect
                });

                if (textVal) {
                    // Update text number
                    textVal.textContent = minutes;
                    // Float the value up along with the bar and fade it in
                    gsap.fromTo(textVal, 
                        { opacity: 0 },
                        { 
                            opacity: 1, 
                            attr: { y: targetY - 5 }, 
                            duration: 0.85, 
                            ease: 'power2.out', 
                            delay: (idx * 0.05) + 0.1 
                        }
                    );
                }
            } else {
                bar.setAttribute('y', targetY.toString());
                bar.setAttribute('height', targetHeight.toString());
                if (textVal) {
                    textVal.textContent = minutes;
                    textVal.setAttribute('y', (targetY - 5).toString());
                    textVal.style.opacity = '1';
                }
            }
        });
    }

    /**
     * Formats focus time in minutes into a clean, human-readable string.
     * e.g., 45 -> "45m", 60 -> "1h", 100 -> "1h 40m"
     */
    function formatFocusTime(minutes) {
        if (minutes <= 0) return '0m';
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }

    /**
     * Parses a formatted focus time string back to integer minutes.
     * e.g., "1h 40m" -> 100, "45m" -> 45, "2h" -> 120
     */
    function parseFormattedTimeToMinutes(text) {
        if (!text) return 0;
        if (text.includes('min')) {
            return parseInt(text) || 0;
        }
        const hMatch = text.match(/(\d+)\s*h/);
        const mMatch = text.match(/(\d+)\s*m/);
        const hrs = hMatch ? parseInt(hMatch[1]) : 0;
        const mins = mMatch ? parseInt(mMatch[1]) : 0;
        return hrs * 60 + mins;
    }

    /**
     * Calculates stats and updates the Smart Insights panel inside the Analytics view.
     */
    function updateAnalyticsWorkspace(weekKey) {
        const data = WEEK_DATA[weekKey];
        if (!data) return;

        // 1. Weekly Total (in hours and minutes)
        if (insightsTotalEl) {
            insightsTotalEl.textContent = formatFocusTime(data.total);
        }

        // 2. Daily Average (total divided by 7)
        if (insightsAvgEl) {
            const avgMins = Math.round(data.total / 7);
            insightsAvgEl.textContent = `${avgMins}m`;
        }

        // 3. Peak Focus Day
        if (insightsDayEl) {
            const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            let maxMins = -1;
            let maxIdx = 0;
            data.days.forEach((mins, idx) => {
                if (mins > maxMins) {
                    maxMins = mins;
                    maxIdx = idx;
                }
            });
            insightsDayEl.textContent = maxMins > 0 ? `${dayNames[maxIdx]} (${maxMins}m)` : "None";
        }

        // 4. Trend percentage vs last week
        if (insightsTrendEl) {
            const lastWeekTotal = WEEK_DATA['last-week'].total;
            const thisWeekTotal = WEEK_DATA['this-week'].total;

            let percentage = 0;
            let trendClass = 'neutral';
            let trendText = 'No Change';

            if (weekKey === 'this-week') {
                if (lastWeekTotal > 0) {
                    percentage = Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
                    if (percentage > 0) {
                        trendClass = 'positive';
                        trendText = `▲ +${percentage}% vs Last Week`;
                    } else if (percentage < 0) {
                        trendClass = 'negative';
                        trendText = `▼ ${percentage}% vs Last Week`;
                    }
                } else if (thisWeekTotal > 0) {
                    trendClass = 'positive';
                    trendText = `★ New Focus Record!`;
                }
            } else {
                // For last-week select, show neutral baseline
                trendText = "Baseline Performance";
            }

            insightsTrendEl.className = `trend-badge ${trendClass}`;
            insightsTrendEl.textContent = trendText;
        }

        // 5. Coach Tip
        if (insightsCoachEl) {
            let tip = "";
            const totalMins = data.total;
            const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            
            // Find peak day index
            let maxMins = 0;
            let maxIdx = 0;
            data.days.forEach((mins, idx) => {
                if (mins > maxMins) {
                    maxMins = mins;
                    maxIdx = idx;
                }
            });

            if (totalMins === 0) {
                tip = "It looks like you haven't logged any focus sessions for this period yet. Start a small 25-minute Pomodoro timer to build your momentum!";
            } else if (totalMins < 120) {
                tip = "You're getting started! Try to schedule at least one focus block daily. Small, consistent efforts beat giant study cramming sessions.";
            } else {
                // Focus distribution coaching
                const weekendMins = data.days[5] + data.days[6]; // Sat + Sun
                const weekdayMins = totalMins - weekendMins;

                if (weekendMins === 0) {
                    tip = `Excellent work studying on weekdays! Your peak day was ${dayNames[maxIdx]}. To lock in your habit, try adding a tiny 15-minute review session on Saturday.`;
                } else if (weekendMins > weekdayMins) {
                    tip = `You are a weekend warrior! You've logged ${weekendMins}m on weekends. To prevent cognitive fatigue, try shifting a session or two to mid-week.`;
                } else {
                    tip = `Outstanding! Your study schedule is well-distributed. Your peak performance occurs on ${dayNames[maxIdx]}. Keep maintaining this balanced routine!`;
                }
            }
            insightsCoachEl.textContent = tip;
            
            // Re-render Lucide icons in case any were injected inside the coaching widget
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    /**
     * Updates and animates the Peak Study Periods distribution bars.
     */
    function updateDistributionUI() {
        let dist = { morning: 45, afternoon: 120, evening: 240, night: 75 };
        try {
            const stored = localStorage.getItem('focusflow-time-distribution');
            if (stored) {
                dist = JSON.parse(stored);
            } else {
                const isReset = localStorage.getItem('focusflow-first-run-completed') === 'true';
                if (isReset) {
                    dist = { morning: 0, afternoon: 0, evening: 0, night: 0 };
                }
                localStorage.setItem('focusflow-time-distribution', JSON.stringify(dist));
            }
        } catch (e) {
            console.error(e);
        }

        const totalDist = dist.morning + dist.afternoon + dist.evening + dist.night;

        const periods = ['morning', 'afternoon', 'evening', 'night'];
        periods.forEach(p => {
            const bar = document.getElementById(`dist-bar-${p}`);
            const val = document.getElementById(`dist-val-${p}`);
            if (bar && val) {
                const mins = dist[p] || 0;
                val.textContent = formatFocusTime(mins);
                
                const pct = totalDist > 0 ? Math.round((mins / totalDist) * 100) : 0;
                
                if (typeof gsap !== 'undefined') {
                     gsap.to(bar, {
                         width: `${pct}%`,
                         duration: 0.85,
                         ease: 'power2.out'
                     });
                } else {
                     bar.style.width = `${pct}%`;
                }
            }
        });
    }

    /**
     * Updates and animates the Work-Break Balance analytics widget.
     */
    function updateBalanceUI() {
        let focusTime = parseInt(localStorage.getItem('focusflow-total-time') || '75');
        let breakTime = parseInt(localStorage.getItem('focusflow-total-break-time') || '96');
        
        const isReset = localStorage.getItem('focusflow-first-run-completed') === 'true';
        if (!localStorage.getItem('focusflow-total-break-time')) {
            breakTime = isReset ? 0 : 96;
            localStorage.setItem('focusflow-total-break-time', breakTime.toString());
        }

        const total = focusTime + breakTime;
        let focusPct = 80;
        let breakPct = 20;

        if (total > 0) {
            focusPct = Math.round((focusTime / total) * 100);
            breakPct = 100 - focusPct;
        } else {
            focusPct = 0;
            breakPct = 0;
        }

        if (balanceFocusValEl) balanceFocusValEl.textContent = `${focusPct}%`;
        if (balanceBreakValEl) balanceBreakValEl.textContent = `${breakPct}%`;

        if (balanceFocusBarEl) {
            if (typeof gsap !== 'undefined') {
                gsap.to(balanceFocusBarEl, { width: `${focusPct}%`, duration: 0.85, ease: 'power2.out' });
            } else {
                balanceFocusBarEl.style.width = `${focusPct}%`;
            }
        }
        if (balanceBreakBarEl) {
            if (typeof gsap !== 'undefined') {
                gsap.to(balanceBreakBarEl, { width: `${breakPct}%`, duration: 0.85, ease: 'power2.out' });
            } else {
                balanceBreakBarEl.style.width = `${breakPct}%`;
            }
        }

        // Generate feedback text
        if (balanceFeedbackEl) {
            let feedback = "";
            if (total === 0) {
                feedback = "No study sessions tracked yet. Maintain a healthy balance by studying for 25 mins followed by a 5-min break!";
            } else if (focusPct >= 90) {
                feedback = "Caution: You are working long stretches without taking enough breaks. Consider scheduling short breaks to avoid burnout.";
            } else if (focusPct < 60) {
                feedback = "You are taking a lot of breaks! Try to lengthen your focus blocks to build deeper concentration.";
            } else {
                feedback = "Optimal balance! You're taking regular breaks to sustain focus levels and prevent cognitive fatigue.";
            }
            balanceFeedbackEl.textContent = feedback;
        }
        
        // Re-render Lucide icons in case any were injected inside the balance widget
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
})();

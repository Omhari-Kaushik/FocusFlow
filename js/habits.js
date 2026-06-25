/* ==========================================================================
   FocusFlow - Habit Tracker Controller
   ========================================================================== */

(function () {
    // Helper to format date in local YYYY-MM-DD
    const formatDateStr = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Pre-populated Default Habits (Loaded on first run)
    const getDefaultHabits = () => {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dayBefore = new Date();
        dayBefore.setDate(dayBefore.getDate() - 2);

        const tStr = formatDateStr(today);
        const yStr = formatDateStr(yesterday);
        const dbStr = formatDateStr(dayBefore);

        return [
            {
                id: 1,
                title: "Read 15 Pages",
                category: "Personal",
                history: {
                    [tStr]: true,
                    [yStr]: true,
                    [dbStr]: true
                },
                streak: 3
            },
            {
                id: 2,
                title: "Drink 3L Water",
                category: "Health",
                history: {
                    [yStr]: true,
                    [dbStr]: true
                },
                streak: 2
            },
            {
                id: 3,
                title: "Focus Study 60m",
                category: "Academic",
                history: {
                    [tStr]: true,
                    [dbStr]: true
                },
                streak: 1
            }
        ];
    };

    let habits = [];

    // DOM Elements - Full Workspace View
    let titleInput, categorySelect, submitBtn;
    let habitsContainer, habitsCountLabel;

    // DOM Elements - Dashboard Card Summary
    let dbManageBtn, dbPctLabel, dbFillBar, dbListContainer;

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        loadHabits();
        initEvents();
        renderHabits();
        renderDashboardSummary();
    });

    /**
     * Cache DOM Elements.
     */
    function initElements() {
        // Form controls
        titleInput = document.getElementById('habit-title-input');
        categorySelect = document.getElementById('habit-category-select');
        submitBtn = document.getElementById('habit-submit-btn');

        // Lists and counts
        habitsContainer = document.getElementById('habits-container');
        habitsCountLabel = document.getElementById('habits-count');

        // Dashboard widgets
        dbManageBtn = document.getElementById('habits-dashboard-manage-btn');
        dbPctLabel = document.getElementById('habits-summary-pct');
        dbFillBar = document.getElementById('habits-summary-fill');
        dbListContainer = document.getElementById('habits-summary-list');

        // Restore draft inputs if saved
        if (titleInput) {
            const draftTitle = localStorage.getItem('focusflow-habits-draft-title');
            if (draftTitle) titleInput.value = draftTitle;
        }
        if (categorySelect) {
            const draftCategory = localStorage.getItem('focusflow-habits-draft-category');
            if (draftCategory) categorySelect.value = draftCategory;
        }
    }

    /**
     * Load habits from localStorage, or load defaults if empty.
     */
    function loadHabits() {
        const stored = localStorage.getItem('focusflow-habits');
        const isResetClean = localStorage.getItem('focusflow-first-run-completed') === 'true';
        if (stored) {
            try {
                habits = JSON.parse(stored);
                // Ensure all habits have their streaks recalculated in case dates moved
                updateAllStreaks();
            } catch (e) {
                console.error("Error parsing habits, loading defaults", e);
                habits = isResetClean ? [] : getDefaultHabits();
                saveHabitsToStorage();
            }
        } else {
            habits = isResetClean ? [] : getDefaultHabits();
            saveHabitsToStorage();
        }
    }

    /**
     * Save habits array to localStorage.
     */
    function saveHabitsToStorage() {
        localStorage.setItem('focusflow-habits', JSON.stringify(habits));
    }

    /**
     * Set up event handlers.
     */
    function initEvents() {
        // Form submit
        if (submitBtn) {
            submitBtn.addEventListener('click', createHabit);
        }

        // Draft form inputs autosave
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                localStorage.setItem('focusflow-habits-draft-title', titleInput.value);
            });
        }
        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                localStorage.setItem('focusflow-habits-draft-category', categorySelect.value);
            });
        }

        // Listen for external habit toggle requests (e.g. from the AI Assistant)
        document.addEventListener('setHabitCompletion', (e) => {
            if (e.detail && e.detail.title) {
                const title = e.detail.title.trim().toLowerCase();
                const completed = e.detail.completed;
                const todayStr = formatDateStr(new Date());
                
                const matchedHabit = habits.find(h => h.title.trim().toLowerCase() === title);
                if (matchedHabit) {
                    if (!matchedHabit.history) matchedHabit.history = {};
                    const isCompleted = matchedHabit.history[todayStr] === true;
                    if (isCompleted !== completed) {
                        toggleHabitDate(matchedHabit.id, todayStr);
                    }
                }
            }
        });
    }

    /**
     * Calculate and return streak for a single habit based on its history.
     */
    function calculateStreak(history) {
        let streak = 0;
        let checkDate = new Date();
        
        let todayStr = formatDateStr(checkDate);
        
        if (history[todayStr]) {
            // Today is completed, walk backward starting today
            while (history[formatDateStr(checkDate)]) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            }
        } else {
            // Check yesterday
            let yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            let yesterdayStr = formatDateStr(yesterday);
            if (history[yesterdayStr]) {
                checkDate = yesterday;
                while (history[formatDateStr(checkDate)]) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                }
            }
        }
        return streak;
    }

    /**
     * Recalculates streaks for all habits.
     */
    function updateAllStreaks() {
        habits.forEach(habit => {
            habit.streak = calculateStreak(habit.history || {});
        });
    }

    /**
     * Create a new habit.
     */
    function createHabit() {
        if (!titleInput) return;

        const title = titleInput.value.trim();
        const category = categorySelect ? categorySelect.value : 'Health';

        if (!title) {
            alert("Please enter a habit title.");
            return;
        }

        const newHabit = {
            id: Date.now(),
            title: title,
            category: category,
            history: {},
            streak: 0
        };

        habits.push(newHabit);
        saveHabitsToStorage();

        // Clear input form and draft storage
        titleInput.value = '';
        localStorage.removeItem('focusflow-habits-draft-title');

        // Re-render
        renderHabits();
        renderDashboardSummary();

        // If GSAP is loaded, animate the new card entrance
        const newCard = habitsContainer.querySelector(`.habit-card[data-id="${newHabit.id}"]`);
        if (newCard && typeof gsap !== 'undefined') {
            gsap.from(newCard, {
                opacity: 0,
                y: 20,
                duration: 0.4,
                ease: 'back.out(1.7)'
            });
        }
    }

    /**
     * Get the last 7 calendar days.
     */
    function getLast7Days() {
        const days = [];
        const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = formatDateStr(d);
            days.push({
                dateStr: dateStr,
                label: weekdayLabels[d.getDay()],
                isToday: i === 0
            });
        }
        return days;
    }

    /**
     * Render the habits in the workspace.
     */
    function renderHabits() {
        if (!habitsContainer) return;

        habitsContainer.innerHTML = '';
        
        if (habitsCountLabel) {
            habitsCountLabel.textContent = habits.length;
        }

        if (habits.length === 0) {
            habitsContainer.innerHTML = `
                <div class="empty-state col-span-full" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <i data-lucide="calendar" style="width: 48px; height: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No habits tracked yet. Create one on the left to start building routines!</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        const last7Days = getLast7Days();

        habits.forEach(habit => {
            const card = document.createElement('div');
            card.className = `habit-card ${habit.category.toLowerCase()}`;
            card.setAttribute('data-id', habit.id);

            // Category badge, Title, Delete button
            const header = document.createElement('div');
            header.className = 'habit-card-header';
            header.innerHTML = `
                <div class="habit-card-meta">
                    <span class="habit-category-badge ${habit.category.toLowerCase()}">${habit.category}</span>
                    <h4 class="habit-card-title" title="${habit.title}">${habit.title}</h4>
                </div>
                <button class="habit-delete-btn" title="Delete Habit">
                    <i data-lucide="trash-2"></i>
                </button>
            `;

            // Delete event handler
            const deleteBtn = header.querySelector('.habit-delete-btn');
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete "${habit.title}"?`)) {
                    deleteHabit(habit.id);
                }
            });

            // Streak stats block
            const stats = document.createElement('div');
            stats.className = 'habit-card-stats';
            stats.innerHTML = `
                <div class="habit-streak-group">
                    <span class="habit-streak-flame">
                        <i data-lucide="flame"></i>
                    </span>
                    <span>Streak: <span class="habit-streak-number">${habit.streak}d</span></span>
                </div>
            `;

            // 7-day strip container
            const strip = document.createElement('div');
            strip.className = 'habit-calendar-strip';

            last7Days.forEach(day => {
                const isCompleted = habit.history && habit.history[day.dateStr] === true;
                const dayBtn = document.createElement('button');
                dayBtn.className = `habit-day-btn ${isCompleted ? 'completed' : ''} ${day.isToday ? 'is-today' : ''}`;
                dayBtn.textContent = day.label;
                dayBtn.title = `${day.dateStr}${day.isToday ? ' (Today)' : ''}`;

                // Toggle click event
                dayBtn.addEventListener('click', () => {
                    toggleHabitDate(habit.id, day.dateStr);
                });

                const dayCol = document.createElement('div');
                dayCol.className = 'habit-day-col';
                dayCol.appendChild(dayBtn);
                strip.appendChild(dayCol);
            });

            card.appendChild(header);
            card.appendChild(stats);
            card.appendChild(strip);
            habitsContainer.appendChild(card);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Toggle habit completion status for a given date.
     */
    function toggleHabitDate(habitId, dateStr) {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        if (!habit.history) habit.history = {};
        
        // Toggle completion
        if (habit.history[dateStr]) {
            delete habit.history[dateStr];
        } else {
            habit.history[dateStr] = true;
        }

        // Recalculate streak
        habit.streak = calculateStreak(habit.history);
        
        saveHabitsToStorage();
        renderHabits();
        renderDashboardSummary();
    }

    /**
     * Delete a habit.
     */
    function deleteHabit(habitId) {
        const card = habitsContainer.querySelector(`.habit-card[data-id="${habitId}"]`);
        if (card && typeof gsap !== 'undefined') {
            gsap.to(card, {
                opacity: 0,
                y: -10,
                duration: 0.3,
                onComplete: () => {
                    habits = habits.filter(h => h.id !== habitId);
                    saveHabitsToStorage();
                    renderHabits();
                    renderDashboardSummary();
                }
            });
        } else {
            habits = habits.filter(h => h.id !== habitId);
            saveHabitsToStorage();
            renderHabits();
            renderDashboardSummary();
        }
    }

    /**
     * Render the dashboard summary card list.
     */
    function renderDashboardSummary() {
        if (!dbListContainer) return;

        dbListContainer.innerHTML = '';
        
        const todayStr = formatDateStr(new Date());

        if (habits.length === 0) {
            dbListContainer.innerHTML = `
                <li style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 20px 0;">
                    No habits active today.
                </li>
            `;
            if (dbPctLabel) dbPctLabel.textContent = "0% Completed";
            if (dbFillBar) dbFillBar.style.width = "0%";
            return;
        }

        let completedToday = 0;

        habits.forEach(habit => {
            const isCompletedToday = habit.history && habit.history[todayStr] === true;
            if (isCompletedToday) completedToday++;

            const li = document.createElement('li');
            li.className = 'habit-summary-item';

            li.innerHTML = `
                <div class="habit-summary-left">
                    <div class="habit-summary-checkbox ${isCompletedToday ? 'checked' : ''}">
                        <i data-lucide="check"></i>
                    </div>
                    <span class="habit-summary-label ${isCompletedToday ? 'checked' : ''}" title="${habit.title}">
                        ${habit.title}
                    </span>
                </div>
                <div class="habit-summary-right">
                    <span class="habit-summary-streak">
                        <i data-lucide="flame"></i>
                        <span>${habit.streak}d</span>
                    </span>
                    <span class="habit-summary-dot ${habit.category.toLowerCase()}"></span>
                </div>
            `;

            // Clicking the left part of the item toggles today's status
            const checkboxContainer = li.querySelector('.habit-summary-left');
            checkboxContainer.addEventListener('click', () => {
                toggleHabitDate(habit.id, todayStr);
            });

            dbListContainer.appendChild(li);
        });

        // Update progress bar
        const totalToday = habits.length;
        const pct = Math.round((completedToday / totalToday) * 100);

        if (dbPctLabel) {
            dbPctLabel.textContent = `${pct}% Completed`;
        }
        if (dbFillBar) {
            dbFillBar.style.width = `${pct}%`;
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
})();

/* ==========================================================================
   FocusFlow - Goal Setting & Tracker Controller
   ========================================================================== */

(function () {
    // 1. Pre-populated Default Goals (Loaded on first run)
    const DEFAULT_GOALS = [
        {
            id: 1,
            title: "Master SQL Joins & Subqueries",
            category: "Skill",
            deadline: getFutureDate(5),
            subtasks: [
                { id: 101, text: "Practice INNER and OUTER joins", completed: true },
                { id: 102, text: "Understand SELF joins and CROSS joins", completed: false },
                { id: 103, text: "Solve 15 SQL query challenges on LeetCode", completed: false }
            ],
            completed: false
        },
        {
            id: 2,
            title: "Deploy Final Portfolio Project",
            category: "Academic",
            deadline: getFutureDate(14),
            subtasks: [
                { id: 201, text: "Create wireframe layout mockups", completed: true },
                { id: 202, text: "Code React core components and structure", completed: true },
                { id: 203, text: "Deploy live build to Vercel/Netlify", completed: false }
            ],
            completed: false
        }
    ];

    let goals = [];
    let tempMilestones = [];

    // DOM Elements - Full Workspace View
    let titleInput, categorySelect, deadlineInput, milestoneInput, addMilestoneBtn, milestonesPreviewList, submitBtn;
    let cardsContainer, activeCountLabel, filterButtons;

    // DOM Elements - Dashboard Card Summary
    let dbManageBtn, dbCompletedCount, dbOverallPct, dbProgressRing, dbListContainer;

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        loadGoals();
        initEvents();
        renderGoals();
        renderDashboardSummary();
        renderTempMilestones(); // Restore visible draft milestones if any
    });

    /**
     * Cache DOM Elements.
     */
    function initElements() {
        // Form controls
        titleInput = document.getElementById('goal-title-input');
        categorySelect = document.getElementById('goal-category-select');
        deadlineInput = document.getElementById('goal-deadline-input');
        milestoneInput = document.getElementById('goal-milestone-input');
        addMilestoneBtn = document.getElementById('goal-add-milestone-btn');
        milestonesPreviewList = document.getElementById('goals-milestones-preview');
        submitBtn = document.getElementById('goal-submit-btn');

        // Lists and counts
        cardsContainer = document.getElementById('goals-cards-container');
        activeCountLabel = document.getElementById('goals-active-count');
        filterButtons = document.querySelectorAll('.goals-filter-btn');

        // Dashboard widgets
        dbManageBtn = document.getElementById('goals-dashboard-manage-btn');
        dbCompletedCount = document.getElementById('goals-summary-completed-count');
        dbOverallPct = document.getElementById('goals-overall-pct-label');
        dbProgressRing = document.querySelector('.goals-summary-progress-ring .goals-ring-circle');
        dbListContainer = document.getElementById('goals-summary-list');

        // Restore draft inputs if saved
        const draftTitle = localStorage.getItem('focusflow-goals-draft-title');
        const draftCategory = localStorage.getItem('focusflow-goals-draft-category');
        const draftDeadline = localStorage.getItem('focusflow-goals-draft-deadline');
        const draftMilestones = localStorage.getItem('focusflow-goals-draft-milestones');

        if (titleInput && draftTitle) titleInput.value = draftTitle;
        if (categorySelect && draftCategory) categorySelect.value = draftCategory;
        
        if (deadlineInput) {
            if (draftDeadline) {
                deadlineInput.value = draftDeadline;
            } else {
                const dateStr = getFutureDate(7);
                deadlineInput.value = dateStr;
            }
        }

        if (draftMilestones) {
            try {
                tempMilestones = JSON.parse(draftMilestones) || [];
            } catch (e) {
                tempMilestones = [];
            }
        }
    }

    /**
     * Bind Event Listeners.
     */
    function initEvents() {
        // Milestone builder addition
        if (addMilestoneBtn) {
            addMilestoneBtn.addEventListener('click', addTempMilestone);
        }
        if (milestoneInput) {
            milestoneInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addTempMilestone();
                }
            });
        }

        // Live draft savers
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                localStorage.setItem('focusflow-goals-draft-title', titleInput.value);
            });
        }
        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                localStorage.setItem('focusflow-goals-draft-category', categorySelect.value);
            });
        }
        if (deadlineInput) {
            deadlineInput.addEventListener('change', () => {
                localStorage.setItem('focusflow-goals-draft-deadline', deadlineInput.value);
            });
        }

        // Form Submit
        if (submitBtn) {
            submitBtn.addEventListener('click', createNewGoal);
        }

        // Filter triggers
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderGoals(btn.getAttribute('data-filter'));
            });
        });

        // Dashboard shortcut manage redirect
        if (dbManageBtn) {
            dbManageBtn.addEventListener('click', () => {
                const goalsNavItem = document.querySelector('.sidebar-nav .nav-item[data-view="goals"]');
                if (goalsNavItem) {
                    goalsNavItem.click();
                }
            });
        }

        // AI Assistant integration listeners
        document.addEventListener('createGoal', (e) => {
            if (!e.detail || !e.detail.title) return;
            const { title, category, deadline, milestones } = e.detail;
            const subtasks = (milestones || []).map((text, idx) => ({
                id: Date.now() + idx + Math.random(),
                text: text,
                completed: false
            }));
            const newGoal = {
                id: Date.now() + Math.random(),
                title: title.trim(),
                category: category || "Skill",
                deadline: deadline || getFutureDate(7),
                subtasks: subtasks,
                completed: false
            };
            goals.unshift(newGoal);
            saveGoals();
            const activeFilter = document.querySelector('.goals-filter-btn.active');
            const filterMode = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
            renderGoals(filterMode);
            renderDashboardSummary();
        });

        document.addEventListener('setGoalMilestoneCompletion', (e) => {
            if (!e.detail || !e.detail.goalTitle || !e.detail.milestoneText) return;
            const { goalTitle, milestoneText, completed } = e.detail;
            let updated = false;
            goals = goals.map(goal => {
                if (goal.title.toLowerCase().trim().includes(goalTitle.toLowerCase().trim())) {
                    const updatedSubtasks = goal.subtasks.map(sub => {
                        if (sub.text.toLowerCase().trim().includes(milestoneText.toLowerCase().trim())) {
                            updated = true;
                            return { ...sub, completed: completed };
                        }
                        return sub;
                    });
                    const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed);
                    return { ...goal, subtasks: updatedSubtasks, completed: allDone };
                }
                return goal;
            });
            if (updated) {
                saveGoals();
                const activeFilter = document.querySelector('.goals-filter-btn.active');
                const filterMode = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
                renderGoals(filterMode);
                renderDashboardSummary();
            }
        });

        document.addEventListener('deleteGoalByTitle', (e) => {
            if (!e.detail || !e.detail.title) return;
            const { title } = e.detail;
            const initialLength = goals.length;
            goals = goals.filter(g => !g.title.toLowerCase().trim().includes(title.toLowerCase().trim()));
            if (goals.length !== initialLength) {
                saveGoals();
                const activeFilter = document.querySelector('.goals-filter-btn.active');
                const filterMode = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
                renderGoals(filterMode);
                renderDashboardSummary();
            }
        });
    }


    /**
     * Loads goals from localStorage or initializes default values.
     */
    function loadGoals() {
        const stored = localStorage.getItem('focusflow-goals');
        const isResetClean = localStorage.getItem('focusflow-first-run-completed') === 'true';
        if (stored) {
            try {
                goals = JSON.parse(stored) || [];
            } catch (e) {
                console.error("Failed to parse stored goals, restoring defaults", e);
                goals = isResetClean ? [] : [...DEFAULT_GOALS];
            }
        } else {
            goals = isResetClean ? [] : [...DEFAULT_GOALS];
            saveGoals();
        }
    }

    /**
     * Persists goals to localStorage.
     */
    function saveGoals() {
        localStorage.setItem('focusflow-goals', JSON.stringify(goals));
    }

    /**
     * Add milestone to temp list in form before saving.
     */
    function addTempMilestone() {
        if (!milestoneInput) return;
        const txt = milestoneInput.value.trim();
        if (!txt) return;

        tempMilestones.push(txt);
        localStorage.setItem('focusflow-goals-draft-milestones', JSON.stringify(tempMilestones)); // Save milestones draft
        milestoneInput.value = '';
        renderTempMilestones();
    }

    /**
     * Render temporary milestones array in form preview.
     */
    function renderTempMilestones() {
        if (!milestonesPreviewList) return;
        milestonesPreviewList.innerHTML = '';

        tempMilestones.forEach((text, index) => {
            const li = document.createElement('li');
            li.className = 'milestone-preview-item';
            
            const span = document.createElement('span');
            span.textContent = text;
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'milestone-remove-btn';
            removeBtn.innerHTML = '<i data-lucide="x"></i>';
            removeBtn.addEventListener('click', () => {
                tempMilestones.splice(index, 1);
                localStorage.setItem('focusflow-goals-draft-milestones', JSON.stringify(tempMilestones)); // Save milestones draft after deletion
                renderTempMilestones();
            });

            li.appendChild(span);
            li.appendChild(removeBtn);
            milestonesPreviewList.appendChild(li);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Submits and saves a new goal.
     */
    function createNewGoal() {
        if (!titleInput || !categorySelect || !deadlineInput) return;

        const title = titleInput.value.trim();
        const category = categorySelect.value;
        const deadline = deadlineInput.value;

        if (!title) {
            titleInput.focus();
            shakeElement(titleInput);
            return;
        }

        if (!deadline) {
            deadlineInput.focus();
            shakeElement(deadlineInput);
            return;
        }

        // Auto-add any typed milestone text in the input box that wasn't added with the '+' button yet
        if (milestoneInput && milestoneInput.value.trim()) {
            tempMilestones.push(milestoneInput.value.trim());
            milestoneInput.value = '';
        }

        // Assemble sub-tasks checklist
        const subtasks = tempMilestones.map((text, idx) => ({
            id: Date.now() + idx + Math.random(),
            text: text,
            completed: false
        }));

        const newGoal = {
            id: Date.now() + Math.random(),
            title: title,
            category: category,
            deadline: deadline,
            subtasks: subtasks,
            completed: false
        };

        goals.unshift(newGoal);
        saveGoals();
        
        // Reset form inputs
        titleInput.value = '';
        categorySelect.selectedIndex = 0;
        deadlineInput.value = getFutureDate(7);
        tempMilestones = [];
        if (milestonesPreviewList) milestonesPreviewList.innerHTML = '';

        // Clear drafts from localStorage
        localStorage.removeItem('focusflow-goals-draft-title');
        localStorage.removeItem('focusflow-goals-draft-category');
        localStorage.removeItem('focusflow-goals-draft-deadline');
        localStorage.removeItem('focusflow-goals-draft-milestones');

        // Refresh views
        const activeFilter = document.querySelector('.goals-filter-btn.active');
        const filterMode = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        renderGoals(filterMode);
        renderDashboardSummary();
    }

    /**
     * Renders goal cards list in workspace.
     */
    function renderGoals(filter = 'all') {
        if (!cardsContainer) return;
        cardsContainer.innerHTML = '';

        let filtered = goals;
        if (filter === 'active') {
            filtered = goals.filter(g => !g.completed);
        } else if (filter === 'completed') {
            filtered = goals.filter(g => g.completed);
        }

        // Update active count
        if (activeCountLabel) {
            activeCountLabel.textContent = goals.filter(g => !g.completed).length;
        }

        if (filtered.length === 0) {
            cardsContainer.innerHTML = `
                <div class="no-goals-placeholder">
                    <i data-lucide="award"></i>
                    <p>No goals found for this filter. Start defining your milestones!</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        filtered.forEach(goal => {
            const card = document.createElement('div');
            card.className = 'grid-card goal-item-card';
            card.setAttribute('data-id', goal.id);

            // Calculate progress parameters
            const totalSteps = goal.subtasks.length;
            const completedSteps = goal.subtasks.filter(s => s.completed).length;
            const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
            const categoryLower = goal.category.toLowerCase();

            // Calculate deadline remaining days
            const countdownHTML = getDeadlineCountdown(goal.deadline);

            // Build subtasks HTML
            let subtasksHTML = '';
            goal.subtasks.forEach(sub => {
                const checkedClass = sub.completed ? 'checked' : '';
                subtasksHTML += `
                    <li class="goal-subtask-item" data-sub-id="${sub.id}">
                        <div class="goal-subtask-checkbox ${checkedClass}">
                            <i data-lucide="check"></i>
                        </div>
                        <span class="goal-subtask-text ${checkedClass}">${sub.text}</span>
                    </li>
                `;
            });

            // Card internal content layout
            card.innerHTML = `
                <div class="goal-card-top">
                    <span class="goal-category-badge ${categoryLower}">${goal.category}</span>
                    <button class="goal-delete-btn" title="Delete Goal">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
                <div class="goal-card-mid">
                    <h4 class="goal-card-title">${goal.title}</h4>
                    <div class="goal-card-deadline">
                        <i data-lucide="calendar"></i>
                        <span>Deadline: ${formatDeadlines(goal.deadline)}</span>
                        ${countdownHTML}
                    </div>
                </div>
                <div class="goal-card-progress">
                    <div class="goal-progress-info">
                        <span>Milestones: ${completedSteps}/${totalSteps}</span>
                        <span class="goal-progress-pct">${progressPct}%</span>
                    </div>
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill ${categoryLower}" style="width: ${progressPct}%;"></div>
                    </div>
                </div>
                ${totalSteps > 0 ? `
                <div class="goal-card-bottom">
                    <div class="goal-subtasks-header">
                        <span>Milestones Checklist</span>
                        <i data-lucide="chevron-down"></i>
                    </div>
                    <ul class="goal-subtasks-list">
                        ${subtasksHTML}
                    </ul>
                </div>
                ` : ''}
            `;

            // Checklist event listener bindings
            const subtaskItems = card.querySelectorAll('.goal-subtask-item');
            subtaskItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    const subId = parseFloat(item.getAttribute('data-sub-id'));
                    toggleSubtask(goal.id, subId);
                });
            });

            // Delete event trigger
            const deleteBtn = card.querySelector('.goal-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    deleteGoal(goal.id);
                });
            }

            cardsContainer.appendChild(card);

            // Collapsible header toggle
            const subtasksHeader = card.querySelector('.goal-subtasks-header');
            if (subtasksHeader) {
                const sublist = card.querySelector('.goal-subtasks-list');
                
                subtasksHeader.addEventListener('click', () => {
                    const collapsed = subtasksHeader.classList.toggle('collapsed');
                    if (collapsed) {
                        sublist.classList.add('collapsed');
                    } else {
                        sublist.classList.remove('collapsed');
                    }
                });
            }
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Toggles completed status of a subtask and recalculates goals.
     */
    function toggleSubtask(goalId, subtaskId) {
        goals = goals.map(goal => {
            if (goal.id === goalId) {
                const updatedSubtasks = goal.subtasks.map(sub => {
                    if (sub.id === subtaskId) {
                        return { ...sub, completed: !sub.completed };
                    }
                    return sub;
                });
                
                // Re-evaluate goal overall completion status
                const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed);
                return { ...goal, subtasks: updatedSubtasks, completed: allDone };
            }
            return goal;
        });

        saveGoals();
        
        // Re-render
        const activeFilter = document.querySelector('.goals-filter-btn.active');
        const filterMode = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        renderGoals(filterMode);
        renderDashboardSummary();
    }

    /**
     * Deletes a goal card.
     */
    function deleteGoal(id) {
        goals = goals.filter(g => g.id !== id);
        saveGoals();

        // Refresh views
        const activeFilter = document.querySelector('.goals-filter-btn.active');
        const filterMode = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        renderGoals(filterMode);
        renderDashboardSummary();
    }

    /**
     * Calculates stats and updates Dashboard goals card summaries.
     */
    function renderDashboardSummary() {
        if (!dbCompletedCount || !dbOverallPct || !dbProgressRing || !dbListContainer) return;

        const totalGoals = goals.length;
        const completedGoals = goals.filter(g => g.completed).length;

        // Display Met ratio
        dbCompletedCount.textContent = `${completedGoals}/${totalGoals}`;

        // Calculate global progress based on total subtask counts
        let totalMilestonesCount = 0;
        let completedMilestonesCount = 0;

        goals.forEach(goal => {
            totalMilestonesCount += goal.subtasks.length;
            completedMilestonesCount += goal.subtasks.filter(s => s.completed).length;
        });

        const overallPct = totalMilestonesCount > 0 
            ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100)
            : 0;

        dbOverallPct.textContent = `${overallPct}%`;

        // Radial Ring SVG fill calculations (Circumference: 2 * PI * 24 = 150.79)
        const circumference = 150.796;
        const offset = circumference - (overallPct / 100) * circumference;
        dbProgressRing.style.strokeDasharray = `${circumference}`;
        dbProgressRing.style.strokeDashoffset = `${offset}`;

        // Render top 2 active goals
        dbListContainer.innerHTML = '';
        const activeGoals = goals.filter(g => !g.completed);

        if (activeGoals.length === 0) {
            dbListContainer.innerHTML = `
                <div style="font-size: 0.75rem; text-align: center; color: var(--text-muted); margin-top: 10px;">
                    No active goals. Add some in the Goals tab!
                </div>
            `;
            return;
        }

        activeGoals.forEach(goal => {
            const completed = goal.subtasks.filter(s => s.completed).length;
            const total = goal.subtasks.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const categoryLower = goal.category.toLowerCase();

            const item = document.createElement('div');
            item.className = 'goals-summary-item';
            item.innerHTML = `
                <div class="goals-summary-item-header">
                    <span class="goals-summary-item-title">${goal.title}</span>
                    <span class="goals-summary-item-pct">${pct}%</span>
                </div>
                <div class="goals-summary-item-bar">
                    <div class="goals-summary-item-fill" style="width: ${pct}%; background: var(--accent-${categoryAccentMapper(categoryLower)}); "></div>
                </div>
            `;
            dbListContainer.appendChild(item);
        });
    }

    /**
     * Resolves accent colors for dashboard bar fills.
     */
    function categoryAccentMapper(cat) {
        if (cat === 'academic') return 'purple';
        if (cat === 'skill') return 'blue';
        if (cat === 'personal') return 'pink';
        if (cat === 'health') return 'green';
        return 'purple';
    }

    /**
     * Utility: Calculates dynamic dates.
     */
    function getFutureDate(daysInFuture) {
        const d = new Date();
        d.setDate(d.getDate() + daysInFuture);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    /**
     * Formatting: Formats dates to standard readable string.
     */
    function formatDeadlines(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }

    /**
     * Calculates days remaining countdown badge HTML.
     */
    function getDeadlineCountdown(dateStr) {
        if (!dateStr) return '';
        
        const deadline = new Date(dateStr).setHours(0,0,0,0);
        const today = new Date().setHours(0,0,0,0);
        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `<span class="goal-deadline-countdown overdue">Overdue</span>`;
        } else if (diffDays === 0) {
            return `<span class="goal-deadline-countdown due-soon">Today</span>`;
        } else if (diffDays === 1) {
            return `<span class="goal-deadline-countdown due-soon">Tomorrow</span>`;
        } else if (diffDays <= 3) {
            return `<span class="goal-deadline-countdown due-soon">${diffDays} days left</span>`;
        } else {
            return `<span class="goal-deadline-countdown">${diffDays} days left</span>`;
        }
    }

    /**
     * UX: Helper function to apply shake animation to inputs on empty submissions.
     */
    function shakeElement(el) {
        el.classList.add('shake-input');
        el.style.borderColor = 'var(--accent-pink)';
        
        setTimeout(() => {
            el.classList.remove('shake-input');
            el.style.borderColor = '';
        }, 500);
    }
})();

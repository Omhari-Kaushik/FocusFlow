/* ==========================================================================
   FocusFlow - Calendar View & Event Planner Controller
   ========================================================================== */

(function () {
    // Curated Default Reminders (Loaded on first run)
    function getFutureDate(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    const DEFAULT_EVENTS = [
        {
            id: 10001,
            title: "Submit Chemistry Lab Report",
            date: getFutureDate(2),
            time: "14:00",
            category: "task",
            desc: "Turn in the thermodynamics lab data sheet and write-up on Teams."
        },
        {
            id: 10002,
            title: "Group Study Session: calculus",
            date: getFutureDate(6),
            time: "16:30",
            category: "meeting",
            desc: "Discuss Chapter 4 optimization problems with Sarah and Alex at library."
        },
        {
            id: 10003,
            title: "Physics Midterm Prep Exam",
            date: getFutureDate(10),
            time: "09:00",
            category: "study",
            desc: "Solve 3 practice exams under exam conditions."
        }
    ];

    // Calendar States
    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth(); // 0-indexed
    let selectedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Event Databases
    let goalEvents = [];
    let planEvents = [];
    let customEvents = [];

    // DOM Elements - Calendar Panel
    let daysGrid, monthYearLabel, prevMonthBtn, nextMonthBtn, todayBtn;
    let selectedDayLabel, selectedEventsList, addEventBtn;

    // DOM Elements - Modal Dialog
    let eventModal, modalDateLabel, modalCancelBtn, modalSaveBtn;
    let titleInput, timeInput, categorySelect, descInput;

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        loadAllEvents();
        initEvents();
        renderCalendar();
        renderSelectedDayEvents(selectedDate);
    });

    // Listen to hash shifts to refresh data when user switches view
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#calendar') {
            loadAllEvents();
            renderCalendar();
            renderSelectedDayEvents(selectedDate);
        }
    });

    /**
     * Cache DOM Elements.
     */
    function initElements() {
        // Grid & controls
        daysGrid = document.getElementById('calendar-days-grid');
        monthYearLabel = document.getElementById('calendar-month-year-label');
        prevMonthBtn = document.getElementById('calendar-prev-month');
        nextMonthBtn = document.getElementById('calendar-next-month');
        todayBtn = document.getElementById('calendar-today-btn');

        // Sidebar detail cards
        selectedDayLabel = document.getElementById('selected-day-label');
        selectedEventsList = document.getElementById('selected-day-events-list');
        addEventBtn = document.getElementById('calendar-add-event-btn');

        // Modal elements
        eventModal = document.getElementById('calendar-event-modal');
        modalDateLabel = document.getElementById('modal-event-date-label');
        modalCancelBtn = document.getElementById('calendar-modal-cancel-btn');
        modalSaveBtn = document.getElementById('calendar-modal-save-btn');

        titleInput = document.getElementById('event-title-input');
        timeInput = document.getElementById('event-time-input');
        categorySelect = document.getElementById('event-category-select');
        descInput = document.getElementById('event-desc-input');
    }

    /**
     * Load goals, study plans, and custom events from localStorage.
     */
    function loadAllEvents() {
        // 1. Load Goals
        const storedGoals = localStorage.getItem('focusflow-goals');
        if (storedGoals) {
            try {
                goalEvents = JSON.parse(storedGoals).map(goal => ({
                    id: goal.id,
                    title: goal.title,
                    date: goal.deadline,
                    category: goal.category,
                    completed: goal.completed,
                    type: 'goal'
                }));
            } catch (e) {
                console.error("Error loading goals for calendar", e);
                goalEvents = [];
            }
        } else {
            goalEvents = [];
        }

        // 2. Load Study Plans
        const storedPlan = localStorage.getItem('focusflow-ai-plan');
        if (storedPlan) {
            try {
                const plan = JSON.parse(storedPlan);
                // Map the active plan date. If it doesn't have a date attribute yet, default to today.
                const planDate = plan.date || new Date().toISOString().split('T')[0];
                const studyBlocks = plan.blocks ? plan.blocks.filter(b => b.type === 'study-block') : [];
                
                if (studyBlocks.length > 0) {
                    planEvents = [{
                        id: 'ai-plan-event',
                        title: `Study Session: ${plan.subject}`,
                        date: planDate,
                        goalType: plan.goal,
                        blockCount: studyBlocks.length,
                        type: 'plan'
                    }];
                } else {
                    planEvents = [];
                }
            } catch (e) {
                console.error("Error loading study plan for calendar", e);
                planEvents = [];
            }
        } else {
            planEvents = [];
        }

        // 3. Load Custom Events
        const storedCustom = localStorage.getItem('focusflow-calendar-events');
        const isResetClean = localStorage.getItem('focusflow-first-run-completed') === 'true';
        if (storedCustom) {
            try {
                customEvents = JSON.parse(storedCustom);
            } catch (e) {
                console.error("Error parsing custom calendar events", e);
                customEvents = isResetClean ? [] : DEFAULT_EVENTS;
                saveCustomEvents();
            }
        } else {
            customEvents = isResetClean ? [] : DEFAULT_EVENTS;
            saveCustomEvents();
        }
    }

    /**
     * Save custom events to localStorage.
     */
    function saveCustomEvents() {
        localStorage.setItem('focusflow-calendar-events', JSON.stringify(customEvents));
    }

    /**
     * Set up calendar event handlers.
     */
    function initEvents() {
        // Month navigations
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => changeMonth(-1));
        }
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => changeMonth(1));
        }
        if (todayBtn) {
            todayBtn.addEventListener('click', selectToday);
        }

        // Add custom event click
        if (addEventBtn) {
            addEventBtn.addEventListener('click', openAddEventModal);
        }

        // Modal controls
        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', closeAddEventModal);
        }
        if (modalSaveBtn) {
            modalSaveBtn.addEventListener('click', saveCustomEvent);
        }

        // Listen for external event creation requests (e.g. from the AI Assistant)
        document.addEventListener('createCalendarEvent', (e) => {
            if (e.detail && e.detail.title && e.detail.date) {
                const newEvent = {
                    id: Date.now() + Math.random(),
                    title: e.detail.title.trim(),
                    date: e.detail.date, // format YYYY-MM-DD
                    time: e.detail.time || "12:00",
                    category: e.detail.category || "study",
                    desc: e.detail.desc || ""
                };
                customEvents.push(newEvent);
                saveCustomEvents();
                renderCalendar();
                renderSelectedDayEvents(selectedDate);
            }
        });
    }

    /**
     * Increment or decrement calendar months.
     */
    function changeMonth(direction) {
        currentMonth += direction;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        } else if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    }

    /**
     * Select today's date and shift calendar grid to current month.
     */
    function selectToday() {
        const todayStr = currentDate.toISOString().split('T')[0];
        currentYear = currentDate.getFullYear();
        currentMonth = currentDate.getMonth();
        selectedDate = todayStr;
        
        renderCalendar();
        renderSelectedDayEvents(selectedDate);
    }

    /**
     * Render the monthly calendar grid cells.
     */
    function renderCalendar() {
        if (!daysGrid) return;
        daysGrid.innerHTML = '';

        // Month Names
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        if (monthYearLabel) {
            monthYearLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
        }

        // Calculate offset (Monday start)
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        let startDayIndex = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
        // Shift offset for Monday start: Mon=0, Tue=1, ..., Sun=6
        let leadingDays = startDayIndex === 0 ? 6 : startDayIndex - 1;

        const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

        const cells = [];

        // 1. Leading days from previous month
        for (let i = leadingDays - 1; i >= 0; i--) {
            const dayNum = prevMonthTotalDays - i;
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            cells.push({
                day: dayNum,
                dateStr: `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`,
                inactive: true
            });
        }

        // 2. Active month days
        for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
            cells.push({
                day: dayNum,
                dateStr: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`,
                inactive: false
            });
        }

        // 3. Trailing days from next month
        const totalGridSlots = 42; // standard 6-row calendar grid
        const trailingDays = totalGridSlots - cells.length;
        for (let dayNum = 1; dayNum <= trailingDays; dayNum++) {
            const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            cells.push({
                day: dayNum,
                dateStr: `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`,
                inactive: true
            });
        }

        // Render cell elements to DOM
        const todayStr = currentDate.toISOString().split('T')[0];

        cells.forEach(cell => {
            const cellEl = document.createElement('div');
            cellEl.className = 'calendar-day';
            if (cell.inactive) cellEl.classList.add('inactive');
            if (cell.dateStr === todayStr) cellEl.classList.add('today');
            if (cell.dateStr === selectedDate) cellEl.classList.add('selected');

            // Render day number badge
            cellEl.innerHTML = `<span class="calendar-day-number">${cell.day}</span>`;

            // Calculate event dots on this cell
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'day-events-dots';

            const hasGoal = goalEvents.some(e => e.date === cell.dateStr);
            const hasPlan = planEvents.some(e => e.date === cell.dateStr);
            const hasCustom = customEvents.some(e => e.date === cell.dateStr);

            if (hasGoal) {
                const dot = document.createElement('span');
                dot.className = 'day-event-dot goal';
                dotsContainer.appendChild(dot);
            }
            if (hasPlan) {
                const dot = document.createElement('span');
                dot.className = 'day-event-dot plan';
                dotsContainer.appendChild(dot);
            }
            if (hasCustom) {
                const dot = document.createElement('span');
                dot.className = 'day-event-dot custom';
                dotsContainer.appendChild(dot);
            }

            cellEl.appendChild(dotsContainer);

            // Selection Event
            cellEl.addEventListener('click', () => {
                // Remove selected class from all cells
                const allCells = daysGrid.querySelectorAll('.calendar-day');
                allCells.forEach(c => c.classList.remove('selected'));
                
                // Add select class
                cellEl.classList.add('selected');
                selectedDate = cell.dateStr;
                renderSelectedDayEvents(selectedDate);
            });

            daysGrid.appendChild(cellEl);
        });
    }

    /**
     * Render detailed event listings inside the sidebar details list card.
     */
    function renderSelectedDayEvents(dateStr) {
        if (!selectedEventsList || !selectedDayLabel) return;

        // Render upcoming events list
        renderUpcomingEvents();

        // Format selected date string nicely: Thursday, June 18, 2026
        const parts = dateStr.split('-');
        const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        
        const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
        selectedDayLabel.textContent = dObj.toLocaleDateString('en-US', options);

        // Gather all events matching dateStr
        const dayGoals = goalEvents.filter(e => e.date === dateStr);
        const dayPlans = planEvents.filter(e => e.date === dateStr);
        const dayCustom = customEvents.filter(e => e.date === dateStr);

        selectedEventsList.innerHTML = '';

        const totalEvents = dayGoals.length + dayPlans.length + dayCustom.length;

        if (totalEvents === 0) {
            selectedEventsList.innerHTML = `
                <div class="calendar-empty-state">
                    <i data-lucide="calendar"></i>
                    <p>No goals, plans, or events scheduled for this day.</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        // 1. Render Goal Deadlines
        dayGoals.forEach(goal => {
            const el = document.createElement('div');
            el.className = 'calendar-event-item';
            el.innerHTML = `
                <div class="calendar-event-item-left">
                    <div class="calendar-event-title-row">
                        <span class="calendar-event-title" title="${escapeHtml(goal.title)}">${escapeHtml(goal.title)}</span>
                    </div>
                    <div class="calendar-event-meta">
                        <span class="calendar-event-badge goal">Goal Deadline</span>
                        <span class="calendar-event-time" style="background: rgba(139, 92, 246, 0.08); color: var(--accent-purple);">
                            ${goal.completed ? 'Completed ✓' : 'In Progress'}
                        </span>
                    </div>
                </div>
                <button class="calendar-event-link-btn" data-view="goals" title="Navigate to Goals Workspace">
                    <i data-lucide="external-link"></i>
                </button>
            `;
            bindLinkEvent(el.querySelector('.calendar-event-link-btn'));
            selectedEventsList.appendChild(el);
        });

        // 2. Render AI Study Plans
        dayPlans.forEach(plan => {
            const el = document.createElement('div');
            el.className = 'calendar-event-item';
            el.innerHTML = `
                <div class="calendar-event-item-left">
                    <div class="calendar-event-title-row">
                        <span class="calendar-event-title" title="${escapeHtml(plan.title)}">${escapeHtml(plan.title)}</span>
                    </div>
                    <div class="calendar-event-meta">
                        <span class="calendar-event-badge plan">Study Plan</span>
                        <span class="calendar-event-time">
                            <i data-lucide="book-open" style="width: 11px; height: 11px; display: inline;"></i> ${plan.blockCount} blocks
                        </span>
                        <span class="calendar-event-time" style="text-transform: capitalize;">${plan.goalType}</span>
                    </div>
                </div>
                <button class="calendar-event-link-btn" data-view="study-plan" title="Navigate to AI Study Plan Workspace">
                    <i data-lucide="external-link"></i>
                </button>
            `;
            bindLinkEvent(el.querySelector('.calendar-event-link-btn'));
            selectedEventsList.appendChild(el);
        });

        // 3. Render Custom Reminders/Events
        dayCustom.forEach(event => {
            const el = document.createElement('div');
            el.className = 'calendar-event-item';
            
            let timeMarkup = '';
            if (event.time) {
                timeMarkup = `
                    <span class="calendar-event-time">
                        <i data-lucide="clock" style="width: 11px; height: 11px; display: inline;"></i> ${event.time}
                    </span>
                `;
            }

            el.innerHTML = `
                <div class="calendar-event-item-left">
                    <div class="calendar-event-title-row">
                        <span class="calendar-event-title" title="${escapeHtml(event.title)}">${escapeHtml(event.title)}</span>
                    </div>
                    ${event.desc ? `<p class="calendar-event-desc">${escapeHtml(event.desc)}</p>` : ''}
                    <div class="calendar-event-meta">
                        <span class="calendar-event-badge custom-${event.category}">${event.category}</span>
                        ${timeMarkup}
                    </div>
                </div>
                <button class="calendar-event-delete-btn" title="Delete Event">
                    <i data-lucide="trash-2"></i>
                </button>
            `;

            // Delete Custom Event listener
            el.querySelector('.calendar-event-delete-btn').addEventListener('click', () => {
                deleteCustomEvent(event.id);
            });

            selectedEventsList.appendChild(el);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Bind direct click listeners to the external view redirect links.
     */
    function bindLinkEvent(btn) {
        if (!btn) return;
        btn.addEventListener('click', () => {
            const targetView = btn.getAttribute('data-view');
            const navItem = document.querySelector(`.sidebar-nav .nav-item[data-view="${targetView}"]`);
            if (navItem) {
                navItem.click();
            }
        });
    }

    /**
     * Open add custom event modal with date pre-filled.
     */
    function openAddEventModal() {
        if (!eventModal || !modalDateLabel) return;

        // Format the selected date for header preview: June 18, 2026
        const parts = selectedDate.split('-');
        const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        modalDateLabel.textContent = dObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        // Clear input values
        if (titleInput) titleInput.value = '';
        if (timeInput) timeInput.value = '';
        if (categorySelect) categorySelect.value = 'study';
        if (descInput) descInput.value = '';

        // Open modal
        eventModal.classList.remove('hidden');
        if (titleInput) titleInput.focus();

        // Bounce-in card animation
        const card = eventModal.querySelector('.calendar-modal-card');
        if (card && typeof gsap !== 'undefined') {
            gsap.fromTo(card, 
                { scale: 0.85, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
            );
        }
    }

    /**
     * Close modal window.
     */
    function closeAddEventModal() {
        if (eventModal) {
            eventModal.classList.add('hidden');
        }
    }

    /**
     * Save custom event to database.
     */
    function saveCustomEvent() {
        if (!titleInput) return;

        const title = titleInput.value.trim();
        if (!title) {
            // Shake input if empty
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(titleInput, 
                    { x: -8 }, 
                    { x: 0, duration: 0.08, repeat: 4, yoyo: true, clearProps: 'x' }
                );
            }
            titleInput.focus();
            return;
        }

        const newEvent = {
            id: Date.now(),
            title: title,
            date: selectedDate,
            time: timeInput ? timeInput.value : '',
            category: categorySelect ? categorySelect.value : 'study',
            desc: descInput ? descInput.value.trim() : ''
        };

        customEvents.push(newEvent);
        saveCustomEvents();
        closeAddEventModal();

        // Refresh calendar and detail listings
        renderCalendar();
        renderSelectedDayEvents(selectedDate);
    }

    /**
     * Delete custom event.
     */
    function deleteCustomEvent(id) {
        customEvents = customEvents.filter(e => e.id !== id);
        saveCustomEvents();
        
        // Refresh
        renderCalendar();
        renderSelectedDayEvents(selectedDate);
    }

    /**
     * HTML escaping utility.
     */
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    /**
     * Gather and render all upcoming events chronologically.
     */
    function renderUpcomingEvents() {
        const upcomingContainer = document.getElementById('upcoming-events-list');
        if (!upcomingContainer) return;
        upcomingContainer.innerHTML = '';

        // Combine all events: goalEvents, planEvents, customEvents
        const allEvents = [];
        
        goalEvents.forEach(g => {
            allEvents.push({
                title: g.title,
                date: g.date,
                category: 'goal',
                completed: g.completed
            });
        });

        planEvents.forEach(p => {
            allEvents.push({
                title: p.title,
                date: p.date,
                category: 'plan'
            });
        });

        customEvents.forEach(c => {
            allEvents.push({
                title: c.title,
                date: c.date,
                category: c.category,
                time: c.time,
                desc: c.desc
            });
        });

        // Filter: only show today's and future events
        const todayStr = new Date().toISOString().split('T')[0];
        const futureEvents = allEvents.filter(e => e.date >= todayStr);

        // Sort by date (ascending) and then by time if available
        futureEvents.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            const timeA = a.time || "00:00";
            const timeB = b.time || "00:00";
            return timeA.localeCompare(timeB);
        });

        if (futureEvents.length === 0) {
            upcomingContainer.innerHTML = `
                <div style="font-size: 0.75rem; text-align: center; color: var(--text-muted); padding: 20px 0;">
                    No upcoming events.
                </div>
            `;
            return;
        }

        futureEvents.forEach(event => {
            const item = document.createElement('div');
            item.className = 'upcoming-event-item';

            // Format date for display: e.g., "Jun 28"
            let formattedDate = event.date;
            try {
                const parts = event.date.split('-');
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } catch (err) {}

            let badgeClass = 'custom-study';
            let badgeLabel = event.category;
            if (event.category === 'goal') {
                badgeClass = 'goal';
                badgeLabel = 'Goal';
            } else if (event.category === 'plan') {
                badgeClass = 'plan';
                badgeLabel = 'Study Plan';
            } else {
                badgeClass = `custom-${event.category}`;
            }

            item.innerHTML = `
                <div class="upcoming-event-left">
                    <span class="upcoming-event-title" title="${escapeHtml(event.title)}">${escapeHtml(event.title)}</span>
                    <div class="upcoming-event-meta">
                        <span class="upcoming-event-badge ${badgeClass}">${badgeLabel}</span>
                        ${event.time ? `<span><i data-lucide="clock" style="width: 10px; height: 10px; display: inline; margin-top:-2px;"></i> ${event.time}</span>` : ''}
                    </div>
                </div>
                <span class="upcoming-event-date">${formattedDate}</span>
            `;

            upcomingContainer.appendChild(item);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
})();

/* ==========================================================================
   FocusFlow - Task Manager Logic
   ========================================================================== */

(function () {
    // 1. Initial State (Pre-populate with reference screenshot tasks on first launch)
    const DEFAULT_TASAS = [
        { id: 1, text: 'Complete Math Chapter 5', completed: false },
        { id: 2, text: 'Read Physics Notes', completed: true },
        { id: 3, text: 'Solve Chemistry Questions', completed: true },
        { id: 4, text: 'Prepare for English Test', completed: false },
        { id: 5, text: 'Revise Biology Diagrams', completed: false }
    ];

    let tasks = [];

    // DOM Elements
    let listContainer, inputPanel, addTriggerBtn, saveBtn, newInput, progressText, clearBtn;

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        loadTasks();
        initEvents();
        renderTasks();
    });

    /**
     * Cache DOM elements.
     */
    function initElements() {
        listContainer = document.getElementById('tasks-list');
        inputPanel = document.getElementById('tasks-input-panel');
        addTriggerBtn = document.getElementById('tasks-add-trigger-btn');
        saveBtn = document.getElementById('tasks-save-btn');
        newInput = document.getElementById('tasks-new-input');
        progressText = document.getElementById('tasks-progress');
        clearBtn = document.getElementById('tasks-clear-btn');
    }

    /**
     * Attach Event Listeners.
     */
    function initEvents() {
        if (addTriggerBtn) {
            addTriggerBtn.addEventListener('click', toggleInputPanel);
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', addNewTask);
        }
        if (newInput) {
            newInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addNewTask();
                }
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', clearCompletedTasks);
        }

        // Collapse input panel when view changes (e.g. navigating to Goals or back to Dashboard)
        document.addEventListener('viewChanged', () => {
            if (inputPanel) {
                inputPanel.classList.add('hidden');
            }
        });

        // Listen for external task creation requests (e.g. from the AI Study Plan)
        document.addEventListener('createTask', (e) => {
            console.log("tasks.js received createTask event:", e.detail);
            if (e.detail && e.detail.text) {
                const newTask = {
                    id: Date.now() + Math.random(),
                    text: e.detail.text.trim(),
                    completed: false
                };
                tasks.push(newTask);
                console.log("Added task to list, current tasks:", tasks);
                saveTasks();
                renderTasks();
            }
        });

        // Listen for external task completion updates (e.g. from the AI Study Plan)
        document.addEventListener('setTaskCompletion', (e) => {
            if (e.detail && e.detail.text) {
                const text = e.detail.text.trim();
                const completed = e.detail.completed;
                let changed = false;

                tasks = tasks.map(task => {
                    if (task.text.trim() === text && task.completed !== completed) {
                        changed = true;
                        dispatchCompletionChange(task.text, completed);
                        return { ...task, completed: completed };
                    }
                    return task;
                });

                if (changed) {
                    saveTasks();
                    renderTasks();
                }
            }
        });

        // Listen for external task deletion requests (e.g. from the AI Assistant)
        document.addEventListener('deleteTask', (e) => {
            if (e.detail && e.detail.text) {
                const text = e.detail.text.trim().toLowerCase();
                const matchedTask = tasks.find(t => t.text.trim().toLowerCase() === text);
                if (matchedTask) {
                    let itemElement = null;
                    if (listContainer) {
                        itemElement = listContainer.querySelector(`[data-id="${matchedTask.id}"]`);
                    }
                    deleteTask(matchedTask.id, itemElement);
                }
            }
        });
    }

    /**
     * Loads tasks from LocalStorage or defaults.
     */
    function loadTasks() {
        const stored = localStorage.getItem('focusflow-tasks');
        const isResetClean = localStorage.getItem('focusflow-first-run-completed') === 'true';
        if (stored) {
            try {
                tasks = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse stored tasks', e);
                tasks = isResetClean ? [] : [...DEFAULT_TASAS];
            }
        } else {
            tasks = isResetClean ? [] : [...DEFAULT_TASAS];
            localStorage.setItem('focusflow-tasks', JSON.stringify(tasks));
        }
    }

    /**
     * Saves tasks state back to LocalStorage and dispatches update event.
     */
    function saveTasks() {
        localStorage.setItem('focusflow-tasks', JSON.stringify(tasks));
        updateProgress();
        
        // Dispatch event so the Today's Statistics card knows to recalculate instantly
        const event = new CustomEvent('tasksUpdated');
        document.dispatchEvent(event);
    }

    /**
     * Toggles visibility of the collapsible input panel.
     */
    function toggleInputPanel() {
        if (!inputPanel) return;
        
        const isHidden = inputPanel.classList.contains('hidden');
        
        if (isHidden) {
            inputPanel.classList.remove('hidden');
            if (newInput) newInput.focus();
            
            // GSAP entry animation
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(inputPanel, 
                    { opacity: 0, y: -10 },
                    { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
                );
            }
        } else {
            inputPanel.classList.add('hidden');
        }
    }

    /**
     * Adds a new task to the array.
     */
    function addNewTask() {
        if (!newInput) return;
        
        const text = newInput.value.trim();
        if (!text) return;

        const newTask = {
            id: Date.now(),
            text: text,
            completed: false
        };

        tasks.push(newTask);
        saveTasks();
        
        // Render and animate item addition
        newInput.value = '';
        renderTasks();
        
        // Close panel after save
        inputPanel.classList.add('hidden');

        // GSAP animate new element in the list
        if (typeof gsap !== 'undefined' && listContainer) {
            const firstChild = listContainer.firstElementChild;
            if (firstChild) {
                gsap.fromTo(firstChild, 
                    { opacity: 0, height: 0, transform: 'scale(0.95)', margin: 0, borderPadding: 0 },
                    { opacity: 1, height: 'auto', transform: 'scale(1)', duration: 0.35, ease: 'back.out(1.2)' }
                );
            }
        }
    }

    /**
     * Toggles a task completion state.
     */
    function toggleTask(id) {
        tasks = tasks.map(task => {
            if (task.id === id) {
                const updatedStatus = !task.completed;
                
                // Dispatch event to statistics module
                dispatchCompletionChange(task.text, updatedStatus);
                
                return { ...task, completed: updatedStatus };
            }
            return task;
        });
        
        saveTasks();
        
        // Wait minor delay for checking check animation, then update progress count
        setTimeout(updateProgress, 100);
    }

    /**
     * Dispatch event when a task is completed/uncompleted.
     */
    function dispatchCompletionChange(taskText, isCompleted) {
        const event = new CustomEvent('taskStatusChange', {
            detail: {
                text: taskText,
                completed: isCompleted,
                totalCompleted: tasks.filter(t => t.completed).length + (isCompleted ? 1 : -1),
                totalTasks: tasks.length
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Deletes a specific task.
     */
    function deleteTask(id, itemElement) {
        if (typeof gsap !== 'undefined' && itemElement) {
            // Animate item slide-out before deleting state
            gsap.to(itemElement, {
                opacity: 0,
                x: 30,
                height: 0,
                paddingTop: 0,
                paddingBottom: 0,
                marginTop: 0,
                marginBottom: 0,
                borderWidth: 0,
                duration: 0.25,
                ease: 'power2.in',
                onComplete: () => {
                    tasks = tasks.filter(task => task.id !== id);
                    saveTasks();
                    renderTasks();
                }
            });
        } else {
            tasks = tasks.filter(task => task.id !== id);
            saveTasks();
            renderTasks();
        }
    }

    /**
     * Clears all completed tasks.
     */
    function clearCompletedTasks() {
        const completedItems = listContainer.querySelectorAll('.task-item');
        let hasCompleted = false;

        tasks.forEach((task, idx) => {
            if (task.completed) {
                hasCompleted = true;
                const el = completedItems[idx];
                if (typeof gsap !== 'undefined' && el) {
                    gsap.to(el, { opacity: 0, x: -30, height: 0, duration: 0.25, ease: 'power2.in' });
                }
            }
        });

        if (!hasCompleted) return;

        // Delay state flush to allow animation to finish
        setTimeout(() => {
            tasks = tasks.filter(task => !task.completed);
            saveTasks();
            renderTasks();
        }, 250);
    }

    /**
     * Renders task list items to DOM.
     */
    function renderTasks() {
        if (!listContainer) return;

        listContainer.innerHTML = '';

        // Render from newest to oldest
        const sortedTasks = [...tasks].reverse();

        if (sortedTasks.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 24px 0;">
                    No tasks remaining. Add a task to stay focused!
                </div>
            `;
            updateProgress();
            return;
        }

        sortedTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.setAttribute('data-id', task.id);

            li.innerHTML = `
                <label class="task-checkbox-wrapper">
                    <input type="checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="task-checkbox-custom"></span>
                    <span class="task-text">${escapeHtml(task.text)}</span>
                </label>
                <button class="task-delete-btn" title="Delete Task">
                    <i data-lucide="trash-2"></i>
                </button>
            `;

            // Wire up checkbox toggling
            const checkbox = li.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => toggleTask(task.id));

            // Wire up deletion
            const deleteBtn = li.querySelector('.task-delete-btn');
            deleteBtn.addEventListener('click', () => deleteTask(task.id, li));

            listContainer.appendChild(li);
        });

        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({
                attrs: {
                    class: ['lucide-icon']
                },
                nameAttr: 'data-lucide',
                nodeList: listContainer.querySelectorAll('[data-lucide]')
            });
        }

        updateProgress();
    }

    /**
     * Updates the progress indicator text.
     */
    function updateProgress() {
        if (!progressText) return;
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        progressText.textContent = `Completed: ${completed} / ${total}`;
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
})();

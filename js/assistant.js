/* ==========================================================================
   FocusFlow - AI Chat Assistant (with Tool Calling) Controller
   ========================================================================== */

(function () {
    let assistantTrigger, assistantCard, chatMessages, chatInput, sendBtn, closeBtn, clearBtn;
    let chatHistory = [];
    const MAX_HISTORY = 15;

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        initEvents();
        loadChatHistory();
        initResizer();
        
        // Initialize Lucide icons inside the assistant widget
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });

    function initElements() {
        assistantTrigger = document.getElementById('assistant-trigger');
        assistantCard = document.getElementById('assistant-card');
        chatMessages = document.getElementById('assistant-chat-messages');
        chatInput = document.getElementById('assistant-input');
        sendBtn = document.getElementById('assistant-send-btn');
        closeBtn = document.getElementById('close-assistant');
        clearBtn = document.getElementById('clear-assistant-chat');

        // Restore resized dimensions if present
        const savedWidth = localStorage.getItem('focusflow-assistant-width');
        const savedHeight = localStorage.getItem('focusflow-assistant-height');
        if (savedWidth && savedHeight && assistantCard) {
            assistantCard.style.width = savedWidth;
            assistantCard.style.height = savedHeight;
        }
    }

    function initEvents() {
        if (assistantTrigger) {
            assistantTrigger.addEventListener('click', toggleAssistant);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                setAssistantVisible(false);
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', clearChat);
        }
        if (sendBtn) {
            sendBtn.addEventListener('click', handleUserSend);
        }
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleUserSend();
                }
            });
        }
    }

    function toggleAssistant() {
        const isHidden = assistantCard.classList.contains('hidden');
        setAssistantVisible(isHidden);
    }

    function setAssistantVisible(visible) {
        if (!assistantCard) return;
        if (visible) {
            assistantCard.classList.remove('hidden');
            if (chatInput) chatInput.focus();
            scrollToBottom();
            if (assistantTrigger) {
                assistantTrigger.classList.add('active');
            }
        } else {
            assistantCard.classList.add('hidden');
            if (assistantTrigger) {
                assistantTrigger.classList.remove('active');
            }
        }
    }

    function scrollToBottom() {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function appendMessage(role, text, isInfo = false, saveToHistory = true) {
        if (!chatMessages) return;

        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${role}`;
        if (isInfo) {
            messageEl.classList.add('info');
        }

        // Use simple markdown formatting (bolding)
        const formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        messageEl.innerHTML = formatted;
        chatMessages.appendChild(messageEl);
        scrollToBottom();

        // Save to memory and storage if it's user or assistant and saveToHistory is true
        if ((role === 'user' || role === 'assistant') && saveToHistory) {
            chatHistory.push({ role, content: text });
            if (chatHistory.length > MAX_HISTORY) {
                chatHistory.shift();
            }
            saveChatHistory();
        }
    }

    function saveChatHistory() {
        localStorage.setItem('focusflow-assistant-history', JSON.stringify(chatHistory));
    }

    function getWelcomeHTML() {
        return `
            <div class="chat-message assistant">
                Hello! I am <strong>FlowAI</strong>, your study concierge. 🧠 How can I help you optimize your study space today?
            </div>
            <div class="chat-message assistant">
                You can ask me to <strong>start a timer</strong>, <strong>create a task</strong>, <strong>block a site</strong>, or <strong>toggle light/dark mode</strong>!
            </div>
        `;
    }

    function loadChatHistory() {
        const stored = localStorage.getItem('focusflow-assistant-history');
        if (stored) {
            try {
                const history = JSON.parse(stored);
                if (history.length > 0 && chatMessages) {
                    // Reset to just the welcome messages, then append history
                    chatMessages.innerHTML = getWelcomeHTML();
                    chatHistory = []; // Reset memory array first
                    history.forEach(msg => {
                        appendMessage(msg.role, msg.content, false, false);
                    });
                    // Repopulate memory array
                    chatHistory = history;
                }
            } catch (e) {
                console.error("Error loading chat history", e);
                chatHistory = [];
            }
        }
    }

    function clearChat() {
        if (!confirm("Are you sure you want to clear your chat history?")) return;

        chatHistory = [];
        localStorage.removeItem('focusflow-assistant-history');
        
        if (chatMessages) {
            chatMessages.innerHTML = getWelcomeHTML();
        }
    }

    // Dynamic Live system instructions with real-time FocusFlow context
    function getSystemInstruction() {
        const username = localStorage.getItem('focusflow-username') || 'Student';
        const streak = localStorage.getItem('focusflow-streak') || '0';
        const totalTime = localStorage.getItem('focusflow-total-time') || '0';
        const sessions = localStorage.getItem('focusflow-sessions-count') || '0';
        const blockerActive = localStorage.getItem('focusflow-blocker-active') === 'true' ? 'Active' : 'Inactive';
        
        let blockedSites = [];
        try {
            blockedSites = JSON.parse(localStorage.getItem('focusflow-blocker-sites') || '[]');
        } catch (e) {}
        const blockedList = blockedSites.map(s => typeof s === 'object' ? s.url : String(s)).join(', ');

        let taskList = [];
        try {
            taskList = JSON.parse(localStorage.getItem('focusflow-tasks') || '[]');
        } catch (e) {}
        const tasksString = taskList.map(t => `"${t.text}" (${t.completed ? 'completed' : 'pending'})`).join(', ');

        const localDate = new Date();
        const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
        
        let habitList = [];
        try {
            habitList = JSON.parse(localStorage.getItem('focusflow-habits') || '[]');
        } catch (e) {}
        const habitsString = habitList.map(h => {
            const completed = h.history && h.history[todayStr] === true;
            return `"${h.title}" (${completed ? 'completed' : 'pending'}, streak: ${h.streak}d)`;
        }).join(', ');

        let goalsList = [];
        try {
            goalsList = JSON.parse(localStorage.getItem('focusflow-goals') || '[]');
        } catch (e) {}
        const goalsString = goalsList.map(g => {
            const totalSteps = g.subtasks.length;
            const completedSteps = g.subtasks.filter(s => s.completed).length;
            const milestonesStr = g.subtasks.map(s => `"${s.text}" (${s.completed ? 'completed' : 'pending'})`).join(', ');
            return `"${g.title}" (category: ${g.category}, deadline: ${g.deadline}, progress: ${completedSteps}/${totalSteps} milestones done, status: ${g.completed ? 'completed' : 'in progress'}, milestones: [${milestonesStr}])`;
        }).join('\n');

        let calendarEvents = [];
        try {
            calendarEvents = JSON.parse(localStorage.getItem('focusflow-calendar-events') || '[]');
        } catch (e) {}
        const calendarString = calendarEvents.map(e => `"${e.title}" (date: ${e.date}, time: ${e.time || '12:00'}, category: ${e.category || 'study'}${e.desc ? ', desc: ' + e.desc : ''})`).join('\n');

        let weeklyData = null;
        try {
            weeklyData = JSON.parse(localStorage.getItem('focusflow-weekly-data'));
        } catch (e) {}
        if (!weeklyData) {
            weeklyData = {
                'this-week': { days: [60, 90, 75, 120, 45, 60, 30], total: 480 },
                'last-week': { days: [45, 60, 90, 60, 75, 45, 45], total: 420 }
            };
        }
        const weeklyString = `This week (total: ${weeklyData['this-week'].total}m, days Mon-Sun minutes: [${weeklyData['this-week'].days.join(', ')}m]) vs Last week (total: ${weeklyData['last-week'].total}m, days Mon-Sun minutes: [${weeklyData['last-week'].days.join(', ')}m])`;

        const upcomingEvents = [];
        const isWithin3Days = (dateStr) => {
            if (!dateStr) return false;
            const eventTime = new Date(dateStr).setHours(0,0,0,0);
            const start = new Date(todayStr).setHours(0,0,0,0);
            const end = new Date(todayStr).getTime() + (3 * 24 * 60 * 60 * 1000);
            return eventTime >= start && eventTime <= end;
        };

        goalsList.forEach(g => {
            if (isWithin3Days(g.deadline)) {
                upcomingEvents.push(`Goal Deadline: "${g.title}" is due on ${g.deadline} (${g.completed ? 'completed' : 'in progress'})`);
            }
        });

        calendarEvents.forEach(e => {
            if (isWithin3Days(e.date)) {
                upcomingEvents.push(`Event: "${e.title}" on ${e.date} at ${e.time || '12:00'} (category: ${e.category || 'study'}${e.desc ? ', desc: ' + e.desc : ''})`);
            }
        });

        try {
            const plan = JSON.parse(localStorage.getItem('focusflow-ai-plan'));
            if (plan && plan.date && isWithin3Days(plan.date)) {
                upcomingEvents.push(`AI Study Plan: "${plan.subject}" on ${plan.date} (${plan.blocks ? plan.blocks.filter(b => b.type === 'study-block').length : 0} study blocks)`);
            }
        } catch (e) {}

        const upcomingEventsString = upcomingEvents.join('\n') || 'none';

        return {
            parts: [
                {
                    text: `You are FlowAI, a highly intelligent, encouraging study assistant, productivity concierge, and workspace co-pilot inside the FocusFlow dashboard.\n` +
                          `Your job is to assist the user (named ${username}) in managing and optimizing their study space. You have deep context of the entire workspace and direct control of the user interface through tools.\n\n` +
                          `IMPORTANT GUIDELINES:\n` +
                          `- Always be concise, friendly, and encouraging. Avoid long-winded essays.\n` +
                          `- You are fully in control: if the user asks you to switch views, create/modify goals, schedule events, start/stop timers, check tasks, toggle blockers, or control music, use the corresponding tool immediately.\n` +
                          `- If a user tells you today is not productive (or they are struggling to stay focused), analyze their "Total Focus Time Today" and "Tasks/Habits completed". Respond empathetically, address their stats, and suggest starting a small Pomodoro session (using controlTimer) or doing a quick habit.\n` +
                          `- If a user asks "how have I been doing lately", analyze their progress trends: focus streak, tasks completed, goals progress, and compare this week's focus time with last week's focus time. Highlight successes and point out areas needing attention.\n` +
                          `- If a user asks about upcoming events or deadlines in the next 3 days, look at the "Upcoming Events (Next 3 Days)" section below and report them accurately. Mention the exact date and remaining time.\n\n` +
                          `Here is the user's current live workspace state:\n` +
                          `- User Name: ${username}\n` +
                          `- Current Date (Local): ${todayStr}\n` +
                          `- Current Study Streak: ${streak} days\n` +
                          `- Total Focus Time Today: ${totalTime} minutes\n` +
                          `- Focus Sessions Completed: ${sessions}\n` +
                          `- Website Blocker Status: ${blockerActive}\n` +
                          `- Blocked Websites list: [${blockedList || 'none'}]\n` +
                          `- Current Tasks list: [${tasksString || 'none'}]\n` +
                          `- Current Habits list: [${habitsString || 'none'}]\n` +
                          `- Goals & Milestones:\n${goalsString || 'none'}\n` +
                          `- Calendar Events:\n${calendarString || 'none'}\n` +
                          `- Weekly Focus History Comparison: ${weeklyString}\n` +
                          `- Upcoming Schedule & Deadlines (Next 3 Days):\n${upcomingEventsString}\n`
                }
            ]
        };
    }

    // Tools schema declaration for Gemini API
    const TOOLS_CONFIG = [
        {
            functionDeclarations: [
                {
                    name: "addTask",
                    description: "Add a new task to the user's task list.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            text: {
                                type: "STRING",
                                description: "The task title or description (e.g. 'Solve physics questions'). If the user specified a category (Academic, Skill, Personal, Health), prefix the task like '[Academic] Task description' in the text."
                            }
                        },
                        required: ["text"]
                    }
                },
                {
                    name: "completeTask",
                    description: "Mark a specific task in the task list as completed or pending/uncompleted.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            text: {
                                type: "STRING",
                                description: "The exact title of the task to complete/uncomplete (e.g. 'Complete Math Chapter 5')."
                            },
                            completed: {
                                type: "BOOLEAN",
                                description: "True to mark the task as completed, false to mark it as uncompleted (pending)."
                            }
                        },
                        required: ["text", "completed"]
                    }
                },
                {
                    name: "deleteTask",
                    description: "Delete/remove a specific task from the user's task list.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            text: {
                                type: "STRING",
                                description: "The exact title of the task to delete/remove (e.g. 'Complete Math Chapter 5')."
                            }
                        },
                        required: ["text"]
                    }
                },
                {
                    name: "controlTimer",
                    description: "Control the Pomodoro Focus timer (start, pause, reset, or change preset duration).",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            action: {
                                type: "STRING",
                                description: "The timer action to perform: 'start' (starts timer), 'pause' (pauses timer), 'reset' (resets timer), or 'setPreset' (changes the preset category).",
                                enum: ["start", "pause", "reset", "setPreset"]
                            },
                            preset: {
                                type: "STRING",
                                description: "The preset to select. Required only if action is 'setPreset'.",
                                enum: ["pomodoro", "short-break", "long-break"]
                            }
                        },
                        required: ["action"]
                    }
                },
                {
                    name: "manageBlocker",
                    description: "Add or delete domains from the website blocker blacklist.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            action: {
                                type: "STRING",
                                description: "The action to perform: 'add' (blocks a website) or 'delete' (unblocks a website).",
                                enum: ["add", "delete"]
                            },
                            domain: {
                                type: "STRING",
                                description: "The domain URL to block or unblock (e.g. 'youtube.com')."
                            }
                        },
                        required: ["action", "domain"]
                    }
                },
                {
                    name: "toggleBlocker",
                    description: "Switch the website blocker shield ON or OFF.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            active: {
                                type: "BOOLEAN",
                                description: "True to turn the blocker ON (active), false to turn the blocker OFF (inactive)."
                            }
                        },
                        required: ["active"]
                    }
                },
                {
                    name: "changeTheme",
                    description: "Switch the interface between light mode and dark mode.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            theme: {
                                type: "STRING",
                                description: "The theme to apply: 'light' or 'dark'.",
                                enum: ["light", "dark"]
                            }
                        },
                        required: ["theme"]
                    }
                },
                {
                    name: "controlMusic",
                    description: "Control the study music player (play, pause, skip to next, skip to previous, or adjust volume).",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            action: {
                                type: "STRING",
                                description: "The music playback action to perform: 'play' (resumes music), 'pause' (pauses music), 'next' (skips to next track), 'prev' (skips to previous track), or 'setVolume' (changes the volume).",
                                enum: ["play", "pause", "next", "prev", "setVolume"]
                            },
                            volume: {
                                type: "INTEGER",
                                description: "The volume level percentage to set (from 0 to 100). Required only if action is 'setVolume'."
                            }
                        },
                        required: ["action"]
                    }
                },
                {
                    name: "setHabitCompletion",
                    description: "Mark a habit in the daily habit tracker checklist as completed or uncompleted for today.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            title: {
                                type: "STRING",
                                description: "The exact title of the habit to complete/uncomplete (e.g. 'Read 15 Pages')."
                            },
                            completed: {
                                type: "BOOLEAN",
                                description: "True to mark the habit as completed, false to mark it as uncompleted (pending)."
                            }
                        },
                        required: ["title", "completed"]
                    }
                },
                {
                    name: "createCalendarEvent",
                    description: "Create or schedule a new custom study event, deadline, or reminder on the calendar grid.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            title: {
                                type: "STRING",
                                description: "The name or summary of the calendar event (e.g. 'calculus study group')."
                            },
                            date: {
                                type: "STRING",
                                description: "The event date in YYYY-MM-DD format. E.g. '2026-06-25'."
                            },
                            time: {
                                type: "STRING",
                                description: "The event time in HH:MM format (24-hour clock). E.g. '14:30'. Defaults to '12:00' if not specified."
                            },
                            category: {
                                type: "STRING",
                                description: "The event category type.",
                                enum: ["study", "task", "meeting", "personal", "other"]
                            },
                            desc: {
                                type: "STRING",
                                description: "A brief description or notes for the calendar event."
                            }
                        },
                        required: ["title", "date"]
                    }
                },
                {
                    name: "generateAIPlan",
                    description: "Build or generate a structured study plan/schedule on the dashboard's AI Study Plan card.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            topic: {
                                type: "STRING",
                                description: "The study topic or subject to schedule (e.g. 'SQL Joins' or 'Physics vectors')."
                            },
                            duration: {
                                type: "STRING",
                                description: "The total time duration for the session.",
                                enum: ["1h", "2h", "3h", "4h"]
                            },
                            goal: {
                                type: "STRING",
                                description: "The main focus goal of the study plan.",
                                enum: ["concepts", "practice", "notes", "exam"]
                            }
                        },
                        required: ["topic", "duration", "goal"]
                    }
                },
                {
                    name: "switchView",
                    description: "Switch the workspace dashboard view to a specific panel/tab.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            view: {
                                type: "STRING",
                                description: "The view/tab name to open.",
                                enum: ["dashboard", "timer", "tasks", "habits", "calendar", "goals", "study-plan", "music", "analytics", "settings"]
                            }
                        },
                        required: ["view"]
                    }
                },
                {
                    name: "addGoal",
                    description: "Create/add a new goal with milestone checkpoints.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            title: {
                                type: "STRING",
                                description: "The title of the goal (e.g. 'Master React State Management')."
                            },
                            category: {
                                type: "STRING",
                                description: "The category of the goal.",
                                enum: ["Academic", "Skill", "Personal", "Health"]
                            },
                            deadline: {
                                type: "STRING",
                                description: "The target deadline date in YYYY-MM-DD format (e.g., '2026-06-30')."
                            },
                            milestones: {
                                type: "ARRAY",
                                description: "A list of subtask milestone strings to complete this goal (e.g., ['Read docs', 'Build prototype']).",
                                items: {
                                    type: "STRING"
                                }
                            }
                        },
                        required: ["title", "category", "deadline", "milestones"]
                    }
                },
                {
                    name: "completeGoalMilestone",
                    description: "Mark a specific milestone of a goal as completed or pending/uncompleted.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            goalTitle: {
                                type: "STRING",
                                description: "The exact or partial title of the goal containing the milestone."
                            },
                            milestoneText: {
                                type: "STRING",
                                description: "The exact or partial text of the milestone to update (e.g., 'Read Chapter 1')."
                            },
                            completed: {
                                type: "BOOLEAN",
                                description: "True to mark the milestone as completed, false to mark it as uncompleted (pending)."
                            }
                        },
                        required: ["goalTitle", "milestoneText", "completed"]
                    }
                },
                {
                    name: "deleteGoal",
                    description: "Delete/remove a specific goal by its title.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            title: {
                                type: "STRING",
                                description: "The exact or partial title of the goal to delete (e.g., 'Master React State Management')."
                            }
                        },
                        required: ["title"]
                    }
                }
            ]
        }
    ];

    async function handleUserSend() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = '';
        appendMessage('user', text);

        // Fetch saved Gemini key
        const apiKey = localStorage.getItem('focusflow-gemini-key');
        if (!apiKey) {
            setTimeout(() => {
                appendMessage('system', "To start using FlowAI, please enter your Google Gemini API Key in the **Settings** view first! 🔑");
            }, 500);
            return;
        }

        // Show typing indicator
        const typingEl = document.createElement('div');
        typingEl.className = 'chat-message assistant typing-indicator';
        typingEl.textContent = 'FlowAI is thinking...';
        if (chatMessages) {
            chatMessages.appendChild(typingEl);
            scrollToBottom();
        }

        try {
            // Build text-only message history for api context
            const contents = chatHistory
                .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                .map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }));
            
            // Ensure last message is user text
            if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
                contents.push({ role: 'user', parts: [{ text: text }] });
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: contents,
                    systemInstruction: getSystemInstruction(),
                    tools: TOOLS_CONFIG
                })
            });

            if (typingEl.parentNode) {
                typingEl.parentNode.removeChild(typingEl);
            }

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || `HTTP ${response.status}`);
            }

            const resJson = await response.json();
            const candidate = resJson.candidates?.[0];
            const contentParts = candidate?.content?.parts || [];
            
            let assistantText = "";
            let toolCallFound = false;

            for (const part of contentParts) {
                if (part.text) {
                    assistantText += part.text;
                }
                if (part.functionCall) {
                    toolCallFound = true;
                    await handleToolCall(part.functionCall);
                }
            }

            if (assistantText) {
                appendMessage('assistant', assistantText);
            } else if (toolCallFound && !assistantText) {
                // If there's only a tool call without response text, generate a confirmation
                appendMessage('assistant', "Command received! I've executed the tool action on your workspace. 🛠️");
            } else {
                appendMessage('assistant', "I'm not sure how to answer that. Could you try rephrasing?");
            }

        } catch (err) {
            if (typingEl.parentNode) {
                typingEl.parentNode.removeChild(typingEl);
            }
            console.error("Assistant API Error:", err);
            const errMsg = (err.message || '').toLowerCase();
            if (errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('limit')) {
                appendMessage('system', "Your Gemini API key has reached its rate limit! FlowAI is receiving a lot of study requests right now. Please wait a few seconds and try again. ⏳");
            } else {
                appendMessage('system', `Error: ${err.message || 'Failed to connect to Gemini API.'}`);
            }
        }
    }

    // Function Execution Router
    async function handleToolCall(functionCall) {
        const { name, args } = functionCall;
        console.log(`FlowAI executing tool call: ${name}`, args);

        try {
            switch (name) {
                case 'addTask':
                    if (args.text) {
                        document.dispatchEvent(new CustomEvent('createTask', {
                            detail: { text: args.text }
                        }));
                        animateFeedback('dashboard-tasks-card');
                        appendMessage('system', `Task Added: "${args.text}"`, true);
                    }
                    break;

                case 'completeTask':
                    if (args.text) {
                        document.dispatchEvent(new CustomEvent('setTaskCompletion', {
                            detail: { text: args.text, completed: args.completed }
                        }));
                        animateFeedback('dashboard-tasks-card');
                        appendMessage('system', `Task "${args.text}" marked as ${args.completed ? 'completed' : 'pending'}.`, true);
                    }
                    break;

                case 'deleteTask':
                    if (args.text) {
                        document.dispatchEvent(new CustomEvent('deleteTask', {
                            detail: { text: args.text }
                        }));
                        animateFeedback('dashboard-tasks-card');
                        appendMessage('system', `Task "${args.text}" deleted.`, true);
                    }
                    break;

                case 'controlTimer':
                    const action = args.action;
                    const preset = args.preset;
                    
                    if (action === 'setPreset' && preset) {
                        const select = document.getElementById('timer-preset');
                        if (select) {
                            select.value = preset;
                            select.dispatchEvent(new Event('change'));
                            appendMessage('system', `Timer preset changed to: ${preset.replace('-', ' ')}`, true);
                        }
                    } else if (action === 'start') {
                        const startBtn = document.getElementById('timer-start-btn');
                        if (startBtn && !startBtn.classList.contains('running')) {
                            startBtn.click();
                            appendMessage('system', "Timer started.", true);
                        }
                    } else if (action === 'pause') {
                        const startBtn = document.getElementById('timer-start-btn');
                        if (startBtn && startBtn.classList.contains('running')) {
                            startBtn.click();
                            appendMessage('system', "Timer paused.", true);
                        }
                    } else if (action === 'reset') {
                        const resetBtn = document.getElementById('timer-reset-btn');
                        if (resetBtn) {
                            resetBtn.click();
                            appendMessage('system', "Timer reset.", true);
                        }
                    }
                    animateFeedback('dashboard-timer-card');
                    break;

                case 'manageBlocker':
                    const bAction = args.action;
                    const domain = args.domain;
                    
                    if (bAction === 'add' && domain) {
                        const input = document.getElementById('block-url-input');
                        const btn = document.getElementById('blocker-submit-btn');
                        if (input && btn) {
                            input.value = domain;
                            btn.click();
                            appendMessage('system', `Website blocked: ${domain}`, true);
                        }
                    } else if (bAction === 'delete' && domain) {
                        // Find site in list and delete
                        const items = document.querySelectorAll('.blocker-site-item, .db-blocked-site-item');
                        let found = false;
                        for (const item of items) {
                            const urlEl = item.querySelector('.blocker-site-url, .db-blocked-site-url');
                            if (urlEl && urlEl.textContent.trim().toLowerCase() === domain.toLowerCase()) {
                                const delBtn = item.querySelector('.blocker-site-delete, .db-blocked-site-unblock');
                                if (delBtn) {
                                    delBtn.click();
                                    found = true;
                                    appendMessage('system', `Website unblocked: ${domain}`, true);
                                    break;
                                }
                            }
                        }
                        if (!found) {
                            // Direct Storage fallback
                            const stored = localStorage.getItem('focusflow-blocker-sites');
                            if (stored) {
                                let sites = JSON.parse(stored);
                                sites = sites.filter(s => {
                                    const sUrl = typeof s === 'object' ? s.url : String(s);
                                    return sUrl.trim().toLowerCase() !== domain.toLowerCase();
                                });
                                localStorage.setItem('focusflow-blocker-sites', JSON.stringify(sites));
                                window.dispatchEvent(new CustomEvent('focusflow-blocker-update'));
                                appendMessage('system', `Website unblocked: ${domain}`, true);
                            }
                        }
                    }
                    animateFeedback('dashboard-blocker-card');
                    break;

                case 'toggleBlocker':
                    const active = args.active;
                    const toggle = document.getElementById('blocker-master-toggle') || document.getElementById('db-blocker-toggle');
                    if (toggle) {
                        if (toggle.checked !== active) {
                            toggle.checked = active;
                            toggle.dispatchEvent(new Event('change'));
                        }
                        appendMessage('system', `Website blocker turned ${active ? 'ON' : 'OFF'}`, true);
                    }
                    animateFeedback('dashboard-blocker-card');
                    break;

                case 'changeTheme':
                    const theme = args.theme;
                    const checkbox = document.getElementById('theme-checkbox');
                    const wantLight = (theme === 'light');
                    if (checkbox) {
                        if (checkbox.checked !== wantLight) {
                            checkbox.checked = wantLight;
                            checkbox.dispatchEvent(new Event('change'));
                        }
                        appendMessage('system', `Theme switched to: ${theme} mode`, true);
                    }
                    break;

                case 'controlMusic':
                    const mAction = args.action;
                    const volume = args.volume;
                    if (mAction === 'play') {
                        const playBtn = document.getElementById('music-play-btn');
                        const audioPlaying = localStorage.getItem('focusflow-music-is-playing') === 'true';
                        if (playBtn && !audioPlaying) {
                            playBtn.click();
                        }
                        appendMessage('system', "Background study music playing.", true);
                    } else if (mAction === 'pause') {
                        const playBtn = document.getElementById('music-play-btn');
                        const audioPlaying = localStorage.getItem('focusflow-music-is-playing') === 'true';
                        if (playBtn && audioPlaying) {
                            playBtn.click();
                        }
                        appendMessage('system', "Background study music paused.", true);
                    } else if (mAction === 'next') {
                        const nextBtn = document.getElementById('music-next-btn');
                        if (nextBtn) {
                            nextBtn.click();
                            appendMessage('system', "Skipped to the next track.", true);
                        }
                    } else if (mAction === 'prev') {
                        const prevBtn = document.getElementById('music-prev-btn');
                        if (prevBtn) {
                            prevBtn.click();
                            appendMessage('system', "Skipped to the previous track.", true);
                        }
                    } else if (mAction === 'setVolume' && volume !== undefined) {
                        const volSlider = document.getElementById('music-vol-slider');
                        if (volSlider) {
                            volSlider.value = volume;
                            volSlider.dispatchEvent(new Event('input'));
                            appendMessage('system', `Music volume set to ${volume}%.`, true);
                        }
                    }
                    animateFeedback('dashboard-music-card');
                    break;

                case 'setHabitCompletion':
                    if (args.title) {
                        document.dispatchEvent(new CustomEvent('setHabitCompletion', {
                            detail: { title: args.title, completed: args.completed }
                        }));
                        animateFeedback('dashboard-habits-card');
                        appendMessage('system', `Habit "${args.title}" marked as ${args.completed ? 'completed' : 'pending'}.`, true);
                    }
                    break;

                case 'createCalendarEvent':
                    if (args.title && args.date) {
                        document.dispatchEvent(new CustomEvent('createCalendarEvent', {
                            detail: {
                                title: args.title,
                                date: args.date,
                                time: args.time || "12:00",
                                category: args.category || "study",
                                desc: args.desc || ""
                            }
                        }));
                        appendMessage('system', `Calendar event scheduled: "${args.title}" on ${args.date} at ${args.time || '12:00'}.`, true);
                    }
                    break;

                case 'generateAIPlan':
                    if (args.topic) {
                        document.dispatchEvent(new CustomEvent('generateAIPlan', {
                            detail: {
                                topic: args.topic,
                                duration: args.duration,
                                goal: args.goal
                            }
                        }));
                        animateFeedback('dashboard-ai-plan-card');
                        appendMessage('system', `Started generating AI Study Plan for "${args.topic}"...`, true);
                    }
                    break;

                case 'switchView':
                    if (args.view) {
                        const navItem = document.querySelector(`.sidebar-nav .nav-item[data-view="${args.view}"]`);
                        if (navItem) {
                            navItem.click();
                            appendMessage('system', `Switched view to: ${args.view}`, true);
                        } else {
                            appendMessage('system', `Failed to switch to view: ${args.view}`, true);
                        }
                    }
                    break;

                case 'addGoal':
                    if (args.title) {
                        document.dispatchEvent(new CustomEvent('createGoal', {
                            detail: {
                                title: args.title,
                                category: args.category,
                                deadline: args.deadline,
                                milestones: args.milestones
                            }
                        }));
                        animateFeedback('dashboard-goals-card');
                        appendMessage('system', `Goal created: "${args.title}"`, true);
                    }
                    break;

                case 'completeGoalMilestone':
                    if (args.goalTitle && args.milestoneText) {
                        document.dispatchEvent(new CustomEvent('setGoalMilestoneCompletion', {
                            detail: {
                                goalTitle: args.goalTitle,
                                milestoneText: args.milestoneText,
                                completed: args.completed
                            }
                        }));
                        animateFeedback('dashboard-goals-card');
                        appendMessage('system', `Milestone "${args.milestoneText}" in goal "${args.goalTitle}" marked as ${args.completed ? 'completed' : 'pending'}.`, true);
                    }
                    break;

                case 'deleteGoal':
                    if (args.title) {
                        document.dispatchEvent(new CustomEvent('deleteGoalByTitle', {
                            detail: { title: args.title }
                        }));
                        animateFeedback('dashboard-goals-card');
                        appendMessage('system', `Goal deleted: "${args.title}"`, true);
                    }
                    break;
            }
        } catch (e) {
            console.error(`Error executing tool call "${name}":`, e);
            appendMessage('system', `Failed to execute command: ${name}`);
        }
    }

    // GSAP visual bounce animation on the targeted card to signal action success
    function animateFeedback(cardId) {
        const card = document.getElementById(cardId);
        if (card && typeof gsap !== 'undefined') {
            gsap.fromTo(card, 
                { scale: 0.98, boxShadow: '0 0 25px rgba(139, 92, 246, 0.4)' },
                { scale: 1, boxShadow: 'none', duration: 0.4, ease: 'elastic.out(1.2)' }
            );
        }
    }

    // Initialize bottom-left dragging resizer for the top-right anchored assistant window
    function initResizer() {
        const handle = document.getElementById('assistant-resize-handle');
        const card = document.getElementById('assistant-card');
        if (!handle || !card) return;

        let isResizing = false;
        let startWidth, startHeight, startX, startY;

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            
            // Get current dimensions
            startWidth = card.offsetWidth;
            startHeight = card.offsetHeight;
            
            // Mouse starting coordinates
            startX = e.clientX;
            startY = e.clientY;
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            card.classList.add('resizing');
        });

        // Touch support for mobile dragging
        handle.addEventListener('touchstart', (e) => {
            isResizing = true;
            const touch = e.touches[0];
            startWidth = card.offsetWidth;
            startHeight = card.offsetHeight;
            startX = touch.clientX;
            startY = touch.clientY;
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
            card.classList.add('resizing');
        });

        function handleMouseMove(e) {
            if (!isResizing) return;
            // Anchored top-right: moving bottom-left outwards (leftwards/downwards) increases dimensions
            const deltaX = startX - e.clientX;
            const deltaY = e.clientY - startY;
            
            let newWidth = startWidth + deltaX;
            let newHeight = startHeight + deltaY;
            
            newWidth = Math.max(280, Math.min(600, newWidth));
            newHeight = Math.max(350, Math.min(window.innerHeight - 120, newHeight));
            
            card.style.width = `${newWidth}px`;
            card.style.height = `${newHeight}px`;
        }

        function handleMouseUp() {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            card.classList.remove('resizing');
            localStorage.setItem('focusflow-assistant-width', card.style.width);
            localStorage.setItem('focusflow-assistant-height', card.style.height);
        }

        function handleTouchMove(e) {
            if (!isResizing) return;
            const touch = e.touches[0];
            const deltaX = startX - touch.clientX;
            const deltaY = touch.clientY - startY;
            
            let newWidth = startWidth + deltaX;
            let newHeight = startHeight + deltaY;
            
            newWidth = Math.max(280, Math.min(600, newWidth));
            newHeight = Math.max(350, Math.min(window.innerHeight - 120, newHeight));
            
            card.style.width = `${newWidth}px`;
            card.style.height = `${newHeight}px`;
        }

        function handleTouchEnd() {
            isResizing = false;
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            card.classList.remove('resizing');
            localStorage.setItem('focusflow-assistant-width', card.style.width);
            localStorage.setItem('focusflow-assistant-height', card.style.height);
        }
    }
})();

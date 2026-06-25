/* ==========================================================================
   FocusFlow - Motivational Quotes Widget Logic
   ========================================================================== */

(function () {
    // DOM Elements
    let quoteText, quoteAuthor, refreshBtn;

    const OFFLINE_QUOTES = [
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
        { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
        { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
        { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
        { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
        { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
        { text: "The best way to predict your future is to create it.", author: "Abraham Lincoln" },
        { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
        { text: "Well begun is half done.", author: "Aristotle" },
        { text: "If you are going through hell, keep going.", author: "Winston Churchill" },
        { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
        { text: "You have power over your mind - not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
        { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
        { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
        { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas A. Edison" },
        { text: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more.", author: "Marie Curie" },
        { text: "Look deep into nature, and then you will understand everything better.", author: "Albert Einstein" },
        { text: "The ship is safest in harbor, but that is not what ships are built for.", author: "John A. Shedd" },
        { text: "What we think, we become.", author: "Buddha" },
        { text: "A room without books is like a body without a soul.", author: "Cicero" },
        { text: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
        { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
        { text: "The language of truth is simple.", author: "Seneca" },
        { text: "An unexamined life is not worth living.", author: "Socrates" },
        { text: "Knowing is not enough; we must apply. Willing is not enough; we must do.", author: "Johann Wolfgang von Goethe" },
        { text: "Act as if what you do makes a difference. It does.", author: "William James" },
        { text: "He who has a why to live for can bear almost any how.", author: "Friedrich Nietzsche" },
        { text: "Difficulty is what wakes up the genius.", author: "Seneca" },
        { text: "Associate with people who are likely to improve you.", author: "Seneca" },
        { text: "If it is not right do not do it; if it is not true do not say it.", author: "Marcus Aurelius" },
        { text: "The best revenge is to be unlike him who performed the injury.", author: "Marcus Aurelius" },
        { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
        { text: "We have two ears and one mouth so that we can listen twice as much as we speak.", author: "Epictetus" },
        { text: "No man is free who is not master of himself.", author: "Epictetus" },
        { text: "What you do makes a difference, and you have to decide what kind of difference you want to make.", author: "Jane Goodall" },
        { text: "I was taught that the way of progress was neither swift nor easy.", author: "Marie Curie" },
        { text: "Scientists study the world as it is; engineers create the world that has never been.", author: "Theodore von Kármán" },
        { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
        { text: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu" },
        { text: "The power of concentrating is the most important thing.", author: "Marie Curie" },
        { text: "We are all in the gutter, but some of us are looking at the stars.", author: "Oscar Wilde" },
        { text: "It is never too late to be what you might have been.", author: "George Eliot" },
        { text: "Do not go gentle into that good night.", author: "Dylan Thomas" },
        { text: "Real gold does not fear the melting pot.", author: "Chinese Proverb" },
        { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
        { text: "He who conquers himself is the mightiest warrior.", author: "Confucius" },
        { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
        { text: "The limits of my language mean the limits of my world.", author: "Ludwig Wittgenstein" },
        { text: "We write to taste life twice, in the moment and in retrospect.", author: "Anaïs Nin" },
        { text: "The question isn't who is going to let me; it's who is going to stop me.", author: "Ayn Rand" },
        { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
        { text: "Make it simple, but significant.", author: "Don Draper" },
        { text: "Focus is a muscle, and you build it through exercise.", author: "Unknown" },
        { text: "Design is not just what it looks like and feels like. Design is how it works.", author: "Steve Jobs" },
        { text: "Make each day your masterpiece.", author: "John Wooden" },
        { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
        { text: "The path to success is to take massive, determined action.", author: "Tony Robbins" },
        { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
        { text: "If you cannot do great things, do small things in a great way.", author: "Napoleon Hill" },
        { text: "Do not let making a living prevent you from making a life.", author: "John Wooden" },
        { text: "Fall seven times and stand up eight.", author: "Japanese Proverb" },
        { text: "If you want to live a happy life, tie it to a goal, not to people or things.", author: "Albert Einstein" },
        { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
        { text: "Every child is an artist. The problem is how to remain an artist once we grow up.", author: "Pablo Picasso" },
        { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
        { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
        { text: "Knowledge is power.", author: "Francis Bacon" },
        { text: "Patience is bitter, but its fruit is sweet.", author: "Jean-Jacques Rousseau" },
        { text: "He who is brave is free.", author: "Seneca" },
        { text: "You must be the change you wish to see in the world.", author: "Mahatma Gandhi" },
        { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
        { text: "Genius is one percent inspiration and ninety-nine percent perspiration.", author: "Thomas A. Edison" },
        { text: "I have no special talent. I am only passionately curious.", author: "Albert Einstein" },
        { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
        { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
        { text: "There is no substitute for hard work.", author: "Thomas A. Edison" },
        { text: "Courage is grace under pressure.", author: "Ernest Hemingway" },
        { text: "Begin where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
        { text: "We are what we think. All that we are arises with our thoughts.", author: "Buddha" },
        { text: "Wisdom begins in wonder.", author: "Socrates" },
        { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
        { text: "The root of education is bitter, but the fruit is sweet.", author: "Aristotle" },
        { text: "If you want to fly, you have to give up the things that weigh you down.", author: "Toni Morrison" },
        { text: "Out of clutter, find simplicity.", author: "Albert Einstein" },
        { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
        { text: "You must do the things you think you cannot do.", author: "Eleanor Roosevelt" },
        { text: "Believe and act as if it were impossible to fail.", author: "Charles Kettering" },
        { text: "The best way to find yourself is to lose yourself in the service of others.", author: "Mahatma Gandhi" },
        { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
        { text: "It is not the mountain we conquer, but ourselves.", author: "Sir Edmund Hillary" },
        { text: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth" },
        { text: "Change your thoughts and you change your world.", author: "Norman Vincent Peale" },
        { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt" },
        { text: "There is only one way to avoid criticism: do nothing, say nothing, and be nothing.", author: "Aristotle" },
        { text: "The secret of change is to focus all of your energy not on fighting the old, but on building the new.", author: "Socrates" },
        { text: "Happiness is not something ready-made. It comes from your own actions.", author: "Dalai Lama" },
        { text: "Go confidently in the direction of your dreams. Live the life you have imagined.", author: "Henry David Thoreau" },
        { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
        { text: "To know how much there is to know is the beginning of learning to live.", author: "Dorothy West" },
        { text: "The key to immortality is first living a life worth remembering.", author: "Bruce Lee" }
    ];

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        initEvents();
        loadInitialQuote();
    });

    /**
     * Cache DOM Elements.
     */
    function initElements() {
        quoteText = document.getElementById('quote-text');
        quoteAuthor = document.getElementById('quote-author');
        refreshBtn = document.getElementById('quotes-refresh-btn');
    }

    /**
     * Bind Event Listeners.
     */
    function initEvents() {
        if (refreshBtn) {
            refreshBtn.addEventListener('click', handleRefreshClick);
        }
    }

    /**
     * Load stored daily quote, or generate a fresh one if it's a new day.
     */
    function loadInitialQuote() {
        const storedQuote = localStorage.getItem('focusflow-daily-quote');
        const storedDate = localStorage.getItem('focusflow-daily-quote-date');
        const todayDate = new Date().toDateString();

        if (storedQuote && storedDate === todayDate) {
            try {
                const quoteObj = JSON.parse(storedQuote);
                displayQuote(quoteObj.text, quoteObj.author, quoteObj.isAI || false);
            } catch (e) {
                console.error("Failed to parse stored quote, generating new one", e);
                triggerNewQuote(false); // Silent load
            }
        } else {
            // New day or first load: trigger a fresh quote
            triggerNewQuote(false); // Silent load
        }
    }

    /**
     * Handles refresh button click with rotations and GSAP fade-outs.
     */
    function handleRefreshClick() {
        if (refreshBtn && refreshBtn.disabled) return;

        if (refreshBtn) {
            refreshBtn.disabled = true;
            // Spin the refresh icon
            const icon = refreshBtn.querySelector('i, svg');
            if (icon && typeof gsap !== 'undefined') {
                gsap.fromTo(icon, 
                    { rotation: 0 }, 
                    { rotation: 360, duration: 0.8, ease: 'power2.out' }
                );
            }
        }

        // Fade out quote, load new one, then fade back in
        if (typeof gsap !== 'undefined' && quoteText && quoteAuthor) {
            gsap.to([quoteText, quoteAuthor], {
                opacity: 0,
                y: -8,
                duration: 0.2,
                ease: 'power2.in',
                onComplete: async () => {
                    await triggerNewQuote(true);
                    gsap.fromTo([quoteText, quoteAuthor],
                        { opacity: 0, y: 8 },
                        { 
                            opacity: 1, 
                            y: 0, 
                            duration: 0.35, 
                            ease: 'power2.out',
                            onComplete: () => {
                                if (refreshBtn) refreshBtn.disabled = false;
                            }
                        }
                    );
                }
            });
        } else {
            triggerNewQuote(true).then(() => {
                if (refreshBtn) refreshBtn.disabled = false;
            });
        }
    }

    /**
     * Fetches quote from Gemini if API Key is available, falling back to offline list.
     */
    async function triggerNewQuote(forceNewAI = true) {
        const apiKey = localStorage.getItem('focusflow-gemini-key');
        const history = getQuoteHistory();
        
        let canUseAI = false;
        if (apiKey) {
            const todayDate = new Date().toDateString();
            const lastRefreshedDate = localStorage.getItem('focusflow-quotes-refreshed-date') || '';
            let refreshedCount = parseInt(localStorage.getItem('focusflow-quotes-refreshed-today') || '0', 10);
            
            if (lastRefreshedDate !== todayDate) {
                refreshedCount = 0;
                localStorage.setItem('focusflow-quotes-refreshed-date', todayDate);
                localStorage.setItem('focusflow-quotes-refreshed-today', '0');
            }
            
            const limit = parseInt(localStorage.getItem('focusflow-quotes-limit') || '5', 10);
            
            if (refreshedCount < limit) {
                canUseAI = true;
            } else {
                console.warn(`AI Quote refresh limit reached (${refreshedCount}/${limit} today). Falling back to offline quote.`);
            }
        }
        
        if (canUseAI && apiKey) {
            try {
                const aiQuote = await fetchAIQuote(apiKey, history);
                saveAndDisplayQuote(aiQuote.text, aiQuote.author, true);
                addQuoteToHistory(aiQuote.text);
                
                // Increment refresh count
                let refreshedCount = parseInt(localStorage.getItem('focusflow-quotes-refreshed-today') || '0', 10);
                localStorage.setItem('focusflow-quotes-refreshed-today', (refreshedCount + 1).toString());
                
                // Dispatch event to update counter in settings panel
                const updateEvent = new CustomEvent('focusflow-quote-refreshed');
                window.dispatchEvent(updateEvent);
                return;
            } catch (err) {
                console.warn("Failed to fetch AI Quote, falling back to offline list:", err.message);
            }
        }

        // Fallback: Pick a random offline quote avoiding history
        let filteredQuotes = OFFLINE_QUOTES.filter(q => !history.includes(q.text));
        
        // Reset history if we have too few options remaining to prevent deadlock
        if (filteredQuotes.length < 3) {
            clearQuoteHistory();
            filteredQuotes = OFFLINE_QUOTES;
        }

        const selectedQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];
        saveAndDisplayQuote(selectedQuote.text, selectedQuote.author, false);
        addQuoteToHistory(selectedQuote.text);
    }

    /**
     * Calls Gemini API to fetch a structured JSON motivational quote.
     */
    async function fetchAIQuote(apiKey, history) {
        // Build a prompt that forbids repeating recent quotes
        const historyInstructions = history.length > 0 
            ? `Do NOT repeat or generate anything similar to these recently shown quotes:\n${history.map(q => `- "${q}"`).join('\n')}\n`
            : "";

        const promptText = `Generate a single inspiring, short motivational quote (under 120 characters) for a student, programmer, or focused worker. Attribute it to a famous historical figure or philosopher.
Choose a unique, less common quote from a different figure or style (e.g. Stoic philosophy, modern science, technology, art, or classic literature). Avoid common clichés.
${historyInstructions}
Return a structured JSON object.
Schema:
{
  "text": "Quote content without extra quotation marks",
  "author": "Author Name"
}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: promptText
                    }]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.95, // High temperature to increase variety
                    responseSchema: {
                        type: "object",
                        properties: {
                            text: { type: "string" },
                            author: { type: "string" }
                        },
                        required: ["text", "author"]
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const resData = await response.json();
        const textResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
            throw new Error("No quote content returned.");
        }

        const parsed = JSON.parse(textResponse);
        if (!parsed.text || !parsed.author) {
            throw new Error("JSON structure invalid.");
        }

        return parsed;
    }

    /**
     * Stores the quote, logs the date, and updates the DOM elements.
     */
    function saveAndDisplayQuote(text, author, isAI) {
        const quoteObj = { text, author, isAI };
        localStorage.setItem('focusflow-daily-quote', JSON.stringify(quoteObj));
        localStorage.setItem('focusflow-daily-quote-date', new Date().toDateString());
        displayQuote(text, author, isAI);
    }

    /**
     * Directly sets text content on DOM elements.
     */
    function displayQuote(text, author, isAI = false) {
        if (quoteText) quoteText.textContent = `"${text}"`;
        if (quoteAuthor) {
            quoteAuthor.textContent = `— ${author}`;
            if (isAI) {
                const badge = document.createElement('span');
                badge.className = 'ai-sparkle-badge';
                badge.style.color = 'var(--accent-pink)';
                badge.style.fontSize = '0.65rem';
                badge.style.marginLeft = '6px';
                badge.style.padding = '2px 6px';
                badge.style.background = 'rgba(236, 72, 153, 0.1)';
                badge.style.borderRadius = '4px';
                badge.style.display = 'inline-flex';
                badge.style.alignItems = 'center';
                badge.style.gap = '3px';
                badge.style.fontWeight = '700';
                badge.style.letterSpacing = '0';
                badge.textContent = '✨ AI';
                quoteAuthor.appendChild(badge);
            }
        }
    }

    /**
     * Returns the list of recently displayed quote texts.
     */
    function getQuoteHistory() {
        const stored = localStorage.getItem('focusflow-quote-history');
        if (stored) {
            try {
                return JSON.parse(stored) || [];
            } catch (e) {}
        }
        return [];
    }

    /**
     * Appends a new quote text to the rolling history (capped at 8).
     */
    function addQuoteToHistory(text) {
        let history = getQuoteHistory();
        if (!history.includes(text)) {
            history.unshift(text);
            if (history.length > 8) {
                history.pop();
            }
            localStorage.setItem('focusflow-quote-history', JSON.stringify(history));
        }
    }

    /**
     * Resets the quote history.
     */
    function clearQuoteHistory() {
        localStorage.removeItem('focusflow-quote-history');
    }
})();

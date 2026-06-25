/* ==========================================================================
   FocusFlow - Background Study Music Player Logic
   ========================================================================== */

(function () {
    // 1. Chill Lo-Fi Tracks List (Lukrembo - Copyright-free audio streams)
    const TRACKLIST = [
        {
            title: 'Bell-Fi Broadcasts',
            artist: 'Pro Lofi',
            url: 'music/bell-fi-broadcasts.mp3'
        },
        {
            title: 'Chill Background',
            artist: 'Pro Lofi',
            url: 'music/chill-background.mp3'
        },
        {
            title: 'Lofi Chill',
            artist: 'Pro Lofi',
            url: 'music/lofi-chill.mp3'
        },
        {
            title: 'Piano and Beat',
            artist: 'Pro Lofi',
            url: 'music/piano-and-beat.mp3'
        },
        {
            title: 'Relaxing Piano',
            artist: 'Pro Lofi',
            url: 'music/relaxing-piano.mp3'
        },
        {
            title: 'Bamboo Shadow Waltz',
            artist: 'Open Lofi',
            url: 'music/bamboo-shadow-waltz.mp3'
        },
        {
            title: 'From the Start',
            artist: 'Open Lofi',
            url: 'music/from-the-start.mp3'
        }
    ];

    // 2. Player State Variables
    let currentTrackIdx = 0;
    let isPlaying = false;
    let lastVolume = 0.5;

    // Audio Instance
    const audio = new Audio();
    audio.loop = false;

    // DOM Elements
    let trackTitleEl, trackArtistEl, vinylEl;
    let playBtn, prevBtn, nextBtn, volBtn, volSlider;
    let progressContainer, progressFill, timeElapsedEl, timeDurationEl;
    let headerMusicBtn;

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        initEvents();
        
        // Restore saved track, position, and playing state
        const savedTrack = localStorage.getItem('focusflow-music-current-track');
        const savedTime = localStorage.getItem('focusflow-music-current-time');
        const savedPlaying = localStorage.getItem('focusflow-music-is-playing') === 'true';
        
        const trackIdx = savedTrack !== null ? parseInt(savedTrack, 10) : 0;
        const startAtTime = savedTime !== null ? parseFloat(savedTime) : 0;
        
        if (savedPlaying) {
            isPlaying = true;
            loadTrack(trackIdx, startAtTime);
        } else {
            isPlaying = false;
            loadTrack(trackIdx, startAtTime);
        }
        
        // Restore saved volume
        const savedVolume = localStorage.getItem('focusflow-music-volume');
        if (savedVolume !== null) {
            const vol = parseFloat(savedVolume);
            audio.volume = vol;
            if (volSlider) volSlider.value = Math.round(vol * 100);
            updateVolumeIcon(vol);
        } else {
            audio.volume = 0.5;
            if (volSlider) volSlider.value = 50;
        }
    });

    /**
     * Cache DOM elements.
     */
    function initElements() {
        trackTitleEl = document.getElementById('music-track-title');
        trackArtistEl = document.getElementById('music-track-artist');
        vinylEl = document.getElementById('music-vinyl');
        
        playBtn = document.getElementById('music-play-btn');
        prevBtn = document.getElementById('music-prev-btn');
        nextBtn = document.getElementById('music-next-btn');
        volBtn = document.getElementById('music-vol-btn');
        volSlider = document.getElementById('music-vol-slider');
        
        progressContainer = document.getElementById('music-progress-container');
        progressFill = document.getElementById('music-progress-fill');
        timeElapsedEl = document.getElementById('music-time-elapsed');
        timeDurationEl = document.getElementById('music-time-duration');
        
        headerMusicBtn = document.getElementById('header-music-btn');
    }

    /**
     * Attach Event Listeners.
     */
    function initEvents() {
        if (playBtn) playBtn.addEventListener('click', togglePlay);
        if (prevBtn) prevBtn.addEventListener('click', prevTrack);
        if (nextBtn) nextBtn.addEventListener('click', nextTrack);
        if (volSlider) volSlider.addEventListener('input', handleVolumeChange);
        if (volBtn) volBtn.addEventListener('click', toggleMute);
        if (headerMusicBtn) headerMusicBtn.addEventListener('click', togglePlay);
        
        // Audio node listeners
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', autoAdvanceTrack);
        
        if (progressContainer) {
            progressContainer.addEventListener('click', seek);
        }
    }

    /**
     * Loads a specific track index.
     */
    function loadTrack(index, startAtTime = 0) {
        if (index < 0 || index >= TRACKLIST.length) return;
        
        currentTrackIdx = index;
        const track = TRACKLIST[currentTrackIdx];
        
        audio.src = track.url;
        audio.load();
        
        if (trackTitleEl) trackTitleEl.textContent = track.title;
        if (trackArtistEl) trackArtistEl.textContent = track.artist;
        
        // Reset progress bar
        if (progressFill) progressFill.style.width = '0%';
        if (timeElapsedEl) timeElapsedEl.textContent = '0:00';
        if (timeDurationEl) timeDurationEl.textContent = '-:--';
        
        localStorage.setItem('focusflow-music-current-track', index.toString());
        localStorage.setItem('focusflow-music-current-time', startAtTime.toString());

        if (startAtTime > 0) {
            const setTimeHandler = () => {
                audio.currentTime = startAtTime;
                audio.removeEventListener('loadedmetadata', setTimeHandler);
            };
            audio.addEventListener('loadedmetadata', setTimeHandler);
        }
        
        // If we were playing, play the new track automatically
        if (isPlaying) {
            playAudio();
        }
    }

    /**
     * Toggles audio play state.
     */
    function togglePlay() {
        if (isPlaying) {
            pauseAudio();
        } else {
            playAudio();
        }
    }

    /**
     * Plays the audio track.
     */
    function playAudio() {
        audio.play().then(() => {
            isPlaying = true;
            updateUIState(true);
            localStorage.setItem('focusflow-music-is-playing', 'true');
        }).catch(err => {
            console.log('Audio playback blocked or interrupted.', err);
            isPlaying = false;
            updateUIState(false);
            localStorage.setItem('focusflow-music-is-playing', 'false');
        });
    }

    /**
     * Pauses the audio track.
     */
    function pauseAudio() {
        audio.pause();
        isPlaying = false;
        updateUIState(false);
        localStorage.setItem('focusflow-music-is-playing', 'false');
    }

    /**
     * Cycle next track.
     */
    function nextTrack() {
        let nextIdx = currentTrackIdx + 1;
        if (nextIdx >= TRACKLIST.length) {
            nextIdx = 0;
        }
        loadTrack(nextIdx);
    }

    /**
     * Cycle previous track.
     */
    function prevTrack() {
        let prevIdx = currentTrackIdx - 1;
        if (prevIdx < 0) {
            prevIdx = TRACKLIST.length - 1;
        }
        loadTrack(prevIdx);
    }

    /**
     * Automatically plays next track when current one finishes.
     */
    function autoAdvanceTrack() {
        nextTrack();
        playAudio();
    }

    /**
     * Syncs buttons, vinyl spin states, and header shortcuts.
     */
    function updateUIState(playing) {
        // 1. Play button icon switch
        if (playBtn) {
            const icon = playBtn.querySelector('svg, i');
            if (icon && typeof lucide !== 'undefined') {
                icon.setAttribute('data-lucide', playing ? 'pause' : 'play');
                lucide.createIcons();
            }
        }
        
        // 2. Header play button active glow state
        if (headerMusicBtn) {
            const icon = headerMusicBtn.querySelector('svg, i');
            if (playing) {
                headerMusicBtn.classList.add('playing-music');
                headerMusicBtn.style.borderColor = 'var(--accent-purple)';
                headerMusicBtn.style.color = 'var(--accent-purple)';
                headerMusicBtn.style.boxShadow = 'var(--shadow-glow)';
                if (icon && typeof lucide !== 'undefined') {
                    icon.setAttribute('data-lucide', 'music');
                    lucide.createIcons();
                }
            } else {
                headerMusicBtn.classList.remove('playing-music');
                headerMusicBtn.style.borderColor = '';
                headerMusicBtn.style.color = '';
                headerMusicBtn.style.boxShadow = '';
                if (icon && typeof lucide !== 'undefined') {
                    icon.setAttribute('data-lucide', 'music-4');
                    lucide.createIcons();
                }
            }
        }
        
        // 3. Vinyl spinner
        if (vinylEl) {
            if (playing) {
                vinylEl.classList.add('playing');
            } else {
                vinylEl.classList.remove('playing');
            }
        }
    }

    /**
     * Updates timestamps and seekbar percentage fill.
     */
    function updateProgress() {
        if (!audio.duration) return;
        
        const current = audio.currentTime;
        const duration = audio.duration;
        
        // Update bar fill percentage
        if (progressFill) {
            const pct = (current / duration) * 100;
            progressFill.style.width = `${pct}%`;
        }
        
        // Update elapsed text
        if (timeElapsedEl) {
            timeElapsedEl.textContent = formatTime(current);
        }

        // Persist current playback time
        localStorage.setItem('focusflow-music-current-time', current.toString());
    }

    /**
     * Updates track duration when metadata is fully parsed.
     */
    function updateDuration() {
        if (timeDurationEl && audio.duration) {
            timeDurationEl.textContent = formatTime(audio.duration);
        }
    }

    /**
     * Allows clicking/seeking inside progress bar container.
     */
    function seek(e) {
        if (!progressContainer || !audio.duration) return;
        
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        
        const pct = clickX / width;
        audio.currentTime = pct * audio.duration;
        updateProgress();
    }

    /**
     * Handles volume slider changes.
     */
    function handleVolumeChange(e) {
        const val = e.target.value / 100;
        audio.volume = val;
        localStorage.setItem('focusflow-music-volume', val.toString());
        updateVolumeIcon(val);
    }

    /**
     * Mute / Unmute toggle on volume button click.
     */
    function toggleMute() {
        if (audio.volume > 0) {
            lastVolume = audio.volume;
            audio.volume = 0;
            if (volSlider) volSlider.value = 0;
            updateVolumeIcon(0);
        } else {
            audio.volume = lastVolume;
            if (volSlider) volSlider.value = Math.round(lastVolume * 100);
            updateVolumeIcon(lastVolume);
        }
        localStorage.setItem('focusflow-music-volume', audio.volume.toString());
    }

    /**
     * Swaps volume icons (mute, low, high volume).
     */
    function updateVolumeIcon(vol) {
        if (!volBtn) return;
        
        const icon = volBtn.querySelector('svg, i');
        if (!icon || typeof lucide === 'undefined') return;
        
        let iconName = 'volume-2';
        if (vol === 0) {
            iconName = 'volume-x';
        } else if (vol < 0.4) {
            iconName = 'volume-1';
        }
        
        icon.setAttribute('data-lucide', iconName);
        lucide.createIcons();
    }

    /**
     * Format raw seconds into mm:ss format.
     */
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
})();

// FocusFlow - Task Management App for ADHD

// Audio files to be preloaded
const AUDIO_FILES = [
    { id: 'rain', path: 'audio/rain.mp3', name: 'Rain' },
    { id: 'birds', path: 'audio/birds.mp3', name: 'Birds' },
    { id: 'water', path: 'audio/water.mp3', name: 'Water' },
    { id: 'wind', path: 'audio/wind.mp3', name: 'Wind' },
    { id: 'whitenoise', path: 'audio/whitenoise.mp3', name: 'White Noise' },
    { id: 'thunder', path: 'audio/thunder.mp3', name: 'Thunder' },
    { id: 'bonfire', path: 'audio/bonfire.mp3', name: 'Bonfire' },
    { id: 'gong', path: 'audio/gong.mp3', name: 'Gong' },
    { id: 'chatter', path: 'audio/chatter.mp3', name: 'Cafe Chatter' },
    { id: 'alpha', path: 'audio/alpha.mp3', name: 'Alpha Waves' }
];

// Global state
const state = {
    tasks: [],
    completedTasks: [],
    canceledTasks: [],
    activeTaskId: null,
    audioElements: {},
    currentAudio: null,
    timerInterval: null,
    isPaused: false,
    remainingTime: 0,
    timerStart: null, // <-- add this
    timerPausedAt: null, // <-- add this
    breakTimerInterval: null,
    soundPreferences: {},
    stats: {
        todayFocusTime: 0,
        tasksCompleted: 0,
        soundUsage: {}
    },
    activeSounds: {},
    completionSound: null
};

// Add these variables at the top with other state variables
let audioContext = null;
let completionSoundBuffer = null;
let localMusicFiles = [];
let localMusicPlayer = null;
let isLocalMusicPlaying = false;
let youtubePlayer = null;
let isYoutubePlaying = false;

let soundMixerState = {
    isPlaying: false,
    currentSound: null,
    volume: 0.5,
    sliderValues: {}
};

let localFilesState = {
    isPlaying: false,
    currentFile: null,
    volume: 0.5
};

let youtubeState = {
    isPlaying: false,
    currentUrl: null
};

// Sound mixer state
let soundVolumes = {
    rain: 50,
    birds: 50,
    water: 50,
    wind: 50,
    whitenoise: 50,
    thunder: 50,
    bonfire: 50,
    chatter: 50,
    alpha: 50
};

let selectedSound = null;
let soundElements = {};

// Preset Mixes Configuration
const presetMixes = {
    mix_focus: {
        sounds: ['whitenoise', 'alpha'],
        volumes: [70, 60]
    },
    mix_relaxation: {
        sounds: ['rain', 'wind', 'birds'],
        volumes: [60, 40, 50]
    },
    mix_sleep: {
        sounds: ['rain', 'whitenoise', 'alpha'],
        volumes: [50, 40, 30]
    },
    mix_nature: {
        sounds: ['rain', 'birds', 'water', 'wind'],
        volumes: [60, 50, 40, 30]
    },
    mix_random: {
        sounds: ['rain', 'birds', 'water', 'wind', 'whitenoise', 'thunder', 'bonfire', 'chatter', 'alpha', 'gong'],
        volumes: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50]
    }
};

// Initialize sound elements
const sounds = {
    rain: new Audio('sounds/rain.mp3'),
    birds: new Audio('sounds/birds.mp3'),
    water: new Audio('sounds/water.mp3'),
    wind: new Audio('sounds/wind.mp3'),
    whitenoise: new Audio('sounds/whitenoise.mp3'),
    thunder: new Audio('sounds/thunder.mp3'),
    bonfire: new Audio('sounds/bonfire.mp3'),
    chatter: new Audio('sounds/chatter.mp3'),
    alpha: new Audio('sounds/alpha.mp3'),
    gong: new Audio('sounds/gong.mp3')
};

// Set all sounds to loop
Object.values(sounds).forEach(sound => {
    sound.loop = true;
});

// Sound state management
let activeSounds = new Set();
let currentVolume = 50;

// Handle sound checkbox changes
document.querySelectorAll('.sound-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const soundName = e.target.dataset.sound;
        const sound = sounds[soundName];
        
        if (e.target.checked) {
            sound.volume = currentVolume / 100;
            sound.play();
            activeSounds.add(soundName);
        } else {
            sound.pause();
            sound.currentTime = 0;
            activeSounds.delete(soundName);
        }
        
        updateVolumeDisplay();
    });
});

// Handle master volume slider
const masterVolumeSlider = document.getElementById('master-volume-slider');
const volumeValue = document.getElementById('volume-value');
const selectedSoundName = document.getElementById('selected-sound-name');

masterVolumeSlider.addEventListener('input', (e) => {
    currentVolume = parseInt(e.target.value);
    volumeValue.textContent = `${currentVolume}%`;
    
    // Update volume for all active sounds
    activeSounds.forEach(soundName => {
        sounds[soundName].volume = currentVolume / 100;
    });
});

// Handle preset mix buttons
document.querySelectorAll('.preset-mix-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const presetName = e.target.dataset.preset;
        const preset = presetMixes[presetName];
        
        // Uncheck all sounds first
        document.querySelectorAll('.sound-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            const soundName = checkbox.dataset.sound;
            sounds[soundName].pause();
            sounds[soundName].currentTime = 0;
        });
        
        // Clear active sounds
        activeSounds.clear();
        
        // Apply preset
        preset.sounds.forEach((soundName, index) => {
            const checkbox = document.querySelector(`[data-sound="${soundName}"]`);
            checkbox.checked = true;
            sounds[soundName].volume = preset.volumes[index] / 100;
            sounds[soundName].play();
            activeSounds.add(soundName);
        });
        
        // Update volume slider
        currentVolume = 50;
        masterVolumeSlider.value = currentVolume;
        volumeValue.textContent = `${currentVolume}%`;
        updateVolumeDisplay();
    });
});

function updateVolumeDisplay() {
    if (activeSounds.size === 0) {
        selectedSoundName.textContent = 'Select a sound to adjust volume';
    } else if (activeSounds.size === 1) {
        const soundName = Array.from(activeSounds)[0];
        selectedSoundName.textContent = `Adjusting volume for ${soundName.charAt(0).toUpperCase() + soundName.slice(1)}`;
    } else {
        selectedSoundName.textContent = `Adjusting volume for ${activeSounds.size} active sounds`;
    }
}

// DOM Elements
const DOM = {
    loadingScreen: document.getElementById('loading-screen'),
    loadingBar: document.getElementById('loading-bar'),
    loadingText: document.getElementById('loading-text'),
    appContainer: document.getElementById('app-container'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    menuToggle: document.getElementById('menu-toggle'),
    addTaskButton: document.getElementById('add-task-button'),
    createTaskFormContainer: document.getElementById('create-task-form-container'),
    closeCreateTaskFormButton: document.getElementById('close-create-task-form'),
    taskForm: document.getElementById('task-form'),
    taskNameInput: document.getElementById('task-name'),
    taskTimeInput: document.getElementById('task-time'),
    taskSoundInput: document.getElementById('task-sound'),
    taskList: document.getElementById('task-list'),
    emptyTaskList: document.getElementById('empty-task-list'),
    taskSearchInput: document.getElementById('task-search'),
    activeTaskContainer: document.getElementById('active-task-container'),
    noTaskMessage: document.getElementById('no-task-message'),
    activeTaskDiv: document.getElementById('active-task'),
    activeTaskName: document.getElementById('active-task-name'),
    timerDisplay: document.getElementById('timer-display'),
    timerBar: document.getElementById('timer-bar'),
    soundName: document.getElementById('sound-name'),
    startTaskButton: document.getElementById('start-task'),
    pauseTaskButton: document.getElementById('pause-task'),
    resumeTaskButton: document.getElementById('resume-task'),
    finishTaskButton: document.getElementById('finish-task'),
    cancelTaskButton: document.getElementById('cancel-task'),
    completionModal: document.getElementById('completion-modal'),
    completedTaskName: document.getElementById('completed-task-name'),
    nextTaskButton: document.getElementById('next-task-button'),
    takeBreakButton: document.getElementById('take-break-button'),
    endSessionButton: document.getElementById('end-session-button'),
    statsButton: document.getElementById('stats-button'),
    statsButtonMobile: document.getElementById('stats-button-mobile'), // Added mobile stats button
    statsModal: document.getElementById('stats-modal'),
    closeStatsButton: document.getElementById('close-stats'),
    statsTodayFocusTime: document.getElementById('today-focus-time'),
    statsTasksCompleted: document.getElementById('tasks-completed'),
    statsMostUsedSound: document.getElementById('most-used-sound'),
    statsRecentTasksList: document.getElementById('recent-tasks-list'),
    breakModal: document.getElementById('break-modal'),
    breakTimer: document.getElementById('break-timer'),
    endBreakButton: document.getElementById('end-break-button'),
    volumeControl: document.getElementById('master-volume-slider'),
    volumeDownButton: document.getElementById('volume-down'),
    volumeUpButton: document.getElementById('volume-up'),
    muteButton: document.getElementById('mute-button'),
    themeToggleButton: document.getElementById('theme-toggle'), // Main theme toggle
    themeToggleButtonMobile: document.getElementById('theme-toggle-mobile'), // Mobile theme toggle
    
    // Sound mixer elements
    masterVolumeSlider: document.getElementById('master-volume-slider'),
    volumeValue: document.getElementById('volume-value'),
    selectedSoundName: document.getElementById('selected-sound-name'),
    // Add to DOM object for easy access
    add5MinButton: document.getElementById('add-5min'),
    add10MinButton: document.getElementById('add-10min'),
    add15MinButton: document.getElementById('add-15min'),
    add25MinButton: document.getElementById('add-25min')
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // Ensure all required DOM elements exist
    if (!DOM.loadingScreen || !DOM.loadingBar || !DOM.loadingText || !DOM.appContainer) {
        console.error('Required DOM elements not found');
        // If critical elements are missing, show the app anyway
        document.getElementById('app-container')?.classList.remove('hidden');
        return;
    }
    
    // Initialize the task views - make sure only one is visible
    if (DOM.noTaskMessage && DOM.activeTaskDiv) {
        // Default state: show no task message, hide active task view
        DOM.noTaskMessage.style.display = 'block';
        DOM.activeTaskDiv.style.display = 'none';
    }
    
    // Initialize the app
    initializeApp();
    
    // Preload audio files
    preloadAudioFiles();

    initializeAudioContext();
    loadCompletionSound();
    
    // Add visibility change listener to handle audio context
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            initializeAudioContext();
        }
    });
});

// Preload all audio files before showing the app
function preloadAudioFiles() {
    console.log('Starting audio preload...');
    let filesLoaded = 0;
    let filesFailed = 0;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log('Is mobile device:', isMobile);
    
    // Add a safety timeout to show the app even if loading fails
    const safetyTimeout = setTimeout(() => {
        console.log('Safety timeout reached, showing app');
        DOM.loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            DOM.loadingScreen.style.display = 'none';
            DOM.appContainer.classList.remove('hidden');
        }, 500);
    }, 10000); // 10 second timeout
    
    // On mobile, we'll only preload essential files
    const filesToLoad = isMobile ? 
        AUDIO_FILES.slice(0, 3) : // Only load first 3 files on mobile
        AUDIO_FILES; // Load all files on desktop
    
    console.log('Files to load:', filesToLoad.length);
    
    if (filesToLoad.length === 0) {
        console.log('No files to load, showing app immediately');
        clearTimeout(safetyTimeout);
        DOM.loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            DOM.loadingScreen.style.display = 'none';
            DOM.appContainer.classList.remove('hidden');
        }, 500);
        return;
    }
    
    filesToLoad.forEach(file => {
        console.log('Attempting to load:', file.path);
        const audio = new Audio();
        audio.src = file.path;
        audio.preload = 'auto';
        audio.loop = true;
        
        // Add to global audio elements
        state.audioElements[file.id] = audio;
        
        // Update progress when each file loads
        audio.addEventListener('canplaythrough', () => {
            console.log('Successfully loaded:', file.path);
            filesLoaded++;
            const progress = ((filesLoaded + filesFailed) / filesToLoad.length) * 100;
            DOM.loadingBar.style.width = `${progress}%`;
            DOM.loadingText.textContent = `${filesLoaded}/${filesToLoad.length} files loaded`;
            
            // When all files are loaded or failed, show the app
            if ((filesLoaded + filesFailed) === filesToLoad.length) {
                console.log('All files processed, showing app');
                clearTimeout(safetyTimeout);
                setTimeout(() => {
                    DOM.loadingScreen.classList.add('fade-out');
                    setTimeout(() => {
                        DOM.loadingScreen.style.display = 'none';
                        DOM.appContainer.classList.remove('hidden');
                    }, 500);
                }, 500);
            }
        });
        
        // Handle loading errors
        audio.addEventListener('error', (e) => {
            console.error(`Error loading audio file: ${file.path}`, e);
            filesFailed++;
            const progress = ((filesLoaded + filesFailed) / filesToLoad.length) * 100;
            DOM.loadingBar.style.width = `${progress}%`;
            DOM.loadingText.textContent = `${filesLoaded}/${filesToLoad.length} files loaded (${filesFailed} failed)`;
            
            // Remove the failed audio from the elements
            delete state.audioElements[file.id];
            
            // When all files are loaded or failed, show the app
            if ((filesLoaded + filesFailed) === filesToLoad.length) {
                console.log('All files processed (with errors), showing app');
                clearTimeout(safetyTimeout);
                setTimeout(() => {
                    DOM.loadingScreen.classList.add('fade-out');
                    setTimeout(() => {
                        DOM.loadingScreen.style.display = 'none';
                        DOM.appContainer.classList.remove('hidden');
                    }, 500);
                }, 500);
            }
        });
    });
}

// Initialize app functionality
function initializeApp() {
    console.log('Initializing app...');
    
    try {
        // Test if localStorage is available
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        
        // Load saved data from localStorage
        loadFromLocalStorage();
    } catch (error) {
        console.warn('localStorage is not available:', error);
        // Initialize with default values
        state.tasks = [];
        state.completedTasks = [];
        state.canceledTasks = [];
        state.stats = {
            todayFocusTime: 0,
            tasksCompleted: 0,
            soundUsage: {}
        };
    }
    
    // Set up event listeners for UI elements
    setupEventListeners();
    
    // Initialize UI
    updateTaskList();
    updateStats();
    
    // Initialize active task view
    if (state.activeTaskId && state.tasks.find(t => t.id === state.activeTaskId)) {
        // If there's an active task, show it
        setActiveTask(state.activeTaskId);
    } else {
        // Otherwise, clear active task and show welcome message
        clearActiveTask();
    }
    
    // Initialize sound mixer
    initializeSoundMixer();
    
    // Set up channel slider event listeners
    document.querySelectorAll('.channel-slider').forEach(slider => {
        slider.addEventListener('input', function() {
            const soundId = this.dataset.sound;
            const volume = parseInt(this.value) / 100;
            
            // Update value display
            updateSliderValue(this);
            
            // If sound is already playing, update its volume
            if (state.activeSounds[soundId]) {
                state.activeSounds[soundId].volume = volume;
            } else if (volume > 0) {
                // If sound isn't playing and volume > 0, start playing it
                const audio = new Audio(state.audioElements[soundId].src);
                audio.loop = true;
                audio.volume = volume;
                audio.play().catch(error => {
                    console.error(`Error playing ${soundId}:`, error);
                });
                state.activeSounds[soundId] = audio;
            }
            
            // If volume is 0, stop the sound
            if (volume === 0 && state.activeSounds[soundId]) {
                state.activeSounds[soundId].pause();
                state.activeSounds[soundId].currentTime = 0;
                delete state.activeSounds[soundId];
            }
        });
    });

    // Set up local music handlers
    setupLocalMusicHandlers();

    // Initialize tabs and YouTube player
    setupTabs();
    setupYouTubePlayer();
}

// Set up local music handlers
function setupLocalMusicHandlers() {
    const dropZone = document.getElementById('local-music-drop-zone');
    const fileInput = document.getElementById('local-music-input');

    if (!dropZone || !fileInput) return;

    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        handleLocalMusicFiles(e.target.files);
    });

    // Handle drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-[rgb(2,4,3)]', 'dark:border-[rgb(2,4,3)]');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-[rgb(2,4,3)]', 'dark:border-[rgb(2,4,3)]');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-[rgb(2,4,3)]', 'dark:border-[rgb(2,4,3)]');
        handleLocalMusicFiles(e.dataTransfer.files);
    });

    // Handle click to select files
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
}

// Handle local music files
function handleLocalMusicFiles(files) {
    localMusicFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
    
    if (localMusicFiles.length > 0) {
        // Store current sound mixer slider values
        const currentSliderValues = {};
        document.querySelectorAll('.channel-slider').forEach(slider => {
            const soundId = slider.dataset.sound;
            currentSliderValues[soundId] = parseInt(slider.value);
        });
        
        // Stop any currently playing sounds
        stopAudio();
        
        // Restore sound mixer slider values
        Object.entries(currentSliderValues).forEach(([soundId, value]) => {
            const slider = document.querySelector(`.channel-slider[data-sound="${soundId}"]`);
            if (slider) {
                slider.value = value;
                updateSliderValue(slider);
            }
        });
        
        // Show the local music control
        const localMusicControl = document.getElementById('local-music-info');
        localMusicControl.classList.remove('hidden');
        
        // Set initial volume and add event listener
        const slider = localMusicControl.querySelector('.channel-slider');
        if (slider) {
            slider.value = parseInt(DOM.volumeControl.value);
            updateSliderValue(slider);
            
            // Add event listener for volume changes
            slider.addEventListener('input', function() {
                const volume = parseInt(this.value) / 100;
                if (localMusicPlayer) {
                    localMusicPlayer.volume = volume;
                    updateSliderValue(this);
                }
            });
        }
        
        // Create the audio player with the first file
        const file = localMusicFiles[0];
        const url = URL.createObjectURL(file);
        
        // Create player but don't play yet
        localMusicPlayer = new Audio(url);
        localMusicPlayer.volume = parseInt(DOM.volumeControl.value) / 100;
        isLocalMusicPlaying = false;
        
        // Set up ended event for when we do play
        localMusicPlayer.addEventListener('ended', () => {
            playNextLocalMusic(0);
        });
        
        // Update the current file name display
        const fileNameDisplay = document.getElementById('current-file-name');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = file.name;
        }
    }
}

// Play local music
function playLocalMusic(index) {
    if (index >= localMusicFiles.length) {
        // If we've reached the end, start over
        index = 0;
    }

    const file = localMusicFiles[index];
    const url = URL.createObjectURL(file);
    
    // Stop previous player if exists
    if (localMusicPlayer) {
        localMusicPlayer.pause();
        URL.revokeObjectURL(localMusicPlayer.src);
    }

    // Create new player
    localMusicPlayer = new Audio(url);
    localMusicPlayer.volume = parseInt(DOM.volumeControl.value) / 100;
    isLocalMusicPlaying = true;

    // Play the file
    localMusicPlayer.play().catch(error => {
        console.error('Error playing local music:', error);
    });

    // When the file ends, play the next one
    localMusicPlayer.addEventListener('ended', () => {
        playNextLocalMusic(index);
    });
}

// Play next local music file
function playNextLocalMusic(currentIndex) {
    const nextIndex = (currentIndex + 1) % localMusicFiles.length;
    playLocalMusic(nextIndex);
}

// Stop local music
function stopLocalMusic() {
    if (localMusicPlayer) {
        localMusicPlayer.pause();
        localMusicPlayer.currentTime = 0;
        URL.revokeObjectURL(localMusicPlayer.src);
        localMusicPlayer = null;
    }
    isLocalMusicPlaying = false;
}

// Helper function to play a preset mix directly
function playPresetMix(mixId) {
    if (!mixId.startsWith('mix_')) {
        console.error('Invalid mix ID: ' + mixId);
        return;
    }
    
    const mixName = mixId.replace('mix_', '');
    const preset = presetMixes[mixId];
    
    if (!preset) {
        console.error('Preset mix not found: ' + mixId);
        return;
    }
    
    console.log('Playing preset mix: ' + mixName, preset);
    
    // Clear existing sounds first
    stopAudio();
    
    // For each sound in the mix
    preset.sounds.forEach((soundId, index) => {
        const volume = preset.volumes[index] / 100 || 0.5;
        
        // Get the audio element
        const audio = state.audioElements[soundId];
        if (!audio) {
            console.error(`Audio file not found: ${soundId}`);
            return;
        }
        
        // Create a new audio instance
        const audioInstance = new Audio(audio.src);
        audioInstance.loop = true;
        audioInstance._baseVolume = volume; // Store the base volume
        
        // Apply the global volume
        const globalVolume = parseInt(DOM.volumeControl.value) / 100;
        audioInstance.volume = volume * globalVolume;
        
        // Play the audio with error handling
        const playPromise = audioInstance.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error(`Error playing ${soundId}:`, error);
            });
        }
        
        // Store in active sounds
        state.activeSounds[soundId] = audioInstance;
        
        // Update checkbox state
        const checkbox = document.querySelector(`.sound-checkbox[data-sound="${soundId}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    
    // Add active class to the preset button
    const presetButton = document.querySelector(`.sound-preset[data-preset="${mixName}"]`);
    if (presetButton) {
        document.querySelectorAll('.sound-preset').forEach(btn => {
            btn.classList.remove('active-preset');
        });
        presetButton.classList.add('active-preset');
    }
}

// Modify the playAudio function to properly handle preset mixes
function playAudio(audioId) {
    // If local music is playing, don't play preset sounds
    if (isLocalMusicPlaying) return;
    
    console.log('Playing audio: ' + audioId);
    
    // Only stop preset sounds, not local music
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio.currentTime = 0;
        state.currentAudio = null;
    }
    
    // Stop all active sounds in the mix
    Object.values(state.activeSounds).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    state.activeSounds = {};
    
    // Remove active class from all preset buttons
    document.querySelectorAll('.sound-preset').forEach(button => {
        button.classList.remove('active-preset');
    });
    
    // Check if it's a preset mix
    if (audioId.startsWith('mix_')) {
        playPresetMix(audioId);
        return;
    }
    
    // Handle single sound playback
    const audio = state.audioElements[audioId];
    if (!audio) {
        console.error(`Audio file not found: ${audioId}`);
        return;
    }
    
    // Set volume from range input
    const volumeControl = DOM.volumeControl;
    const volume = parseInt(volumeControl.value) / 100;
    audio.volume = volume;
    
    // Update the corresponding slider
    const slider = document.querySelector(`.channel-slider[data-sound="${audioId}"]`);
    if (slider) {
        slider.value = volume * 100; // Convert to percentage
        updateSliderValue(slider);
    }
    
    // Create a new audio instance to ensure fresh playback
    const audioInstance = new Audio(audio.src);
    audioInstance.loop = true;
    audioInstance.volume = volume;
    
    // Play the audio with error handling
    const playPromise = audioInstance.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.error('Error playing audio:', error);
            // If the error is due to user interaction requirement
            if (error.name === 'NotAllowedError') {
                // Show a message to the user
                alert('Please interact with the page first to enable audio playback.');
            }
        });
    }
    
    // Update state
    state.currentAudio = audioInstance;
}

// Modify the stopAudio function to handle local music
function stopAudio() {
    // Don't stop local music here, only stop preset sounds
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio.currentTime = 0;
        state.currentAudio = null;
    }
    
    // Stop all active sounds in the mix
    Object.values(state.activeSounds).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    state.activeSounds = {};
    
    // Reset all sliders to 0
    document.querySelectorAll('.channel-slider').forEach(slider => {
        if (slider.dataset.sound !== 'local-music') { // Don't reset local music slider
            slider.value = 0;
            updateSliderValue(slider);
        }
    });
    
    // Remove active class from all preset buttons
    document.querySelectorAll('.sound-preset').forEach(button => {
        button.classList.remove('active-preset');
    });
}

// Modify the setGlobalVolume function to handle local music
function setGlobalVolume(volume) {
    // Adjust volume for local music
    if (localMusicPlayer) {
        localMusicPlayer.volume = volume;
        // Update the local music slider
        const localMusicSlider = document.querySelector('.channel-slider[data-sound="local-music"]');
        if (localMusicSlider) {
            localMusicSlider.value = volume * 100;
            updateSliderValue(localMusicSlider);
        }
    }
    
    // Adjust volume for single sound
    if (state.currentAudio) {
        // Ensure baseVolume exists, default to 1 if not
        const baseVolume = state.currentAudio._baseVolume || 1;
        state.currentAudio.volume = volume * baseVolume;
    }
    
    // Adjust volume for mixed sounds
    Object.values(state.activeSounds).forEach(audio => {
        const baseVolume = audio._baseVolume || 1; // Each sound in a mix uses its own base volume
        audio.volume = volume * baseVolume; // Apply global volume multiplier
    });
}

// Set up all event listeners
function setupEventListeners() {
    // Task form submission (inside modal now)
    DOM.taskForm.addEventListener('submit', handleTaskFormSubmit);
    
    // Timer control buttons
    DOM.startTaskButton.addEventListener('click', startTask);
    DOM.pauseTaskButton.addEventListener('click', pauseTask);
    DOM.resumeTaskButton.addEventListener('click', resumeTask);
    DOM.finishTaskButton.addEventListener('click', finishTask);
    DOM.cancelTaskButton.addEventListener('click', cancelTask);
    
    // Completion modal buttons
    DOM.nextTaskButton.addEventListener('click', startNextTask);
    DOM.takeBreakButton.addEventListener('click', startBreak);
    DOM.endSessionButton.addEventListener('click', endSession);
    // Add Time buttons
    if (DOM.add5MinButton) DOM.add5MinButton.addEventListener('click', () => continueTaskWithExtraTime(5));
    if (DOM.add10MinButton) DOM.add10MinButton.addEventListener('click', () => continueTaskWithExtraTime(10));
    if (DOM.add15MinButton) DOM.add15MinButton.addEventListener('click', () => continueTaskWithExtraTime(15));
    if (DOM.add25MinButton) DOM.add25MinButton.addEventListener('click', () => continueTaskWithExtraTime(25));
    
    // Break modal button
    DOM.endBreakButton.addEventListener('click', endBreak);
    
    // Stats modal
    DOM.statsButton.addEventListener('click', toggleStatsModal);
    DOM.statsButtonMobile.addEventListener('click', toggleStatsModal); // Mobile stats button
    DOM.closeStatsButton.addEventListener('click', toggleStatsModal);
    
    // Audio controls
    DOM.volumeControl.addEventListener('input', adjustVolume);
    DOM.volumeUpButton.addEventListener('click', increaseVolume);
    DOM.volumeDownButton.addEventListener('click', decreaseVolume);
    DOM.muteButton.addEventListener('click', toggleMute);
    
    // Task search
    DOM.taskSearchInput.addEventListener('input', handleSearchInput);
    
    // Add Enter key handler for search to create task
    DOM.taskSearchInput.addEventListener('keydown', function(e) {
        // Check if Enter key was pressed
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default form submission
            
            const searchTerm = this.value.trim();
            
            // If search term is empty, do nothing
            if (!searchTerm) return;
            
            // Count visible tasks after filtering
            const visibleTasks = Array.from(DOM.taskList.querySelectorAll('li[data-id]'))
                .filter(item => item.style.display !== 'none')
                .length;
            
            // If no matching tasks found, open the create task modal and populate with search term
            if (visibleTasks === 0) {
                // Store the search term for later use
                const storedSearchTerm = searchTerm;
                
                // Clear the search input first
                this.value = '';
                filterTaskList('');
                
                // Open the task creation modal (this will reset the form)
                openCreateTaskModal();
                
                // Use setTimeout to ensure the task name is set after the form is reset
                setTimeout(() => {
                    // Now set the task name input field value
                    DOM.taskNameInput.value = storedSearchTerm;
                }, 0);
            }
        }
    });

    // --- New Listeners for Sidebar and Modals ---

    // Sidebar toggle (mobile)
    DOM.menuToggle.addEventListener('click', toggleSidebar);
    DOM.sidebarOverlay.addEventListener('click', toggleSidebar); // Close sidebar on overlay click

    // Create Task Modal
    DOM.addTaskButton.addEventListener('click', openCreateTaskModal);
    DOM.closeCreateTaskFormButton.addEventListener('click', closeCreateTaskModal);

    // Delegate task list events (start/delete/edit)
    DOM.taskList.addEventListener('click', handleTaskListClick);

    // Add event listener for the "Start now" button
    document.getElementById('add-first-task')?.addEventListener('click', () => {
        openCreateTaskModal();
    });

    // Add task header buttons
    document.getElementById('add-task-header')?.addEventListener('click', openCreateTaskModal);
    document.getElementById('add-task-header-mobile')?.addEventListener('click', openCreateTaskModal);

    // Add event listener for local music slider
    const localMusicSlider = document.querySelector('.channel-slider[data-sound="local-music"]');
    if (localMusicSlider) {
        localMusicSlider.addEventListener('input', function() {
            const volume = parseInt(this.value) / 100;
            if (localMusicPlayer) {
                localMusicPlayer.volume = volume;
                updateSliderValue(this);
            }
        });
    }

    // Initialize sound mixer
    initializeSoundMixer();
}

// --- Sidebar and Modal Functions ---

function toggleSidebar() {
    DOM.sidebar.classList.toggle('open'); // Assumes 'open' class translates it into view
    DOM.sidebarOverlay.classList.toggle('hidden');
    // Optional: Prevent body scroll when sidebar is open on mobile
    if (DOM.sidebar.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
        } else {
        document.body.style.overflow = '';
    }
}

function openCreateTaskModal() {
    editTaskId = null;
    DOM.taskForm.reset();
    DOM.createTaskFormContainer.classList.remove('hidden');
    // Restore modal title/button
    const modalTitle = DOM.createTaskFormContainer.querySelector('h2');
    if (modalTitle) modalTitle.textContent = 'Create New Task';
    const submitBtn = DOM.taskForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Add Task';
    DOM.taskNameInput.focus();
}

function closeCreateTaskModal() {
    DOM.createTaskFormContainer.classList.add('hidden');
    DOM.taskForm.reset();
    editTaskId = null;
    // Restore modal title/button
    const modalTitle = DOM.createTaskFormContainer.querySelector('h2');
    if (modalTitle) modalTitle.textContent = 'Create New Task';
    const submitBtn = DOM.taskForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Add Task';
}

// --- Modified Event Handlers ---

// Handle task form submission
function handleTaskFormSubmit(e) {
    e.preventDefault();
    const taskName = DOM.taskNameInput.value.trim();
    const taskTime = parseInt(DOM.taskTimeInput.value);
    const taskSound = DOM.taskSoundInput.value;
    if (!taskName || !taskTime || taskTime <= 0) {
        console.warn('Invalid task input');
        return;
    }
    if (editTaskId) {
        // Edit mode: update existing task
        const task = state.tasks.find(t => t.id === editTaskId);
        if (task) {
            task.name = taskName;
            task.duration = taskTime;
            task.sound = taskSound;
            saveToLocalStorage();
            updateTaskList();
            if (state.activeTaskId === editTaskId) {
                setActiveTask(editTaskId);
            }
        }
        closeCreateTaskModal();
        return;
    }
    // Create new task (original logic)
    const newTask = {
        id: Date.now().toString(),
        name: taskName,
        duration: taskTime,
        sound: taskSound,
        createdAt: Date.now()
    };
    state.tasks.push(newTask);
    saveToLocalStorage();
    updateTaskList();
    closeCreateTaskModal();
    if (!state.activeTaskId) {
        setActiveTask(newTask.id);
    }
    if (window.innerWidth < 768 && DOM.sidebar.classList.contains('open')) {
        toggleSidebar();
    }
}

// Handle clicks within the task list (delegation)
function handleTaskListClick(e) {
    const startButton = e.target.closest('.start-button');
    const editButton = e.target.closest('.edit-button');
    const deleteButton = e.target.closest('.delete-button');
    const taskItem = e.target.closest('.task-item');

    if (startButton) {
        const taskId = startButton.dataset.id;
        setActiveTask(taskId);
        startTask();
        if (window.innerWidth < 768 && DOM.sidebar.classList.contains('open')) {
            toggleSidebar();
        }
        return;
    }

    if (editButton) {
        const taskId = editButton.dataset.id;
        openEditTaskModal(taskId);
        return;
    }

    if (deleteButton) {
        const taskId = deleteButton.dataset.id;
        if (taskItem.classList.contains('completed')) {
            deleteCompletedTask(taskId);
        } else if (taskItem.classList.contains('canceled')) {
            deleteCanceledTask(taskId);
        } else {
            deleteTask(taskId);
        }
        return;
    }

    if (taskItem && !taskItem.classList.contains('active') && !taskItem.classList.contains('completed') && !taskItem.classList.contains('canceled')) {
        const taskId = taskItem.dataset.id;
        setActiveTask(taskId);
        if (window.innerWidth < 768 && DOM.sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    }
}

// Handle search input
function handleSearchInput(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    filterTaskList(searchTerm);
}

// Filter task list based on search term
function filterTaskList(searchTerm) {
    const taskItems = DOM.taskList.querySelectorAll('li[data-id]'); // Select only items with data-id
    let visibleTasks = 0;

    taskItems.forEach(item => {
        const taskName = item.querySelector('h3')?.textContent.toLowerCase() || '';
        const isMatch = taskName.includes(searchTerm);
        item.style.display = isMatch ? '' : 'none';
        if (isMatch) {
            visibleTasks++;
        }
    });

    // Show/hide empty state message
    if (visibleTasks === 0 && searchTerm !== '') {
        DOM.emptyTaskList.innerHTML = `<p>No tasks found matching "${searchTerm}"</p>`;
        DOM.emptyTaskList.classList.remove('hidden');
    } else if (state.tasks.length === 0 && state.completedTasks.length === 0 && state.canceledTasks.length === 0) {
        DOM.emptyTaskList.innerHTML = `<p>No tasks in queue</p>`;
        DOM.emptyTaskList.classList.remove('hidden');
    } else if (visibleTasks === 0 && searchTerm === '' && (state.tasks.length > 0 || state.completedTasks.length > 0 || state.canceledTasks.length > 0)) {
        // This case shouldn't happen if dividers are not hidden, but as fallback:
        DOM.emptyTaskList.classList.add('hidden'); // Hide if search is empty but lists exist
    } else if (visibleTasks > 0) {
         DOM.emptyTaskList.classList.add('hidden');
    }

    // Ensure dividers are always visible if their sections have content (even if filtered out)
    const completedDivider = DOM.taskList.querySelector('.task-divider.completed-divider');
    const canceledDivider = DOM.taskList.querySelector('.task-divider.canceled-divider');
    if (completedDivider) completedDivider.style.display = state.completedTasks.length > 0 ? '' : 'none';
    if (canceledDivider) canceledDivider.style.display = state.canceledTasks.length > 0 ? '' : 'none';
}

// Update the task list in the UI (Sidebar Version)
function updateTaskList() {
    DOM.taskList.innerHTML = ''; // Clear current list

    const searchTerm = DOM.taskSearchInput.value.toLowerCase().trim();

    let hasVisibleQueuedTasks = false;
    let hasVisibleCompletedTasks = false;
    let hasVisibleCanceledTasks = false;

    // Add active tasks to the list
    state.tasks.forEach(task => {
        const li = createTaskListItem(task, 'queued');
        DOM.taskList.appendChild(li);
        if (!searchTerm || task.name.toLowerCase().includes(searchTerm)) {
            hasVisibleQueuedTasks = true;
        }
    });

    // Add completed tasks section
    if (state.completedTasks.length > 0) {
        const completedDivider = document.createElement('li');
        completedDivider.className = 'task-divider completed-divider';
        completedDivider.innerHTML = 'Completed Tasks';
        DOM.taskList.appendChild(completedDivider);

        state.completedTasks.slice(0, 10).forEach(task => { // Show more completed tasks
            const li = createTaskListItem(task, 'completed');
            DOM.taskList.appendChild(li);
            if (!searchTerm || task.name.toLowerCase().includes(searchTerm)) {
                hasVisibleCompletedTasks = true;
            }
        });
    }

    // Add canceled tasks section
    if (state.canceledTasks.length > 0) {
        const canceledDivider = document.createElement('li');
        canceledDivider.className = 'task-divider canceled-divider';
        canceledDivider.innerHTML = 'Canceled Tasks';
        DOM.taskList.appendChild(canceledDivider);

        state.canceledTasks.slice(0, 5).forEach(task => {
            const li = createTaskListItem(task, 'canceled');
            DOM.taskList.appendChild(li);
            if (!searchTerm || task.name.toLowerCase().includes(searchTerm)) {
                hasVisibleCanceledTasks = true;
            }
        });
    }

    // Apply current search filter
    filterTaskList(searchTerm);

    // Show/hide overall empty state message
    const hasAnyTasks = state.tasks.length > 0 || state.completedTasks.length > 0 || state.canceledTasks.length > 0;
    const hasAnyVisibleContent = hasVisibleQueuedTasks || hasVisibleCompletedTasks || hasVisibleCanceledTasks;

    if (!hasAnyTasks) {
        DOM.emptyTaskList.innerHTML = `<p>No tasks yet!</p><p class="text-sm mt-1">Click the '+' to add one.</p>
        <p>For feature requests, contact <a href="https://x.com/nikhilgohil11" target="_blank" class="text-[rgb(18, 105, 227)] dark:text-[rgb(3, 21, 111)] hover:underline">@nikhilgohil11</a> or <a href="https://x.com/VikasGohil2" target="_blank" class="text-[rgb(18, 105, 227)] dark:text-[rgb(3, 21, 111)] hover:underline">@VikasGohil2</a></p>`;
        DOM.emptyTaskList.classList.remove('hidden');
    } else if (!hasAnyVisibleContent && searchTerm) {
        DOM.emptyTaskList.innerHTML = `<p>No tasks found matching "${searchTerm}"</p>`;
        DOM.emptyTaskList.classList.remove('hidden');
    } else {
        DOM.emptyTaskList.classList.add('hidden');
    }
}

// Helper function to create a task list item element
function createTaskListItem(task, type) {
            const li = document.createElement('li');
    li.className = `task-item ${type}`; // Add type class (queued, completed, canceled)
    li.dataset.id = task.id;

    // Highlight active task
    if (type === 'queued' && task.id === state.activeTaskId) {
        li.classList.add('active');
    }

    const soundIcon = task.sound !== 'none' ? `<i class="fas fa-music mr-1 text-[rgb(2,4,3)]"></i>${findAudioName(task.sound)}` : '';
    const durationInfo = type === 'queued' ? `<i class="far fa-clock mr-1"></i>${task.duration} min` : '';

    let statusIcon = '';
    let timestamp = '';
    if (type === 'completed') {
        statusIcon = `<i class="far fa-check-circle text-green-500 mr-1"></i>`;
        const date = new Date(task.completedAt);
        timestamp = `Completed ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (type === 'canceled') {
        statusIcon = `<i class="fas fa-ban text-red-500 mr-1"></i>`;
            const date = new Date(task.canceledAt);
        timestamp = `Canceled ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
            
            li.innerHTML = `
                <div class="flex items-center justify-between">
            <div class="min-w-0 flex-1">
                <h3 class="font-medium truncate ${task.id === state.activeTaskId ? 'text-[rgb(2,4,3)] dark:text-[rgb(2,4,3)]' : 'text-gray-800 dark:text-gray-200'}">${task.name}</h3>
                <div class="task-details flex items-center space-x-3 text-xs mt-1 text-gray-500 dark:text-gray-400">
                    ${statusIcon ? `<span>${statusIcon}${timestamp}</span>` : ''}
                    ${durationInfo ? `<span>${durationInfo}</span>` : ''}
                    ${soundIcon ? `<span class="truncate">${soundIcon}</span>` : ''}
                        </div>
            <div class="task-actions flex items-center ml-2">
                ${type === 'queued' && task.id !== state.activeTaskId ? `
                    <button title="Start Task" class="start-button p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 rounded-full" data-id="${task.id}">
                        <i class="fas fa-play fa-xs"></i>
                    </button>
                    <button title="Edit Task" class="edit-button p-1 bg-gray-100 dark:bg-gray-900 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full" data-id="${task.id}">
                        <i class="fas fa-pen fa-xs"></i>
                    </button>
                ` : ''}
                <button title="Delete Task" class="delete-button p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-full" data-id="${task.id}">
                    <i class="fas fa-trash-alt fa-xs"></i>
                        </button>
                    </div>
                    </div>
                </div>
            `;
    return li;
}

// Find audio name from ID
function findAudioName(audioId) {
    // Handle preset mixes
    if (audioId.startsWith('mix_')) {
        const mixName = audioId.replace('mix_', '');
        // Capitalize first letter and add " Mix" suffix
        return mixName.charAt(0).toUpperCase() + mixName.slice(1) + ' Mix';
    }
    
    // Handle single sounds
    const audio = AUDIO_FILES.find(a => a.id === audioId);
    return audio ? audio.name : 'Sound';
}

// Set the active task
function setActiveTask(taskId) {
    // Find the task in the queue
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Update active task in state
    state.activeTaskId = taskId;
    
    // Update UI
    DOM.activeTaskName.textContent = task.name;
    DOM.timerDisplay.textContent = formatTime ? formatTime(task.duration * 60) : `${task.duration}:00`;
    
    // Reset timer bar to full width
    DOM.timerBar.style.width = '100%';
    
    // Hide no task message and show active task view
    DOM.noTaskMessage.style.display = 'none';
    DOM.activeTaskDiv.style.display = 'block';
    
    // Update task list UI
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.id === taskId) {
            item.classList.add('active');
        }
    });
    
    // Reset timer state
    state.timerRunning = false;
    state.isPaused = false;
    state.remainingTime = task.duration * 60;
    state.timerStart = null; // <-- reset
    state.timerPausedAt = null; // <-- reset
    
    // Update timer display
    updateTimerDisplay();
    
    // Reset control buttons
    DOM.startTaskButton.classList.remove('hidden');
    DOM.pauseTaskButton.classList.add('hidden');
    DOM.resumeTaskButton.classList.add('hidden');
    
    // Set up sound checkboxes based on the task's sound
    updateSoundCheckboxes(task.sound);
    
    // Save state
    saveToLocalStorage();
}

// Helper function to update sound checkboxes based on task sound
function updateSoundCheckboxes(soundId) {
    console.log('Updating sound checkboxes for:', soundId);
    
    // First, uncheck all checkboxes
    document.querySelectorAll('.sound-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // If the sound is none, we're done
    if (!soundId || soundId === 'none') return;
    
    if (soundId.startsWith('mix_')) {
        // Handle preset mixes
        const mixName = soundId.replace('mix_', '');
        
        if (presetMixes[soundId]) {
            console.log('Setting up preset mix:', soundId, presetMixes[soundId]);
            
            // Check all sounds in the mix
            presetMixes[soundId].sounds.forEach((sound, index) => {
                console.log('Setting up sound in mix:', sound);
                const checkbox = document.querySelector(`.sound-checkbox[data-sound="${sound}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    
                    // Set volume if available in the preset
                    if (presetMixes[soundId].volumes && presetMixes[soundId].volumes[index]) {
                        const volume = presetMixes[soundId].volumes[index];
                        soundVolumes[sound] = volume;
                        
                        // If sound channel sliders exist, update them
                        const slider = document.querySelector(`.channel-slider[data-sound="${sound}"]`);
                        if (slider) {
                            slider.value = volume;
                            updateSliderValue(slider);
                        }
                    }
                } else {
                    console.warn('Checkbox not found for sound:', sound);
                }
            });
            
            // Set master volume to default (50%)
            if (DOM.masterVolumeSlider) {
                DOM.masterVolumeSlider.value = 50;
                if (DOM.volumeValue) {
                    DOM.volumeValue.textContent = '50%';
                }
            }
            
            // Add active class to the preset button
            const presetButton = document.querySelector(`.preset-mix-btn[data-preset="${soundId}"]`);
            if (presetButton) {
                document.querySelectorAll('.preset-mix-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                presetButton.classList.add('active');
            }
        } else {
            console.warn('Preset mix not found:', soundId);
        }
    } else {
        // Handle single sound
        console.log('Setting up single sound:', soundId);
        const checkbox = document.querySelector(`.sound-checkbox[data-sound="${soundId}"]`);
        if (checkbox) {
            checkbox.checked = true;
            
            // Set this as the selected sound
            selectedSound = soundId;
            const soundItem = checkbox.closest('.sound-item');
            if (soundItem) {
                document.querySelectorAll('.sound-item').forEach(item => {
                    item.classList.remove('selected');
                });
                soundItem.classList.add('selected');
            }
            
            // Update master volume slider to show this sound's volume
            if (DOM.masterVolumeSlider && soundVolumes[soundId]) {
                DOM.masterVolumeSlider.value = soundVolumes[soundId];
                if (DOM.volumeValue) {
                    DOM.volumeValue.textContent = `${soundVolumes[soundId]}%`;
                }
            }
            
            // Update selected sound name
            if (DOM.selectedSoundName) {
                DOM.selectedSoundName.textContent = soundId.charAt(0).toUpperCase() + soundId.slice(1);
            }
        } else {
            console.warn('Checkbox not found for sound:', soundId);
        }
    }
    
    // Update the volume display
    updateVolumeDisplay();
}

function clearActiveTask() {
    // Clear active task from state
    state.activeTaskId = null;
    state.timerRunning = false;
    state.isPaused = false;
    state.remainingTime = 0;
    state.timerStart = null;
    state.timerPausedAt = null;
    
    // Clear timer display
    DOM.timerDisplay.textContent = '00:00';
    
    // Show no task message and hide active task view
    DOM.noTaskMessage.style.display = 'block';
    DOM.activeTaskDiv.style.display = 'none';
    
    // Update task list UI
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Reset control buttons
    DOM.startTaskButton.classList.remove('hidden');
    DOM.pauseTaskButton.classList.add('hidden');
    DOM.resumeTaskButton.classList.add('hidden');
    
    // Clear sound checkboxes
    document.querySelectorAll('.sound-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Update volume display
    if (typeof updateVolumeDisplay === 'function') {
        updateVolumeDisplay();
    }
    
    // Stop any playing audio
    stopAudio();
    
    // Save state
    saveToLocalStorage();
}

// Delete a task
function deleteTask(taskId) {
    // If it's the active task, clear the active task view
    if (taskId === state.activeTaskId) {
        clearActiveTask();
    }
    
    // Remove from tasks array
    state.tasks = state.tasks.filter(task => task.id !== taskId);
    
    // Save and update UI
    saveToLocalStorage();
    updateTaskList();
}

// Start the active task
function startTask() {
    if (!state.activeTaskId) return;
    
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (!task) return;
    
    console.log('Starting task:', task);
    
    // Update UI buttons
    DOM.startTaskButton.classList.add('hidden');
    DOM.pauseTaskButton.classList.remove('hidden');
    DOM.resumeTaskButton.classList.add('hidden');
    
    // Reset timer if needed
    if (!state.isPaused) {
        state.remainingTime = task.duration * 60;
        state.timerStart = Date.now(); // <-- set start time
        state.timerPausedAt = null;
        updateTimerDisplay();
    } else {
        // If resuming from pause, adjust timerStart
        if (state.timerPausedAt && state.timerStart) {
            const pausedDuration = Date.now() - state.timerPausedAt;
            state.timerStart += pausedDuration;
            state.timerPausedAt = null;
        }
    }
    
    // Get the active tab
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    
    // Stop any playing audio from other tabs
    if (activeTab !== 'sound-mixer') {
        stopAudio();
    }
    if (activeTab !== 'local-files' && localMusicPlayer && isLocalMusicPlaying) {
        localMusicPlayer.pause();
        localMusicPlayer.currentTime = 0;
        isLocalMusicPlaying = false;
    }
    if (activeTab !== 'youtube' && youtubePlayer && isYoutubePlaying) {
        youtubePlayer.pauseVideo();
        youtubePlayer.seekTo(0);
        isYoutubePlaying = false;
    }
    
    // Start audio based on active tab and task sound
    if (activeTab === 'sound-mixer') {
        // If task has a sound, make sure the checkboxes are set up correctly
        if (task.sound && task.sound !== 'none') {
            console.log('Task has sound:', task.sound);
            
            // First update the checkboxes (this won't play the sound)
            updateSoundCheckboxes(task.sound);
            
            // Now play the sound
            if (task.sound.startsWith('mix_')) {
                playPresetMix(task.sound);
            } else {
                playAudio(task.sound);
            }
        }
    } else if (activeTab === 'local-files' && localMusicPlayer) {
        if (!isLocalMusicPlaying) {
            playLocalMusic(0);
        } else {
            localMusicPlayer.play().catch(error => {
                console.error('Error resuming local music:', error);
            });
        }
    } else if (activeTab === 'youtube' && youtubePlayer) {
        youtubePlayer.playVideo();
    }
    
    // Reset timer bar
    const timerBar = document.getElementById('timer-bar');
    if (timerBar) {
        timerBar.style.strokeDashoffset = '691.15'; // Start from full circle
        timerBar.style.transition = 'stroke-dashoffset 1s linear';
    }
    
    // Start the timer
    state.isPaused = false;
    state.timerInterval = setInterval(() => {
        state.remainingTime--;
        
        // Update timer display
        updateTimerDisplay();
        
        // Check if timer is complete
        if (state.remainingTime <= 0) {
            clearInterval(state.timerInterval);
            completeTask();
        }
    }, 1000);
}

// Pause the active task
function pauseTask() {
    if (!state.timerInterval) return;
    
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.isPaused = true;
    state.timerPausedAt = Date.now(); // <-- record pause time
    
    // Pause audio based on active tab
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    
    if (activeTab === 'sound-mixer') {
        pauseAudio();
    } else if (activeTab === 'local-files' && localMusicPlayer && isLocalMusicPlaying) {
        localMusicPlayer.pause();
    } else if (activeTab === 'youtube' && youtubePlayer && isYoutubePlaying) {
        youtubePlayer.pauseVideo();
    }
    
    // Update UI
    DOM.pauseTaskButton.classList.add('hidden');
    DOM.resumeTaskButton.classList.remove('hidden');
}

// Resume the paused task
function resumeTask() {
    if (!state.isPaused) return;
    
    // Resume audio based on active tab
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    
    if (activeTab === 'sound-mixer') {
        const task = state.tasks.find(t => t.id === state.activeTaskId);
        if (task && task.sound !== 'none') {
            // Reset all sliders first
            document.querySelectorAll('.channel-slider').forEach(slider => {
                slider.value = 0;
                updateSliderValue(slider);
            });
            
            // Play the task's sound
            playAudio(task.sound);
            
            // If we have stored slider values, restore them
            if (soundMixerState.sliderValues) {
                Object.entries(soundMixerState.sliderValues).forEach(([soundId, value]) => {
                    const slider = document.querySelector(`.channel-slider[data-sound="${soundId}"]`);
                    if (slider) {
                        slider.value = value;
                        updateSliderValue(slider);
                    }
                });
            }
        }
    } else if (activeTab === 'local-files') {
        if (localMusicPlayer) {
            // If local music was playing before pause, resume it
            if (isLocalMusicPlaying) {
                localMusicPlayer.play().catch(error => {
                    console.error('Error resuming local music:', error);
                });
            } else {
                // If no local music was playing, start playing the first file
                playLocalMusic(0);
            }
        }
    } else if (activeTab === 'youtube' && youtubePlayer && isYoutubePlaying) {
        youtubePlayer.playVideo();
    }
    
    // Update UI
    DOM.resumeTaskButton.classList.add('hidden');
    DOM.pauseTaskButton.classList.remove('hidden');
    
    // Adjust timerStart to account for pause duration
    if (state.timerPausedAt && state.timerStart) {
        const pausedDuration = Date.now() - state.timerPausedAt;
        state.timerStart += pausedDuration;
        state.timerPausedAt = null;
    }
    state.isPaused = false;
    startTimerInterval();
}

// Refactor timer start logic into its own function
function startTimerInterval() {
    if (state.timerInterval) clearInterval(state.timerInterval); // Clear existing interval if any

    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (!task) return;
    const totalSeconds = task.duration * 60;

    state.timerInterval = setInterval(() => {
        // Calculate remaining time based on system time
        if (!state.timerStart) return;
        const elapsed = Math.floor((Date.now() - state.timerStart) / 1000);
        state.remainingTime = Math.max(0, totalSeconds - elapsed);
        updateTimerDisplay();
        if (state.remainingTime <= 0) {
            clearInterval(state.timerInterval);
            completeTask();
        }
    }, 1000);
}

// Finish the current task
function finishTask() {
    if (!state.activeTaskId) return;
    
    // Stop timer and audio
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    
    // Stop audio based on active tab
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    
    if (activeTab === 'sound-mixer') {
        stopAudio();
    } else if (activeTab === 'local-files' && localMusicPlayer && isLocalMusicPlaying) {
        localMusicPlayer.pause();
        localMusicPlayer.currentTime = 0;
    } else if (activeTab === 'youtube' && youtubePlayer && isYoutubePlaying) {
        youtubePlayer.pauseVideo();
        youtubePlayer.seekTo(0);
    }
    
    // Complete the task
    completeTask();
}

// Cancel the active task
function cancelTask() {
    if (!state.activeTaskId) return;
    
    // Stop timer and audio
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    
    // Stop audio based on active tab
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    
    if (activeTab === 'sound-mixer') {
        stopAudio();
    } else if (activeTab === 'local-files' && localMusicPlayer && isLocalMusicPlaying) {
        localMusicPlayer.pause();
        localMusicPlayer.currentTime = 0;
    } else if (activeTab === 'youtube' && youtubePlayer && isYoutubePlaying) {
        youtubePlayer.pauseVideo();
        youtubePlayer.seekTo(0);
    }
    
    // Reset state
    state.isPaused = false;
    
    // Get the current task
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (task) {
        // Add to canceled tasks
        const canceledTask = {
            ...task,
            canceledAt: Date.now()
        };
        state.canceledTasks.unshift(canceledTask);
        
        // Limit canceled tasks history to 100
        if (state.canceledTasks.length > 100) {
            state.canceledTasks = state.canceledTasks.slice(0, 100);
        }
    }
    
    // Get next task if available
    const currentIndex = state.tasks.findIndex(t => t.id === state.activeTaskId);
    const currentActiveId = state.activeTaskId; // Store before removing
    
    // Remove current task from active list
    state.tasks = state.tasks.filter(task => task.id !== currentActiveId);
    
    // Find the *next* task in the original list order, if any
    const nextTask = state.tasks[currentIndex]; // Index remains valid if task before it was removed

    // Clear active task UI *before* potentially setting a new one
    clearActiveTask();
    
    // Set next task as active if available
    if (nextTask) {
        setActiveTask(nextTask.id);
    } else {
        updateTaskList(); // Update list even if no next task
    }
    
    // Save state
    saveToLocalStorage();
}

// Complete the active task
function completeTask() {
    if (!state.activeTaskId) return;
    
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (!task) return;
    
    // Stop timer and audio
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    stopAudio();
    
    // Play completion sound using Web Audio API
    playCompletionSound();
    
    // Add to completed tasks
    const completedTask = {
        ...task,
        completedAt: Date.now()
    };
    state.completedTasks.unshift(completedTask);
    
    // Limit completed tasks history to 100
    if (state.completedTasks.length > 100) {
        state.completedTasks = state.completedTasks.slice(0, 100);
    }
    
    // Update stats
    state.stats.todayFocusTime += task.duration;
    state.stats.tasksCompleted++;
    
    // Track sound usage
    if (task.sound !== 'none') {
        if (!state.stats.soundUsage[task.sound]) {
            state.stats.soundUsage[task.sound] = 0;
        }
        state.stats.soundUsage[task.sound]++;
    }
    
    // Remove from active task list
    state.tasks = state.tasks.filter(t => t.id !== state.activeTaskId);
    const completedTaskId = state.activeTaskId; // Store ID before clearing
    state.activeTaskId = null; // Clear active ID
    state.isPaused = false;
    
    // Show completion modal
    DOM.completedTaskName.textContent = task.name;
    DOM.completionModal.classList.remove('hidden');
    
    // Create confetti effect
    createConfetti();
    
    // Update UI
    updateTaskList();
    updateStats();
    saveToLocalStorage(); // Save state after updates

    // Clear the active task display area after showing modal
    clearActiveTask(); // Resets UI for active task area
    updateTaskList(); // Update the sidebar list
}

// Create confetti effect for celebration
function createConfetti() {
    const container = document.querySelector('.confetti-container');
    container.innerHTML = '';
    
    const colors = ['#4f46e5', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = Math.random() * 10 + 5 + 'px';
        confetti.style.height = Math.random() * 10 + 5 + 'px';
        confetti.style.animationDuration = Math.random() * 2 + 2 + 's';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(confetti);
    }
    
    // Remove confetti after animation
    setTimeout(() => {
        container.innerHTML = '';
    }, 4000);
}

// Start the next task in the queue
function startNextTask() {
    // Stop completion sound if it's playing
    if (state.completionSound) {
        try {
            state.completionSound.stop();
        } catch (error) {
            console.warn('Error stopping completion sound:', error);
        }
        state.completionSound = null;
    }
    
    // Hide completion modal
    DOM.completionModal.classList.add('hidden');
    
    // Start next task in queue
    const nextTask = state.tasks.find(task => !task.completed && !task.canceled);
    if (nextTask) {
        setActiveTask(nextTask.id);
    } else {
        showNoTaskMessage();
    }
}

// Start a break timer
function startBreak() {
    // Stop completion sound if it's playing
    if (state.completionSound) {
        try {
            state.completionSound.stop();
        } catch (error) {
            console.warn('Error stopping completion sound:', error);
        }
        state.completionSound = null;
    }
    
    // Hide completion modal
    DOM.completionModal.classList.add('hidden');
    
    // Clear active task view
    clearActiveTask();
    
    // Show break modal
    DOM.breakModal.classList.remove('hidden');
    
    // Set initial break time (5 minutes)
    let breakTime = 5 * 60;
    updateBreakTimerDisplay(breakTime);
    
    // Start break timer
    state.breakTimerInterval = setInterval(() => {
        breakTime--;
        updateBreakTimerDisplay(breakTime);
        
        if (breakTime <= 0) {
            endBreak();
        }
    }, 1000);
}

// Update break timer display
function updateBreakTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    DOM.breakTimer.textContent = 
        `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// End the break early
function endBreak() {
    // Clear break timer
    if (state.breakTimerInterval) {
        clearInterval(state.breakTimerInterval);
        state.breakTimerInterval = null;
    }
    
    // Hide break modal
    DOM.breakModal.classList.add('hidden');
    
    // If there are tasks, set the first one as active
    if (state.tasks.length > 0) {
        setActiveTask(state.tasks[0].id);
    } else {
        clearActiveTask();
    }
}

// End the current session
function endSession() {
    // Stop completion sound if it's playing
    if (state.completionSound) {
        try {
            state.completionSound.stop();
        } catch (error) {
            console.warn('Error stopping completion sound:', error);
        }
        state.completionSound = null;
    }
    
    // Hide completion modal
    DOM.completionModal.classList.add('hidden');
    
    // Clear active task
    clearActiveTask();
    
    // Reset active task
    state.activeTaskId = null;
    showNoTaskMessage();
    
    // Update stats
    updateStats();
}

// Toggle stats modal
function toggleStatsModal() {
    DOM.statsModal.classList.toggle('hidden');
    
    if (!DOM.statsModal.classList.contains('hidden')) {
        updateStats();
    }
}

// Update stats display
function updateStats() {
    DOM.statsTodayFocusTime.textContent = `${state.stats.todayFocusTime} minutes`;
    DOM.statsTasksCompleted.textContent = `${state.stats.tasksCompleted} ${state.stats.tasksCompleted === 1 ? 'task' : 'tasks'}`;
    
    // Most used sound
    let mostUsedSound = 'None';
    let maxCount = 0;
    
    for (const [sound, count] of Object.entries(state.stats.soundUsage)) {
        if (count > maxCount) {
            maxCount = count;
            mostUsedSound = findAudioName(sound);
        }
    }
    
    DOM.statsMostUsedSound.textContent = mostUsedSound;
    
    // Recent tasks
    const recentTasksList = DOM.statsRecentTasksList;
    recentTasksList.innerHTML = '';
    
    if (state.completedTasks.length === 0) {
        recentTasksList.innerHTML = '<li class="py-3 text-gray-500 italic">No completed tasks yet</li>';
        return;
    }
    
    // Show last 5 completed tasks
    state.completedTasks.slice(0, 5).forEach(task => {
        const li = document.createElement('li');
        li.className = 'py-3';
        
        const date = new Date(task.completedAt);
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        li.innerHTML = `
            <div class="flex justify-between">
                <div>
                    <h4 class="font-medium">${task.name}</h4>
                    <span class="text-sm text-gray-500">${task.duration} minutes</span>
                </div>
                <div class="text-right text-sm text-gray-500">
                    ${formattedDate}<br>${formattedTime}
                </div>
            </div>
        `;
        
        recentTasksList.appendChild(li);
    });
}

// Helper function to format time for display
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Update timer display
function updateTimerDisplay() {
    // Use system time-based remainingTime
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    let totalSeconds = task ? task.duration * 60 : 0;
    if (state.timerStart && !state.isPaused) {
        const elapsed = Math.floor((Date.now() - state.timerStart) / 1000);
        state.remainingTime = Math.max(0, totalSeconds - elapsed);
    }
    const minutes = Math.floor(state.remainingTime / 60);
    const seconds = state.remainingTime % 60;
    DOM.timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    if (task) {
        const percentage = Math.max(0, (state.remainingTime / totalSeconds) * 100);
        DOM.timerBar.style.width = `${percentage}%`;
    }
}

// Audio control functions

// Pause currently playing audio (without resetting sliders)
function pauseAudio() {
    if (state.currentAudio) {
        state.currentAudio.pause();
    }
    Object.values(state.activeSounds).forEach(audio => {
        audio.pause();
    });
}

// Resume paused audio
function resumeAudio() {
    if (state.currentAudio) {
        state.currentAudio.play().catch(e => console.error("Error resuming single audio:", e));
    }
    Object.values(state.activeSounds).forEach(audio => {
        audio.play().catch(e => console.error("Error resuming mixed audio:", e));
    });
}

// Modify the applyPresetMix function to update slider positions
function applyPresetMix(preset) {
    // Reset all checkboxes
    Object.values(soundElements).forEach(sound => {
        sound.checkbox.checked = false;
        stopAudio(sound.checkbox.dataset.sound);
    });

    // Apply preset
    switch (preset) {
        case 'mix_focus':
            ['whitenoise', 'alpha'].forEach(sound => {
                soundElements[sound].checkbox.checked = true;
                playAudio(sound);
            });
            break;
        case 'mix_relaxation':
            ['rain', 'wind', 'birds'].forEach(sound => {
                soundElements[sound].checkbox.checked = true;
                playAudio(sound);
            });
            break;
        case 'mix_sleep':
            ['rain', 'whitenoise', 'alpha'].forEach(sound => {
                soundElements[sound].checkbox.checked = true;
                playAudio(sound);
            });
            break;
        case 'mix_nature':
            ['rain', 'birds', 'water', 'wind'].forEach(sound => {
                soundElements[sound].checkbox.checked = true;
                playAudio(sound);
            });
            break;
        case 'mix_random':
            applyRandomMix();
            break;
    }
}

// Modify the applyRandomMix function to update slider positions
function applyRandomMix() {
    const sounds = Object.keys(soundElements);
    const numSounds = Math.floor(Math.random() * 3) + 1; // 1-3 sounds
    
    // Reset all checkboxes
    Object.values(soundElements).forEach(sound => {
        sound.checkbox.checked = false;
        stopAudio(sound.checkbox.dataset.sound);
    });
    
    // Randomly select sounds
    for (let i = 0; i < numSounds; i++) {
        const randomIndex = Math.floor(Math.random() * sounds.length);
        const sound = sounds[randomIndex];
        soundElements[sound].checkbox.checked = true;
        playAudio(sound);
        sounds.splice(randomIndex, 1);
    }
}

// Add this helper function if it doesn't exist
function updateSliderValue(slider) {
    const valueDisplay = slider.parentElement.querySelector('.channel-value');
    if (valueDisplay) {
        valueDisplay.textContent = `${slider.value}%`;
    }
}

// Adjust volume based on the main volume slider
function adjustVolume() {
    const volume = parseInt(DOM.volumeControl.value) / 100;
    setGlobalVolume(volume);

    // Update mute button state
    updateMuteButtonIcon(volume > 0);
}

// Increase volume via button
function increaseVolume() {
    const currentVolume = parseInt(DOM.volumeControl.value);
    const newVolumeValue = Math.min(currentVolume + 10, 100);
    DOM.volumeControl.value = newVolumeValue;
    // Update volume display
    DOM.volumeValue.textContent = `${newVolumeValue}%`;
    setGlobalVolume(newVolumeValue / 100);
    updateMuteButtonIcon(newVolumeValue > 0);
}

// Decrease volume via button
function decreaseVolume() {
    const currentVolume = parseInt(DOM.volumeControl.value);
    const newVolumeValue = Math.max(currentVolume - 10, 0);
    DOM.volumeControl.value = newVolumeValue;
    // Update volume display
    DOM.volumeValue.textContent = `${newVolumeValue}%`;
    setGlobalVolume(newVolumeValue / 100);
    updateMuteButtonIcon(newVolumeValue > 0);
}

// Toggle mute
function toggleMute() {
    const currentVolume = parseInt(DOM.volumeControl.value);
    let newVolume = 0;

    if (currentVolume === 0) {
        // Unmute: Restore previous volume or set to default (e.g., 50%)
        newVolume = state.previousVolume || 50; // Use stored previous volume or default
    } else {
        // Mute: Store current volume before setting to 0
        state.previousVolume = currentVolume;
        newVolume = 0;
    }

    DOM.volumeControl.value = newVolume;
    // Update volume display
    DOM.volumeValue.textContent = `${newVolume}%`;
    setGlobalVolume(newVolume / 100);
    updateMuteButtonIcon(newVolume > 0);
}

// Helper to update mute button icon
function updateMuteButtonIcon(isAudible) {
    const icon = DOM.muteButton.querySelector('i');
    if (isAudible) {
        icon.classList.remove('fa-volume-mute');
        icon.classList.add('fa-volume-up');
        DOM.muteButton.title = "Mute";
        } else {
        icon.classList.remove('fa-volume-up');
        icon.classList.add('fa-volume-mute');
        DOM.muteButton.title = "Unmute";
    }
}

// LocalStorage functions
function saveToLocalStorage() {
    try {
        // Only save essential data
        const dataToSave = {
            tasks: state.tasks,
            completedTasks: state.completedTasks,
            canceledTasks: state.canceledTasks,
            stats: state.stats
        };
        localStorage.setItem('focusflow_data', JSON.stringify(dataToSave));
    } catch (error) {
        console.warn('Could not save data to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('focusflow_data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            // Only load data if it's valid
            if (parsedData && typeof parsedData === 'object') {
                // Merge saved data with current state
                Object.assign(state, parsedData);
                
                // Ensure required properties exist
                if (!state.tasks) state.tasks = [];
                if (!state.completedTasks) state.completedTasks = [];
                if (!state.canceledTasks) state.canceledTasks = [];
                if (!state.stats) state.stats = {
                    todayFocusTime: 0,
                    tasksCompleted: 0,
                    soundUsage: {}
                };
            }
        }
    } catch (error) {
        console.warn('Could not load data from localStorage:', error);
        // Initialize with default values if loading fails
        state.tasks = [];
        state.completedTasks = [];
        state.canceledTasks = [];
        state.stats = {
            todayFocusTime: 0,
            tasksCompleted: 0,
            soundUsage: {}
        };
    }
}

// Add function to delete a completed task
function deleteCompletedTask(taskId) {
    state.completedTasks = state.completedTasks.filter(task => task.id !== taskId);
    saveToLocalStorage();
    updateTaskList();
}

// Add function to delete a canceled task
function deleteCanceledTask(taskId) {
    state.canceledTasks = state.canceledTasks.filter(task => task.id !== taskId);
    saveToLocalStorage();
    updateTaskList();
}

// Initialize audio context
function initializeAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Load completion sound
function loadCompletionSound() {
    fetch('audio/crowdcheers.mp3')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            completionSoundBuffer = audioBuffer;
        })
        .catch(error => {
            console.error('Error loading completion sound:', error);
        });
}

// Play completion sound
function playCompletionSound() {
    if (!completionSoundBuffer) {
        console.warn('Completion sound buffer not loaded');
        return;
    }
    
    // Initialize audio context if needed
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            playCompletionSoundInternal();
        }).catch(error => {
            console.error('Error resuming audio context:', error);
        });
    } else {
        playCompletionSoundInternal();
    }
}

// Internal function to play the completion sound
function playCompletionSoundInternal() {
    const source = audioContext.createBufferSource();
    source.buffer = completionSoundBuffer;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3; // Set volume to 30%
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Store the source in state for potential cleanup
    state.completionSound = source;
    
    // Add error handling
    source.onerror = (error) => {
        console.error('Error playing completion sound:', error);
    };
    
    // Start the sound
    try {
        source.start(0);
    } catch (error) {
        console.error('Error starting completion sound:', error);
    }
}

// Add this function to handle tab switching
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newTabId = button.dataset.tab;
            const currentTabId = document.querySelector('.tab-button.active')?.dataset.tab;

            // If switching to a different tab, handle audio transitions
            if (newTabId !== currentTabId) {
                // Pause the task if it's running
                if (state.activeTaskId && state.timerInterval && !state.isPaused) {
                    pauseTask();
                }

                // Store current state before switching
                if (currentTabId === 'sound-mixer') {
                    soundMixerState.isPlaying = state.currentAudio !== null;
                    soundMixerState.currentSound = state.currentAudio;
                    soundMixerState.volume = state.currentAudio ? state.currentAudio.volume : 0.5;
                    
                    // Store current slider values
                    soundMixerState.sliderValues = {};
                    document.querySelectorAll('.channel-slider').forEach(slider => {
                        const soundId = slider.dataset.sound;
                        soundMixerState.sliderValues[soundId] = parseInt(slider.value);
                    });
                    
                    // Pause audio without resetting sliders
                    if (state.currentAudio) {
                        state.currentAudio.pause();
                        state.currentAudio.currentTime = 0;
                        state.currentAudio = null;
                    }
                    Object.values(state.activeSounds).forEach(audio => {
                        audio.pause();
                        audio.currentTime = 0;
                    });
                    state.activeSounds = {};
                } else if (currentTabId === 'local-files') {
                    localFilesState.isPlaying = isLocalMusicPlaying;
                    localFilesState.currentFile = localMusicPlayer;
                    localFilesState.volume = localMusicPlayer ? localMusicPlayer.volume : 0.5;
                    if (localMusicPlayer) {
                        localMusicPlayer.pause();
                        localMusicPlayer.currentTime = 0;
                        isLocalMusicPlaying = false;
                    }
                } else if (currentTabId === 'youtube') {
                    youtubeState.isPlaying = isYoutubePlaying;
                    youtubeState.currentUrl = youtubePlayer ? youtubePlayer.getVideoUrl() : null;
                    if (youtubePlayer) {
                        youtubePlayer.pauseVideo();
                        youtubePlayer.seekTo(0);
                        isYoutubePlaying = false;
                    }
                }

                // Unload YouTube iframe when switching to other tabs
                if (newTabId !== 'youtube' && youtubePlayer) {
                    const youtubeIframe = document.getElementById('youtube-iframe');
                    if (youtubeIframe) {
                        youtubeIframe.src = '';
                    }
                }
            }

            // First hide all tab panes
            tabPanes.forEach(pane => pane.classList.add('hidden'));
            
            // Set all buttons to inactive state
            tabButtons.forEach(btn => {
                // Remove active class
                btn.classList.remove('active');
                
                // Remove active styling
                btn.classList.remove('bg-[rgb(2,4,3)]', 'text-white');
                
                // Remove the indicator line by removing the after classes completely
                btn.style.setProperty('--after-opacity', '0');
                
                // Set inactive text color
                btn.classList.add('text-gray-600', 'dark:text-gray-300');
            });

            // Set active styles for the clicked button
            button.classList.add('active', 'bg-[rgb(2,4,3)]', 'text-white');
            button.classList.remove('text-gray-600', 'dark:text-gray-300');
            
            // Show the indicator line
            button.style.setProperty('--after-opacity', '1');
            
            // Show the corresponding tab content
            document.getElementById(`${newTabId}-tab`).classList.remove('hidden');

            // If a task is running, restore audio state for the new tab
            if (state.activeTaskId && state.timerInterval && !state.isPaused) {
                const task = state.tasks.find(t => t.id === state.activeTaskId);
                if (task) {
                    if (newTabId === 'sound-mixer') {
                        // Always restore the task's sound when returning to sound mixer
                        if (task.sound !== 'none') {
                            // Reset all sliders first
                            document.querySelectorAll('.channel-slider').forEach(slider => {
                                slider.value = 0;
                                updateSliderValue(slider);
                            });
                            
                            // Play the task's sound
                            playAudio(task.sound);
                            
                            // If we have stored slider values, restore them
                            if (soundMixerState.sliderValues) {
                                Object.entries(soundMixerState.sliderValues).forEach(([soundId, value]) => {
                                    const slider = document.querySelector(`.channel-slider[data-sound="${soundId}"]`);
                                    if (slider) {
                                        slider.value = value;
                                        updateSliderValue(slider);
                                    }
                                });
                            }
                        }
                    } else if (newTabId === 'local-files' && localMusicPlayer) {
                        if (localFilesState.isPlaying) {
                            playLocalMusic(0);
                            if (localMusicPlayer) {
                                localMusicPlayer.volume = localFilesState.volume;
                            }
                        }
                    } else if (newTabId === 'youtube' && youtubePlayer) {
                        if (youtubeState.isPlaying) {
                            youtubePlayer.playVideo();
                        }
                    }
                }
            }
        });
    });
}

// Add this function to handle YouTube player
function setupYouTubePlayer() {
    const youtubeUrlInput = document.getElementById('youtube-url');
    const loadYoutubeButton = document.getElementById('load-youtube');
    const youtubePlayerContainer = document.getElementById('youtube-player');
    const youtubeIframe = document.getElementById('youtube-iframe');

    loadYoutubeButton.addEventListener('click', () => {
        const url = youtubeUrlInput.value.trim();
        if (!url) return;

        // Extract video ID from URL
        const videoId = extractYouTubeId(url);
        if (!videoId) {
            alert('Please enter a valid YouTube URL');
            return;
        }

        // Update iframe source
        youtubeIframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
        youtubePlayerContainer.classList.remove('hidden');

        // Initialize YouTube player
        if (typeof YT !== 'undefined') {
            youtubePlayer = new YT.Player('youtube-iframe', {
                events: {
                    'onReady': onYouTubePlayerReady,
                    'onStateChange': onYouTubePlayerStateChange
                }
            });
        }
    });
}

// Helper function to extract YouTube video ID
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// YouTube API callbacks
function onYouTubePlayerReady(event) {
    // Player is ready
}

function onYouTubePlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isYoutubePlaying = true;
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        isYoutubePlaying = false;
    }
}

// Initialize sound mixer
function initializeSoundMixer() {
    const soundItems = document.querySelectorAll('.sound-item');
    const masterVolumeSlider = document.getElementById('master-volume-slider');
    const volumeValue = document.getElementById('volume-value');
    const selectedSoundName = document.getElementById('selected-sound-name');

    // Initialize sound elements
    soundItems.forEach(item => {
        const checkbox = item.querySelector('.sound-checkbox');
        const soundName = checkbox.dataset.sound;
        soundElements[soundName] = {
            element: item,
            checkbox: checkbox,
            audio: null
        };

        // Click handler for sound item
        item.addEventListener('click', (e) => {
            if (e.target === checkbox) return; // Let checkbox handle its own click
            
            // Toggle selection
            if (selectedSound === soundName) {
                selectedSound = null;
                item.classList.remove('selected');
                selectedSoundName.textContent = 'Select a sound to adjust volume';
                masterVolumeSlider.value = 50;
                volumeValue.textContent = '50%';
            } else {
                // Remove selection from previous sound
                if (selectedSound) {
                    soundElements[selectedSound].element.classList.remove('selected');
                }
                
                // Select new sound
                selectedSound = soundName;
                item.classList.add('selected');
                selectedSoundName.textContent = soundName.charAt(0).toUpperCase() + soundName.slice(1);
                masterVolumeSlider.value = soundVolumes[soundName];
                volumeValue.textContent = `${soundVolumes[soundName]}%`;
            }
        });

        // Checkbox change handler
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                playAudio(soundName);
            } else {
                stopAudio(soundName);
            }
        });
    });

    // Master volume slider handler
    masterVolumeSlider.addEventListener('input', () => {
        const volume = parseInt(masterVolumeSlider.value);
        volumeValue.textContent = `${volume}%`;
        
        if (selectedSound) {
            soundVolumes[selectedSound] = volume;
            if (soundElements[selectedSound].audio) {
                soundElements[selectedSound].audio.volume = volume / 100;
            }
        }
    });
}

function continueTaskWithExtraTime(minutes) {
    // Find the just-completed task (top of completedTasks)
    const lastCompleted = state.completedTasks[0];
    if (!lastCompleted) return;
    // Remove from completedTasks
    state.completedTasks.shift();
    // Add back to tasks and set as active
    const newTask = { ...lastCompleted };
    // Remove completedAt property
    delete newTask.completedAt;
    // Set duration to ONLY the selected minutes (replace previous duration)
    newTask.duration = minutes;
    // Set as active
    state.tasks.unshift(newTask);
    state.activeTaskId = newTask.id;
    state.isPaused = false;
    state.remainingTime = minutes * 60;
    state.timerStart = Date.now();
    state.timerPausedAt = null;
    // Hide completion modal, show active task UI
    DOM.completionModal.classList.add('hidden');
    setActiveTask(newTask.id);
    startTask();
    updateTaskList();
    saveToLocalStorage();
}

let editTaskId = null; // Track which task is being edited

function openEditTaskModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    editTaskId = taskId;
    DOM.taskForm.reset();
    DOM.createTaskFormContainer.classList.remove('hidden');
    DOM.taskNameInput.value = task.name;
    DOM.taskTimeInput.value = task.duration;
    DOM.taskSoundInput.value = task.sound;
    // Change modal title/button
    const modalTitle = DOM.createTaskFormContainer.querySelector('h2');
    if (modalTitle) modalTitle.textContent = 'Edit Task';
    const submitBtn = DOM.taskForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    DOM.taskNameInput.focus();
}
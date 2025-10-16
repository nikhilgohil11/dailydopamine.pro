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
    completionSound: null,
    // New auth and sync properties
    currentUser: null,
    isGuest: true,
    pendingSyncOperations: [],
    lastSyncTime: null,
    isOnline: navigator.onLine
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
const sounds = {};

// Function to create and initialize audio elements
function initializeSoundElements() {
    AUDIO_FILES.forEach(file => {
        sounds[file.id] = new Audio();
        sounds[file.id].src = file.path;
        sounds[file.id].loop = true;
        sounds[file.id].preload = 'none'; // Don't preload on mobile
    });
}

// Sound state management
let activeSounds = new Set();
let currentVolume = 50;

// Initialize sounds after DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeSoundElements();
    
    // Handle sound checkbox changes
    document.querySelectorAll('.sound-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const soundName = e.target.dataset.sound;
            const sound = sounds[soundName];
            
            if (!sound) {
                console.error('Sound not found:', soundName);
                e.target.checked = false;
                return;
            }
            
            if (e.target.checked) {
                try {
                    sound.volume = currentVolume / 100;
                    // Load the audio first, then play
                    await sound.load();
                    await sound.play().catch(error => {
                        console.error('Error playing sound:', error);
                        // Reset checkbox if audio fails to play
                        e.target.checked = false;
                        activeSounds.delete(soundName);
                        
                        if (error.name === 'NotSupportedError' || error.name === 'NotAllowedError') {
                            sound.pause();
                            sound.currentTime = 0;
                            const message = error.name === 'NotAllowedError' 
                                ? 'Please interact with the page first to enable sound.'
                                : 'Sound playback is not supported on this device.';
                            console.log(message);
                        }
                    });
                    activeSounds.add(soundName);
                } catch (error) {
                    console.error('Error in sound playback:', error);
                    e.target.checked = false;
                    activeSounds.delete(soundName);
                }
            } else {
                // ***FIXED***: Only stop the unchecked sound. Leave others playing.
                sound.pause();
                sound.currentTime = 0;
                activeSounds.delete(soundName);
            }
            
            updateVolumeDisplay();
        });
    });
});

// Handle master volume slider
const masterVolumeSlider = document.getElementById('master-volume-slider');
const volumeValue = document.getElementById('volume-value');
const selectedSoundName = document.getElementById('selected-sound-name');

if (masterVolumeSlider) {
    masterVolumeSlider.addEventListener('input', (e) => {
        currentVolume = parseInt(e.target.value);
        if(volumeValue) volumeValue.textContent = `${currentVolume}%`;
        
        // Update volume for all active sounds
        activeSounds.forEach(soundName => {
            if (sounds[soundName]) {
                 sounds[soundName].volume = currentVolume / 100;
            }
        });
    });
}


// Handle preset mix buttons
document.querySelectorAll('.preset-mix-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const presetName = e.target.dataset.preset;
        const preset = presetMixes[presetName];
        
        // Uncheck all sounds first and stop them
        document.querySelectorAll('.sound-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            const soundName = checkbox.dataset.sound;
            if (sounds[soundName]) {
                 sounds[soundName].pause();
                 sounds[soundName].currentTime = 0;
            }
        });
        
        // Clear active sounds set
        activeSounds.clear();
        
        // Apply preset
        if (preset) {
            preset.sounds.forEach((soundName, index) => {
                const checkbox = document.querySelector(`[data-sound="${soundName}"]`);
                if (checkbox && sounds[soundName]) {
                    checkbox.checked = true;
                    sounds[soundName].volume = preset.volumes[index] / 100;
                    sounds[soundName].play();
                    activeSounds.add(soundName);
                }
            });
        }
        
        // Update volume slider
        currentVolume = 50;
        if(masterVolumeSlider) masterVolumeSlider.value = currentVolume;
        if(volumeValue) volumeValue.textContent = `${currentVolume}%`;
        updateVolumeDisplay();
    });
});

function updateVolumeDisplay() {
    if (!selectedSoundName) return;
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
    add25MinButton: document.getElementById('add-25min'),
    
    // Clear all tasks elements
    clearAllTasksButton: document.getElementById('clear-all-tasks-button'),
    clearAllTasksModal: document.getElementById('clear-all-tasks-modal'),
    confirmClearAllTasks: document.getElementById('confirm-clear-all-tasks'),
    cancelClearAllTasks: document.getElementById('cancel-clear-all-tasks'),
    
    // Auth elements
    authModal: document.getElementById('auth-modal'),
    authForm: document.getElementById('auth-form'),
    authTitle: document.getElementById('auth-title'),
    authEmail: document.getElementById('auth-email'),
    authPassword: document.getElementById('auth-password'),
    authConfirmPassword: document.getElementById('auth-confirm-password'),
    authConfirmPasswordContainer: document.getElementById('auth-confirm-password-container'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authToggleMode: document.getElementById('auth-toggle-mode'),
    authForgotPassword: document.getElementById('auth-forgot-password'),
    forgotPasswordBtn: document.getElementById('forgot-password-btn'),
    continueAsGuest: document.getElementById('continue-as-guest'),
    closeAuthModal: document.getElementById('close-auth-modal'),
    authError: document.getElementById('auth-error'),
    authErrorText: document.getElementById('auth-error-text'),
    authSuccess: document.getElementById('auth-success'),
    authSuccessText: document.getElementById('auth-success-text'),
    
    // User menu elements
    userMenuButton: document.getElementById('user-menu-button'),
    userMenu: document.getElementById('user-menu'),
    userEmail: document.getElementById('user-email'),
    userStatus: document.getElementById('user-status'),
    syncNowBtn: document.getElementById('sync-now-btn'),
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Guest banner and sync status
    guestBanner: document.getElementById('guest-banner'),
    loginFromBanner: document.getElementById('login-from-banner'),
    dismissGuestBanner: document.getElementById('dismiss-guest-banner'),
    syncStatus: document.getElementById('sync-status'),
    syncStatusText: document.getElementById('sync-status-text'),
    syncSpinner: document.getElementById('sync-spinner')
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // Ensure all required DOM elements exist
    if (!DOM.loadingScreen || !DOM.loadingBar || !DOM.loadingText || !DOM.appContainer) {
        console.error('Required DOM elements not found');
        document.getElementById('app-container')?.classList.remove('hidden');
        return;
    }
    
    if (DOM.noTaskMessage && DOM.activeTaskDiv) {
        DOM.noTaskMessage.style.display = 'block';
        DOM.activeTaskDiv.style.display = 'none';
    }
    
    initializeApp();
    preloadAudioFiles();
    initializeAudioContext();
    loadCompletionSound();
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            initializeAudioContext();
        }
    });
});

function preloadAudioFiles() {
    console.log('Starting audio preload...');
    let filesLoaded = 0;
    let filesFailed = 0;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    const safetyTimeout = setTimeout(() => {
        console.log('Safety timeout reached, showing app');
        DOM.loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            DOM.loadingScreen.style.display = 'none';
            DOM.appContainer.classList.remove('hidden');
        }, 500);
    }, 10000); 

    const filesToLoad = AUDIO_FILES;
    
    if (filesToLoad.length === 0) {
        clearTimeout(safetyTimeout);
        DOM.loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            DOM.loadingScreen.style.display = 'none';
            DOM.appContainer.classList.remove('hidden');
        }, 500);
        return;
    }
    
    filesToLoad.forEach(file => {
        const audio = new Audio();
        audio.src = file.path;
        audio.preload = 'auto';
        audio.loop = true;
        
        state.audioElements[file.id] = audio;
        
        audio.addEventListener('canplaythrough', () => {
            filesLoaded++;
            const progress = ((filesLoaded + filesFailed) / filesToLoad.length) * 100;
            DOM.loadingBar.style.width = `${progress}%`;
            DOM.loadingText.textContent = `${filesLoaded}/${filesToLoad.length} files loaded`;
            
            if ((filesLoaded + filesFailed) === filesToLoad.length) {
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
        
        audio.addEventListener('error', (e) => {
            console.error(`Error loading audio file: ${file.path}`, e);
            filesFailed++;
            const progress = ((filesLoaded + filesFailed) / filesToLoad.length) * 100;
            DOM.loadingBar.style.width = `${progress}%`;
            DOM.loadingText.textContent = `${filesLoaded}/${filesToLoad.length} files loaded (${filesFailed} failed)`;
            
            delete state.audioElements[file.id];
            
            if ((filesLoaded + filesFailed) === filesToLoad.length) {
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

async function initializeApp() {
    console.log('Initializing app...');
    
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
    } catch (error) {
        console.warn('localStorage is not available:', error);
    }
    
    // Initialize authentication and sync
    await initializeAuthAndSync();
    
    setupEventListeners();
    updateTaskList();
    updateStats();
    
    if (state.activeTaskId && state.tasks.find(t => t.id === state.activeTaskId)) {
        setActiveTask(state.activeTaskId);
    } else {
        clearActiveTask();
    }
    
    try {
        initializeSoundMixer();
    } catch (error) {
        console.error('Error initializing sound mixer:', error);
    }

    setupLocalMusicHandlers();
    setupTabs();
    setupYouTubePlayer();
    setupAuthEventListeners();
    updateUserInterface();
}

// Initialize authentication and sync
async function initializeAuthAndSync() {
    try {
        // Initialize auth manager
        await window.authManager.init();
        
        // Initialize sync manager
        await window.syncManager.init();
        
        // Check if user is logged in
        const user = window.authManager.getCurrentUser();
        if (user) {
            state.currentUser = user;
            state.isGuest = false;
            console.log('User logged in:', user.email);
            
            // Sync data from Supabase
            const syncResult = await window.syncManager.syncFromSupabase();
            if (!syncResult.success) {
                console.warn('Failed to sync from Supabase:', syncResult.message);
                // Fallback to localStorage
                loadFromLocalStorage();
            }
        } else {
            // User is not logged in, load from localStorage
            state.currentUser = null;
            state.isGuest = true;
            loadFromLocalStorage();
        }
        
        // Set up auth state listeners
        window.authManager.addAuthListener(handleAuthStateChange);
        
        // Set up sync listeners
        window.syncManager.addSyncListener(handleSyncStateChange);
        
    } catch (error) {
        console.error('Error initializing auth and sync:', error);
        // Fallback to localStorage
        loadFromLocalStorage();
    }
}

// Handle authentication state changes
function handleAuthStateChange(event, user) {
    console.log('Auth state changed:', event, user?.email);
    
    if (event === 'login' && user) {
        state.currentUser = user;
        state.isGuest = false;
        
        // Check if there's local data to migrate
        const localData = getLocalStorageData();
        if (localData && (localData.tasks?.length > 0 || localData.completedTasks?.length > 0)) {
            showMigrationPrompt();
        } else {
            // No local data, sync from cloud
            window.syncManager.syncFromSupabase();
        }
    } else if (event === 'logout') {
        state.currentUser = null;
        state.isGuest = true;
        
        // Save current data to localStorage before switching to guest mode
        saveToLocalStorage();
    }
    
    updateUserInterface();
}

// Handle sync state changes
function handleSyncStateChange(event, data) {
    console.log('Sync state changed:', event, data);
    
    switch (event) {
        case 'sync_start':
            showSyncStatus('Syncing...', true);
            break;
        case 'sync_complete':
            showSyncStatus('Synced', false);
            setTimeout(() => hideSyncStatus(), 2000);
            break;
        case 'sync_error':
            showSyncStatus('Sync failed', false);
            setTimeout(() => hideSyncStatus(), 3000);
            break;
    }
}

// Get local storage data
function getLocalStorageData() {
    try {
        const savedData = localStorage.getItem('focusflow_data');
        return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
        console.error('Error loading local data:', error);
        return null;
    }
}

// Show migration prompt
function showMigrationPrompt() {
    const localData = getLocalStorageData();
    if (!localData) return;
    
    const taskCount = (localData.tasks?.length || 0) + 
                     (localData.completedTasks?.length || 0) + 
                     (localData.canceledTasks?.length || 0);
    
    if (taskCount === 0) return;
    
    // Create migration modal
    const migrationModal = document.createElement('div');
    migrationModal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
    migrationModal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full">
            <div class="text-center mb-6">
                <i class="fas fa-cloud-upload-alt text-4xl text-[rgb(2,4,3)] mb-4"></i>
                <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Upload Your Tasks?</h3>
                <p class="text-gray-600 dark:text-gray-400">You have ${taskCount} tasks stored locally. Would you like to upload them to the cloud so you can access them on any device?</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
                <button id="migrate-yes" class="flex-1 bg-[rgb(2,4,3)] text-white py-2.5 px-4 rounded-lg hover:bg-[rgb(2,4,3)]/80 transition font-semibold">
                    <i class="fas fa-upload mr-2"></i>Upload to Cloud
                </button>
                <button id="migrate-no" class="flex-1 border border-gray-300 dark:border-gray-600 py-2.5 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300 font-semibold">
                    Keep Local Only
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(migrationModal);
    
    // Handle migration choice
    document.getElementById('migrate-yes').addEventListener('click', async () => {
        const result = await window.syncManager.migrateLocalDataToSupabase();
        if (result.success) {
            showNotification('Tasks uploaded successfully!', 'success');
            // Sync from cloud to get the latest data
            await window.syncManager.syncFromSupabase();
        } else {
            showNotification('Failed to upload tasks: ' + result.message, 'error');
        }
        document.body.removeChild(migrationModal);
    });
    
    document.getElementById('migrate-no').addEventListener('click', () => {
        document.body.removeChild(migrationModal);
        // Just sync from cloud without migrating
        window.syncManager.syncFromSupabase();
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Show sync status
function showSyncStatus(message, showSpinner = false) {
    if (DOM.syncStatusText) DOM.syncStatusText.textContent = message;
    if (DOM.syncSpinner) {
        DOM.syncSpinner.classList.toggle('hidden', !showSpinner);
    }
    if (DOM.syncStatus) DOM.syncStatus.classList.remove('hidden');
}

// Hide sync status
function hideSyncStatus() {
    if (DOM.syncStatus) DOM.syncStatus.classList.add('hidden');
}

// Update user interface based on auth state
function updateUserInterface() {
    const isLoggedIn = !state.isGuest && state.currentUser;
    
    // Update user menu
    if (isLoggedIn) {
        if (DOM.userEmail) DOM.userEmail.textContent = state.currentUser.email;
        if (DOM.userStatus) DOM.userStatus.textContent = 'Synced';
        if (DOM.loginBtn) DOM.loginBtn.classList.add('hidden');
        if (DOM.logoutBtn) DOM.logoutBtn.classList.remove('hidden');
        if (DOM.syncNowBtn) DOM.syncNowBtn.classList.remove('hidden');
    } else {
        if (DOM.userEmail) DOM.userEmail.textContent = 'Guest Mode';
        if (DOM.userStatus) DOM.userStatus.textContent = 'Local only';
        if (DOM.loginBtn) DOM.loginBtn.classList.remove('hidden');
        if (DOM.logoutBtn) DOM.logoutBtn.classList.add('hidden');
        if (DOM.syncNowBtn) DOM.syncNowBtn.classList.add('hidden');
    }
    
    // Show/hide guest banner
    if (DOM.guestBanner) {
        DOM.guestBanner.classList.toggle('hidden', isLoggedIn);
    }
}

function setupLocalMusicHandlers() {
    const dropZone = document.getElementById('local-music-drop-zone');
    const fileInput = document.getElementById('local-music-input');
    if (!dropZone || !fileInput) return;

    fileInput.addEventListener('change', (e) => handleLocalMusicFiles(e.target.files));
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-[rgb(2,4,3)]', 'dark:border-[rgb(2,4,3)]');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-[rgb(2,4,3)]', 'dark:border-[rgb(2,4,3)]'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-[rgb(2,4,3)]', 'dark:border-[rgb(2,4,3)]');
        handleLocalMusicFiles(e.dataTransfer.files);
    });
    dropZone.addEventListener('click', () => fileInput.click());
}

function handleLocalMusicFiles(files) {
    localMusicFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
    
    if (localMusicFiles.length > 0) {
        stopAudio();
        
        const localMusicControl = document.getElementById('local-music-info');
        localMusicControl.classList.remove('hidden');
        
        const slider = localMusicControl.querySelector('.channel-slider');
        if (slider) {
            slider.value = parseInt(DOM.volumeControl.value);
            updateSliderValue(slider);
            slider.addEventListener('input', function() {
                const volume = parseInt(this.value) / 100;
                if (localMusicPlayer) {
                    localMusicPlayer.volume = volume;
                    updateSliderValue(this);
                }
            });
        }
        
        const file = localMusicFiles[0];
        const url = URL.createObjectURL(file);
        
        localMusicPlayer = new Audio(url);
        localMusicPlayer.volume = parseInt(DOM.volumeControl.value) / 100;
        isLocalMusicPlaying = false;
        
        localMusicPlayer.addEventListener('ended', () => playNextLocalMusic(0));
        
        const fileNameDisplay = document.getElementById('current-file-name');
        if (fileNameDisplay) fileNameDisplay.textContent = file.name;
    }
}

function playLocalMusic(index) {
    if (index >= localMusicFiles.length) index = 0;

    const file = localMusicFiles[index];
    const url = URL.createObjectURL(file);
    
    if (localMusicPlayer) {
        localMusicPlayer.pause();
        URL.revokeObjectURL(localMusicPlayer.src);
    }

    localMusicPlayer = new Audio(url);
    localMusicPlayer.volume = parseInt(DOM.volumeControl.value) / 100;
    isLocalMusicPlaying = true;
    localMusicPlayer.play().catch(error => console.error('Error playing local music:', error));
    localMusicPlayer.addEventListener('ended', () => playNextLocalMusic(index));
}

function playNextLocalMusic(currentIndex) {
    const nextIndex = (currentIndex + 1) % localMusicFiles.length;
    playLocalMusic(nextIndex);
}

function stopLocalMusic() {
    if (localMusicPlayer) {
        localMusicPlayer.pause();
        localMusicPlayer.currentTime = 0;
        URL.revokeObjectURL(localMusicPlayer.src);
        localMusicPlayer = null;
    }
    isLocalMusicPlaying = false;
}

function playPresetMix(mixId) {
    stopAudio(); // Stop any currently playing sounds
    
    const preset = presetMixes[mixId];
    if (!preset) {
        console.error('Preset mix not found: ' + mixId);
        return;
    }
    
    console.log('Playing preset mix: ' + mixId);
    
    preset.sounds.forEach((soundId, index) => {
        const checkbox = document.querySelector(`.sound-checkbox[data-sound="${soundId}"]`);
        if (checkbox && sounds[soundId]) {
            const volume = preset.volumes[index] / 100 || 0.5;
            sounds[soundId].volume = volume * (parseInt(DOM.volumeControl.value) / 100);
            sounds[soundId].play().catch(e => console.error(`Error playing ${soundId}:`, e));
            activeSounds.add(soundId);
            checkbox.checked = true;
        }
    });

    // Update active class on preset button
    const presetButton = document.querySelector(`.preset-mix-btn[data-preset="${mixId}"]`);
    if (presetButton) {
        document.querySelectorAll('.preset-mix-btn').forEach(btn => btn.classList.remove('active'));
        presetButton.classList.add('active');
    }
}

function playAudio(audioId) {
    if (isLocalMusicPlaying) return;
    
    // Check if it's a preset mix
    if (audioId.startsWith('mix_')) {
        playPresetMix(audioId);
        return;
    }

    // This function is now just for single sounds or presets
    stopAudio(); // Stop everything else

    const audio = sounds[audioId];
    if (!audio) {
        console.error(`Audio file not found: ${audioId}`);
        return;
    }

    const volume = parseInt(DOM.volumeControl.value) / 100;
    audio.volume = volume;
    audio.play().catch(e => console.error('Error playing audio:', e));
    activeSounds.add(audioId); // Use the Set
    
    const checkbox = document.querySelector(`.sound-checkbox[data-sound="${audioId}"]`);
    if(checkbox) checkbox.checked = true;
}

function stopAudio() {
    // Stop all sounds from the mixer
    activeSounds.forEach(soundName => {
        if(sounds[soundName]) {
            sounds[soundName].pause();
            sounds[soundName].currentTime = 0;
        }
    });
    activeSounds.clear();

    // Reset checkboxes (optional, but good for consistency)
    document.querySelectorAll('.sound-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Stop local music if it's playing
    if (isLocalMusicPlaying) {
        stopLocalMusic();
    }

    // Stop YouTube if it's playing
    if (youtubePlayer && isYoutubePlaying) {
        youtubePlayer.pauseVideo();
        youtubePlayer.seekTo(0);
        isYoutubePlaying = false;
    }
}


function setGlobalVolume(volume) {
    if (localMusicPlayer) {
        localMusicPlayer.volume = volume;
        const localMusicSlider = document.querySelector('.channel-slider[data-sound="local-music"]');
        if (localMusicSlider) {
            localMusicSlider.value = volume * 100;
            updateSliderValue(localMusicSlider);
        }
    }
    
    // Set volume for all active mixer sounds
    activeSounds.forEach(soundName => {
        if (sounds[soundName]) {
            sounds[soundName].volume = volume;
        }
    });
}

function setupEventListeners() {
    DOM.taskForm.addEventListener('submit', handleTaskFormSubmit);
    DOM.startTaskButton.addEventListener('click', startTask);
    DOM.pauseTaskButton.addEventListener('click', pauseTask);
    DOM.resumeTaskButton.addEventListener('click', resumeTask);
    DOM.finishTaskButton.addEventListener('click', finishTask);
    DOM.cancelTaskButton.addEventListener('click', cancelTask);
    DOM.nextTaskButton.addEventListener('click', startNextTask);
    DOM.takeBreakButton.addEventListener('click', startBreak);
    DOM.endSessionButton.addEventListener('click', endSession);
    if (DOM.add5MinButton) DOM.add5MinButton.addEventListener('click', () => continueTaskWithExtraTime(5));
    if (DOM.add10MinButton) DOM.add10MinButton.addEventListener('click', () => continueTaskWithExtraTime(10));
    if (DOM.add15MinButton) DOM.add15MinButton.addEventListener('click', () => continueTaskWithExtraTime(15));
    if (DOM.add25MinButton) DOM.add25MinButton.addEventListener('click', () => continueTaskWithExtraTime(25));
    DOM.endBreakButton.addEventListener('click', endBreak);
    DOM.statsButton.addEventListener('click', toggleStatsModal);
    DOM.statsButtonMobile.addEventListener('click', toggleStatsModal);
    DOM.closeStatsButton.addEventListener('click', toggleStatsModal);
    DOM.volumeControl.addEventListener('input', adjustVolume);
    DOM.volumeUpButton.addEventListener('click', increaseVolume);
    DOM.volumeDownButton.addEventListener('click', decreaseVolume);
    DOM.muteButton.addEventListener('click', toggleMute);
    DOM.taskSearchInput.addEventListener('input', handleSearchInput);
    DOM.taskSearchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = this.value.trim();
            if (!searchTerm) return;
            const visibleTasks = Array.from(DOM.taskList.querySelectorAll('li[data-id]')).filter(item => item.style.display !== 'none').length;
            if (visibleTasks === 0) {
                const storedSearchTerm = searchTerm;
                this.value = '';
                filterTaskList('');
                openCreateTaskModal();
                setTimeout(() => {
                    DOM.taskNameInput.value = storedSearchTerm;
                }, 0);
            }
        }
    });

    DOM.menuToggle.addEventListener('click', toggleSidebar);
    DOM.sidebarOverlay.addEventListener('click', toggleSidebar);
    DOM.addTaskButton.addEventListener('click', openCreateTaskModal);
    DOM.closeCreateTaskFormButton.addEventListener('click', closeCreateTaskModal);
    DOM.taskList.addEventListener('click', handleTaskListClick);
    document.getElementById('add-first-task')?.addEventListener('click', () => openCreateTaskModal());
    document.getElementById('add-task-header')?.addEventListener('click', openCreateTaskModal);
    document.getElementById('add-task-header-mobile')?.addEventListener('click', openCreateTaskModal);
    
    // Clear all tasks event listeners
    DOM.clearAllTasksButton?.addEventListener('click', openClearAllTasksModal);
    DOM.confirmClearAllTasks?.addEventListener('click', clearAllTasks);
    DOM.cancelClearAllTasks?.addEventListener('click', closeClearAllTasksModal);
}

// Setup authentication event listeners
function setupAuthEventListeners() {
    // Auth modal controls
    DOM.userMenuButton?.addEventListener('click', toggleUserMenu);
    DOM.closeAuthModal?.addEventListener('click', closeAuthModal);
    DOM.continueAsGuest?.addEventListener('click', closeAuthModal);
    DOM.loginFromBanner?.addEventListener('click', openAuthModal);
    DOM.dismissGuestBanner?.addEventListener('click', () => {
        if (DOM.guestBanner) DOM.guestBanner.classList.add('hidden');
    });
    
    // Auth form
    DOM.authForm?.addEventListener('submit', handleAuthFormSubmit);
    DOM.authToggleMode?.addEventListener('click', toggleAuthMode);
    DOM.forgotPasswordBtn?.addEventListener('click', handleForgotPassword);
    
    // User menu
    DOM.loginBtn?.addEventListener('click', openAuthModal);
    DOM.logoutBtn?.addEventListener('click', handleLogout);
    DOM.syncNowBtn?.addEventListener('click', handleSyncNow);
    
    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
        if (DOM.userMenu && !DOM.userMenu.contains(e.target) && !DOM.userMenuButton?.contains(e.target)) {
            DOM.userMenu.classList.add('hidden');
        }
    });
}

// Toggle user menu
function toggleUserMenu() {
    if (DOM.userMenu) {
        DOM.userMenu.classList.toggle('hidden');
    }
}

// Open auth modal
function openAuthModal() {
    if (DOM.authModal) {
        DOM.authModal.classList.remove('hidden');
        DOM.authEmail?.focus();
    }
}

// Close auth modal
function closeAuthModal() {
    if (DOM.authModal) {
        DOM.authModal.classList.add('hidden');
        DOM.authForm?.reset();
        hideAuthMessages();
    }
}

// Toggle between login and signup
function toggleAuthMode() {
    const isLogin = DOM.authTitle?.textContent === 'Sign In';
    
    if (isLogin) {
        // Switch to signup
        DOM.authTitle.textContent = 'Sign Up';
        DOM.authSubmitBtn.textContent = 'Sign Up';
        DOM.authToggleMode.textContent = 'Already have an account? Sign in';
        DOM.authConfirmPasswordContainer.classList.remove('hidden');
        DOM.authConfirmPassword.required = true;
        DOM.authForgotPassword.classList.add('hidden');
    } else {
        // Switch to login
        DOM.authTitle.textContent = 'Sign In';
        DOM.authSubmitBtn.textContent = 'Sign In';
        DOM.authToggleMode.textContent = 'Don\'t have an account? Sign up';
        DOM.authConfirmPasswordContainer.classList.add('hidden');
        DOM.authConfirmPassword.required = false;
        DOM.authForgotPassword.classList.remove('hidden');
    }
    
    hideAuthMessages();
}

// Handle auth form submission
async function handleAuthFormSubmit(e) {
    e.preventDefault();
    
    const email = DOM.authEmail?.value.trim();
    const password = DOM.authPassword?.value;
    const confirmPassword = DOM.authConfirmPassword?.value;
    const isSignup = DOM.authTitle?.textContent === 'Sign Up';
    
    if (!email || !password) {
        showAuthError('Please fill in all required fields');
        return;
    }
    
    if (isSignup && password !== confirmPassword) {
        showAuthError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters long');
        return;
    }
    
    showAuthLoading(true);
    hideAuthMessages();
    
    try {
        let result;
        if (isSignup) {
            result = await window.authManager.signUp(email, password);
        } else {
            result = await window.authManager.signIn(email, password);
        }
        
        if (result.success) {
            showAuthSuccess(result.message);
            setTimeout(() => {
                closeAuthModal();
                updateUserInterface();
            }, 1500);
        } else {
            showAuthError(result.message);
        }
    } catch (error) {
        showAuthError('An unexpected error occurred');
        console.error('Auth error:', error);
    } finally {
        showAuthLoading(false);
    }
}

// Handle forgot password
async function handleForgotPassword() {
    const email = DOM.authEmail?.value.trim();
    
    if (!email) {
        showAuthError('Please enter your email address first');
        return;
    }
    
    showAuthLoading(true);
    hideAuthMessages();
    
    try {
        const result = await window.authManager.resetPassword(email);
        if (result.success) {
            showAuthSuccess(result.message);
        } else {
            showAuthError(result.message);
        }
    } catch (error) {
        showAuthError('Failed to send reset email');
        console.error('Password reset error:', error);
    } finally {
        showAuthLoading(false);
    }
}

// Handle logout
async function handleLogout() {
    try {
        const result = await window.authManager.signOut();
        if (result.success) {
            showNotification('Logged out successfully', 'success');
            updateUserInterface();
        } else {
            showNotification('Failed to logout: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification('Failed to logout', 'error');
        console.error('Logout error:', error);
    }
    
    if (DOM.userMenu) DOM.userMenu.classList.add('hidden');
}

// Handle sync now
async function handleSyncNow() {
    if (state.isGuest) {
        showNotification('Please login to sync data', 'error');
        return;
    }
    
    try {
        const result = await window.syncManager.syncToSupabase();
        if (result.success) {
            showNotification('Data synced successfully', 'success');
        } else {
            showNotification('Sync failed: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification('Sync failed', 'error');
        console.error('Sync error:', error);
    }
}

// Show auth error
function showAuthError(message) {
    if (DOM.authError && DOM.authErrorText) {
        DOM.authErrorText.textContent = message;
        DOM.authError.classList.remove('hidden');
    }
    if (DOM.authSuccess) DOM.authSuccess.classList.add('hidden');
}

// Show auth success
function showAuthSuccess(message) {
    if (DOM.authSuccess && DOM.authSuccessText) {
        DOM.authSuccessText.textContent = message;
        DOM.authSuccess.classList.remove('hidden');
    }
    if (DOM.authError) DOM.authError.classList.add('hidden');
}

// Hide auth messages
function hideAuthMessages() {
    if (DOM.authError) DOM.authError.classList.add('hidden');
    if (DOM.authSuccess) DOM.authSuccess.classList.add('hidden');
}

// Show auth loading
function showAuthLoading(loading) {
    if (DOM.authSubmitBtn) {
        DOM.authSubmitBtn.disabled = loading;
        if (loading) {
            DOM.authSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Please wait...';
        } else {
            // Reset button text based on current mode
            const isLogin = DOM.authTitle?.textContent === 'Sign In';
            DOM.authSubmitBtn.innerHTML = isLogin ? 'Sign In' : 'Sign Up';
        }
    }
}

function toggleSidebar() {
    DOM.sidebar.classList.toggle('-translate-x-full');
    DOM.sidebarOverlay.classList.toggle('hidden');
    document.body.style.overflow = DOM.sidebar.classList.contains('-translate-x-full') ? '' : 'hidden';
}

function openCreateTaskModal() {
    editTaskId = null;
    DOM.taskForm.reset();
    DOM.createTaskFormContainer.classList.remove('hidden');
    DOM.createTaskFormContainer.querySelector('h2').textContent = 'Create New Task';
    DOM.taskForm.querySelector('button[type="submit"]').textContent = 'Add Task';
    DOM.taskNameInput.focus();
}

function closeCreateTaskModal() {
    DOM.createTaskFormContainer.classList.add('hidden');
    DOM.taskForm.reset();
    editTaskId = null;
    DOM.createTaskFormContainer.querySelector('h2').textContent = 'Create New Task';
    DOM.taskForm.querySelector('button[type="submit"]').textContent = 'Add Task';
}

function handleTaskFormSubmit(e) {
    e.preventDefault();
    const taskName = DOM.taskNameInput.value.trim();
    const taskTime = parseInt(DOM.taskTimeInput.value);
    const taskSound = DOM.taskSoundInput.value;
    if (!taskName || !taskTime || taskTime <= 0) return;
    
    if (editTaskId) {
        const task = state.tasks.find(t => t.id === editTaskId);
        if (task) {
            task.name = taskName;
            task.duration = taskTime;
            task.sound = taskSound;
            if (state.activeTaskId === editTaskId) setActiveTask(editTaskId);
        }
    } else {
        const newTask = {
            id: Date.now().toString(),
            name: taskName,
            duration: taskTime,
            sound: taskSound,
            createdAt: Date.now()
        };
        state.tasks.push(newTask);
        if (!state.activeTaskId) setActiveTask(newTask.id);
    }

    saveToLocalStorage();
    updateTaskList();
    closeCreateTaskModal();
    if (window.innerWidth < 768 && !DOM.sidebar.classList.contains('-translate-x-full')) {
        toggleSidebar();
    }
}

function handleTaskListClick(e) {
    const startButton = e.target.closest('.start-button');
    const editButton = e.target.closest('.edit-button');
    const deleteButton = e.target.closest('.delete-button');
    const taskItem = e.target.closest('.task-item');

    if (startButton) {
        setActiveTask(startButton.dataset.id);
        startTask();
        if (window.innerWidth < 768 && !DOM.sidebar.classList.contains('-translate-x-full')) toggleSidebar();
        return;
    }
    if (editButton) {
        openEditTaskModal(editButton.dataset.id);
        return;
    }
    if (deleteButton) {
        const taskId = deleteButton.dataset.id;
        if (taskItem.classList.contains('completed')) deleteCompletedTask(taskId);
        else if (taskItem.classList.contains('canceled')) deleteCanceledTask(taskId);
        else deleteTask(taskId);
        return;
    }
    if (taskItem && !taskItem.classList.contains('active') && !taskItem.classList.contains('completed') && !taskItem.classList.contains('canceled')) {
        setActiveTask(taskItem.dataset.id);
        if (window.innerWidth < 768 && !DOM.sidebar.classList.contains('-translate-x-full')) toggleSidebar();
    }
}

function handleSearchInput(e) {
    filterTaskList(e.target.value.toLowerCase().trim());
}

function filterTaskList(searchTerm) {
    const taskItems = DOM.taskList.querySelectorAll('li[data-id]');
    let visibleTasks = 0;

    taskItems.forEach(item => {
        const taskName = item.querySelector('h3')?.textContent.toLowerCase() || '';
        const isMatch = taskName.includes(searchTerm);
        item.style.display = isMatch ? '' : 'none';
        if (isMatch) visibleTasks++;
    });

    if (visibleTasks === 0 && searchTerm !== '') {
        DOM.emptyTaskList.innerHTML = `<p>No tasks found matching "${searchTerm}"</p>`;
        DOM.emptyTaskList.classList.remove('hidden');
    } else if (state.tasks.length === 0 && state.completedTasks.length === 0 && state.canceledTasks.length === 0) {
        DOM.emptyTaskList.innerHTML = `<p>For feature requests, contact <a href="https://x.com/nikhilgohil11" target="_blank" class="text-[rgb(18, 105, 227)] dark:text-[rgb(3, 21, 111)] hover:underline">@nikhilgohil11</a> or <a href="https://x.com/VikasGohil2" target="_blank" class="text-[rgb(18, 105, 227)] dark:text-[rgb(3, 21, 111)] hover:underline">@VikasGohil2</a></p>`;
        DOM.emptyTaskList.classList.remove('hidden');
    } else {
        DOM.emptyTaskList.classList.add('hidden');
    }

    const completedDivider = DOM.taskList.querySelector('.task-divider.completed-divider');
    const canceledDivider = DOM.taskList.querySelector('.task-divider.canceled-divider');
    if (completedDivider) completedDivider.style.display = state.completedTasks.length > 0 ? '' : 'none';
    if (canceledDivider) canceledDivider.style.display = state.canceledTasks.length > 0 ? '' : 'none';
}

function updateTaskList() {
    DOM.taskList.innerHTML = '';
    const searchTerm = DOM.taskSearchInput.value.toLowerCase().trim();

    state.tasks.forEach(task => DOM.taskList.appendChild(createTaskListItem(task, 'queued')));

    if (state.completedTasks.length > 0) {
        const completedDivider = document.createElement('li');
        completedDivider.className = 'task-divider completed-divider';
        completedDivider.innerHTML = 'Completed Tasks';
        DOM.taskList.appendChild(completedDivider);
        state.completedTasks.slice(0, 10).forEach(task => DOM.taskList.appendChild(createTaskListItem(task, 'completed')));
    }

    if (state.canceledTasks.length > 0) {
        const canceledDivider = document.createElement('li');
        canceledDivider.className = 'task-divider canceled-divider';
        canceledDivider.innerHTML = 'Canceled Tasks';
        DOM.taskList.appendChild(canceledDivider);
        state.canceledTasks.slice(0, 5).forEach(task => DOM.taskList.appendChild(createTaskListItem(task, 'canceled')));
    }

    filterTaskList(searchTerm);
}

function createTaskListItem(task, type) {
    const li = document.createElement('li');
    li.className = `task-item p-3 rounded-lg transition-colors duration-200 ${type}`;
    li.dataset.id = task.id;

    if (type === 'queued' && task.id === state.activeTaskId) {
        li.classList.add('active', 'bg-blue-100', 'dark:bg-blue-900/50');
    } else {
         li.classList.add('hover:bg-gray-100', 'dark:hover:bg-gray-700/50');
    }

    const soundIcon = task.sound !== 'none' ? `<i class="fas fa-music mr-1 text-gray-500"></i>${findAudioName(task.sound)}` : '';
    const durationInfo = type === 'queued' ? `<i class="far fa-clock mr-1"></i>${task.duration} min` : '';
    let statusIcon = '', timestamp = '';

    if (type === 'completed') {
        statusIcon = `<i class="far fa-check-circle text-green-500 mr-1"></i>`;
        timestamp = `Completed ${new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (type === 'canceled') {
        statusIcon = `<i class="fas fa-ban text-red-500 mr-1"></i>`;
        timestamp = `Canceled ${new Date(task.canceledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
            
    li.innerHTML = `
        <div class="flex items-center justify-between w-full">
            <div class="flex-1 min-w-0">
                <h3 class="font-medium truncate ${task.id === state.activeTaskId ? 'text-[rgb(2,4,3)] dark:text-[rgb(2,4,3)]' : 'text-gray-800 dark:text-gray-200'}">${task.name}</h3>
                <div class="task-details flex items-center flex-wrap gap-x-3 text-xs mt-1 text-gray-500 dark:text-gray-400">
                    ${statusIcon ? `<span>${statusIcon}${timestamp}</span>` : ''}
                    ${durationInfo ? `<span>${durationInfo}</span>` : ''}
                    ${soundIcon ? `<span class="truncate max-w-[100px]">${soundIcon}</span>` : ''}
                </div>
            </div>
            <div class="task-actions flex items-center flex-shrink-0 ml-2">
                ${type === 'queued' && task.id !== state.activeTaskId ? `
                    <button title="Start Task" class="start-button p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 rounded-full" data-id="${task.id}"><i class="fas fa-play fa-sm"></i></button>
                    <button title="Edit Task" class="edit-button p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full" data-id="${task.id}"><i class="fas fa-pen fa-sm"></i></button>
                ` : ''}
                <button title="Delete Task" class="delete-button p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-full" data-id="${task.id}"><i class="fas fa-trash-alt fa-sm"></i></button>
            </div>
        </div>
    `;
    return li;
}

function findAudioName(audioId) {
    if (audioId.startsWith('mix_')) {
        const mixName = audioId.replace('mix_', '');
        return mixName.charAt(0).toUpperCase() + mixName.slice(1) + ' Mix';
    }
    const audio = AUDIO_FILES.find(a => a.id === audioId);
    return audio ? audio.name : 'Sound';
}

function setActiveTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    state.activeTaskId = taskId;
    DOM.activeTaskName.textContent = task.name;
    DOM.timerDisplay.textContent = formatTime(task.duration * 60);
    DOM.timerBar.style.width = '100%';
    DOM.noTaskMessage.style.display = 'none';
    DOM.activeTaskDiv.style.display = 'flex';
    
    updateTaskList();
    
    state.timerRunning = false;
    state.isPaused = false;
    state.remainingTime = task.duration * 60;
    state.timerStart = null;
    state.timerPausedAt = null;
    
    updateTimerDisplay();
    
    DOM.startTaskButton.classList.remove('hidden');
    DOM.pauseTaskButton.classList.add('hidden');
    DOM.resumeTaskButton.classList.add('hidden');
    
    // ***MODIFIED***: Stop audio and prepare checkboxes without playing sound.
    // The sound will only be played when the user clicks 'Start'.
    stopAudio(); 
    
    // Uncheck all sound checkboxes
    document.querySelectorAll('.sound-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Check the boxes for the task's sound setting, but don't play.
    const soundId = task.sound;
    if (soundId && soundId !== 'none') {
        if (soundId.startsWith('mix_')) {
            const preset = presetMixes[soundId];
            if (preset) {
                preset.sounds.forEach(soundName => {
                    const checkbox = document.querySelector(`[data-sound="${soundName}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        } else {
            const checkbox = document.querySelector(`[data-sound="${soundId}"]`);
            if (checkbox) checkbox.checked = true;
        }
    }
    // End of modification
    
    saveToLocalStorage();
}

function updateSoundCheckboxes(soundId) {
    stopAudio(); // Stop any current sounds before setting the new one
    if (!soundId || soundId === 'none') return;
    
    playAudio(soundId); // This will handle presets and single sounds
}

function clearActiveTask() {
    state.activeTaskId = null;
    state.timerRunning = false;
    state.isPaused = false;
    state.remainingTime = 0;
    state.timerStart = null;
    state.timerPausedAt = null;
    
    DOM.timerDisplay.textContent = '00:00';
    DOM.noTaskMessage.style.display = 'block';
    DOM.activeTaskDiv.style.display = 'none';
    
    updateTaskList();
    
    DOM.startTaskButton.classList.remove('hidden');
    DOM.pauseTaskButton.classList.add('hidden');
    DOM.resumeTaskButton.classList.add('hidden');
    
    stopAudio();
    saveToLocalStorage();
}

function deleteTask(taskId) {
    if (taskId === state.activeTaskId) clearActiveTask();
    state.tasks = state.tasks.filter(task => task.id !== taskId);
    saveToLocalStorage();
    updateTaskList();
}

function openClearAllTasksModal() {
    // Only show modal if there are tasks to clear
    if (state.tasks.length === 0) {
        return;
    }
    DOM.clearAllTasksModal.classList.remove('hidden');
}

function closeClearAllTasksModal() {
    DOM.clearAllTasksModal.classList.add('hidden');
}

function clearAllTasks() {
    // Clear any active task first
    if (state.activeTaskId) {
        clearActiveTask();
    }
    
    // Clear all tasks in the queue
    state.tasks = [];
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Update the task list display
    updateTaskList();
    
    // Close the modal
    closeClearAllTasksModal();
    
    // Show a brief success message
    showClearAllSuccessMessage();
}

function showClearAllSuccessMessage() {
    // Create a temporary success message
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate__animated animate__fadeInRight';
    successMessage.innerHTML = '<i class="fas fa-check mr-2"></i>All tasks cleared successfully';
    
    document.body.appendChild(successMessage);
    
    // Remove the message after 3 seconds
    setTimeout(() => {
        successMessage.classList.add('animate__fadeOutRight');
        setTimeout(() => {
            if (successMessage.parentNode) {
                successMessage.parentNode.removeChild(successMessage);
            }
        }, 300);
    }, 3000);
}

function startTask() {
    if (!state.activeTaskId) return;
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (!task) return;
    
    DOM.startTaskButton.classList.add('hidden');
    DOM.pauseTaskButton.classList.remove('hidden');
    DOM.resumeTaskButton.classList.add('hidden');
    
    if (!state.isPaused) {
        state.remainingTime = task.duration * 60;
        state.timerStart = Date.now();
        state.timerPausedAt = null;
    } else {
        if (state.timerPausedAt && state.timerStart) {
            const pausedDuration = Date.now() - state.timerPausedAt;
            state.timerStart += pausedDuration;
            state.timerPausedAt = null;
        }
    }
    
    // ***MODIFIED***: Only play the task's sound if it's defined.
    // This preserves any manually played sounds if the task has no sound.
    if (task.sound && task.sound !== 'none') {
        updateSoundCheckboxes(task.sound);
    }
    
    state.isPaused = false;
    startTimerInterval();
}

function pauseTask() {
    if (!state.timerInterval) return;
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.isPaused = true;
    state.timerPausedAt = Date.now();
    
    pauseAudio(); // New function to just pause, not stop/clear
    
    DOM.pauseTaskButton.classList.add('hidden');
    DOM.resumeTaskButton.classList.remove('hidden');
}

function resumeTask() {
    if (!state.isPaused) return;
    
    resumeAudio(); // New function to resume paused audio
    
    DOM.resumeTaskButton.classList.add('hidden');
    DOM.pauseTaskButton.classList.remove('hidden');
    
    if (state.timerPausedAt && state.timerStart) {
        const pausedDuration = Date.now() - state.timerPausedAt;
        state.timerStart += pausedDuration;
        state.timerPausedAt = null;
    }
    state.isPaused = false;
    startTimerInterval();
}

function startTimerInterval() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (!task) return;
    const totalSeconds = task.duration * 60;

    state.timerInterval = setInterval(() => {
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

function finishTask() {
    if (!state.activeTaskId) return;
    if (state.timerInterval) clearInterval(state.timerInterval);
    stopAudio();
    completeTask();
}

function cancelTask() {
    if (!state.activeTaskId) return;
    if (state.timerInterval) clearInterval(state.timerInterval);
    stopAudio();
    state.isPaused = false;
    
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (task) {
        const canceledTask = { ...task, canceledAt: Date.now() };
        state.canceledTasks.unshift(canceledTask);
        if (state.canceledTasks.length > 100) state.canceledTasks.pop();
    }
    
    const currentIndex = state.tasks.findIndex(t => t.id === state.activeTaskId);
    state.tasks = state.tasks.filter(task => task.id !== state.activeTaskId);
    
    clearActiveTask();
    
    const nextTask = state.tasks[currentIndex];
    if (nextTask) {
        setActiveTask(nextTask.id);
    }
    
    saveToLocalStorage();
}

function completeTask() {
    if (!state.activeTaskId) return;
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (!task) return;
    
    clearInterval(state.timerInterval);
    stopAudio();
    playCompletionSound();
    
    const completedTask = { ...task, completedAt: Date.now() };
    state.completedTasks.unshift(completedTask);
    if (state.completedTasks.length > 100) state.completedTasks.pop();
    
    state.stats.todayFocusTime += task.duration;
    state.stats.tasksCompleted++;
    if (task.sound !== 'none') {
        state.stats.soundUsage[task.sound] = (state.stats.soundUsage[task.sound] || 0) + 1;
    }
    
    state.tasks = state.tasks.filter(t => t.id !== state.activeTaskId);
    state.activeTaskId = null;
    state.isPaused = false;
    
    DOM.completedTaskName.textContent = task.name;
    DOM.completionModal.classList.remove('hidden');
    createConfetti();
    
    updateTaskList();
    updateStats();
    saveToLocalStorage();
    clearActiveTask();
}

function createConfetti() {
    const container = document.querySelector('.confetti-container');
    container.innerHTML = '';
    const colors = ['#4f46e5', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti fixed top-0 w-2 h-2 bg-yellow-400 opacity-0 animate-fall';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        container.appendChild(confetti);
    }
    setTimeout(() => { container.innerHTML = ''; }, 5000);
}

function startNextTask() {
    if (state.completionSound) state.completionSound.stop();
    DOM.completionModal.classList.add('hidden');
    const nextTask = state.tasks.find(task => !task.completed && !task.canceled);
    if (nextTask) setActiveTask(nextTask.id);
}

function startBreak() {
    if (state.completionSound) state.completionSound.stop();
    DOM.completionModal.classList.add('hidden');
    clearActiveTask();
    DOM.breakModal.classList.remove('hidden');
    let breakTime = 5 * 60;
    updateBreakTimerDisplay(breakTime);
    state.breakTimerInterval = setInterval(() => {
        breakTime--;
        updateBreakTimerDisplay(breakTime);
        if (breakTime <= 0) endBreak();
    }, 1000);
}

function updateBreakTimerDisplay(seconds) {
    DOM.breakTimer.textContent = formatTime(seconds);
}

function endBreak() {
    if (state.breakTimerInterval) clearInterval(state.breakTimerInterval);
    DOM.breakModal.classList.add('hidden');
    if (state.tasks.length > 0) setActiveTask(state.tasks[0].id);
    else clearActiveTask();
}

function endSession() {
    if (state.completionSound) state.completionSound.stop();
    DOM.completionModal.classList.add('hidden');
    clearActiveTask();
    updateStats();
}

function toggleStatsModal() {
    DOM.statsModal.classList.toggle('hidden');
    if (!DOM.statsModal.classList.contains('hidden')) updateStats();
}

function updateStats() {
    DOM.statsTodayFocusTime.textContent = `${state.stats.todayFocusTime} minutes`;
    DOM.statsTasksCompleted.textContent = `${state.stats.tasksCompleted} ${state.stats.tasksCompleted === 1 ? 'task' : 'tasks'}`;
    let mostUsedSound = 'None', maxCount = 0;
    for (const [sound, count] of Object.entries(state.stats.soundUsage)) {
        if (count > maxCount) {
            maxCount = count;
            mostUsedSound = findAudioName(sound);
        }
    }
    DOM.statsMostUsedSound.textContent = mostUsedSound;
    DOM.statsRecentTasksList.innerHTML = '';
    if (state.completedTasks.length === 0) {
        DOM.statsRecentTasksList.innerHTML = '<li class="py-3 text-gray-500 italic">No completed tasks yet</li>';
        return;
    }
    state.completedTasks.slice(0, 5).forEach(task => {
        const li = document.createElement('li');
        li.className = 'py-3';
        const date = new Date(task.completedAt);
        li.innerHTML = `
            <div class="flex justify-between">
                <div><h4 class="font-medium">${task.name}</h4><span class="text-sm text-gray-500">${task.duration} minutes</span></div>
                <div class="text-right text-sm text-gray-500">${date.toLocaleDateString()}<br>${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        `;
        DOM.statsRecentTasksList.appendChild(li);
    });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateTimerDisplay() {
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    let totalSeconds = task ? task.duration * 60 : 0;
    if (state.timerStart && !state.isPaused) {
        const elapsed = Math.floor((Date.now() - state.timerStart) / 1000);
        state.remainingTime = Math.max(0, totalSeconds - elapsed);
    }
    DOM.timerDisplay.textContent = formatTime(state.remainingTime);
    if (task) {
        DOM.timerBar.style.width = `${Math.max(0, (state.remainingTime / totalSeconds) * 100)}%`;
    }
}

function pauseAudio() {
    activeSounds.forEach(soundName => {
        if(sounds[soundName] && !sounds[soundName].paused) {
            sounds[soundName].pause();
        }
    });
}

function resumeAudio() {
    activeSounds.forEach(soundName => {
        if(sounds[soundName] && sounds[soundName].paused) {
            sounds[soundName].play().catch(e => console.error("Error resuming audio:", e));
        }
    });
}

function updateSliderValue(slider) {
    const valueDisplay = slider.parentElement.querySelector('.channel-value');
    if (valueDisplay) valueDisplay.textContent = `${slider.value}%`;
}

function adjustVolume() {
    const volume = parseInt(DOM.volumeControl.value) / 100;
    setGlobalVolume(volume);
    updateMuteButtonIcon(volume > 0);
}

function increaseVolume() {
    const currentVolume = parseInt(DOM.volumeControl.value);
    const newVolumeValue = Math.min(currentVolume + 10, 100);
    DOM.volumeControl.value = newVolumeValue;
    DOM.volumeValue.textContent = `${newVolumeValue}%`;
    setGlobalVolume(newVolumeValue / 100);
    updateMuteButtonIcon(newVolumeValue > 0);
}

function decreaseVolume() {
    const currentVolume = parseInt(DOM.volumeControl.value);
    const newVolumeValue = Math.max(currentVolume - 10, 0);
    DOM.volumeControl.value = newVolumeValue;
    DOM.volumeValue.textContent = `${newVolumeValue}%`;
    setGlobalVolume(newVolumeValue / 100);
    updateMuteButtonIcon(newVolumeValue > 0);
}

function toggleMute() {
    const currentVolume = parseInt(DOM.volumeControl.value);
    let newVolume = 0;
    if (currentVolume === 0) newVolume = state.previousVolume || 50;
    else state.previousVolume = currentVolume;
    DOM.volumeControl.value = newVolume;
    DOM.volumeValue.textContent = `${newVolume}%`;
    setGlobalVolume(newVolume / 100);
    updateMuteButtonIcon(newVolume > 0);
}

function updateMuteButtonIcon(isAudible) {
    const icon = DOM.muteButton.querySelector('i');
    icon.className = `fas ${isAudible ? 'fa-volume-up' : 'fa-volume-mute'}`;
    DOM.muteButton.title = isAudible ? "Mute" : "Unmute";
}

function saveToLocalStorage() {
    try {
        const dataToSave = {
            tasks: state.tasks,
            completedTasks: state.completedTasks,
            canceledTasks: state.canceledTasks,
            stats: state.stats
        };
        localStorage.setItem('focusflow_data', JSON.stringify(dataToSave));
        
        // If user is logged in, queue sync operation
        if (!state.isGuest && window.syncManager) {
            window.syncManager.queueOperation('full_sync');
        }
    } catch (error) {
        console.warn('Could not save data to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('focusflow_data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (parsedData && typeof parsedData === 'object') {
                Object.assign(state, parsedData);
                if (!state.tasks) state.tasks = [];
                if (!state.completedTasks) state.completedTasks = [];
                if (!state.canceledTasks) state.canceledTasks = [];
                if (!state.stats) state.stats = { todayFocusTime: 0, tasksCompleted: 0, soundUsage: {} };
            }
        }
    } catch (error) {
        console.warn('Could not load data from localStorage:', error);
    }
}

function deleteCompletedTask(taskId) {
    state.completedTasks = state.completedTasks.filter(task => task.id !== taskId);
    saveToLocalStorage();
    updateTaskList();
}

function deleteCanceledTask(taskId) {
    state.canceledTasks = state.canceledTasks.filter(task => task.id !== taskId);
    saveToLocalStorage();
    updateTaskList();
}

function initializeAudioContext() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
}

function loadCompletionSound() {
    fetch('audio/crowdcheers.mp3')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => { completionSoundBuffer = audioBuffer; })
        .catch(error => console.error('Error loading completion sound:', error));
}

function playCompletionSound() {
    if (!completionSoundBuffer) return;
    initializeAudioContext();
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => playCompletionSoundInternal()).catch(e=>console.error(e));
    } else {
        playCompletionSoundInternal();
    }
}

function playCompletionSoundInternal() {
    const source = audioContext.createBufferSource();
    source.buffer = completionSoundBuffer;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    state.completionSound = source;
    source.start(0);
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newTabId = button.dataset.tab;
            if (state.activeTaskId && state.timerInterval && !state.isPaused) pauseTask();
            
            tabPanes.forEach(pane => pane.classList.add('hidden'));
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'bg-[rgb(2,4,3)]', 'text-white');
                btn.style.setProperty('--after-opacity', '0');
                btn.classList.add('text-gray-600', 'dark:text-gray-300');
            });

            button.classList.add('active', 'bg-[rgb(2,4,3)]', 'text-white');
            button.classList.remove('text-gray-600', 'dark:text-gray-300');
            button.style.setProperty('--after-opacity', '1');
            document.getElementById(`${newTabId}-tab`).classList.remove('hidden');
        });
    });
}

function setupYouTubePlayer() {
    const youtubeUrlInput = document.getElementById('youtube-url');
    const loadYoutubeButton = document.getElementById('load-youtube');
    const youtubePlayerContainer = document.getElementById('youtube-player');
    const youtubeIframe = document.getElementById('youtube-iframe');
    loadYoutubeButton.addEventListener('click', () => {
        const url = youtubeUrlInput.value.trim();
        if (!url) return;
        const videoId = extractYouTubeId(url);
        if (!videoId) { alert('Please enter a valid YouTube URL'); return; }
        youtubeIframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
        youtubePlayerContainer.classList.remove('hidden');
        if (typeof YT !== 'undefined') {
            youtubePlayer = new YT.Player('youtube-iframe', {
                events: { 'onReady': onYouTubePlayerReady, 'onStateChange': onYouTubePlayerStateChange }
            });
        }
    });
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function onYouTubePlayerReady(event) {}
function onYouTubePlayerStateChange(event) {
    isYoutubePlaying = (event.data === YT.PlayerState.PLAYING);
}

function initializeSoundMixer() {
    const soundItems = document.querySelectorAll('.sound-item');
    const masterVolumeSlider = document.getElementById('master-volume-slider');
    const volumeValue = document.getElementById('volume-value');
    const selectedSoundName = document.getElementById('selected-sound-name');

    soundItems.forEach(item => {
        const checkbox = item.querySelector('.sound-checkbox');
        const soundName = checkbox.dataset.sound;
        soundElements[soundName] = { element: item, checkbox: checkbox, audio: null };

        item.addEventListener('click', (e) => {
            if (e.target === checkbox) return;
            if (selectedSound === soundName) {
                selectedSound = null;
                item.classList.remove('selected');
                selectedSoundName.textContent = 'Select a sound to adjust volume';
                masterVolumeSlider.value = 50;
                volumeValue.textContent = '50%';
            } else {
                if (selectedSound) soundElements[selectedSound].element.classList.remove('selected');
                selectedSound = soundName;
                item.classList.add('selected');
                selectedSoundName.textContent = soundName.charAt(0).toUpperCase() + soundName.slice(1);
                masterVolumeSlider.value = soundVolumes[soundName];
                volumeValue.textContent = `${soundVolumes[soundName]}%`;
            }
        });
        
        // ***FIXED***: The faulty event listener that was here has been removed.
        // The correct listener is now the only one, defined in the DOMContentLoaded event.
    });

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
    const lastCompleted = state.completedTasks[0];
    if (!lastCompleted) return;
    state.completedTasks.shift();
    const newTask = { ...lastCompleted };
    delete newTask.completedAt;
    newTask.duration = minutes;
    state.tasks.unshift(newTask);
    state.activeTaskId = newTask.id;
    state.isPaused = false;
    state.remainingTime = minutes * 60;
    state.timerStart = Date.now();
    state.timerPausedAt = null;
    DOM.completionModal.classList.add('hidden');
    setActiveTask(newTask.id);
    startTask();
    updateTaskList();
    saveToLocalStorage();
}

let editTaskId = null;

function openEditTaskModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    editTaskId = taskId;
    DOM.taskForm.reset();
    DOM.createTaskFormContainer.classList.remove('hidden');
    DOM.taskNameInput.value = task.name;
    DOM.taskTimeInput.value = task.duration;
    DOM.taskSoundInput.value = task.sound;
    DOM.createTaskFormContainer.querySelector('h2').textContent = 'Edit Task';
    DOM.taskForm.querySelector('button[type="submit"]').textContent = 'Save Changes';
    DOM.taskNameInput.focus();
}

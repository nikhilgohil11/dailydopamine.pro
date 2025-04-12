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
let localMusicFiles = [];
let localMusicPlayer = null;
let isLocalMusicPlaying = false;

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
    volumeControl: document.getElementById('volume-control'),
    volumeDownButton: document.getElementById('volume-down'),
    volumeUpButton: document.getElementById('volume-up'),
    muteButton: document.getElementById('mute-button'),
    themeToggleButton: document.getElementById('theme-toggle'), // Main theme toggle
    themeToggleButtonMobile: document.getElementById('theme-toggle-mobile') // Mobile theme toggle
};

document.addEventListener('DOMContentLoaded', () => {
    // Preload audio files
    preloadAudioFiles();
    
    // Initialize the app
    initializeApp();
});

// Preload all audio files before showing the app
function preloadAudioFiles() {
    let filesLoaded = 0;
    
    AUDIO_FILES.forEach(file => {
        const audio = new Audio();
        audio.src = file.path;
        audio.preload = 'auto';
        audio.loop = true;
        
        // Add to global audio elements
        state.audioElements[file.id] = audio;
        
        // Update progress when each file loads
        audio.addEventListener('canplaythrough', () => {
            filesLoaded++;
            const progress = (filesLoaded / AUDIO_FILES.length) * 100;
            DOM.loadingBar.style.width = `${progress}%`;
            DOM.loadingText.textContent = `${filesLoaded}/${AUDIO_FILES.length} files loaded`;
            
            // When all files are loaded, show the app
            if (filesLoaded === AUDIO_FILES.length) {
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
        audio.addEventListener('error', () => {
            console.error(`Error loading audio file: ${file.path}`);
            filesLoaded++;
            const progress = (filesLoaded / AUDIO_FILES.length) * 100;
            DOM.loadingBar.style.width = `${progress}%`;
            DOM.loadingText.textContent = `${filesLoaded}/${AUDIO_FILES.length} files loaded (Error with ${file.name})`;
        });
    });
}

// Initialize app functionality
function initializeApp() {
    // Load saved data from localStorage
    loadFromLocalStorage();
    
    // Set up event listeners for UI elements
    setupEventListeners();
    
    // Initialize UI
    updateTaskList();
    updateStats();
    
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

    setupLocalMusicHandlers();
    setupSoundControlsCollapse();
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

    // --- New Listeners for Sidebar and Modals ---

    // Sidebar toggle (mobile)
    DOM.menuToggle.addEventListener('click', toggleSidebar);
    DOM.sidebarOverlay.addEventListener('click', toggleSidebar); // Close sidebar on overlay click

    // Create Task Modal
    DOM.addTaskButton.addEventListener('click', openCreateTaskModal);
    DOM.closeCreateTaskFormButton.addEventListener('click', closeCreateTaskModal);
    // Close modal if clicking outside the form container
    DOM.createTaskFormContainer.addEventListener('click', (e) => {
        if (e.target === DOM.createTaskFormContainer) {
            closeCreateTaskModal();
        }
    });

    // Delegate task list events (start/delete)
    DOM.taskList.addEventListener('click', handleTaskListClick);

    // Theme toggle buttons (already handled in index.html script, but can be moved here if preferred)
    // DOM.themeToggleButton.addEventListener('click', toggleTheme);
    // DOM.themeToggleButtonMobile.addEventListener('click', toggleTheme);

    // Add event listener for the "Start now" button
    document.getElementById('add-first-task')?.addEventListener('click', () => {
        openCreateTaskModal();
    });

    // Add task header buttons
    document.getElementById('add-task-header')?.addEventListener('click', openCreateTaskModal);
    document.getElementById('add-task-header-mobile')?.addEventListener('click', openCreateTaskModal);
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
    DOM.createTaskFormContainer.classList.remove('hidden');
    DOM.taskNameInput.focus(); // Focus the first input field
}

function closeCreateTaskModal() {
    DOM.createTaskFormContainer.classList.add('hidden');
    DOM.taskForm.reset(); // Clear the form when closing
}

// --- Modified Event Handlers ---

// Handle task form submission
function handleTaskFormSubmit(e) {
    e.preventDefault();
    
    const taskName = DOM.taskNameInput.value.trim();
    const taskTime = parseInt(DOM.taskTimeInput.value);
    const taskSound = DOM.taskSoundInput.value;
    
    if (!taskName || !taskTime || taskTime <= 0) {
        // Add some validation feedback if needed
        console.warn('Invalid task input');
        return;
    }
    
    // Create new task
    const newTask = {
        id: Date.now().toString(),
        name: taskName,
        duration: taskTime,
        sound: taskSound,
        createdAt: Date.now()
    };
    
    // Add to tasks array
    state.tasks.push(newTask);
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Update UI
    updateTaskList();
    
    // Close the modal and clear form
    closeCreateTaskModal();
    
    // If this is the first task or no task is active, set it active
    if (!state.activeTaskId) {
        setActiveTask(newTask.id);
    }
    
    // Close sidebar if open on mobile after adding task
    if (window.innerWidth < 768 && DOM.sidebar.classList.contains('open')) {
        toggleSidebar();
    }
}

// Handle clicks within the task list (delegation)
function handleTaskListClick(e) {
    const startButton = e.target.closest('.start-button');
    const deleteButton = e.target.closest('.delete-button');
    const taskItem = e.target.closest('.task-item');

    if (startButton) {
        const taskId = startButton.dataset.id;
        setActiveTask(taskId);
        startTask(); // Optionally auto-start when clicked from sidebar
        // Close sidebar if open on mobile after starting task
        if (window.innerWidth < 768 && DOM.sidebar.classList.contains('open')) {
            toggleSidebar();
        }
        return; // Prevent task item click logic below
    }

    if (deleteButton) {
        const taskId = deleteButton.dataset.id;
        // Add confirmation dialog?
        // if (confirm('Are you sure you want to delete this task?')) { ... }
        if (taskItem.classList.contains('completed')) {
            deleteCompletedTask(taskId);
        } else if (taskItem.classList.contains('canceled')) {
            deleteCanceledTask(taskId);
        } else {
            deleteTask(taskId);
        }
        return; // Prevent task item click logic below
    }

    // Handle clicking anywhere else on the task item (to make it active)
    if (taskItem && !taskItem.classList.contains('active') && !taskItem.classList.contains('completed') && !taskItem.classList.contains('canceled')) {
        const taskId = taskItem.dataset.id;
        setActiveTask(taskId);
         // Close sidebar if open on mobile after selecting task
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
        DOM.emptyTaskList.innerHTML = `<p>No tasks yet!</p><p class="text-sm mt-1">Click the '+' to add one.</p>`;
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

    const soundIcon = task.sound !== 'none' ? `<i class="fas fa-music mr-1 text-indigo-400"></i>${findAudioName(task.sound)}` : '';
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
                <h3 class="font-medium truncate ${task.id === state.activeTaskId ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-200'}">${task.name}</h3>
                <div class="task-details flex items-center space-x-3 text-xs mt-1 text-gray-500 dark:text-gray-400">
                    ${statusIcon ? `<span>${statusIcon}${timestamp}</span>` : ''}
                    ${durationInfo ? `<span>${durationInfo}</span>` : ''}
                    ${soundIcon ? `<span class="truncate">${soundIcon}</span>` : ''}
                        </div>
                    </div>
            <div class="task-actions flex items-center ml-2">
                ${type === 'queued' && task.id !== state.activeTaskId ? `
                    <button title="Start Task" class="start-button p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 rounded-full" data-id="${task.id}">
                        <i class="fas fa-play fa-xs"></i>
                    </button>
                ` : ''}
                <button title="Delete Task" class="delete-button p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-full" data-id="${task.id}">
                    <i class="fas fa-trash-alt fa-xs"></i>
                        </button>
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
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) {
        // If task not found (maybe deleted?), clear active state
        clearActiveTask();
        return;
    }

    // Clear previous active task timer/audio if switching
    if (state.activeTaskId && state.activeTaskId !== taskId) {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        stopAudio();
        state.isPaused = false;
    }
    
    state.activeTaskId = taskId;
    
    // Update Active Task UI
    DOM.noTaskMessage.classList.add('hidden');
    DOM.activeTaskDiv.classList.remove('hidden');
    DOM.activeTaskName.textContent = task.name;
    // DOM.activeTaskName.classList.add('break-words', 'whitespace-normal'); // Ensure long names wrap

    // Reset timer display and bar
    state.remainingTime = task.duration * 60;
    updateTimerDisplay();
    DOM.timerBar.style.width = '100%';
    DOM.timerBar.style.transitionDuration = '0ms'; // Prevent animation on reset
    setTimeout(() => { DOM.timerBar.style.transitionDuration = ''; }, 50); // Re-enable after a tick
    
    // Configure audio display (don't play yet)
    if (task.sound !== 'none') {
        DOM.soundName.textContent = `Sound: ${findAudioName(task.sound)}`;
        DOM.soundName.classList.remove('hidden');
    } else {
        DOM.soundName.textContent = '';
        DOM.soundName.classList.add('hidden');
    }

    // Reset control buttons state
    DOM.startTaskButton.classList.remove('hidden');
    DOM.pauseTaskButton.classList.add('hidden');
    DOM.resumeTaskButton.classList.add('hidden');
    
    // Update task list highlighting
    updateTaskList();

     // Reset sound mixer sliders (important when switching tasks)
     // stopAudio(); // This is called above, includes slider reset
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

// Clear the active task view
function clearActiveTask() {
    state.activeTaskId = null;
    DOM.noTaskMessage.classList.remove('hidden');
    DOM.activeTaskDiv.classList.add('hidden');
    
    // Stop any running timers or audio
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    
    stopAudio();
}

// Start the active task
function startTask() {
    if (!state.activeTaskId) return;
    
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (!task) return;
    
    // Start local music if files are loaded
    if (localMusicFiles.length > 0) {
        playLocalMusic(0);
        isLocalMusicPlaying = true;
        document.getElementById('sound-name').textContent = `Playing: ${localMusicFiles[0].name}`;
    }
    
    // Update UI buttons
    DOM.startTaskButton.classList.add('hidden');
    DOM.pauseTaskButton.classList.remove('hidden');
    DOM.resumeTaskButton.classList.add('hidden');
    
    // Reset timer if needed
    if (!state.isPaused) {
        state.remainingTime = task.duration * 60;
        updateTimerDisplay();
    }
    
    // Start audio if selected
    if (task.sound !== 'none') {
        // If it's a single sound (not a mix), update the corresponding slider
        if (!task.sound.startsWith('mix_')) {
            const slider = document.querySelector(`.channel-slider[data-sound="${task.sound}"]`);
            if (slider) {
                slider.value = 100; // Set to full volume
                updateSliderValue(slider);
            }
        }
        playAudio(task.sound);
    }
    
    // Reset timer bar
    const timerBar = DOM.timerBar;
    timerBar.style.width = '100%';
    const totalSeconds = task.duration * 60;
    
    // Start the timer
    state.isPaused = false;
    state.timerInterval = setInterval(() => {
        state.remainingTime--;
        
        // Update timer display
        updateTimerDisplay();
        
        // Update timer bar
        const percentage = (state.remainingTime / totalSeconds) * 100;
        timerBar.style.width = percentage + '%';
        
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
    
    // Pause local music if playing
    if (isLocalMusicPlaying && localMusicPlayer) {
        localMusicPlayer.pause();
        document.getElementById('sound-name').textContent = `Paused: ${localMusicFiles[0].name}`;
    }
    
    // Pause audio when task is paused
    pauseAudio(); // Use a separate function to just pause, not reset sliders
    
    // Update UI
    DOM.pauseTaskButton.classList.add('hidden');
    DOM.resumeTaskButton.classList.remove('hidden');
}

// Resume the paused task
function resumeTask() {
    if (!state.isPaused) return;
    
    // Resume local music if files are loaded
    if (localMusicFiles.length > 0) {
        playLocalMusic(0);
        isLocalMusicPlaying = true;
        document.getElementById('sound-name').textContent = `Playing: ${localMusicFiles[0].name}`;
    }
    
    // Resume audio
    resumeAudio(); // Use a separate function to resume paused sounds
    
    // Update UI
    DOM.resumeTaskButton.classList.add('hidden');
    DOM.pauseTaskButton.classList.remove('hidden');
    
    // Restart the timer interval
    startTimerInterval(); // Use refactored interval start
}

// Refactor timer start logic into its own function
function startTimerInterval() {
    if (state.timerInterval) clearInterval(state.timerInterval); // Clear existing interval if any

    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (!task) return;
    const totalSeconds = task.duration * 60;

    state.timerInterval = setInterval(() => {
        state.remainingTime--;

        updateTimerDisplay();

        const percentage = Math.max(0, (state.remainingTime / totalSeconds) * 100);
        DOM.timerBar.style.width = percentage + '%';

        if (state.remainingTime <= 0) {
            clearInterval(state.timerInterval);
            completeTask();
        }
    }, 1000);
}

// Finish the current task
function finishTask() {
    if (!state.activeTaskId) return;
    
    // Stop local music if playing
    if (isLocalMusicPlaying) {
        stopLocalMusic();
        document.getElementById('sound-name').textContent = `Loaded: ${localMusicFiles[0].name}`;
    }
    
    // Stop timer and audio
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    
    // Complete the task
    completeTask();
}

// Cancel the active task
function cancelTask() {
    if (!state.activeTaskId) return;
    
    // Stop local music if playing
    if (isLocalMusicPlaying) {
        stopLocalMusic();
        document.getElementById('sound-name').textContent = `Loaded: ${localMusicFiles[0].name}`;
    }
    
    // Stop timer and audio
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    
    stopAudio();
    
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
    // updateTaskList() is called within setActiveTask or just above
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
    
    // Play completion sound
    const completionSound = new Audio('audio/crowdcheers.mp3');
    completionSound.volume = 0.3;
    state.completionSound = completionSound; // Store reference to stop it later
    completionSound.play();
    
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
    // Stop completion sound if playing
    if (state.completionSound) {
        state.completionSound.pause();
        state.completionSound.currentTime = 0;
        state.completionSound = null;
    }
    
    // Hide completion modal
    DOM.completionModal.classList.add('hidden');
    
    // Check if there are tasks in the queue
    if (state.tasks.length === 0) {
        clearActiveTask();
        return;
    }
    
    // Set the first task as active
    setActiveTask(state.tasks[0].id);
    
    // Automatically start the task
    startTask();
}

// Start a break timer
function startBreak() {
    // Stop completion sound if playing
    if (state.completionSound) {
        state.completionSound.pause();
        state.completionSound.currentTime = 0;
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
    // Stop completion sound if playing
    if (state.completionSound) {
        state.completionSound.pause();
        state.completionSound.currentTime = 0;
        state.completionSound = null;
    }
    
    // Hide completion modal
    DOM.completionModal.classList.add('hidden');
    
    // Clear active task
    clearActiveTask();
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

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(state.remainingTime / 60);
    const seconds = state.remainingTime % 60;
    DOM.timerDisplay.textContent = 
        `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Audio control functions

// Play a specific sound or mix
function playAudio(audioId) {
    // If local music is playing, don't play preset sounds
    if (isLocalMusicPlaying) return;
    
    stopAudio(); // Stop everything before starting new sound/mix
    
    // Remove active class from all preset buttons
    document.querySelectorAll('.sound-preset').forEach(button => {
        button.classList.remove('active-preset');
    });
    
    // Check if it's a preset mix
    if (audioId.startsWith('mix_')) {
        const mixName = audioId.replace('mix_', '');
        // Add active class to the current preset button
        const presetButton = document.querySelector(`.sound-preset[data-preset="${mixName}"]`);
        if (presetButton) {
            presetButton.classList.add('active-preset');
        }
        
        if (mixName === 'random') {
            applyRandomMix();
        } else {
            applyPresetMix(mixName);
        }
        return;
    }
    
    // Handle single sound playback
    const audio = state.audioElements[audioId];
    if (!audio) return;
    
    // Set volume from range input
    const volumeControl = DOM.volumeControl;
    audio.volume = parseInt(volumeControl.value) / 100;
    
    // Play the audio
    audio.play().catch(error => {
        console.error('Error playing audio:', error);
    });
    
    // Update state
    state.currentAudio = audio;
}

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
    const presetMixes = {
        focus: {
            alpha: 80,
            whitenoise: 30,
            rain: 15
        },
        relaxation: {
            water: 70,
            birds: 40,
            wind: 20
        },
        sleep: {
            rain: 60,
            whitenoise: 40,
            wind: 15
        },
        nature: {
            birds: 70,
            water: 50,
            wind: 40,
            thunder: 10
        }
    };
    
    // First reset all sliders to 0
    document.querySelectorAll('.channel-slider').forEach(slider => {
        slider.value = 0;
        updateSliderValue(slider);
    });
    
    const mix = presetMixes[preset];
    if (mix) {
        Object.entries(mix).forEach(([sound, volume]) => {
            const audio = state.audioElements[sound];
            if (audio) {
                // Update slider position and value display
                const slider = document.querySelector(`.channel-slider[data-sound="${sound}"]`);
                if (slider) {
                    slider.value = volume;
                    updateSliderValue(slider);
                }
                
                const audioClone = new Audio(audio.src);
                audioClone.loop = true;
                audioClone.volume = volume / 100;
                audioClone.play().catch(error => {
                    console.error(`Error playing ${sound}:`, error);
                });
                state.activeSounds[sound] = audioClone;
            }
        });
    }
}

// Modify the applyRandomMix function to update slider positions
function applyRandomMix() {
    // First reset all sliders to 0
    document.querySelectorAll('.channel-slider').forEach(slider => {
        slider.value = 0;
        updateSliderValue(slider);
    });
    
    // Select 2-4 random sounds
    const allSounds = ['rain', 'birds', 'water', 'wind', 'whitenoise', 'thunder', 'bonfire', 'alpha'];
    const shuffled = [...allSounds].sort(() => 0.5 - Math.random());
    const selectedSounds = shuffled.slice(0, Math.floor(Math.random() * 3) + 2);
    
    // Play selected sounds at random volumes
    selectedSounds.forEach(sound => {
        const audio = state.audioElements[sound];
        if (audio) {
            // Generate random volume between 20 and 70
            const volume = Math.floor(Math.random() * 50 + 20);
            
            // Update slider position and value display
            const slider = document.querySelector(`.channel-slider[data-sound="${sound}"]`);
            if (slider) {
                slider.value = volume;
                updateSliderValue(slider);
            }
            
            const audioClone = new Audio(audio.src);
            audioClone.loop = true;
            audioClone.volume = volume / 100;
            audioClone.play().catch(error => {
                console.error(`Error playing ${sound}:`, error);
            });
            state.activeSounds[sound] = audioClone;
        }
    });
}

// Add this helper function if it doesn't exist
function updateSliderValue(slider) {
    const valueDisplay = slider.parentElement.querySelector('.channel-value');
    if (valueDisplay) {
        valueDisplay.textContent = `${slider.value}%`;
    }
}

// Modify the stopAudio function to reset sliders
function stopAudio() {
    // Stop local music if playing
    stopLocalMusic();
    
    // Stop single playing audio
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
        slider.value = 0;
        updateSliderValue(slider);
    });
    
    // Remove active class from all preset buttons
    document.querySelectorAll('.sound-preset').forEach(button => {
        button.classList.remove('active-preset');
    });
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
    setGlobalVolume(newVolumeValue / 100);
    updateMuteButtonIcon(newVolumeValue > 0);
}

// Decrease volume via button
function decreaseVolume() {
    const currentVolume = parseInt(DOM.volumeControl.value);
    const newVolumeValue = Math.max(currentVolume - 10, 0);
    DOM.volumeControl.value = newVolumeValue;
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
    setGlobalVolume(newVolume / 100);
    updateMuteButtonIcon(newVolume > 0);
}

// Helper to set volume for all playing sounds
function setGlobalVolume(volume) {
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
    const dataToSave = {
        tasks: state.tasks,
        completedTasks: state.completedTasks,
        canceledTasks: state.canceledTasks,
        soundPreferences: state.soundPreferences,
        stats: state.stats
    };
    
    localStorage.setItem('focusflow_data', JSON.stringify(dataToSave));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('focusflow_data');
    if (!savedData) return;
    
    try {
        const parsedData = JSON.parse(savedData);
        
        // Restore saved data
        state.tasks = parsedData.tasks || [];
        state.completedTasks = parsedData.completedTasks || [];
        state.canceledTasks = parsedData.canceledTasks || [];
        state.soundPreferences = parsedData.soundPreferences || {};
        state.stats = parsedData.stats || {
            todayFocusTime: 0,
            tasksCompleted: 0,
            soundUsage: {}
        };
        
        // Check if stats are from a previous day, reset if needed
        const lastSavedDate = new Date(state.stats.lastSaved || 0);
        const today = new Date();
        
        if (lastSavedDate.toDateString() !== today.toDateString()) {
            // Reset daily stats but keep total stats
            state.stats.todayFocusTime = 0;
            state.stats.lastSaved = Date.now();
        }
    } catch (error) {
        console.error('Error loading saved data:', error);
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

// Theme handling
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('i');

// Check for saved theme preference or system preference
const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Set initial theme
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
} else if (systemPrefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeIcon('dark');
}

// Theme toggle click handler
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

// Update theme icon
function updateThemeIcon(theme) {
    themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
    }
}); 

// Add these functions after the existing audio-related functions
function setupLocalMusicHandlers() {
    const dropZone = document.getElementById('local-music-drop-zone');
    const fileInput = document.getElementById('local-music-input');

    // Handle click to select files
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        handleLocalMusicFiles(e.target.files);
    });

    // Handle drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-500', 'dark:border-indigo-400');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-indigo-500', 'dark:border-indigo-400');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500', 'dark:border-indigo-400');
        handleLocalMusicFiles(e.dataTransfer.files);
    });
}

function handleLocalMusicFiles(files) {
    localMusicFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
    
    if (localMusicFiles.length > 0) {
        // Stop any currently playing sounds
        stopAudio();
        
        // Create or update the audio player
        if (!localMusicPlayer) {
            localMusicPlayer = new Audio();
            localMusicPlayer.addEventListener('ended', playNextLocalMusic);
        }
        
        // Set isLocalMusicPlaying to false initially
        isLocalMusicPlaying = false;
        
        // Update the sound name display
        document.getElementById('sound-name').textContent = `Loaded: ${localMusicFiles[0].name}`;
    }
}

function playLocalMusic(index) {
    if (!localMusicFiles[index]) return;
    
    const file = localMusicFiles[index];
    const reader = new FileReader();
    
    reader.onload = (e) => {
        localMusicPlayer.src = e.target.result;
        localMusicPlayer.play();
    };
    
    reader.readAsDataURL(file);
}

function playNextLocalMusic() {
    const currentIndex = localMusicFiles.findIndex(file => 
        localMusicPlayer.src.includes(file.name)
    );
    
    const nextIndex = (currentIndex + 1) % localMusicFiles.length;
    playLocalMusic(nextIndex);
}

function stopLocalMusic() {
    if (localMusicPlayer) {
        localMusicPlayer.pause();
        localMusicPlayer.currentTime = 0;
        isLocalMusicPlaying = false;
        document.getElementById('sound-name').textContent = '';
    }
}

// Add this function to handle sound controls collapse/expand
function setupSoundControlsCollapse() {
    const header = document.getElementById('sound-controls-header');
    const content = document.getElementById('sound-controls-content');
    const toggleButton = document.getElementById('toggle-sound-controls');
    const icon = toggleButton.querySelector('i');
    const toggleText = toggleButton.querySelector('span');

    // Set initial state to collapsed
    let isExpanded = false;
    content.style.maxHeight = '0';
    content.style.opacity = '0';
    icon.className = 'fas fa-chevron-up';
    toggleText.textContent = 'Show controls';

    function toggleControls() {
        isExpanded = !isExpanded;
        
        if (isExpanded) {
            content.style.maxHeight = 'none';
            content.style.opacity = '1';
            icon.className = 'fas fa-chevron-down';
            toggleText.textContent = 'Hide controls';
        } else {
            content.style.maxHeight = '0';
            content.style.opacity = '0';
            icon.className = 'fas fa-chevron-up';
            toggleText.textContent = 'Show controls';
        }
    }

    // Add click event to header and button
    header.addEventListener('click', (e) => {
        if (!e.target.closest('#toggle-sound-controls')) {
            toggleControls();
        }
    });
    toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleControls();
    });

    // Handle mobile view
    function handleMobileView() {
        // Keep collapsed on both mobile and desktop
        if (isExpanded) {
            toggleControls();
        }
    }

    // Initial check
    handleMobileView();

    // Listen for window resize
    window.addEventListener('resize', handleMobileView);
} 
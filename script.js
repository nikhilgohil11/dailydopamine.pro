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

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Preload audio files
    preloadAudioFiles();
    
    // Initialize the app
    initializeApp();
});

// Preload all audio files before showing the app
function preloadAudioFiles() {
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');
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
            loadingBar.style.width = `${progress}%`;
            loadingText.textContent = `${filesLoaded}/${AUDIO_FILES.length} files loaded`;
            
            // When all files are loaded, show the app
            if (filesLoaded === AUDIO_FILES.length) {
                setTimeout(() => {
                    document.getElementById('loading-screen').classList.add('fade-out');
                    setTimeout(() => {
                        document.getElementById('loading-screen').style.display = 'none';
                        document.getElementById('app-container').classList.remove('hidden');
                    }, 500);
                }, 500);
            }
        });
        
        // Handle loading errors
        audio.addEventListener('error', () => {
            console.error(`Error loading audio file: ${file.path}`);
            filesLoaded++;
            const progress = (filesLoaded / AUDIO_FILES.length) * 100;
            loadingBar.style.width = `${progress}%`;
            loadingText.textContent = `${filesLoaded}/${AUDIO_FILES.length} files loaded (Error with ${file.name})`;
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
}

// Set up all event listeners
function setupEventListeners() {
    // Task form submission
    document.getElementById('task-form').addEventListener('submit', handleTaskFormSubmit);
    
    // Timer control buttons
    document.getElementById('start-task').addEventListener('click', startTask);
    document.getElementById('pause-task').addEventListener('click', pauseTask);
    document.getElementById('resume-task').addEventListener('click', resumeTask);
    document.getElementById('finish-task').addEventListener('click', finishTask);
    document.getElementById('cancel-task').addEventListener('click', cancelTask);
    
    // Completion modal buttons
    document.getElementById('next-task-button').addEventListener('click', startNextTask);
    document.getElementById('take-break-button').addEventListener('click', startBreak);
    document.getElementById('end-session-button').addEventListener('click', endSession);
    
    // Break modal button
    document.getElementById('end-break-button').addEventListener('click', endBreak);
    
    // Stats modal
    document.getElementById('stats-button').addEventListener('click', toggleStatsModal);
    document.getElementById('close-stats').addEventListener('click', toggleStatsModal);
    
    // Audio controls
    document.getElementById('volume-control').addEventListener('input', adjustVolume);
    document.getElementById('volume-up').addEventListener('click', increaseVolume);
    document.getElementById('volume-down').addEventListener('click', decreaseVolume);
    document.getElementById('mute-button').addEventListener('click', toggleMute);
    
    // Add search functionality
    document.getElementById('task-search').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        const taskItems = document.querySelectorAll('.task-item');
        
        taskItems.forEach(item => {
            const taskName = item.querySelector('h3').textContent.toLowerCase();
            if (taskName.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Show/hide empty state message
        const visibleTasks = Array.from(taskItems).filter(item => item.style.display !== 'none');
        const emptyTaskList = document.getElementById('empty-task-list');
        
        if (visibleTasks.length === 0 && searchTerm !== '') {
            emptyTaskList.innerHTML = `
                <p>No tasks found matching "${searchTerm}"</p>
                <p class="text-sm mt-2">Try a different search term</p>
            `;
            emptyTaskList.classList.remove('hidden');
        } else if (visibleTasks.length === 0) {
            emptyTaskList.innerHTML = `
                <p>No tasks in queue</p>
                <p class="text-sm mt-2">Create tasks to get started</p>
            `;
            emptyTaskList.classList.remove('hidden');
        } else {
            emptyTaskList.classList.add('hidden');
        }
    });
}

// Handle task form submission
function handleTaskFormSubmit(e) {
    e.preventDefault();
    
    const taskName = document.getElementById('task-name').value.trim();
    const taskTime = parseInt(document.getElementById('task-time').value);
    const taskSound = document.getElementById('task-sound').value;
    
    if (!taskName || !taskTime) return;
    
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
    
    // Clear form
    document.getElementById('task-form').reset();
    
    // If this is the first task, suggest starting it
    if (state.tasks.length === 1 && !state.activeTaskId) {
        document.getElementById('active-task-name').textContent = newTask.name;
        setActiveTask(newTask.id);
    }
}

// Update the task list in the UI
function updateTaskList() {
    const taskList = document.getElementById('task-list');
    const emptyTaskList = document.getElementById('empty-task-list');
    
    // Clear current list
    taskList.innerHTML = '';
    
    if (state.tasks.length === 0 && state.completedTasks.length === 0 && state.canceledTasks.length === 0) {
        taskList.classList.add('hidden');
        emptyTaskList.classList.remove('hidden');
        return;
    }
    
    taskList.classList.remove('hidden');
    emptyTaskList.classList.add('hidden');
    
    // Add each active task to the list
    state.tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.classList.add('py-3', 'px-4', 'task-item');
        
        // Highlight active task
        if (task.id === state.activeTaskId) {
            li.classList.add('active');
        }
        
        li.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="min-w-0 flex-1">
                    <h3 class="font-medium ${task.id === state.activeTaskId ? 'text-indigo-700' : ''} truncate">${task.name}</h3>
                    <div class="flex items-center text-sm text-gray-500 mt-1">
                        <span class="mr-3"><i class="far fa-clock mr-1"></i>${task.duration} min</span>
                        ${task.sound !== 'none' ? `<span><i class="fas fa-volume-up mr-1"></i>${findAudioName(task.sound)}</span>` : ''}
                    </div>
                </div>
                <div class="flex items-center ml-4">
                    ${task.id !== state.activeTaskId ? `
                        <button class="start-button p-2 text-green-600 hover:text-green-800" data-id="${task.id}">
                            <i class="fas fa-play"></i>
                        </button>
                    ` : ''}
                    <button class="delete-button p-2 text-red-600 hover:text-red-800" data-id="${task.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
        
        taskList.appendChild(li);
    });
    
    // Add completed tasks section if there are any completed tasks
    if (state.completedTasks.length > 0) {
        const completedDivider = document.createElement('li');
        completedDivider.classList.add('py-2', 'px-4', 'bg-gray-100');
        completedDivider.innerHTML = `
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-500">Completed Tasks</h3>
            </div>
        `;
        taskList.appendChild(completedDivider);
        
        // Add recently completed tasks (limit to 5)
        state.completedTasks.slice(0, 5).forEach(task => {
            const li = document.createElement('li');
            li.classList.add('py-3', 'px-4', 'task-item', 'opacity-70');
            
            const date = new Date(task.completedAt);
            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            li.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="font-medium line-through text-gray-500">${task.name}</h3>
                        <div class="flex items-center text-sm text-gray-500 mt-1">
                            <span class="mr-3"><i class="far fa-check-circle mr-1"></i>Completed at ${timeString}</span>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <button class="delete-completed-button p-2 text-red-600 hover:text-red-800" data-id="${task.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            
            taskList.appendChild(li);
        });
    }
    
    // Add canceled tasks section if there are any canceled tasks
    if (state.canceledTasks.length > 0) {
        const canceledDivider = document.createElement('li');
        canceledDivider.classList.add('py-2', 'px-4', 'bg-gray-100');
        canceledDivider.innerHTML = `
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-500">Canceled Tasks</h3>
            </div>
        `;
        taskList.appendChild(canceledDivider);
        
        // Add recently canceled tasks (limit to 5)
        state.canceledTasks.slice(0, 5).forEach(task => {
            const li = document.createElement('li');
            li.classList.add('py-3', 'px-4', 'task-item', 'opacity-70');
            
            const date = new Date(task.canceledAt);
            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            li.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="font-medium text-gray-500"><i class="fas fa-ban text-red-500 mr-1"></i>${task.name}</h3>
                        <div class="flex items-center text-sm text-gray-500 mt-1">
                            <span class="mr-3"><i class="far fa-times-circle mr-1"></i>Canceled at ${timeString}</span>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <button class="delete-canceled-button p-2 text-red-600 hover:text-red-800" data-id="${task.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            
            taskList.appendChild(li);
        });
    }
    
    // Add event listeners to all buttons
    document.querySelectorAll('.start-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const taskId = e.currentTarget.getAttribute('data-id');
            setActiveTask(taskId);
        });
    });
    
    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const taskId = e.currentTarget.getAttribute('data-id');
            deleteTask(taskId);
        });
    });
    
    document.querySelectorAll('.delete-completed-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const taskId = e.currentTarget.getAttribute('data-id');
            deleteCompletedTask(taskId);
        });
    });
    
    document.querySelectorAll('.delete-canceled-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const taskId = e.currentTarget.getAttribute('data-id');
            deleteCanceledTask(taskId);
        });
    });
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
    if (!task) return;
    
    state.activeTaskId = taskId;
    
    // Update UI
    document.getElementById('no-task-message').classList.add('hidden');
    document.getElementById('active-task').classList.remove('hidden');
    const activeTaskName = document.getElementById('active-task-name');
    activeTaskName.textContent = task.name;
    activeTaskName.classList.add('break-words', 'whitespace-normal', 'overflow-wrap-anywhere', 'word-break-break-word');
    
    // Format time display
    state.remainingTime = task.duration * 60;
    updateTimerDisplay();
    
    // Configure audio
    if (task.sound !== 'none') {
        document.getElementById('sound-name').textContent = findAudioName(task.sound);
        document.getElementById('sound-name').parentElement.classList.remove('hidden');
    } else {
        document.getElementById('sound-name').parentElement.classList.add('hidden');
    }
    
    // Reset buttons
    document.getElementById('start-task').classList.remove('hidden');
    document.getElementById('pause-task').classList.add('hidden');
    document.getElementById('resume-task').classList.add('hidden');
    
    // Update task list highlighting
    updateTaskList();
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
    document.getElementById('no-task-message').classList.remove('hidden');
    document.getElementById('active-task').classList.add('hidden');
    
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
    
    // Update UI buttons
    document.getElementById('start-task').classList.add('hidden');
    document.getElementById('pause-task').classList.remove('hidden');
    document.getElementById('resume-task').classList.add('hidden');
    
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
    const timerBar = document.getElementById('timer-bar');
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
    
    // Stop all audio when paused
    stopAudio();
    
    // Update UI
    document.getElementById('pause-task').classList.add('hidden');
    document.getElementById('resume-task').classList.remove('hidden');
}

// Resume the paused task
function resumeTask() {
    if (!state.isPaused) return;
    
    // Resume audio
    if (state.currentAudio) {
        state.currentAudio.play();
    }
    
    // Update UI
    document.getElementById('resume-task').classList.add('hidden');
    document.getElementById('pause-task').classList.remove('hidden');
    
    // Restart timer
    startTask();
}

// Finish the current task
function finishTask() {
    if (!state.activeTaskId) return;
    
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
    const nextTask = state.tasks[currentIndex + 1];
    
    // Remove current task from list
    state.tasks = state.tasks.filter(task => task.id !== state.activeTaskId);
    
    // Clear active task
    clearActiveTask();
    
    // Set next task as active if available
    if (nextTask) {
        setActiveTask(nextTask.id);
    }
    
    // Save and update UI
    saveToLocalStorage();
    updateTaskList();
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
    
    // Remove from task list
    state.tasks = state.tasks.filter(t => t.id !== state.activeTaskId);
    
    // Show completion modal
    document.getElementById('completed-task-name').textContent = task.name;
    document.getElementById('completion-modal').classList.remove('hidden');
    
    // Create confetti effect
    createConfetti();
    
    // Update UI
    updateTaskList();
    updateStats();
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
    document.getElementById('completion-modal').classList.add('hidden');
    
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
    document.getElementById('completion-modal').classList.add('hidden');
    
    // Clear active task view
    clearActiveTask();
    
    // Show break modal
    document.getElementById('break-modal').classList.remove('hidden');
    
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
    document.getElementById('break-timer').textContent = 
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
    document.getElementById('break-modal').classList.add('hidden');
    
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
    document.getElementById('completion-modal').classList.add('hidden');
    
    // Clear active task
    clearActiveTask();
}

// Toggle stats modal
function toggleStatsModal() {
    const modal = document.getElementById('stats-modal');
    modal.classList.toggle('hidden');
    
    if (!modal.classList.contains('hidden')) {
        updateStats();
    }
}

// Update stats display
function updateStats() {
    document.getElementById('today-focus-time').textContent = `${state.stats.todayFocusTime} minutes`;
    document.getElementById('tasks-completed').textContent = `${state.stats.tasksCompleted} tasks`;
    
    // Most used sound
    let mostUsedSound = 'None';
    let maxCount = 0;
    
    for (const [sound, count] of Object.entries(state.stats.soundUsage)) {
        if (count > maxCount) {
            maxCount = count;
            mostUsedSound = findAudioName(sound);
        }
    }
    
    document.getElementById('most-used-sound').textContent = mostUsedSound;
    
    // Recent tasks
    const recentTasksList = document.getElementById('recent-tasks-list');
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
    document.getElementById('timer-display').textContent = 
        `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Audio control functions
function playAudio(audioId) {
    // Stop current audio if playing
    stopAudio();
    
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
    const volumeControl = document.getElementById('volume-control');
    audio.volume = parseInt(volumeControl.value) / 100;
    
    // Play the audio
    audio.play().catch(error => {
        console.error('Error playing audio:', error);
    });
    
    // Update state
    state.currentAudio = audio;
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

// Adjust volume
function adjustVolume() {
    const volume = parseInt(this.value) / 100;
    
    // Adjust volume for single sound
    if (state.currentAudio) {
        state.currentAudio.volume = volume;
    }
    
    // Adjust volume for mixed sounds
    Object.values(state.activeSounds).forEach(audio => {
        // Maintain relative volumes for mixed sounds
        const relativeVolume = audio._baseVolume || 1;
        audio.volume = volume * relativeVolume;
    });
}

// Increase volume
function increaseVolume() {
    const volumeControl = document.getElementById('volume-control');
    const currentVolume = parseInt(volumeControl.value);
    const newVolume = Math.min(currentVolume + 10, 100);
    volumeControl.value = newVolume;
    
    // Apply new volume
    const volume = newVolume / 100;
    
    // Adjust volume for single sound
    if (state.currentAudio) {
        state.currentAudio.volume = volume;
    }
    
    // Adjust volume for mixed sounds
    Object.values(state.activeSounds).forEach(audio => {
        const relativeVolume = audio._baseVolume || 1;
        audio.volume = volume * relativeVolume;
    });
}

// Decrease volume
function decreaseVolume() {
    const volumeControl = document.getElementById('volume-control');
    const currentVolume = parseInt(volumeControl.value);
    const newVolume = Math.max(currentVolume - 10, 0);
    volumeControl.value = newVolume;
    
    // Apply new volume
    const volume = newVolume / 100;
    
    // Adjust volume for single sound
    if (state.currentAudio) {
        state.currentAudio.volume = volume;
    }
    
    // Adjust volume for mixed sounds
    Object.values(state.activeSounds).forEach(audio => {
        const relativeVolume = audio._baseVolume || 1;
        audio.volume = volume * relativeVolume;
    });
}

// Toggle mute
function toggleMute() {
    const volumeControl = document.getElementById('volume-control');
    const muteButton = this;
    
    // Handle single audio
    if (state.currentAudio) {
        if (state.currentAudio.volume > 0) {
            state.currentAudio._previousVolume = state.currentAudio.volume;
            state.currentAudio.volume = 0;
            volumeControl.value = 0;
        } else {
            const previousVolume = state.currentAudio._previousVolume || 0.5;
            state.currentAudio.volume = previousVolume;
            volumeControl.value = previousVolume * 100;
        }
    }
    
    // Handle mixed sounds
    if (Object.keys(state.activeSounds).length > 0) {
        const firstSound = Object.values(state.activeSounds)[0];
        if (firstSound.volume > 0) {
            // Store current volumes and mute
            Object.values(state.activeSounds).forEach(audio => {
                audio._previousVolume = audio.volume;
                audio.volume = 0;
            });
            volumeControl.value = 0;
        } else {
            // Restore previous volumes
            Object.values(state.activeSounds).forEach(audio => {
                const previousVolume = audio._previousVolume || audio._baseVolume || 0.5;
                audio.volume = previousVolume;
            });
            volumeControl.value = 50; // Reset to 50% when unmuting
        }
    }
    
    // Toggle mute icon
    if (volumeControl.value > 0) {
        muteButton.querySelector('i').classList.remove('fa-volume-up');
        muteButton.querySelector('i').classList.add('fa-volume-mute');
    } else {
        muteButton.querySelector('i').classList.remove('fa-volume-mute');
        muteButton.querySelector('i').classList.add('fa-volume-up');
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
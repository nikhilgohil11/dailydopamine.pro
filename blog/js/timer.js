class Timer {
    constructor() {
        this.startTime = null;
        this.elapsedTime = 0;
        this.isRunning = false;
        this.callbacks = new Set();
        this.lastUpdateTime = 0;
    }

    start() {
        if (!this.isRunning) {
            this.startTime = performance.now();
            this.isRunning = true;
            this.update();
        }
    }

    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            this.elapsedTime += performance.now() - this.startTime;
        }
    }

    reset() {
        this.stop();
        this.elapsedTime = 0;
        this.startTime = null;
        this.notifyCallbacks();
    }

    getTime() {
        if (!this.isRunning) {
            return this.elapsedTime;
        }
        return this.elapsedTime + (performance.now() - this.startTime);
    }

    onTick(callback) {
        this.callbacks.add(callback);
    }

    removeCallback(callback) {
        this.callbacks.delete(callback);
    }

    notifyCallbacks() {
        const currentTime = this.getTime();
        this.callbacks.forEach(callback => callback(currentTime));
    }

    update() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        // Only update if at least 16ms (roughly 60fps) has passed
        if (currentTime - this.lastUpdateTime >= 16) {
            this.notifyCallbacks();
            this.lastUpdateTime = currentTime;
        }

        requestAnimationFrame(() => this.update());
    }
}

// Example usage:
const timer = new Timer();

// Format time in MM:SS format
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Export for use in other files
window.Timer = Timer;
window.formatTime = formatTime; 
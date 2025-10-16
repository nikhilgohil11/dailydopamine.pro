// Sync Manager for Daily Dopamine Pro
class SyncManager {
  constructor() {
    this.pendingOperations = [];
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncListeners = [];
    this.conflictResolutionStrategy = 'server_wins'; // or 'client_wins', 'manual'
  }

  async init() {
    // Load pending operations from localStorage
    this.loadPendingOperations();
    
    // Set up periodic sync
    this.setupPeriodicSync();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.syncPendingOperations();
    });
  }

  async syncFromSupabase() {
    if (!window.supabaseConfig || !window.supabaseConfig.supabase || !window.authManager.isLoggedIn()) {
      return { success: false, message: 'Not logged in or Supabase not configured' };
    }

    try {
      this.isSyncing = true;
      this.notifyListeners('sync_start');

      const userId = window.authManager.getUserId();
      const supabase = window.supabaseConfig.supabase;

      // Fetch all user data
      const [tasksResult, completedTasksResult, canceledTasksResult, statsResult] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('completed_tasks').select('*').eq('user_id', userId).order('completed_at', { ascending: false }),
        supabase.from('canceled_tasks').select('*').eq('user_id', userId).order('canceled_at', { ascending: false }),
        supabase.from('user_stats').select('*').eq('user_id', userId).single()
      ]);

      // Check for errors
      const errors = [tasksResult.error, completedTasksResult.error, canceledTasksResult.error, statsResult.error].filter(Boolean);
      if (errors.length > 0) {
        throw new Error(`Database errors: ${errors.map(e => e.message).join(', ')}`);
      }

      // Update local state
      if (window.state) {
        window.state.tasks = tasksResult.data || [];
        window.state.completedTasks = completedTasksResult.data || [];
        window.state.canceledTasks = canceledTasksResult.data || [];
        
        if (statsResult.data) {
          window.state.stats = {
            todayFocusTime: statsResult.data.today_focus_time || 0,
            tasksCompleted: statsResult.data.tasks_completed || 0,
            soundUsage: statsResult.data.sound_usage || {}
          };
        }

        // Update UI
        if (window.updateTaskList) window.updateTaskList();
        if (window.updateStats) window.updateStats();
      }

      this.lastSyncTime = Date.now();
      this.notifyListeners('sync_complete', { source: 'supabase' });
      
      return { success: true, message: 'Data synced from cloud' };
    } catch (error) {
      console.error('Sync from Supabase error:', error);
      this.notifyListeners('sync_error', error);
      return { success: false, message: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  async syncToSupabase() {
    if (!window.supabaseConfig || !window.supabaseConfig.supabase || !window.authManager.isLoggedIn()) {
      return { success: false, message: 'Not logged in or Supabase not configured' };
    }

    if (!window.supabaseConfig.isOnline()) {
      // Queue operations for later
      this.queueOperation('full_sync');
      return { success: true, message: 'Queued for sync when online' };
    }

    try {
      this.isSyncing = true;
      this.notifyListeners('sync_start');

      const userId = window.authManager.getUserId();
      const supabase = window.supabaseConfig.supabase;

      if (!window.state) {
        throw new Error('No state data to sync');
      }

      // Sync tasks
      await this.syncTable('tasks', window.state.tasks, userId, supabase);
      
      // Sync completed tasks
      await this.syncTable('completed_tasks', window.state.completedTasks, userId, supabase);
      
      // Sync canceled tasks
      await this.syncTable('canceled_tasks', window.state.canceledTasks, userId, supabase);
      
      // Sync stats
      await this.syncUserStats(userId, supabase);

      this.lastSyncTime = Date.now();
      this.notifyListeners('sync_complete', { source: 'local' });
      
      return { success: true, message: 'Data synced to cloud' };
    } catch (error) {
      console.error('Sync to Supabase error:', error);
      this.notifyListeners('sync_error', error);
      return { success: false, message: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  async syncTable(tableName, localData, userId, supabase) {
    if (!localData || localData.length === 0) return;

    // Get existing data from server
    const { data: serverData, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    // Create maps for easier comparison
    const serverMap = new Map((serverData || []).map(item => [item.id, item]));
    const localMap = new Map(localData.map(item => [item.id, item]));

    // Find items to insert, update, or delete
    const toInsert = [];
    const toUpdate = [];
    const toDelete = [];

    // Check local items
    for (const [id, localItem] of localMap) {
      const serverItem = serverMap.get(id);
      
      if (!serverItem) {
        // Item doesn't exist on server, insert it
        toInsert.push({
          ...localItem,
          user_id: userId,
          updated_at: Date.now()
        });
      } else if (this.hasChanges(localItem, serverItem)) {
        // Item exists but has changes, update it
        toUpdate.push({
          ...localItem,
          user_id: userId,
          updated_at: Date.now()
        });
      }
    }

    // Check server items for deletions
    for (const [id, serverItem] of serverMap) {
      if (!localMap.has(id)) {
        toDelete.push(id);
      }
    }

    // Execute operations
    if (toInsert.length > 0) {
      const { error } = await supabase.from(tableName).insert(toInsert);
      if (error) throw error;
    }

    if (toUpdate.length > 0) {
      for (const item of toUpdate) {
        const { error } = await supabase
          .from(tableName)
          .update(item)
          .eq('id', item.id)
          .eq('user_id', userId);
        if (error) throw error;
      }
    }

    if (toDelete.length > 0) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .in('id', toDelete)
        .eq('user_id', userId);
      if (error) throw error;
    }
  }

  async syncUserStats(userId, supabase) {
    if (!window.state || !window.state.stats) return;

    const statsData = {
      user_id: userId,
      today_focus_time: window.state.stats.todayFocusTime || 0,
      tasks_completed: window.state.stats.tasksCompleted || 0,
      sound_usage: window.state.stats.soundUsage || {},
      updated_at: Date.now()
    };

    const { error } = await supabase
      .from('user_stats')
      .upsert(statsData, { onConflict: 'user_id' });

    if (error) throw error;
  }

  hasChanges(localItem, serverItem) {
    // Compare relevant fields (exclude updated_at)
    const fieldsToCompare = ['name', 'duration', 'sound', 'created_at'];
    
    for (const field of fieldsToCompare) {
      if (localItem[field] !== serverItem[field]) {
        return true;
      }
    }
    
    return false;
  }

  async migrateLocalDataToSupabase() {
    if (!window.supabaseConfig || !window.supabaseConfig.supabase || !window.authManager.isLoggedIn()) {
      return { success: false, message: 'Not logged in or Supabase not configured' };
    }

    try {
      // Get local data
      const localData = this.getLocalStorageData();
      
      if (!localData || (!localData.tasks?.length && !localData.completedTasks?.length && !localData.canceledTasks?.length)) {
        return { success: true, message: 'No local data to migrate' };
      }

      // Upload to Supabase
      const userId = window.authManager.getUserId();
      const supabase = window.supabaseConfig.supabase;

      // Upload tasks
      if (localData.tasks?.length > 0) {
        const tasksWithUserId = localData.tasks.map(task => ({
          ...task,
          user_id: userId,
          updated_at: Date.now()
        }));
        
        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksWithUserId);
        
        if (tasksError) throw tasksError;
      }

      // Upload completed tasks
      if (localData.completedTasks?.length > 0) {
        const completedWithUserId = localData.completedTasks.map(task => ({
          ...task,
          user_id: userId,
          updated_at: Date.now()
        }));
        
        const { error: completedError } = await supabase
          .from('completed_tasks')
          .insert(completedWithUserId);
        
        if (completedError) throw completedError;
      }

      // Upload canceled tasks
      if (localData.canceledTasks?.length > 0) {
        const canceledWithUserId = localData.canceledTasks.map(task => ({
          ...task,
          user_id: userId,
          updated_at: Date.now()
        }));
        
        const { error: canceledError } = await supabase
          .from('canceled_tasks')
          .insert(canceledWithUserId);
        
        if (canceledError) throw canceledError;
      }

      // Upload stats
      if (localData.stats) {
        const statsData = {
          user_id: userId,
          today_focus_time: localData.stats.todayFocusTime || 0,
          tasks_completed: localData.stats.tasksCompleted || 0,
          sound_usage: localData.stats.soundUsage || {},
          updated_at: Date.now()
        };

        const { error: statsError } = await supabase
          .from('user_stats')
          .upsert(statsData, { onConflict: 'user_id' });
        
        if (statsError) throw statsError;
      }

      // Clear local storage after successful migration
      this.clearLocalStorageData();

      return { success: true, message: 'Local data migrated successfully' };
    } catch (error) {
      console.error('Migration error:', error);
      return { success: false, message: error.message };
    }
  }

  getLocalStorageData() {
    try {
      const savedData = localStorage.getItem('focusflow_data');
      return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
      console.error('Error loading local data:', error);
      return null;
    }
  }

  clearLocalStorageData() {
    try {
      localStorage.removeItem('focusflow_data');
    } catch (error) {
      console.error('Error clearing local data:', error);
    }
  }

  queueOperation(operation) {
    this.pendingOperations.push({
      operation,
      timestamp: Date.now(),
      data: operation === 'full_sync' ? this.getLocalStorageData() : null
    });
    
    this.savePendingOperations();
  }

  async syncPendingOperations() {
    if (this.pendingOperations.length === 0 || !window.supabaseConfig.isOnline()) {
      return;
    }

    console.log(`Syncing ${this.pendingOperations.length} pending operations`);
    
    try {
      await this.syncToSupabase();
      this.pendingOperations = [];
      this.savePendingOperations();
    } catch (error) {
      console.error('Error syncing pending operations:', error);
    }
  }

  loadPendingOperations() {
    try {
      const saved = localStorage.getItem('focusflow_pending_operations');
      this.pendingOperations = saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading pending operations:', error);
      this.pendingOperations = [];
    }
  }

  savePendingOperations() {
    try {
      localStorage.setItem('focusflow_pending_operations', JSON.stringify(this.pendingOperations));
    } catch (error) {
      console.error('Error saving pending operations:', error);
    }
  }

  setupPeriodicSync() {
    // Sync every 5 minutes when online
    setInterval(() => {
      if (window.supabaseConfig.isOnline() && window.authManager.isLoggedIn()) {
        this.syncToSupabase();
      }
    }, 5 * 60 * 1000);
  }

  addSyncListener(callback) {
    this.syncListeners.push(callback);
  }

  removeSyncListener(callback) {
    this.syncListeners = this.syncListeners.filter(listener => listener !== callback);
  }

  notifyListeners(event, data) {
    this.syncListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  getLastSyncTime() {
    return this.lastSyncTime;
  }

  isCurrentlySyncing() {
    return this.isSyncing;
  }

  getPendingOperationsCount() {
    return this.pendingOperations.length;
  }
}

// Create global instance
window.syncManager = new SyncManager();

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncManager;
}

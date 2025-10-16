// Supabase Configuration
// Load configuration from config.js
const SUPABASE_URL = window.appConfig?.supabase?.url || 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = window.appConfig?.supabase?.anonKey || 'YOUR_SUPABASE_ANON_KEY_HERE';

// Initialize Supabase client
let supabase = null;
let isOnline = navigator.onLine;

// Initialize Supabase if credentials are provided
if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE') {
  try {
    supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    supabase = null;
  }
} else {
  console.warn('Supabase credentials not provided. Running in guest mode only.');
}

// Monitor online/offline status
window.addEventListener('online', () => {
  isOnline = true;
  console.log('Connection restored');
  // Trigger sync when back online
  if (window.syncManager) {
    window.syncManager.syncPendingOperations();
  }
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('Connection lost');
});

// Export configuration
window.supabaseConfig = {
  supabase,
  isOnline: () => isOnline,
  isConfigured: () => supabase !== null
};

// For module compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabase, isOnline: () => isOnline };
}

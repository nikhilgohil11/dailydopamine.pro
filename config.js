// Configuration for Daily Dopamine Pro
// This file handles environment variables and configuration

const config = {
    // Supabase configuration
    supabase: {
        url: 'YOUR_SUPABASE_URL_HERE',
        anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE'
    },
    
    // App configuration
    app: {
        name: 'Daily Dopamine Pro',
        version: '2.0.0',
        debug: false
    },
    
    // Sync configuration
    sync: {
        interval: 5 * 60 * 1000, // 5 minutes
        retryAttempts: 3,
        retryDelay: 1000 // 1 second
    },
    
    // Auth configuration
    auth: {
        minPasswordLength: 6,
        sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// Load configuration from environment variables if available
if (typeof process !== 'undefined' && process.env) {
    config.supabase.url = process.env.SUPABASE_URL || config.supabase.url;
    config.supabase.anonKey = process.env.SUPABASE_ANON_KEY || config.supabase.anonKey;
    config.app.debug = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} else {
    window.appConfig = config;
}

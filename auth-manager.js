// Authentication Manager for Daily Dopamine Pro
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
    this.authListeners = [];
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      // Check if Supabase is available
      if (!window.supabaseConfig || !window.supabaseConfig.supabase) {
        console.log('Supabase not configured, running in guest mode');
        this.isInitialized = true;
        return;
      }

      const supabase = window.supabaseConfig.supabase;
      
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        this.isInitialized = true;
        return;
      }

      if (session) {
        this.currentUser = session.user;
        console.log('User already logged in:', this.currentUser.email);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
          this.currentUser = session.user;
          this.notifyListeners('login', this.currentUser);
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.notifyListeners('logout', null);
        }
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize auth manager:', error);
      this.isInitialized = true;
    }
  }

  async signUp(email, password) {
    if (!window.supabaseConfig || !window.supabaseConfig.supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await window.supabaseConfig.supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user && !data.user.email_confirmed_at) {
        return {
          success: true,
          message: 'Please check your email to confirm your account before logging in.',
          needsConfirmation: true
        };
      }

      this.currentUser = data.user;
      return {
        success: true,
        message: 'Account created successfully!',
        user: data.user
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  async signIn(email, password) {
    if (!window.supabaseConfig || !window.supabaseConfig.supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await window.supabaseConfig.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      this.currentUser = data.user;
      return {
        success: true,
        message: 'Logged in successfully!',
        user: data.user
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  async signOut() {
    if (!window.supabaseConfig || !window.supabaseConfig.supabase) {
      this.currentUser = null;
      return { success: true, message: 'Logged out successfully!' };
    }

    try {
      const { error } = await window.supabaseConfig.supabase.auth.signOut();
      
      if (error) throw error;

      this.currentUser = null;
      return { success: true, message: 'Logged out successfully!' };
    } catch (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  async resetPassword(email) {
    if (!window.supabaseConfig || !window.supabaseConfig.supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { error } = await window.supabaseConfig.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Password reset email sent! Check your inbox.'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return this.currentUser !== null;
  }

  isGuest() {
    return !this.isLoggedIn();
  }

  getUserEmail() {
    return this.currentUser?.email || null;
  }

  getUserId() {
    return this.currentUser?.id || null;
  }

  addAuthListener(callback) {
    this.authListeners.push(callback);
  }

  removeAuthListener(callback) {
    this.authListeners = this.authListeners.filter(listener => listener !== callback);
  }

  notifyListeners(event, user) {
    this.authListeners.forEach(listener => {
      try {
        listener(event, user);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  getErrorMessage(error) {
    const errorMessages = {
      'Invalid login credentials': 'Invalid email or password',
      'User already registered': 'An account with this email already exists',
      'Password should be at least 6 characters': 'Password must be at least 6 characters long',
      'Invalid email': 'Please enter a valid email address',
      'Email not confirmed': 'Please check your email and click the confirmation link',
      'Too many requests': 'Too many attempts. Please try again later.',
      'Network request failed': 'Network error. Please check your connection.',
    };

    return errorMessages[error.message] || error.message || 'An unexpected error occurred';
  }
}

// Create global instance
window.authManager = new AuthManager();

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}

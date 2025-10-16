# Supabase Setup Instructions for Daily Dopamine Pro

This guide will help you set up Supabase authentication and database for Daily Dopamine Pro.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A new Supabase project created

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `daily-dopamine-pro` (or your preferred name)
   - Database Password: Generate a strong password
   - Region: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (usually 2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 3: Update Configuration

1. Open `config.js` in your project
2. Replace the placeholder values:

```javascript
const config = {
    supabase: {
        url: 'https://your-project-id.supabase.co', // Replace with your Project URL
        anonKey: 'eyJ...' // Replace with your anon public key
    },
    // ... rest of config
};
```

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the following SQL:

```sql
-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  sound TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Completed tasks table
CREATE TABLE completed_tasks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  sound TEXT,
  created_at BIGINT,
  completed_at BIGINT NOT NULL,
  updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Canceled tasks table
CREATE TABLE canceled_tasks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  sound TEXT,
  created_at BIGINT,
  canceled_at BIGINT NOT NULL,
  updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- User stats table
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  today_focus_time INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  sound_usage JSONB DEFAULT '{}',
  last_reset_date DATE DEFAULT CURRENT_DATE,
  updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE canceled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for completed_tasks
CREATE POLICY "Users can view own completed tasks" ON completed_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completed tasks" ON completed_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own completed tasks" ON completed_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own completed tasks" ON completed_tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for canceled_tasks
CREATE POLICY "Users can view own canceled tasks" ON canceled_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own canceled tasks" ON canceled_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own canceled tasks" ON canceled_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own canceled tasks" ON canceled_tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_stats
CREATE POLICY "Users can view own stats" ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON user_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own stats" ON user_stats FOR DELETE USING (auth.uid() = user_id);
```

4. Click "Run" to execute the SQL

## Step 5: Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, add your domain (e.g., `https://yourdomain.com` or `http://localhost:3000` for development)
3. Under **Redirect URLs**, add:
   - `https://yourdomain.com` (or your production URL)
   - `http://localhost:3000` (for development)
4. Save the settings

## Step 6: Test the Integration

1. Open your Daily Dopamine Pro app
2. Click the user icon in the header
3. Click "Login / Sign Up"
4. Try creating a new account
5. Verify that tasks are being saved and synced

## Troubleshooting

### Common Issues

1. **"Supabase not configured" error**
   - Check that your `config.js` has the correct URL and anon key
   - Ensure there are no extra spaces or quotes around the values

2. **"Invalid login credentials" error**
   - Make sure the user exists in Supabase Auth
   - Check that email confirmation is not required (or confirm the email)

3. **"Failed to sync" error**
   - Check that the database tables were created correctly
   - Verify that RLS policies are in place
   - Check the browser console for detailed error messages

4. **Tasks not appearing after login**
   - Check that the user_id is being set correctly
   - Verify that the sync is working by checking the Network tab in browser dev tools

### Debug Mode

To enable debug logging, set `debug: true` in your `config.js`:

```javascript
const config = {
    app: {
        debug: true
    }
    // ... rest of config
};
```

This will show detailed logs in the browser console.

## Security Notes

- The anon key is safe to use in client-side code
- Row Level Security (RLS) ensures users can only access their own data
- Never expose your service role key in client-side code
- Consider setting up additional security policies if needed

## Production Deployment

When deploying to production:

1. Update the Site URL in Supabase to your production domain
2. Add your production domain to Redirect URLs
3. Consider setting up custom SMTP for email authentication
4. Monitor usage in the Supabase dashboard
5. Set up proper backup strategies

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Supabase project is active and not paused
3. Check the Supabase logs in the dashboard
4. Ensure all SQL policies were created successfully

For more help, refer to the [Supabase documentation](https://supabase.com/docs) or create an issue in the project repository.

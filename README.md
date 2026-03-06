# FocusFlow - Task Management for ADHD

FocusFlow is a browser-based task management application designed specifically for people with ADHD, combining to-do list functionality with ambient audio to enhance focus and productivity.

## Features

- **Task Management**: Create, edit, and delete tasks with custom time durations
- **Focus Timer**: Start a countdown timer for each task with pause/resume functionality
- **Ambient Audio**: 10 preloaded background soundscapes to help maintain focus
- **Task Completion**: Celebration animations upon task completion
- **Statistics**: View your productivity stats and task history
- **Local Storage**: All data is stored locally in your browser
- **Sign In / Sync**: Optional account to sync tasks across devices (Supabase)
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

1. **Add Tasks**: Enter task name and duration in the create task form
2. **Select Background Sound**: Choose from 10 different ambient sounds
3. **Start Task**: Click on a task to make it active, then press the Start button
4. **Complete Tasks**: When a task timer completes, choose to:
   - Start the next scheduled task
   - Take a break (with optional timer)
   - End the session

## Installation

As a browser-based application, FocusFlow requires no installation. Simply open the `index.html` file in any modern web browser.

### Running Locally

1. Clone or download this repository
2. (Optional) Copy `config.sample.js` to `config.js` and add your Supabase URL and anon key for auth and cloud sync
3. Run `supabase-schema.sql` in your Supabase project to create the `task_state` table
4. For password reset: add your app URL (e.g. `http://localhost:3000` or `https://yoursite.com`) to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
5. Open `index.html` in your browser
6. Start adding and completing tasks!

## Audio Credits

The application includes various ambient audio tracks:

- Rain
- Birds
- Water
- Wind
- White Noise
- Thunder
- Bonfire
- Gong
- Cafe Chatter
- Alpha Waves

## Technical Details

- Built with HTML5, CSS3, and JavaScript
- [Audio & Media (Local Music, YouTube) – Technical Overview](docs/AUDIO-AND-MEDIA.md)
- Uses LocalStorage API for data persistence
- Optional Supabase for auth and cloud sync (tasks, stats)
- HTML5 Audio API for sound management

## Designed For

- Knowledge workers seeking to improve focus
- Students managing study sessions
- Anyone utilizing time management techniques
- Individuals who benefit from ambient sound while working
- People with ADHD who want to finish tasks one at a time without distraction

## Browser Support

Compatible with all modern browsers, including Chrome, Firefox, Safari, and Edge. 
# Fixed Ops Tracker — Corrected Supabase Cloud Save Version

This corrected version keeps the clean Fixed Ops Tracker layout and saves daily entries in Supabase.

## Files

- `index.html` — must stay as the website shell.
- `src/main.jsx` — loads React and CSS.
- `src/App.jsx` — app logic and Supabase saving.
- `src/style.css` — styling only.
- `supabase-setup.sql` — database setup.

## Vercel Environment Variables

Add these in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then redeploy.

# Fixed Ops Tracker — Supabase Cloud Save Version

This version saves dealer entries to Supabase instead of only saving inside the browser.

## Files

- `src/App.jsx` — Main tracker app with Supabase save/load.
- `src/style.css` — Styling.
- `supabase-setup.sql` — Paste this into Supabase SQL Editor to create the tables.
- `package.json` — Includes `@supabase/supabase-js`.

## Required Vercel Environment Variables

Add these in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then redeploy.

## Demo Logins

- Director: `richard` / `director123`
- Honda of Pasadena: `pasadena` / `pasadena123`
- CDJR Hyundai Seattle: `seattle` / `seattle123`
- El Cajon Ford: `elcajon` / `elcajon123`
- Brandon Ford: `brandon` / `brandon123`
- Friendly Ford: `friendly` / `friendly123`

## Important

This is a simple prototype database setup. Passwords are stored in a plain text table for ease of use in the demo. For a production version, use Supabase Auth and stronger security rules.
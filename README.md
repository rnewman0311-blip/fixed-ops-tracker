# Fixed Ops Tracker — Original Format with Supabase Cloud Save

This version keeps the original polished tracker layout and adds Supabase cloud saving.

## Required Vercel Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Correct GitHub Structure

```
fixed-ops-tracker/
├─ index.html
├─ package.json
├─ README.md
├─ postcss.config.js
├─ tailwind.config.js
├─ supabase-setup.sql
└─ src/
   ├─ App.jsx
   ├─ main.jsx
   └─ style.css
```

Do not place `App.jsx` or `style.css` at the root level.

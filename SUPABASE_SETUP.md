# Supabase Setup (ScolaMia.it)

## 1. Create project
- Create a Supabase project.
- Open SQL Editor and run `supabase/schema.sql`.

## 2. Create admin user
- In Authentication > Users, create an admin email/password user.
- In Authentication > Providers, disable public signups if desired.

## 3. Configure frontend keys
Edit:
- `assets/js/supabase-config.js`

Set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 4. Deploy
Push changes to GitHub Pages repository.

## 5. Verify
- Open `admin.html`
- Login with Supabase admin credentials
- Create article/event
- Check sync from another browser/device

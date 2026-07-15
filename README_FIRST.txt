GROCERYSAVER CLEAN FINAL BUILD

UPLOAD TO GITHUB
1. Extract this ZIP.
2. Open the extracted folder.
3. Upload the CONTENTS so index.html is visible at the repository root.
4. Do not upload this ZIP file itself.
5. Do not add netlify.toml.

NETLIFY
- Base directory: blank
- Build command: blank
- Publish directory: .

SUPABASE
The URL and publishable key are already configured in:
js/app-config.js

The schema is:
data/supabase-schema.sql

Required Supabase settings:
- Anonymous sign-ins enabled.
- Your profile has is_admin = true.

ADMIN
Open:
https://YOUR-SITE.netlify.app/admin.html

Before login, only the login card appears.
After login, the database tools appear.

SYNC
Supabase is the catalog source of truth.
Admin product, price and alias changes are written to Supabase first.
Customer devices refresh on open, focus, visibility changes and realtime events.

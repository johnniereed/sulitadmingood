# Sulit release readiness

This package is an installable responsive PWA with an app manifest, service worker, standalone display mode, safe-area support, mobile navigation, and an application icon.

## Before public launch
1. Run `data/supabase-schema.sql` and `data/SULIT_V2_RECEIPT_ADMIN_PATCH.sql` in Supabase.
2. Confirm Supabase URL and anonymous key in `js/app-config.js`.
3. Test receipt upload on iPhone Safari and Android Chrome with real Walmart, No Frills, and Superstore receipts.
4. Replace browser OCR with a server-side OCR provider before relying on receipt extraction in production.
5. Add final Privacy Policy, Terms of Service, support email, analytics consent, and account deletion workflow.

## Native App Store submission
The current build can be installed as a PWA. Apple App Store and Google Play submission still require wrapping the web build in Capacitor (or rebuilding in React Native/Flutter), generating signed native projects, store screenshots, privacy declarations, and review credentials.

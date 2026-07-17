GROCERYSAVER FULL PROTOTYPE

FLOW
Home -> List -> Stores -> Plans -> Route -> Savings

HOW TO OPEN
1. Extract the ZIP.
2. Open the folder in VS Code.
3. Right-click index.html.
4. Choose Open with Live Server.

IMPORTANT
- Route requires internet and location permission.
- Receipt data is saved locally in browser localStorage.
- The current receipt page is review-and-save. Automatic OCR is the next feature.
- Demo store coordinates are placeholders and can be replaced later.

RESET ALL LOCAL DATA
Open browser Console and run:
localStorage.clear()
Then refresh.


ADMIN DATA
Open admin.html manually to review aliases, matched receipt items and crowd price consensus.
The local prototype only sees one browser user. Seven-user consensus across devices requires the future cloud database.

CLOUD-READY DATA LAYER

The app now uses:
js/app-config.js
js/database-service.js

It remains in local mode now.

Future Supabase setup:
CLOUD_DATABASE_SETUP.txt
data/supabase-schema.sql


POLISHED UI UPDATE
- Modern green and white customer interface
- Redesigned Home, List, Stores, Plans, Route, Receipt Scanner, Budget and Admin
- All existing JavaScript IDs and logic preserved


FIXED IN THIS VERSION
- Google Maps uses each store's business name and full street address.
- Exact selected branch pins are resolved and cached for the in-app map.
- Added newer Edmonton No Frills branches.
- Shopping mode always shows progress and a Complete Shopping button.
- Completing shopping resets the live grocery list.
- A temporary trip snapshot remains until receipt confirmation.


NO-ROUTE AVAILABILITY FIX
- A selected store with zero priced products cannot create Route 1.
- Route 2 still appears only when two stores actually contribute products.
- Stale invalid plans are rejected on the Route screen.

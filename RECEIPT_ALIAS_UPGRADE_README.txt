GrocerySaver Receipt Alias + 7/7 Consensus Upgrade
==================================================

WHAT WAS ADDED
1. Admin tab: "New receipt names"
   - Lists unmatched normalized names extracted from receipts.
   - Shows store, occurrences, unique users and unique receipts.
   - Admin selects the correct catalog product and clicks Approve alias.

2. Automatic alias behavior
   - Approved names are inserted into product_aliases.
   - Future receipt items with that alias match automatically.
   - Previously unmatched receipt_items with the same alias/store are backfilled.
   - Valid historical price reports are created after backfill.

3. Strict price promotion rule
   - A price only updates the live prices table when the exact:
       product + store + price
     has reports from at least:
       3 distinct users AND 3 distinct receipts.
   - One user cannot satisfy the threshold with repeated uploads.
   - Different prices are counted separately.

SUPABASE SETUP
Run data/supabase-schema.sql in the Supabase SQL Editor again.
The bottom section is an idempotent upgrade and creates:
- admin_alias_candidates view
- admin_assign_receipt_alias RPC
- stricter apply_price_consensus function
- unmatched receipt item index

ADMIN USE
1. Open admin.html and sign in as an admin.
2. Open "New receipt names".
3. Find an unmatched receipt name.
4. Select the correct product.
5. Click "Approve alias".

IMPORTANT
This upgrade manages aliases and database consensus. The current scanner still uses the project's existing receipt extraction/prototype behavior. A production OCR provider or on-device OCR must populate receipt item names and prices for real photographed receipts.

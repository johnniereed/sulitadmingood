Run this once in Supabase SQL Editor:

alter table public.receipts
add column if not exists regular_price_total numeric(12,2)
not null default 0;

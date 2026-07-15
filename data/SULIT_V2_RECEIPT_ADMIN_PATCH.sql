

-- SULIT V2 RECEIPT ADMIN PATCH
-- Run this block in Supabase SQL Editor after the full schema.
drop policy if exists "Admins update receipts" on public.receipts;
create policy "Admins update receipts"
on public.receipts for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins update receipt items" on public.receipt_items;
create policy "Admins update receipt items"
on public.receipt_items for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins update crowd reports" on public.crowd_price_reports;
create policy "Admins update crowd reports"
on public.crowd_price_reports for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';

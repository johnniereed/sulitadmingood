-- Sulit stabilization patch: admin receipt access, retry-safe receipt lines, schema cache

-- Remove duplicate receipt lines before adding the safety index.
delete from public.receipt_items a
using public.receipt_items b
where a.id > b.id
  and a.receipt_id = b.receipt_id
  and coalesce(a.normalized_name,'') = coalesce(b.normalized_name,'')
  and coalesce(a.unit_price,0) = coalesce(b.unit_price,0)
  and coalesce(a.quantity,1) = coalesce(b.quantity,1);

create unique index if not exists receipt_items_unique_line
on public.receipt_items(receipt_id, normalized_name, unit_price, quantity);

-- Admin update access for correcting receipt stores.
drop policy if exists "Admins update receipts" on public.receipts;
create policy "Admins update receipts" on public.receipts for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins update receipt items" on public.receipt_items;
create policy "Admins update receipt items" on public.receipt_items for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins update crowd reports" on public.crowd_price_reports;
create policy "Admins update crowd reports" on public.crowd_price_reports for update to authenticated
using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';

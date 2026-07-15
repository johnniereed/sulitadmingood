-- Sulit MVP crowd verification threshold
-- Run after the main Supabase schema.

create or replace function public.apply_price_consensus(
  target_product_id bigint,
  target_store_id bigint,
  target_price_cents integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  distinct_user_count integer;
  distinct_receipt_count integer;
begin
  select count(distinct user_id), count(distinct receipt_id)
  into distinct_user_count, distinct_receipt_count
  from public.crowd_price_reports
  where product_id = target_product_id
    and store_id = target_store_id
    and price_cents = target_price_cents;

  if distinct_user_count < 3 or distinct_receipt_count < 3 then
    return;
  end if;

  insert into public.prices (
    product_id, store_id, price_cents, source, crowd_verified,
    report_count, checked_date, updated_at
  ) values (
    target_product_id, target_store_id, target_price_cents,
    'crowd_receipts_3_users_3_receipts', true,
    least(distinct_user_count, distinct_receipt_count), current_date, now()
  )
  on conflict (product_id, store_id) do update set
    price_cents = excluded.price_cents,
    source = excluded.source,
    crowd_verified = true,
    report_count = excluded.report_count,
    checked_date = current_date,
    updated_at = now();
end;
$$;

notify pgrst, 'reload schema';

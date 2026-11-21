-- Billing foundation for YooKassa. This migration is additive: existing
-- payments/subscriptions rows are preserved.

create extension if not exists pgcrypto;

alter table public.payments add column if not exists plan_code text;
alter table public.payments add column if not exists months integer;
alter table public.payments add column if not exists amount numeric(12,2);
alter table public.payments add column if not exists currency text not null default 'RUB';
alter table public.payments add column if not exists status text not null default 'pending';
alter table public.payments add column if not exists customer_email text;
alter table public.payments add column if not exists raw_event jsonb;
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists created_at timestamptz not null default now();
alter table public.payments add column if not exists updated_at timestamptz not null default now();

alter table public.subscriptions add column if not exists plan_code text;
alter table public.subscriptions add column if not exists months integer;
alter table public.subscriptions add column if not exists status text not null default 'active';
alter table public.subscriptions add column if not exists starts_at timestamptz;
alter table public.subscriptions add column if not exists ends_at timestamptz;
alter table public.subscriptions add column if not exists provider_payment_id text;
alter table public.subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();

create index if not exists payments_user_created_idx
  on public.payments(user_id, created_at desc);
create unique index if not exists payments_provider_payment_id_idx
  on public.payments(provider_payment_id)
  where provider_payment_id is not null;
create index if not exists subscriptions_user_end_idx
  on public.subscriptions(user_id, ends_at desc);

alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Users can read own payments" on public.payments;
create policy "Users can read own payments"
  on public.payments for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription"
  on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.payments from anon, authenticated;
revoke insert, update, delete on public.subscriptions from anon, authenticated;

create or replace function public.touch_billing_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payments_touch_billing_updated_at on public.payments;
create trigger payments_touch_billing_updated_at
before update on public.payments
for each row execute function public.touch_billing_updated_at();

drop trigger if exists subscriptions_touch_billing_updated_at on public.subscriptions;
create trigger subscriptions_touch_billing_updated_at
before update on public.subscriptions
for each row execute function public.touch_billing_updated_at();

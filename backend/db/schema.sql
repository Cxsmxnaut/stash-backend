create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  bank_name text,
  account_name text,
  account_type text,
  balance numeric,
  last_synced timestamptz,
  plaid_item_id text,
  plaid_account_id text
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  color text,
  is_default boolean not null default false
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  date date not null,
  merchant text,
  merchant_name text,
  amount numeric not null,
  currency text,
  category_id uuid references public.categories(id) on delete set null,
  subscription_id uuid,
  plaid_transaction_id text,
  pending boolean not null default false,
  payment_channel text,
  category_primary text,
  category_detailed text,
  is_transfer boolean not null default false,
  is_refund boolean not null default false,
  notes text,
  is_duplicate boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subscription_id uuid,
  type text not null,
  content text not null,
  status text not null,
  scheduled_at timestamptz
);

create table if not exists public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id text not null,
  institution_name text,
  status text not null default 'active',
  cursor text,
  last_synced timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'plaid_items_item_id_unique'
  ) then
    alter table public.plaid_items
      add constraint plaid_items_item_id_unique unique (item_id);
  end if;
end $$;

create table if not exists public.plaid_item_tokens (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  access_token text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.plaid_sync_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  cursor text,
  added_count int not null default 0,
  modified_count int not null default 0,
  removed_count int not null default 0,
  error text,
  status text not null default 'running'
);

create table if not exists public.merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  alias text not null,
  merchant text not null,
  confidence numeric not null default 1.0,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  merchant text not null,
  amount numeric not null,
  currency text,
  cadence text not null,
  cadence_days int not null,
  last_transaction_date date,
  next_payment_date date,
  status text not null default 'active',
  confidence numeric not null default 0.5,
  first_detected_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists subscription_id uuid;

alter table public.notifications
  add column if not exists subscription_id uuid;

alter table public.accounts
  add column if not exists account_name text;

alter table public.accounts
  add column if not exists plaid_item_id text;

alter table public.accounts
  add column if not exists plaid_account_id text;

alter table public.transactions
  add column if not exists merchant_name text;

alter table public.transactions
  add column if not exists plaid_transaction_id text;

alter table public.transactions
  add column if not exists pending boolean default false;

alter table public.transactions
  add column if not exists payment_channel text;

alter table public.transactions
  add column if not exists category_primary text;

alter table public.transactions
  add column if not exists category_detailed text;

alter table public.transactions
  add column if not exists is_transfer boolean default false;

alter table public.transactions
  add column if not exists is_refund boolean default false;

alter table public.subscriptions
  add column if not exists confidence numeric default 0.5;

alter table public.subscriptions
  add column if not exists first_detected_at timestamptz;

alter table public.subscriptions
  add column if not exists last_seen_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_subscription_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_subscription_id_fkey
      foreign key (subscription_id)
      references public.subscriptions(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_subscription_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_subscription_id_fkey
      foreign key (subscription_id)
      references public.subscriptions(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'plaid_item_tokens_item_id_fkey'
  ) then
    alter table public.plaid_item_tokens
      add constraint plaid_item_tokens_item_id_fkey
      foreign key (item_id)
      references public.plaid_items(item_id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'plaid_sync_reports_item_id_fkey'
  ) then
    alter table public.plaid_sync_reports
      add constraint plaid_sync_reports_item_id_fkey
      foreign key (item_id)
      references public.plaid_items(item_id)
      on delete cascade;
  end if;
end $$;
create index if not exists idx_accounts_user_id on public.accounts(user_id);
create index if not exists idx_accounts_plaid_item_id on public.accounts(plaid_item_id);
create unique index if not exists idx_accounts_plaid_account_id on public.accounts(plaid_account_id);
create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_transactions_account_id on public.transactions(account_id);
create index if not exists idx_transactions_category_id on public.transactions(category_id);
create index if not exists idx_transactions_subscription_id on public.transactions(subscription_id);
create unique index if not exists idx_transactions_plaid_id on public.transactions(plaid_transaction_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_subscription_id on public.notifications(subscription_id);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_next_payment_date on public.subscriptions(next_payment_date);
create index if not exists idx_plaid_items_user_id on public.plaid_items(user_id);
create unique index if not exists idx_plaid_item_tokens_item_id on public.plaid_item_tokens(item_id);
create index if not exists idx_plaid_sync_reports_item_id on public.plaid_sync_reports(item_id);
create index if not exists idx_plaid_sync_reports_user_id on public.plaid_sync_reports(user_id);
create index if not exists idx_plaid_sync_reports_started_at on public.plaid_sync_reports(started_at);
create index if not exists idx_merchant_aliases_user_id on public.merchant_aliases(user_id);

create unique index if not exists idx_subscriptions_unique
  on public.subscriptions(user_id, merchant, amount, cadence);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists plaid_items_set_updated_at on public.plaid_items;
create trigger plaid_items_set_updated_at
before update on public.plaid_items
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;
alter table public.plaid_items enable row level security;
alter table public.plaid_item_tokens enable row level security;
alter table public.plaid_sync_reports enable row level security;
alter table public.merchant_aliases enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select using (auth.uid() = id);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert with check (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update using (auth.uid() = id);

drop policy if exists users_delete_own on public.users;
create policy users_delete_own on public.users
  for delete using (auth.uid() = id);

drop policy if exists accounts_owner_access on public.accounts;
create policy accounts_owner_access on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists categories_owner_access on public.categories;
create policy categories_owner_access on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notifications_owner_access on public.notifications;
create policy notifications_owner_access on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists subscriptions_owner_access on public.subscriptions;
create policy subscriptions_owner_access on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists plaid_items_owner_access on public.plaid_items;
create policy plaid_items_owner_access on public.plaid_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists plaid_sync_reports_owner_access on public.plaid_sync_reports;
create policy plaid_sync_reports_owner_access on public.plaid_sync_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists merchant_aliases_owner_access on public.merchant_aliases;
create policy merchant_aliases_owner_access on public.merchant_aliases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists transactions_owner_access on public.transactions;
create policy transactions_owner_access on public.transactions
  for all using (
    exists (
      select 1 from public.accounts a
      where a.id = transactions.account_id
        and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.accounts a
      where a.id = transactions.account_id
        and a.user_id = auth.uid()
    )
  );

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

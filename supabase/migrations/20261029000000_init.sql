-- MemoryMesh schema
--
-- Content columns (`payload`) hold AES-256-GCM ciphertext produced on the
-- device. The server stores and syncs them but cannot read them. Plaintext
-- metadata is limited to ids, timestamps, note kind, the AI opt-in flag and
-- link scores.

-- ---------------------------------------------------------------------------
-- Profiles & entitlements
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  plan_source text check (plan_source in ('monthly', 'lifetime', 'promo')),
  plan_expires_at timestamptz,
  preferred_provider text check (preferred_provider in ('anthropic', 'kimi', 'openai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their profile. Plan fields are written only by the
-- RevenueCat webhook (service role). The preferred provider is changed through
-- set_preferred_provider() so users cannot grant themselves Pro.
create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.set_preferred_provider(p_provider text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_provider is not null and p_provider not in ('anthropic', 'kimi', 'openai') then
    raise exception 'invalid provider';
  end if;
  update public.profiles set preferred_provider = p_provider, updated_at = now() where id = auth.uid();
end;
$$;

revoke all on function public.set_preferred_provider(text) from public, anon;
grant execute on function public.set_preferred_provider(text) to authenticated;

-- Effective plan, honouring expiry of time-limited entitlements.
create function public.effective_plan(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.plan = 'pro' and (p.plan_expires_at is null or p.plan_expires_at > now()) then 'pro'
    else 'free'
  end
  from public.profiles p where p.id = p_user;
$$;

revoke all on function public.effective_plan(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Synced tables
-- ---------------------------------------------------------------------------
create function public.touch_server_updated_at() returns trigger
language plpgsql as $$
begin
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

create table public.notes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  payload text not null,
  kind text not null check (kind in ('text', 'voice', 'clip', 'daily', 'digest')),
  ai_enabled boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  inserted_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.tags (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  payload text not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.note_tags (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note_id uuid not null,
  tag_id text not null,
  source text not null check (source in ('ai', 'user')),
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.links (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_id uuid not null,
  target_id uuid not null,
  score real,
  kind text not null check (kind in ('ai', 'user')),
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.collections (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  payload text not null,
  ai_suggested boolean not null default false,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.collection_notes (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection_id uuid not null,
  note_id uuid not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp()
);

do $$
declare t text;
begin
  foreach t in array array['notes', 'tags', 'note_tags', 'links', 'collections', 'collection_notes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: select own" on public.%1$I for select using (auth.uid() = user_id)', t);
    execute format('create policy "%1$s: insert own" on public.%1$I for insert with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "%1$s: update own" on public.%1$I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
    execute format('create policy "%1$s: delete own" on public.%1$I for delete using (auth.uid() = user_id)', t);
    execute format(
      'create trigger touch_%1$s before insert or update on public.%1$I for each row execute function public.touch_server_updated_at()',
      t
    );
    execute format('create index %1$s_sync_idx on public.%1$I (user_id, server_updated_at)', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Free plan: 50 new notes per calendar month (enforced server-side too)
-- ---------------------------------------------------------------------------
create function public.enforce_free_note_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  monthly_count integer;
begin
  -- Upserts fire BEFORE INSERT even when they resolve to an update.
  if exists (select 1 from public.notes where id = new.id) then
    return new;
  end if;
  if coalesce(public.effective_plan(new.user_id), 'free') = 'pro' then
    return new;
  end if;
  select count(*) into monthly_count
  from public.notes
  where user_id = new.user_id
    and kind not in ('daily', 'digest')
    and inserted_at >= date_trunc('month', now());
  if new.kind not in ('daily', 'digest') and monthly_count >= 50 then
    raise exception 'free_plan_note_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_free_note_limit
  before insert on public.notes
  for each row execute function public.enforce_free_note_limit();

-- ---------------------------------------------------------------------------
-- AI rate limiting (called by Edge Functions with the service role only)
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  day date not null default current_date,
  count integer not null default 0,
  primary key (user_id, bucket, day)
);

alter table public.ai_usage enable row level security;
create policy "ai_usage: read own" on public.ai_usage for select using (auth.uid() = user_id);

-- Atomically consumes one unit; returns false once the daily limit is reached.
create function public.consume_ai_quota(p_user uuid, p_bucket text, p_limit integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  new_count integer;
begin
  insert into public.ai_usage as u (user_id, bucket, day, count)
  values (p_user, p_bucket, current_date, 1)
  on conflict (user_id, bucket, day) do update set count = u.count + 1
  where u.count < p_limit
  returning u.count into new_count;
  return new_count is not null;
end;
$$;

revoke all on function public.consume_ai_quota(uuid, text, integer) from public, anon, authenticated;

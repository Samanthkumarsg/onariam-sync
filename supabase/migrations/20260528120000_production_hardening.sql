-- Production: session TTL, rate limits, expired room cleanup

-- ---------------------------------------------------------------------------
-- Session expiry on rooms
-- ---------------------------------------------------------------------------

alter table public.rooms
  add column if not exists expires_at timestamptz;

update public.rooms
set expires_at = created_at + interval '24 hours'
where expires_at is null;

alter table public.rooms
  alter column expires_at set default (timezone('utc', now()) + interval '24 hours');

create index if not exists rooms_expires_at_idx on public.rooms (expires_at);

-- ---------------------------------------------------------------------------
-- Rate limit buckets (per device fingerprint, sliding window in SQL)
-- ---------------------------------------------------------------------------

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  window_start timestamptz not null,
  request_count int not null default 0
);

alter table public.rate_limit_buckets enable row level security;

-- No direct client access; RPCs only via security definer functions.

create or replace function public.check_rate_limit(
  p_bucket_key text,
  p_max_requests int,
  p_window_seconds int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := timezone('utc', now());
  win_start timestamptz;
  cnt int;
begin
  if p_bucket_key is null or length(trim(p_bucket_key)) = 0 then
    return;
  end if;

  select b.window_start, b.request_count
  into win_start, cnt
  from public.rate_limit_buckets b
  where b.bucket_key = p_bucket_key
  for update;

  if not found then
    insert into public.rate_limit_buckets (bucket_key, window_start, request_count)
    values (p_bucket_key, now_ts, 1);
    return;
  end if;

  if win_start + make_interval(secs => p_window_seconds) < now_ts then
    update public.rate_limit_buckets
    set window_start = now_ts, request_count = 1
    where bucket_key = p_bucket_key;
    return;
  end if;

  if cnt >= p_max_requests then
    raise exception 'rate limit exceeded' using errcode = 'P0001';
  end if;

  update public.rate_limit_buckets
  set request_count = request_count + 1
  where bucket_key = p_bucket_key;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cleanup expired sessions (schedule via pg_cron or Supabase cron)
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_expired_rooms()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  with doomed as (
    select topic from public.rooms
    where expires_at < timezone('utc', now())
  ),
  del as (
    delete from public.rooms r
    using doomed d
    where r.topic = d.topic
    returning 1
  )
  select count(*)::int into deleted_count from del;

  delete from public.rate_limit_buckets b
  where b.window_start < timezone('utc', now()) - interval '7 days';

  return coalesce(deleted_count, 0);
end;
$$;

grant execute on function public.cleanup_expired_rooms() to service_role;

-- ---------------------------------------------------------------------------
-- create_meeting: rate limit + expires_at
-- ---------------------------------------------------------------------------

create or replace function public.create_meeting(
  p_device_fingerprint text,
  p_display_name text default null,
  p_avatar text default '🦊'
)
returns table (
  topic text,
  title text,
  display_name text,
  device_fingerprint text,
  avatar text,
  is_host boolean,
  member_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_topic text;
  fp text := left(trim(p_device_fingerprint), 128);
  dn text;
  av text := coalesce(nullif(left(trim(p_avatar), 8), ''), '🦊');
begin
  if fp is null or fp = '' then
    raise exception 'device fingerprint required';
  end if;

  perform public.check_rate_limit(
    'create_meeting:' || fp,
    20,
    3600
  );

  new_topic := public.generate_meet_code();
  dn := coalesce(nullif(left(trim(p_display_name), 64), ''), 'Guest ' || right(fp, 4));

  insert into public.rooms (topic, title, host_fingerprint, expires_at)
  values (new_topic, 'Session', fp, timezone('utc', now()) + interval '24 hours');

  insert into public.room_members (room_topic, device_fingerprint, display_name, avatar, status, last_seen_at)
  values (new_topic, fp, dn, av, 'approved', timezone('utc', now()));

  return query
  select new_topic, 'Session'::text, dn, fp, av, true, 'approved'::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_meeting: reject expired rooms
-- ---------------------------------------------------------------------------

create or replace function public.join_meeting(
  p_topic text,
  p_device_fingerprint text,
  p_display_name text default null,
  p_avatar text default '🦊'
)
returns table (
  topic text,
  title text,
  display_name text,
  device_fingerprint text,
  avatar text,
  is_host boolean,
  member_status text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r public.rooms%rowtype;
  t text := public.format_meet_topic(p_topic);
  fp text := left(trim(p_device_fingerprint), 128);
  dn text;
  av text := coalesce(nullif(left(trim(p_avatar), 8), ''), '🦊');
  host boolean;
  st text;
begin
  if fp is null or fp = '' then
    raise exception 'device fingerprint required';
  end if;

  select * into r from public.rooms where rooms.topic = t limit 1;
  if not found then
    raise exception 'meeting not found';
  end if;

  if r.expires_at is not null and r.expires_at < timezone('utc', now()) then
    raise exception 'session expired';
  end if;

  perform public.check_rate_limit(
    'join_meeting:' || fp,
    60,
    3600
  );

  dn := coalesce(nullif(left(trim(p_display_name), 64), ''), 'Guest ' || right(fp, 4));
  host := r.host_fingerprint = fp;
  st := case when host then 'approved' else 'pending' end;

  insert into public.room_members (room_topic, device_fingerprint, display_name, avatar, status, last_seen_at)
  values (r.topic, fp, dn, av, st, timezone('utc', now()))
  on conflict (room_topic, device_fingerprint) do update
    set display_name = excluded.display_name,
        avatar = excluded.avatar,
        last_seen_at = excluded.last_seen_at,
        status = case
          when room_members.status = 'rejected' then 'rejected'
          when r.host_fingerprint = fp then 'approved'
          when room_members.status = 'approved' then 'approved'
          else room_members.status
        end;

  select m.status into st
  from public.room_members m
  where m.room_topic = r.topic and m.device_fingerprint = fp;

  return query
  select r.topic, r.title, dn, fp, av, host, st;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to service_role;

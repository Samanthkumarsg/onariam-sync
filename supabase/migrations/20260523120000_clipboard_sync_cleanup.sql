-- Clipboard sync focus: drop unused co-browse/notes/annotations/auth tables,
-- add member approval, simplify meeting RPCs.

-- ---------------------------------------------------------------------------
-- Drop unused objects
-- ---------------------------------------------------------------------------

drop table if exists public.meeting_annotations cascade;

drop function if exists public.add_meeting_annotation(text, text, text, text, text);
drop function if exists public.resolve_meeting_annotation(text, text, uuid);
drop function if exists public.delete_meeting_annotation(text, text, uuid);
drop function if exists public.get_meeting_annotations(text, text);

drop function if exists public.set_meeting_url(text, text, text);
drop function if exists public.get_meeting_state(text, text);
drop function if exists public.update_meeting_notes(text, text, text);
drop function if exists public.assign_note_taker(text, text, text);

drop function if exists public.create_room(text);
drop function if exists public.join_room(text, text, text);
drop function if exists public.join_room(text, text, text, text);
drop function if exists public.get_room_members(text, text);

drop table if exists public.rooms_users cascade;
drop table if exists public.profiles cascade;

drop policy if exists "onariam_authenticated_receive_broadcast_presence" on realtime.messages;
drop policy if exists "onariam_authenticated_send_broadcast_presence" on realtime.messages;
drop policy if exists "onariam_anon_receive_broadcast_presence" on realtime.messages;
drop policy if exists "onariam_anon_send_broadcast_presence" on realtime.messages;

-- ---------------------------------------------------------------------------
-- Trim rooms table
-- ---------------------------------------------------------------------------

alter table public.rooms
  drop column if exists target_url,
  drop column if exists url_updated_at,
  drop column if exists notes,
  drop column if exists notes_updated_at;

-- ---------------------------------------------------------------------------
-- Member approval status
-- ---------------------------------------------------------------------------

alter table public.room_members
  add column if not exists status text not null default 'approved';

alter table public.room_members
  drop constraint if exists room_members_status_check;

alter table public.room_members
  add constraint room_members_status_check
  check (status in ('pending', 'approved', 'rejected'));

update public.room_members set status = 'approved' where status is null;

-- ---------------------------------------------------------------------------
-- create_meeting (no target URL)
-- ---------------------------------------------------------------------------

drop function if exists public.create_meeting(text, text, text, text);

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

  new_topic := public.generate_meet_code();
  dn := coalesce(nullif(left(trim(p_display_name), 64), ''), 'Guest ' || right(fp, 4));

  insert into public.rooms (topic, title, host_fingerprint)
  values (new_topic, 'Session', fp);

  insert into public.room_members (room_topic, device_fingerprint, display_name, avatar, status, last_seen_at)
  values (new_topic, fp, dn, av, 'approved', timezone('utc', now()));

  return query
  select new_topic, 'Session'::text, dn, fp, av, true, 'approved'::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_meeting (guests start as pending)
-- ---------------------------------------------------------------------------

drop function if exists public.join_meeting(text, text, text, text);

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

-- ---------------------------------------------------------------------------
-- get_my_membership (poll while pending)
-- ---------------------------------------------------------------------------

create or replace function public.get_my_membership(
  p_topic text,
  p_device_fingerprint text
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
  t text := public.format_meet_topic(p_topic);
  fp text := left(trim(p_device_fingerprint), 128);
begin
  if fp is null or fp = '' then
    raise exception 'device fingerprint required';
  end if;

  update public.room_members m
  set last_seen_at = timezone('utc', now())
  where m.room_topic = t and m.device_fingerprint = fp;

  return query
  select
    r.topic,
    r.title,
    m.display_name,
    m.device_fingerprint,
    m.avatar,
    (r.host_fingerprint = fp),
    m.status
  from public.room_members m
  join public.rooms r on r.topic = m.room_topic
  where m.room_topic = t and m.device_fingerprint = fp;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_room_members (host sees pending; guests see approved only)
-- ---------------------------------------------------------------------------

create or replace function public.get_room_members(
  p_topic text,
  p_device_fingerprint text
)
returns table (
  display_name text,
  device_fingerprint text,
  avatar text,
  joined_at timestamptz,
  last_seen_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  t text := public.format_meet_topic(p_topic);
  fp text := left(trim(p_device_fingerprint), 128);
  caller_host boolean;
  caller_status text;
begin
  if fp is null or fp = '' then
    raise exception 'device fingerprint required';
  end if;

  select (r.host_fingerprint = fp), m.status
  into caller_host, caller_status
  from public.rooms r
  left join public.room_members m
    on m.room_topic = r.topic and m.device_fingerprint = fp
  where r.topic = t;

  if caller_status is null and not caller_host then
    raise exception 'not a room member';
  end if;

  if caller_status = 'rejected' then
    raise exception 'access denied';
  end if;

  update public.room_members m
  set last_seen_at = timezone('utc', now())
  where m.room_topic = t and m.device_fingerprint = fp;

  return query
  select m.display_name, m.device_fingerprint, m.avatar, m.joined_at, m.last_seen_at, m.status
  from public.room_members m
  where m.room_topic = t
    and (
      caller_host
      or m.status = 'approved'
      or m.device_fingerprint = fp
    )
  order by
    case m.status when 'pending' then 0 when 'approved' then 1 else 2 end,
    m.joined_at asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Host approve / reject
-- ---------------------------------------------------------------------------

create or replace function public.approve_member(
  p_topic text,
  p_host_fingerprint text,
  p_member_fingerprint text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := public.format_meet_topic(p_topic);
  host_fp text := left(trim(p_host_fingerprint), 128);
  member_fp text := left(trim(p_member_fingerprint), 128);
begin
  if not exists (
    select 1 from public.rooms r
    where r.topic = t and r.host_fingerprint = host_fp
  ) then
    raise exception 'only the host can approve members';
  end if;

  update public.room_members m
  set status = 'approved', last_seen_at = timezone('utc', now())
  where m.room_topic = t and m.device_fingerprint = member_fp;
end;
$$;

create or replace function public.reject_member(
  p_topic text,
  p_host_fingerprint text,
  p_member_fingerprint text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := public.format_meet_topic(p_topic);
  host_fp text := left(trim(p_host_fingerprint), 128);
  member_fp text := left(trim(p_member_fingerprint), 128);
begin
  if not exists (
    select 1 from public.rooms r
    where r.topic = t and r.host_fingerprint = host_fp
  ) then
    raise exception 'only the host can reject members';
  end if;

  if member_fp = host_fp then
    raise exception 'cannot reject the host';
  end if;

  update public.room_members m
  set status = 'rejected', last_seen_at = timezone('utc', now())
  where m.room_topic = t and m.device_fingerprint = member_fp;
end;
$$;

grant execute on function public.create_meeting(text, text, text) to anon, authenticated;
grant execute on function public.join_meeting(text, text, text, text) to anon, authenticated;
grant execute on function public.get_my_membership(text, text) to anon, authenticated;
grant execute on function public.get_room_members(text, text) to anon, authenticated;
grant execute on function public.approve_member(text, text, text) to anon, authenticated;
grant execute on function public.reject_member(text, text, text) to anon, authenticated;

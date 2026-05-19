-- Room members identified by FingerprintJS visitor id (anon-friendly join flow)

drop function if exists public.get_room_members(text, text);
drop function if exists public.join_room(text, text, text);
drop function if exists public.create_room(text);
drop table if exists public.room_members cascade;

create table public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_topic text not null references public.rooms (topic) on delete cascade,
  device_fingerprint text not null,
  display_name text not null,
  joined_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  constraint room_members_device_fingerprint_len check (char_length(device_fingerprint) between 8 and 128),
  constraint room_members_display_name_len check (char_length(display_name) between 1 and 64),
  unique (room_topic, device_fingerprint)
);

create index room_members_room_topic_idx on public.room_members (room_topic);

grant select on public.room_members to anon, authenticated;

alter table public.room_members enable row level security;

-- Members list is exposed only through security definer RPCs below.

create or replace function public.create_room(p_title text default null)
returns table (topic text, title text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_topic text;
  new_title text;
begin
  loop
    new_topic := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.rooms r where r.topic = new_topic);
  end loop;

  new_title := coalesce(nullif(left(trim(p_title), 100), ''), 'Untitled room');

  insert into public.rooms (topic, title)
  values (new_topic, new_title);

  return query select new_topic, new_title;
end;
$$;

create or replace function public.join_room(
  p_topic text,
  p_device_fingerprint text,
  p_display_name text default null
)
returns table (
  topic text,
  title text,
  display_name text,
  device_fingerprint text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r public.rooms%rowtype;
  fp text := left(trim(p_device_fingerprint), 128);
  dn text;
begin
  if fp is null or fp = '' then
    raise exception 'device fingerprint required';
  end if;

  select * into r
  from public.rooms
  where rooms.topic = lower(trim(p_topic))
  limit 1;

  if not found then
    raise exception 'room not found';
  end if;

  dn := coalesce(nullif(left(trim(p_display_name), 64), ''), 'Guest ' || right(fp, 4));

  insert into public.room_members (room_topic, device_fingerprint, display_name, last_seen_at)
  values (r.topic, fp, dn, timezone('utc', now()))
  on conflict (room_topic, device_fingerprint) do update
    set
      display_name = excluded.display_name,
      last_seen_at = excluded.last_seen_at;

  return query
  select r.topic, r.title, dn, fp;
end;
$$;

create or replace function public.get_room_members(
  p_topic text,
  p_device_fingerprint text
)
returns table (
  display_name text,
  device_fingerprint text,
  joined_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := lower(trim(p_topic));
  fp text := left(trim(p_device_fingerprint), 128);
begin
  if fp is null or fp = '' then
    raise exception 'device fingerprint required';
  end if;

  if not exists (
    select 1
    from public.room_members m
    where m.room_topic = t and m.device_fingerprint = fp
  ) then
    raise exception 'not a room member';
  end if;

  return query
  select m.display_name, m.device_fingerprint, m.joined_at, m.last_seen_at
  from public.room_members m
  where m.room_topic = t
  order by m.joined_at asc;
end;
$$;

grant execute on function public.create_room(text) to anon, authenticated;
grant execute on function public.join_room(text, text, text) to anon, authenticated;
grant execute on function public.get_room_members(text, text) to anon, authenticated;

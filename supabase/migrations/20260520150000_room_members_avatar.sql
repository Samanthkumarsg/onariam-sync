alter table public.room_members add column if not exists avatar text not null default '🦊';

drop function if exists public.join_room(text, text, text);
drop function if exists public.join_room(text, text, text, text);

create or replace function public.join_room(
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
  avatar text
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
  av text := coalesce(nullif(left(trim(p_avatar), 8), ''), '🦊');
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

  insert into public.room_members (room_topic, device_fingerprint, display_name, avatar, last_seen_at)
  values (r.topic, fp, dn, av, timezone('utc', now()))
  on conflict (room_topic, device_fingerprint) do update
    set
      display_name = excluded.display_name,
      avatar = excluded.avatar,
      last_seen_at = excluded.last_seen_at;

  return query
  select r.topic, r.title, dn, fp, av;
end;
$$;

drop function if exists public.get_room_members(text, text);

create or replace function public.get_room_members(
  p_topic text,
  p_device_fingerprint text
)
returns table (
  display_name text,
  device_fingerprint text,
  avatar text,
  joined_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
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
  select m.display_name, m.device_fingerprint, m.avatar, m.joined_at, m.last_seen_at
  from public.room_members m
  where m.room_topic = t
  order by m.joined_at asc;
end;
$$;

grant execute on function public.join_room(text, text, text, text) to anon, authenticated;
grant execute on function public.get_room_members(text, text) to anon, authenticated;

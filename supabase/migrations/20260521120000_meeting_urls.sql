-- Google Meet–style sessions: host sets target_url, guests follow in embedded browser

alter table public.rooms
  add column if not exists target_url text,
  add column if not exists host_fingerprint text,
  add column if not exists url_updated_at timestamptz default timezone('utc', now());

create or replace function public.generate_meet_code()
returns text
language plpgsql
as $$
declare
  chars text := 'abcdefghijklmnopqrstuvwxyz';
  result text;
  i int;
begin
  loop
    result := '';
    for i in 1..3 loop
      result := result || substr(chars, 1 + floor(random() * 26)::int, 1);
    end loop;
    result := result || '-';
    for i in 1..4 loop
      result := result || substr(chars, 1 + floor(random() * 26)::int, 1);
    end loop;
    result := result || '-';
    for i in 1..3 loop
      result := result || substr(chars, 1 + floor(random() * 26)::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms r where r.topic = result);
  end loop;
  return result;
end;
$$;

create or replace function public.normalize_meet_url(p_url text)
returns text
language plpgsql
immutable
as $$
declare
  u text := nullif(trim(p_url), '');
begin
  if u is null then
    return null;
  end if;
  if u !~* '^https?://' then
    u := 'https://' || u;
  end if;
  return left(u, 2048);
end;
$$;

create or replace function public.format_meet_topic(p_input text)
returns text
language plpgsql
immutable
as $$
declare
  letters text := lower(regexp_replace(coalesce(p_input, ''), '[^a-z]', '', 'g'));
begin
  if length(letters) <> 10 then
    return lower(trim(p_input));
  end if;
  return substr(letters, 1, 3) || '-' || substr(letters, 4, 4) || '-' || substr(letters, 8, 3);
end;
$$;

drop function if exists public.create_meeting(text, text, text, text);

create or replace function public.create_meeting(
  p_device_fingerprint text,
  p_display_name text default null,
  p_avatar text default '🦊',
  p_target_url text default null
)
returns table (
  topic text,
  title text,
  display_name text,
  device_fingerprint text,
  avatar text,
  target_url text,
  is_host boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_topic text;
  fp text := left(trim(p_device_fingerprint), 128);
  url text := public.normalize_meet_url(p_target_url);
begin
  if fp is null or fp = '' then
    raise exception 'device fingerprint required';
  end if;

  new_topic := public.generate_meet_code();

  insert into public.rooms (topic, title, target_url, host_fingerprint, url_updated_at)
  values (new_topic, 'Meeting', url, fp, timezone('utc', now()));

  return query
  select * from public.join_meeting(new_topic, fp, p_display_name, p_avatar);
end;
$$;

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
  target_url text,
  is_host boolean
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

  insert into public.room_members (room_topic, device_fingerprint, display_name, avatar, last_seen_at)
  values (r.topic, fp, dn, av, timezone('utc', now()))
  on conflict (room_topic, device_fingerprint) do update
    set display_name = excluded.display_name,
        avatar = excluded.avatar,
        last_seen_at = excluded.last_seen_at;

  return query
  select r.topic, r.title, dn, fp, av, r.target_url, host;
end;
$$;

create or replace function public.set_meeting_url(
  p_topic text,
  p_device_fingerprint text,
  p_target_url text
)
returns table (topic text, target_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := public.format_meet_topic(p_topic);
  fp text := left(trim(p_device_fingerprint), 128);
  url text := public.normalize_meet_url(p_target_url);
begin
  if url is null then
    raise exception 'url required';
  end if;

  update public.rooms r
  set
    target_url = url,
    url_updated_at = timezone('utc', now())
  where r.topic = t and r.host_fingerprint = fp;

  if not found then
    raise exception 'only the host can change the page';
  end if;

  return query select t, url;
end;
$$;

create or replace function public.get_meeting_state(
  p_topic text,
  p_device_fingerprint text
)
returns table (topic text, target_url text, url_updated_at timestamptz, is_host boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := public.format_meet_topic(p_topic);
  fp text := left(trim(p_device_fingerprint), 128);
begin
  if not exists (
    select 1 from public.room_members m
    where m.room_topic = t and m.device_fingerprint = fp
  ) then
    raise exception 'not a meeting member';
  end if;

  return query
  select r.topic, r.target_url, r.url_updated_at, (r.host_fingerprint = fp)
  from public.rooms r
  where r.topic = t;
end;
$$;

-- New meetings use meet-style codes
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
  new_topic := public.generate_meet_code();
  new_title := coalesce(nullif(left(trim(p_title), 100), ''), 'Meeting');
  insert into public.rooms (topic, title) values (new_topic, new_title);
  return query select new_topic, new_title;
end;
$$;

grant execute on function public.create_meeting(text, text, text, text) to anon, authenticated;
grant execute on function public.join_meeting(text, text, text, text) to anon, authenticated;
grant execute on function public.set_meeting_url(text, text, text) to anon, authenticated;
grant execute on function public.get_meeting_state(text, text) to anon, authenticated;

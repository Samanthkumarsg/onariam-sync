-- join_meeting RETURNS TABLE columns shadow room_members columns in INSERT/ON CONFLICT

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

grant execute on function public.join_meeting(text, text, text, text) to anon, authenticated;

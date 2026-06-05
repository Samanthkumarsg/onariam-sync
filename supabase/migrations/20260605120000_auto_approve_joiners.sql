-- Auto-approve joiners so they can paste/send immediately (host can still reject).

update public.room_members
set status = 'approved'
where status = 'pending';

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
  st := 'approved';

  insert into public.room_members (room_topic, device_fingerprint, display_name, avatar, status, last_seen_at)
  values (r.topic, fp, dn, av, st, timezone('utc', now()))
  on conflict (room_topic, device_fingerprint) do update
    set display_name = excluded.display_name,
        avatar = excluded.avatar,
        last_seen_at = excluded.last_seen_at,
        status = case
          when room_members.status = 'rejected' then 'rejected'
          else 'approved'
        end;

  select m.status into st
  from public.room_members m
  where m.room_topic = r.topic and m.device_fingerprint = fp;

  return query
  select r.topic, r.title, dn, fp, av, host, st;
end;
$$;

grant execute on function public.join_meeting(text, text, text, text) to anon, authenticated;

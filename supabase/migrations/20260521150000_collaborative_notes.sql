-- Drop note-taker role: anyone in the room can collaboratively edit notes

drop function if exists public.assign_note_taker(text, text, text);
drop function if exists public.update_meeting_notes(text, text, text);
drop function if exists public.get_meeting_state(text, text);

alter table public.rooms
  drop column if exists note_taker_fingerprint;

create or replace function public.get_meeting_state(
  p_topic text,
  p_device_fingerprint text
)
returns table (
  topic text,
  target_url text,
  url_updated_at timestamptz,
  is_host boolean,
  notes text,
  notes_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := public.format_meet_topic(p_topic);
  fp text := left(trim(p_device_fingerprint), 128);
begin
  if fp is null or fp = '' then
    raise exception 'device fingerprint required';
  end if;

  if not exists (
    select 1 from public.room_members m
    where m.room_topic = t and m.device_fingerprint = fp
  ) then
    raise exception 'not a meeting member';
  end if;

  return query
  select
    r.topic,
    r.target_url,
    r.url_updated_at,
    (r.host_fingerprint = fp),
    r.notes,
    r.notes_updated_at
  from public.rooms r
  where r.topic = t;
end;
$$;

create or replace function public.update_meeting_notes(
  p_topic text,
  p_device_fingerprint text,
  p_notes text
)
returns table (
  topic text,
  notes text,
  notes_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := public.format_meet_topic(p_topic);
  fp text := left(trim(p_device_fingerprint), 128);
  body text := left(coalesce(p_notes, ''), 32000);
begin
  if fp is null or fp = '' then
    raise exception 'device fingerprint required';
  end if;

  if not exists (
    select 1 from public.room_members m
    where m.room_topic = t and m.device_fingerprint = fp
  ) then
    raise exception 'not a meeting member';
  end if;

  update public.rooms r
  set
    notes = body,
    notes_updated_at = timezone('utc', now())
  where r.topic = t;

  return query
  select r.topic, r.notes, r.notes_updated_at
  from public.rooms r
  where r.topic = t;
end;
$$;

grant execute on function public.update_meeting_notes(text, text, text) to anon, authenticated;

-- Shared meeting notes + assignable note taker

alter table public.rooms
  add column if not exists notes text not null default '',
  add column if not exists note_taker_fingerprint text,
  add column if not exists notes_updated_at timestamptz;

drop function if exists public.get_meeting_state(text, text);

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
  note_taker_fingerprint text,
  note_taker_name text,
  note_taker_avatar text,
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
    r.note_taker_fingerprint,
    nt.display_name,
    nt.avatar,
    r.notes_updated_at
  from public.rooms r
  left join public.room_members nt
    on nt.room_topic = r.topic
    and nt.device_fingerprint = r.note_taker_fingerprint
  where r.topic = t;
end;
$$;

create or replace function public.assign_note_taker(
  p_topic text,
  p_device_fingerprint text,
  p_note_taker_fingerprint text default null
)
returns table (
  topic text,
  note_taker_fingerprint text,
  note_taker_name text,
  note_taker_avatar text,
  notes_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := public.format_meet_topic(p_topic);
  fp text := left(trim(p_device_fingerprint), 128);
  taker text := nullif(left(trim(p_note_taker_fingerprint), 128), '');
  is_host boolean;
  current_taker text;
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

  select (r.host_fingerprint = fp), r.note_taker_fingerprint
  into is_host, current_taker
  from public.rooms r
  where r.topic = t;

  if not found then
    raise exception 'meeting not found';
  end if;

  if taker is not null then
    if not exists (
      select 1 from public.room_members m
      where m.room_topic = t and m.device_fingerprint = taker
    ) then
      raise exception 'note taker must be in the meeting';
    end if;

    if not is_host and taker <> fp then
      raise exception 'only the host can assign someone else';
    end if;
  else
    if not is_host and current_taker is distinct from fp then
      raise exception 'only the host can clear the note taker';
    end if;
  end if;

  update public.rooms r
  set
    note_taker_fingerprint = taker,
    notes_updated_at = timezone('utc', now())
  where r.topic = t;

  return query
  select
    r.topic,
    r.note_taker_fingerprint,
    nt.display_name,
    nt.avatar,
    r.notes_updated_at
  from public.rooms r
  left join public.room_members nt
    on nt.room_topic = r.topic
    and nt.device_fingerprint = r.note_taker_fingerprint
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

  update public.rooms r
  set
    notes = body,
    notes_updated_at = timezone('utc', now())
  where
    r.topic = t
    and r.note_taker_fingerprint = fp;

  if not found then
    raise exception 'only the assigned note taker can edit notes';
  end if;

  return query
  select r.topic, r.notes, r.notes_updated_at
  from public.rooms r
  where r.topic = t;
end;
$$;

grant execute on function public.assign_note_taker(text, text, text) to anon, authenticated;
grant execute on function public.update_meeting_notes(text, text, text) to anon, authenticated;

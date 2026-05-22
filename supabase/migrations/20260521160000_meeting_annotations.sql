-- Mark-on-page annotations: pin a comment to an element + assign a teammate

create table if not exists public.meeting_annotations (
  id uuid primary key default gen_random_uuid(),
  room_topic text not null references public.rooms (topic) on delete cascade,
  target_url text not null,
  selector text not null,
  rect jsonb not null default '{}'::jsonb,
  text_preview text not null default '',
  body text not null default '',
  title text not null default '',
  tag text not null default 'note',
  status text not null default 'open',
  created_by_fingerprint text not null,
  created_by_name text not null default '',
  created_by_avatar text not null default '',
  assignee_fingerprint text,
  assignee_name text,
  assignee_avatar text,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  constraint annotations_body_len check (char_length(body) <= 4000),
  constraint annotations_title_len check (char_length(title) <= 200),
  constraint annotations_selector_len check (char_length(selector) <= 1000)
);

create index if not exists meeting_annotations_room_url_idx
  on public.meeting_annotations (room_topic, target_url);

grant select on public.meeting_annotations to anon, authenticated;

alter table public.meeting_annotations enable row level security;

-- All access is via security-definer RPCs below

drop function if exists public.add_meeting_annotation(
  text, text, text, text, jsonb, text, text, text, text, text
);

create or replace function public.add_meeting_annotation(
  p_topic text,
  p_device_fingerprint text,
  p_target_url text,
  p_selector text,
  p_rect jsonb,
  p_text_preview text,
  p_body text,
  p_title text,
  p_tag text,
  p_assignee_fingerprint text default null
)
returns table (
  id uuid,
  room_topic text,
  target_url text,
  selector text,
  rect jsonb,
  text_preview text,
  body text,
  title text,
  tag text,
  status text,
  created_by_fingerprint text,
  created_by_name text,
  created_by_avatar text,
  assignee_fingerprint text,
  assignee_name text,
  assignee_avatar text,
  created_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := public.format_meet_topic(p_topic);
  fp text := left(trim(p_device_fingerprint), 128);
  creator public.room_members%rowtype;
  assignee public.room_members%rowtype;
  ann_id uuid;
begin
  if fp is null or fp = '' then
    raise exception 'device fingerprint required';
  end if;

  select * into creator
  from public.room_members m
  where m.room_topic = t and m.device_fingerprint = fp;

  if not found then
    raise exception 'not a meeting member';
  end if;

  if p_assignee_fingerprint is not null and p_assignee_fingerprint <> '' then
    select * into assignee
    from public.room_members m
    where m.room_topic = t
      and m.device_fingerprint = left(trim(p_assignee_fingerprint), 128);

    if not found then
      raise exception 'assignee must be in the meeting';
    end if;
  end if;

  insert into public.meeting_annotations (
    room_topic,
    target_url,
    selector,
    rect,
    text_preview,
    body,
    title,
    tag,
    created_by_fingerprint,
    created_by_name,
    created_by_avatar,
    assignee_fingerprint,
    assignee_name,
    assignee_avatar
  ) values (
    t,
    left(coalesce(p_target_url, ''), 2048),
    left(coalesce(p_selector, ''), 1000),
    coalesce(p_rect, '{}'::jsonb),
    left(coalesce(p_text_preview, ''), 500),
    left(coalesce(p_body, ''), 4000),
    left(coalesce(nullif(trim(p_title), ''), 'Mark'), 200),
    coalesce(nullif(trim(p_tag), ''), 'note'),
    fp,
    coalesce(creator.display_name, ''),
    coalesce(creator.avatar, '🦊'),
    nullif(p_assignee_fingerprint, ''),
    assignee.display_name,
    assignee.avatar
  )
  returning meeting_annotations.id into ann_id;

  return query
  select
    a.id,
    a.room_topic,
    a.target_url,
    a.selector,
    a.rect,
    a.text_preview,
    a.body,
    a.title,
    a.tag,
    a.status,
    a.created_by_fingerprint,
    a.created_by_name,
    a.created_by_avatar,
    a.assignee_fingerprint,
    a.assignee_name,
    a.assignee_avatar,
    a.created_at,
    a.resolved_at
  from public.meeting_annotations a
  where a.id = ann_id;
end;
$$;

create or replace function public.resolve_meeting_annotation(
  p_id uuid,
  p_device_fingerprint text
)
returns table (
  id uuid,
  status text,
  resolved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  fp text := left(trim(p_device_fingerprint), 128);
  rec public.meeting_annotations%rowtype;
  is_member boolean;
begin
  select * into rec
  from public.meeting_annotations
  where meeting_annotations.id = p_id;

  if not found then
    raise exception 'annotation not found';
  end if;

  select exists(
    select 1 from public.room_members m
    where m.room_topic = rec.room_topic and m.device_fingerprint = fp
  ) into is_member;

  if not is_member then
    raise exception 'not a meeting member';
  end if;

  update public.meeting_annotations
  set
    status = case when status = 'open' then 'done' else 'open' end,
    resolved_at = case when status = 'open' then timezone('utc', now()) else null end
  where meeting_annotations.id = p_id
  returning
    meeting_annotations.id,
    meeting_annotations.status,
    meeting_annotations.resolved_at
  into id, status, resolved_at;

  return next;
end;
$$;

create or replace function public.delete_meeting_annotation(
  p_id uuid,
  p_device_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fp text := left(trim(p_device_fingerprint), 128);
  rec public.meeting_annotations%rowtype;
  is_host boolean;
begin
  select * into rec
  from public.meeting_annotations
  where meeting_annotations.id = p_id;

  if not found then
    return p_id;
  end if;

  select (r.host_fingerprint = fp) into is_host
  from public.rooms r
  where r.topic = rec.room_topic;

  if rec.created_by_fingerprint <> fp and not coalesce(is_host, false) then
    raise exception 'only the creator or host can delete';
  end if;

  delete from public.meeting_annotations where meeting_annotations.id = p_id;
  return p_id;
end;
$$;

create or replace function public.get_meeting_annotations(
  p_topic text,
  p_device_fingerprint text,
  p_target_url text default null
)
returns table (
  id uuid,
  room_topic text,
  target_url text,
  selector text,
  rect jsonb,
  text_preview text,
  body text,
  title text,
  tag text,
  status text,
  created_by_fingerprint text,
  created_by_name text,
  created_by_avatar text,
  assignee_fingerprint text,
  assignee_name text,
  assignee_avatar text,
  created_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := public.format_meet_topic(p_topic);
  fp text := left(trim(p_device_fingerprint), 128);
  filter_url text := nullif(left(trim(coalesce(p_target_url, '')), 2048), '');
begin
  if not exists (
    select 1 from public.room_members m
    where m.room_topic = t and m.device_fingerprint = fp
  ) then
    raise exception 'not a meeting member';
  end if;

  return query
  select
    a.id,
    a.room_topic,
    a.target_url,
    a.selector,
    a.rect,
    a.text_preview,
    a.body,
    a.title,
    a.tag,
    a.status,
    a.created_by_fingerprint,
    a.created_by_name,
    a.created_by_avatar,
    a.assignee_fingerprint,
    a.assignee_name,
    a.assignee_avatar,
    a.created_at,
    a.resolved_at
  from public.meeting_annotations a
  where a.room_topic = t
    and (filter_url is null or a.target_url = filter_url)
  order by a.created_at asc;
end;
$$;

grant execute on function public.add_meeting_annotation(text, text, text, text, jsonb, text, text, text, text, text) to anon, authenticated;
grant execute on function public.resolve_meeting_annotation(uuid, text) to anon, authenticated;
grant execute on function public.delete_meeting_annotation(uuid, text) to anon, authenticated;
grant execute on function public.get_meeting_annotations(text, text, text) to anon, authenticated;

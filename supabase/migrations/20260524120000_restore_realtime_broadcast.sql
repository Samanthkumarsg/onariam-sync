-- Restore anon realtime broadcast (required for clipboard P2P signaling + room inbox sync).

drop policy if exists "onariam_anon_receive_broadcast" on realtime.messages;
drop policy if exists "onariam_anon_send_broadcast" on realtime.messages;

create policy "onariam_anon_receive_broadcast"
  on realtime.messages
  for select
  to anon
  using (realtime.messages.extension in ('broadcast', 'presence'));

create policy "onariam_anon_send_broadcast"
  on realtime.messages
  for insert
  to anon
  with check (realtime.messages.extension in ('broadcast', 'presence'));

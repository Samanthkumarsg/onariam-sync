-- Public bucket for session file attachments (keyed by IPFS CID).
insert into storage.buckets (id, name, public, file_size_limit)
values ('session-files', 'session-files', true, 33554432)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

create policy "session files public read"
  on storage.objects for select
  using (bucket_id = 'session-files');

create policy "session files public insert"
  on storage.objects for insert
  with check (bucket_id = 'session-files');

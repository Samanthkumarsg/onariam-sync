-- Optional seed data (run after migrations via `supabase db seed`)

insert into public.rooms (topic, title)
values ('onariam-sync', 'Onariam Sync')
on conflict (topic) do nothing;

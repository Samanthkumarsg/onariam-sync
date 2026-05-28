-- Daily cleanup of expired sessions (requires pg_cron on Supabase)

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.unschedule(jobid)
from cron.job
where jobname = 'onariam_cleanup_expired_rooms';

select cron.schedule(
  'onariam_cleanup_expired_rooms',
  '15 3 * * *',
  $$select public.cleanup_expired_rooms();$$
);

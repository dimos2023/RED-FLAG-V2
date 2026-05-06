-- Seed admin access for dedicated account by email.
-- Run this migration (or execute manually) after the user exists in auth.users.

insert into public.app_admins (user_id)
select id
from auth.users
where email = 'quantumnetwork1000@gmail.com'
on conflict (user_id) do nothing;


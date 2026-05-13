-- Ensures the authorized admin Google account is in app_admins.
-- Safe if the older seed already targeted a different email.

insert into public.app_admins (user_id)
select id
from auth.users
where lower(trim(email)) = lower(trim('ahmedashry.hh@gmail.com'))
on conflict (user_id) do nothing;

-- Extended registration / verification fields for individuals and companies.

alter table public.profiles add column if not exists full_legal_name text;
alter table public.profiles add column if not exists shipping_line1 text;
alter table public.profiles add column if not exists shipping_line2 text;
alter table public.profiles add column if not exists shipping_city text;
alter table public.profiles add column if not exists shipping_region text;
alter table public.profiles add column if not exists shipping_postal_code text;
alter table public.profiles add column if not exists shipping_country text;

alter table public.profiles add column if not exists company_legal_name text;
alter table public.profiles add column if not exists company_address_line1 text;
alter table public.profiles add column if not exists company_address_line2 text;
alter table public.profiles add column if not exists company_city text;
alter table public.profiles add column if not exists company_region text;
alter table public.profiles add column if not exists company_postal_code text;
alter table public.profiles add column if not exists company_country text;
alter table public.profiles add column if not exists company_location_note text;

alter table public.profiles add column if not exists national_id_storage_path text;
alter table public.profiles add column if not exists commercial_registry_storage_paths text[];

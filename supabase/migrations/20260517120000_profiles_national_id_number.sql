-- Optional national ID number (digits) for OCR cross-check and display.
alter table public.profiles add column if not exists national_id_number text;

-- Add article credits fields (safe to run multiple times)
alter table if exists public.articles
  add column if not exists credit_author text,
  add column if not exists credit_photos text,
  add column if not exists credit_director text;


-- Security hardening for admin access and write operations.
-- Run in Supabase SQL Editor.

alter table public.articles enable row level security;
alter table public.agenda_events enable row level security;
alter table public.site_settings enable row level security;

-- Public read-only policies
drop policy if exists "public read published articles" on public.articles;
create policy "public read published articles"
on public.articles
for select
using (published = true);

drop policy if exists "public read agenda" on public.agenda_events;
create policy "public read agenda"
on public.agenda_events
for select
using (true);

drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings"
on public.site_settings
for select
using (true);

-- Authenticated-only write access
drop policy if exists "auth manage articles" on public.articles;
create policy "auth manage articles"
on public.articles
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "auth manage agenda" on public.agenda_events;
create policy "auth manage agenda"
on public.agenda_events
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "auth manage settings" on public.site_settings;
create policy "auth manage settings"
on public.site_settings
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Storage policies: public read, authenticated write
drop policy if exists "public read article media" on storage.objects;
create policy "public read article media"
on storage.objects
for select
using (bucket_id = 'article-media');

drop policy if exists "auth upload article media" on storage.objects;
create policy "auth upload article media"
on storage.objects
for insert
with check (bucket_id = 'article-media' and auth.role() = 'authenticated');

drop policy if exists "auth update article media" on storage.objects;
create policy "auth update article media"
on storage.objects
for update
using (bucket_id = 'article-media' and auth.role() = 'authenticated')
with check (bucket_id = 'article-media' and auth.role() = 'authenticated');

drop policy if exists "auth delete article media" on storage.objects;
create policy "auth delete article media"
on storage.objects
for delete
using (bucket_id = 'article-media' and auth.role() = 'authenticated');

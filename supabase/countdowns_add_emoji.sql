-- Add manual emoji support for countdowns.
-- Run in Supabase SQL Editor.

alter table public.countdowns
add column if not exists emoji text;

-- Backfill existing rows so current countdowns keep their emoji.
update public.countdowns
set emoji = case
  when slug = 'termine-lezioni' then '📚'
  when slug in ('vacanze-pasqua-2026', 'vacanze-pasquali-2026') then '🥚'
  when slug = 'vacanze-natale-2025' then '🎄'
  when slug = 'festa-lavoro-2026' then '🧑‍🏭'
  when slug = 'festa-repubblica-2026' then '🇮🇹'
  when slug = 'primo-giugno-2026' then '📅'
  when slug = 'immacolata-concezione-2025' then '🕊️'
  else emoji
end
where coalesce(emoji, '') = '';

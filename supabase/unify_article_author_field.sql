-- Unifica autore articolo: usa solo author_name e rimuove credit_author
-- Sicuro da eseguire più volte.

alter table if exists public.articles
  add column if not exists author_name text;

-- Migra i dati esistenti: se author_name è vuoto ma credit_author è valorizzato,
-- copia il valore in author_name.
update public.articles
set author_name = nullif(btrim(coalesce(author_name, credit_author)), '')
where nullif(btrim(coalesce(author_name, '')), '') is null
  and nullif(btrim(coalesce(credit_author, '')), '') is not null;

-- Rimuove il campo duplicato.
alter table if exists public.articles
  drop column if exists credit_author;

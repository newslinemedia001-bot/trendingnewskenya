-- Trending News Kenya — newsroom schema
-- =============================================
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
--
-- Tables live in the `public` schema with a `dkbn_` prefix so they cannot
-- collide with the project's other tables. Every read and write happens on the
-- server with the service-role key, so row-level security stays on and the
-- browser cannot reach any of it directly.

-- ========== articles ==========
create table if not exists dkbn_articles (
  id text primary key,
  slug text not null unique,
  title text,
  dek text,
  section text default 'kenya',
  tags text[] default '{}',
  body text,
  status text default 'draft',
  wire boolean default false,
  source text,
  "sourceUrl" text,
  "originalUrl" text,
  "authorUid" text,
  "authorSlug" text,
  "authorName" text,
  "authorTitle" text,
  "coverImageUrl" text,
  "imageAlt" text,
  "imageCaption" text,
  "imageCredit" text,
  "remoteImage" boolean default false,
  "isFeatured" boolean default false,
  "isBreaking" boolean default false,
  views integer default 0,
  "createdAt" timestamptz,
  "updatedAt" timestamptz,
  "publishedAt" timestamptz,
  "createdBy" text,
  "publishedBy" text,
  "updatedBy" text
);

create index if not exists dkbn_articles_status_published_idx
  on dkbn_articles (status, "publishedAt" desc);
create index if not exists dkbn_articles_section_idx on dkbn_articles (section);
create index if not exists dkbn_articles_wire_idx on dkbn_articles (wire);
create index if not exists dkbn_articles_author_idx on dkbn_articles ("authorUid");

-- ========== authors (public bylines, keyed by slug) ==========
create table if not exists dkbn_authors (
  id text primary key,
  name text,
  role text,
  bio text,
  "updatedAt" timestamptz
);

-- ========== desk accounts ==========
create table if not exists dkbn_users (
  id text primary key,
  email text unique,
  name text,
  slug text,
  title text,
  role text default 'editor',
  active boolean default true,
  "passwordHash" text,
  "createdAt" timestamptz,
  "updatedAt" timestamptz,
  "lastLoginAt" timestamptz,
  "createdBy" text,
  "updatedBy" text
);

-- ========== newsletter opt-ins ==========
create table if not exists dkbn_newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  "createdAt" timestamptz not null default now()
);

create index if not exists dkbn_newsletter_signups_email_idx on dkbn_newsletter_signups (email);

-- ========== lock the tables down to the server ==========
revoke all on dkbn_articles from anon, authenticated;
revoke all on dkbn_authors from anon, authenticated;
revoke all on dkbn_users from anon, authenticated;
revoke all on dkbn_newsletter_signups from anon, authenticated;

grant all on dkbn_articles to service_role;
grant all on dkbn_authors to service_role;
grant all on dkbn_users to service_role;
grant all on dkbn_newsletter_signups to service_role;

alter table dkbn_articles enable row level security;
alter table dkbn_authors enable row level security;
alter table dkbn_users enable row level security;
alter table dkbn_newsletter_signups enable row level security;

-- ========== storage ==========
-- Lead images live in a public bucket. Uploads use the service role, so no
-- extra storage policies are required for writes; this policy makes the objects
-- readable by the public site.
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do update set public = true;

drop policy if exists "covers are publicly readable" on storage.objects;
create policy "covers are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'covers');

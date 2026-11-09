-- Trending News Kenya — newsroom schema
-- =====================================
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
--
-- Trending News Kenya — newsroom tables
-- =====================================
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
--
-- Tables live in the `public` schema with a `tnk_` prefix so they cannot
-- collide with the project's existing legacy tables (articles, wire_items,
-- profiles, feed_sources). Every read and write happens on the server with the
-- service-role key, so row-level security stays on and the browser cannot
-- reach any of it directly.


-- ========== articles ==========
create table if not exists tnk_articles (
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

create index if not exists tnk_articles_status_published_idx
  on tnk_articles (status, "publishedAt" desc);
create index if not exists tnk_articles_section_idx on tnk_articles (section);
create index if not exists tnk_articles_wire_idx on tnk_articles (wire);
create index if not exists tnk_articles_author_idx on tnk_articles ("authorUid");

-- ========== authors (public bylines, keyed by slug) ==========
create table if not exists tnk_authors (
  id text primary key,
  name text,
  role text,
  bio text,
  "updatedAt" timestamptz
);

-- ========== desk accounts ==========
create table if not exists tnk_users (
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
create table if not exists tnk_newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  "createdAt" timestamptz not null default now()
);

create index if not exists newsletter_signups_email_idx on tnk_newsletter_signups (email);

-- ========== lock the tables down to the server ==========
revoke all on tnk_articles from anon, authenticated;
revoke all on tnk_authors from anon, authenticated;
revoke all on tnk_users from anon, authenticated;
revoke all on tnk_newsletter_signups from anon, authenticated;

grant all on tnk_articles to service_role;
grant all on tnk_authors to service_role;
grant all on tnk_users to service_role;
grant all on tnk_newsletter_signups to service_role;

grant usage, select on sequence tnk_newsletter_signups_id_seq to service_role;

alter table tnk_articles enable row level security;
alter table tnk_authors enable row level security;
alter table tnk_users enable row level security;
alter table tnk_newsletter_signups enable row level security;

-- ========== storage ==========
-- The bucket itself is created from the dashboard (Storage -> New bucket,
-- name `covers`, Public). Lead images are uploaded with the service role, so
-- no extra storage policies are required for writes; this policy makes the
-- objects readable by the public site.
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do update set public = true;

drop policy if exists "covers are publicly readable" on storage.objects;
create policy "covers are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'covers');

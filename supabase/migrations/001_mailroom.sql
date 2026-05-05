-- ViralPack Client Mailroom beta schema
-- Run this in Supabase SQL editor before deploying.

create extension if not exists pgcrypto;

create table if not exists public.mailroom_profiles (
  id uuid primary key default gen_random_uuid(),
  user_key text not null unique,
  display_name text,
  business_name text,
  website_url text,
  sender_name text,
  sender_email text,
  reply_to_email text,
  sending_domain text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text default 'US',
  brand_profile jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mailroom_contact_lists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.mailroom_profiles(id) on delete cascade,
  name text not null,
  source_filename text,
  source_kind text default 'file_upload',
  total_rows integer default 0,
  valid_contacts integer default 0,
  rejected_contacts integer default 0,
  upload_notes jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mailroom_contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.mailroom_profiles(id) on delete cascade,
  list_id uuid not null references public.mailroom_contact_lists(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  full_name text,
  tags text[] default '{}',
  raw_payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(profile_id, list_id, email)
);

create index if not exists mailroom_contacts_profile_email_idx on public.mailroom_contacts(profile_id, email);
create index if not exists mailroom_contacts_list_idx on public.mailroom_contacts(list_id);

create table if not exists public.mailroom_suppression (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.mailroom_profiles(id) on delete cascade,
  email text not null,
  reason text not null default 'unsubscribe',
  created_at timestamptz not null default now(),
  unique(profile_id, email)
);

create table if not exists public.mailroom_campaigns (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.mailroom_profiles(id) on delete cascade,
  list_id uuid references public.mailroom_contact_lists(id) on delete set null,
  mode text not null default 'manual',
  theme text,
  subject text,
  preview_text text,
  html_body text,
  text_body text,
  status text not null default 'draft',
  recipient_count integer default 0,
  resend_response jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.mailroom_send_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.mailroom_campaigns(id) on delete cascade,
  profile_id uuid references public.mailroom_profiles(id) on delete cascade,
  email text,
  event_type text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Public image bucket for email images. Email clients must be able to fetch images without auth.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mailroom-public-assets', 'mailroom-public-assets', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true;

-- Public read policy for campaign images.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'mailroom public asset read'
  ) then
    create policy "mailroom public asset read" on storage.objects
      for select using (bucket_id = 'mailroom-public-assets');
  end if;
end $$;

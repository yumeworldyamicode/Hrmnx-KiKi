-- KiKi News Posts
-- Run this in the Supabase SQL Editor for the shared Hrmnx project.

create table if not exists public.kiki_news_posts (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    subtitle text,
    header_image_url text,
    sections jsonb not null default '[]'::jsonb,
    is_published boolean not null default false,
    author_id uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.kiki_news_posts enable row level security;

drop policy if exists "Public can read published KiKi News Posts" on public.kiki_news_posts;
create policy "Public can read published KiKi News Posts"
on public.kiki_news_posts
for select
to anon, authenticated
using (
    is_published = true
    or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.is_staff = true
    )
);

drop policy if exists "Staff can create KiKi News Posts" on public.kiki_news_posts;
create policy "Staff can create KiKi News Posts"
on public.kiki_news_posts
for insert
to authenticated
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.is_staff = true
    )
);

drop policy if exists "Staff can update KiKi News Posts" on public.kiki_news_posts;
create policy "Staff can update KiKi News Posts"
on public.kiki_news_posts
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.is_staff = true
    )
)
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.is_staff = true
    )
);

drop policy if exists "Staff can delete KiKi News Posts" on public.kiki_news_posts;
create policy "Staff can delete KiKi News Posts"
on public.kiki_news_posts
for delete
to authenticated
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.is_staff = true
    )
);

create index if not exists kiki_news_posts_published_created_idx
on public.kiki_news_posts (is_published, created_at desc);

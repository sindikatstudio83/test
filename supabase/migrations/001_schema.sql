-- Initial Supabase schema for imaposla.me MVP.
-- Run after creating a Supabase project. Policies are intentionally conservative.

create type public.user_role as enum ('candidate', 'company', 'admin');
create type public.job_status as enum ('draft', 'pending_review', 'active', 'paused', 'rejected', 'expired');
create type public.application_stage as enum ('applied', 'review', 'interview', 'shortlist', 'offer', 'rejected', 'hired');
create type public.order_status as enum ('pending', 'paid', 'rejected', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'candidate',
  full_name text,
  email text,
  phone text,
  city text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  bio text,
  skills text[] not null default '{}',
  cv_path text,
  public_profile boolean not null default false,
  contact_visible boolean not null default false
);

create table public.companies (
  id bigserial primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  city text,
  industry text,
  description text,
  logo_path text,
  website text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id bigserial primary key,
  name text not null,
  slug text not null unique
);

create table public.cities (
  id bigserial primary key,
  name text not null,
  slug text not null unique
);

create table public.jobs (
  id bigserial primary key,
  company_id bigint not null references public.companies(id) on delete cascade,
  category_id bigint references public.categories(id),
  city_id bigint references public.cities(id),
  title text not null,
  slug text not null unique,
  description text not null,
  requirements text,
  contract_type text,
  salary_text text,
  deadline date,
  status public.job_status not null default 'pending_review',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_applications (
  id bigserial primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  stage public.application_stage not null default 'applied',
  cover_letter text,
  cv_path text,
  reference_code text not null unique,
  created_at timestamptz not null default now(),
  unique(job_id, candidate_id)
);

create table public.ats_comments (
  id bigserial primary key,
  application_id bigint not null references public.job_applications(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.application_events (
  id bigserial primary key,
  application_id bigint not null references public.job_applications(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  from_stage public.application_stage,
  to_stage public.application_stage,
  note text,
  created_at timestamptz not null default now()
);

create table public.plans (
  id bigserial primary key,
  name text not null unique,
  price_eur numeric(10,2) not null,
  active_jobs integer not null,
  unlock_credits integer not null,
  features text[] not null default '{}'
);

create table public.orders (
  id bigserial primary key,
  company_id bigint not null references public.companies(id) on delete cascade,
  plan_id bigint not null references public.plans(id),
  status public.order_status not null default 'pending',
  amount_eur numeric(10,2) not null,
  payment_reference text not null unique,
  activation_code text unique,
  confirmed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table public.subscriptions (
  id bigserial primary key,
  company_id bigint not null references public.companies(id) on delete cascade,
  plan_id bigint not null references public.plans(id),
  active_from date not null default current_date,
  active_until date,
  unlock_credits_remaining integer not null default 0
);

create table public.banners (
  id bigserial primary key,
  company_id bigint references public.companies(id) on delete cascade,
  title text not null,
  image_path text,
  target_url text,
  placement text not null default 'home',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.ats_comments enable row level security;
alter table public.application_events enable row level security;
alter table public.orders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.banners enable row level security;

create policy "profiles own read" on public.profiles for select using (auth.uid() = id);
create policy "profiles own update" on public.profiles for update using (auth.uid() = id);

create policy "public active jobs" on public.jobs for select using (status = 'active');
create policy "company owns jobs" on public.jobs for all using (
  exists (
    select 1 from public.companies c
    where c.id = jobs.company_id and c.owner_id = auth.uid()
  )
);

create policy "candidate owns applications" on public.job_applications for select using (candidate_id = auth.uid());
create policy "candidate inserts own applications" on public.job_applications for insert with check (candidate_id = auth.uid());
create policy "company sees applications for own jobs" on public.job_applications for select using (
  exists (
    select 1 from public.jobs j
    join public.companies c on c.id = j.company_id
    where j.id = job_applications.job_id and c.owner_id = auth.uid()
  )
);

insert into public.categories (name, slug) values
  ('Ugostiteljstvo', 'ugostiteljstvo'),
  ('Turizam', 'turizam'),
  ('Prodaja', 'prodaja'),
  ('Administracija', 'administracija')
on conflict do nothing;

insert into public.cities (name, slug) values
  ('Podgorica', 'podgorica'),
  ('Budva', 'budva'),
  ('Kotor', 'kotor'),
  ('Nikšić', 'niksic'),
  ('Bar', 'bar')
on conflict do nothing;

insert into public.plans (name, price_eur, active_jobs, unlock_credits, features) values
  ('Starter', 25, 3, 10, array['3 aktivna oglasa', '10 kredita', 'Osnovna podrška']),
  ('Growth', 80, 10, 50, array['10 aktivnih oglasa', '50 kredita', 'ATS', 'Prioritetna podrška']),
  ('Pro', 200, 999, 200, array['Neograničeni oglasi', '200 kredita', 'Baneri', 'Napredna statistika'])
on conflict do nothing;

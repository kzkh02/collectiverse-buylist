create extension if not exists "pgcrypto";

create table if not exists buy_submissions (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null,
  customer_name text,
  payment_method text,
  status text not null default 'pending_review',
  offer_total numeric(12,2) not null default 0,
  customer_message text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists buy_submission_cards (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references buy_submissions(id) on delete cascade,
  tcg_id text,
  source text,
  card_language text not null default 'en',
  card_name text not null,
  set_name text,
  card_number text,
  image_url text,
  front_photo_url text,
  back_photo_url text,
  condition text,
  condition_note text,
  quantity integer not null default 1,
  review_status text not null default 'pending',
  offer_amount numeric(12,2),
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_buy_submissions_status_created on buy_submissions(status, created_at desc);
create index if not exists idx_buy_submission_cards_submission on buy_submission_cards(submission_id);

alter table buy_submissions add column if not exists payment_method text;
alter table buy_submission_cards add column if not exists tcg_id text;
alter table buy_submission_cards add column if not exists source text;
alter table buy_submission_cards add column if not exists card_language text not null default 'en';
alter table buy_submission_cards add column if not exists condition text;
alter table buy_submission_cards add column if not exists quantity integer not null default 1;

-- LangkahKu schema v0.1 (same tables as apps/api/app/models.py, docs/08-DATA-MODEL.md).
-- Applied with `supabase db push`. Only the Edge Function (postgres role) reads/writes these tables:
-- RLS is enabled with no policies, so Supabase's public REST/GraphQL APIs cannot see student data.

create table users (
  id text primary key default gen_random_uuid()::text,
  role varchar(10) not null check (role in ('student', 'teacher', 'admin')),
  username varchar(30) not null unique,
  password_hash varchar(100) not null,
  display_name varchar(40) not null,
  status varchar(10) not null default 'active',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_active_at timestamptz
);

create table classes (
  id text primary key default gen_random_uuid()::text,
  teacher_id text not null references users (id),
  name varchar(40) not null,
  grade integer not null default 8,
  join_code varchar(6) not null unique,
  -- {"ai_enabled", "daily_quota", "allow_full_solution", "leaderboard_enabled"}
  settings jsonb not null default '{}'::jsonb
);
create index classes_teacher_id_idx on classes (teacher_id);

create table class_members (
  class_id text not null references classes (id) on delete cascade,
  student_id text not null references users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index class_members_student_id_idx on class_members (student_id);

create table attempts (
  id text primary key default gen_random_uuid()::text,
  student_id text not null references users (id) on delete cascade,
  problem_id varchar(80) not null,
  module_id varchar(20),
  source varchar(20) not null default 'content', -- content | generated | ai
  method varchar(20),
  problem_snapshot jsonb not null, -- full problem incl. answers (server only)
  state jsonb not null default '{}'::jsonb, -- per-step {status, hint_level, tries}
  score double precision,
  points_awarded integer not null default 0,
  explanation text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index attempts_student_id_idx on attempts (student_id);
create index attempts_problem_id_idx on attempts (problem_id);

create table step_attempts (
  id text primary key default gen_random_uuid()::text,
  attempt_id text not null references attempts (id) on delete cascade,
  step_id varchar(20) not null,
  modeling_stage integer,
  answer_raw varchar(300) not null,
  is_correct boolean not null,
  error_code varchar(30),
  hint_level_used integer not null default 0,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now()
);
create index step_attempts_attempt_id_idx on step_attempts (attempt_id);
create index step_attempts_created_at_idx on step_attempts (created_at);

create table module_progress (
  student_id text not null references users (id) on delete cascade,
  module_id varchar(20) not null,
  status varchar(15) not null default 'in_progress',
  last_screen integer not null default 0,
  best_score double precision,
  updated_at timestamptz not null default now(),
  primary key (student_id, module_id)
);

-- Per-day study time and points: daily goal, streak, class board. day = YYYY-MM-DD (WIB)
create table daily_activity (
  student_id text not null references users (id) on delete cascade,
  day varchar(10) not null,
  seconds integer not null default 0,
  points integer not null default 0,
  problems_completed integer not null default 0,
  primary key (student_id, day)
);

create table notes (
  id text primary key default gen_random_uuid()::text,
  student_id text not null references users (id) on delete cascade,
  module_id varchar(20),
  title varchar(80) not null default '',
  body text not null default '',
  updated_at timestamptz not null default now()
);
create index notes_student_id_idx on notes (student_id);

create table modeler_submissions (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references users (id) on delete cascade,
  class_id text,
  purpose varchar(10) not null default 'solve',
  input_text text not null,
  input_hash varchar(64) not null,
  status varchar(20) not null,
  model_json jsonb,
  verification_json jsonb,
  repaired boolean not null default false,
  cached boolean not null default false,
  llm_model varchar(40),
  prompt_version varchar(20),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  latency_ms integer not null default 0,
  rating integer not null default 0,
  created_at timestamptz not null default now()
);
create index modeler_submissions_user_id_idx on modeler_submissions (user_id);
create index modeler_submissions_input_hash_idx on modeler_submissions (input_hash);
create index modeler_submissions_created_at_idx on modeler_submissions (created_at);

-- Children's data: no access through the Supabase Data API (anon/authenticated keys).
alter table users enable row level security;
alter table classes enable row level security;
alter table class_members enable row level security;
alter table attempts enable row level security;
alter table step_attempts enable row level security;
alter table module_progress enable row level security;
alter table daily_activity enable row level security;
alter table notes enable row level security;
alter table modeler_submissions enable row level security;

create table if not exists public.exams (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    type text not null,
    stage text not null,
    grade text not null,
    duration_minutes integer not null check (duration_minutes > 0),
    total_points integer not null check (total_points > 0),
    created_at timestamptz not null default now()
);

create table if not exists public.exam_questions (
    id uuid primary key default gen_random_uuid(),
    exam_id uuid not null references public.exams(id) on delete cascade,
    topic text not null,
    question_text text not null,
    points integer not null check (points > 0),
    options jsonb not null default '[]'::jsonb,
    correct_answer text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.exam_attempts (
    id uuid primary key default gen_random_uuid(),
    exam_id uuid not null references public.exams(id) on delete cascade,
    student_id uuid not null references public.students(id) on delete cascade,
    score integer not null default 0 check (score >= 0),
    started_at timestamptz not null default now(),
    completed_at timestamptz
);

create table if not exists public.exam_answers (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
    question_id uuid not null references public.exam_questions(id) on delete cascade,
    is_correct boolean not null default false,
    awarded_points integer not null default 0 check (awarded_points >= 0),
    answered_at timestamptz not null default now(),
    unique (attempt_id, question_id)
);

create index if not exists exam_questions_exam_id_idx
    on public.exam_questions(exam_id);

create index if not exists exam_questions_topic_idx
    on public.exam_questions(topic);

create index if not exists exam_attempts_student_id_idx
    on public.exam_attempts(student_id);

create index if not exists exam_answers_question_id_idx
    on public.exam_answers(question_id);

alter table public.students add column if not exists grade text;
alter table public.students add column if not exists password_encrypted text;

alter table public.exams add column if not exists stage text;
alter table public.exams add column if not exists grade text;
alter table public.exams add column if not exists duration_minutes integer;

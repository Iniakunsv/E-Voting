-- Run this SQL in Supabase SQL Editor.
-- Keep the service role key only in server-side environment variables.

create table if not exists public.voter_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null unique references public.voter_codes(id),
  candidate_id text not null check (candidate_id in ('paslon-1', 'paslon-2')),
  created_at timestamptz not null default now()
);

alter table public.voter_codes enable row level security;
alter table public.votes enable row level security;
-- No public policies: browser clients cannot read/write these tables.
-- Server uses service-role key, which bypasses RLS; protect it carefully.

create or replace function public.cast_vote_once(p_voter_id uuid, p_candidate_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_candidate_id not in ('paslon-1', 'paslon-2') then
    raise exception 'invalid candidate';
  end if;

  update public.voter_codes
     set used_at = now()
   where id = p_voter_id and used_at is null;

  if not found then
    raise exception 'already used';
  end if;

  insert into public.votes(voter_id, candidate_id)
  values (p_voter_id, p_candidate_id);
end;
$$;

revoke all on function public.cast_vote_once(uuid, text) from public, anon, authenticated;
grant execute on function public.cast_vote_once(uuid, text) to service_role;

-- Generate voter codes outside the public frontend, hash each code with SHA-256,
-- then insert only the hashes into voter_codes.code_hash.

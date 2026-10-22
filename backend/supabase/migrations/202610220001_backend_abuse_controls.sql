-- Configure SUPABASE_SECRET_KEY on backend before applying this migration.
-- Public reads keep anonymous RLS. Public writes can only pass through backend.
begin;

create table if not exists public.request_rate_limits (
  scope text not null,
  subject text not null check (subject ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (scope, subject)
);
create index if not exists request_rate_limits_expiry_idx on public.request_rate_limits(expires_at);
alter table public.request_rate_limits enable row level security;
revoke all on public.request_rate_limits from public, anon, authenticated;

create or replace function public.consume_request_limit(input_scope text, input_subject text)
returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  maximum integer;
  window_seconds integer;
  checked_at timestamptz := clock_timestamp();
  counter public.request_rate_limits%rowtype;
begin
  case input_scope
    when 'wish' then maximum := 5; window_seconds := 600;
    when 'login-ip' then maximum := 10; window_seconds := 900;
    when 'login-account' then maximum := 10; window_seconds := 900;
    when 'reauth' then maximum := 5; window_seconds := 900;
    when 'invitation' then maximum := 60; window_seconds := 60;
    else raise exception 'invalid scope';
  end case;
  if input_subject is null or input_subject !~ '^[a-f0-9]{64}$' then raise exception 'invalid subject'; end if;

  -- One atomic row update serializes concurrent functions/regions.
  insert into public.request_rate_limits(scope, subject, expires_at, attempts)
  values (input_scope, input_subject, checked_at + make_interval(secs => window_seconds), 1)
  on conflict (scope, subject) do update set
    attempts = case when request_rate_limits.expires_at <= checked_at then 1 else least(request_rate_limits.attempts, maximum) + 1 end,
    expires_at = case when request_rate_limits.expires_at <= checked_at then excluded.expires_at else request_rate_limits.expires_at end
  returning * into counter;

  -- Bound opportunistic cleanup work; no raw IP/email is stored.
  if random() < 0.01 then
    delete from public.request_rate_limits where (scope, subject) in (
      select scope, subject from public.request_rate_limits where expires_at < checked_at - interval '1 hour' limit 1000
    );
  end if;
  return case when counter.attempts > maximum then greatest(1, ceil(extract(epoch from counter.expires_at - checked_at))::integer) else 0 end;
end;
$$;
revoke all on function public.consume_request_limit(text, text) from public, anon, authenticated;
grant execute on function public.consume_request_limit(text, text) to service_role;

revoke all on function public.submit_public_wish(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.submit_invitation_response(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_public_wish(text, text, text, text, text) to service_role;
grant execute on function public.submit_invitation_response(text, text, text, text, text) to service_role;

-- The old base-table public policy exposes internal foreign keys. Realtime and
-- public APIs read the approved, minimal public_wishes projection instead.
drop policy if exists wishes_public_read on public.wishes;
revoke select on public.wishes from anon;

commit;

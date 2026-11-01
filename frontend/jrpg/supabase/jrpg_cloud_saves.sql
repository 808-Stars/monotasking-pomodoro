-- One private checkpoint per MONOPOMO account. Applied through Supabase MCP.
create table public.jrpg_cloud_saves (
 user_id uuid primary key references auth.users(id) on delete cascade,
 version bigint not null check (version > 0),
 schema_version integer not null default 1 check (schema_version = 1),
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 4194304),
 previous_payload jsonb,
 last_request uuid not null,
 updated_at timestamptz not null default now()
);
alter table public.jrpg_cloud_saves enable row level security;
revoke all on public.jrpg_cloud_saves from anon;
grant select, insert, update on public.jrpg_cloud_saves to authenticated;
create policy jrpg_read_own on public.jrpg_cloud_saves for select to authenticated
 using ((select auth.uid()) = user_id);
create policy jrpg_insert_own on public.jrpg_cloud_saves for insert to authenticated
 with check ((select auth.uid()) = user_id);
create policy jrpg_update_own on public.jrpg_cloud_saves for update to authenticated
 using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.save_jrpg_checkpoint(p_expected_version bigint, p_payload jsonb, p_request_id uuid)
returns table(version bigint, payload jsonb, updated_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare
 uid uuid := auth.uid();
 saved public.jrpg_cloud_saves%rowtype;
begin
 if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_request_id is null or p_expected_version is null or p_expected_version < 0
  or p_payload is null or jsonb_typeof(p_payload) <> 'object'
  or jsonb_typeof(p_payload->'game') is distinct from 'object'
  or not (p_payload ? 'battle') or not (p_payload ? 'revision')
  or jsonb_typeof(p_payload->'revision') is distinct from 'number'
  or (jsonb_typeof(p_payload->'battle') not in ('object','null'))
  or octet_length(p_payload::text) > 4194304 then
   raise exception 'Invalid JRPG checkpoint' using errcode='22023';
 end if;
 if p_expected_version = 0 then
  insert into public.jrpg_cloud_saves(user_id,version,payload,last_request)
   values(uid,1,p_payload,p_request_id) on conflict(user_id) do nothing returning * into saved;
  if found then return query select saved.version,saved.payload,saved.updated_at; return; end if;
 end if;
 select * into saved from public.jrpg_cloud_saves s where s.user_id=uid for update;
 if not found then raise exception 'JRPG save version conflict' using errcode='PT409'; end if;
 if saved.last_request=p_request_id then
  return query select saved.version,saved.payload,saved.updated_at; return;
 end if;
 if saved.version<>p_expected_version then raise exception 'JRPG save version conflict' using errcode='PT409'; end if;
 update public.jrpg_cloud_saves s set previous_payload=s.payload,payload=p_payload,
  version=s.version+1,last_request=p_request_id,updated_at=now() where s.user_id=uid returning * into saved;
 return query select saved.version,saved.payload,saved.updated_at;
end;
$$;
revoke all on function public.save_jrpg_checkpoint(bigint,jsonb,uuid) from public,anon;
grant execute on function public.save_jrpg_checkpoint(bigint,jsonb,uuid) to authenticated;
comment on table public.jrpg_cloud_saves is 'Private JRPG checkpoints; server version provides optimistic concurrency, previous_payload retains the preceding checkpoint. Client-authored game state is not anti-cheat proof.';

-- Full bootstrap SQL (schema + policies + automations)
-- This file consolidates:
-- 1) 20260322_init.sql
-- 2) 20260322_cron_alerts.sql
--
-- Optional before running:
-- alter database postgres set app.settings.send_alerts_url = 'https://<project-ref>.functions.supabase.co/send-alerts';
-- alter database postgres set app.settings.service_role_key = '<SUPABASE_SERVICE_ROLE_KEY>';

-- ===== BEGIN: 20260322_init.sql =====


create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type member_role as enum ('owner', 'admin', 'member');
  end if;
end
$$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  timezone text not null default 'America/Sao_Paulo',
  alert_inactive_days integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role member_role not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  fields jsonb not null default '[]'::jsonb,
  consent_text text not null,
  success_message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role member_role not null default 'member',
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete restrict,
  name text not null,
  name_normalized text,
  phone text not null,
  phone_normalized text not null,
  email text,
  email_normalized text,
  company text,
  company_normalized text,
  need text,
  score integer not null default 0,
  budget numeric,
  deadline text,
  notes text,
  source text,
  priority text not null default 'medium',
  tags text[] not null default '{}',
  assigned_to uuid references auth.users(id) on delete set null,
  has_pending_task boolean not null default false,
  last_contact_at timestamptz,
  closed_at timestamptz,
  closed_reason text,
  status text check (status in ('won', 'lost')),
  utm jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null,
  created_by text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null,
  due_at timestamptz not null,
  status text not null default 'pending',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ip text not null,
  hour_bucket text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_members_user on public.workspace_members (user_id, status);
create index if not exists idx_stages_workspace_position on public.stages (workspace_id, position);
create index if not exists idx_forms_workspace on public.forms (workspace_id);
create index if not exists idx_invites_workspace_email on public.invites (workspace_id, email);
create index if not exists idx_leads_workspace_stage on public.leads (workspace_id, stage_id, updated_at desc);
create index if not exists idx_leads_workspace_source on public.leads (workspace_id, source);
create index if not exists idx_leads_workspace_score on public.leads (workspace_id, score);
create index if not exists idx_leads_workspace_budget on public.leads (workspace_id, budget);
create index if not exists idx_leads_workspace_last_contact on public.leads (workspace_id, last_contact_at);
create index if not exists idx_leads_phone on public.leads (workspace_id, phone_normalized);
create index if not exists idx_leads_email on public.leads (workspace_id, email_normalized);
create index if not exists idx_lead_events_feed on public.lead_events (workspace_id, lead_id, created_at desc);
create index if not exists idx_lead_tasks_feed on public.lead_tasks (workspace_id, lead_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications (workspace_id, user_id, read_at, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_workspaces on public.workspaces;
create trigger trg_touch_workspaces
before update on public.workspaces
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_workspace_members on public.workspace_members;
create trigger trg_touch_workspace_members
before update on public.workspace_members
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_pipelines on public.pipelines;
create trigger trg_touch_pipelines
before update on public.pipelines
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_stages on public.stages;
create trigger trg_touch_stages
before update on public.stages
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_forms on public.forms;
create trigger trg_touch_forms
before update on public.forms
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_leads on public.leads;
create trigger trg_touch_leads
before update on public.leads
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_lead_tasks on public.lead_tasks;
create trigger trg_touch_lead_tasks
before update on public.lead_tasks
for each row execute function public.touch_updated_at();

create or replace function public.current_workspace_role(workspace_uuid uuid)
returns member_role
language sql
stable
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = workspace_uuid
    and wm.user_id = auth.uid()
    and wm.status = 'active'
  limit 1;
$$;

create or replace function public.is_workspace_member(workspace_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_uuid
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.pipelines enable row level security;
alter table public.stages enable row level security;
alter table public.forms enable row level security;
alter table public.invites enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.lead_tasks enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

drop policy if exists "workspaces_update_owner_admin" on public.workspaces;
create policy "workspaces_update_owner_admin"
on public.workspaces
for update
to authenticated
using (public.current_workspace_role(id) in ('owner', 'admin'))
with check (public.current_workspace_role(id) in ('owner', 'admin'));

drop policy if exists "workspace_members_select_member" on public.workspace_members;
create policy "workspace_members_select_member"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_members_manage_owner_admin" on public.workspace_members;
create policy "workspace_members_manage_owner_admin"
on public.workspace_members
for all
to authenticated
using (public.current_workspace_role(workspace_id) in ('owner', 'admin'))
with check (public.current_workspace_role(workspace_id) in ('owner', 'admin'));

drop policy if exists "pipelines_member_all" on public.pipelines;
create policy "pipelines_member_all"
on public.pipelines
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "stages_member_all" on public.stages;
create policy "stages_member_all"
on public.stages
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "forms_member_all" on public.forms;
create policy "forms_member_all"
on public.forms
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "invites_member_all" on public.invites;
create policy "invites_member_all"
on public.invites
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "leads_member_all" on public.leads;
create policy "leads_member_all"
on public.leads
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "lead_events_member_all" on public.lead_events;
create policy "lead_events_member_all"
on public.lead_events
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "lead_tasks_member_all" on public.lead_tasks;
create policy "lead_tasks_member_all"
on public.lead_tasks
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "notifications_member_select" on public.notifications;
create policy "notifications_member_select"
on public.notifications
for select
to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "notifications_member_update" on public.notifications;
create policy "notifications_member_update"
on public.notifications
for update
to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));



-- ===== BEGIN: 20260322_cron_alerts.sql =====

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  alerts_url text := current_setting('app.settings.send_alerts_url', true);
  service_role text := current_setting('app.settings.service_role_key', true);
begin
  if alerts_url is null or alerts_url = '' then
    raise notice 'Cron nao agendado: defina app.settings.send_alerts_url.';
    return;
  end if;

  if service_role is null or service_role = '' then
    raise notice 'Cron nao agendado: defina app.settings.service_role_key.';
    return;
  end if;

  if not exists (select 1 from cron.job where jobname = 'aithos-send-alerts-hourly') then
    perform cron.schedule(
      'aithos-send-alerts-hourly',
      '0 * * * *',
      format(
        $job$
          select net.http_post(
            url := %L,
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer %s'
            ),
            body := '{}'::jsonb
          );
        $job$,
        alerts_url,
        service_role
      )
    );
  end if;
end
$$;


-- ===== END: full setup =====


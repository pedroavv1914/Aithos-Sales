# Aithos Sales CRM (Next.js + Supabase)

Plataforma CRM multi-tenant com funil Kanban, captura publica, eventos do lead, notificacoes, dashboard e exportacao CSV.

## Stack
- Next.js App Router + TypeScript + Tailwind
- Supabase Auth (Google + e-mail/senha)
- Supabase Postgres + RLS
- Supabase Edge Functions + pg_cron (estrutura pronta em `supabase/`)
- Resend (e-mails transacionais)

## Modulos
- M1: autenticacao, onboarding de workspace, convite com token (48h), protecao de `/app/*`
- M2: formulario publico em `/f/[workspaceSlug]/[formId]`, validacoes, UTM, LGPD, rate limit por IP
- M3: funil Kanban com React DnD, stages configuraveis, filtros e busca global
- M4: detalhes do lead com timeline paginada, notas, tarefas, tags, fechamento ganho/perdido
- M5: notificacoes in-app + rotina de alertas (Edge Function + cron)
- M6: dashboard com metricas, funil por stage, barras semanais e top perdas
- M7: exportacao CSV por streaming

## Variaveis de ambiente
Copie `.env.example` para `.env.local` e preencha.

## Rodando localmente
```bash
npm install
npm run dev
```

## Build
```bash
npm run typecheck
npm run build
```

## Deploy
1. Frontend no Vercel com variaveis do `.env.example`
2. Banco no Supabase (`supabase db push`)
3. Edge Functions no Supabase:
```bash
supabase functions deploy capture-submit
supabase functions deploy send-alerts
supabase functions deploy export-leads
```
4. Configurar cron de alertas (M5):
```sql
alter database postgres set app.settings.send_alerts_url = 'https://<project-ref>.functions.supabase.co/send-alerts';
alter database postgres set app.settings.service_role_key = '<SUPABASE_SERVICE_ROLE_KEY>';
```
Depois rode novamente `supabase db push` para aplicar `20260322_cron_alerts.sql`.

## Estrutura principal
- `app/`: rotas Next.js (publicas, privadas e APIs)
- `src/lib/`: auth, supabase, services e validacoes
- `src/components/`: UI por modulo
- `supabase/`: migracoes SQL, RLS e Edge Functions

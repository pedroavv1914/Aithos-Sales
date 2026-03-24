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

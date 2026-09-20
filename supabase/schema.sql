-- ============================================================
-- Nivora Fit — esquema de base de datos
-- Pegá todo esto en Supabase → SQL Editor → Run.
-- Es idempotente: podés volver a correrlo sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- PERFILES: una fila por usuario.
-- `datos` guarda el estado completo de la app en JSON (rutinas, medidas,
-- agenda, preferencias). Las columnas de suscripción las escribe SOLO el
-- servidor: el usuario no puede tocarlas (ver GRANT más abajo).
-- ------------------------------------------------------------
create table if not exists public.perfiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text,
  datos               jsonb       not null default '{}'::jsonb,
  trial_fin           timestamptz not null default (now() + interval '7 days'),
  suscripcion_estado  text        not null default 'trial'
                      check (suscripcion_estado in ('trial','activa','pausada','cancelada','vencida')),
  mp_preapproval_id   text,
  mp_payer_id         text,
  proximo_cobro       timestamptz,
  creado              timestamptz not null default now(),
  actualizado         timestamptz not null default now()
);

create index if not exists perfiles_preapproval_idx on public.perfiles (mp_preapproval_id);
create index if not exists perfiles_estado_idx      on public.perfiles (suscripcion_estado);

-- ------------------------------------------------------------
-- SESIONES: cada entrenamiento terminado, en tabla propia.
-- El snapshot de `datos` ya las tiene, pero acá quedan consultables con SQL:
-- sirven para métricas del negocio y para los informes del entrenador de IA.
-- ------------------------------------------------------------
create table if not exists public.sesiones (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  fecha       date not null,
  bloque      text not null,
  series      int  not null default 0,
  minutos     int  not null default 0,
  kcal        int  not null default 0,
  volumen     int  not null default 0,
  creado      timestamptz not null default now(),
  unique (usuario_id, fecha, bloque)
);
create index if not exists sesiones_usuario_fecha_idx on public.sesiones (usuario_id, fecha desc);

-- ------------------------------------------------------------
-- MEDIDAS: una fila por medición corporal.
-- ------------------------------------------------------------
create table if not exists public.medidas (
  id           bigint generated always as identity primary key,
  usuario_id   uuid not null references auth.users(id) on delete cascade,
  fecha        date not null,
  peso         numeric(5,2),
  cuello       numeric(5,2),
  cintura      numeric(5,2),
  cadera       numeric(5,2),
  pecho        numeric(5,2),
  brazo        numeric(5,2),
  muslo        numeric(5,2),
  pantorrilla  numeric(5,2),
  grasa_pct    numeric(5,2),
  creado       timestamptz not null default now(),
  unique (usuario_id, fecha)
);
create index if not exists medidas_usuario_fecha_idx on public.medidas (usuario_id, fecha desc);

-- ------------------------------------------------------------
-- CHAT: el hilo que se muestra en la app.
-- (La memoria del agente de n8n vive aparte, en n8n_chat_histories.)
-- ------------------------------------------------------------
create table if not exists public.chat_mensajes (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  rol         text not null check (rol in ('usuario','entrenador')),
  texto       text not null,
  creado      timestamptz not null default now()
);
create index if not exists chat_usuario_idx on public.chat_mensajes (usuario_id, creado);

-- Memoria del agente de n8n (la crea n8n sola, pero la dejamos declarada
-- para que el proyecto se levante completo de una).
create table if not exists public.n8n_chat_histories (
  id         bigint generated always as identity primary key,
  session_id varchar(255) not null,
  message    jsonb not null
);
create index if not exists n8n_hist_session_idx on public.n8n_chat_histories (session_id);

-- ------------------------------------------------------------
-- PAGOS: registro de todo lo que manda Mercado Pago.
-- Nunca se borra: es el respaldo ante cualquier reclamo.
-- ------------------------------------------------------------
create table if not exists public.pagos (
  id             bigint generated always as identity primary key,
  usuario_id     uuid references auth.users(id) on delete set null,
  mp_id          text,
  tipo           text,
  estado         text,
  monto          numeric(12,2),
  moneda         text default 'ARS',
  payload        jsonb,
  creado         timestamptz not null default now()
);
create index if not exists pagos_usuario_idx on public.pagos (usuario_id, creado desc);
create unique index if not exists pagos_mp_id_idx on public.pagos (mp_id) where mp_id is not null;

-- ============================================================
-- ALTA AUTOMÁTICA: cuando alguien se registra, se le crea el perfil
-- con los 7 días de prueba ya contados.
-- ============================================================
create or replace function public.crear_perfil_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, email, trial_fin)
  values (new.id, new.email, now() + interval '7 days')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo();

-- ============================================================
-- SEGURIDAD (RLS): cada persona ve y edita únicamente lo suyo.
-- ============================================================
alter table public.perfiles      enable row level security;
alter table public.sesiones      enable row level security;
alter table public.medidas       enable row level security;
alter table public.chat_mensajes enable row level security;
alter table public.pagos         enable row level security;

drop policy if exists "perfil propio: leer"    on public.perfiles;
drop policy if exists "perfil propio: editar"  on public.perfiles;
create policy "perfil propio: leer"   on public.perfiles for select using (auth.uid() = id);
create policy "perfil propio: editar" on public.perfiles for update using (auth.uid() = id);

drop policy if exists "sesiones propias" on public.sesiones;
create policy "sesiones propias" on public.sesiones for all
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists "medidas propias" on public.medidas;
create policy "medidas propias" on public.medidas for all
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists "chat propio" on public.chat_mensajes;
create policy "chat propio" on public.chat_mensajes for select using (auth.uid() = usuario_id);

drop policy if exists "pagos propios" on public.pagos;
create policy "pagos propios" on public.pagos for select using (auth.uid() = usuario_id);

-- ------------------------------------------------------------
-- El usuario puede escribir SOLO estas dos columnas de su perfil.
-- Sin esto, cualquiera podría ponerse `suscripcion_estado = 'activa'`
-- desde la consola del navegador y usar la app gratis para siempre.
-- ------------------------------------------------------------
revoke update on public.perfiles from authenticated;
grant  update (datos, actualizado) on public.perfiles to authenticated;

-- El chat lo escribe la función del servidor (service_role), no el navegador.
revoke insert, update, delete on public.chat_mensajes from authenticated;

-- ============================================================
-- VISTA DE NEGOCIO: cómo viene la cosa, de un vistazo.
-- select * from public.resumen_negocio;
-- ============================================================
create or replace view public.resumen_negocio as
select
  count(*)                                                          as usuarios_totales,
  count(*) filter (where suscripcion_estado = 'activa')             as suscriptores_activos,
  count(*) filter (where suscripcion_estado = 'trial'
                     and trial_fin > now())                         as en_prueba,
  count(*) filter (where suscripcion_estado in ('vencida','cancelada')) as perdidos,
  count(*) filter (where creado > now() - interval '30 days')       as altas_ultimos_30_dias
from public.perfiles;

-- Actividad de la última semana, para ver si la gente realmente usa la app
-- (el uso es el mejor predictor de que el mes que viene sigan pagando).
create or replace view public.actividad_semanal as
select
  p.id,
  p.email,
  p.suscripcion_estado,
  count(s.id) filter (where s.fecha > current_date - 7)  as sesiones_7d,
  count(s.id) filter (where s.fecha > current_date - 30) as sesiones_30d,
  max(s.fecha)                                           as ultima_sesion
from public.perfiles p
left join public.sesiones s on s.usuario_id = p.id
group by p.id, p.email, p.suscripcion_estado;

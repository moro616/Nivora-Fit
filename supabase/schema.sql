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

-- Cuentas con acceso sin pagar (administradores, cortesías). Solo se cambia
-- desde el SQL Editor: el usuario no puede escribir esta columna.
alter table public.perfiles add column if not exists es_admin boolean not null default false;

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

-- ============================================================
-- PERMISOS DE TABLA
-- Los proyectos nuevos de Supabase no les dan acceso automático a las
-- tablas a los usuarios logueados. Sin esto la app no puede leer el
-- perfil y se queda en "Estamos preparando tu cuenta".
-- RLS sigue limitando a cada persona a lo suyo.
-- ============================================================
grant usage on schema public to authenticated, service_role;

grant select on public.perfiles to authenticated;
grant update (datos, actualizado) on public.perfiles to authenticated;
grant select, insert, update, delete on public.sesiones, public.medidas to authenticated;
grant select on public.chat_mensajes, public.pagos to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ============================================================
-- INTEGRIDAD DE LOS DATOS (v9)
-- ============================================================

-- Cada entrenamiento tiene un id propio: dos entrenamientos del mismo día
-- ya no se pisan en la tabla, y se guardan también los km de las salidas.
alter table public.sesiones add column if not exists uid text;
alter table public.sesiones add column if not exists km numeric(7,3);
alter table public.sesiones drop constraint if exists sesiones_usuario_id_fecha_bloque_key;
delete from public.sesiones where uid is null;   -- la app las vuelve a subir con su id
create unique index if not exists sesiones_usuario_uid_idx on public.sesiones (usuario_id, uid);

-- Respaldo automático del perfil: antes de cada cambio se guarda la versión
-- anterior (como mucho una cada 10 minutos, las últimas 30 por persona).
-- Si algo sale mal, se puede recuperar desde el SQL Editor.
create table if not exists public.perfiles_respaldo (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  datos       jsonb not null,
  guardado    timestamptz not null default now()
);
create index if not exists perfiles_respaldo_idx on public.perfiles_respaldo (usuario_id, guardado desc);
alter table public.perfiles_respaldo enable row level security;   -- sin políticas: nadie de afuera la lee
revoke all on public.perfiles_respaldo from anon, authenticated;

create or replace function public.respaldar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.datos is not null and old.datos <> '{}'::jsonb and old.datos is distinct from new.datos then
    if not exists (select 1 from public.perfiles_respaldo
                   where usuario_id = old.id and guardado > now() - interval '10 minutes') then
      insert into public.perfiles_respaldo (usuario_id, datos) values (old.id, old.datos);
      delete from public.perfiles_respaldo
       where usuario_id = old.id
         and id not in (select id from public.perfiles_respaldo
                         where usuario_id = old.id order by guardado desc limit 30);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists perfiles_respaldo_trg on public.perfiles;
create trigger perfiles_respaldo_trg before update of datos on public.perfiles
  for each row execute function public.respaldar_perfil();

-- Freno a datos rotos o gigantes: el perfil tiene que ser un objeto y no
-- pasar de 4 MB.
alter table public.perfiles drop constraint if exists perfiles_datos_validos;
alter table public.perfiles add constraint perfiles_datos_validos
  check (datos is null or (jsonb_typeof(datos) = 'object' and pg_column_size(datos) < 4000000)) not valid;

-- La memoria del chat de n8n tampoco se puede leer desde la app.
alter table public.n8n_chat_histories enable row level security;
revoke all on public.n8n_chat_histories from anon, authenticated;
revoke all on public.perfiles_respaldo from anon;
grant all on public.n8n_chat_histories, public.perfiles_respaldo to service_role;

-- ============================================================
-- v11: RECORDATORIOS Y FOTOS DE PROGRESO
-- ============================================================

-- Suscripciones a notificaciones: una por teléfono. Solo el servidor la toca.
create table if not exists public.push_suscripciones (
  id            bigint generated always as identity primary key,
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  hora          smallint not null default 18 check (hora between 0 and 23),
  zona          text not null default 'America/Argentina/Buenos_Aires',
  activo        boolean not null default true,
  toca_hoy      boolean not null default true,
  faltas        boolean not null default true,
  ultimo_envio  timestamptz,
  creado        timestamptz not null default now()
);
create index if not exists push_usuario_idx on public.push_suscripciones (usuario_id);
alter table public.push_suscripciones enable row level security;
revoke all on public.push_suscripciones from anon, authenticated;
grant all on public.push_suscripciones to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Fotos de progreso: espacio privado, 6 MB por foto, solo imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progreso', 'progreso', false, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cada persona solo ve, sube y borra lo que está en su propia carpeta (su id).
drop policy if exists "progreso: ver lo propio"    on storage.objects;
drop policy if exists "progreso: subir lo propio"  on storage.objects;
drop policy if exists "progreso: borrar lo propio" on storage.objects;
create policy "progreso: ver lo propio" on storage.objects for select to authenticated
  using (bucket_id = 'progreso' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "progreso: subir lo propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'progreso' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "progreso: borrar lo propio" on storage.objects for delete to authenticated
  using (bucket_id = 'progreso' and (storage.foldername(name))[1] = auth.uid()::text);

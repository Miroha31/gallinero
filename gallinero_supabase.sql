-- ============================================================
-- HUEVOS DEL RINCÓN — Supabase Schema + Datos Iniciales
-- ============================================================

-- ── TABLAS ──────────────────────────────────────────────────

create table gallinas (
  id uuid primary key default gen_random_uuid(),
  tag text unique not null,
  raza text default 'Rhode Island Red',
  fecha_nacimiento date,
  estado text default 'sana' check (estado in ('sana','enferma','en observación')),
  activa boolean default true,
  causa_baja text check (causa_baja in ('muerte','enfermedad','depredador','venta','otro')),
  fecha_baja date,
  notas text,
  created_at timestamptz default now()
);

create table huevos (
  id uuid primary key default gen_random_uuid(),
  fecha date unique not null,
  cantidad integer not null check (cantidad >= 0),
  notas text,
  created_at timestamptz default now()
);

create table alimento (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('balanceado','granos','vitaminas','otro')),
  cantidad numeric not null,
  fecha_compra date not null,
  estado text default 'disponible' check (estado in ('disponible','agotado')),
  created_at timestamptz default now()
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  tipo text default 'A' check (tipo in ('A','B')),
  frecuencia_dias integer,
  cantidad_habitual integer,
  precio_habitual numeric(10,2),
  notas text,
  activo boolean default true,
  created_at timestamptz default now()
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  huevos integer,
  precio numeric(10,2) not null,
  fecha_entrega date,
  entregado boolean default false,
  fecha_entregado date,
  origen text default 'app' check (origen in ('app','bot')),
  notas text,
  created_at timestamptz default now()
);

create table finanzas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso','gasto','inversion')),
  concepto text not null,
  monto numeric(10,2) not null,
  fecha date not null,
  categoria text,
  pedido_id uuid references pedidos(id),
  notas text,
  created_at timestamptz default now()
);

create table compras_pendientes (
  id uuid primary key default gen_random_uuid(),
  concepto text not null,
  monto numeric(10,2) not null,
  fecha_estimada date,
  categoria text default 'gasto' check (categoria in ('gasto','inversion')),
  comprado boolean default false,
  fecha_comprado date,
  notas text
);

create table config (
  id uuid primary key default gen_random_uuid(),
  clave text unique not null,
  valor text not null
);

-- ── CONFIG INICIAL ───────────────────────────────────────────

insert into config (clave, valor) values
  ('pct_balanceado', '75'),
  ('pct_granos', '25'),
  ('dias_alerta', '2'),
  ('capacidad_max', '100'),
  ('gallinero_largo', '17'),
  ('gallinero_ancho', '4'),
  ('gallinero_alto', '2');

-- ── GALLINAS (30 gallinas + 2 gallos) ───────────────────────
-- Fecha nacimiento: 2026-03-17 (llegaron con 4 semanas el 14-abr)

insert into gallinas (tag, raza, fecha_nacimiento, estado, activa) values
  ('G01','Rhode Island Red','2026-03-17','sana',true),
  ('G02','Rhode Island Red','2026-03-17','sana',true),
  ('G03','Rhode Island Red','2026-03-17','sana',true),
  ('G04','Rhode Island Red','2026-03-17','sana',true),
  ('G05','Rhode Island Red','2026-03-17','sana',true),
  ('G06','Rhode Island Red','2026-03-17','sana',true),
  ('G07','Rhode Island Red','2026-03-17','sana',true),
  ('G08','Rhode Island Red','2026-03-17','sana',true),
  ('G09','Rhode Island Red','2026-03-17','sana',true),
  ('G10','Rhode Island Red','2026-03-17','sana',true),
  ('G11','Rhode Island Red','2026-03-17','sana',true),
  ('G12','Rhode Island Red','2026-03-17','sana',true),
  ('G13','Rhode Island Red','2026-03-17','sana',true),
  ('G14','Rhode Island Red','2026-03-17','sana',true),
  ('G15','Rhode Island Red','2026-03-17','sana',true),
  ('G16','Rhode Island Red','2026-03-17','sana',true),
  ('G17','Rhode Island Red','2026-03-17','sana',true),
  ('G18','Rhode Island Red','2026-03-17','sana',true),
  ('G19','Rhode Island Red','2026-03-17','sana',true),
  ('G20','Rhode Island Red','2026-03-17','sana',true),
  ('G21','Rhode Island Red','2026-03-17','sana',true),
  ('G22','Rhode Island Red','2026-03-17','sana',true),
  ('G23','Rhode Island Red','2026-03-17','sana',true),
  ('G24','Rhode Island Red','2026-03-17','sana',true),
  ('G25','Rhode Island Red','2026-03-17','sana',true),
  ('G26','Rhode Island Red','2026-03-17','sana',true),
  ('G27','Rhode Island Red','2026-03-17','sana',true),
  ('G28','Rhode Island Red','2026-03-17','sana',true),
  ('G29','Rhode Island Red','2026-03-17','sana',true),
  ('G30','Rhode Island Red','2026-03-17','sana',true),
  ('GA1','Rhode Island Red','2026-03-17','sana',true),
  ('GA2','Rhode Island Red','2026-03-17','sana',true);

-- ── INVERSIÓN INICIAL (como registros en finanzas) ───────────

insert into finanzas (tipo, concepto, monto, fecha, categoria) values
  ('inversion','3 luces exteriores 50w',                        780.00, '2026-01-14','inversion'),
  ('inversion','Kit de tinaco',                                 299.00, '2026-01-28','inversion'),
  ('inversion','Flotador compacto para bebederos',              181.00, '2026-01-28','inversion'),
  ('inversion','Cable eléctrico',                               350.00, '2026-01-14','inversion'),
  ('inversion','1 galón Berel Green pintura',                   850.00, '2026-01-20','inversion'),
  ('inversion','30 gallinas + 2 gallos Rhode Island Red',      2400.00, '2026-01-28','inversion');

-- ── COMPRAS PENDIENTES ───────────────────────────────────────

insert into compras_pendientes (concepto, monto, fecha_estimada, categoria, notas) values
  ('Compra Etapa 2 — 30 pollitas RIR (60 gallinas total)', 2250.00, '2026-07-01', 'inversion', 'Mes 5-6. Iniciar cuando utilidad acumulada cubra el costo.'),
  ('Compra Etapa 3 — 30 pollitas RIR (90 gallinas total)', 2250.00, '2026-12-01', 'inversion', 'Mes 10-12. Etapa 2 ya en producción plena.'),
  ('Comida para pollitos (1 mes) — 2 costales',             570.00, '2026-04-09', 'gasto',     '$285 c/u'),
  ('Alimento Starter — semanas 1-8',                        570.00, '2026-04-08', 'gasto',     'Proteína 20%. Purina Start & Grow o Albamex Iniciador. 2 costales 25kg.'),
  ('Alimento Grower — semanas 8-20',                        600.00, '2026-05-03', 'gasto',     'Cambio de Starter a Grower. Proteína 16-18%.'),
  ('Alimento Postura — semana 20+',                         650.00, '2026-07-23', 'gasto',     'Cambio a alimento de postura con calcio. Inicio de postura estimado.');

-- ── ÍNDICES ──────────────────────────────────────────────────

create index on huevos (fecha);
create index on finanzas (tipo, fecha);
create index on pedidos (cliente_id, entregado);
create index on gallinas (activa);


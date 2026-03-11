# 🏉 Gran DT LPRC — Guía de Setup Completa

## Qué es este proyecto

Aplicación web de fantasy rugby para La Plata Rugby Club. Construida con:
- **Next.js 14** (frontend)
- **Supabase** (base de datos + autenticación)
- **Vercel** (deploy)
- **Tailwind CSS** (estilos)

---

## Paso 1 — Configurar Supabase

### 1.1 Crear el proyecto
1. Entrá a [supabase.com](https://supabase.com)
2. Hacé click en **New Project**
3. Nombre: `gran-dt-lprc`
4. Elegí una contraseña segura para la base de datos
5. Región: `South America (São Paulo)` — la más cercana a Argentina
6. Esperá ~2 minutos a que el proyecto se inicialice

### 1.2 Ejecutar el SQL de setup
1. En el menú lateral, hacé click en **SQL Editor**
2. Hacé click en **New query**
3. Abrí el archivo `supabase-setup.sql` que viene en este proyecto
4. Copiá **todo** el contenido y pegalo en el editor de Supabase
5. Hacé click en **Run** (o `Ctrl + Enter`)
6. Deberías ver: `Success. No rows returned`

Esto crea todas las tablas, las reglas de seguridad, las funciones de cálculo y los datos iniciales (temporada, divisiones, fechas y reglas de puntaje).

### 1.3 Obtener las credenciales
1. En el menú lateral, hacé click en **Settings → API**
2. Copiá:
   - **Project URL** → algo como `https://abcxyz.supabase.co`
   - **anon public key** → una clave larga que empieza con `eyJ...`

---

## Paso 2 — Configurar el proyecto localmente

### 2.1 Instalar Node.js
Si no lo tenés instalado:
- Descargá Node.js desde [nodejs.org](https://nodejs.org) (versión LTS)
- Instalalo normalmente

### 2.2 Abrir una terminal
- **Mac:** `Cmd + Space` → escribí "Terminal" → Enter
- **Windows:** Buscá "PowerShell" o "Símbolo del sistema"

### 2.3 Instalar dependencias
En la terminal, navegá a la carpeta del proyecto:
```bash
cd ruta/a/gran-dt-lprc
npm install
```

### 2.4 Configurar las variables de entorno
1. Abrí el archivo `.env.local` en el proyecto
2. Reemplazá los valores con los que copiaste de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...TU_CLAVE...
```

### 2.5 Iniciar el servidor de desarrollo
```bash
npm run dev
```

Abrí el navegador en: **http://localhost:3000**

---

## Paso 3 — Cargar el plantel de jugadores

Una vez que tengas el Excel con los jugadores:

### Opción A: Desde el panel admin (recomendada)
1. Registrate en la app con tu email
2. En Supabase → **Table Editor → profiles**, buscá tu usuario y cambiá `is_admin` a `true`
3. Volvé a la app → aparecerá el menú **⚙️ Admin**
4. Entrá a **Admin → Jugadores → + Nuevo jugador** y cargalos uno por uno

### Opción B: Importación masiva
Si tenés muchos jugadores, podés usar el SQL Editor de Supabase para insertar todos de una vez con un comando INSERT masivo. Avisame cuando tengas el Excel y te preparo el SQL.

---

## Paso 4 — Crear las fixtures (partidos por fecha)

Por cada fecha del torneo necesitás crear los partidos. Desde el SQL Editor:

```sql
-- Ejemplo: partidos de la Fecha 1
INSERT INTO fixtures (season_id, gameweek_id, home_team_id, away_team_id, scheduled_at) VALUES
  (1, 1, 1, 2, '2026-03-08 15:00:00+00'),  -- Primera vs Intermedia
  (1, 1, 3, 4, '2026-03-08 15:00:00+00'),  -- Pre A vs Pre B
  (1, 1, 5, 6, '2026-03-08 15:00:00+00');  -- Pre C vs M22
```

> Los IDs de los equipos (real_teams) se pueden ver en Supabase → Table Editor → real_teams.

---

## Paso 5 — Deploy en Vercel

### 5.1 Subir el código a GitHub
1. Creá una cuenta en [github.com](https://github.com) si no tenés
2. Creá un repositorio nuevo (privado está bien)
3. Subí el proyecto:
```bash
git init
git add .
git commit -m "Initial commit - Gran DT LPRC"
git remote add origin https://github.com/TU_USUARIO/gran-dt-lprc.git
git push -u origin main
```

### 5.2 Conectar con Vercel
1. Entrá a [vercel.com](https://vercel.com)
2. Hacé click en **Add New → Project**
3. Importá el repositorio de GitHub que acabas de crear
4. En **Environment Variables**, agregá:
   - `NEXT_PUBLIC_SUPABASE_URL` = tu URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu clave anon
5. Hacé click en **Deploy**

En ~2 minutos vas a tener la app en línea con una URL tipo `gran-dt-lprc.vercel.app`.

---

## Paso 6 — Flujo semanal para el admin

Cada semana del torneo seguís este proceso:

```
Jueves/Viernes
└── La fecha está "Abierta" → los participantes pueden armar su equipo

Sábado (antes del partido)
└── Admin → Fechas → Bloquear fecha
    └── Nadie más puede cambiar su equipo

Sábado/Domingo (después de los partidos)
└── Admin → Cargar Stats → seleccionás cada partido y cargás las estadísticas
    └── (tries, conversiones, penales, tarjetas, etc.)

Domingo/Lunes
└── Admin → Fechas → "En cálculo" → "Cerrar y calcular"
    └── Se calculan automáticamente todos los puntajes
    └── Se actualiza el ranking

Jueves
└── Publicar resultados en Instagram ✅
```

---

## Estructura del proyecto

```
gran-dt-lprc/
├── app/                    # Páginas (Next.js App Router)
│   ├── page.tsx            # Inicio
│   ├── auth/               # Login / Registro
│   ├── equipo/             # Armar mi equipo
│   ├── tabla/              # Tabla general
│   ├── fecha/              # Equipo de la Fecha
│   ├── jugadores/          # Lista de jugadores
│   └── admin/              # Panel de administrador
│       ├── page.tsx        # Dashboard admin
│       ├── stats/          # Cargar estadísticas
│       ├── fechas/         # Gestión de fechas
│       └── jugadores/      # ABM de jugadores
├── components/
│   ├── layout/             # Header, AppShell
│   └── campo/              # Campo de juego, selector de jugadores
├── lib/
│   ├── supabase/           # Clientes de Supabase (browser/server/middleware)
│   └── utils.ts            # Funciones utilitarias
├── types/
│   └── index.ts            # Tipos TypeScript de toda la app
├── supabase-setup.sql      # SQL completo para ejecutar en Supabase
└── .env.local              # Variables de entorno (no subir a GitHub)
```

---

## Preguntas frecuentes

**¿Cómo hago a alguien administrador?**
En Supabase → Table Editor → profiles → buscá al usuario → cambiá `is_admin` a `true`.

**¿Qué pasa si me equivoco cargando las stats?**
Podés volver a cargar las stats de un jugador y se sobreescribirán. Si ya cerraste la fecha, usá el botón "Recalcular" en Admin → Fechas.

**¿Puedo cambiar las reglas de puntaje?**
Sí. En Supabase → Table Editor → scoring_rules podés modificar los valores. Al recalcular una fecha se usan las reglas actuales.

**¿Cómo agrego el plantel desde el Excel?**
Avisame cuando tengas el Excel y te preparo un SQL de inserción masiva para cargarlo de una sola vez.

---

## Soporte

Si algo no funciona, revisá:
1. Que el `.env.local` tenga las credenciales correctas
2. Que el SQL de setup se haya ejecutado sin errores en Supabase
3. Que Node.js esté instalado (`node --version` en la terminal)

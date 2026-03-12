# 🏉 Gran DT LPRC

> Plataforma de fantasy rugby construida con tecnologías web modernas. Crea tu propia liga de fantasy rugby, administra fechas, registra estadísticas de jugadores y calcula puntajes automáticamente.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

---

## 🎯 Características

- **Constructor de Equipos** — Arma tu propio equipo de rugby seleccionando jugadores disponibles
- **Puntaje en Vivo** — Cálculo automático de puntos basado en estadísticas de jugadores (tries, conversiones, penales, tarjetas)
- **Gestión de Fechas** — Controla cuándo los jugadores pueden modificar sus equipos
- **Panel de Administrador** — Gestiona jugadores, carga estadísticas de partidos, calcula rankings
- **Soporte Multi-división** — Suporta múltiples categorías (Primera, Intermedia, Pre A/B/C, M22)
- **Diseño Responsivo** — Interfaz mobile-friendly con Tailwind CSS
- **Autenticación en Tiempo Real** — Autenticación segura de usuarios mediante Supabase

---

## 📋 Requisitos

- **Node.js** 18+ (versión LTS recomendada)
- **npm** o **yarn**
- Cuenta en **Supabase** ([capa gratuita disponible](https://supabase.com/))
- Cuenta en **Vercel** para deploy ([capa gratuita disponible](https://vercel.com/))

---

## 🚀 Inicio Rápido

### 1. Clonar e Instalar

```bash
git clone https://github.com/tu-usuario/gran-dt-lprc.git
cd gran-dt-lprc
npm install
```

### 2. Configurar Supabase

1. Crea un nuevo proyecto en [supabase.com](https://supabase.com/)
2. Dirígete al **Editor SQL** y ejecuta el contenido de `supabase-setup.sql`
3. Copia tu **URL del Proyecto** y **Clave Anon** desde **Configuración → API**

### 3. Configurar Variables de Entorno

Copia `.env.local.example` a `.env.local` e ingresa tus credenciales de Supabase:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```

### 4. Ejecutar el Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📁 Estructura del Proyecto

```
gran-dt-lprc/
├── app/                     # Páginas del App Router de Next.js
│   ├── page.tsx             # Inicio / Dashboard
│   ├── auth/                # Login y Registro
│   ├── equipo/              # Interfaz de constructor de equipos
│   ├── tabla/               # Tabla general de la liga
│   ├── fecha/               # Equipo de la fecha actual
│   ├── jugadores/           # Directorio de jugadores
│   └── admin/               # Panel del administrador
│       ├── stats/           # Carga de estadísticas de partidos
│       ├── fechas/          # Gestión de fechas
│       └── jugadores/       # Gestión de jugadores
├── components/              # Componentes React reutilizables
│   ├── layout/              # Header, navegación, shell
│   ├── ui/                  # Componentes UI
│   ├── campo/               # Campo de rugby y selector de jugadores
│   └── admin/               # Componentes específicos del admin
├── lib/
│   ├── supabase/            # Configuración del cliente de Supabase
│   └── utils.ts             # Funciones utilitarias
├── types/
│   └── index.ts             # Definiciones de tipos TypeScript
├── supabase-setup.sql       # Schema de la base de datos e datos iniciales
└── .env.local               # Variables de entorno (no subir a git)
```

---

## 🛠️ Configuración del Admin

Después de crear una cuenta de usuario:

1. En Supabase, dirígete a **Editor de Tablas → profiles**
2. Encuentra tu usuario y establece `is_admin` en `true`
3. Reinicia la aplicación — el menú **⚙️ Admin** aparecerá

### Flujo de Trabajo del Admin

Cada fecha sigue este ciclo:

#### Jueves-Viernes:  
Los jugadores pueden armar y modificar sus equipos

#### Sábado (Pre-Partido):  
El admin bloquea la fecha — no se permiten más cambios

#### Sábado-Domingo (Post-Partido):  
El admin carga las estadísticas de los partidos (tries, conversiones, penales, tarjetas, etc.)

#### Domingo-Lunes:  
El admin activa "Calcular" — los puntajes se calculan automáticamente y la tabla se actualiza

---

## 📊 Schema de la Base de Datos

Tablas principales:

- **players** — Jugadores de rugby individuales con posición, estado y asignación de equipo
- **real_teams** — Los equipos de tu liga de rugby (ej: Primera, Intermedia, etc.)
- **seasons** — Temporadas del torneo
- **gameweeks** — Fechas individuales o jornadas de fixture
- **fixtures** — Partidos entre equipos
- **player_stats** — Desempeño individual de jugadores por fecha
- **scoring_rules** — Valores de puntos para diferentes acciones (try = 5 puntos, conversión = 2, etc.)

Consulta `supabase-setup.sql` para ver el schema completo.

---

## 🚢 Deploy

### Desplegar en Vercel (Recomendado)

1. Sube el código a GitHub
2. Ve a [vercel.com](https://vercel.com/) e importa tu repositorio
3. Agrega las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Haz clic en **Deploy**

Tu aplicación estará en línea en ~2 minutos con una URL como `tu-proyecto.vercel.app`.

---

## ⚙️ Personalización

### Reglas de Puntaje

Modifica los valores de puntos en Supabase → **Editor de Tablas → scoring_rules**. Cuando recalcules las fechas, se aplican las reglas actuales.

### Equipos y Divisiones

Edita los equipos en Supabase → **Editor de Tablas → real_teams**. Actualiza los campos `name` y `description` según sea necesario.

### Posiciones

Las posiciones de los jugadores están definidas en la base de datos. Posiciones comunes de rugby: Hooker, Prop, Lock, Flanker, Number 8, Halfback, Five-Eighth, Wing, Fullback.

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor:

1. Haz un fork del repositorio
2. Crea una rama de características (`git checkout -b feature/caracteristica-asombrosa`)
3. Haz commits con tus cambios (`git commit -m 'Agregar característica asombrosa'`)
4. Sube a la rama (`git push origin feature/caracteristica-asombrosa`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT — consulta el archivo [LICENSE](LICENSE) para más detalles.

---

## 🆘 Solución de Problemas

**"Fallo al conectar con Supabase"**
- Verifica que `.env.local` tenga la URL y clave API correctas
- Confirma que el proyecto de Supabase esté activo en el dashboard

**"Setup SQL falló"**
- Asegúrate de que todo el archivo `supabase-setup.sql` se haya ejecutado sin errores
- Revisa los mensajes de error de Supabase en la salida del Editor SQL

**"Problemas con node_modules"**
- Elimina la carpeta `node_modules` y ejecuta `npm install` nuevamente
- Intenta limpiar el caché de npm: `npm cache clean --force`

**"El menú Admin no aparece"**
- Verifica que `is_admin` esté establecido en `true` en la tabla profiles
- Reinicia el servidor de desarrollo: detén y ejecuta `npm run dev`

---

## 📧 Soporte y Preguntas

Para problemas o preguntas, abre un issue en GitHub. Revisa los issues existentes primero para evitar duplicados.

---

## 🏏 ¿Qué es Fantasy Rugby?

En fantasy rugby, los jugadores arman un equipo de rugbiers reales y ganan puntos según el desempeño actual de esos jugadores en los partidos. ¡Intenta armar el mejor equipo para trepar en la tabla de la liga!

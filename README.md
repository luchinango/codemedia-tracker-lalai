# CodeMedia Tracker

Sistema interno de gestión de proyectos, control de horas y cálculo de costos.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL), Supabase Auth
- **Data Fetching:** Server Actions de Next.js
- **Iconos:** Lucide React

## Estructura del Proyecto

```
src/
├── app/
│   ├── actions/
│   │   └── timer.ts          # Server Actions: start/pause/complete
│   ├── dashboard/
│   │   └── page.tsx           # Feature C: Dashboard Financiero
│   ├── kanban/
│   │   └── page.tsx           # Feature A: Tablero Kanban
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               # Lista de proyectos
├── components/
│   ├── dashboard/
│   │   └── cost-summary.tsx   # Cálculo financiero visual
│   ├── kanban/
│   │   ├── kanban-board.tsx   # Columnas: Todo / In Progress / Done
│   │   └── issue-card.tsx     # Feature B: Cronómetro Play/Pause
│   └── sidebar.tsx            # Navegación lateral
├── lib/
│   ├── notifications.ts       # Envío de emails vía Resend
│   ├── supabase/
│   │   ├── client.ts          # Cliente Supabase (browser)
│   │   └── server.ts          # Cliente Supabase (server)
│   └── types/
│       └── database.ts        # Tipos TypeScript de la DB
supabase/
└── schema.sql                 # Script SQL para crear tablas
```

## Setup

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script `supabase/schema.sql` en el SQL Editor de Supabase
3. Copia `.env.local.example` a `.env.local` y completa las variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   RESEND_API_KEY=tu-api-key  # opcional
   ```
4. Instala dependencias e inicia:
   ```bash
   npm install
   npm run dev
   ```

## Features

### A) Tablero Kanban
Vista con 3 columnas (Por Hacer, En Progreso, Terminado) filtrada por proyecto.

### B) Cronómetro Play/Pause
- **Iniciar:** Cambia issue a `in_progress`, crea `time_log` con `start_time`.
- **Pausar:** Asigna `end_time` y calcula `duration_minutes`.
- **Completar:** Pausa timer abierto y marca issue como `done`.

### C) Dashboard Financiero
- Fórmula: `Costo Real = Σ (duration_minutes / 60) × hourly_rate`
- Compara "Costo Real de Desarrollo" vs "Precio Cotizado"
- Barra de progreso y desglose por tarea

### Notificaciones
Envía email al `client_email` del proyecto vía Resend cuando un issue cambia de estado.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# LALAI - INSTRUCCIONES DEL PROYECTO (CodeMedia)

## 🎯 OBJETIVO DEL SISTEMA
Gestionar la rentabilidad operativa y el bienestar del equipo de CodeMedia mediante el control de horas y trazabilidad financiera.

## 🛠 REGLAS DE ARQUITECTURA TÉCNICA
- **Framework:** Next.js 15+ (App Router).
- **Base de Datos:** Supabase (PostgreSQL).
- **Estilos:** Tailwind CSS.
- **Compilador:** React Compiler (No usar useMemo/useCallback manualmente).

## 📋 NOMENCLATURA DE TICKETS (ESTILO JIRA)
- Cada proyecto tiene un prefijo único de 3 letras (Ej: `TXA`).
- Los tickets deben seguir el formato: `[PREFIJO]-[NÚMERO]` (Ej: `TXA-01`).
- Los IDs largos de base de datos NUNCA deben mostrarse al usuario.

## 💰 REGLAS FINANCIERAS (BIMONEDA)
- **Costo Interno:** Siempre se calcula en **Bolivianos (BOB)**.
- **Fórmula:** `Costo_Hora = salary_expectation_bob / 160`.
- **Cobro Cliente:** Puede ser en USD o BOB. El Dashboard debe mostrar el margen restando el costo interno (convertido si es necesario) del precio cotizado.

## 🕒 BIENESTAR Y SALUD (OBLIGATORIO)
- **Alarma Almuerzo:** 12:30 PM (Hora local Tarija). Bloquear acciones pesadas con mensaje de "Desconexión Familiar".
- **Alarma Cierre:** 07:00 PM. Banner de "Fin de Jornada y Salud".

## 🔒 SEGURIDAD Y VISTAS
- **Admin:** Ve costos, sueldos y márgenes.
- **Developer:** Solo ve Kanban y su registro de tiempo.
- **Cliente (Público vía Hash):** Solo ve progreso de sus tickets y su Kardex de pagos. Prohibido mostrar data financiera interna.

## 📢 NOTIFICACIONES
- Al presionar "Play", enviar log de "Tarea Iniciada".
- Al mover a "Terminado", enviar log de "Tarea Finalizada".
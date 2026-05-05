# Pulse IA

Mini diagnóstico institucional asistido por IA.
Mide adopción y madurez de IA en el trabajo — versión cero de un "Proficiency Index".

## Objetivo del producto
- Generar línea base de uso real de IA en la organización
- Detectar barreras y oportunidades concretas
- Capturar casos de valor internos / quick wins
- Entregar devolución personalizada al participante
- Producir resumen institucional para dirección

Debe sentirse como un "chequeo inteligente" institucional serio, NO como un Google Form.

## Stack
- Next.js 15+ (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres) — base de datos principal
- Server Actions + API Routes según convenga
- OpenAI API — enriquecimiento IA (con adapter intercambiable)
- Vercel — deploy

## Arquitectura clave
- Acceso por token único por persona (`/pulso?t=TOKEN`), sin login tradicional
- Token tiene estados: `unused` → `used` / `expired`
- Token se marca `used` SOLO al completar, no al abrir la URL
- Admin con autenticación por email + OTP (Resend)
- Scoring híbrido: reglas determinísticas + enriquecimiento LLM opcional
- Score 0–12 en 4 dimensiones (uso, integración, señal de valor, oportunidad)
- 5 perfiles: OBSERVADOR / EXPLORADOR / USUARIO ACTIVO / MULTIPLICADOR / REFERENTE
- Pantalla final con devolución personalizada (no solo "gracias")
- Backoffice con gestión de usuarios en `/admin`

## Comandos
```bash
npm run dev          # servidor local
npm run build        # build de producción
npm run import-participants path/to/file.csv  # importar participantes desde CSV
```

## Variables de entorno requeridas
```
NEXT_PUBLIC_APP_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=        # para envio de OTP en admin
```

## Principios de diseño (NO negociables)
- Premium, sobrio, corporativo, minimalista
- Experiencia del participante es prioridad absoluta
- Sin look startup juguetón, sin UI recargada
- Sin estilo formulario clásico visible
- Backoffice puede ser más simple

## NO hacer
- Login tradicional con usuario/contraseña para participantes (solo token)
- Links públicos abiertos sin token para el diagnóstico
- Depender 100% del LLM para el score principal
- Romper el flujo si falla la API de IA (implementar fallback)
- Sobreingeniería

## Documentación detallada
- Producto completo y flujo UX: `docs/product.md`
- Preguntas del diagnóstico: `docs/questions.md`
- Scoring y perfiles: `docs/scoring.md`
- Modelo de datos (tablas SQL): `docs/data-model.md`
- Requisitos técnicos (tokens, CSV, IA, backoffice): `docs/requirements.md`

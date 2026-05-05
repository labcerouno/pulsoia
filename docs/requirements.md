# Requisitos técnicos

## 1. Sistema de tokens

### Generación
- Tokens alfanuméricos, URL-safe (sin caracteres problemáticos)
- Longitud: 16–24 caracteres
- Suficientemente aleatorios (usar `crypto.randomBytes` o similar)
- Ejemplo: `7fK29xQmA91bRsT3`

### Flujo
- URL de acceso: `/bcr?t=TOKEN_UNICO`
- Al abrir la URL: validar token, mostrar nombre si es válido, NO marcarlo como usado aún
- Al completar el diagnóstico: marcar token como `used` y `completed_at`
- Si abandona a mitad: puede retomar mientras token siga `unused`
- Si token `used`: mostrar "Acceso ya utilizado"
- Si token inválido: mostrar "Acceso inválido"
- Si token `expired`: mostrar "Acceso expirado"

### Personalización
Mostrar nombre al entrar:
> "Hola Martín. Este acceso fue asignado a tu participación en el diagnóstico Pulso IA."

---

## 2. Importación de participantes

### Formato CSV esperado
```
full_name,corporate_email,area,management_unit,role
Martín García,mgarcia@bcr.com.ar,Tecnología,Gerencia de Sistemas,Analista
Ana López,alopez@bcr.com.ar,Operaciones,Gerencia Operativa,
```

### Proceso
1. Parsear CSV
2. Crear registros en tabla `participants`
3. Generar `access_token` único y seguro por participante
4. Guardar en DB
5. Devolver lista de links únicos por participante (para copiar/enviar)

### Implementación
Opción A (preferida): ruta `/admin/import` con UI para subir CSV
Opción B: script CLI `npm run import-participants path/to/file.csv`

Implementar al menos una de las dos. Ambas si es razonable.

### Output esperado
Lista de links:
```
Martín García — https://app.com/bcr?t=7fK29xQmA91bRsT3
Ana López     — https://app.com/bcr?t=9mQ38yNpB02cUwV4
```

---

## 3. Guardado incremental
- Las respuestas se guardan progresivamente, no solo al final
- Si el participante abandona, puede retomar desde donde estaba
- Usar `session_id` para trackear estado intermedio

---

## 4. Enriquecimiento con IA

### Cuándo se ejecuta
Al completar el diagnóstico (después de P6), antes de mostrar la pantalla final.

### Qué analiza
Todas las respuestas del participante en conjunto.

### Qué devuelve el LLM
```json
{
  "summary": "Texto breve del perfil del participante",
  "barrier_tags": ["falta de tiempo", "desconocimiento"],
  "opportunity_tags": ["automatización de reportes", "análisis de datos"],
  "has_success_case": true,
  "success_case_summary": "Resumió actas de reunión con ChatGPT, ahorrando 2hs semanales",
  "strength_summary": "Capacidad de identificar oportunidades concretas de mejora",
  "next_step_recommendation": "Elegí una tarea repetitiva y sostené el uso durante 2 semanas"
}
```

### Implementación
- Usar OpenAI por defecto (GPT-4o o similar)
- Dejar adapter intercambiable (interface clara para cambiar proveedor)
- El resultado enriquece el score (puede ajustar dimensiones de señal de valor y oportunidad)
- Guardar resultado en tabla `responses`

### Fallback (OBLIGATORIO)
Si la API falla:
- No romper el flujo
- Usar score determinístico
- Usar textos de fallback por perfil (hardcodeados)
- Continuar mostrando pantalla final con info básica

---

## 5. Pantalla final

Mostrar al participante:
- Perfil detectado (label)
- Señal principal (texto personalizado)
- Próximo paso recomendado (texto personalizado)
- Algo de valor real según su perfil (pensar fuera de la caja):
  - Recurso de aprendizaje específico para su área/nivel
  - Prompt útil para empezar con su caso de uso detectado
  - Invitación a algo (comunidad, workshop, espacio interno)
  - Herramienta recomendada según sus barreras
- Mensaje de cierre profesional

NO mostrar solo "gracias por responder".

---

## 6. Backoffice (`/admin`)

### Protección
Usar env secret básico o middleware simple. No dejarlo totalmente abierto.
No hace falta auth enterprise-grade.

### Rutas
- `/admin` — dashboard principal
- `/admin/results` — tabla de resultados
- `/admin/import` — importación de participantes

### Dashboard mínimo
1. Cantidad de invitados
2. Cantidad de iniciados
3. Cantidad de completados
4. Tasa de completion
5. Score promedio
6. Distribución por perfil (OBSERVADOR / EXPLORADOR / etc.)
- En el listado de invitados se debe ver el link que se creó para ellos (con el hash)

### Tabla de participantes
- Nombre, área, perfil, score total, fecha de completado
- Ver casos detectados (has_success_case = true)
- Filtros básicos

### Exportación
- Exportar resultados a CSV
- O al menos dejar muy fácil hacerlo desde la tabla

---

## 7. Calidad de implementación

- Estructura de carpetas clara y modular
- TypeScript correcto en todo el proyecto
- Validación de inputs (Zod o similar)
- Manejo de errores básico pero serio
- Fallbacks cuando falla la IA
- Variables de entorno bien definidas y documentadas
- Comentarios donde agregan valor (no en código obvio)
- Sin sobreingeniería

---

## 8. Entregables del proyecto

1. Frontend funcional
2. Backend funcional (Server Actions / API Routes)
3. Schema SQL / migraciones reales
4. Flujo completo de token único
5. Importación de participantes vía CSV
6. Generación de tokens seguros
7. Persistencia de respuestas (incremental)
8. Scoring completo (0–12, 4 dimensiones)
9. Enriquecimiento IA con fallback
10. Pantalla final con devolución personalizada
11. Backoffice mínimo funcional
12. Exportación de resultados
13. README con setup y pasos de deploy
14. Variables de entorno listadas

Todo deployable en Vercel. MVP real, no demo.

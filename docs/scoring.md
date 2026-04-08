# Scoring y perfiles

## Estructura general
- Score total: 0 a 12
- 4 dimensiones, cada una de 0 a 3
- Scoring HÍBRIDO: base determinística/rule-based + enriquecimiento IA complementario
- NO depender 100% del LLM para el score principal

## Las 4 dimensiones

### 1. Uso real (alimentada por P1)
Mide si el participante usa IA de forma concreta y reciente.

| Condición | Puntos |
|-----------|--------|
| No usó IA en las últimas 2 semanas | 0 |
| Usó pero no menciona herramientas | 1 |
| Usó y menciona herramientas genéricas | 2 |
| Usó y menciona herramientas específicas con detalle | 3 |

### 2. Integración al trabajo (alimentada por P2)
Mide qué tan incorporada está la IA en la rutina.

| Opción elegida | Puntos |
|----------------|--------|
| "Aún no encontré una forma clara de aplicarla" | 0 |
| "La probé, pero todavía no forma parte de mi rutina" | 1 |
| "La uso de vez en cuando para tareas puntuales" | 2 |
| "La uso de forma bastante habitual" | 3 |

### 3. Señal de valor (alimentada por P4)
Mide si el participante puede articular un caso de valor concreto.

| Condición | Puntos |
|-----------|--------|
| No responde o respuesta vacía/genérica | 0 |
| Menciona algo vago sin detalle | 1 |
| Describe un caso con contexto razonable | 2 |
| Caso concreto, con herramienta, tarea y resultado claro | 3 |

Heurística sugerida: longitud > 80 chars = al menos 1 punto base. Detección de palabras clave ("ahorré", "mejoré", "logré", "reduje", "automaticé") = punto adicional.

### 4. Claridad de oportunidad (alimentada por P6)
Mide si el participante identifica una oportunidad concreta y accionable.

| Condición | Puntos |
|-----------|--------|
| No responde o respuesta vacía | 0 |
| Menciona algo genérico ("no sé", "cualquier cosa") | 1 |
| Identifica una tarea específica | 2 |
| Identifica tarea + impacto claro + por qué | 3 |

---

## Perfiles (score total)

| Rango | Label |
|-------|-------|
| 0–2 | OBSERVADOR |
| 3–5 | EXPLORADOR |
| 6–8 | USUARIO ACTIVO |
| 9–12 | MULTIPLICADOR |


### Descripción de perfiles

**OBSERVADOR (0–2)**
Todavía no empezó a integrar IA en su trabajo. Puede tener curiosidad pero no ha dado los primeros pasos concretos.

**EXPLORADOR (3–5)**
Probó algunas herramientas pero de forma esporádica. Hay interés pero falta consistencia o claridad sobre dónde aplicarla.

**USUARIO ACTIVO (6–8)**
Usa IA de forma regular para tareas concretas. Ya encontró usos útiles, pero todavía no está integrado de forma consistente en su flujo de trabajo.

**MULTIPLICADOR (9–12)**
Uso avanzado, casos claros de impacto, visión de oportunidad. Puede ser referente interno y acelerador de adopción en el equipo.

---

## Enriquecimiento IA del scoring
El LLM puede ajustar o complementar (no reemplazar) el score determinístico:
- Analizar calidad semántica de P4 y P6 para afinar score_value_signal y score_opportunity_clarity
- Detectar si hay un caso de éxito real (has_success_case)
- Generar summary, tags de barreras, tags de oportunidades
- Generar recomendación personalizada
- Detectar fortaleza principal

Si la API falla: usar solo el score determinístico y un fallback de texto genérico por perfil.

---

## Campos a guardar en DB
- `score_usage` (0–3)
- `score_integration` (0–3)
- `score_value_signal` (0–3)
- `score_opportunity_clarity` (0–3)
- `score_total` (0–12)
- `profile_label` (OBSERVADOR / EXPLORADOR / USUARIO ACTIVO / MULTIPLICADOR / REFERENTE)

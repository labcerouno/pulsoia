# Preguntas del diagnóstico

6 preguntas en total. Implementar exactamente estas preguntas con estas opciones.

---

## P1 — Uso reciente
**"En las últimas 2 semanas, ¿usaste alguna herramienta de IA para algo relacionado con tu trabajo?"**

Opciones:
- Sí
  - Repregunta: ¿Cuáles? (campo de texto)
- No

---

## P2 — Integración actual
**"¿Qué tan incorporada que está la IA en tu forma de trabajar?"**

Opciones:
- La uso todos los días
- La uso de vez en cuando
- La probé, pero todavía no forma parte de mi rutina
- Aún no encontré una forma clara de aplicarla

---

## P3 — Tipos de uso (multi-select)
**"¿Para qué tipo de tareas la usás? Marcá una o varias"**

Opciones (selección múltiple):
- Investigación de mercado
- Análisis de datos Excel
- Resumir archivo
- Generar texto para un informe o comunicación
- Transcribir una llamada / meet / zoom
- Hacer un Power Point
- Generar imágenes o video
- Otro (habilitar campo de texto para describirlo)
- No lo sé

---

## P4 — Caso de éxito (texto abierto)
**"Contame un ejemplo concreto donde la IA te haya ayudado a ahorrar tiempo, mejorar un resultado o pensar mejor."**

Campo de texto abierto.

Repregunta inteligente (activar si la respuesta sugiere un caso prometedor):
**"¿Podés contarme en 1 o 2 líneas qué tarea era, qué herramienta usaste y qué cambió en el resultado?"**

La detección de "caso prometedor" debe hacerse con IA. Si no funciona, con heurística simple (longitud de respuesta > 100 caracteres, palabras clave como "ahorré", "mejoré", "logré", etc.).

---

## P5 — Barrera principal
**"¿Cuál es hoy la principal barrera para usar mejor IA en tu trabajo?"**

Opciones (selección única):
- No sé para qué me serviría
- No tengo tiempo para explorarla
- No sé usarla
- Tengo dudas sobre seguridad / confidencialidad
- No tengo acceso a herramientas pagas
- No confío en los resultados
- No veo necesidad
- Otra

Si elige "Otra": habilitar campo de texto corto adicional.

---

## P6 — Oportunidad concreta (texto abierto)
**"Si en los próximos 30 días pudieras resolver mejor una sola tarea con IA, ¿cuál sería? ¿Y por qué?"**

Campo de texto abierto.

Repregunta opcional (si la respuesta es concreta y accionable):
Activar repregunta complementaria para profundizar.

---

## Notas de implementación
- Una pregunta a la vez, flujo tipo "conversación guiada"
- Guardado incremental tras cada respuesta
- Las repreguntas son opcionales, no bloquean el avance
- P3 es el único multi-select, el resto son single-select o texto abierto

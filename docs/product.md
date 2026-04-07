# Producto: Pulse IA BCR

## Descripción
Mini diagnóstico institucional asistido por IA para BCR (Bolsa de Comercio de Rosario).
Pensado como versión cero de un sistema mayor de medición de adopción y madurez de IA en el trabajo (tipo mini "Proficiency Index").

## Qué NO es
- No es una encuesta tradicional
- No es un Google Form
- No es una evaluación de desempeño
- No es un mockup ni una demo incompleta

## Qué genera
1. Primera línea base de uso real de IA en la organización
2. Detección de barreras organizacionales
3. Identificación de oportunidades concretas
4. Captura de casos internos de valor / quick wins
5. Mini devolución personalizada al participante
6. Resumen institucional para dirección / gerencia

## Sensación objetivo
- "Chequeo inteligente"
- "Conversación guiada"
- Experiencia institucional seria
- Producto premium, no formulario

---

## Flujo completo del participante

### Pantalla 1 — Validación de token
Si el token es válido y `unused`, mostrar:
- Saludo personalizado con nombre: `"Hola Martín. Este acceso fue asignado a tu participación en el Pulse IA BCR."`
- Breve explicación del propósito (no evaluación de desempeño, sí medición colectiva)
- Tiempo estimado: 5–7 minutos
- CTA claro: botón "Comenzar"

Si el token fue `used`: pantalla "Acceso ya utilizado"
Si el token es inválido: pantalla "Acceso inválido"
Si el token `expired`: pantalla "Acceso expirado"

### Pantallas 2 en adelante — Diagnóstico guiado
Sensación de conversación guiada, no formulario:
- Microcopy corto y claro
- Bloques limpios, una pregunta a la vez
- Botones para opciones cerradas
- Campos de texto donde corresponde
- Progreso sutil (sin parecer formulario clásico)
- Guardado incremental de respuestas

### Pantalla final — Devolución personalizada
Mostrar:
- "Tu perfil preliminar"
- Perfil detectado (label de categoría)
- Señal principal detectada (ej: "ya encontraste usos útiles, pero todavía no está integrado de forma consistente")
- Próximo paso recomendado (ej: "elegí una tarea repetitiva y sostené el uso durante 2 semanas")
- Mensaje de cierre profesional
- Algo de valor real para la persona: recurso, invitación, sugerencia personalizada según su perfil
  - Pensar "fuera de la caja": no solo "gracias por responder"
  - Debe estar acorde a lo que la persona necesita según sus respuestas
  - Ejemplos posibles: prompt útil para su área, recurso de aprendizaje, acceso a algo, invitación a un espacio

---

## Principios de diseño

### Hacer
- Premium, sobrio, corporativo, minimalista
- Claro, elegante, rápido
- Muy fácil de usar
- Sensación de "producto serio"
- Priorizar experiencia del participante

### No hacer
- Look startup juguetón
- UI recargada
- Elementos innecesarios
- Estilo formulario clásico visible
- Complejidad innecesaria

El backoffice puede ser más simple. La experiencia del participante es la prioridad.

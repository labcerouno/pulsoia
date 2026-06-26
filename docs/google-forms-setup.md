# Google Forms + Apps Script setup (Pulso IA)

Esta guia conecta Google Forms con Pulso IA usando el webhook:
- Endpoint: `/api/integrations/google-forms`
- Header: `x-pulso-forms-secret`
- Trigger: instalable `onFormSubmit`

## 1. Preparar evento en Pulso IA

1. Entrar en Admin > Eventos.
2. Crear evento con `slug` unico.
3. Cambiar estado a `active`.
4. Copiar:
   - URL webhook: `https://TU_DOMINIO/api/integrations/google-forms`
   - Secret: mismo valor de `GOOGLE_FORMS_WEBHOOK_SECRET`
   - Slug del evento

## 2. Crear el Google Form

Crear preguntas con estos titulos (recomendado exacto):
- `Nombre completo`
- `Email corporativo`
- `Empresa`
- `Area` (o `Área`)
- `Gerencia`
- `Cargo`

Notas:
- `Nombre completo` y `Email corporativo` son obligatorios para enviar al webhook.
- `Empresa`, `Area`, `Gerencia`, `Cargo` pueden ir vacios.

## 3. Crear Apps Script desde el Form

1. Abrir el Form.
2. Ir a `Extensiones` > `Apps Script`.
3. Crear/editar el archivo de script.
4. Copiar el contenido de:
   - `docs/google-forms-apps-script.gs`
5. Reemplazar constantes:
   - `PULSO_WEBHOOK_URL`
   - `PULSO_WEBHOOK_SECRET`
   - `EVENT_SLUG`
6. Guardar el proyecto.

## 4. Instalar trigger onFormSubmit

1. En Apps Script, abrir `Triggers` (icono de reloj).
2. `Add Trigger`.
3. Configurar:
   - Function: `onFormSubmit`
   - Deployment: `Head`
   - Event source: `From form`
   - Event type: `On form submit`
4. Autorizar permisos cuando lo pida.

## 5. Probar integracion

1. En Apps Script, ejecutar `testPulsoWebhook` una vez.
2. Revisar `Execution log`:
   - Debe devolver `status=200` y `ok=true`.
3. Enviar una respuesta real del Form.
4. Verificar en Pulso IA:
   - Se crea/actualiza participante en el evento.
   - Queda email en cola (`queued`) para envio por worker.

## 6. Logs y troubleshooting

Si falla el webhook, el script deja registro con:
- mensaje de error
- `statusCode`
- body de respuesta del backend
- payload enviado

Donde verlo:
1. Apps Script > `Executions`
2. Entrar en la ejecucion fallida
3. Revisar logs (`Logger.log`)

Errores comunes:
- `401 Secret invalido`: secret incorrecto entre script y backend.
- `404 Evento activo no encontrado`: `EVENT_SLUG` inexistente o evento no activo.
- `400 Payload invalido`: nombres de campos mal mapeados o faltan obligatorios.

## 7. Recomendaciones operativas

1. Usar un Form por evento o actualizar `EVENT_SLUG` cuando cambie el evento.
2. Evitar editar nombres de preguntas luego de publicar el flujo.
3. Probar con una respuesta real despues de cualquier cambio.
4. Verificar que el worker `/api/jobs/send-email-queue` este corriendo en cron.

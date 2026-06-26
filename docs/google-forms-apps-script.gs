/*
 * Pulso IA - Google Forms webhook bridge
 *
 * Configure these constants before installing the trigger.
 */
const PULSO_WEBHOOK_URL = 'https://TU_DOMINIO/api/integrations/google-forms'
const PULSO_WEBHOOK_SECRET = 'TU_SECRETO'
const EVENT_SLUG = 'evento-demo-2026'

/**
 * Installable trigger handler for Google Forms submit events.
 * Trigger type: From form -> On form submit.
 */
function onFormSubmit(e) {
  try {
    validateConfig_()

    if (!e || !e.response) {
      throw new Error('Evento de formulario invalido: falta e.response')
    }

    const formResponse = e.response
    const submissionId = formResponse.getId()

    if (!submissionId) {
      throw new Error('No se pudo obtener submissionId desde FormResponse.getId()')
    }

    const mapped = mapFormFields_(formResponse)

    const payload = {
      eventSlug: EVENT_SLUG,
      submissionId,
      fullName: mapped.fullName,
      corporateEmail: mapped.corporateEmail,
      company: mapped.company,
      area: mapped.area,
      managementUnit: mapped.managementUnit,
      role: mapped.role,
    }

    const requestOptions = {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      headers: {
        'x-pulso-forms-secret': PULSO_WEBHOOK_SECRET,
      },
      payload: JSON.stringify(payload),
    }

    const response = UrlFetchApp.fetch(PULSO_WEBHOOK_URL, requestOptions)
    const statusCode = response.getResponseCode()
    const body = response.getContentText()

    if (statusCode < 200 || statusCode >= 300) {
      logWebhookError_(
        'Webhook devolvio estado no exitoso',
        {
          statusCode,
          body,
          payload,
        }
      )
      return
    }

    Logger.log('Pulso webhook OK. status=%s submissionId=%s body=%s', statusCode, submissionId, body)
  } catch (error) {
    logWebhookError_('Error en onFormSubmit', {
      message: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : null,
    })
  }
}

/**
 * Optional helper to test connectivity manually from Apps Script editor.
 */
function testPulsoWebhook() {
  validateConfig_()

  const payload = {
    eventSlug: EVENT_SLUG,
    submissionId: 'manual-test-' + new Date().toISOString(),
    fullName: 'Ada Lovelace',
    corporateEmail: 'ada@empresa.com',
    company: 'Empresa X',
    area: 'Operaciones',
    managementUnit: 'Transformacion',
    role: 'Manager',
  }

  const response = UrlFetchApp.fetch(PULSO_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'x-pulso-forms-secret': PULSO_WEBHOOK_SECRET,
    },
    payload: JSON.stringify(payload),
  })

  Logger.log('testPulsoWebhook status=%s body=%s', response.getResponseCode(), response.getContentText())
}

function validateConfig_() {
  if (!PULSO_WEBHOOK_URL || PULSO_WEBHOOK_URL.indexOf('https://') !== 0) {
    throw new Error('PULSO_WEBHOOK_URL invalido. Debe ser https://...')
  }
  if (!PULSO_WEBHOOK_SECRET || PULSO_WEBHOOK_SECRET === 'TU_SECRETO') {
    throw new Error('PULSO_WEBHOOK_SECRET no configurado')
  }
  if (!EVENT_SLUG) {
    throw new Error('EVENT_SLUG no configurado con un valor real')
  }
}

function mapFormFields_(formResponse) {
  const valuesByTitle = {}
  const itemResponses = formResponse.getItemResponses()

  for (let i = 0; i < itemResponses.length; i += 1) {
    const itemResponse = itemResponses[i]
    const rawTitle = itemResponse.getItem().getTitle() || ''
    const normalizedTitle = normalizeKey_(rawTitle)
    const answer = itemResponse.getResponse()
    valuesByTitle[normalizedTitle] = answer == null ? '' : String(answer).trim()
  }

  const fullName = pickField_(valuesByTitle, ['nombrecompleto', 'nombre'])
  const corporateEmail = pickField_(valuesByTitle, ['emailcorporativo', 'correocorporativo', 'email'])
  const company = pickField_(valuesByTitle, ['empresa', 'organizacion'])
  const area = pickField_(valuesByTitle, ['area'])
  const managementUnit = pickField_(valuesByTitle, ['gerencia', 'managementunit'])
  const role = pickField_(valuesByTitle, ['cargo', 'role', 'puesto'])

  if (!fullName) {
    throw new Error('Falta campo obligatorio: Nombre completo')
  }
  if (!corporateEmail) {
    throw new Error('Falta campo obligatorio: Email corporativo')
  }

  return {
    fullName,
    corporateEmail: corporateEmail.toLowerCase(),
    company,
    area,
    managementUnit,
    role,
  }
}

function pickField_(record, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]
    const value = record[key]
    if (value && String(value).trim()) {
      return String(value).trim()
    }
  }
  return ''
}

function normalizeKey_(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function logWebhookError_(message, data) {
  Logger.log('ERROR Pulso Forms: %s', message)
  if (data) {
    Logger.log('ERROR Data: %s', JSON.stringify(data))
  }
}

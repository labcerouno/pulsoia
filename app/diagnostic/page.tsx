'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { saveAnswer, completeSession, getDiagnosticSnapshot } from '@/actions/diagnostic'

// ── Options ──────────────────────────────────────────────────────────────────

const Q2_OPTIONS = [
  'La uso todos los dias',
  'La uso de vez en cuando',
  'La probé, pero todavía no forma parte de mi rutina',
  'Aún no encontré una forma clara de aplicarla',
]

const Q3_OPTIONS = [
  'Investigación de mercado',
  'Análisis de datos Excel',
  'Resumir archivo',
  'Generar texto para un informe o comunicación',
  'Transcribir una llamada / meet / zoom',
  'Hacer un Power Point',
  'Generar imágenes o video',
  'Otro',
  'No lo sé',
]

const Q5_OPTIONS = [
  'No sé para qué me serviría',
  'No tengo tiempo para explorarla',
  'No sé usarla',
  'Tengo dudas sobre seguridad / confidencialidad',
  'No tengo acceso a herramientas pagas',
  'No confío en los resultados',
  'No veo necesidad',
  'Otra',
]

const VALUE_KEYWORDS = ['ahorre', 'ahorr', 'mejore', 'mejor', 'logre', 'logr', 'reduje', 'reduj', 'automatice', 'automat']

function needsFollowupQ4(text: string) {
  const lc = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
  return text.trim().length > 100 || VALUE_KEYWORDS.some(kw => lc.includes(kw))
}

function needsFollowupQ6(text: string) {
  return text.trim().length > 40
}

const wait = (ms: number) => new Promise<void>(res => setTimeout(res, ms))

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg:             '#222B2E',
  surface:        '#2D3B42',
  surfaceRaised:  '#35424C',
  border:         '#3D4F5A',
  text:           '#FAFAFA',
  textMuted:      '#9599A2',
  textDim:        '#7B818C',
  cyan:           '#6CC5DA',
  cyanDark:       '#5AB4C9',
  userBubbleBg:   '#6CC5DA',
  userBubbleText: '#222B2E',
  aiBubbleBg:     '#35424C',
  aiBubbleText:   '#FAFAFA',
  inputBg:        '#1E2C32',
  red:            '#E52E34',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'init' | 'q1' | 'q2' | 'q3' | 'q4' | 'q4f' | 'q5' | 'q6' | 'q6f' | 'completing'

type ChatMsg = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

const STEP_NUM: Partial<Record<Step, number>> = {
  q1: 1, q2: 2, q3: 3, q4: 4, q4f: 4, q5: 5, q6: 6, q6f: 6, completing: 6,
}

const QUESTION: Partial<Record<Step, string>> = {
  q1:  'En las últimas 2 semanas, ¿usaste alguna herramienta de IA para algo relacionado con tu trabajo?',
  q2:  '¿Qué tan incorporada que está la IA en tu forma de trabajar?',
  q3:  '¿Para qué tipo de tareas la usás? Marcá una o varias.',
  q4:  'Contame un ejemplo concreto donde la IA te haya ayudado a ahorrar tiempo, mejorar un resultado o pensar mejor.',
  q4f: '¿Podés contarme en 1 o 2 líneas qué tarea era, qué herramienta usaste y qué cambió en el resultado?',
  q5:  '¿Cuál es la principal barrera para usar más IA en tu trabajo?',
  q6:  'Si en los próximos 30 dias pudieras resolver mejor una sola tarea con IA, ¿cuál sería? ¿Y por qué?',
  q6f: 'Sumemos una línea más: ¿qué cambio concreto te gustaría lograr?',
}

const STEP_ORDER: Step[] = ['q1', 'q2', 'q3', 'q4', 'q4f', 'q5', 'q6', 'q6f']

// ── Main component ────────────────────────────────────────────────────────────

export default function DiagnosticPage() {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [sessionId,      setSessionId]      = useState<string | null>(null)
  const [participantId,  setParticipantId]  = useState<string | null>(null)
  const [token,          setToken]          = useState<string | null>(null)

  const [messages,     setMessages]     = useState<ChatMsg[]>([])
  const [isTyping,     setIsTyping]     = useState(false)
  const [step,         setStep]         = useState<Step>('init')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // Answer state
  const [q1Usage,         setQ1Usage]         = useState<boolean | null>(null)
  const [q1Tools,         setQ1Tools]         = useState('')
  const [q2Integration,   setQ2Integration]   = useState('')
  const [q3Cases,         setQ3Cases]         = useState<string[]>([])
  const [q3Other,         setQ3Other]         = useState('')
  const [q4Success,       setQ4Success]       = useState('')
  const [q4Followup,      setQ4Followup]      = useState('')
  const [q5Barrier,       setQ5Barrier]       = useState('')
  const [q5BarrierOther,  setQ5BarrierOther]  = useState('')
  const [q6Opportunity,   setQ6Opportunity]   = useState('')
  const [q6Followup,      setQ6Followup]      = useState('')
  const [highlightQ3Other, setHighlightQ3Other] = useState(false)
  const [highlightQ5Other, setHighlightQ5Other] = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const initiated  = useRef(false)
  const q3OtherRef = useRef<HTMLInputElement>(null)
  const q5OtherRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom whenever messages or typing state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Read session from cookies on mount
  useEffect(() => {
    const get = (name: string) => {
      const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
      return m ? decodeURIComponent(m[1]) : null
    }
    const sid = get('diagnostic_session')
    const pid = get('diagnostic_participant')
    const tok = get('diagnostic_token')
    if (!sid || !pid || !tok) { router.replace('/pulso'); return }
    setSessionId(sid)
    setParticipantId(pid)
    setToken(tok)
  }, [router])

  // Kick off conversation once session is loaded
  useEffect(() => {
    if (!sessionId || !participantId || initiated.current) return
    initiated.current = true
    void resumeConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, participantId])

  // ── Helpers ─────────────────────────────────────────────────────────────

  async function resumeConversation() {
    if (!sessionId || !participantId) return

    const snapshot = await getDiagnosticSnapshot(sessionId, participantId)
    const nextStep = snapshot.found ? snapshot.step ?? 'q1' : 'q1'

    if (snapshot.data) {
      setQ1Usage(snapshot.data.q1_usage)
      setQ1Tools(snapshot.data.q1_tools_used ?? '')
      setQ2Integration(snapshot.data.q2_integration ?? '')
      setQ3Cases(snapshot.data.q3_use_cases ?? [])
      setQ3Other(snapshot.data.q3_use_cases_other ?? '')
      setQ4Success(snapshot.data.q4_success_case_raw ?? '')
      setQ4Followup(snapshot.data.q4_followup_raw ?? '')
      setQ5Barrier(snapshot.data.q5_barrier ?? '')
      setQ5BarrierOther(snapshot.data.q5_barrier_other ?? '')
      setQ6Opportunity(snapshot.data.q6_opportunity_raw ?? '')
      setQ6Followup(snapshot.data.q6_followup_raw ?? '')
    }

    setMessages([])
    setIsTyping(true)
    await wait(800)
    setIsTyping(false)
    pushAssistant(QUESTION[nextStep] ?? QUESTION.q1!)
    setStep(nextStep)
  }

  function pushAssistant(text: string) {
    setMessages(prev => [...prev, { id: `a-${Date.now()}-${Math.random()}`, role: 'assistant', text }])
  }

  function pushUser(text: string) {
    setMessages(prev => [...prev, { id: `u-${Date.now()}-${Math.random()}`, role: 'user', text }])
  }

  async function save(field: string, value: unknown) {
    if (!sessionId || !participantId) return
    await saveAnswer(sessionId, participantId, field, value)
  }

  async function advanceTo(nextStep: Step) {
    const question = QUESTION[nextStep]
    if (!question) return
    setIsTyping(true)
    await wait(1300)
    setIsTyping(false)
    pushAssistant(question)
    setStep(nextStep)
  }

  function goBack() {
    if (step === 'q1' || step === 'init' || step === 'completing') return
    const currentIndex = STEP_ORDER.indexOf(step)
    if (currentIndex <= 0) return
    const previous = STEP_ORDER[currentIndex - 1]
    const question = QUESTION[previous]
    if (question) pushAssistant(question)
    setStep(previous)
  }

  async function finish(pendingSave?: Promise<unknown>) {
    if (!sessionId || !participantId || !token) return

    // Switch UI to processing state immediately before any network wait.
    setStep('completing')
    pushAssistant('Estamos generando tu informe...')
    setIsTyping(true)

    if (pendingSave) {
      await pendingSave
    }

    const result = await completeSession(sessionId, participantId, token)
    if (result.error) {
      setIsTyping(false)
      setError('Hubo un problema al finalizar. Intentá de nuevo.')
      setStep('q6')
      return
    }
    setIsTyping(false)
    pushAssistant('¡Listo! Procesando tu diagnóstico personalizado...')
    await wait(900)
    startTransition(() => router.push(`/result?t=${token}`))
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleQ1() {
    if (q1Usage === null || isSubmitting) return
    setIsSubmitting(true)
    const toolsText = q1Usage && q1Tools.trim() ? ` — ${q1Tools.trim()}` : ''
    pushUser(q1Usage ? `Sí${toolsText}` : 'No')
    await save('q1_usage', q1Usage)
    if (q1Usage && q1Tools.trim()) await save('q1_tools_used', q1Tools.trim())
    setIsSubmitting(false)
    await advanceTo('q2')
  }

  async function handleQ2() {
    if (!q2Integration || isSubmitting) return
    setIsSubmitting(true)
    pushUser(q2Integration)
    await save('q2_integration', q2Integration)
    setIsSubmitting(false)
    await advanceTo('q3')
  }

  async function handleQ3() {
    if (isSubmitting) return
    setIsSubmitting(true)
    const cases = [...q3Cases]
    const display = cases.length > 0
      ? cases.join(', ') + (q3Other.trim() ? ` + "${q3Other.trim()}"` : '')
      : 'Ninguna en particular'
    pushUser(display)
    await save('q3_use_cases', cases)
    if (q3Cases.includes('Otro') && q3Other.trim()) {
      await save('q3_use_cases_other', q3Other.trim())
    } else {
      await save('q3_use_cases_other', null)
    }
    setIsSubmitting(false)
    await advanceTo('q4')
  }

  async function handleQ4() {
    if (isSubmitting) return
    setIsSubmitting(true)
    const text = q4Success.trim()
    if (text) {
      pushUser(text)
      await save('q4_success_case_raw', text)
    }
    if (!text || !needsFollowupQ4(text)) {
      setIsSubmitting(false)
      await advanceTo('q5')
    } else {
      setIsSubmitting(false)
      await advanceTo('q4f')
    }
  }

  async function handleQ4F() {
    if (isSubmitting) return
    setIsSubmitting(true)
    const text = q4Followup.trim()
    if (text) {
      pushUser(text)
      await save('q4_followup_raw', text)
    }
    setIsSubmitting(false)
    await advanceTo('q5')
  }

  async function handleQ5() {
    if (!q5Barrier || isSubmitting) return
    setIsSubmitting(true)
    const display = q5Barrier === 'Otra' && q5BarrierOther.trim()
      ? q5BarrierOther.trim()
      : q5Barrier
    pushUser(display)
    await save('q5_barrier', q5Barrier)
    if (q5Barrier === 'Otra' && q5BarrierOther.trim()) {
      await save('q5_barrier_other', q5BarrierOther.trim())
    } else {
      await save('q5_barrier_other', null)
    }
    setIsSubmitting(false)
    await advanceTo('q6')
  }

  async function handleQ6() {
    if (isSubmitting) return
    setIsSubmitting(true)
    const text = q6Opportunity.trim()
    const savePromise = text ? save('q6_opportunity_raw', text) : Promise.resolve()
    if (text) {
      pushUser(text)
    }
    if (!text || !needsFollowupQ6(text)) {
      setIsSubmitting(false)
      await finish(savePromise)
    } else {
      await savePromise
      setIsSubmitting(false)
      await advanceTo('q6f')
    }
  }

  async function handleQ6F() {
    if (isSubmitting) return
    setIsSubmitting(true)
    const text = q6Followup.trim()
    const savePromise = text ? save('q6_followup_raw', text) : Promise.resolve()
    if (text) {
      pushUser(text)
    }
    setIsSubmitting(false)
    await finish(savePromise)
  }

  function toggleQ3(opt: string) {
    setQ3Cases((prev) => {
      const next = prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
      if (!next.includes('Otro')) {
        setQ3Other('')
        setHighlightQ3Other(false)
      }
      return next
    })

    if (opt === 'Otro') {
      requestAnimationFrame(() => {
        q3OtherRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        q3OtherRef.current?.focus()
      })
      setHighlightQ3Other(true)
      window.setTimeout(() => setHighlightQ3Other(false), 1300)
    }
  }

  function selectQ5Barrier(opt: string) {
    setQ5Barrier(opt)
    if (opt !== 'Otra') {
      setQ5BarrierOther('')
      setHighlightQ5Other(false)
      return
    }

    requestAnimationFrame(() => {
      q5OtherRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      q5OtherRef.current?.focus()
    })
    setHighlightQ5Other(true)
    window.setTimeout(() => setHighlightQ5Other(false), 1300)
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (!sessionId) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <TypingDots />
      </div>
    )
  }

  const currentStepNum = STEP_NUM[step] ?? 0
  const showInput = !isTyping && step !== 'init' && step !== 'completing'

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg }}>

      {/* ── Header ── */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
        background: C.surfaceRaised,
      }}>
        <div style={{ background: '#FAFAFA', borderRadius: 6, padding: '5px 10px', display: 'inline-flex', alignItems: 'center' }}>
          <Image src="/logo-oxy.png" alt="Oxy46" width={60} height={22} style={{ objectFit: 'contain', display: 'block' }} />
        </div>
        {currentStepNum > 0 && (
          <span style={{ fontSize: 12, color: C.textDim, fontWeight: 500, letterSpacing: '0.04em' }}>
            {currentStepNum} / 6
          </span>
        )}
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: 2, background: C.border, flexShrink: 0 }}>
        <div style={{
          height: '100%',
          background: C.cyan,
          width: `${(currentStepNum / 6) * 100}%`,
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 16px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            className="message-in"
            style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            {msg.role === 'assistant' && <AvatarDot />}
            <div style={{
              maxWidth: '78%',
              padding: '11px 15px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? C.userBubbleBg : C.aiBubbleBg,
              color: msg.role === 'user' ? C.userBubbleText : C.aiBubbleText,
              fontSize: 14,
              lineHeight: 1.6,
              fontWeight: msg.role === 'user' ? 500 : 400,
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="message-in" style={{ display: 'flex', alignItems: 'center' }}>
            <AvatarDot />
            <div style={{
              padding: '11px 16px',
              borderRadius: '18px 18px 18px 4px',
              background: C.aiBubbleBg,
              display: 'flex',
              gap: 5,
              alignItems: 'center',
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      {showInput && (
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '14px 16px 20px', flexShrink: 0 }}>
          {error && (
            <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: '#2D1515', border: `1px solid ${C.red}`, color: '#FF8585', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Q1 */}
          {step === 'q1' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {([['Sí', true], ['No', false]] as const).map(([label, val]) => (
                  <button
                    key={label}
                    onClick={() => setQ1Usage(val)}
                    style={optionBtn(q1Usage === val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {q1Usage === true && (
                <textarea
                  value={q1Tools}
                  onChange={e => setQ1Tools(e.target.value)}
                  placeholder="¿Cuáles? (opcional) - ChatGPT, Claude, Copilot..."
                  rows={2}
                  style={textareaStyle}
                />
              )}
              <StepArrows
                onBack={goBack}
                onNext={handleQ1}
                disableBack
                disableNext={isSubmitting || q1Usage === null}
              />
            </div>
          )}

          {/* Q2 */}
          {step === 'q2' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, maxHeight: 260, overflowY: 'auto' }}>
                {Q2_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setQ2Integration(opt)} style={optionBtn(q2Integration === opt, true)}>
                    {opt}
                  </button>
                ))}
              </div>
              <StepArrows onBack={goBack} onNext={handleQ2} disableNext={isSubmitting || !q2Integration} />
            </div>
          )}

          {/* Q3 */}
          {step === 'q3' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, maxHeight: 'calc(100dvh - 230px)', overflowY: 'auto' }}>
                {Q3_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => toggleQ3(opt)}
                    style={{ ...optionBtn(q3Cases.includes(opt), true), display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <Checkbox checked={q3Cases.includes(opt)} />
                    {opt}
                  </button>
                ))}
                {q3Cases.includes('Otro') && (
                  <input
                    ref={q3OtherRef}
                    type="text"
                    value={q3Other}
                    onChange={e => setQ3Other(e.target.value)}
                    placeholder="Describilo en una línea..."
                    style={{
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: C.inputBg,
                      border: `1.5px solid ${highlightQ3Other ? C.red : C.border}`,
                      boxShadow: highlightQ3Other ? `0 0 0 2px ${C.red}33` : 'none',
                      color: C.text,
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                )}
              </div>
              <StepArrows onBack={goBack} onNext={handleQ3} disableNext={isSubmitting} />
            </div>
          )}

          {/* Q4 */}
          {step === 'q4' && (
            <TextInput
              value={q4Success}
              onChange={setQ4Success}
              onSubmit={handleQ4}
              placeholder="Qué tarea era, qué herramienta usaste, qué cambió..."
              skippable
              disabled={isSubmitting}
              onBack={goBack}
            />
          )}

          {/* Q4 follow-up */}
          {step === 'q4f' && (
            <TextInput
              value={q4Followup}
              onChange={setQ4Followup}
              onSubmit={handleQ4F}
              placeholder="Ej: ahorré 2 horas, mejoré la calidad del informe..."
              skippable
              disabled={isSubmitting}
              onBack={goBack}
            />
          )}

          {/* Q5 */}
          {step === 'q5' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, maxHeight: 'calc(100dvh - 230px)', overflowY: 'auto' }}>
                {Q5_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => selectQ5Barrier(opt)} style={optionBtn(q5Barrier === opt, true)}>
                    {opt}
                  </button>
                ))}
                {q5Barrier === 'Otra' && (
                  <input
                    ref={q5OtherRef}
                    type="text"
                    value={q5BarrierOther}
                    onChange={e => setQ5BarrierOther(e.target.value)}
                    placeholder="Describí la barrera..."
                    style={{
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: C.inputBg,
                      border: `1.5px solid ${highlightQ5Other ? C.red : C.border}`,
                      boxShadow: highlightQ5Other ? `0 0 0 2px ${C.red}33` : 'none',
                      color: C.text,
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                )}
              </div>
              <StepArrows onBack={goBack} onNext={handleQ5} disableNext={isSubmitting || !q5Barrier} />
            </div>
          )}

          {/* Q6 */}
          {step === 'q6' && (
            <TextInput
              value={q6Opportunity}
              onChange={setQ6Opportunity}
              onSubmit={handleQ6}
              placeholder="Ej: armar el resumen semanal, analizar datos..."
              skippable
              disabled={isSubmitting}
              onBack={goBack}
            />
          )}

          {/* Q6 follow-up */}
          {step === 'q6f' && (
            <TextInput
              value={q6Followup}
              onChange={setQ6Followup}
              onSubmit={handleQ6F}
              placeholder="Ej: me tomaría menos tiempo, reduciría errores..."
              skippable
              disabled={isSubmitting}
              onBack={goBack}
            />
          )}
        </div>
      )}

      {/* Completing state */}
      {step === 'completing' && !isTyping && (
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '20px 16px', textAlign: 'center', flexShrink: 0 }}>
          <p style={{ color: C.textMuted, fontSize: 14 }}>Generando tu diagnóstico...</p>
        </div>
      )}
    </div>
  )
}

// ── Style helpers ─────────────────────────────────────────────────────────────

function optionBtn(selected: boolean, fullWidth = false): React.CSSProperties {
  return {
    flex: fullWidth ? undefined : 1,
    width: fullWidth ? '100%' : undefined,
    textAlign: fullWidth ? 'left' : 'center',
    padding: '9px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    background: selected ? '#6CC5DA' : '#35424C',
    color: selected ? '#222B2E' : '#FAFAFA',
    border: `1px solid ${selected ? '#6CC5DA' : '#3D4F5A'}`,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  }
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  background: '#1E2C32',
  border: '1px solid #3D4F5A',
  color: '#FAFAFA',
  fontSize: 13,
  resize: 'none',
  outline: 'none',
  marginBottom: 10,
  fontFamily: 'inherit',
  lineHeight: 1.5,
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AvatarDot() {
  return (
    <div style={{
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: '#35424C',
      border: '1px solid #3D4F5A',
      flexShrink: 0,
      marginRight: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      color: '#6CC5DA',
      fontWeight: 700,
    }}>
      ✦
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="typing-dot"
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#9599A2',
            display: 'block',
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span style={{
      width: 16,
      height: 16,
      borderRadius: 4,
      border: `1.5px solid ${checked ? '#222B2E' : '#7B818C'}`,
      background: checked ? 'rgba(34,43,46,0.25)' : 'transparent',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {checked && (
        <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l3 3 5-6" stroke="#222B2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

function StepArrows({
  onBack,
  onNext,
  disableBack,
  disableNext,
}: {
  onBack: () => void
  onNext: () => void
  disableBack?: boolean
  disableNext?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={onBack}
        disabled={disableBack}
        aria-label="Pregunta anterior"
        style={{
          width: 46,
          height: 44,
          borderRadius: 10,
          border: `1px solid ${disableBack ? '#3D4F5A' : '#6CC5DA'}`,
          background: 'transparent',
          color: disableBack ? '#7B818C' : '#6CC5DA',
          cursor: disableBack ? 'not-allowed' : 'pointer',
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        ←
      </button>
      <button
        onClick={onNext}
        disabled={disableNext}
        aria-label="Pregunta siguiente"
        style={{
          flex: 1,
          height: 44,
          borderRadius: 10,
          border: 'none',
          background: disableNext ? '#35424C' : '#6CC5DA',
          color: disableNext ? '#7B818C' : '#222B2E',
          cursor: disableNext ? 'not-allowed' : 'pointer',
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        →
      </button>
    </div>
  )
}

function TextInput({ value, onChange, onSubmit, onBack, placeholder, skippable, disabled }: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onBack: () => void
  placeholder: string
  skippable?: boolean
  disabled: boolean
}) {
  const isEmpty = value.trim() === ''
  return (
    <div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={textareaStyle}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !disabled) onSubmit() }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <button
          onClick={onBack}
          aria-label="Pregunta anterior"
          style={{
            width: 46,
            borderRadius: 10,
            border: '1px solid #6CC5DA',
            background: 'transparent',
            color: '#6CC5DA',
            cursor: 'pointer',
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          ←
        </button>
        {skippable && isEmpty ? (
          <button
            onClick={onSubmit}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              background: 'transparent',
              color: '#9599A2',
              border: '1px solid #3D4F5A',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Saltear
          </button>
        ) : null}
        <button
          onClick={onSubmit}
          disabled={disabled}
          style={{
            flex: 1,
            width: '100%',
            padding: '12px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            background: disabled ? '#35424C' : '#6CC5DA',
            color: disabled ? '#7B818C' : '#222B2E',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
            letterSpacing: '-0.01em',
          }}
        >
          →
        </button>
      </div>
    </div>
  )
}

import { Document, Page, Text, View, Image, Font, StyleSheet } from '@react-pdf/renderer'
import path from 'path'
import type { ProfileLabel } from '@/lib/supabase/types'

const fontDir = path.join(process.cwd(), 'docs', 'design', 'Miranda_Sans', 'static')
const logoPath = path.join(process.cwd(), 'public', 'logo-oxy.png')

Font.register({
  family: 'Miranda',
  fonts: [
    { src: path.join(fontDir, 'MirandaSans-Regular.ttf'), fontWeight: 400 },
    { src: path.join(fontDir, 'MirandaSans-Medium.ttf'), fontWeight: 500 },
    { src: path.join(fontDir, 'MirandaSans-SemiBold.ttf'), fontWeight: 600 },
    { src: path.join(fontDir, 'MirandaSans-Bold.ttf'), fontWeight: 700 },
  ],
})

const C = {
  dark: '#1A2226',
  header: '#222B2E',
  surface: '#F7F9FA',
  border: '#DDE2E6',
  text: '#1A2226',
  muted: '#5B6470',
  dim: '#8A929C',
  cyan: '#0E92A8',
  green: '#1DAA72',
  amber: '#C07A10',
  white: '#FFFFFF',
  cyanLight: '#E8F6F9',
  greenLight: '#E6F6EF',
  amberLight: '#FBF3E6',
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Miranda',
    backgroundColor: C.white,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: C.header,
    paddingHorizontal: 36,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLogo: {
    width: 64,
    height: 24,
    objectFit: 'contain',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: C.white,
    letterSpacing: 0.4,
  },
  headerSub: {
    fontSize: 9,
    color: '#9599A2',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  body: {
    paddingHorizontal: 36,
    paddingTop: 24,
  },
  // Hero section
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    borderBottomStyle: 'solid',
  },
  heroLeft: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: C.dim,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  heroName: {
    fontSize: 16,
    fontWeight: 700,
    color: C.text,
    marginBottom: 2,
  },
  heroArea: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 10,
  },
  heroCongrats: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 1.5,
    maxWidth: 320,
  },
  heroRight: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  scoreBox: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: '10 14 10 14',
    alignItems: 'center',
    minWidth: 80,
  },
  scoreNum: {
    fontSize: 30,
    fontWeight: 700,
    color: C.dark,
    lineHeight: 1,
  },
  scoreDen: {
    fontSize: 14,
    fontWeight: 400,
    color: C.muted,
  },
  profileBadge: {
    marginTop: 8,
    backgroundColor: C.dark,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  profileBadgeText: {
    fontSize: 8,
    fontWeight: 700,
    color: C.white,
    letterSpacing: 1,
  },
  // Sections
  section: {
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    padding: '14 16 14 16',
  },
  sectionCyan: {
    borderColor: '#A8DCE8',
    backgroundColor: C.cyanLight,
  },
  sectionGreen: {
    borderColor: '#9DDDC1',
    backgroundColor: C.greenLight,
  },
  sectionAmber: {
    borderColor: '#EDD0A6',
    backgroundColor: C.amberLight,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: C.dim,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionLabelCyan: {
    color: C.cyan,
  },
  sectionLabelGreen: {
    color: C.green,
  },
  sectionLabelAmber: {
    color: C.amber,
  },
  sectionText: {
    fontSize: 11,
    color: C.text,
    lineHeight: 1.55,
    fontWeight: 400,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: C.text,
    marginBottom: 6,
  },
  // Checklist
  checkRow: {
    flexDirection: 'row',
    marginBottom: 5,
    gap: 6,
  },
  checkMark: {
    fontSize: 10,
    color: C.cyan,
    fontWeight: 700,
    marginTop: 0.5,
    width: 12,
  },
  checkText: {
    fontSize: 11,
    color: C.text,
    lineHeight: 1.5,
    flex: 1,
  },
  // Plan
  planRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 8,
    alignItems: 'flex-start',
  },
  planDay: {
    fontSize: 9,
    fontWeight: 700,
    color: C.cyan,
    width: 34,
    paddingTop: 1,
  },
  planText: {
    fontSize: 10,
    color: C.muted,
    lineHeight: 1.4,
    flex: 1,
  },
  // Resource
  resourceUrl: {
    fontSize: 10,
    color: C.cyan,
    marginTop: 4,
    textDecoration: 'underline',
  },
  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    borderBottomStyle: 'solid',
    marginBottom: 14,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: C.dim,
    letterSpacing: 0.4,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  colLeft: {
    flex: 1,
  },
  colRight: {
    flex: 1,
  },
})

const CONGRATS: Record<ProfileLabel, string> = {
  OBSERVADOR: 'Estás en una etapa inicial. Con pasos chicos y consistentes vas a notar avances rápido.',
  EXPLORADOR: 'Buen avance: ya estás probando IA en tu trabajo.',
  'USUARIO ACTIVO': 'Excelente ritmo: ya convertiste IA en una herramienta de trabajo.',
  MULTIPLICADOR: 'Gran nivel: ya estás generando impacto y podés impulsar a otros.',
  REFERENTE: 'Nivel sobresaliente: tu experiencia puede acelerar a todo el equipo.',
}

const PLAN_BY_LEVEL: Record<ProfileLabel, string[]> = {
  OBSERVADOR: [
    'Día 1: elegí una tarea de menos de 20 minutos y usá IA solo para esa parte.',
    'Día 2-3: ajustá el prompt hasta obtener el resultado esperado.',
    'Día 4: comparé tiempo y calidad con tu método habitual.',
    'Día 5: probá la misma tarea con una variación distinta.',
    'Día 6: anotá qué funcionó y qué no en 3 líneas.',
    'Día 7: elegí la próxima tarea para la semana siguiente.',
  ],
  EXPLORADOR: [
    'Día 1: definí una tarea semanal concreta para automatizar parcialmente.',
    'Día 2-3: armá el flujo completo con IA y ajustá hasta que sea fluido.',
    'Día 4: medí ahorro de tiempo real vs método anterior.',
    'Día 5: identificá un segundo caso de uso similar.',
    'Día 6: documentá los pasos del flujo en un mini instructivo.',
    'Día 7: compartí el flujo con un colega directo.',
  ],
  'USUARIO ACTIVO': [
    'Día 1: seleccioná un proceso real y definí entrada, validación y salida.',
    'Día 2-3: construí el flujo con IA y aplicá dos controles de calidad.',
    'Día 4: ejecutá el proceso con un caso real y medí resultado.',
    'Día 5: documentá el caso en una página para compartir internamente.',
    'Día 6: mostrá el caso a tu equipo o área.',
    'Día 7: establecé compromiso semanal de repetición.',
  ],
  MULTIPLICADOR: [
    'Día 1: identificá el caso de mayor impacto de tu equipo.',
    'Día 2-3: documentá el paso a paso completo con métricas.',
    'Día 4: preparala en formato de sesión replicable.',
    'Día 5: presentala a al menos una persona de otra área.',
    'Día 6: recopilá feedback y ajustá el material.',
    'Día 7: agendá próxima instancia de transferencia.',
  ],
  REFERENTE: [
    'Día 1: definí los tres frentes de adopción prioritarios.',
    'Día 2-3: asigná responsables y objetivos semanales por frente.',
    'Día 4: establecé métricas de seguimiento (tiempo, calidad, adopción).',
    'Día 5: creá canal de intercambio de casos y aprendizajes.',
    'Día 6: agendá revisión semanal de métricas.',
    'Día 7: comunicá el plan al equipo y generá compromiso colectivo.',
  ],
}

export interface ResultPDFData {
  name: string
  area: string | null
  profile: ProfileLabel
  score: number
  strength: string
  actionIntro: string
  actionPrompt: string
  opportunity: string | null
  useCases: string[] | null
  tools: string | null
  resourceLabel: string
  resourceUrl: string
}

export function ResultPDF({ d }: { d: ResultPDFData }) {
  const congrats = CONGRATS[d.profile]
  const isLevel1 = d.profile === 'OBSERVADOR'
  const plan = PLAN_BY_LEVEL[d.profile]
  const useCasesText = d.useCases && d.useCases.length > 0 ? d.useCases.join(', ') : '—'
  const toolsText = d.tools || '—'
  const opportunityText = d.opportunity || '—'
  const areaText = d.area || '—'

  return (
    <Document
      title={`Pulse IA BCR — ${d.name}`}
      author="Oxy46"
      subject="Diagnóstico institucional de IA"
      creator="Pulse IA BCR"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Image src={logoPath} style={s.headerLogo} />
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Pulse IA BCR</Text>
            <Text style={s.headerSub}>Diagnóstico institucional · Uso interno</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* Hero: nombre + score */}
          <View style={s.heroRow}>
            <View style={s.heroLeft}>
              <Text style={s.heroLabel}>Participante</Text>
              <Text style={s.heroName}>{d.name}</Text>
              <Text style={s.heroArea}>{areaText}</Text>
              <Text style={s.heroCongrats}>{congrats}</Text>
            </View>
            <View style={s.heroRight}>
              <View style={s.scoreBox}>
                <Text style={s.scoreNum}>
                  {d.score}
                  <Text style={s.scoreDen}>/12</Text>
                </Text>
              </View>
              <View style={s.profileBadge}>
                <Text style={s.profileBadgeText}>{d.profile}</Text>
              </View>
            </View>
          </View>

          {/* Resumen de respuestas */}
          <View style={[s.section]}>
            <Text style={s.sectionLabel}>Resumen del diagnóstico</Text>
            <View style={{ flexDirection: 'row', gap: 24, marginTop: 2 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.sectionText, { color: C.dim, fontSize: 9, marginBottom: 2 }]}>HERRAMIENTAS</Text>
                <Text style={s.sectionText}>{toolsText}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.sectionText, { color: C.dim, fontSize: 9, marginBottom: 2 }]}>CASOS DE USO</Text>
                <Text style={s.sectionText}>{useCasesText}</Text>
              </View>
            </View>
            {opportunityText !== '—' && (
              <View style={{ marginTop: 8 }}>
                <Text style={[s.sectionText, { color: C.dim, fontSize: 9, marginBottom: 2 }]}>OPORTUNIDAD PRIORIZADA</Text>
                <Text style={s.sectionText}>{opportunityText}</Text>
              </View>
            )}
          </View>

          {/* Fortaleza / Impulso */}
          <View style={[s.section, s.sectionCyan]}>
            <Text style={[s.sectionLabel, s.sectionLabelCyan]}>
              {isLevel1 ? 'Impulso inicial' : 'Fortaleza principal'}
            </Text>
            <Text style={s.sectionText}>{d.strength}</Text>
          </View>

          {/* Próximo paso sugerido */}
          <View style={[s.section, s.sectionGreen]}>
            <Text style={[s.sectionLabel, s.sectionLabelGreen]}>Próximo paso sugerido</Text>
            <Text style={[s.sectionText, { marginBottom: 8 }]}>{d.actionIntro}</Text>
            <Text style={[s.sectionText, { fontSize: 10.3, lineHeight: 1.5 }]}>{d.actionPrompt}</Text>
          </View>

          {/* Plan 7 días + Recurso en dos columnas */}
          <View style={s.twoCol}>
            <View style={s.colLeft}>
              <View style={[s.section, { marginBottom: 0 }]}>
                <Text style={[s.sectionLabel, { color: C.amber }]}>Plan de 7 días</Text>
                {plan.map((step, idx) => (
                  <View key={idx} style={s.planRow}>
                    <Text style={s.planDay}>D{idx + 1}</Text>
                    <Text style={s.planText}>{step.replace(/^Día \d+:\s*/, '')}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={s.colRight}>
              <View style={[s.section, { marginBottom: 0 }]}>
                <Text style={[s.sectionLabel]}>Recurso recomendado</Text>
                <Text style={s.sectionText}>{d.resourceLabel}</Text>
                <Text style={s.resourceUrl}>{d.resourceUrl}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>BCR · Pulse IA · Uso interno</Text>
          <Text style={s.footerText}>Generado por Oxy46</Text>
        </View>
      </Page>
    </Document>
  )
}

import { Document, Page, Text, View, Image, Font, StyleSheet } from '@react-pdf/renderer'
import path from 'path'

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
  header: '#222B2E',
  white: '#FFFFFF',
  dark: '#1A2226',
  muted: '#5B6470',
  border: '#DDE2E6',
  surface: '#F7F9FA',
  cyan: '#0E92A8',
  green: '#1DAA72',
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
  logo: {
    width: 64,
    height: 24,
    objectFit: 'contain',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: C.white,
    letterSpacing: 0.4,
  },
  headerSub: {
    fontSize: 9,
    color: '#A5ACB5',
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 36,
    paddingTop: 24,
  },
  section: {
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    padding: '14 16 14 16',
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: '#8A929C',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionLabelGreen: {
    color: C.green,
  },
  sectionText: {
    fontSize: 11,
    color: C.dark,
    lineHeight: 1.55,
    fontWeight: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: C.dark,
    marginBottom: 4,
  },
  name: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 2,
  },
  area: {
    fontSize: 10,
    color: '#8A929C',
  },
  promptBox: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDDE4',
    backgroundColor: '#EDF8FA',
    padding: '12 12 12 12',
  },
  promptText: {
    fontSize: 10.4,
    color: C.dark,
    lineHeight: 1.5,
  },
  closing: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: '12 12 12 12',
    backgroundColor: '#EEF2F5',
  },
  closingText: {
    fontSize: 10.8,
    color: C.muted,
    lineHeight: 1.55,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#8A929C',
    letterSpacing: 0.4,
  },
})

export interface ResultPDFData {
  name: string
  area: string | null
  strength: string
  actionIntro: string
  actionPrompt: string
  closingMessage: string
}

export function ResultPDF({ d }: { d: ResultPDFData }) {
  return (
    <Document
      title={`Pulso IA - ${d.name}`}
      author="Oxy46"
      subject="Devolución personalizada"
      creator="Pulso IA"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Image src={logoPath} style={s.logo} />
          <View>
            <Text style={s.headerTitle}>Pulso IA</Text>
            <Text style={s.headerSub}>Devolución personalizada</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.section}>
            <Text style={s.title}>Tu devolución</Text>
            <Text style={s.name}>{d.name}</Text>
            <Text style={s.area}>{d.area || 'Área no especificada'}</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionLabel}>Fortaleza principal</Text>
            <Text style={s.sectionText}>{d.strength}</Text>
          </View>

          <View style={s.section}>
            <Text style={[s.sectionLabel, s.sectionLabelGreen]}>Próximo paso sugerido</Text>
            <Text style={s.sectionText}>{d.actionIntro}</Text>
            <View style={s.promptBox}>
              <Text style={s.promptText}>{d.actionPrompt}</Text>
            </View>
          </View>

          <View style={s.closing}>
            <Text style={s.closingText}>{d.closingMessage}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Pulso IA - Uso interno</Text>
          <Text style={s.footerText}>Generado por Oxy46</Text>
        </View>
      </Page>
    </Document>
  )
}

import type { ProfileLabel } from './supabase/types'

export function getHeadline(profile: ProfileLabel): string {
  if (profile === 'OBSERVADOR') {
    return 'Buen comienzo: estás abriendo una oportunidad concreta para mejorar tu forma de trabajo.'
  }
  return 'Felicitaciones: ya estás construyendo una forma de trabajo más inteligente con IA.'
}

export function shortCongrats(profile: ProfileLabel): string {
  if (profile === 'OBSERVADOR') {
    return 'Estas en una etapa inicial. Con pasos chicos y consistentes vas a notar avances rapido.'
  }
  if (profile === 'EXPLORADOR') {
    return 'Ya empezaste a explorar IA en tu trabajo. Todavia hay mucho potencial para convertirlo en habito.'
  }
  if (profile === 'USUARIO ACTIVO') {
    return 'Ya tenes un uso sostenido en algunas tareas. El proximo paso es consolidarlo en procesos concretos.'
  }
  if (profile === 'MULTIPLICADOR') {
    return 'Ya estas generando impacto real con IA y podes transferir buenas practicas a otras personas.'
  }
  return 'Tu experiencia con IA ya es avanzada y puede acelerar la adopcion del equipo.'
}

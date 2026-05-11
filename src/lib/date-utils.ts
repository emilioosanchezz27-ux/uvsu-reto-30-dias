/**
 * El día "activo" para el usuario cierra a las 3am hora local.
 * Antes de las 3am, el día activo es el día de ayer.
 * Después de las 3am, el día activo es hoy.
 */

/** Retorna el "día lógico" actual (YYYY-MM-DD), teniendo en cuenta el reset a las 3am */
export function getActiveDate(): string {
  const now = new Date()
  if (now.getHours() < 3) {
    // Antes de las 3am → el día activo es ayer
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return toDateString(yesterday)
  }
  return toDateString(now)
}

/** Verifica si una fecha dada es editable por el usuario */
export function isDateEditable(date: string): boolean {
  const activeDate = getActiveDate()
  if (date === activeDate) return true

  // También permite editar el día anterior si todavía es antes de las 3am
  const now = new Date()
  if (now.getHours() < 3) {
    const dayBefore = new Date(now)
    dayBefore.setDate(dayBefore.getDate() - 2)
    const dayBeforeStr = toDateString(dayBefore)
    if (date === dayBeforeStr) return true
  }

  return false
}

/** Convierte Date a string YYYY-MM-DD */
export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Convierte string YYYY-MM-DD a Date (medianoche local) */
export function fromDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Calcula el número de día del reto dado la fecha de inicio */
export function getDayNumber(startDate: string, targetDate?: string): number {
  const start = fromDateString(startDate)
  const target = targetDate ? fromDateString(targetDate) : fromDateString(getActiveDate())
  const diff = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
}

/** Retorna todas las fechas del reto (30 días) */
export function getChallengeDates(startDate: string): string[] {
  const dates: string[] = []
  const start = fromDateString(startDate)
  for (let i = 0; i < 30; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(toDateString(d))
  }
  return dates
}

/** Formatea fecha en español para mostrar (ej. "10 de mayo") */
export function formatDateSpanish(dateStr: string): string {
  const date = fromDateString(dateStr)
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

/** Retorna el nombre del día de la semana en español */
export function getDayName(dateStr: string): string {
  const date = fromDateString(dateStr)
  return date.toLocaleDateString('es-MX', { weekday: 'short' })
}

/** Calcula cuántos días faltan para una fecha */
export function daysUntil(dateStr: string): number {
  const target = fromDateString(dateStr)
  const today = fromDateString(getActiveDate())
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

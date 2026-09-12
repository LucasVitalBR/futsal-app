const ATTENDANCE_TIERS = [
  'Chuteira de Bronze',
  'Chuteira de Prata',
  'Chuteira de Ouro',
  'Chuteira de Diamante',
  'Chuteira de Platina',
  'Bola de Ouro',
]

export function getAttendanceTier(presentCount, totalMatches, totalPoints = 0) {
  if (totalPoints <= 0) {
    return { name: ATTENDANCE_TIERS[0], level: 0 }
  }

  const absenceCount = Math.max(0, totalMatches - presentCount)
  const balance = Math.max(0, Math.min(ATTENDANCE_TIERS.length - 1, presentCount - absenceCount))
  return { name: ATTENDANCE_TIERS[balance], level: balance }
}

export function getAttendanceBalance(presentCount, totalMatches) {
  return presentCount - Math.max(0, totalMatches - presentCount)
}
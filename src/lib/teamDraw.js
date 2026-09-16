export const MIN_TEAM_SIZE = 3
export const MAX_PLAYERS_PER_TEAM = 5

export function shuffle(list) {
  const copy = [...list]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy
}

export function createTeams(playerIds) {
  const shuffled = shuffle(playerIds)
  const playersPerTeam = Math.min(MAX_PLAYERS_PER_TEAM, Math.floor(shuffled.length / 2))
  const reserves = shuffled.slice(playersPerTeam * 2)

  return {
    A: shuffled.slice(0, playersPerTeam),
    B: shuffled.slice(playersPerTeam, playersPerTeam * 2),
    reserve: reserves,
    reserveA: reserves.filter((_playerId, index) => index % 2 === 0),
    reserveB: reserves.filter((_playerId, index) => index % 2 === 1),
  }
}

// Mistura, só dentro de um time (A ou B), quem fica titular e quem fica na
// reserva — sem mexer no outro time nem sortear tudo de novo.
export function shuffleLineup(teams, side) {
  const starterKey = side
  const reserveKey = side === 'A' ? 'reserveA' : 'reserveB'
  const startersCount = (teams[starterKey] ?? []).length
  const pool = shuffle([...(teams[starterKey] ?? []), ...(teams[reserveKey] ?? [])])

  const nextTeams = {
    ...teams,
    [starterKey]: pool.slice(0, startersCount),
    [reserveKey]: pool.slice(startersCount),
  }
  nextTeams.reserve = [...(nextTeams.reserveA ?? []), ...(nextTeams.reserveB ?? [])]
  return nextTeams
}

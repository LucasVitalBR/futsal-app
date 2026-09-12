// Posições selecionáveis na cartinha. "skillPool" diz qual pool de
// habilidades (ver src/lib/skills.js) essa posição puxa mais na hora do
// sorteio de tier — hoje só existem as pools "goleiro" e "linha", mas as 4
// posições de linha já ficam mapeadas separadamente pra UI (abreviação /
// nome de exibição) mesmo compartilhando a mesma pool de habilidades.
export const POSITIONS = [
  { id: 'goleiro', label: 'Goleiro', abbr: 'GL', skillPool: 'goleiro' },
  { id: 'fixo', label: 'Fixo', abbr: 'FX', skillPool: 'linha' },
  { id: 'ala_direita', label: 'Ala Direita', abbr: 'ALD', skillPool: 'linha' },
  { id: 'ala_esquerda', label: 'Ala Esquerda', abbr: 'ALE', skillPool: 'linha' },
  { id: 'pivo', label: 'Pivô', abbr: 'PV', skillPool: 'linha' },
]

export function getPositionById(id) {
  return POSITIONS.find((position) => position.id === id)
}

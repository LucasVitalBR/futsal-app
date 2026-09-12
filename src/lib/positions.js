// Posições selecionáveis na cartinha. "skillPool" diz qual pool de
// habilidades (ver src/lib/skills.js) essa posição puxa mais na hora do
// sorteio de tier. Ala Direita e Ala Esquerda compartilham a mesma pool
// "ala" (as habilidades de ala não distinguem lado).
export const POSITIONS = [
  { id: 'goleiro', label: 'Goleiro', abbr: 'GL', skillPool: 'goleiro' },
  { id: 'fixo', label: 'Fixo', abbr: 'FX', skillPool: 'fixo' },
  { id: 'ala_direita', label: 'Ala Direita', abbr: 'ALD', skillPool: 'ala' },
  { id: 'ala_esquerda', label: 'Ala Esquerda', abbr: 'ALE', skillPool: 'ala' },
  { id: 'pivo', label: 'Pivô', abbr: 'PV', skillPool: 'pivo' },
]

export function getPositionById(id) {
  return POSITIONS.find((position) => position.id === id)
}

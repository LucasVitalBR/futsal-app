import chuteLonge from '../assets/Habilidade - Chute Longe.png'
import chutePreciso from '../assets/Habilidade - Chute Preciso.png'
import chuteRasteiro from '../assets/Habilidade - Chute Rasteiro.png'
import passeIncisivo from '../assets/Habilidade - Passe Incisivo.png'
import posicionamento from '../assets/Habilidade - Posicionamento.png'
import rapido from '../assets/Habilidade - Rapido.png'
import veloz from '../assets/Habilidade - Veloz.png'
import tecnica from '../assets/Habilidade - técnica.png'
import goleiroParedao from '../assets/Habilidade - Goleiro Paredão.png'
import goleiroPonte from '../assets/Habilidade - Goleiro Ponte.png'
import goleiroReposicao from '../assets/Habilidade - Goleiro Reposição.png'
import goleiroSocao from '../assets/Habilidade - Goleiro SOCÃO.png'
import goleiroGenerico from '../assets/Habilidade - Goleiro.png'
import { getPositionById } from './positions'

// Pool de habilidades desbloqueáveis. "pool" indica de qual posição a
// habilidade é "temática" — usado só pra pesar o sorteio (ver
// drawSkillOptions), não trava ninguém de tirar a habilidade da outra pool.
export const SKILLS = [
  { id: 'chute_longe', label: 'Chute de Longe', icon: chuteLonge, pool: 'linha' },
  { id: 'chute_preciso', label: 'Chute Preciso', icon: chutePreciso, pool: 'linha' },
  { id: 'chute_rasteiro', label: 'Chute Rasteiro', icon: chuteRasteiro, pool: 'linha' },
  { id: 'passe_incisivo', label: 'Passe Incisivo', icon: passeIncisivo, pool: 'linha' },
  { id: 'posicionamento', label: 'Posicionamento', icon: posicionamento, pool: 'linha' },
  { id: 'rapido', label: 'Rápido', icon: rapido, pool: 'linha' },
  { id: 'veloz', label: 'Veloz', icon: veloz, pool: 'linha' },
  { id: 'tecnica', label: 'Técnica', icon: tecnica, pool: 'linha' },
  { id: 'goleiro_paredao', label: 'Goleiro Paredão', icon: goleiroParedao, pool: 'goleiro' },
  { id: 'goleiro_ponte', label: 'Goleiro Ponte', icon: goleiroPonte, pool: 'goleiro' },
  { id: 'goleiro_reposicao', label: 'Goleiro Reposição', icon: goleiroReposicao, pool: 'goleiro' },
  { id: 'goleiro_socao', label: 'Goleiro SOCÃO', icon: goleiroSocao, pool: 'goleiro' },
  { id: 'goleiro', label: 'Goleiro', icon: goleiroGenerico, pool: 'goleiro' },
]

export function getSkillById(id) {
  return SKILLS.find((skill) => skill.id === id)
}

// Chance de cada sorteio individual cair na pool "da posição" do jogador —
// goleiro puxa 80% pra pool de goleiro, e qualquer posição de linha (Fixo,
// Ala Direita, Ala Esquerda, Pivô) puxa 80% pra NÃO sair habilidade de
// goleiro (ou seja, 80% de chance de cair na pool "linha").
const OWN_POSITION_DRAW_CHANCE = 0.8

// Sorteia até 2 habilidades ainda não oferecidas pra esse jogador (excludeIds).
// Sem posição definida, o sorteio é uniforme entre todas as habilidades
// restantes, sem favorecer nenhuma pool.
export function drawSkillOptions(positionId, excludeIds = []) {
  const ownPool = getPositionById(positionId)?.skillPool ?? null
  const remaining = SKILLS.filter((skill) => !excludeIds.includes(skill.id))
  const picks = []

  while (picks.length < 2 && remaining.length > 0) {
    let candidates = remaining
    if (ownPool) {
      const ownCandidates = remaining.filter((skill) => skill.pool === ownPool)
      const otherCandidates = remaining.filter((skill) => skill.pool !== ownPool)
      const rollOwn = ownCandidates.length > 0 && Math.random() < OWN_POSITION_DRAW_CHANCE
      candidates = rollOwn ? ownCandidates : otherCandidates.length > 0 ? otherCandidates : ownCandidates
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)]
    picks.push(chosen)
    remaining.splice(remaining.indexOf(chosen), 1)
  }

  return picks
}

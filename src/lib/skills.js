import chuteLonge from '../assets/Habilidade - Chute Longe.png'
import chutePreciso from '../assets/Habilidade - Chute Preciso.png'
import chuteRasteiro from '../assets/Habilidade - Chute Rasteiro.png'
import chuteCanhao from '../assets/Habilidade - Chute Canhão.png'
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
import fixoBarreira from '../assets/Habilidade - Fixo Barreira.png'
import fixoDefensorNato from '../assets/Habilidade - Fixo Defensor Nato.png'
import fixoForca from '../assets/Habilidade - Fixo Força.png'
import fixoVisao from '../assets/Habilidade - Fixo Visão.png'
import alaTikiTaka from '../assets/Habilidade - Ala Tiki Taka.png'
import alaVeloz from '../assets/Habilidade - Ala Veloz.png'
import pivoChuteForte from '../assets/Habilidade - Pivo Chute Forte.png'
import pivoChuteRasteiro from '../assets/Habilidade - Pivo Chute Rasteiro.png'
import { getPositionById } from './positions'

// Pool de habilidades desbloqueáveis. "pool" indica de qual posição a
// habilidade é "temática" — usado só pra pesar o sorteio (ver
// drawSkillOptions), não trava ninguém de tirar a habilidade de outra pool.
// "linha" é genérica: entra no sorteio de qualquer posição que não seja
// goleiro (fixo, ala ou pivô), sem favorecer nenhuma delas.
export const SKILLS = [
  // Genéricas (qualquer jogador de linha)
  { id: 'chute_longe', label: 'Chute de Longe', icon: chuteLonge, pool: 'linha' },
  { id: 'chute_preciso', label: 'Chute Preciso', icon: chutePreciso, pool: 'linha' },
  { id: 'chute_rasteiro', label: 'Chute Rasteiro', icon: chuteRasteiro, pool: 'linha' },
  { id: 'chute_canhao', label: 'Chute Canhão', icon: chuteCanhao, pool: 'linha' },
  { id: 'passe_incisivo', label: 'Passe Incisivo', icon: passeIncisivo, pool: 'linha' },
  { id: 'posicionamento', label: 'Posicionamento', icon: posicionamento, pool: 'linha' },
  { id: 'rapido', label: 'Rápido', icon: rapido, pool: 'linha' },
  { id: 'veloz', label: 'Veloz', icon: veloz, pool: 'linha' },
  { id: 'tecnica', label: 'Técnica', icon: tecnica, pool: 'linha' },

  // Goleiro
  { id: 'goleiro_paredao', label: 'Goleiro Paredão', icon: goleiroParedao, pool: 'goleiro' },
  { id: 'goleiro_ponte', label: 'Goleiro Ponte', icon: goleiroPonte, pool: 'goleiro' },
  { id: 'goleiro_reposicao', label: 'Goleiro Reposição', icon: goleiroReposicao, pool: 'goleiro' },
  { id: 'goleiro_socao', label: 'Goleiro SOCÃO', icon: goleiroSocao, pool: 'goleiro' },
  { id: 'goleiro', label: 'Goleiro', icon: goleiroGenerico, pool: 'goleiro' },

  // Fixo
  { id: 'fixo_barreira', label: 'Fixo Barreira', icon: fixoBarreira, pool: 'fixo' },
  { id: 'fixo_defensor_nato', label: 'Fixo Defensor Nato', icon: fixoDefensorNato, pool: 'fixo' },
  { id: 'fixo_forca', label: 'Fixo Força', icon: fixoForca, pool: 'fixo' },
  { id: 'fixo_visao', label: 'Fixo Visão', icon: fixoVisao, pool: 'fixo' },

  // Ala (direita ou esquerda)
  { id: 'ala_tiki_taka', label: 'Ala Tiki-Taka', icon: alaTikiTaka, pool: 'ala' },
  { id: 'ala_veloz', label: 'Ala Veloz', icon: alaVeloz, pool: 'ala' },

  // Pivô
  { id: 'pivo_chute_forte', label: 'Pivô Chute Forte', icon: pivoChuteForte, pool: 'pivo' },
  { id: 'pivo_chute_rasteiro', label: 'Pivô Chute Rasteiro', icon: pivoChuteRasteiro, pool: 'pivo' },
]

export function getSkillById(id) {
  return SKILLS.find((skill) => skill.id === id)
}

// Chance de cada sorteio individual cair numa pool "da posição" do jogador —
// goleiro puxa 80% pra pool de goleiro; fixo/ala/pivô puxam 80% pra pool
// específica deles + a genérica "linha" (ou seja, 80% de chance de NÃO sair
// habilidade de goleiro nem de outra posição de linha).
const OWN_POSITION_DRAW_CHANCE = 0.8

// Pools que contam como "da posição" do jogador pra fins de sorteio.
function ownPoolsFor(positionId) {
  const position = getPositionById(positionId)
  if (!position) return null
  if (position.skillPool === 'goleiro') return ['goleiro']
  return [position.skillPool, 'linha']
}

// Sorteia até 2 habilidades ainda não oferecidas pra esse jogador (excludeIds).
// Sem posição definida, o sorteio é uniforme entre todas as habilidades
// restantes, sem favorecer nenhuma pool.
export function drawSkillOptions(positionId, excludeIds = []) {
  const ownPools = ownPoolsFor(positionId)
  const remaining = SKILLS.filter((skill) => !excludeIds.includes(skill.id))
  const picks = []

  while (picks.length < 2 && remaining.length > 0) {
    let candidates = remaining
    if (ownPools) {
      const ownCandidates = remaining.filter((skill) => ownPools.includes(skill.pool))
      const otherCandidates = remaining.filter((skill) => !ownPools.includes(skill.pool))
      const rollOwn = ownCandidates.length > 0 && Math.random() < OWN_POSITION_DRAW_CHANCE
      candidates = rollOwn ? ownCandidates : otherCandidates.length > 0 ? otherCandidates : ownCandidates
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)]
    picks.push(chosen)
    remaining.splice(remaining.indexOf(chosen), 1)
  }

  return picks
}

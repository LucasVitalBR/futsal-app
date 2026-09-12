import { computeOverall } from './lib/playerAttributes'
import { getRarity } from './lib/rarity'
import { getSkillById } from './lib/skills'
import { getPositionById } from './lib/positions'
import Crest from './Crest'

const STAT_ABBR = {
  pace: 'RIT',
  shooting: 'FIN',
  passing: 'PAS',
  dribbling: 'DRI',
  defending: 'DEF',
  physical: 'FIS',
}

const LEFT_STATS = ['pace', 'shooting', 'passing']
const RIGHT_STATS = ['dribbling', 'defending', 'physical']

// No máximo 4 selos de habilidade empilhados de cada lado da carta — a
// partir da 5ª habilidade equipada, começa a espelhar no lado direito, na
// mesma altura e tamanho do lado esquerdo.
const SKILLS_PER_SIDE = 4
export default function PlayerShieldCard({
  name,
  jerseyNumber,
  attributes,
  unlockedSkills = [],
  position,
  size = 'full',
  onClick,
}) {
  const overall = computeOverall(attributes)
  const isMini = size === 'mini'
  const rarity = getRarity(overall)
  const positionAbbr = getPositionById(position)?.abbr
  const equippedSkills = isMini
    ? []
    : unlockedSkills
        .map((unlock) => getSkillById(unlock.equipped))
        .filter(Boolean)
  const leftSkills = equippedSkills.slice(0, SKILLS_PER_SIDE)
  const rightSkills = equippedSkills.slice(SKILLS_PER_SIDE, SKILLS_PER_SIDE * 2)
  return (
    <div
      className={`shield-card ${isMini ? 'shield-card-mini' : ''} ${onClick ? 'is-clickable' : ''}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick()
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ '--shield-text': rarity.text, '--shield-watermark': rarity.watermark, '--shield-halo': rarity.halo }}
    >
      <img className="shield-card-bg" src={rarity.image} alt="" aria-hidden="true" />

      <span className="shield-card-overall">{overall}</span>
      <span className="shield-card-jersey">Nº {jerseyNumber ?? '-'}</span>
      {!isMini && <span className="shield-card-rarity">{rarity.name}</span>}
      {!isMini && positionAbbr && <span className="shield-card-position">{positionAbbr}</span>}

      <Crest size={isMini ? 22 : 36} className="shield-card-crest" />

      {leftSkills.length > 0 && (
        <div className="shield-card-skills shield-card-skills-left">
          {leftSkills.map((skill) => (
            <img key={skill.id} className="shield-card-skill-badge" src={skill.icon} alt={skill.label} title={skill.label} />
          ))}
        </div>
      )}

      {rightSkills.length > 0 && (
        <div className="shield-card-skills shield-card-skills-right">
          {rightSkills.map((skill) => (
            <img key={skill.id} className="shield-card-skill-badge" src={skill.icon} alt={skill.label} title={skill.label} />
          ))}
        </div>
      )}

      <span className="shield-card-name">{name}</span>

      {!isMini && (
        <div className="shield-card-stats">
          <div className="shield-card-stats-col">
            {LEFT_STATS.map((key) => (
              <div key={key}>
                <strong>{attributes?.[key] ?? 40}</strong> {STAT_ABBR[key]}
              </div>
            ))}
          </div>
          <div className="shield-card-stats-col">
            {RIGHT_STATS.map((key) => (
              <div key={key}>
                <strong>{attributes?.[key] ?? 40}</strong> {STAT_ABBR[key]}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

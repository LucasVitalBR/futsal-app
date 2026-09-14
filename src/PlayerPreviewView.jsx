import PlayerShieldCard from './PlayerShieldCard'
import { ATTRIBUTE_LABELS, ATTRIBUTE_ORDER } from './lib/playerAttributes'
import { getSkillById } from './lib/skills'
import { IconChevronLeft } from './icons'

export default function PlayerPreviewView({ player, onBack }) {
  const equippedSkills = (player.unlocked_skills ?? [])
    .map((unlock) => ({ skill: getSkillById(unlock.equipped), tierName: unlock.tierName }))
    .filter((entry) => entry.skill)

  return (
    <div className="player-preview-view">
      <button type="button" className="preview-back-button" onClick={onBack}>
        <IconChevronLeft size={18} />
        Voltar aos times
      </button>

      <p className="section-kicker">Visualizar overall</p>
      <h2 className="preview-title">{player.name}</h2>

      <PlayerShieldCard
        name={player.name}
        jerseyNumber={player.jersey_number}
        attributes={player.attributes}
        unlockedSkills={player.unlocked_skills}
        position={player.position}
        size="full"
      />

      <div className="preview-attributes">
        {ATTRIBUTE_ORDER.map((attribute) => (
          <div className="preview-attribute" key={attribute}>
            <span>{ATTRIBUTE_LABELS[attribute]}</span>
            <strong>{player.attributes?.[attribute] ?? 40}</strong>
          </div>
        ))}
      </div>

      {equippedSkills.length > 0 && (
        <div className="profile-skills">
          <p className="section-kicker">Habilidades</p>
          <ul className="profile-skills-list">
            {equippedSkills.map(({ skill, tierName }) => (
              <li key={skill.id} className="profile-skill-item">
                <img src={skill.icon} alt="" />
                <div>
                  <strong>{skill.label}</strong>
                  <span>{tierName}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

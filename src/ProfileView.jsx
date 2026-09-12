import { supabase } from './lib/supabaseClient'
import { computeOverall } from './lib/playerAttributes'
import { getRarity } from './lib/rarity'
import { getSkillById } from './lib/skills'
import { IconCard, IconLogout, IconChevronRight } from './icons'

export default function ProfileView({ player, onNavigate }) {
  const overall = computeOverall(player.attributes)
  const tier = getRarity(overall)
  const equippedSkills = (player.unlocked_skills ?? [])
    .map((unlock) => ({ skill: getSkillById(unlock.equipped), tierName: unlock.tierName }))
    .filter((entry) => entry.skill)

  return (
    <div className="profile-view">
      <div className="profile-header">
        <div className="profile-mini-badge">
          <span className="profile-mini-jersey">{player.jersey_number ?? '-'}</span>
          <span className="profile-mini-overall">{overall}</span>
        </div>
        <div>
          <p className="profile-name">{player.name}</p>
          <p className="profile-subtitle">{tier.name}</p>
        </div>
      </div>

      <div className="profile-scoreboard">
        <div>
          <span>Pontos</span>
          <strong>{player.total_points ?? 0}</strong>
        </div>
        <div>
          <span>Overall</span>
          <strong>{overall}</strong>
        </div>
        <div>
          <span>Tier</span>
          <strong>{tier.name}</strong>
        </div>
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

      <ul className="profile-list">
        <li>
          <button className="profile-list-item" onClick={() => onNavigate('cartinha')}>
            <IconCard size={20} />
            <span>Minha cartinha</span>
            <IconChevronRight size={18} />
          </button>
        </li>
        <li>
          <button className="profile-list-item" onClick={() => supabase.auth.signOut()}>
            <IconLogout size={20} />
            <span>Sair</span>
          </button>
        </li>
      </ul>

      <p className="profile-footer">Futsal Kings</p>
    </div>
  )
}

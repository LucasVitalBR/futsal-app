import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { computeOverall } from './lib/playerAttributes'
import { getRarity } from './lib/rarity'
import { getSkillById } from './lib/skills'
import { IconCard, IconLogout, IconChevronRight } from './icons'

const PLAYER_SELECT_COLUMNS =
  'id, name, jersey_number, total_points, skill_points_available, attributes, is_admin, user_id, position, highest_tier_reached, unlocked_skills'

export default function ProfileView({ player, players = [], onNavigate, onPlayerUpdated }) {
  const overall = computeOverall(player.attributes)
  const tier = getRarity(overall)
  const equippedSkills = (player.unlocked_skills ?? [])
    .map((unlock) => ({ skill: getSkillById(unlock.equipped), tierName: unlock.tierName }))
    .filter((entry) => entry.skill)

  const [editingJersey, setEditingJersey] = useState(false)
  const [jerseyDraft, setJerseyDraft] = useState(String(player.jersey_number ?? ''))
  const [savingJersey, setSavingJersey] = useState(false)
  const [jerseyError, setJerseyError] = useState(null)

  function startEditingJersey() {
    setJerseyDraft(String(player.jersey_number ?? ''))
    setJerseyError(null)
    setEditingJersey(true)
  }

  function cancelEditingJersey() {
    setEditingJersey(false)
    setJerseyError(null)
  }

  async function handleSaveJersey(event) {
    event.preventDefault()
    setJerseyError(null)

    const trimmed = jerseyDraft.trim()
    const nextNumber = trimmed === '' ? null : Number(trimmed)

    if (trimmed !== '' && (!Number.isInteger(nextNumber) || nextNumber < 0 || nextNumber > 99)) {
      setJerseyError('Escolha um número entre 0 e 99.')
      return
    }

    if (nextNumber === (player.jersey_number ?? null)) {
      setEditingJersey(false)
      return
    }

    const takenBy = nextNumber === null ? null : players.find((p) => p.id !== player.id && p.jersey_number === nextNumber)
    if (takenBy) {
      setJerseyError(`O número ${nextNumber} já é do ${takenBy.name}.`)
      return
    }

    setSavingJersey(true)
    const { data, error } = await supabase
      .from('players')
      .update({ jersey_number: nextNumber })
      .eq('id', player.id)
      .select(PLAYER_SELECT_COLUMNS)
      .single()
    setSavingJersey(false)

    if (error) {
      setJerseyError(`Erro ao salvar: ${error.message}`)
      return
    }

    onPlayerUpdated?.(data)
    setEditingJersey(false)
  }

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

      <div className="profile-jersey-editor">
        <p className="section-kicker">Número da camisa</p>
        {editingJersey ? (
          <form className="jersey-edit-row" onSubmit={handleSaveJersey}>
            <input
              type="number"
              min="0"
              max="99"
              value={jerseyDraft}
              onChange={(e) => setJerseyDraft(e.target.value)}
              placeholder="Nº"
              autoFocus
              disabled={savingJersey}
            />
            <button type="submit" className="jersey-edit-save" disabled={savingJersey}>
              {savingJersey ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" className="jersey-edit-cancel" onClick={cancelEditingJersey} disabled={savingJersey}>
              Cancelar
            </button>
          </form>
        ) : (
          <button type="button" className="jersey-edit-trigger" onClick={startEditingJersey}>
            Nº {player.jersey_number ?? '-'} · Alterar
          </button>
        )}
        {jerseyError && <p className="status-message status-error">{jerseyError}</p>}
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

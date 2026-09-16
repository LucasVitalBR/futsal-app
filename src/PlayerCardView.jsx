import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import PlayerShieldCard from './PlayerShieldCard'
import { ATTRIBUTE_LABELS, ATTRIBUTE_ORDER, computeOverall } from './lib/playerAttributes'
import { getTierIndex, getTierByIndex, getRarity } from './lib/rarity'
import { drawSkillOptions } from './lib/skills'
import { getPositionById } from './lib/positions'
import { shareToWhatsApp } from './lib/share'
import { IconCard, IconChevronLeft, IconShare } from './icons'

const PLAYER_SELECT_COLUMNS =
  'id, name, jersey_number, total_points, skill_points_available, attributes, is_admin, user_id, position, highest_tier_reached, unlocked_skills'

export default function PlayerCardView({ player, onPlayerUpdated, onBack }) {
  const [draftAttributes, setDraftAttributes] = useState(() => ({ ...player.attributes }))
  const [draftPoints, setDraftPoints] = useState(player.skill_points_available)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  // Quando uma distribuição de pontos faz o jogador pular de tier, guardamos
  // aqui os pares de habilidade sorteados até ele escolher uma de cada — só
  // depois disso é que a gente realmente salva no banco.
  const [pendingUnlocks, setPendingUnlocks] = useState(null)
  const [chosenSkills, setChosenSkills] = useState({})

  const hasChanges = draftPoints !== player.skill_points_available
  const isChoosingSkills = pendingUnlocks !== null
  const positionLabel = getPositionById(player.position)?.label ?? 'Não definida'

  function handleShare() {
    const overall = computeOverall(draftAttributes)
    const tier = getRarity(overall)
    const lines = [
      `⚽ Minha cartinha — Futsal Kings`,
      `${player.name} · Nº ${player.jersey_number ?? '-'}`,
      `Overall ${overall} · ${tier.name}`,
      `Posição: ${positionLabel}`,
      '',
      ...ATTRIBUTE_ORDER.map((attr) => `${ATTRIBUTE_LABELS[attr]}: ${draftAttributes[attr]}`),
    ]
    shareToWhatsApp(lines.join('\n'))
  }

  function increment(attr) {
    if (isChoosingSkills || draftPoints <= 0 || draftAttributes[attr] >= 120) return
    setDraftAttributes((prev) => ({ ...prev, [attr]: prev[attr] + 1 }))
    setDraftPoints((prev) => prev - 1)
  }

  function decrement(attr) {
    if (isChoosingSkills || draftAttributes[attr] <= (player.attributes[attr] ?? 40)) return
    setDraftAttributes((prev) => ({ ...prev, [attr]: prev[attr] - 1 }))
    setDraftPoints((prev) => prev + 1)
  }

  async function persistChanges({ unlockedSkillsToAdd = [], highestTierReached } = {}) {
    setSaving(true)
    setStatus(null)

    const payload = {
      attributes: draftAttributes,
      skill_points_available: draftPoints,
    }
    if (unlockedSkillsToAdd.length > 0) {
      payload.unlocked_skills = [...(player.unlocked_skills ?? []), ...unlockedSkillsToAdd]
      payload.highest_tier_reached = highestTierReached
    }

    const { data, error } = await supabase
      .from('players')
      .update(payload)
      .eq('id', player.id)
      .select(PLAYER_SELECT_COLUMNS)
      .single()

    if (error) {
      setStatus({ type: 'error', message: `Erro ao salvar: ${error.message}` })
    } else {
      onPlayerUpdated(data)
      setPendingUnlocks(null)
      setChosenSkills({})
      setStatus({
        type: 'success',
        message: unlockedSkillsToAdd.length > 0 ? 'Cartinha atualizada! Nova habilidade equipada.' : 'Cartinha atualizada!',
      })
    }
    setSaving(false)
  }

  function handleSave() {
    setStatus(null)

    const currentTierIndex = player.highest_tier_reached ?? 0
    const nextTierIndex = getTierIndex(computeOverall(draftAttributes))

    if (nextTierIndex > currentTierIndex) {
      // Sortear os pares de habilidade de cada tier pulado, sem repetir
      // nenhuma habilidade que esse jogador já tenha visto antes.
      const alreadyOfferedIds = (player.unlocked_skills ?? []).flatMap((unlock) => unlock.options ?? [])
      const usedInThisBatch = []
      const unlocks = []
      for (let tierIndex = currentTierIndex + 1; tierIndex <= nextTierIndex; tierIndex++) {
        const options = drawSkillOptions(player.position, [...alreadyOfferedIds, ...usedInThisBatch])
        options.forEach((skill) => usedInThisBatch.push(skill.id))
        unlocks.push({ tierIndex, tierName: getTierByIndex(tierIndex).name, options })
      }
      setPendingUnlocks(unlocks)
      setChosenSkills({})
      return
    }

    persistChanges()
  }

  function handleConfirmUnlocksAndSave() {
    if (!pendingUnlocks || pendingUnlocks.some((unlock) => !chosenSkills[unlock.tierIndex])) return

    const unlockedSkillsToAdd = pendingUnlocks.map((unlock) => ({
      tier: unlock.tierIndex,
      tierName: unlock.tierName,
      options: unlock.options.map((skill) => skill.id),
      equipped: chosenSkills[unlock.tierIndex],
    }))

    persistChanges({
      unlockedSkillsToAdd,
      highestTierReached: pendingUnlocks[pendingUnlocks.length - 1].tierIndex,
    })
  }

  return (
    <div className="card-view">
      <div className="card-view-topbar">
        {onBack && (
          <button type="button" className="card-back-button" onClick={onBack} aria-label="Voltar ao perfil">
            <IconChevronLeft size={20} />
          </button>
        )}
        <IconCard size={18} />
        <span>Cartinha</span>
        <button
          type="button"
          className="share-button card-share-button"
          onClick={handleShare}
          aria-label="Compartilhar cartinha no WhatsApp"
          title="Compartilhar cartinha no WhatsApp"
        >
          <IconShare size={17} />
        </button>
      </div>

      <PlayerShieldCard
        name={player.name}
        jerseyNumber={player.jersey_number}
        attributes={draftAttributes}
        unlockedSkills={player.unlocked_skills}
        position={player.position}
        size="full"
      />

      <div className="position-picker">
        <span className="position-picker-label">Posição</span>
        <p className="position-display">{positionLabel}</p>
      </div>

      <div className="attribute-list">
        {ATTRIBUTE_ORDER.map((attr) => (
          <div className="attribute-row" key={attr}>
            <span className="attribute-label">{ATTRIBUTE_LABELS[attr]}</span>
            <div className="attribute-bar-track">
              <div className="attribute-bar-fill" style={{ width: `${Math.min(100, (draftAttributes[attr] / 120) * 100)}%` }} />
            </div>
            <span className="attribute-value">{draftAttributes[attr]}</span>
            <div className="attribute-controls">
              <button
                type="button"
                className="attribute-decrement"
                onClick={() => decrement(attr)}
                disabled={isChoosingSkills || draftAttributes[attr] <= (player.attributes[attr] ?? 40)}
                aria-label={`Diminuir ${ATTRIBUTE_LABELS[attr]}`}
              >
                −
              </button>
              <button
                type="button"
                className="attribute-increment"
                onClick={() => increment(attr)}
                disabled={isChoosingSkills || draftPoints <= 0 || draftAttributes[attr] >= 120}
                aria-label={`Aumentar ${ATTRIBUTE_LABELS[attr]}`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="points-available">
        Pontos disponíveis pra distribuir: <strong>{draftPoints}</strong>
      </p>

      {isChoosingSkills ? (
        <div className="skill-unlock-panel">
          <p className="section-kicker">Você subiu de tier!</p>
          {pendingUnlocks.map((unlock) => (
            <div className="skill-unlock-row" key={unlock.tierIndex}>
              <h3>Escolha sua habilidade de {unlock.tierName}</h3>
              <div className="skill-unlock-options">
                {unlock.options.map((skill) => (
                  <button
                    type="button"
                    key={skill.id}
                    className={`skill-option ${chosenSkills[unlock.tierIndex] === skill.id ? 'is-selected' : ''}`}
                    onClick={() => setChosenSkills((prev) => ({ ...prev, [unlock.tierIndex]: skill.id }))}
                  >
                    <img src={skill.icon} alt="" />
                    <span>{skill.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="skill-unlock-warning">Atenção: a escolha é definitiva, não dá pra trocar depois.</p>

          {status && <p className={`status-message status-${status.type}`}>{status.message}</p>}

          <button
            type="button"
            className="save-button"
            onClick={handleConfirmUnlocksAndSave}
            disabled={saving || pendingUnlocks.some((unlock) => !chosenSkills[unlock.tierIndex])}
          >
            {saving ? 'Salvando…' : 'Confirmar habilidades e salvar'}
          </button>
        </div>
      ) : (
        <>
          {status && <p className={`status-message status-${status.type}`}>{status.message}</p>}

          <button className="save-button" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? 'Salvando…' : 'Salvar distribuição'}
          </button>
        </>
      )}
    </div>
  )
}

import PlayerShieldCard from './PlayerShieldCard'
import { computeOverall } from './lib/playerAttributes'
import { IconShirt, IconShuffle } from './icons'

// Linhas de baixo (defesa) pra cima (ataque), por tamanho de time.
// Como não guardamos a posição de cada jogador, isso é só uma organização
// visual — não indica quem realmente joga de goleiro, fixo, ala etc.
const ROW_LAYOUTS = {
  3: [1, 2],
  4: [1, 1, 2],
  5: [1, 2, 2],
  6: [1, 2, 3],
}

function averageOverall(ids, players) {
  if (ids.length === 0) return 0
  const total = ids.reduce((sum, id) => {
    const player = players.find((p) => p.id === id)
    return sum + (player ? computeOverall(player.attributes) : 0)
  }, 0)
  return Math.round(total / ids.length)
}

export default function TeamFormation({ label, variant, ids, players, onPlayerSelect, onMixLineup }) {
  const rows = ROW_LAYOUTS[ids.length] ?? [ids.length]
  let cursor = 0
  const rowChunks = rows.map((count) => {
    const chunk = ids.slice(cursor, cursor + count)
    cursor += count
    return chunk
  })

  return (
    <div className={`pitch-panel pitch-panel-${variant}`}>
      <div className="team-panel-header">
        <span className="team-panel-title">
          {onMixLineup && (
            <button
              type="button"
              className="team-mix-button"
              onClick={onMixLineup}
              aria-label={`Misturar titulares e reservas do ${label}`}
              title={`Misturar titulares e reservas do ${label}`}
            >
              <IconShuffle size={15} />
            </button>
          )}
          <IconShirt size={16} className="team-panel-shirt" />
          {label}
        </span>
        <span className="team-panel-ovr">OVR médio {averageOverall(ids, players)}</span>
      </div>

      <div className="pitch">
        {[...rowChunks].reverse().map((chunk, i) => (
          <div className={`pitch-row pitch-row-${i}`} key={i}>
            {chunk.map((id) => {
              const player = players.find((p) => p.id === id)
              return (
                <PlayerShieldCard
                  key={id}
                  name={player?.name ?? '—'}
                  jerseyNumber={player?.jersey_number}
                  attributes={player?.attributes}
                  size="mini"
                  onClick={player ? () => onPlayerSelect?.(player) : undefined}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

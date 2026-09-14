import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient'
import { computeOverall } from './lib/playerAttributes'
import { getRarity } from './lib/rarity'
import { getAttendanceBalance, getAttendanceTier } from './lib/attendanceTier'
import Hero from './Hero'
import { IconUsers } from './icons'

export default function PlayersView({ players, setPlayers, isAdmin }) {
  const [name, setName] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)
  const [attendanceStats, setAttendanceStats] = useState({})

  useEffect(() => {
    async function loadAttendanceStats() {
      if (!isSupabaseConfigured) return

      const { data, error } = await supabase.from('attendances').select('player_id, present')
      if (error) return

      const stats = data.reduce((result, row) => {
        const current = result[row.player_id] ?? { present: 0, total: 0 }
        result[row.player_id] = {
          present: current.present + (row.present ? 1 : 0),
          total: current.total + 1,
        }
        return result
      }, {})
      setAttendanceStats(stats)
    }

    loadAttendanceStats()
  }, [players.length])

  async function handleAddPlayer(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setStatus({ type: 'error', message: 'Digite o nome do jogador.' })
      return
    }

    setSubmitting(true)
    setStatus(null)

    const jerseyNumberValue = jerseyNumber.trim() === '' ? null : Number(jerseyNumber)

    if (!isSupabaseConfigured) {
      // Modo de teste: adiciona só na memória, não persiste entre recarregamentos.
      const newPlayer = {
        id: `mock-${Date.now()}`,
        name: trimmedName,
        jersey_number: jerseyNumberValue,
        total_points: 0,
      }
      setPlayers((prev) => [...prev, newPlayer].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setJerseyNumber('')
      setStatus({ type: 'success', message: `${trimmedName} adicionado (modo de teste, não salvo).` })
      setSubmitting(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('players')
        .insert({ name: trimmedName, jersey_number: jerseyNumberValue })
        .select('id, name, jersey_number, total_points')
        .single()

      if (error) throw error

      setPlayers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setJerseyNumber('')
      setStatus({ type: 'success', message: `${trimmedName} cadastrado no time.` })
    } catch (error) {
      setStatus({ type: 'error', message: `Erro ao cadastrar: ${error.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemovePlayer(player) {
    const confirmed = window.confirm(`Remover ${player.name} do time? Isso apaga o histórico de presença dele também.`)
    if (!confirmed) return

    if (!isSupabaseConfigured) {
      setPlayers((prev) => prev.filter((p) => p.id !== player.id))
      return
    }

    const { error } = await supabase.from('players').delete().eq('id', player.id)
    if (error) {
      setStatus({ type: 'error', message: `Erro ao remover: ${error.message}` })
      return
    }
    setPlayers((prev) => prev.filter((p) => p.id !== player.id))
  }

  const rankedPlayers = [...players].sort(
    (first, second) =>
      getAttendanceBalance(
        attendanceStats[second.id]?.present ?? 0,
        attendanceStats[second.id]?.total ?? 0,
      ) -
        getAttendanceBalance(attendanceStats[first.id]?.present ?? 0, attendanceStats[first.id]?.total ?? 0) ||
      (second.total_points ?? 0) - (first.total_points ?? 0) ||
      first.name.localeCompare(second.name),
  )

  return (
    <>
      <Hero />
      <div className="players-view">
        <div className="section-header-row">
          <div className="section-header-left">
            <span className="section-icon">
              <IconUsers size={22} />
            </span>
            <div>
              <h2 className="section-title">Elenco</h2>
              <p className="section-subtitle">{players.length} jogadores cadastrados</p>
            </div>
          </div>
        </div>

        {isAdmin ? (
        <form className="player-form" onSubmit={handleAddPlayer}>
          <div className="form-row">
            <label htmlFor="player-name">Nome</label>
            <input
              id="player-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do jogador"
              disabled={submitting}
            />
          </div>
          <div className="form-row form-row-narrow">
            <label htmlFor="player-jersey">Camisa</label>
            <input
              id="player-jersey"
              type="number"
              min="0"
              max="99"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
              placeholder="Nº"
              disabled={submitting}
            />
          </div>
          <button type="submit" className="add-button" disabled={submitting}>
            {submitting ? 'Cadastrando…' : 'Cadastrar jogador'}
          </button>
        </form>
      ) : null}

      {status && <p className={`status-message status-${status.type}`}>{status.message}</p>}

      <ul className="roster-list">
        {rankedPlayers.map((player, index) => {
          const tier = getRarity(computeOverall(player.attributes))
          const attendance = attendanceStats[player.id] ?? { present: 0, total: 0 }
          const attendanceTier = getAttendanceTier(
            attendance.present,
            attendance.total,
            player.total_points ?? 0,
          )
          return (
            <li key={player.id} className="roster-row roster-row-manage">
              <span className="player-rank">{index + 1}º</span>
              <span className="jersey-badge">{player.jersey_number ?? '-'}</span>
              <span className="player-name">{player.name}</span>
              <span className="player-tier" title={`Tier da carta: ${tier.name}`}>
                {attendanceTier.name}
              </span>
              <span className="player-attendance" title="Presenças registradas">
                {attendanceTier.level}/6
              </span>
              <span className="player-points" title="Pontuação acumulada">
                {player.total_points ?? 0} pts
              </span>
              {isAdmin && (
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => handleRemovePlayer(player)}
                  aria-label={`Remover ${player.name}`}
                >
                  Remover
                </button>
              )}
            </li>
          )
        })}
        {players.length === 0 && <p className="roster-empty">Nenhum jogador cadastrado ainda.</p>}
      </ul>
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { todayISODate, formatTime } from './lib/matchDate'
import { MIN_TEAM_SIZE } from './lib/teamDraw'
import TeamFormation from './TeamFormation'
import { IconShuffle, IconTrash } from './icons'
import PlayerPreviewView from './PlayerPreviewView'

const DEFAULT_TEAM_SIZE = 5

export default function SorteioView({ players }) {
  const [confirmedIds, setConfirmedIds] = useState([])
  const [matchId, setMatchId] = useState(null)
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const matchDate = todayISODate()

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('id')
        .eq('match_date', matchDate)
        .maybeSingle()

      if (matchError) {
        setStatus({ type: 'error', message: `Erro ao carregar: ${matchError.message}` })
        setLoading(false)
        return
      }

      if (!match) {
        setMatchId(null)
        setConfirmedIds([])
        setDraws([])
        setLoading(false)
        return
      }

      setMatchId(match.id)

      const [{ data: attendances, error: attendanceError }, { data: drawRows, error: drawError }] =
        await Promise.all([
          supabase.from('attendances').select('player_id').eq('match_id', match.id).eq('present', true),
          supabase
            .from('team_draws')
            .select('id, teams, created_at')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false }),
        ])

      if (attendanceError) {
        setStatus({ type: 'error', message: `Erro ao carregar presenças: ${attendanceError.message}` })
      } else {
        setConfirmedIds(attendances.map((row) => row.player_id))
      }

      if (drawError) {
        setStatus({ type: 'error', message: `Erro ao carregar sorteios: ${drawError.message}` })
      } else {
        setDraws(drawRows ?? [])
      }

      setLoading(false)
    }

    load()
  }, [matchDate])

  function playerName(id) {
    return players.find((p) => p.id === id)?.name ?? '—'
  }

  function renderReserves(teams) {
    const reserveA = teams.reserveA ?? teams.reserve ?? []
    const reserveB = teams.reserveB ?? []
    if (reserveA.length === 0 && reserveB.length === 0) return null

    return (
      <div className="reserves-panel">
        <p className="reserves-title">Reservas</p>
        <div className="reserves-columns">
          <div>
            <strong>Time A</strong>
            <ul className="reserves-list">
              {reserveA.map((id) => <li key={id}>{playerName(id)}</li>)}
            </ul>
          </div>
          <div>
            <strong>Time B</strong>
            <ul className="reserves-list">
              {reserveB.map((id) => <li key={id}>{playerName(id)}</li>)}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  const canDraw = confirmedIds.length >= MIN_TEAM_SIZE * 2 && matchId
  const playersPerTeam = Math.min(DEFAULT_TEAM_SIZE, Math.floor(confirmedIds.length / 2))
  const drawPlayerCount = playersPerTeam * 2
  const reserveCount = Math.max(0, confirmedIds.length - drawPlayerCount)

  const [currentDraw, ...previousDraws] = draws

  async function handleDeleteHistory() {
    if (previousDraws.length === 0) return
    if (!window.confirm('Apagar o histórico de sorteios anteriores de hoje?')) return

    setStatus(null)
    const { error } = await supabase
      .from('team_draws')
      .delete()
      .in('id', previousDraws.map((draw) => draw.id))

    if (error) {
      setStatus({ type: 'error', message: `Erro ao apagar histórico: ${error.message}` })
      return
    }

    setDraws(currentDraw ? [currentDraw] : [])
    setStatus({ type: 'success', message: 'Histórico de sorteios apagado.' })
  }

  return (
    <div className="sorteio-view">
      <div className="brand-row">
        <IconShuffle size={26} />
        <span className="brand-name">Escalações de hoje</span>
      </div>

      {loading ? (
        <p className="roster-empty">Carregando…</p>
      ) : selectedPlayer ? (
        <PlayerPreviewView player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />
      ) : !matchId ? (
        <p className="roster-empty">
          Ninguém confirmou presença hoje ainda. Marque a chamada na aba "Chamada" primeiro.
        </p>
      ) : (
        <>
          <p className="confirmed-count">
            {confirmedIds.length} confirmados hoje · {drawPlayerCount} entram no sorteio
            {reserveCount > 0 && ` · ${reserveCount} na reserva`}
          </p>

          {status && <p className={`status-message status-${status.type}`}>{status.message}</p>}

          {!canDraw && confirmedIds.length < MIN_TEAM_SIZE * 2 && (
            <p className="roster-empty">
              Precisa de pelo menos {MIN_TEAM_SIZE * 2} confirmados para sortear automaticamente.
            </p>
          )}

          {!currentDraw && confirmedIds.length >= MIN_TEAM_SIZE * 2 && (
            <p className="roster-empty">O sorteio será criado ao salvar a chamada.</p>
          )}

          {currentDraw && (
            <div className="teams-result">
              <p className="draw-result-time">Sorteado às {formatTime(currentDraw.created_at)}</p>
              <TeamFormation label="Time A" variant="gold" ids={currentDraw.teams.A} players={players} onPlayerSelect={setSelectedPlayer} />
              <TeamFormation label="Time B" variant="red" ids={currentDraw.teams.B} players={players} onPlayerSelect={setSelectedPlayer} />

              {renderReserves(currentDraw.teams)}
            </div>
          )}

          {previousDraws.length > 0 && (
            <div className="draw-history">
              <div className="draw-history-header">
                <span className="draw-history-title">Sorteios anteriores de hoje ({previousDraws.length})</span>
                <button
                  type="button"
                  className="delete-history-button"
                  onClick={handleDeleteHistory}
                  aria-label="Apagar histórico de sorteios"
                  title="Apagar histórico de sorteios"
                >
                  <IconTrash size={17} />
                </button>
              </div>
              <details>
                <summary>Ver histórico</summary>
                {previousDraws.map((draw) => (
                  <div className="teams-result draw-result-past" key={draw.id}>
                    <p className="draw-result-time">Sorteado às {formatTime(draw.created_at)}</p>
                    <TeamFormation label="Time A" variant="gold" ids={draw.teams.A} players={players} onPlayerSelect={setSelectedPlayer} />
                    <TeamFormation label="Time B" variant="red" ids={draw.teams.B} players={players} onPlayerSelect={setSelectedPlayer} />
                    {renderReserves(draw.teams)}
                  </div>
                ))}
              </details>
            </div>
          )}
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { formatMatchDate, formatTime } from './lib/matchDate'
import { MIN_TEAM_SIZE, shuffleLineup } from './lib/teamDraw'
import { shareToWhatsApp } from './lib/share'
import TeamFormation from './TeamFormation'
import { IconShuffle, IconTrash, IconClock, IconShare } from './icons'
import PlayerPreviewView from './PlayerPreviewView'
import Hero from './Hero'

const DEFAULT_TEAM_SIZE = 5

export default function SorteioView({ players, isAdmin }) {
  const [confirmedIds, setConfirmedIds] = useState([])
  const [matchId, setMatchId] = useState(null)
  const [matchDate, setMatchDate] = useState(null)
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  // Não olha pra "hoje": pega sempre o sorteio mais recente que já
  // aconteceu (de qualquer sábado) e mantém ele fixo na tela a semana
  // inteira, até rolar um sorteio novo.
  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: latestDraw, error: latestDrawError } = await supabase
        .from('team_draws')
        .select('match_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestDrawError) {
        setStatus({ type: 'error', message: `Erro ao carregar: ${latestDrawError.message}` })
        setLoading(false)
        return
      }

      if (!latestDraw) {
        setMatchId(null)
        setMatchDate(null)
        setConfirmedIds([])
        setDraws([])
        setLoading(false)
        return
      }

      const currentMatchId = latestDraw.match_id
      setMatchId(currentMatchId)

      const [{ data: match }, { data: attendances, error: attendanceError }, { data: drawRows, error: drawError }] =
        await Promise.all([
          supabase.from('matches').select('match_date').eq('id', currentMatchId).maybeSingle(),
          supabase.from('attendances').select('player_id').eq('match_id', currentMatchId).eq('present', true),
          supabase
            .from('team_draws')
            .select('id, teams, created_at')
            .eq('match_id', currentMatchId)
            .order('created_at', { ascending: false }),
        ])

      setMatchDate(match?.match_date ?? null)

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
  }, [])

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
            <strong>Time Laranja</strong>
            <ul className="reserves-list">
              {reserveA.map((id) => <li key={id}>{playerName(id)}</li>)}
            </ul>
          </div>
          <div>
            <strong>Time Verde</strong>
            <ul className="reserves-list">
              {reserveB.map((id) => <li key={id}>{playerName(id)}</li>)}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  const playersPerTeam = Math.min(DEFAULT_TEAM_SIZE, Math.floor(confirmedIds.length / 2))
  const drawPlayerCount = playersPerTeam * 2
  const reserveCount = Math.max(0, confirmedIds.length - drawPlayerCount)

  const [currentDraw, ...previousDraws] = draws

  async function handleDeleteHistory() {
    if (previousDraws.length === 0) return
    if (!window.confirm('Apagar o histórico de sorteios anteriores desse dia?')) return

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

  async function handleMixLineup(side) {
    if (!isAdmin || !currentDraw) return

    const nextTeams = shuffleLineup(currentDraw.teams, side)
    const { error } = await supabase.from('team_draws').update({ teams: nextTeams }).eq('id', currentDraw.id)

    if (error) {
      setStatus({ type: 'error', message: `Erro ao misturar: ${error.message}` })
      return
    }

    setDraws((previous) =>
      previous.map((draw) => (draw.id === currentDraw.id ? { ...draw, teams: nextTeams } : draw)),
    )
  }

  function handleShare() {
    if (!currentDraw) return

    const reserveA = currentDraw.teams.reserveA ?? currentDraw.teams.reserve ?? []
    const reserveB = currentDraw.teams.reserveB ?? []

    const lines = [
      `⚽ Escalação${matchDate ? ` — ${formatMatchDate(matchDate)}` : ''}`,
      '',
      `🟠 Time Laranja`,
      ...currentDraw.teams.A.map((id) => `- ${playerName(id)}`),
    ]
    if (reserveA.length > 0) {
      lines.push('Reservas:', ...reserveA.map((id) => `- ${playerName(id)}`))
    }
    lines.push('', `🟢 Time Verde`, ...currentDraw.teams.B.map((id) => `- ${playerName(id)}`))
    if (reserveB.length > 0) {
      lines.push('Reservas:', ...reserveB.map((id) => `- ${playerName(id)}`))
    }

    shareToWhatsApp(lines.join('\n'))
  }

  return (
    <>
      <Hero />
      <div className="sorteio-view">
        <div className="section-header-row">
          <div className="section-header-left">
            <span className="section-icon">
              <IconShuffle size={22} />
            </span>
            <div>
              <h2 className="section-title">Escalações</h2>
              {matchId && !loading && !selectedPlayer && (
                <p className="section-subtitle">
                  {matchDate && `${formatMatchDate(matchDate)} · `}
                  {confirmedIds.length} confirmados · {drawPlayerCount} no sorteio
                  {reserveCount > 0 && ` · ${reserveCount} na reserva`}
                </p>
              )}
            </div>
          </div>
          {currentDraw && !selectedPlayer && (
            <div className="section-header-actions">
              <span className="section-time">
                <IconClock size={15} /> Sorteado às {formatTime(currentDraw.created_at)}
              </span>
              <button
                type="button"
                className="share-button"
                onClick={handleShare}
                aria-label="Compartilhar escalação no WhatsApp"
                title="Compartilhar escalação no WhatsApp"
              >
                <IconShare size={17} />
              </button>
            </div>
          )}
        </div>

      {loading ? (
        <p className="roster-empty">Carregando…</p>
      ) : selectedPlayer ? (
        <PlayerPreviewView player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />
      ) : !matchId ? (
        <p className="roster-empty">
          Nenhum sorteio foi feito ainda. Confirme presença de pelo menos {MIN_TEAM_SIZE * 2} jogadores na
          aba "Chamada" num sábado pra ver as escalações aqui.
        </p>
      ) : (
        <>
          {status && <p className={`status-message status-${status.type}`}>{status.message}</p>}

          {currentDraw && (
            <div className="teams-result">
              <TeamFormation
                label="Time Laranja"
                variant="orange"
                ids={currentDraw.teams.A}
                players={players}
                onPlayerSelect={setSelectedPlayer}
                onMixLineup={isAdmin ? () => handleMixLineup('A') : undefined}
              />
              <TeamFormation
                label="Time Verde"
                variant="green"
                ids={currentDraw.teams.B}
                players={players}
                onPlayerSelect={setSelectedPlayer}
                onMixLineup={isAdmin ? () => handleMixLineup('B') : undefined}
              />

              {renderReserves(currentDraw.teams)}
            </div>
          )}

          {previousDraws.length > 0 && (
            <div className="draw-history">
              <div className="draw-history-header">
                <span className="draw-history-title">Sorteios anteriores desse dia ({previousDraws.length})</span>
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
                    <TeamFormation label="Time Laranja" variant="orange" ids={draw.teams.A} players={players} onPlayerSelect={setSelectedPlayer} />
                    <TeamFormation label="Time Verde" variant="green" ids={draw.teams.B} players={players} onPlayerSelect={setSelectedPlayer} />
                    {renderReserves(draw.teams)}
                  </div>
                ))}
              </details>
            </div>
          )}
        </>
      )}
      </div>
    </>
  )
}

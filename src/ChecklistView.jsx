import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient'
import { todayISODate, formatMatchDate, upcomingSaturdays } from './lib/matchDate'
import { createTeams, MIN_TEAM_SIZE } from './lib/teamDraw'
import { getAttendanceBalance, getAttendanceTier } from './lib/attendanceTier'
import Hero from './Hero'
import { IconCalendar, IconAlertCircle, IconShieldAlert, IconClock } from './icons'

const ATTRIBUTE_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

function randomAttendanceBonus(attendanceLevel) {
  const rewardRanges = [
    [11, 13],
    [12, 15],
    [13, 17],
    [15, 19],
    [17, 21],
    [30, 30],
  ]
  const [minimumPoints, maximumPoints] = rewardRanges[Math.min(attendanceLevel, rewardRanges.length - 1)]
  return minimumPoints + Math.floor(Math.random() * (maximumPoints - minimumPoints + 1))
}

function randomAttributePenalty(attributes) {
  const availableAttributes = ATTRIBUTE_KEYS.filter((key) => (attributes?.[key] ?? 40) > 40)
  const candidates = availableAttributes.length > 0 ? availableAttributes : ATTRIBUTE_KEYS
  const attribute = candidates[Math.floor(Math.random() * candidates.length)]
  const nextAttributes = { ...attributes }
  nextAttributes[attribute] = Math.max(40, Math.min(120, (nextAttributes[attribute] ?? 40) - 5))
  return nextAttributes
}

export default function ChecklistView({ players, setPlayers, isAdmin }) {
  const [present, setPresent] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  // Um registro por data de sábado: { confirmed, time }. "time" vem do
  // banco como "HH:MM:SS" (ou null se ainda não foi definido).
  const [scheduleInfo, setScheduleInfo] = useState({})
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [attendanceStats, setAttendanceStats] = useState({})
  const [roundPoints, setRoundPoints] = useState({})
  const [hasRoundPointsColumn, setHasRoundPointsColumn] = useState(true)
  const [matchConfirmed, setMatchConfirmed] = useState(false)
  const matchDate = todayISODate()
  const saturdayDates = upcomingSaturdays(1)

  useEffect(() => {
    async function loadSchedule() {
      if (!isSupabaseConfigured) {
        setScheduleLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('matches')
        .select('match_date, game_confirmed, match_time')
        .gte('match_date', saturdayDates[0])
        .lte('match_date', saturdayDates[saturdayDates.length - 1])

      if (!error) {
        setScheduleInfo(
          data.reduce((result, match) => {
            result[match.match_date] = { confirmed: match.game_confirmed, time: match.match_time }
            return result
          }, {}),
        )
      }
      setScheduleLoading(false)
    }

    loadSchedule()
  }, [saturdayDates[0], saturdayDates[saturdayDates.length - 1]])

  useEffect(() => {
    async function loadCurrentAttendance() {
      if (!isSupabaseConfigured) return

      const { data: match } = await supabase.from('matches').select('id').eq('match_date', matchDate).maybeSingle()
      if (!match) return

      let { data, error } = await supabase
        .from('attendances')
        .select('player_id, present, points_awarded')
        .eq('match_id', match.id)

      if (error?.message?.includes('points_awarded')) {
        setHasRoundPointsColumn(false)
        const fallback = await supabase
          .from('attendances')
          .select('player_id, present')
          .eq('match_id', match.id)
        data = fallback.data
        error = fallback.error
      }

      if (error) return

      setPresent(new Set(data.filter((row) => row.present).map((row) => row.player_id)))
      setRoundPoints(
        data.reduce((result, row) => {
          result[row.player_id] = row.points_awarded ?? 0
          return result
        }, {}),
      )
    }

    loadCurrentAttendance()
  }, [matchDate])

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
  }, [])

  useEffect(() => {
    async function loadCurrentMatchStatus() {
      if (!isSupabaseConfigured) return
      const { data, error } = await supabase
        .from('matches')
        .select('game_confirmed')
        .eq('match_date', matchDate)
        .maybeSingle()
      if (!error) setMatchConfirmed(Boolean(data?.game_confirmed))
    }
    loadCurrentMatchStatus()
  }, [matchDate])

  function toggle(playerId) {
    if (!isAdmin) return

    setPresent((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
  }

  async function handleSave() {
    if (!isAdmin) {
      setStatus({ type: 'error', message: 'Somente administradores podem salvar a chamada.' })
      return
    }

    if (!isSupabaseConfigured) {
      setStatus({
        type: 'error',
        message: 'Configure as chaves do Supabase no .env para salvar a chamada de verdade (veja o README.md).',
      })
      return
    }

    // TODO: reativar essa trava depois dos testes — por enquanto deixa salvar
    // mesmo sem o admin ter confirmado o futsal do sábado.
    // if (!matchConfirmed) {
    //   setStatus({ type: 'error', message: 'O administrador precisa confirmar o futsal deste sábado antes de salvar.' })
    //   return
    // }

    setSaving(true)
    setStatus(null)

    try {
      // Garante que existe uma partida para hoje
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .upsert({ match_date: matchDate }, { onConflict: 'match_date' })
        .select('id, points_per_attendance')
        .single()

      if (matchError) throw matchError
      setScheduledMatchDates((previous) => new Set(previous).add(matchDate))

      // Descobre quem já tinha sido marcado presente nesta partida,
      // pra não pontuar duas vezes se o usuário salvar de novo.
      let { data: existing, error: existingError } = await supabase
        .from('attendances')
        .select('player_id, present, points_awarded')
        .eq('match_id', match.id)

      if (existingError?.message?.includes('points_awarded')) {
        setHasRoundPointsColumn(false)
        const fallback = await supabase
          .from('attendances')
          .select('player_id, present')
          .eq('match_id', match.id)
        existing = fallback.data
        existingError = fallback.error
      }

      if (existingError) throw existingError

      const { data: historicalAttendances, error: historicalError } = await supabase
        .from('attendances')
        .select('player_id, present')

      if (historicalError) throw historicalError

      const historicalStats = historicalAttendances.reduce((result, row) => {
        const current = result[row.player_id] ?? { present: 0, total: 0 }
        result[row.player_id] = {
          present: current.present + (row.present ? 1 : 0),
          total: current.total + 1,
        }
        return result
      }, {})

      const existingByPlayer = new Map(existing.map((row) => [row.player_id, row]))
      const newlyPresentIds = [...present].filter((id) => {
        const savedAttendance = existingByPlayer.get(id)
        return (
          savedAttendance?.present !== true ||
          savedAttendance?.points_awarded == null ||
          savedAttendance.points_awarded === 0
        )
      })
      const newlyAbsentIds = players
        .filter((player) => !present.has(player.id) && !existingByPlayer.has(player.id))
        .map((player) => player.id)
      const pointsForPlayer = {}
      for (const playerId of newlyPresentIds) {
        const player = players.find((item) => item.id === playerId)
        if (!player) continue
        const attendance = historicalStats[playerId] ?? { present: 0, total: 0 }
        const attendanceTier = getAttendanceTier(attendance.present, attendance.total)
        pointsForPlayer[playerId] = randomAttendanceBonus(attendanceTier.level)
      }

      const attendanceRows = [
        ...players
          .filter((player) => !existingByPlayer.has(player.id))
          .map((player) => ({
            match_id: match.id,
            player_id: player.id,
            present: present.has(player.id),
            points_awarded: pointsForPlayer[player.id] ?? 0,
          })),
        ...newlyPresentIds
          .filter((playerId) => existingByPlayer.get(playerId)?.present === false)
          .map((playerId) => ({
            match_id: match.id,
            player_id: playerId,
            present: true,
            points_awarded: pointsForPlayer[playerId] ?? 0,
          })),
      ]

      if (attendanceRows.length > 0) {
        let { error: attendanceError } = await supabase
          .from('attendances')
          .upsert(attendanceRows, { onConflict: 'match_id,player_id' })

        if (attendanceError?.message?.includes('points_awarded')) {
          setHasRoundPointsColumn(false)
          const legacyRows = attendanceRows.map(({ points_awarded: _pointsAwarded, ...row }) => row)
          const fallback = await supabase
            .from('attendances')
            .upsert(legacyRows, { onConflict: 'match_id,player_id' })
          attendanceError = fallback.error
        }

        if (attendanceError) throw attendanceError
      }

      const playerUpdates = new Map()
      for (const playerId of newlyPresentIds) {
        const player = players.find((item) => item.id === playerId)
        if (!player) continue

        const bonus = pointsForPlayer[playerId] ?? 0
        const update = {
          total_points: (player.total_points ?? 0) + bonus,
          skill_points_available: (player.skill_points_available ?? 0) + bonus,
        }
        const { error: pointsError } = await supabase.from('players').update(update).eq('id', playerId)
        if (pointsError) throw pointsError
        playerUpdates.set(playerId, { ...update })
      }

      for (const playerId of newlyAbsentIds) {
        const player = players.find((item) => item.id === playerId)
        if (!player) continue

        const attributes = randomAttributePenalty(player.attributes)
        const { error: attributeError } = await supabase
          .from('players')
          .update({ attributes })
          .eq('id', playerId)
        if (attributeError) throw attributeError
        playerUpdates.set(playerId, { attributes })
      }

      if (playerUpdates.size > 0) {
        setPlayers((previous) =>
          previous.map((player) =>
            playerUpdates.has(player.id) ? { ...player, ...playerUpdates.get(player.id) } : player,
          ),
        )

        setRoundPoints((previous) => ({ ...previous, ...pointsForPlayer }))
      }

      let { data: savedAttendances, error: savedAttendancesError } = await supabase
        .from('attendances')
        .select('player_id, present, points_awarded')
        .eq('match_id', match.id)
        .eq('present', true)

      if (savedAttendancesError?.message?.includes('points_awarded')) {
        setHasRoundPointsColumn(false)
        const fallback = await supabase
          .from('attendances')
          .select('player_id, present')
          .eq('match_id', match.id)
          .eq('present', true)
        savedAttendances = fallback.data
        savedAttendancesError = fallback.error
      }

      if (savedAttendancesError) throw savedAttendancesError

      const savedPlayerIds = savedAttendances.filter((row) => row.present).map((row) => row.player_id)
      setRoundPoints((previous) => savedAttendances.reduce((result, row) => {
        result[row.player_id] = row.points_awarded > 0
          ? row.points_awarded
          : previous[row.player_id] ?? pointsForPlayer[row.player_id] ?? 0
        return result
      }, { ...previous }))

      const { data: allAttendances, error: allAttendancesError } = await supabase
        .from('attendances')
        .select('player_id, present')
      if (allAttendancesError) throw allAttendancesError

      const stats = allAttendances.reduce((result, row) => {
        const current = result[row.player_id] ?? { present: 0, total: 0 }
        result[row.player_id] = {
          present: current.present + (row.present ? 1 : 0),
          total: current.total + 1,
        }
        return result
      }, {})
      setAttendanceStats(stats)
      let drawMessage = ''

      if (savedPlayerIds.length >= MIN_TEAM_SIZE * 2) {
        const { error: drawError } = await supabase.from('team_draws').insert({
          match_id: match.id,
          teams: createTeams(savedPlayerIds),
        })

        if (drawError) throw drawError
        drawMessage = ' Os times foram sorteados automaticamente.'
      }

      setStatus({
        type: 'success',
        message: `Chamada salva! ${savedPlayerIds.length} de ${players.length} confirmados para ${formatMatchDate(matchDate)}.${drawMessage}`,
      })
    } catch (error) {
      setStatus({ type: 'error', message: `Erro ao salvar: ${error.message}` })
    } finally {
      setSaving(false)
    }
  }

  async function toggleMatchConfirmation(date, isConfirmed) {
    if (!isAdmin) return
    const nextConfirmed = !isConfirmed
    const { error } = await supabase
      .from('matches')
      .upsert({ match_date: date, game_confirmed: nextConfirmed }, { onConflict: 'match_date' })
    if (error) {
      setStatus({ type: 'error', message: `Erro ao atualizar confirmação: ${error.message}` })
      return
    }
    if (date === matchDate) setMatchConfirmed(nextConfirmed)
    setScheduleInfo((previous) => ({
      ...previous,
      [date]: { ...previous[date], confirmed: nextConfirmed },
    }))
    setStatus({
      type: 'success',
      message: nextConfirmed
        ? `Futsal confirmado para ${formatMatchDate(date)}.`
        : `Futsal cancelado para ${formatMatchDate(date)}.`,
    })
  }

  async function handleTimeChange(date, value) {
    if (!isAdmin) return
    const nextTime = value === '' ? null : value

    // Atualização otimista, pra não travar o input enquanto salva.
    setScheduleInfo((previous) => ({
      ...previous,
      [date]: { ...previous[date], time: nextTime },
    }))

    const { error } = await supabase
      .from('matches')
      .upsert({ match_date: date, match_time: nextTime }, { onConflict: 'match_date' })

    if (error) {
      setStatus({ type: 'error', message: `Erro ao salvar horário: ${error.message}` })
    }
  }

  const orderedPlayers = [...players].sort((first, second) => {
    const firstStats = attendanceStats[first.id] ?? { present: 0, total: 0 }
    const secondStats = attendanceStats[second.id] ?? { present: 0, total: 0 }
    const firstBalance = getAttendanceBalance(firstStats.present, firstStats.total)
    const secondBalance = getAttendanceBalance(secondStats.present, secondStats.total)
    return (
      secondBalance - firstBalance ||
      (second.total_points ?? 0) - (first.total_points ?? 0) ||
      first.name.localeCompare(second.name)
    )
  })

  return (
    <>
      <Hero />

      <header className="agenda-header">
        <span className="agenda-header-icon">
          <IconCalendar size={24} />
        </span>
        <div>
          <p className="section-kicker">Agenda do time</p>
          <h1>{formatMatchDate(matchDate)}</h1>
          <p className="matchday-count">
            {present.size} de {players.length} confirmados
          </p>
        </div>
      </header>

      <section className="match-calendar" aria-labelledby="match-calendar-title">
        <div className="match-calendar-heading">
          <h2 id="match-calendar-title">Próximo sábado</h2>
          <span className="match-calendar-legend">Status da partida</span>
        </div>

        <div className="match-calendar-list">
          {saturdayDates.map((date, index) => {
            const isCurrent = index === 0
            const isConfirmed = scheduleInfo[date]?.confirmed ?? false
            const time = scheduleInfo[date]?.time ?? ''
            return (
              <div className={`match-calendar-row ${isCurrent ? 'is-current' : ''}`} key={date}>
                <span className="match-calendar-row-icon">
                  <IconCalendar size={18} />
                </span>
                <div className="match-calendar-date">
                  <strong>{formatMatchDate(date)}</strong>
                  {isCurrent && <span>Este sábado</span>}
                  {isAdmin ? (
                    <label className="match-time-field">
                      <IconClock size={13} />
                      <input
                        type="time"
                        className="match-time-input"
                        value={time.slice(0, 5)}
                        onChange={(e) => handleTimeChange(date, e.target.value)}
                        disabled={scheduleLoading}
                        aria-label={`Horário do futsal de ${formatMatchDate(date)}`}
                      />
                    </label>
                  ) : time ? (
                    <span className="match-time-display">
                      <IconClock size={13} /> {time.slice(0, 5)}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`match-status-toggle ${isConfirmed ? 'is-on' : 'is-off'}`}
                  onClick={() => toggleMatchConfirmation(date, isConfirmed)}
                  disabled={!isAdmin || scheduleLoading}
                  aria-label={scheduleLoading ? 'Consultando…' : isConfirmed ? 'Futsal confirmado' : 'Futsal ainda não confirmado'}
                  title={scheduleLoading ? 'Consultando…' : isConfirmed ? 'Futsal confirmado' : 'Futsal ainda não confirmado'}
                >
                  <span className="match-status-knob" aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <main className="roster">
        {!isAdmin && (
          <p className="attendance-admin-notice">
            <IconAlertCircle size={20} />
            <span>A chamada só pode ser alterada e salva por um administrador.</span>
          </p>
        )}
        {players.length === 0 ? (
          <p className="roster-empty">Nenhum jogador cadastrado ainda. Vá na aba "Elenco" pra cadastrar.</p>
        ) : (
          <ul className="roster-list">
            {orderedPlayers.map((player) => {
              const isPresent = present.has(player.id)
              return (
                <li
                  key={player.id}
                  className={`roster-row ${isPresent ? 'is-present' : ''} ${!isAdmin ? 'is-read-only' : ''}`}
                  onClick={() => toggle(player.id)}
                >
                  <span className="jersey-badge">{player.jersey_number ?? '-'}</span>
                  <span className="player-name">{player.name}</span>
                  {isPresent && <span className="round-points">+{roundPoints[player.id] ?? 0} pts</span>}
                  <span className="checkin-stamp" aria-hidden="true">
                    {isPresent ? '✓' : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {isAdmin && (
        <footer className="save-bar">
          {status && (
            <p className={`status-message status-${status.type}`}>
              {status.type === 'error' && <IconShieldAlert size={18} />}
              <span>{status.message}</span>
            </p>
          )}
          <button onClick={handleSave} disabled={saving || players.length === 0} className="save-button">
            {saving ? 'Salvando…' : 'Salvar presença de hoje'}
          </button>
        </footer>
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient'
import { MOCK_PLAYERS } from './lib/mockPlayers'
import ChecklistView from './ChecklistView'
import PlayersView from './PlayersView'
import PlayerCardView from './PlayerCardView'
import ProfileView from './ProfileView'
import SorteioView from './SorteioView'
import AuthView from './AuthView'
import BottomNav from './BottomNav'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [tab, setTab] = useState('chamada')

  // Sessão de login (só existe de verdade com o Supabase configurado)
  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Lista de jogadores (recarrega quando a sessão muda, pra pegar a
  // cartinha recém-criada de quem acabou de se cadastrar)
  useEffect(() => {
    async function loadPlayers() {
      if (!isSupabaseConfigured) {
        setPlayers(MOCK_PLAYERS)
        setLoading(false)
        return
      }

      if (!session) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('players')
        .select(
          'id, name, jersey_number, total_points, skill_points_available, attributes, is_admin, user_id, position, highest_tier_reached, unlocked_skills',
        )
        .order('name', { ascending: true })

      if (error) {
        setLoadError('Não deu pra carregar os jogadores. Tente recarregar a página.')
      } else {
        setPlayers(data)
      }
      setLoading(false)
    }

    loadPlayers()
  }, [session])

  function handlePlayerUpdated(updatedPlayer) {
    setPlayers((prev) => prev.map((p) => (p.id === updatedPlayer.id ? { ...p, ...updatedPlayer } : p)))
  }

  if (sessionLoading) {
    return <div className="pitch-bg" />
  }

  if (isSupabaseConfigured && !session) {
    return (
      <div className="pitch-bg">
        <AuthView />
      </div>
    )
  }

  const currentPlayer = isSupabaseConfigured
    ? players.find((p) => p.user_id === session.user.id)
    : null
  const isAdmin = !isSupabaseConfigured || Boolean(currentPlayer?.is_admin)

  return (
    <div className="pitch-bg">
      {!isSupabaseConfigured && (
        <p className="offline-banner">
          Modo de teste — dados de exemplo, nada é salvo de verdade. Configure o Supabase no .env (veja o README.md).
        </p>
      )}

      <div className="app-content">
        {loading ? (
          <p className="roster-empty">Carregando elenco…</p>
        ) : loadError ? (
          <p className="roster-empty status-error">{loadError}</p>
        ) : tab === 'chamada' ? (
          <ChecklistView players={players} setPlayers={setPlayers} isAdmin={isAdmin} />
        ) : tab === 'elenco' ? (
          <PlayersView players={players} setPlayers={setPlayers} isAdmin={isAdmin} />
        ) : tab === 'sorteio' ? (
          <SorteioView players={players} />
        ) : tab === 'cartinha' ? (
          currentPlayer ? (
            <PlayerCardView player={currentPlayer} onPlayerUpdated={handlePlayerUpdated} />
          ) : (
            <p className="roster-empty">Sua cartinha ainda está sendo criada, recarregue a página em instantes.</p>
          )
        ) : tab === 'perfil' && currentPlayer ? (
          <ProfileView player={currentPlayer} onNavigate={setTab} />
        ) : null}
      </div>

      <BottomNav tab={tab} setTab={setTab} isSupabaseConfigured={isSupabaseConfigured} />
    </div>
  )
}

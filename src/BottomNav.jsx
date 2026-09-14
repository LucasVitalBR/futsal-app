import iconChamada from './assets/nav-chamada.png'
import iconElenco from './assets/nav-elenco.png'
import iconEscalacoes from './assets/nav-escalacoes.png'
import iconCartinha from './assets/nav-cartinha.png'
import iconPerfil from './assets/nav-perfil.png'

const TABS = [
  { key: 'chamada', label: 'Chamada', icon: iconChamada, requiresAuth: false },
  { key: 'elenco', label: 'Elenco', icon: iconElenco, requiresAuth: false },
  { key: 'sorteio', label: 'Escalações', icon: iconEscalacoes, requiresAuth: false },
  { key: 'cartinha', label: 'Cartinha', icon: iconCartinha, requiresAuth: true },
  { key: 'perfil', label: 'Perfil', icon: iconPerfil, requiresAuth: true },
]

export default function BottomNav({ tab, setTab, isSupabaseConfigured }) {
  const visibleTabs = TABS.filter((t) => !t.requiresAuth || isSupabaseConfigured)

  return (
    <nav className="bottom-nav">
      {visibleTabs.map(({ key, label, icon }) => (
        <button
          key={key}
          className={`bottom-nav-item ${tab === key ? 'is-active' : ''}`}
          onClick={() => setTab(key)}
        >
          <img className="bottom-nav-icon" src={icon} alt="" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

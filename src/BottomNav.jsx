import { IconChecklist, IconUsers, IconCard, IconUser, IconShuffle } from './icons'

const TABS = [
  { key: 'chamada', label: 'Chamada', Icon: IconChecklist, requiresAuth: false },
  { key: 'elenco', label: 'Elenco', Icon: IconUsers, requiresAuth: false },
  { key: 'sorteio', label: 'Escalações', Icon: IconShuffle, requiresAuth: false },
  { key: 'cartinha', label: 'Cartinha', Icon: IconCard, requiresAuth: true },
  { key: 'perfil', label: 'Perfil', Icon: IconUser, requiresAuth: true },
]

export default function BottomNav({ tab, setTab, isSupabaseConfigured }) {
  const visibleTabs = TABS.filter((t) => !t.requiresAuth || isSupabaseConfigured)

  return (
    <nav className="bottom-nav">
      {visibleTabs.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={`bottom-nav-item ${tab === key ? 'is-active' : ''}`}
          onClick={() => setTab(key)}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

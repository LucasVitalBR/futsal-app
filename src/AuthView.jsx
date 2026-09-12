import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Crest from './Crest'

// Bola de futsal ilustrada — pentágono central + costuras radiais, sombreado
// com gradiente radial pra parecer uma esfera. Usada na tela de login/cadastro.
function FutsalBall({ size = 110 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className="auth-ball-svg" aria-hidden="true">
      <defs>
        <radialGradient id="ballShade" cx="35%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#efece0" />
          <stop offset="100%" stopColor="#c7c2b0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#ballShade)" stroke="#1f2430" strokeWidth="3" />
      <polygon points="100,78 120.9,93.2 112.9,117.8 87.1,117.8 79.1,93.2" fill="#1f2430" />
      <g stroke="#1f2430" strokeWidth="4" strokeLinecap="round">
        <line x1="100" y1="78" x2="100" y2="16" />
        <line x1="120.9" y1="93.2" x2="179.9" y2="74" />
        <line x1="112.9" y1="117.8" x2="149.4" y2="167.9" />
        <line x1="87.1" y1="117.8" x2="50.6" y2="167.9" />
        <line x1="79.1" y1="93.2" x2="20.1" y2="74" />
      </g>
    </svg>
  )
}

export default function AuthView() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setStatus(null)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() || 'Novo jogador' } },
        })
        if (error) throw error
        setStatus({
          type: 'success',
          message: 'Conta criada! Se o projeto exigir confirmação por e-mail, confira sua caixa de entrada antes de entrar.',
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setStatus({ type: 'error', message: translateAuthError(error.message) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <div className="auth-hero-shadow" />
        <FutsalBall size={110} />
      </div>

      <div className="auth-card">
        <div className="brand-row">
          <Crest size={28} />
          <span className="brand-name">Futsal Kings</span>
        </div>
        <h1 className="auth-title">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="form-row">
              <label htmlFor="auth-name">Seu nome</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome que vai aparecer no time"
                required
              />
            </div>
          )}
          <div className="form-row">
            <label htmlFor="auth-email">E-mail</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="auth-password">Senha</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          {status && <p className={`status-message status-${status.type}`}>{status.message}</p>}

          <button type="submit" className="save-button" disabled={submitting}>
            {submitting ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setStatus(null)
          }}
        >
          {mode === 'login' ? 'Ainda não tem conta? Criar uma' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}

function translateAuthError(message) {
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (message.includes('User already registered')) return 'Já existe uma conta com esse e-mail.'
  if (message.includes('Password should be')) return 'A senha precisa ter pelo menos 6 caracteres.'
  return message
}

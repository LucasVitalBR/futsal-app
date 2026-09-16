import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { POSITIONS } from './lib/positions'
import Hero from './Hero'

export default function AuthView() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [position, setPosition] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setStatus(null)

    try {
      if (mode === 'signup') {
        const trimmedJersey = jerseyNumber.trim()
        const jerseyNumberValue = trimmedJersey === '' ? null : Number(trimmedJersey)

        if (jerseyNumberValue !== null && (!Number.isInteger(jerseyNumberValue) || jerseyNumberValue < 0 || jerseyNumberValue > 99)) {
          setStatus({ type: 'error', message: 'Escolha um número de camisa entre 0 e 99.' })
          setSubmitting(false)
          return
        }

        if (jerseyNumberValue !== null) {
          const { data: taken } = await supabase
            .from('players')
            .select('id')
            .eq('jersey_number', jerseyNumberValue)
            .maybeSingle()
          if (taken) {
            setStatus({ type: 'error', message: `O número ${jerseyNumberValue} já está sendo usado por outro jogador. Escolha outro (dá pra trocar depois no perfil).` })
            setSubmitting(false)
            return
          }
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name.trim() || 'Novo jogador',
              jersey_number: jerseyNumberValue,
              position,
            },
          },
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
      <Hero />

      <div className="auth-center">
        <div className="auth-card">
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
            {mode === 'signup' && (
              <div className="form-row">
                <label htmlFor="auth-jersey">Número da camisa (opcional)</label>
                <input
                  id="auth-jersey"
                  type="number"
                  min="0"
                  max="99"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder="Nº — dá pra escolher depois também"
                />
              </div>
            )}
            {mode === 'signup' && (
              <div className="position-picker">
                <span className="position-picker-label">Posição (opcional)</span>
                <div className="position-picker-options">
                  {POSITIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`position-option ${position === option.id ? 'is-selected' : ''}`}
                      onClick={() => setPosition(position === option.id ? null : option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
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
    </div>
  )
}

function translateAuthError(message) {
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (message.includes('User already registered')) return 'Já existe uma conta com esse e-mail.'
  if (message.includes('Password should be')) return 'A senha precisa ter pelo menos 6 caracteres.'
  return message
}

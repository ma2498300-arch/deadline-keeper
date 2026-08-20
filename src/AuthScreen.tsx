import { FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from './supabase'

export function AuthScreen() {
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function switchMode(nextMode: 'signup' | 'login') {
    setMode(nextMode)
    setError(null)
    setMessage(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const normalizedEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return setError('Enter a valid email address.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (mode === 'signup' && password !== confirmPassword) return setError('Passwords do not match.')

    setSubmitting(true)
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email: normalizedEmail, password })
      : await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    setSubmitting(false)
    if (result.error) return setError(result.error.message.toLowerCase().includes('already registered') ? 'That email is already in use.' : result.error.message.toLowerCase().includes('invalid login credentials') ? 'Those credentials are not valid.' : result.error.message)
    if (mode === 'signup' && !result.data.session) setMessage('Account created. Check your email to confirm your account before logging in.')
  }

  return <main className="auth-shell">
    <motion.section className="auth-panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 18 }}>
      <p className="eyebrow">A little room for what matters</p>
      <h1>Deadline <em>Keeper</em></h1>
      <p className="auth-intro">Keep your projects close, with a place to land and a date to arrive by.</p>
      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button className={mode === 'signup' ? 'selected' : ''} onClick={() => switchMode('signup')} role="tab" aria-selected={mode === 'signup'}>Sign Up</button>
        <button className={mode === 'login' ? 'selected' : ''} onClick={() => switchMode('login')} role="tab" aria-selected={mode === 'login'}>Log In</button>
      </div>
      <form onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></label>
        <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>
        {mode === 'signup' && <label>Confirm password<input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></label>}
        {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
        {message && <p className="auth-feedback auth-message" role="status">{message}</p>}
        <button className="add-button auth-submit" type="submit" disabled={submitting}>{submitting ? 'Working...' : mode === 'signup' ? 'Create account' : 'Enter workspace'} <span aria-hidden="true">↗</span></button>
      </form>
    </motion.section>
  </main>
}

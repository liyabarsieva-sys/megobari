import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ROLES = [
  { value: 'client', label: 'Клиент — ищу поездку или отправляю посылку' },
  { value: 'driver', label: 'Водитель — публикую свои маршруты' },
  { value: 'both',   label: 'И то, и другое' },
]

function EyeIcon({ open }) {
  return open ? (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', role: 'client',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Передаём имя, телефон и роль в metadata — триггер создаст профиль автоматически
    const { error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name:  form.name,
          phone: form.phone,
          role:  form.role,
        }
      }
    })

    if (authErr) { setError(authErr.message); setLoading(false); return }

    navigate('/')
  }

  return (
    <div className="page" style={{ paddingTop: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: 'var(--brand)' }}>Megobari</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>Регистрация</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Имя</label>
            <input value={form.name} onChange={set('name')} placeholder="Как вас зовут" required />
          </div>

          <div className="field">
            <label className="label">Телефон</label>
            <input value={form.phone} onChange={set('phone')} placeholder="+995 5XX XXX XXX" required />
          </div>

          <div className="field">
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </div>

          <div className="field">
            <label className="label">Пароль</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Минимум 6 символов"
                minLength={6}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  padding: 0, display: 'flex', alignItems: 'center',
                }}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <div className="field">
            <label className="label">Я хочу</label>
            <select value={form.role} onChange={set('role')}>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            После регистрации вы сможете загрузить фото паспорта для верификации в разделе «Профиль».
          </p>

          {error && <p className="error-msg">{error}</p>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          Уже есть аккаунт? <Link to="/auth">Войти</Link>
        </p>
      </div>
    </div>
  )
}

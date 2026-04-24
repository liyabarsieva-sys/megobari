import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ROLES = [
  { value: 'client', label: 'Клиент — ищу поездку или отправляю посылку' },
  { value: 'driver', label: 'Водитель — публикую свои маршруты' },
  { value: 'both',   label: 'И то, и другое' },
]

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', role: 'client',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 1. Create auth user
    const { data, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authErr) { setError(authErr.message); setLoading(false); return }

    // 2. Create profile row in public.users
    const { error: profileErr } = await supabase.from('users').insert({
      id:    data.user.id,
      name:  form.name,
      phone: form.phone,
      role:  form.role,
    })

    if (profileErr) { setError(profileErr.message); setLoading(false); return }

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
            <input type="password" value={form.password} onChange={set('password')} placeholder="Минимум 6 символов" minLength={6} required />
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

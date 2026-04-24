import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CITIES } from '../lib/cities'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [from, setFrom]     = useState('')
  const [to, setTo]         = useState('')
  const [date, setDate]     = useState('')
  const [type, setType]     = useState('seat') // seat | parcel
  const [routes, setRoutes] = useState(null)
  const [loading, setLoading] = useState(false)

  async function search(e) {
    e.preventDefault()
    setLoading(true)

    let q = supabase
      .from('routes')
      .select(`
        *,
        driver:users!driver_id(id, name, avatar_url, rating_avg, rating_count, verified)
      `)
      .eq('status', 'active')

    if (from) q = q.eq('from_city', from)
    if (to)   q = q.eq('to_city', to)
    if (date) q = q.eq('departure_date', date)
    if (type === 'parcel') q = q.eq('accepts_parcels', true)
    else q = q.gt('seats_available', 0)

    q = q.order('departure_date').order('departure_time')

    const { data, error } = await q
    if (!error) setRoutes(data)
    setLoading(false)
  }

  const isDriver = profile?.role === 'driver' || profile?.role === 'both'

  return (
    <div className="page-wide" style={{ paddingTop: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Найти поездку</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Попутки и доставка посылок по Грузии</p>
        </div>
        {isDriver && (
          <Link to="/routes/new">
            <button className="btn-primary" style={{ width: 'auto', padding: '9px 16px', fontSize: 14 }}>
              + Новый маршрут
            </button>
          </Link>
        )}
      </div>

      {/* Search form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={search}>
          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[{ v: 'seat', l: 'Место в машине' }, { v: 'parcel', l: 'Отправить посылку' }].map(t => (
              <button
                key={t.v}
                type="button"
                onClick={() => setType(t.v)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1.5px solid',
                  borderColor: type === t.v ? 'var(--brand)' : 'var(--border)',
                  background: type === t.v ? '#E8F5E9' : 'var(--surface)',
                  color: type === t.v ? 'var(--brand-dark)' : 'var(--text-muted)',
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                {t.l}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Откуда</label>
              <select value={from} onChange={e => setFrom(e.target.value)}>
                <option value="">Любой город</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Куда</label>
              <select value={to} onChange={e => setTo(e.target.value)}>
                <option value="">Любой город</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label className="label">Дата (необязательно)</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Поиск...' : 'Найти'}
          </button>
        </form>
      </div>

      {/* Results */}
      {routes === null && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
          Введите параметры и нажмите «Найти»
        </p>
      )}

      {routes !== null && routes.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
          Маршрутов не найдено. Попробуйте другие даты.
        </p>
      )}

      {routes && routes.map(r => (
        <RouteCard key={r.id} route={r} type={type} onClick={() => navigate(`/routes/${r.id}`)} />
      ))}
    </div>
  )
}

function RouteCard({ route, type, onClick }) {
  const d = new Date(route.departure_date)
  const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })

  return (
    <div
      className="card"
      style={{ marginBottom: 12, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Route info */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 17 }}>
            {route.from_city} → {route.to_city}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 3 }}>
            {dateStr} · {route.departure_time.slice(0, 5)}
          </div>

          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {type === 'seat' && (
              <span className="badge">
                {route.seats_available} мест · {route.price_per_seat} ₾
              </span>
            )}
            {type === 'parcel' && route.accepts_parcels && (
              <span className="badge parcel">
                до {route.parcel_max_kg} кг · {route.parcel_price_per_kg} ₾/кг
              </span>
            )}
          </div>
        </div>

        {/* Driver info */}
        <div style={{ textAlign: 'right', minWidth: 80 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{route.driver?.name}</div>
          {route.driver?.rating_count > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              ★ {route.driver.rating_avg} ({route.driver.rating_count})
            </div>
          )}
          {route.driver?.verified && (
            <div style={{ fontSize: 12, color: 'var(--brand)', marginTop: 3 }}>✓ Верифицирован</div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CITIES } from '../lib/cities'

export default function NewRoute() {
  const { session } = useAuth()
  const navigate    = useNavigate()

  const [form, setForm] = useState({
    from_city: '',
    to_city: '',
    departure_date: '',
    departure_time: '',
    seats_total: 3,
    price_per_seat: '',
    accepts_parcels: false,
    parcel_max_kg: '',
    parcel_price_per_kg: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      setForm(f => ({ ...f, [field]: val }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.from_city === form.to_city) {
      setError('Откуда и куда не могут совпадать')
      return
    }

    setLoading(true)

    const payload = {
      driver_id:      session.user.id,
      from_city:      form.from_city,
      to_city:        form.to_city,
      departure_date: form.departure_date,
      departure_time: form.departure_time,
      seats_total:    Number(form.seats_total),
      seats_available: Number(form.seats_total),
      price_per_seat: Number(form.price_per_seat),
      accepts_parcels: form.accepts_parcels,
      parcel_max_kg:   form.accepts_parcels ? Number(form.parcel_max_kg) : null,
      parcel_price_per_kg: form.accepts_parcels ? Number(form.parcel_price_per_kg) : null,
    }

    const { error } = await supabase.from('routes').insert(payload)

    if (error) setError(error.message)
    else navigate('/my-routes')

    setLoading(false)
  }

  return (
    <div className="page" style={{ paddingTop: 20 }}>
      <h1 style={{ fontWeight: 600, fontSize: 20, marginBottom: 20 }}>Новый маршрут</h1>

      <div className="card">
        <form onSubmit={handleSubmit}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Откуда</label>
              <select value={form.from_city} onChange={set('from_city')} required>
                <option value="">Выберите</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Куда</label>
              <select value={form.to_city} onChange={set('to_city')} required>
                <option value="">Выберите</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Дата</label>
              <input type="date" value={form.departure_date} onChange={set('departure_date')} required />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Время</label>
              <input type="time" value={form.departure_time} onChange={set('departure_time')} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Свободных мест</label>
              <select value={form.seats_total} onChange={set('seats_total')}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Цена за место (₾)</label>
              <input
                type="number"
                value={form.price_per_seat}
                onChange={set('price_per_seat')}
                placeholder="0"
                min="0"
                required
              />
            </div>
          </div>

          {/* Parcels */}
          <div style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 10,
            border: '1.5px solid var(--border)',
            background: form.accepts_parcels ? '#F0FBF4' : 'transparent',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.accepts_parcels}
                onChange={set('accepts_parcels')}
                style={{ width: 18, height: 18, accentColor: 'var(--brand)' }}
              />
              <span style={{ fontWeight: 500 }}>Беру посылки</span>
            </label>

            {form.accepts_parcels && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                <div>
                  <label className="label">Макс. вес (кг)</label>
                  <input
                    type="number"
                    value={form.parcel_max_kg}
                    onChange={set('parcel_max_kg')}
                    placeholder="10"
                    min="0.1"
                    step="any"
                    required={form.accepts_parcels}
                  />
                </div>
                <div>
                  <label className="label">Цена за кг (₾)</label>
                  <input
                    type="number"
                    value={form.parcel_price_per_kg}
                    onChange={set('parcel_price_per_kg')}
                    placeholder="2"
                    min="0"
                    step="any"
                    required={form.accepts_parcels}
                  />
                </div>
              </div>
            )}
          </div>

          {error && <p className="error-msg" style={{ marginTop: 12 }}>{error}</p>}

          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 20 }}>
            {loading ? 'Публикация...' : 'Опубликовать маршрут'}
          </button>
        </form>
      </div>
    </div>
  )
}

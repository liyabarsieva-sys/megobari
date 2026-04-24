import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function RouteDetail() {
  const { id }     = useParams()
  const { session, profile } = useAuth()
  const navigate   = useNavigate()

  const [route, setRoute]   = useState(null)
  const [loading, setLoading] = useState(true)

  // Booking form
  const [type, setType]         = useState('seat')
  const [seats, setSeats]       = useState(1)
  const [parcelDesc, setParcelDesc] = useState('')
  const [parcelKg, setParcelKg] = useState('')
  const [bookLoading, setBookLoading] = useState(false)
  const [bookError, setBookError] = useState('')
  const [bookSuccess, setBookSuccess] = useState(false)

  useEffect(() => {
    supabase
      .from('routes')
      .select(`*, driver:users!driver_id(id, name, rating_avg, rating_count, phone, verified)`)
      .eq('id', id)
      .single()
      .then(({ data }) => { setRoute(data); setLoading(false) })
  }, [id])

  async function handleBook(e) {
    e.preventDefault()
    setBookError('')
    setBookLoading(true)

    const totalPrice = type === 'seat'
      ? route.price_per_seat * seats
      : route.parcel_price_per_kg * Number(parcelKg)

    const payload = {
      route_id:    route.id,
      client_id:   session.user.id,
      type,
      total_price: totalPrice,
      ...(type === 'seat'
        ? { seats_count: seats }
        : { parcel_description: parcelDesc, parcel_weight_kg: Number(parcelKg) }
      ),
    }

    const { error } = await supabase.from('bookings').insert(payload)
    if (error) setBookError(error.message)
    else setBookSuccess(true)
    setBookLoading(false)
  }

  if (loading) return <div className="page" style={{ paddingTop: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>
  if (!route)  return <div className="page" style={{ paddingTop: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Маршрут не найден</div>

  const isOwner = session.user.id === route.driver_id
  const d = new Date(route.departure_date)
  const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })

  return (
    <div className="page" style={{ paddingTop: 20 }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 14, marginBottom: 16, padding: 0 }}
      >
        ← Назад
      </button>

      {/* Route card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>
          {route.from_city} → {route.to_city}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>{dateStr} · {route.departure_time.slice(0,5)}</p>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <span className="badge">{route.seats_available} мест · {route.price_per_seat} ₾/место</span>
          {route.accepts_parcels && (
            <span className="badge parcel">Посылки до {route.parcel_max_kg} кг · {route.parcel_price_per_kg} ₾/кг</span>
          )}
        </div>
      </div>

      {/* Driver card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>ВОДИТЕЛЬ</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 600 }}>{route.driver?.name}</p>
            {route.driver?.rating_count > 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                ★ {route.driver.rating_avg} ({route.driver.rating_count} отзывов)
              </p>
            )}
            {route.driver?.verified && <p style={{ fontSize: 12, color: 'var(--brand)' }}>✓ Верифицирован</p>}
          </div>
        </div>
      </div>

      {/* Booking form */}
      {!isOwner && route.status === 'active' && !bookSuccess && (
        <div className="card">
          <h2 style={{ fontWeight: 600, marginBottom: 16, fontSize: 16 }}>Оформить заявку</h2>

          {/* Type */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[{ v: 'seat', l: 'Место' }, ...(route.accepts_parcels ? [{ v: 'parcel', l: 'Посылка' }] : [])].map(t => (
              <button key={t.v} type="button"
                onClick={() => setType(t.v)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid',
                  borderColor: type === t.v ? 'var(--brand)' : 'var(--border)',
                  background: type === t.v ? '#E8F5E9' : 'var(--surface)',
                  color: type === t.v ? 'var(--brand-dark)' : 'var(--text-muted)',
                  fontWeight: 500, fontSize: 14,
                }}
              >{t.l}</button>
            ))}
          </div>

          <form onSubmit={handleBook}>
            {type === 'seat' && (
              <div className="field">
                <label className="label">Количество мест</label>
                <select value={seats} onChange={e => setSeats(Number(e.target.value))}>
                  {Array.from({ length: Math.min(route.seats_available, 6) }, (_, i) => i + 1)
                    .map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}

            {type === 'parcel' && (
              <>
                <div className="field">
                  <label className="label">Описание посылки</label>
                  <input value={parcelDesc} onChange={e => setParcelDesc(e.target.value)} placeholder="Что отправляете?" required />
                </div>
                <div className="field">
                  <label className="label">Вес (кг)</label>
                  <input type="number" value={parcelKg} onChange={e => setParcelKg(e.target.value)}
                    placeholder="0.5" min="0.1" step="0.1" max={route.parcel_max_kg} required />
                </div>
              </>
            )}

            {/* Price preview */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
              <span style={{ color: 'var(--text-muted)' }}>Итого: </span>
              <strong>
                {type === 'seat'
                  ? `${(route.price_per_seat * seats).toFixed(2)} ₾`
                  : parcelKg ? `${(route.parcel_price_per_kg * Number(parcelKg)).toFixed(2)} ₾` : '—'
                }
              </strong>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> · оплата водителю при поездке</span>
            </div>

            {bookError && <p className="error-msg" style={{ marginBottom: 12 }}>{bookError}</p>}

            <button className="btn-primary" type="submit" disabled={bookLoading}>
              {bookLoading ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </form>
        </div>
      )}

      {bookSuccess && (
        <div style={{
          background: '#D1FAE5', border: '1px solid #6EE7B7',
          borderRadius: 12, padding: 20, textAlign: 'center',
        }}>
          <p style={{ fontWeight: 600, color: '#065F46', fontSize: 16 }}>Заявка отправлена!</p>
          <p style={{ color: '#047857', fontSize: 14, marginTop: 6 }}>
            Водитель получит уведомление и подтвердит поездку.
          </p>
          <button onClick={() => navigate('/my-bookings')}
            style={{ marginTop: 14, background: 'var(--brand)', color: '#fff', padding: '9px 20px', borderRadius: 10, border: 'none', fontSize: 14 }}>
            Мои заявки
          </button>
        </div>
      )}

      {isOwner && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Это ваш маршрут. Заявки смотрите в разделе «Мои маршруты».
        </p>
      )}
    </div>
  )
}

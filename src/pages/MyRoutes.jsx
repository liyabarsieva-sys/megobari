import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CITIES } from '../lib/cities'

const STATUS_LABELS = {
  pending:   'Ожидает',
  confirmed: 'Подтверждена',
  rejected:  'Отклонена',
  completed: 'Завершена',
  cancelled: 'Отменена',
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => ({
  value: `${String(i).padStart(2,'0')}:00`,
  label: `${String(i).padStart(2,'0')}:00 – ${String((i+1)%24).padStart(2,'0')}:00`,
}))

export default function MyRoutes() {
  const { session } = useAuth()
  const [routes, setRoutes]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [bookings, setBookings] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm]   = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState('')

  useEffect(() => {
    supabase
      .from('routes')
      .select('*')
      .eq('driver_id', session.user.id)
      .order('departure_date', { ascending: false })
      .then(({ data }) => { setRoutes(data || []); setLoading(false) })
  }, [])

  async function loadBookings(routeId) {
    if (bookings[routeId]) { setExpanded(routeId); return }
    const { data } = await supabase
      .from('bookings')
      .select('*, client:users!client_id(name, phone)')
      .eq('route_id', routeId)
      .order('created_at')
    setBookings(b => ({ ...b, [routeId]: data || [] }))
    setExpanded(routeId)
  }

  async function updateBookingStatus(bookingId, routeId, status) {
    await supabase.from('bookings').update({ status }).eq('id', bookingId)
    setBookings(b => ({
      ...b,
      [routeId]: b[routeId].map(bk => bk.id === bookingId ? { ...bk, status } : bk),
    }))
  }

  async function cancelRoute(routeId) {
    await supabase.from('routes').update({ status: 'cancelled' }).eq('id', routeId)
    setRoutes(r => r.map(rt => rt.id === routeId ? { ...rt, status: 'cancelled' } : rt))
  }

  function startEdit(route) {
    setEditForm({
      from_city:          route.from_city,
      to_city:            route.to_city,
      departure_date:     route.departure_date,
      departure_time:     route.departure_time.slice(0,5),
      seats_total:        route.seats_total,
      price_per_seat:     route.price_per_seat,
      accepts_parcels:    route.accepts_parcels,
      parcel_max_kg:      route.parcel_max_kg || '',
      parcel_price_per_kg: route.parcel_price_per_kg || '',
    })
    setEditingId(route.id)
    setEditError('')
  }

  function setEF(field) {
    return e => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      setEditForm(f => ({ ...f, [field]: val }))
    }
  }

  async function saveEdit(routeId) {
    setEditSaving(true)
    setEditError('')

    const payload = {
      from_city:      editForm.from_city,
      to_city:        editForm.to_city,
      departure_date: editForm.departure_date,
      departure_time: editForm.departure_time,
      seats_total:    Number(editForm.seats_total),
      price_per_seat: Number(editForm.price_per_seat),
      accepts_parcels: editForm.accepts_parcels,
      parcel_max_kg:   editForm.accepts_parcels ? Number(editForm.parcel_max_kg) : null,
      parcel_price_per_kg: editForm.accepts_parcels ? Number(editForm.parcel_price_per_kg) : null,
    }

    const { error } = await supabase.from('routes').update(payload).eq('id', routeId)

    if (error) {
      setEditError(error.message)
    } else {
      setRoutes(rs => rs.map(r => r.id === routeId ? { ...r, ...payload } : r))
      setEditingId(null)
    }
    setEditSaving(false)
  }

  if (loading) return <div className="page" style={{ paddingTop: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>

  return (
    <div className="page-wide" style={{ paddingTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontWeight: 600, fontSize: 20 }}>Мои маршруты</h1>
        <Link to="/routes/new">
          <button className="btn-primary" style={{ width: 'auto', padding: '9px 16px', fontSize: 14 }}>
            + Новый
          </button>
        </Link>
      </div>

      {routes.length === 0 && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>
          Вы ещё не опубликовали ни одного маршрута
        </p>
      )}

      {routes.map(r => {
        const d = new Date(r.departure_date)
        const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
        const timeLabel = TIME_SLOTS.find(t => t.value === r.departure_time?.slice(0,5))?.label || r.departure_time?.slice(0,5)
        const isOpen    = expanded === r.id
        const isEditing = editingId === r.id
        const bks = bookings[r.id] || []

        return (
          <div key={r.id} className="card" style={{ marginBottom: 12 }}>
            {/* Route header */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => !isEditing && (isOpen ? setExpanded(null) : loadBookings(r.id))}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: 16 }}>{r.from_city} → {r.to_city}</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {dateStr} · {timeLabel} · {r.seats_available}/{r.seats_total} мест
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {r.status === 'active'    && <span className="badge">Активен</span>}
                {r.status === 'cancelled' && <span className="badge rejected">Отменён</span>}
                {r.status === 'completed' && <span className="badge completed">Завершён</span>}
                {!isEditing && <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>{isOpen ? '▲' : '▼'}</span>}
              </div>
            </div>

            {/* Inline edit form */}
            {isEditing && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>РЕДАКТИРОВАТЬ МАРШРУТ</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Откуда</label>
                    <select value={editForm.from_city} onChange={setEF('from_city')}>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Куда</label>
                    <select value={editForm.to_city} onChange={setEF('to_city')}>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <label className="label">Дата</label>
                    <input type="date" value={editForm.departure_date} onChange={setEF('departure_date')} />
                  </div>
                  <div>
                    <label className="label">Время</label>
                    <select value={editForm.departure_time} onChange={setEF('departure_time')}>
                      {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <label className="label">Мест всего</label>
                    <select value={editForm.seats_total} onChange={setEF('seats_total')}>
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Цена за место (₾)</label>
                    <input type="number" value={editForm.price_per_seat} onChange={setEF('price_per_seat')} min="0" />
                  </div>
                </div>

                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: '1.5px solid var(--border)', background: editForm.accepts_parcels ? '#F0FBF4' : 'transparent' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={editForm.accepts_parcels} onChange={setEF('accepts_parcels')}
                      style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} />
                    <span style={{ fontWeight: 500 }}>Беру посылки</span>
                  </label>
                  {editForm.accepts_parcels && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                      <div>
                        <label className="label">Макс. вес (кг)</label>
                        <input type="number" value={editForm.parcel_max_kg} onChange={setEF('parcel_max_kg')} min="0.1" step="any" />
                      </div>
                      <div>
                        <label className="label">Цена за кг (₾)</label>
                        <input type="number" value={editForm.parcel_price_per_kg} onChange={setEF('parcel_price_per_kg')} min="0" step="any" />
                      </div>
                    </div>
                  )}
                </div>

                {editError && <p className="error-msg" style={{ marginTop: 8 }}>{editError}</p>}

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button
                    onClick={() => saveEdit(r.id)}
                    disabled={editSaving}
                    style={{ background: 'var(--brand)', color: '#fff', padding: '8px 20px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 500 }}
                  >
                    {editSaving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 20px', borderRadius: 10, fontSize: 14 }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {/* Bookings list */}
            {isOpen && !isEditing && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>ЗАЯВКИ</p>

                {bks.length === 0 && <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Заявок пока нет</p>}

                {bks.map(b => (
                  <div key={b.id} style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'var(--bg)', marginBottom: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{b.client?.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {b.type === 'seat'
                          ? `${b.seats_count} мест · ${b.total_price} ₾`
                          : `Посылка ${b.parcel_weight_kg} кг · ${b.total_price} ₾`
                        }
                      </p>
                      {b.status === 'confirmed' && b.client?.phone && (
                        <p style={{ fontSize: 12, color: 'var(--brand)', marginTop: 3 }}>{b.client.phone}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {b.status === 'pending' && (
                        <>
                          <button onClick={() => updateBookingStatus(b.id, r.id, 'confirmed')}
                            style={{ background: 'var(--brand)', color: '#fff', padding: '5px 12px', borderRadius: 8, fontSize: 13, border: 'none' }}>
                            Принять
                          </button>
                          <button onClick={() => updateBookingStatus(b.id, r.id, 'rejected')}
                            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '5px 12px', borderRadius: 8, fontSize: 13 }}>
                            Отклонить
                          </button>
                        </>
                      )}
                      {b.status !== 'pending' && (
                        <span className={`badge ${b.status}`}>{STATUS_LABELS[b.status]}</span>
                      )}
                    </div>
                  </div>
                ))}

                {r.status === 'active' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => startEdit(r)}
                      style={{ background: 'none', border: '1px solid var(--brand-light)', color: 'var(--brand)',
                        padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                      Редактировать
                    </button>
                    <button onClick={() => cancelRoute(r.id)}
                      style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
                        padding: '6px 14px', borderRadius: 8, fontSize: 13 }}>
                      Отменить маршрут
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STATUS_LABELS = {
  pending:   'Ожидает',
  confirmed: 'Подтверждена',
  rejected:  'Отклонена',
  completed: 'Завершена',
  cancelled: 'Отменена',
}

export default function MyRoutes() {
  const { session } = useAuth()
  const [routes, setRoutes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [bookings, setBookings] = useState({}) // routeId → []

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
        const isOpen = expanded === r.id
        const bks = bookings[r.id] || []

        return (
          <div key={r.id} className="card" style={{ marginBottom: 12 }}>
            {/* Route header */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => isOpen ? setExpanded(null) : loadBookings(r.id)}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: 16 }}>{r.from_city} → {r.to_city}</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {dateStr} · {r.departure_time.slice(0,5)} · {r.seats_available}/{r.seats_total} мест
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {r.status === 'active'    && <span className="badge">Активен</span>}
                {r.status === 'cancelled' && <span className="badge rejected">Отменён</span>}
                {r.status === 'completed' && <span className="badge completed">Завершён</span>}
                <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Bookings list */}
            {isOpen && (
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
                          <button
                            onClick={() => updateBookingStatus(b.id, r.id, 'confirmed')}
                            style={{ background: 'var(--brand)', color: '#fff', padding: '5px 12px', borderRadius: 8, fontSize: 13, border: 'none' }}
                          >Принять</button>
                          <button
                            onClick={() => updateBookingStatus(b.id, r.id, 'rejected')}
                            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '5px 12px', borderRadius: 8, fontSize: 13 }}
                          >Отклонить</button>
                        </>
                      )}
                      {b.status !== 'pending' && (
                        <span className={`badge ${b.status}`}>{STATUS_LABELS[b.status]}</span>
                      )}
                    </div>
                  </div>
                ))}

                {r.status === 'active' && (
                  <button
                    onClick={() => cancelRoute(r.id)}
                    style={{ marginTop: 8, background: 'none', border: '1px solid var(--border)',
                      color: 'var(--text-muted)', padding: '6px 14px', borderRadius: 8, fontSize: 13 }}
                  >
                    Отменить маршрут
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

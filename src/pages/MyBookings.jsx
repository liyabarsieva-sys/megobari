import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STATUS_LABELS = {
  pending:   'Ожидает',
  confirmed: 'Подтверждена',
  rejected:  'Отклонена',
  completed: 'Завершена',
  cancelled: 'Отменена',
}

export default function MyBookings() {
  const { session } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    supabase
      .from('bookings')
      .select(`
        *,
        route:routes!route_id(from_city, to_city, departure_date, departure_time,
          driver:users!driver_id(name, phone, rating_avg))
      `)
      .eq('client_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setBookings(data || []); setLoading(false) })
  }, [])

  async function cancel(id) {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
  }

  if (loading) return <div className="page" style={{ paddingTop: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>

  return (
    <div className="page-wide" style={{ paddingTop: 20 }}>
      <h1 style={{ fontWeight: 600, fontSize: 20, marginBottom: 20 }}>Мои заявки</h1>

      {bookings.length === 0 && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>
          У вас пока нет заявок
        </p>
      )}

      {bookings.map(b => {
        const d = new Date(b.route.departure_date)
        const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

        return (
          <div key={b.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 16 }}>
                  {b.route.from_city} → {b.route.to_city}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                  {dateStr} · {b.route.departure_time.slice(0,5)} · Водитель: {b.route.driver?.name}
                </p>
                <p style={{ fontSize: 13, marginTop: 6 }}>
                  {b.type === 'seat'
                    ? `${b.seats_count} место · ${b.total_price} ₾`
                    : `Посылка ${b.parcel_weight_kg} кг · ${b.total_price} ₾`
                  }
                </p>
              </div>
              <span className={`badge ${b.status}`}>{STATUS_LABELS[b.status]}</span>
            </div>

            {b.status === 'confirmed' && b.route.driver?.phone && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#F0FBF4', borderRadius: 8, fontSize: 13 }}>
                Телефон водителя: <strong>{b.route.driver.phone}</strong>
              </div>
            )}

            {b.status === 'pending' && (
              <button
                onClick={() => cancel(b.id)}
                style={{ marginTop: 12, background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', padding: '6px 14px', borderRadius: 8, fontSize: 13 }}
              >
                Отменить
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

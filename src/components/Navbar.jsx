import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/',            label: 'Поиск' },
  { to: '/my-bookings', label: 'Мои заявки' },
  { to: '/my-routes',   label: 'Мои маршруты' },
  { to: '/profile',     label: 'Профиль' },
]

function BellIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

export default function Navbar() {
  const { pathname } = useLocation()
  const { session, profile } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  const isDriver = profile?.role === 'driver' || profile?.role === 'both'

  // Загружаем количество ожидающих заявок для водителя
  useEffect(() => {
    if (!session || !isDriver) return

    async function fetchPending() {
      // Получаем маршруты водителя
      const { data: routes } = await supabase
        .from('routes')
        .select('id')
        .eq('driver_id', session.user.id)
        .eq('status', 'active')

      if (!routes || routes.length === 0) return

      const routeIds = routes.map(r => r.id)

      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('route_id', routeIds)
        .eq('status', 'pending')

      setPendingCount(count || 0)
    }

    fetchPending()

    // Подписываемся на новые заявки в реальном времени
    const channel = supabase
      .channel('pending-bookings')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bookings',
      }, () => fetchPending())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
      }, () => fetchPending())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session, isDriver])

  // Сбрасываем счётчик когда водитель заходит в «Мои маршруты»
  useEffect(() => {
    if (pathname === '/my-routes') setPendingCount(0)
  }, [pathname])

  return (
    <header style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <nav style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        height: 52,
      }}>
        <Link to="/" style={{
          fontWeight: 600,
          fontSize: 17,
          color: 'var(--brand)',
          marginRight: 12,
          textDecoration: 'none',
        }}>
          Megobari
        </Link>

        <div style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
          {links.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              color: pathname === to ? 'var(--brand)' : 'var(--text-muted)',
              background: pathname === to ? '#E8F5E9' : 'transparent',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Колокольчик для водителя */}
        {isDriver && (
          <Link to="/my-routes" style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            borderRadius: 8,
            color: pendingCount > 0 ? 'var(--brand)' : 'var(--text-muted)',
            textDecoration: 'none',
          }}>
            <BellIcon />
            {pendingCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 2,
                right: 2,
                background: '#DC2626',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>
        )}

        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: 'var(--text-muted)',
            padding: '6px 8px',
            borderRadius: 8,
          }}
        >
          Выйти
        </button>
      </nav>
    </header>
  )
}

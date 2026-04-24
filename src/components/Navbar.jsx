import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/',            label: 'Поиск' },
  { to: '/my-bookings', label: 'Мои заявки' },
  { to: '/my-routes',   label: 'Мои маршруты' },
  { to: '/profile',     label: 'Профиль' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { signOut } = useAuth()

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

        <button
          onClick={signOut}
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

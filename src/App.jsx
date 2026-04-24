import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Register from './pages/Register'
import RouteDetail from './pages/RouteDetail'
import NewRoute from './pages/NewRoute'
import MyBookings from './pages/MyBookings'
import MyRoutes from './pages/MyRoutes'
import Profile from './pages/Profile'

function PrivateRoute({ children }) {
  const { session } = useAuth()
  if (session === undefined) return null // loading
  return session ? children : <Navigate to="/auth" replace />
}

export default function App() {
  const { session } = useAuth()

  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Загрузка...</p>
      </div>
    )
  }

  return (
    <>
      {session && <Navbar />}
      <Routes>
        <Route path="/auth"     element={session ? <Navigate to="/" /> : <Auth />} />
        <Route path="/register" element={session ? <Navigate to="/" /> : <Register />} />

        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/routes/:id" element={<PrivateRoute><RouteDetail /></PrivateRoute>} />
        <Route path="/routes/new" element={<PrivateRoute><NewRoute /></PrivateRoute>} />
        <Route path="/my-bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
        <Route path="/my-routes"   element={<PrivateRoute><MyRoutes /></PrivateRoute>} />
        <Route path="/profile"     element={<PrivateRoute><Profile /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}

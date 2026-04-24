import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  client: 'Клиент',
  driver: 'Водитель',
  both:   'Водитель и клиент',
}

export default function Profile() {
  const { profile, session, fetchProfile } = useAuth()
  const [name, setName]       = useState(profile?.name || '')
  const [phone, setPhone]     = useState(profile?.phone || '')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [passportDone, setPassportDone] = useState(!!profile?.passport_photo_url)
  const fileRef = useRef()

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('users').update({ name, phone }).eq('id', session.user.id)
    await fetchProfile(session.user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function uploadPassport(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)

    const ext  = file.name.split('.').pop()
    const path = `${session.user.id}/passport.${ext}`

    const { error: upErr } = await supabase.storage
      .from('passports')
      .upload(path, file, { upsert: true })

    if (!upErr) {
      const { data } = supabase.storage.from('passports').getPublicUrl(path)
      await supabase.from('users').update({ passport_photo_url: data.publicUrl }).eq('id', session.user.id)
      await fetchProfile(session.user.id)
      setPassportDone(true)
    }
    setUploading(false)
  }

  if (!profile) return null

  return (
    <div className="page" style={{ paddingTop: 20 }}>
      <h1 style={{ fontWeight: 600, fontSize: 20, marginBottom: 20 }}>Профиль</h1>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div className="card" style={{ flex: 1, textAlign: 'center', padding: 16 }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand)' }}>
            {profile.rating_avg > 0 ? `★ ${profile.rating_avg}` : '—'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {profile.rating_count} отзывов
          </p>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center', padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: profile.verified ? 'var(--brand)' : 'var(--text-muted)' }}>
            {profile.verified ? '✓ Верифицирован' : '⏳ Не верифицирован'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{ROLE_LABELS[profile.role]}</p>
        </div>
      </div>

      {/* Edit form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Личные данные</h2>
        <form onSubmit={saveProfile}>
          <div className="field">
            <label className="label">Имя</label>
            <input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label">Телефон</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+995 5XX XXX XXX" />
          </div>
          <div className="field">
            <label className="label">Email</label>
            <input value={session.user.email} disabled style={{ opacity: 0.6 }} />
          </div>

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Сохранение...' : saved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </form>
      </div>

      {/* Passport upload */}
      <div className="card">
        <h2 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Верификация</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Загрузите фото паспорта для верификации аккаунта. Документ виден только администратору — 
          другие пользователи его не видят.
        </p>

        {passportDone ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div>
              <p style={{ fontWeight: 500, fontSize: 14 }}>Документ загружен</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {profile.verified ? 'Аккаунт верифицирован' : 'Ожидает проверки администратором'}
              </p>
            </div>
            <button
              onClick={() => fileRef.current.click()}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-muted)', padding: '5px 12px', borderRadius: 8, fontSize: 13 }}
            >
              Обновить
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current.click()}
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? 'Загрузка...' : 'Загрузить фото паспорта'}
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={uploadPassport}
        />
      </div>
    </div>
  )
}

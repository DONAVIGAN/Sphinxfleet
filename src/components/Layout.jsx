import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import BoutonSOS from './BoutonSOS'

const LIENS = [
  { to: '/', label: 'Tableau de bord', roles: ['super_admin', 'admin_flotte', 'superviseur', 'bailleur'] },
  { to: '/vehicules', label: 'Véhicules', roles: ['super_admin', 'admin_flotte', 'superviseur'] },
  { to: '/chauffeurs', label: 'Chauffeurs', roles: ['super_admin', 'admin_flotte', 'superviseur'] },
  { to: '/missions', label: 'Missions', roles: ['super_admin', 'admin_flotte', 'superviseur', 'chauffeur'] },
  { to: '/pannes', label: 'Pannes & réparations', roles: ['super_admin', 'admin_flotte', 'superviseur', 'mecanicien'] },
  { to: '/carte', label: 'Carte de la flotte', roles: ['super_admin', 'admin_flotte', 'superviseur'] },
  { to: '/anomalies-carburant', label: 'Anomalies carburant', roles: ['super_admin', 'admin_flotte', 'superviseur'] },
  { to: '/projets', label: 'Projets & bailleurs', roles: ['super_admin', 'admin_flotte'], ongUniquement: true },
  { to: '/rapport-bailleur', label: 'Rapport bailleur', roles: ['super_admin', 'admin_flotte', 'bailleur'], ongUniquement: true }
]

export default function Layout({ children }) {
  const { profil } = useAuth()
  const [enLigne, setEnLigne] = useState(navigator.onLine)

  useEffect(() => {
    const majStatut = () => setEnLigne(navigator.onLine)
    window.addEventListener('online', majStatut)
    window.addEventListener('offline', majStatut)
    return () => {
      window.removeEventListener('online', majStatut)
      window.removeEventListener('offline', majStatut)
    }
  }, [])

  const liensVisibles = LIENS.filter(l => {
    const roleOk = !profil || l.roles.includes(profil.role)
    const typeOk = !l.ongUniquement || profil?.organisations?.type === 'ong'
    return roleOk && typeOk
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, background: 'var(--anthracite-800)', padding: '1.5rem 1rem', borderRight: '1px solid var(--anthracite-600)' }}>
        <h1 style={{ color: 'var(--or)', fontSize: '1.2rem', marginBottom: '2rem' }}>SphinxFleet</h1>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {liensVisibles.map(lien => (
            <NavLink
              key={lien.to}
              to={lien.to}
              end={lien.to === '/'}
              style={({ isActive }) => ({
                padding: '0.6rem 0.8rem',
                borderRadius: 6,
                textDecoration: 'none',
                color: isActive ? 'var(--anthracite-900)' : 'var(--texte-clair)',
                background: isActive ? 'var(--or)' : 'transparent'
              })}
            >
              {lien.label}
            </NavLink>
          ))}
        </nav>

        {!enLigne && (
          <div style={{ marginTop: '2rem', padding: '0.6rem', background: 'var(--alerte)', color: 'var(--anthracite-900)', borderRadius: 6, fontSize: '0.8rem' }}>
            Mode hors-ligne — synchronisation à la reconnexion
          </div>
        )}
      </aside>

      <main style={{ flex: 1, padding: '2rem' }}>
        {children}
      </main>

      {profil?.role === 'chauffeur' && (
        <div style={{ position: 'fixed', bottom: 24, right: 24 }}>
          <BoutonSOS />
        </div>
      )}
    </div>
  )
}

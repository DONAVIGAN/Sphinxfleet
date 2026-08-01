import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Connexion from './pages/Connexion'
import Dashboard from './pages/Dashboard'
import Vehicules from './pages/Vehicules'
import Chauffeurs from './pages/Chauffeurs'
import Missions from './pages/Missions'
import Pannes from './pages/Pannes'
import CarteFlotte from './pages/CarteFlotte'
import Projets from './pages/Projets'
import RapportBailleur from './pages/RapportBailleur'
import AnomaliesCarburant from './pages/AnomaliesCarburant'

function RouteProtegee({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="chargement">Chargement…</div>
  if (!session) return <Navigate to="/connexion" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Connexion />} />
      <Route
        path="/*"
        element={
          <RouteProtegee>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/vehicules" element={<Vehicules />} />
                <Route path="/chauffeurs" element={<Chauffeurs />} />
                <Route path="/missions" element={<Missions />} />
                <Route path="/pannes" element={<Pannes />} />
                <Route path="/carte" element={<CarteFlotte />} />
                <Route path="/projets" element={<Projets />} />
                <Route path="/rapport-bailleur" element={<RapportBailleur />} />
                <Route path="/anomalies-carburant" element={<AnomaliesCarburant />} />
              </Routes>
            </Layout>
          </RouteProtegee>
        }
      />
    </Routes>
  )
}

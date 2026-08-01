import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import 'leaflet/dist/leaflet.css'

// Correctif Vite/Webpack : les icônes par défaut de Leaflet référencent des chemins
// relatifs qui cassent au bundling → les marqueurs seraient invisibles.
// On force les URLs via les assets du paquet.
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

// Position par défaut : Niamey. À ajuster selon le pays de l'organisation.
const CENTRE_PAR_DEFAUT = [13.5137, 2.1098]

export default function CarteFlotte() {
  const [dernieresPositions, setDernieresPositions] = useState([])
  const [alertesActives, setAlertesActives] = useState([])

  useEffect(() => {
    chargerPositions()
    chargerAlertesSOS()

    // Abonnement temps réel : nouvelles positions et nouvelles alertes SOS
    const canal = supabase
      .channel('carte-flotte')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'positions_vehicules' }, chargerPositions)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertes_sos' }, chargerAlertesSOS)
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [])

  async function chargerPositions() {
    // Dernière position connue par véhicule
    const { data } = await supabase
      .from('positions_vehicules')
      .select('*, vehicules(immatriculation)')
      .order('timestamp', { ascending: false })
      .limit(200)

    const parVehicule = {}
    for (const p of data || []) {
      // Ignore les positions sans coordonnées valides (sinon crash du marqueur Leaflet)
      if (p.latitude == null || p.longitude == null) continue
      if (!parVehicule[p.vehicule_id]) parVehicule[p.vehicule_id] = p
    }
    setDernieresPositions(Object.values(parVehicule))
  }

  async function chargerAlertesSOS() {
    const { data } = await supabase
      .from('alertes_sos')
      .select('*, vehicules(immatriculation), chauffeurs(nom)')
      .neq('statut', 'resolue')
    setAlertesActives(data || [])
  }

  async function resoudreAlerte(id) {
    await supabase.from('alertes_sos').update({ statut: 'resolue', resolue_at: new Date().toISOString() }).eq('id', id)
    chargerAlertesSOS()
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Carte de la flotte</h2>

      {alertesActives.length > 0 && (
        <div style={{ background: 'var(--danger)', padding: '1rem', borderRadius: 10, marginBottom: '1rem' }}>
          <strong>🚨 {alertesActives.length} alerte(s) SOS active(s)</strong>
          {alertesActives.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              <span>{a.vehicules?.immatriculation} — {a.chauffeurs?.nom} — {new Date(a.created_at).toLocaleTimeString('fr-FR')}</span>
              <button onClick={() => resoudreAlerte(a.id)} style={{ background: 'white', border: 'none', borderRadius: 4, padding: '0.2rem 0.6rem', cursor: 'pointer' }}>
                Marquer résolue
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: '70vh', borderRadius: 10, overflow: 'hidden' }}>
        <MapContainer center={CENTRE_PAR_DEFAUT} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          {dernieresPositions.map(p => (
            <Marker key={p.vehicule_id} position={[p.latitude, p.longitude]}>
              <Popup>
                {p.vehicules?.immatriculation}<br />
                {p.source === 'boitier_gps' ? 'Boîtier GPS' : 'Smartphone'}<br />
                {new Date(p.timestamp).toLocaleString('fr-FR')}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

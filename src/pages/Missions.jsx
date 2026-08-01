import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { ajouterEnAttente, synchroniserFileAttente } from '../lib/offlineQueue'
import { useSuiviPosition } from '../lib/useSuiviPosition'

export default function Missions() {
  const { profil } = useAuth()
  const [missions, setMissions] = useState([])
  const [projets, setProjets] = useState([])
  const [vehicules, setVehicules] = useState([])
  const [chauffeurs, setChauffeurs] = useState([])
  const [enAttenteSync, setEnAttenteSync] = useState(0)
  const [formulaireVisible, setFormulaireVisible] = useState(false)
  const [nouvelle, setNouvelle] = useState({ origine: '', destination: '', objectif: '', km_depart: '', projet_id: '', vehicule_id: '', chauffeur_id: '' })
  const [missionATerminer, setMissionATerminer] = useState(null)
  const [cloture, setCloture] = useState({ km_arrivee: '', carburant_consomme_litres: '' })

  const estOng = profil?.organisations?.type === 'ong'
  const estAdmin = ['super_admin', 'admin_flotte', 'superviseur'].includes(profil?.role)

  const missionEnCours = profil?.role === 'chauffeur'
    ? missions.find(m => m.chauffeur_id === profil.chauffeur_id && m.statut === 'en_cours')
    : null

  useSuiviPosition({
    actif: !!missionEnCours,
    vehiculeId: missionEnCours?.vehicule_id,
    missionId: missionEnCours?.id
  })

  useEffect(() => {
    chargerMissions()
    if (estOng) chargerProjets()
    if (estAdmin) chargerVehiculesEtChauffeurs()
    const gererRetourEnLigne = async () => {
      const nbSynchronise = await synchroniserFileAttente(supabase)
      if (nbSynchronise > 0) chargerMissions()
    }
    window.addEventListener('online', gererRetourEnLigne)
    return () => window.removeEventListener('online', gererRetourEnLigne)
  }, [])

  async function chargerProjets() {
    const { data } = await supabase.from('projets').select('id, nom')
    setProjets(data || [])
  }

  async function chargerVehiculesEtChauffeurs() {
    const { data: v } = await supabase.from('vehicules').select('id, immatriculation, kilometrage_actuel')
    const { data: c } = await supabase.from('chauffeurs').select('id, nom')
    setVehicules(v || [])
    setChauffeurs(c || [])
  }

  async function chargerMissions() {
    const { data } = await supabase
      .from('missions')
      .select('*, vehicules(immatriculation), chauffeurs(nom)')
      .order('date_debut', { ascending: false })
    setMissions(data || [])
  }

  async function demarrerMission(e) {
    e.preventDefault()

    const vehiculeId = estAdmin ? nouvelle.vehicule_id : profil.vehicule_assigne_id
    const chauffeurId = estAdmin ? nouvelle.chauffeur_id : profil.chauffeur_id

    if (!vehiculeId || !chauffeurId) {
      alert('Veuillez sélectionner un véhicule et un chauffeur.')
      return
    }

    const mission = {
      vehicule_id: vehiculeId,
      chauffeur_id: chauffeurId,
      organisation_id: profil.organisation_id,
      projet_id: nouvelle.projet_id || null,
      origine: nouvelle.origine,
      destination: nouvelle.destination,
      objectif: nouvelle.objectif,
      km_depart: parseInt(nouvelle.km_depart, 10),
      statut: 'en_cours'
    }

    if (navigator.onLine) {
      const { error } = await supabase.from('missions').insert(mission)
      if (error) {
        console.error('Erreur création mission:', error)
        alert('Erreur: ' + error.message)
        return
      }
    } else {
      await ajouterEnAttente('missions', 'insert', mission)
    }

    setFormulaireVisible(false)
    setNouvelle({ origine: '', destination: '', objectif: '', km_depart: '', projet_id: '', vehicule_id: '', chauffeur_id: '' })
    if (navigator.onLine) chargerMissions()
  }

  async function terminerMission(e) {
    e.preventDefault()
    const { error } = await supabase
      .from('missions')
      .update({
        km_arrivee: parseInt(cloture.km_arrivee, 10),
        carburant_consomme_litres: cloture.carburant_consomme_litres ? parseFloat(cloture.carburant_consomme_litres) : null,
        statut: 'terminee',
        date_fin: new Date().toISOString()
      })
      .eq('id', missionATerminer.id)

    if (!error) {
      setMissionATerminer(null)
      setCloture({ km_arrivee: '', carburant_consomme_litres: '' })
      chargerMissions()
    } else {
      alert('Erreur: ' + error.message)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Missions</h2>
        <button onClick={() => setFormulaireVisible(!formulaireVisible)} style={{ background: 'var(--or)', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>
          + Démarrer une mission
        </button>
      </div>

      {enAttenteSync > 0 && (
        <p style={{ color: 'var(--alerte)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {enAttenteSync} mission(s) en attente de synchronisation.
        </p>
      )}

      {formulaireVisible && (
        <form onSubmit={demarrerMission} style={{ background: 'var(--anthracite-800)', padding: '1.2rem', borderRadius: 10, marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
          {estAdmin && (
            <>
              <select required value={nouvelle.vehicule_id} onChange={e => setNouvelle({ ...nouvelle, vehicule_id: e.target.value })}>
                <option value="">Sélectionner un véhicule</option>
                {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}</option>)}
              </select>
              <select required value={nouvelle.chauffeur_id} onChange={e => setNouvelle({ ...nouvelle, chauffeur_id: e.target.value })}>
                <option value="">Sélectionner un chauffeur</option>
                {chauffeurs.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </>
          )}
          <input placeholder="Origine" required value={nouvelle.origine} onChange={e => setNouvelle({ ...nouvelle, origine: e.target.value })} />
          <input placeholder="Destination" required value={nouvelle.destination} onChange={e => setNouvelle({ ...nouvelle, destination: e.target.value })} />
          <input placeholder="Objectif de la mission" value={nouvelle.objectif} onChange={e => setNouvelle({ ...nouvelle, objectif: e.target.value })} style={{ gridColumn: 'span 2' }} />
          <input placeholder="Kilométrage au départ" type="number" required value={nouvelle.km_depart} onChange={e => setNouvelle({ ...nouvelle, km_depart: e.target.value })} />
          {estOng && (
            <select value={nouvelle.projet_id} onChange={e => setNouvelle({ ...nouvelle, projet_id: e.target.value })}>
              <option value="">Rattacher à un projet (optionnel)</option>
              {projets.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          )}
          <button type="submit" style={{ gridColumn: 'span 2', background: 'var(--or)', border: 'none', padding: '0.6rem', borderRadius: 6, cursor: 'pointer' }}>
            Démarrer
          </button>
        </form>
      )}

      {missionATerminer && (
        <form onSubmit={terminerMission} style={{ background: 'var(--anthracite-800)', padding: '1.2rem', borderRadius: 10, marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
          <p style={{ gridColumn: 'span 2', margin: 0, color: 'var(--texte-attenue)' }}>
            Clôturer la mission {missionATerminer.origine} → {missionATerminer.destination}
          </p>
          <input placeholder="Kilométrage à l'arrivée" type="number" required value={cloture.km_arrivee} onChange={e => setCloture({ ...cloture, km_arrivee: e.target.value })} />
          <input placeholder="Carburant consommé (litres, optionnel)" type="number" step="0.1" value={cloture.carburant_consomme_litres} onChange={e => setCloture({ ...cloture, carburant_consomme_litres: e.target.value })} />
          <button type="submit" style={{ background: 'var(--or)', border: 'none', padding: '0.6rem', borderRadius: 6, cursor: 'pointer' }}>
            Confirmer la fin de mission
          </button>
          <button type="button" onClick={() => setMissionATerminer(null)} style={{ background: 'transparent', border: '1px solid var(--anthracite-600)', color: 'var(--texte-clair)', padding: '0.6rem', borderRadius: 6, cursor: 'pointer' }}>
            Annuler
          </button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--texte-attenue)', fontSize: '0.85rem' }}>
            <th style={{ padding: '0.5rem' }}>Date</th>
            <th>Véhicule</th>
            <th>Chauffeur</th>
            <th>Trajet</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {missions.map(m => (
            <tr key={m.id} style={{ borderTop: '1px solid var(--anthracite-700)' }}>
              <td style={{ padding: '0.6rem' }}>{new Date(m.date_debut).toLocaleDateString('fr-FR')}</td>
              <td>{m.vehicules?.immatriculation}</td>
              <td>{m.chauffeurs?.nom}</td>
              <td>{m.origine} → {m.destination}</td>
              <td>{m.statut === 'en_cours' ? '🟡 En cours' : '✅ Terminée'}</td>
              <td>
                {m.statut === 'en_cours' && (estAdmin || m.chauffeur_id === profil?.chauffeur_id) && (
                  <button onClick={() => setMissionATerminer(m)} style={{ background: 'transparent', border: '1px solid var(--or)', color: 'var(--or)', padding: '0.3rem 0.6rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
                    Terminer
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

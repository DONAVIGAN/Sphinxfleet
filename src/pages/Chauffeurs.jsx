import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Chauffeurs() {
  const { profil } = useAuth()
  const [chauffeurs, setChauffeurs] = useState([])
  const [vehicules, setVehicules] = useState([])
  const [formulaireVisible, setFormulaireVisible] = useState(false)
  const [nouveau, setNouveau] = useState({ nom: '', telephone: '', numero_permis: '', vehicule_assigne_id: '' })

  useEffect(() => { chargerDonnees() }, [])

  async function chargerDonnees() {
    const { data: c } = await supabase.from('chauffeurs').select('*, vehicules(immatriculation)').order('created_at', { ascending: false })
    const { data: v } = await supabase.from('vehicules').select('id, immatriculation')
    setChauffeurs(c || [])
    setVehicules(v || [])
  }

  async function ajouterChauffeur(e) {
    e.preventDefault()
    const { error } = await supabase.from('chauffeurs').insert({
      ...nouveau,
      organisation_id: profil.organisation_id,
      vehicule_assigne_id: nouveau.vehicule_assigne_id || null
    })
    if (!error) {
      setFormulaireVisible(false)
      setNouveau({ nom: '', telephone: '', numero_permis: '', vehicule_assigne_id: '' })
      chargerDonnees()
    } else {
      console.error('Erreur ajout chauffeur:', error)
      alert('Erreur: ' + error.message)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Chauffeurs</h2>
        <button onClick={() => setFormulaireVisible(!formulaireVisible)} style={{ background: 'var(--or)', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>
          + Ajouter un chauffeur
        </button>
      </div>

      {formulaireVisible && (
        <form onSubmit={ajouterChauffeur} style={{ background: 'var(--anthracite-800)', padding: '1.2rem', borderRadius: 10, marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
          <input placeholder="Nom complet" required value={nouveau.nom} onChange={e => setNouveau({ ...nouveau, nom: e.target.value })} />
          <input placeholder="Téléphone" value={nouveau.telephone} onChange={e => setNouveau({ ...nouveau, telephone: e.target.value })} />
          <input placeholder="Numéro de permis" value={nouveau.numero_permis} onChange={e => setNouveau({ ...nouveau, numero_permis: e.target.value })} />
          <select value={nouveau.vehicule_assigne_id} onChange={e => setNouveau({ ...nouveau, vehicule_assigne_id: e.target.value })}>
            <option value="">Véhicule assigné (optionnel)</option>
            {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}</option>)}
          </select>
          <button type="submit" style={{ gridColumn: 'span 3', background: 'var(--or)', border: 'none', padding: '0.6rem', borderRadius: 6, cursor: 'pointer' }}>
            Enregistrer
          </button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--texte-attenue)', fontSize: '0.85rem' }}>
            <th style={{ padding: '0.5rem' }}>Nom</th>
            <th>Téléphone</th>
            <th>Permis</th>
            <th>Véhicule assigné</th>
          </tr>
        </thead>
        <tbody>
          {chauffeurs.map(c => (
            <tr key={c.id} style={{ borderTop: '1px solid var(--anthracite-700)' }}>
              <td style={{ padding: '0.6rem' }}>{c.nom}</td>
              <td>{c.telephone}</td>
              <td>{c.numero_permis || '—'}</td>
              <td>{c.vehicules?.immatriculation || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

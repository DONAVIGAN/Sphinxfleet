import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Pannes() {
  const { profil } = useAuth()
  const [pannes, setPannes] = useState([])
  const [vehicules, setVehicules] = useState([])
  const [formulaireVisible, setFormulaireVisible] = useState(false)
  const [nouvelle, setNouvelle] = useState({ vehicule_id: '', description: '', garage: '', cout: '' })

  useEffect(() => { chargerDonnees() }, [])

  async function chargerDonnees() {
    const { data: p } = await supabase
      .from('pannes_reparations')
      .select('*, vehicules(immatriculation)')
      .order('date_panne', { ascending: false })
    const { data: v } = await supabase.from('vehicules').select('id, immatriculation')
    setPannes(p || [])
    setVehicules(v || [])
  }

  async function signalerPanne(e) {
    e.preventDefault()
    const { error } = await supabase.from('pannes_reparations').insert({
      organisation_id: profil.organisation_id,
      vehicule_id: nouvelle.vehicule_id,
      description: nouvelle.description,
      garage: nouvelle.garage || null,
      cout: nouvelle.cout ? parseFloat(nouvelle.cout) : null,
      declare_par: profil.id,
      statut: 'signalee'
    })
    if (!error) {
      setFormulaireVisible(false)
      setNouvelle({ vehicule_id: '', description: '', garage: '', cout: '' })
      chargerDonnees()
    } else {
      console.error('Erreur signalement panne:', error)
      alert('Erreur: ' + error.message)
    }
  }

  async function changerStatut(id, statut) {
    await supabase.from('pannes_reparations').update({ statut }).eq('id', id)
    chargerDonnees()
  }

  const badge = { signalee: 'var(--danger)', en_reparation: 'var(--alerte)', resolue: 'var(--succes)' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Pannes & réparations</h2>
        <button onClick={() => setFormulaireVisible(!formulaireVisible)} style={{ background: 'var(--or)', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>
          + Signaler une panne
        </button>
      </div>

      {formulaireVisible && (
        <form onSubmit={signalerPanne} style={{ background: 'var(--anthracite-800)', padding: '1.2rem', borderRadius: 10, marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
          <select required value={nouvelle.vehicule_id} onChange={e => setNouvelle({ ...nouvelle, vehicule_id: e.target.value })}>
            <option value="">Sélectionner un véhicule</option>
            {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}</option>)}
          </select>
          <input placeholder="Garage (optionnel)" value={nouvelle.garage} onChange={e => setNouvelle({ ...nouvelle, garage: e.target.value })} />
          <input placeholder="Description de la panne" required value={nouvelle.description} onChange={e => setNouvelle({ ...nouvelle, description: e.target.value })} style={{ gridColumn: 'span 2' }} />
          <input placeholder="Coût estimé (FCFA, optionnel)" type="number" value={nouvelle.cout} onChange={e => setNouvelle({ ...nouvelle, cout: e.target.value })} />
          <button type="submit" style={{ background: 'var(--or)', border: 'none', padding: '0.6rem', borderRadius: 6, cursor: 'pointer' }}>
            Enregistrer
          </button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--texte-attenue)', fontSize: '0.85rem' }}>
            <th style={{ padding: '0.5rem' }}>Date</th>
            <th>Véhicule</th>
            <th>Description</th>
            <th>Coût</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {pannes.map(p => (
            <tr key={p.id} style={{ borderTop: '1px solid var(--anthracite-700)' }}>
              <td style={{ padding: '0.6rem' }}>{new Date(p.date_panne).toLocaleDateString('fr-FR')}</td>
              <td>{p.vehicules?.immatriculation}</td>
              <td>{p.description}</td>
              <td>{p.cout ? `${p.cout.toLocaleString('fr-FR')} FCFA` : '—'}</td>
              <td>
                <select value={p.statut} onChange={e => changerStatut(p.id, e.target.value)} style={{ color: badge[p.statut], background: 'var(--anthracite-800)', border: 'none' }}>
                  <option value="signalee">Signalée</option>
                  <option value="en_reparation">En réparation</option>
                  <option value="resolue">Résolue</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

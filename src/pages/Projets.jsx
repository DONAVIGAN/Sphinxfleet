import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Projets() {
  const { profil } = useAuth()
  const [projets, setProjets] = useState([])
  const [formulaireVisible, setFormulaireVisible] = useState(false)
  const [nouveau, setNouveau] = useState({ nom: '', bailleur: '', budget_vehicule: '', date_debut: '', date_fin: '' })

  useEffect(() => { chargerProjets() }, [])

  async function chargerProjets() {
    const { data } = await supabase.from('projets').select('*').order('date_debut', { ascending: false })
    setProjets(data || [])
  }

  async function ajouterProjet(e) {
    e.preventDefault()
    const { error } = await supabase.from('projets').insert({
      ...nouveau,
      organisation_id: profil.organisation_id,
      budget_vehicule: nouveau.budget_vehicule ? parseFloat(nouveau.budget_vehicule) : null,
      // Postgres rejette une chaîne vide sur une colonne date → convertir en null
      date_debut: nouveau.date_debut || null,
      date_fin: nouveau.date_fin || null
    })
    if (!error) {
      setFormulaireVisible(false)
      setNouveau({ nom: '', bailleur: '', budget_vehicule: '', date_debut: '', date_fin: '' })
      chargerProjets()
    } else {
      console.error('Erreur ajout projet:', error)
      alert('Erreur: ' + error.message)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Projets & bailleurs</h2>
        <button onClick={() => setFormulaireVisible(!formulaireVisible)} style={{ background: 'var(--or)', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>
          + Ajouter un projet
        </button>
      </div>

      {formulaireVisible && (
        <form onSubmit={ajouterProjet} style={{ background: 'var(--anthracite-800)', padding: '1.2rem', borderRadius: 10, marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
          <input placeholder="Nom du projet" required value={nouveau.nom} onChange={e => setNouveau({ ...nouveau, nom: e.target.value })} />
          <input placeholder="Bailleur" value={nouveau.bailleur} onChange={e => setNouveau({ ...nouveau, bailleur: e.target.value })} />
          <input placeholder="Budget véhicule (FCFA, optionnel)" type="number" value={nouveau.budget_vehicule} onChange={e => setNouveau({ ...nouveau, budget_vehicule: e.target.value })} />
          <input type="date" value={nouveau.date_debut} onChange={e => setNouveau({ ...nouveau, date_debut: e.target.value })} />
          <input type="date" value={nouveau.date_fin} onChange={e => setNouveau({ ...nouveau, date_fin: e.target.value })} />
          <button type="submit" style={{ gridColumn: 'span 3', background: 'var(--or)', border: 'none', padding: '0.6rem', borderRadius: 6, cursor: 'pointer' }}>
            Enregistrer
          </button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--texte-attenue)', fontSize: '0.85rem' }}>
            <th style={{ padding: '0.5rem' }}>Projet</th>
            <th>Bailleur</th>
            <th>Budget véhicule</th>
            <th>Période</th>
          </tr>
        </thead>
        <tbody>
          {projets.map(p => (
            <tr key={p.id} style={{ borderTop: '1px solid var(--anthracite-700)' }}>
              <td style={{ padding: '0.6rem' }}>{p.nom}</td>
              <td>{p.bailleur || '—'}</td>
              <td>{p.budget_vehicule ? `${p.budget_vehicule.toLocaleString('fr-FR')} FCFA` : '—'}</td>
              <td>
                {p.date_debut ? new Date(p.date_debut).toLocaleDateString('fr-FR') : '?'}
                {' → '}
                {p.date_fin ? new Date(p.date_fin).toLocaleDateString('fr-FR') : 'en cours'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

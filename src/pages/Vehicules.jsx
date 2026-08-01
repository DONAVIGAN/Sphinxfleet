import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Vehicules() {
  const { profil } = useAuth()
  const [vehicules, setVehicules] = useState([])
  const [documentsParVehicule, setDocumentsParVehicule] = useState({})
  const [formulaireVisible, setFormulaireVisible] = useState(false)
  const [nouveau, setNouveau] = useState({
    immatriculation: '', marque: '', modele: '', annee: '', type_carburant: 'essence', kilometrage_actuel: 0, consommation_theorique_l_100km: ''
  })

  useEffect(() => { chargerVehicules() }, [])

  async function chargerVehicules() {
    const { data } = await supabase.from('vehicules').select('*').order('created_at', { ascending: false })
    setVehicules(data || [])

    const { data: documents } = await supabase.from('documents_vehicule').select('vehicule_id, statut_alerte, type_document, date_expiration')
    const pireStatutParVehicule = {}
    const priorite = { expire: 3, alerte: 2, ok: 1 }
    for (const doc of documents || []) {
      const actuel = pireStatutParVehicule[doc.vehicule_id]
      if (!actuel || priorite[doc.statut_alerte] > priorite[actuel.statut_alerte]) {
        pireStatutParVehicule[doc.vehicule_id] = doc
      }
    }
    setDocumentsParVehicule(pireStatutParVehicule)
  }

  async function ajouterVehicule(e) {
    e.preventDefault()
    const { error } = await supabase.from('vehicules').insert({
      ...nouveau,
      organisation_id: profil.organisation_id,
      consommation_theorique_l_100km: nouveau.consommation_theorique_l_100km ? parseFloat(nouveau.consommation_theorique_l_100km) : null
    })
    if (!error) {
      setFormulaireVisible(false)
      setNouveau({ immatriculation: '', marque: '', modele: '', annee: '', type_carburant: 'essence', kilometrage_actuel: 0, consommation_theorique_l_100km: '' })
      chargerVehicules()
    } else {
      console.error('Erreur ajout véhicule:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const badgeStatut = (statut) => ({
    actif: { texte: 'Actif', couleur: 'var(--succes)' },
    en_panne: { texte: 'En panne', couleur: 'var(--danger)' },
    hors_service: { texte: 'Hors service', couleur: 'var(--texte-attenue)' }
  }[statut])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Véhicules</h2>
        <button onClick={() => setFormulaireVisible(!formulaireVisible)} style={{ background: 'var(--or)', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>
          + Ajouter un véhicule
        </button>
      </div>

      {formulaireVisible && (
        <form onSubmit={ajouterVehicule} style={{ background: 'var(--anthracite-800)', padding: '1.2rem', borderRadius: 10, marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
          <input placeholder="Immatriculation" required value={nouveau.immatriculation} onChange={e => setNouveau({ ...nouveau, immatriculation: e.target.value })} />
          <input placeholder="Marque" required value={nouveau.marque} onChange={e => setNouveau({ ...nouveau, marque: e.target.value })} />
          <input placeholder="Modèle" required value={nouveau.modele} onChange={e => setNouveau({ ...nouveau, modele: e.target.value })} />
          <input placeholder="Année" type="number" value={nouveau.annee} onChange={e => setNouveau({ ...nouveau, annee: e.target.value })} />
          <select value={nouveau.type_carburant} onChange={e => setNouveau({ ...nouveau, type_carburant: e.target.value })}>
            <option value="essence">Essence</option>
            <option value="diesel">Diesel</option>
            <option value="electrique">Électrique</option>
          </select>
          <input placeholder="Kilométrage actuel" type="number" value={nouveau.kilometrage_actuel} onChange={e => setNouveau({ ...nouveau, kilometrage_actuel: e.target.value })} />
          <input placeholder="Consommation théorique (L/100km, optionnel)" type="number" step="0.1" value={nouveau.consommation_theorique_l_100km} onChange={e => setNouveau({ ...nouveau, consommation_theorique_l_100km: e.target.value })} />
          <button type="submit" style={{ gridColumn: 'span 3', background: 'var(--or)', border: 'none', padding: '0.6rem', borderRadius: 6, cursor: 'pointer' }}>
            Enregistrer
          </button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--texte-attenue)', fontSize: '0.85rem' }}>
            <th style={{ padding: '0.5rem' }}>Immatriculation</th>
            <th>Marque / Modèle</th>
            <th>Carburant</th>
            <th>Kilométrage</th>
            <th>Statut</th>
            <th>Documents</th>
          </tr>
        </thead>
        <tbody>
          {vehicules.map(v => {
            const statut = badgeStatut(v.statut)
            const docPire = documentsParVehicule[v.id]
            const badgeDocument = !docPire
              ? { texte: 'Aucun document', couleur: 'var(--texte-attenue)' }
              : docPire.statut_alerte === 'expire'
                ? { texte: 'Document expiré', couleur: 'var(--danger)' }
                : docPire.statut_alerte === 'alerte'
                  ? { texte: 'Échéance proche', couleur: 'var(--alerte)' }
                  : { texte: 'À jour', couleur: 'var(--succes)' }
            return (
              <tr key={v.id} style={{ borderTop: '1px solid var(--anthracite-700)' }}>
                <td style={{ padding: '0.6rem' }}>{v.immatriculation}</td>
                <td>{v.marque} {v.modele} {v.annee ? `(${v.annee})` : ''}</td>
                <td style={{ textTransform: 'capitalize' }}>{v.type_carburant}</td>
                <td>{v.kilometrage_actuel?.toLocaleString('fr-FR')} km</td>
                <td><span style={{ color: statut.couleur }}>● {statut.texte}</span></td>
                <td><span style={{ color: badgeDocument.couleur }}>● {badgeDocument.texte}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

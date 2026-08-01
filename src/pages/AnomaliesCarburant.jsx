import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const SEUIL_ECART = 1.2 // 20% au-dessus de la consommation théorique = anomalie

export default function AnomaliesCarburant() {
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => { analyser() }, [])

  async function analyser() {
    setChargement(true)
    const { data: missions } = await supabase
      .from('missions')
      .select('*, vehicules(immatriculation, consommation_theorique_l_100km), chauffeurs(nom)')
      .not('carburant_consomme_litres', 'is', null)
      .not('km_arrivee', 'is', null)
      .order('date_debut', { ascending: false })

    const resultats = (missions || []).map(m => {
      const km = m.km_arrivee - m.km_depart
      const theorique = m.vehicules?.consommation_theorique_l_100km
      const reelle = km > 0 ? (m.carburant_consomme_litres / km) * 100 : null
      const anomalie = theorique && reelle ? reelle > theorique * SEUIL_ECART : false
      const ecartPourcent = theorique && reelle ? Math.round(((reelle - theorique) / theorique) * 100) : null
      return { ...m, km, reelle, theorique, anomalie, ecartPourcent }
    }).filter(l => l.theorique) // ignore les véhicules sans consommation théorique renseignée

    setLignes(resultats.sort((a, b) => (b.ecartPourcent || 0) - (a.ecartPourcent || 0)))
    setChargement(false)
  }

  const anomalies = lignes.filter(l => l.anomalie)

  return (
    <div>
      <h2 style={{ marginBottom: '0.5rem' }}>Anomalies carburant</h2>
      <p style={{ color: 'var(--texte-attenue)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Compare la consommation réelle de chaque mission à la consommation théorique du véhicule.
        Un écart supérieur à {Math.round((SEUIL_ECART - 1) * 100)}% est signalé comme anomalie potentielle.
      </p>

      {!chargement && anomalies.length > 0 && (
        <div style={{ background: 'var(--alerte)', color: 'var(--anthracite-900)', padding: '0.8rem 1rem', borderRadius: 8, marginBottom: '1.2rem', fontWeight: 600 }}>
          ⚠ {anomalies.length} mission(s) avec une consommation anormalement élevée
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--texte-attenue)', fontSize: '0.85rem' }}>
            <th style={{ padding: '0.5rem' }}>Date</th>
            <th>Véhicule</th>
            <th>Chauffeur</th>
            <th>Km</th>
            <th>Conso. réelle</th>
            <th>Conso. théorique</th>
            <th>Écart</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map(l => (
            <tr key={l.id} style={{ borderTop: '1px solid var(--anthracite-700)', background: l.anomalie ? 'rgba(217, 83, 79, 0.1)' : 'transparent' }}>
              <td style={{ padding: '0.6rem' }}>{new Date(l.date_debut).toLocaleDateString('fr-FR')}</td>
              <td>{l.vehicules?.immatriculation}</td>
              <td>{l.chauffeurs?.nom}</td>
              <td>{l.km} km</td>
              <td>{l.reelle?.toFixed(1)} L/100km</td>
              <td>{l.theorique?.toFixed(1)} L/100km</td>
              <td style={{ color: l.anomalie ? 'var(--danger)' : 'var(--succes)', fontWeight: l.anomalie ? 700 : 400 }}>
                {l.ecartPourcent > 0 ? '+' : ''}{l.ecartPourcent}% {l.anomalie ? '⚠' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!chargement && lignes.length === 0 && (
        <p style={{ color: 'var(--texte-attenue)' }}>
          Aucune donnée exploitable : renseignez la consommation théorique des véhicules et le carburant consommé par mission pour activer cette analyse.
        </p>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function CarteKPI({ titre, valeur, unite }) {
  return (
    <div style={{ background: 'var(--anthracite-800)', padding: '1.2rem', borderRadius: 10, flex: 1, minWidth: 160 }}>
      <p style={{ color: 'var(--texte-attenue)', fontSize: '0.8rem', margin: 0 }}>{titre}</p>
      <p style={{ color: 'var(--or)', fontSize: '1.8rem', fontWeight: 700, margin: '0.3rem 0 0' }}>
        {valeur} <span style={{ fontSize: '1rem', color: 'var(--texte-attenue)' }}>{unite}</span>
      </p>
    </div>
  )
}

export default function Dashboard() {
  const [kpi, setKpi] = useState({ vehicules: 0, enPanne: 0, missionsEnCours: 0, coutTotal: 0 })

  useEffect(() => {
    chargerKPI()
  }, [])

  async function chargerKPI() {
    const { count: totalVehicules } = await supabase.from('vehicules').select('*', { count: 'exact', head: true })
    const { count: enPanne } = await supabase.from('vehicules').select('*', { count: 'exact', head: true }).eq('statut', 'en_panne')
    const { count: missionsEnCours } = await supabase.from('missions').select('*', { count: 'exact', head: true }).eq('statut', 'en_cours')
    const { data: pannes } = await supabase.from('pannes_reparations').select('cout')
    const coutTotal = (pannes || []).reduce((somme, p) => somme + (p.cout || 0), 0)

    setKpi({ vehicules: totalVehicules || 0, enPanne: enPanne || 0, missionsEnCours: missionsEnCours || 0, coutTotal })
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Tableau de bord</h2>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <CarteKPI titre="Véhicules au total" valeur={kpi.vehicules} unite="véhicules" />
        <CarteKPI titre="Véhicules en panne" valeur={kpi.enPanne} unite="" />
        <CarteKPI titre="Missions en cours" valeur={kpi.missionsEnCours} unite="" />
        <CarteKPI titre="Coût réparations cumulé" valeur={kpi.coutTotal.toLocaleString('fr-FR')} unite="FCFA" />
      </div>
    </div>
  )
}

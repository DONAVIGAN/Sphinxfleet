import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function RapportBailleur() {
  const [projets, setProjets] = useState([])
  const [projetId, setProjetId] = useState('')
  const [missions, setMissions] = useState([])
  const [pannes, setPannes] = useState([])
  const [chargement, setChargement] = useState(false)

  useEffect(() => { chargerProjets() }, [])

  async function chargerProjets() {
    const { data } = await supabase.from('projets').select('*').order('date_debut', { ascending: false })
    setProjets(data || [])
    if (data?.length) setProjetId(data[0].id)
  }

  useEffect(() => {
    if (projetId) chargerDonneesProjet()
  }, [projetId])

  async function chargerDonneesProjet() {
    setChargement(true)
    const { data: m } = await supabase
      .from('missions')
      .select('*, vehicules(immatriculation), chauffeurs(nom)')
      .eq('projet_id', projetId)
      .order('date_debut', { ascending: false })

    const { data: p } = await supabase
      .from('pannes_reparations')
      .select('*, vehicules(immatriculation)')
      .eq('projet_id', projetId)
      .order('date_panne', { ascending: false })

    setMissions(m || [])
    setPannes(p || [])
    setChargement(false)
  }

  const kmTotal = missions.reduce((s, m) => s + ((m.km_arrivee || m.km_depart) - m.km_depart), 0)
  const coutPannes = pannes.reduce((s, p) => s + (p.cout || 0), 0)
  const projetActuel = projets.find(p => p.id === projetId)

  function exporterPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Rapport bailleur — ${projetActuel?.nom || ''}`, 14, 18)
    doc.setFontSize(10)
    doc.text(`Bailleur : ${projetActuel?.bailleur || '—'}`, 14, 26)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 32)

    doc.text(`Total km parcourus : ${kmTotal.toLocaleString('fr-FR')} km`, 14, 42)
    doc.text(`Coût total réparations : ${coutPannes.toLocaleString('fr-FR')} FCFA`, 14, 48)
    doc.text(`Nombre de missions : ${missions.length}`, 14, 54)

    autoTable(doc, {
      startY: 62,
      head: [['Date', 'Véhicule', 'Chauffeur', 'Trajet', 'Km']],
      body: missions.map(m => [
        new Date(m.date_debut).toLocaleDateString('fr-FR'),
        m.vehicules?.immatriculation || '',
        m.chauffeurs?.nom || '',
        `${m.origine} → ${m.destination}`,
        m.km_arrivee ? m.km_arrivee - m.km_depart : '—'
      ])
    })

    if (pannes.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Date', 'Véhicule', 'Description', 'Coût (FCFA)']],
        body: pannes.map(p => [
          new Date(p.date_panne).toLocaleDateString('fr-FR'),
          p.vehicules?.immatriculation || '',
          p.description,
          p.cout ? p.cout.toLocaleString('fr-FR') : '—'
        ])
      })
    }

    doc.save(`rapport-${projetActuel?.nom || 'projet'}.pdf`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Rapport bailleur</h2>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <select value={projetId} onChange={e => setProjetId(e.target.value)} style={{ padding: '0.4rem' }}>
            {projets.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
          <button onClick={exporterPDF} disabled={!projetId || chargement} style={{ background: 'var(--or)', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>
            Exporter PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--anthracite-800)', padding: '1rem', borderRadius: 10, flex: 1 }}>
          <p style={{ color: 'var(--texte-attenue)', fontSize: '0.8rem', margin: 0 }}>Km parcourus</p>
          <p style={{ color: 'var(--or)', fontSize: '1.5rem', fontWeight: 700, margin: '0.3rem 0 0' }}>{kmTotal.toLocaleString('fr-FR')} km</p>
        </div>
        <div style={{ background: 'var(--anthracite-800)', padding: '1rem', borderRadius: 10, flex: 1 }}>
          <p style={{ color: 'var(--texte-attenue)', fontSize: '0.8rem', margin: 0 }}>Coût réparations</p>
          <p style={{ color: 'var(--or)', fontSize: '1.5rem', fontWeight: 700, margin: '0.3rem 0 0' }}>{coutPannes.toLocaleString('fr-FR')} FCFA</p>
        </div>
        <div style={{ background: 'var(--anthracite-800)', padding: '1rem', borderRadius: 10, flex: 1 }}>
          <p style={{ color: 'var(--texte-attenue)', fontSize: '0.8rem', margin: 0 }}>Missions</p>
          <p style={{ color: 'var(--or)', fontSize: '1.5rem', fontWeight: 700, margin: '0.3rem 0 0' }}>{missions.length}</p>
        </div>
      </div>

      <p style={{ color: 'var(--texte-attenue)', fontSize: '0.85rem' }}>
        Note : seules les missions et pannes explicitement rattachées à ce projet (champ "projet_id") apparaissent ici.
      </p>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { ajouterEnAttente } from '../lib/offlineQueue'

export default function BoutonSOS() {
  const { profil } = useAuth()
  const [enCours, setEnCours] = useState(false)
  const [confirme, setConfirme] = useState(false)

  async function declencherSOS() {
    setEnCours(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const alerte = {
          chauffeur_id: profil.chauffeur_id, // résolu via jointure utilisateurs -> chauffeurs
          vehicule_id: profil.vehicule_assigne_id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          statut: 'declenchee'
        }

        if (navigator.onLine) {
          const { error } = await supabase.from('alertes_sos').insert(alerte)
          if (error) await ajouterEnAttente('alertes_sos', 'insert', alerte)
        } else {
          // Hors-ligne : mise en file, synchronisation automatique à la reconnexion.
          // Prévoir en V2 un fallback SMS direct (sans data) pour ce cas précis.
          await ajouterEnAttente('alertes_sos', 'insert', alerte)
        }

        setConfirme(true)
        setEnCours(false)
        setTimeout(() => setConfirme(false), 4000)
      },
      () => {
        alert("Impossible d'obtenir la position. Réessayez ou contactez directement votre superviseur.")
        setEnCours(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <button
      className="bouton-sos"
      onClick={declencherSOS}
      disabled={enCours}
      aria-label="Déclencher une alerte SOS"
    >
      {confirme ? 'Envoyé ✓' : enCours ? '...' : 'SOS'}
    </button>
  )
}

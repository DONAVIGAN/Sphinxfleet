import { useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { ajouterEnAttente } from './offlineQueue'

const INTERVALLE_MS = 2 * 60 * 1000 // position envoyée toutes les 2 minutes

// À utiliser dans la page Missions pendant qu'une mission est 'en_cours'.
// Envoie la position régulièrement ; met en file d'attente si hors-ligne.
export function useSuiviPosition({ actif, vehiculeId, missionId }) {
  const intervalleRef = useRef(null)

  useEffect(() => {
    if (!actif || !vehiculeId) return

    async function envoyerPosition() {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const donnees = {
            vehicule_id: vehiculeId,
            mission_id: missionId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: 'smartphone'
          }

          if (navigator.onLine) {
            const { error } = await supabase.from('positions_vehicules').insert(donnees)
            if (error) await ajouterEnAttente('positions_vehicules', 'insert', donnees)
          } else {
            await ajouterEnAttente('positions_vehicules', 'insert', donnees)
          }
        },
        () => { /* échec silencieux : on retentera au prochain intervalle */ },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      )
    }

    envoyerPosition() // premier envoi immédiat
    intervalleRef.current = setInterval(envoyerPosition, INTERVALLE_MS)

    return () => clearInterval(intervalleRef.current)
  }, [actif, vehiculeId, missionId])
}

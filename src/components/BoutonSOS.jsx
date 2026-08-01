import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { ajouterEnAttente } from '../lib/offlineQueue'

export default function BoutonSOS() {
  const { profil } = useAuth()
  const [enCours, setEnCours] = useState(false)
  const [confirme, setConfirme] = useState(false)
  const [enAttenteReseau, setEnAttenteReseau] = useState(false)

  // `alertes_sos.vehicule_id` et `chauffeur_id` sont `not null` en base. Si le profil
  // n'a pas de fiche chauffeur liée (ou pas de véhicule assigné), l'insertion est
  // vouée à échouer : autant le dire tout de suite au chauffeur plutôt que de lui
  // afficher une confirmation mensongère sur une fonction d'urgence.
  const profilIncomplet = !profil?.chauffeur_id || !profil?.vehicule_assigne_id

  async function declencherSOS() {
    if (profilIncomplet) {
      alert(
        "Votre compte n'est pas rattaché à un chauffeur et à un véhicule : l'alerte SOS " +
        'ne peut pas être enregistrée.\n\n' +
        'Contactez immédiatement votre superviseur par téléphone, et demandez à ' +
        "l'administrateur de compléter votre fiche."
      )
      return
    }

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
          if (error) {
            // Échec en ligne : la donnée est valide (profil vérifié plus haut), donc
            // la panne est côté réseau/serveur → la file d'attente a du sens.
            console.error('Échec envoi alerte SOS, mise en file:', error)
            await ajouterEnAttente('alertes_sos', 'insert', alerte)
            setEnAttenteReseau(true)
            setEnCours(false)
            return
          }
          setConfirme(true)
        } else {
          // Hors-ligne : mise en file, synchronisation automatique à la reconnexion.
          // Prévoir en V2 un fallback SMS direct (sans data) pour ce cas précis.
          await ajouterEnAttente('alertes_sos', 'insert', alerte)
          setEnAttenteReseau(true)
          setEnCours(false)
          return
        }

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

  // Une alerte en file n'a PAS encore atteint les secours : le message doit le dire
  // clairement et rester affiché (pas d'auto-effacement) tant que ce n'est pas parti.
  if (enAttenteReseau) {
    return (
      <div
        role="alert"
        style={{
          background: 'var(--alerte)', color: 'var(--anthracite-900)', padding: '0.8rem 1rem',
          borderRadius: 10, maxWidth: 280, fontSize: '0.85rem', fontWeight: 600
        }}
      >
        Alerte en attente d'envoi (pas de réseau).<br />
        <span style={{ fontWeight: 400 }}>
          Elle partira dès le retour de la connexion. <strong>Appelez votre superviseur
          par téléphone sans attendre.</strong>
        </span>
        <button
          onClick={() => setEnAttenteReseau(false)}
          style={{ display: 'block', marginTop: '0.6rem', background: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.7rem', cursor: 'pointer' }}
        >
          Fermer
        </button>
      </div>
    )
  }

  return (
    <button
      className="bouton-sos"
      onClick={declencherSOS}
      disabled={enCours}
      // Volontairement cliquable même si le profil est incomplet : le clic explique
      // alors quoi faire, au lieu de laisser un bouton inerte sans justification.
      title={profilIncomplet ? 'Compte non rattaché à un véhicule — voir le message au clic' : 'Déclencher une alerte SOS'}
      aria-label="Déclencher une alerte SOS"
    >
      {confirme ? 'Envoyé ✓' : enCours ? '...' : 'SOS'}
    </button>
  )
}

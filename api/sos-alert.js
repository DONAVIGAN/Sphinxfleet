// api/sos-alert.js
//
// Déclenchement : configurer un "Database Webhook" dans Supabase
//   Table : alertes_sos | Événement : INSERT | URL : https://<votre-app>.vercel.app/api/sos-alert
//   Header : "x-webhook-secret: <SOS_WEBHOOK_SECRET>"
//
// Variables d'environnement Vercel requises :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (clé service_role, jamais exposée au frontend)
//   SOS_WEBHOOK_SECRET                        (partagé avec le webhook Supabase)
//   ZAPIER_SOS_WEBHOOK_URL                    (webhook Zapier "Catch Hook" qui déclenche l'envoi SMS)

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' })
  }

  // Vérification du secret partagé pour s'assurer que l'appel vient bien de Supabase
  if (req.headers['x-webhook-secret'] !== process.env.SOS_WEBHOOK_SECRET) {
    return res.status(401).json({ erreur: 'Secret invalide' })
  }

  const alerte = req.body?.record
  if (!alerte) {
    return res.status(400).json({ erreur: 'Payload invalide : aucune alerte reçue' })
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Récupère le véhicule pour connaître l'organisation et le site concernés
    const { data: vehicule } = await supabaseAdmin
      .from('vehicules')
      .select('organisation_id, site_id, immatriculation')
      .eq('id', alerte.vehicule_id)
      .single()

    const { data: chauffeur } = await supabaseAdmin
      .from('chauffeurs')
      .select('nom, telephone')
      .eq('id', alerte.chauffeur_id)
      .single()

    // Destinataires : admin_flotte (toute l'organisation) + superviseur du même site
    const { data: destinataires } = await supabaseAdmin
      .from('utilisateurs')
      .select('nom, telephone, role')
      .eq('organisation_id', vehicule.organisation_id)
      .in('role', ['admin_flotte', 'superviseur'])

    const lienCarte = `https://www.google.com/maps?q=${alerte.latitude},${alerte.longitude}`
    const message = `🚨 ALERTE SOS — ${vehicule.immatriculation} — Chauffeur: ${chauffeur?.nom || 'inconnu'} — Position: ${lienCarte}`

    // Envoi SMS via Zapier (relais vers votre provider SMS habituel, ex: orange/MTN gateway)
    if (process.env.ZAPIER_SOS_WEBHOOK_URL) {
      await fetch(process.env.ZAPIER_SOS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinataires: (destinataires || []).map(d => d.telephone).filter(Boolean),
          message,
          vehicule_id: alerte.vehicule_id,
          alerte_id: alerte.id
        })
      })
    }

    return res.status(200).json({ ok: true, notifies: destinataires?.length || 0 })
  } catch (erreur) {
    console.error('Erreur traitement alerte SOS:', erreur)
    return res.status(500).json({ erreur: 'Échec du traitement de l\'alerte' })
  }
}

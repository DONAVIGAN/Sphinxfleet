// api/alertes-echeances.js
//
// Déclenchement : Vercel Cron (voir vercel.json), exécution quotidienne.
// Rôle : scanner les documents véhicule (assurance, visite technique, vignette,
// carte grise) et les permis chauffeur, et notifier les admins/superviseurs
// à J-30, J-15, J-7, J-3, J-1 et à l'expiration.
//
// Variables d'environnement Vercel requises :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   CRON_SECRET                  (injecté automatiquement par Vercel Cron ; vérifie que l'appel vient bien du cron)
//   ZAPIER_ALERTES_WEBHOOK_URL   (même pattern que le SOS : Catch Hook -> SMS/email)

import { createClient } from '@supabase/supabase-js'

const SEUILS_JOURS = [30, 15, 7, 3, 1, 0]

function joursRestants(dateExpiration) {
  const aujourdHui = new Date()
  aujourdHui.setHours(0, 0, 0, 0)
  const expiration = new Date(dateExpiration)
  expiration.setHours(0, 0, 0, 0)
  return Math.round((expiration - aujourdHui) / (1000 * 60 * 60 * 24))
}

const LIBELLES_DOCUMENT = {
  assurance: 'Assurance',
  visite_technique: 'Visite technique',
  vignette: 'Vignette',
  carte_grise: 'Carte grise'
}

export default async function handler(req, res) {
  // Vercel Cron ajoute automatiquement ce header "Authorization: Bearer <CRON_SECRET>"
  // dès que la variable d'environnement CRON_SECRET est définie dans le projet Vercel.
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ erreur: 'Secret invalide' })
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const alertesParOrganisation = {} // { organisation_id: [ "texte alerte", ... ] }

  // --- 1. Documents véhicule ---
  const { data: documents } = await supabaseAdmin
    .from('documents_vehicule')
    .select('id, type_document, date_expiration, vehicules(organisation_id, immatriculation)')

  for (const doc of documents || []) {
    const jours = joursRestants(doc.date_expiration)
    const orgId = doc.vehicules?.organisation_id
    if (!orgId) continue

    // Met à jour le statut visuel dans tous les cas (utile pour l'affichage dans l'app)
    const nouveauStatut = jours < 0 ? 'expire' : jours <= 30 ? 'alerte' : 'ok'
    await supabaseAdmin.from('documents_vehicule').update({ statut_alerte: nouveauStatut }).eq('id', doc.id)

    if (SEUILS_JOURS.includes(jours) || jours < 0) {
      const libelle = LIBELLES_DOCUMENT[doc.type_document] || doc.type_document
      const texte = jours < 0
        ? `⛔ ${libelle} du véhicule ${doc.vehicules.immatriculation} est EXPIRÉ(E) depuis ${Math.abs(jours)} jour(s).`
        : `⚠️ ${libelle} du véhicule ${doc.vehicules.immatriculation} expire dans ${jours} jour(s).`
      alertesParOrganisation[orgId] = alertesParOrganisation[orgId] || []
      alertesParOrganisation[orgId].push(texte)
    }
  }

  // --- 2. Permis chauffeurs ---
  const { data: chauffeurs } = await supabaseAdmin
    .from('chauffeurs')
    .select('id, nom, date_expiration_permis, organisation_id')
    .not('date_expiration_permis', 'is', null)

  for (const chauffeur of chauffeurs || []) {
    const jours = joursRestants(chauffeur.date_expiration_permis)
    if (SEUILS_JOURS.includes(jours) || jours < 0) {
      const texte = jours < 0
        ? `⛔ Permis de ${chauffeur.nom} EXPIRÉ depuis ${Math.abs(jours)} jour(s).`
        : `⚠️ Permis de ${chauffeur.nom} expire dans ${jours} jour(s).`
      alertesParOrganisation[chauffeur.organisation_id] = alertesParOrganisation[chauffeur.organisation_id] || []
      alertesParOrganisation[chauffeur.organisation_id].push(texte)
    }
  }

  // --- 3. Envoi groupé par organisation ---
  let organisationsNotifiees = 0
  for (const [organisationId, messages] of Object.entries(alertesParOrganisation)) {
    const { data: destinataires } = await supabaseAdmin
      .from('utilisateurs')
      .select('nom, telephone, role')
      .eq('organisation_id', organisationId)
      .in('role', ['admin_flotte', 'superviseur'])

    if (process.env.ZAPIER_ALERTES_WEBHOOK_URL && destinataires?.length) {
      await fetch(process.env.ZAPIER_ALERTES_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinataires: destinataires.map(d => d.telephone).filter(Boolean),
          messages,
          organisation_id: organisationId
        })
      })
      organisationsNotifiees++
    }
  }

  return res.status(200).json({
    ok: true,
    documentsAnalyses: documents?.length || 0,
    chauffeursAnalyses: chauffeurs?.length || 0,
    organisationsNotifiees
  })
}

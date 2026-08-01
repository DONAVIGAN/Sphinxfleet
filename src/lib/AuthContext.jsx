import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

// Fournit : session, profil utilisateur (rôle, organisation_id, site_id), état de chargement
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profil, setProfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) chargerProfil(data.session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) chargerProfil(newSession.user.id)
      else {
        setProfil(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function chargerProfil(userId) {
    // Jointure utilisateurs -> chauffeurs : nécessaire pour que le chauffeur connecté
    // connaisse son propre chauffeur_id et le véhicule qui lui est assigné
    // (utilisés par BoutonSOS et Missions pour créer des lignes qui passent les RLS).
    const { data, error } = await supabase
      .from('utilisateurs')
      .select('*, organisations(*), chauffeurs(id, vehicule_assigne_id)')
      .eq('id', userId)
      .single()

    if (!error && data) {
      const chauffeur = Array.isArray(data.chauffeurs) ? data.chauffeurs[0] : data.chauffeurs
      setProfil({
        ...data,
        chauffeur_id: chauffeur?.id ?? null,
        vehicule_assigne_id: chauffeur?.vehicule_assigne_id ?? null
      })
    }
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ session, profil, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// Vérifie si le rôle courant fait partie d'une liste autorisée
export function useHasRole(rolesAutorises) {
  const { profil } = useAuth()
  return profil ? rolesAutorises.includes(profil.role) : false
}

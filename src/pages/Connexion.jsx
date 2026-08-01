import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Connexion() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState(null)
  const navigate = useNavigate()

  async function seConnecter(e) {
    e.preventDefault()
    setErreur(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    if (error) setErreur("Identifiants incorrects. Vérifiez votre email et mot de passe.")
    else navigate('/')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--anthracite-900)' }}>
      <form onSubmit={seConnecter} style={{ background: 'var(--anthracite-800)', padding: '2.5rem', borderRadius: 10, width: 320 }}>
        <h1 style={{ color: 'var(--or)', marginBottom: '1.5rem', textAlign: 'center' }}>SphinxFleet</h1>
        <label style={{ display: 'block', marginBottom: 6, color: 'var(--texte-attenue)', fontSize: '0.85rem' }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', borderRadius: 6, border: '1px solid var(--anthracite-600)', background: 'var(--anthracite-700)', color: 'var(--texte-clair)' }}
        />
        <label style={{ display: 'block', marginBottom: 6, color: 'var(--texte-attenue)', fontSize: '0.85rem' }}>Mot de passe</label>
        <input
          type="password"
          value={motDePasse}
          onChange={e => setMotDePasse(e.target.value)}
          required
          style={{ width: '100%', padding: '0.6rem', marginBottom: '1.2rem', borderRadius: 6, border: '1px solid var(--anthracite-600)', background: 'var(--anthracite-700)', color: 'var(--texte-clair)' }}
        />
        {erreur && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{erreur}</p>}
        <button type="submit" style={{ width: '100%', padding: '0.7rem', background: 'var(--or)', color: 'var(--anthracite-900)', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          Se connecter
        </button>
      </form>
    </div>
  )
}

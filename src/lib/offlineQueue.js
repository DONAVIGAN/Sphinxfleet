// File d'attente locale (IndexedDB) : permet de créer missions/pannes/positions
// même hors-ligne, puis de synchroniser vers Supabase à la reconnexion.

const DB_NAME = 'sphinxfleet-offline'
const STORE_NAME = 'file_attente'

function ouvrirDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Ajoute une opération en attente : { table: 'missions', operation: 'insert', payload: {...} }
export async function ajouterEnAttente(table, operation, payload) {
  const db = await ouvrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add({ table, operation, payload, timestamp: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function listerEnAttente() {
  const db = await ouvrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function supprimerDeAttente(id) {
  const db = await ouvrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// À appeler au retour de connexion (window 'online' event) : rejoue la file vers Supabase
export async function synchroniserFileAttente(supabase) {
  const enAttente = await listerEnAttente()
  for (const item of enAttente) {
    const { error } = await supabase.from(item.table).insert(item.payload)
    if (!error) await supprimerDeAttente(item.id)
  }
  return enAttente.length
}

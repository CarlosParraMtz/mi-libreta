import { getStorage } from 'firebase/storage'
import { firebaseApp } from './firebase'

// Importa este módulo cuando se agreguen fotos de productos o comprobantes.
export const storage = firebaseApp ? getStorage(firebaseApp) : null

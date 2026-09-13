import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth } from '../firebase'

// Tracks the current signed-in user; components re-render whenever auth state changes.
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
  }, [])

  const signInWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider())
  const signOutUser = () => signOut(auth)

  return { user, loading, signInWithGoogle, signOutUser }
}

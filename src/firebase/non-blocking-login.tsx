'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
  FirebaseError,
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(
  authInstance: Auth, 
  email: string, 
  password: string,
  onSuccess: (userCredential: UserCredential) => void,
  onFailure: (error: FirebaseError) => void
): void {
  createUserWithEmailAndPassword(authInstance, email, password)
    .then(onSuccess)
    .catch(onFailure);
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(
  authInstance: Auth, 
  email: string, 
  password: string,
  onSuccess: (userCredential: UserCredential) => void,
  onFailure: (error: FirebaseError) => void
): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .then(onSuccess)
    .catch(onFailure);
}

/** Initiate Google sign-in (non-blocking). */
export function initiateGoogleSignIn(
  authInstance: Auth,
  onSuccess: (userCredential: UserCredential) => void,
  onFailure: (error: FirebaseError) => void
): void {
  const provider = new GoogleAuthProvider();
  signInWithPopup(authInstance, provider)
    .then(onSuccess)
    .catch(onFailure);
}

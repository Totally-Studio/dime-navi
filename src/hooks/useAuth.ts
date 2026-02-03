import { useState, useEffect, useMemo, useCallback } from 'react';
import { auth, createUserDocumentIfNeeded, linkAnonymousToGoogle } from '../../services/firebaseConfig';
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';

/**
 * Custom hook for managing Firebase authentication state
 * Provides Google sign-in, sign-out, and user state tracking
 */
const INTERACTION_THRESHOLD = 3;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [interactionCount, setInteractionCount] = useState(0);
  const [hasSeenSignInPrompt, setHasSeenSignInPrompt] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Track user interactions (call after AI responses)
   */
  const trackInteraction = useCallback(() => {
    setInteractionCount(prev => prev + 1);
  }, []);

  /**
   * Check if should show sign-in prompt
   * Shows after 3 interactions for anonymous users who haven't dismissed
   */
  const shouldPromptSignIn = useMemo(() => {
    return user?.isAnonymous === true &&
           interactionCount >= INTERACTION_THRESHOLD &&
           !hasSeenSignInPrompt;
  }, [user, interactionCount, hasSeenSignInPrompt]);

  /**
   * Dismiss the sign-in prompt for this session
   */
  const dismissSignInPrompt = useCallback(() => {
    setHasSeenSignInPrompt(true);
  }, []);

  /**
   * Sign in with Google OAuth popup
   */
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection every time
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);

      // Create/update user document with standarduser role
      await createUserDocumentIfNeeded(result.user, 'google');
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  /**
   * Sign out the current user
   */
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  /**
   * Upgrade anonymous account to Google (preserves UID and data)
   * Falls back to regular sign-in if not anonymous
   */
  const upgradeToGoogle = async () => {
    try {
      if (user?.isAnonymous) {
        await linkAnonymousToGoogle();
      } else {
        await signInWithGoogle();
      }
      setHasSeenSignInPrompt(true);
    } catch (error: any) {
      // auth/credential-already-in-use means Google account exists
      // Caller should handle this case (e.g., offer to sign in instead)
      throw error;
    }
  };

  return {
    user,
    loading,
    isAnonymous: user?.isAnonymous ?? true,
    signInWithGoogle,
    logout,
    // New: interaction tracking and smart prompts
    trackInteraction,
    interactionCount,
    shouldPromptSignIn,
    dismissSignInPrompt,
    upgradeToGoogle,
  };
}

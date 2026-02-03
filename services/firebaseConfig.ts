import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, setPersistence, browserLocalPersistence, User, linkWithPopup, GoogleAuthProvider, signInWithCredential, signInWithPopup, updateProfile } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dimenotesv2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dimenotesv2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dimenotesv2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "253073039735",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:253073039735:web:3d99ae9f1c09dff11b8172",
};

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
  throw new Error("Firebase API key is not configured. Please replace 'YOUR_API_KEY' in firebaseConfig.ts with your actual Firebase API key.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Set auth persistence to LOCAL (survives browser close and refresh)
// Note: In incognito/private browsing, this will still clear on window close
// IMPORTANT: Auth functions must await this before any sign-in operations
export const persistenceReady = setPersistence(auth, browserLocalPersistence)
  .then(() => console.log('Auth persistence set to LOCAL'))
  .catch((error) => console.error('Failed to set auth persistence:', error));

/**
 * Creates a user document in Firestore if it doesn't already exist
 * @param user - Firebase Auth user
 * @param authMethod - 'anonymous' | 'google'
 */
export const createUserDocumentIfNeeded = async (
  user: User,
  authMethod: 'anonymous' | 'google'
): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create new user document with default role
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        role: authMethod === 'anonymous' ? 'anonymous' : 'standarduser',
        authMethod,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
      console.log(`User document created for ${user.uid} with role: ${authMethod === 'anonymous' ? 'anonymous' : 'standarduser'}`);
    } else {
      // Update last login timestamp
      await setDoc(userDocRef, {
        lastLoginAt: serverTimestamp(),
      }, { merge: true });
      console.log(`User ${user.uid} document updated with last login`);
    }
  } catch (error) {
    console.error('Error creating/updating user document:', error);
  }
};

// Sign in anonymously for widget users
export const signInAnonymouslyIfNeeded = async () => {
  await persistenceReady;
  if (!auth.currentUser) {
    try {
      const result = await signInAnonymously(auth);
      console.log('Anonymous user signed in:', result.user.uid);

      // Create user document with anonymous role
      await createUserDocumentIfNeeded(result.user, 'anonymous');

      return result.user;
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
      return null;
    }
  }
  return auth.currentUser;
};

/**
 * Links an anonymous account to a Google account, or signs in with existing Google account
 * If the Google account already exists, signs in with it (losing anonymous session data)
 * @returns The linked/signed-in user, or null if not anonymous
 */
export const linkAnonymousToGoogle = async (): Promise<User | null> => {
  await persistenceReady;
  const currentUser = auth.currentUser;

  if (!currentUser || !currentUser.isAnonymous) {
    return null;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    // Try to link the anonymous account to Google
    const result = await linkWithPopup(currentUser, provider);

    // Ensure Firebase Auth profile has displayName and photoURL from Google
    if (result.user.displayName || result.user.photoURL) {
      await updateProfile(result.user, {
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      });
    }

    // Update user document: change role from 'anonymous' to 'standarduser'
    await setDoc(doc(db, 'users', result.user.uid), {
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
      role: 'standarduser',
      authMethod: 'google',
      linkedAt: serverTimestamp(),
    }, { merge: true });

    console.log(`Anonymous account ${result.user.uid} linked to Google`);
    return result.user;
  } catch (error: any) {
    // If the Google account is already in use, sign in with it instead
    if (error.code === 'auth/credential-already-in-use') {
      console.log('Google account already exists, signing in with existing account...');

      // Get the credential from the error
      const credential = GoogleAuthProvider.credentialFromError(error);

      if (credential) {
        // Sign in with the existing Google account
        const signInResult = await signInWithCredential(auth, credential);

        // Ensure Firebase Auth profile has displayName and photoURL
        if (signInResult.user.displayName || signInResult.user.photoURL) {
          await updateProfile(signInResult.user, {
            displayName: signInResult.user.displayName,
            photoURL: signInResult.user.photoURL,
          });
        }

        // Update last login for the existing user
        await setDoc(doc(db, 'users', signInResult.user.uid), {
          lastLoginAt: serverTimestamp(),
        }, { merge: true });

        console.log(`Signed in with existing Google account: ${signInResult.user.uid}`);
        return signInResult.user;
      } else {
        // If we can't get the credential, use popup sign-in as fallback
        console.log('Could not extract credential, using popup sign-in...');
        const signInResult = await signInWithPopup(auth, provider);

        // Ensure Firebase Auth profile has displayName and photoURL
        if (signInResult.user.displayName || signInResult.user.photoURL) {
          await updateProfile(signInResult.user, {
            displayName: signInResult.user.displayName,
            photoURL: signInResult.user.photoURL,
          });
        }

        await setDoc(doc(db, 'users', signInResult.user.uid), {
          lastLoginAt: serverTimestamp(),
        }, { merge: true });

        console.log(`Signed in with Google popup: ${signInResult.user.uid}`);
        return signInResult.user;
      }
    }

    console.error('Error linking anonymous account to Google:', error);
    throw error;
  }
};

export default app;
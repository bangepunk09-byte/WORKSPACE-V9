import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
let cachedAccessToken = null;
let manualConnectedUser = null;

try {
  const savedToken = localStorage.getItem('circle_google_access_token');
  const savedUser = localStorage.getItem('circle_google_user');
  if (savedToken) cachedAccessToken = savedToken;
  if (savedUser) manualConnectedUser = JSON.parse(savedUser);
} catch {}

export const initAuth = (onAuthSuccess, onAuthFailure) => {
  if (cachedAccessToken && manualConnectedUser) {
    if (onAuthSuccess) onAuthSuccess(manualConnectedUser, cachedAccessToken);
  }
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = `firebase_token_${user.uid}`;
        try { localStorage.setItem('circle_google_access_token', cachedAccessToken); } catch {}
      }
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (cachedAccessToken && manualConnectedUser) {
      if (onAuthSuccess) onAuthSuccess(manualConnectedUser, cachedAccessToken);
    } else if (!isSigningIn) {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const setManualGoogleAuth = (userObj = {}, token = null) => {
  const tok = token || `gcal_workspace_sync_${Date.now()}`;
  cachedAccessToken = tok;
  manualConnectedUser = {
    email: userObj.email || 'be.creativestudio21@gmail.com',
    displayName: userObj.name || userObj.displayName || 'Workspace User',
    photoURL: userObj.picture || userObj.avatar || '',
  };
  try {
    localStorage.setItem('circle_google_access_token', tok);
    localStorage.setItem('circle_google_user', JSON.stringify(manualConnectedUser));
  } catch {}
  return { user: manualConnectedUser, accessToken: tok };
};

export const googleSignIn = async () => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const tok = credential?.accessToken || `firebase_token_${result.user?.uid || Date.now()}`;
    cachedAccessToken = tok;
    manualConnectedUser = {
      email: result.user?.email || '',
      displayName: result.user?.displayName || '',
      photoURL: result.user?.photoURL || '',
    };
    try {
      localStorage.setItem('circle_google_access_token', tok);
      localStorage.setItem('circle_google_user', JSON.stringify(manualConnectedUser));
    } catch {}
    return { user: result.user, accessToken: cachedAccessToken, isRealOAuth: Boolean(credential?.accessToken) };
  } catch (error) {
    console.warn('Google popup sign-in note:', error?.code || error?.message);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async () => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const saved = localStorage.getItem('circle_google_access_token');
    if (saved) {
      cachedAccessToken = saved;
      return saved;
    }
  } catch {}
  return null;
};

export const hasAccessToken = () => Boolean(cachedAccessToken);

export const logout = async () => {
  try { await auth.signOut(); } catch {}
  cachedAccessToken = null;
  manualConnectedUser = null;
  try {
    localStorage.removeItem('circle_google_access_token');
    localStorage.removeItem('circle_google_user');
  } catch {}
};



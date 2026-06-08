const AUTH_KEY = 'nutriscan_auth_user';
const PROFILE_KEY = 'nutriscan_user_profile';

export function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user || null));
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_KEY);
}

export function getUserProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUserProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile || null));
}

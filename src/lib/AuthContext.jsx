import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getSheetKey, getSheetUrl, saveSheetLink } from '@/lib/sheet-link';

// "Signed in" = this browser has the sheet's link + key and the sheet accepts them.
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(async () => {
    if (!getSheetUrl() || !getSheetKey()) {
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return false;
    }
    setIsLoadingAuth(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      setIsAuthenticated(true);
      setAuthError(null);
      return true;
    } catch (error) {
      setIsAuthenticated(false);
      setAuthError({ type: error.status === 401 ? 'auth_required' : 'unknown', message: error.message });
      return false;
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => { checkUserAuth(); }, [checkUserAuth]);

  const login = async ({ url, key }) => {
    saveSheetLink({ url, key });
    const ok = await checkUserAuth();
    if (!ok) saveSheetLink({ key: '' });
    return ok;
  };

  const logout = () => {
    saveSheetLink({ key: '' });
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      authChecked,
      login,
      logout,
      checkUserAuth,
      navigateToLogin: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

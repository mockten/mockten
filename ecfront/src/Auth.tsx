import React, { createContext, useContext, useEffect, useState } from 'react';
// Import helpers from apiClient
import { setTokens, clearTokens, getAccessToken } from './module/apiClient';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  // Updated signature to accept both tokens
  login: (token: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: false,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if access token exists on mount
    const token = getAccessToken();
    console.log("Auth check triggered, token exists:", !!token);
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // Explicitly save tokens here to ensure consistency
  const login = (token: string, refreshToken: string) => {
    console.log("Auth.login called");
    setTokens(token, refreshToken); // Save to localStorage
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearTokens();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
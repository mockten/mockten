import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './Auth';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <>{children}</> : <Navigate to="/user/login" />;
};

export default PrivateRoute;
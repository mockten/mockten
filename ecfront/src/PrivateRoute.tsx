import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './Auth';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  console.log("Private Route:" + isAuthenticated);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/user/login" />;
};

export default PrivateRoute;
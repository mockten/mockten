import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SearchResultDashboard from './pages/Dashboard';
import Login from './pages/Login';
import UserDetail from './pages/UserDetail';
import ItemDetail from './pages/ItemDetail';
import SellerDashboard from './pages/SellerDashboard';
import SellerLogin from './pages/SellerLogin';
import MyCartList from './pages/MyCartList';
import MyFavoriteList from './pages/MyFavoriteList';
import AdminLogin from './pages/AdminLogin';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminCreateSeller from './pages/AdminCreateSeller';
import AdminUpdateSeller from './pages/AdminUpdateSeller';
import AdminDeleteSeller from './pages/AdminDeleteSeller';
import Admin from './pages/Admin';
import PrivateRoute from './PrivateRoute';
import { AuthProvider } from './Auth';


import './App.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>}/>
          <Route path="/search" element={<PrivateRoute><SearchResultDashboard /></PrivateRoute>} />
          <Route path="/user/login" element={<PrivateRoute><Login /></PrivateRoute>} />
          <Route path="/user/:id" element={<PrivateRoute><UserDetail /></PrivateRoute>} />
          <Route path="/seller/login" element={<PrivateRoute><SellerLogin /></PrivateRoute>} />
          <Route path="/seller/:id" element={<PrivateRoute><SellerDashboard /></PrivateRoute>} />
          <Route path="/item/:id" element={<PrivateRoute><ItemDetail /></PrivateRoute>} />
          <Route path="/cart/list" element={<PrivateRoute><MyCartList /></PrivateRoute>} />
          <Route path="/fav/list" element={<PrivateRoute><MyFavoriteList /></PrivateRoute>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/user/create" element={<AdminCreateUser />} />
          <Route path="/admin/seller/create" element={<AdminCreateSeller />} />
          <Route path="/admin/seller/edit" element={<AdminUpdateSeller />} />
          <Route path="/admin/seller/delete" element={<AdminDeleteSeller />} />
          <Route path="/admin/" element={<Admin />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;

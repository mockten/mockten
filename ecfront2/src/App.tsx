import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SearchResultDashboard from './pages/SearchResultDashboard';
import UserLogin from './pages/UserLogin';
import UserSignUp from './pages/UserSignUp';
import AccountSettings from './pages/AccountSettings';
import ItemDetail from './pages/ItemDetail';
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerLogin from './pages/seller/SellerLogin';
import MyCartList from './pages/MyCartList';
import MyCartShipto from './pages/MyCartShipto';
import MyCartConfirm from './pages/MyCartConfirm';
import MyCartCheckout from './pages/MyCartCheckout';
import MyFavoriteList from './pages/MyFavoriteList';
import OrderHistory from './pages/OrderHistory';
import AdminLogin from './pages/admin/AdminLogin';
import AdminCreateUser from './pages/admin/AdminCreateUser';
import AdminCreateSeller from './pages/admin/AdminCreateSeller';
import AdminUpdateSeller from './pages/admin/AdminUpdateSeller';
import AdminDeleteSeller from './pages/admin/AdminDeleteSeller';
import Admin from './pages/admin/Admin';
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
          <Route path="/user/login" element={<UserLogin />} />
          <Route path="/user/signup" element={<UserSignUp />} />
          <Route path="/user/account-settings" element={<PrivateRoute><AccountSettings /></PrivateRoute>} />
          <Route path="/item/:id" element={<PrivateRoute><ItemDetail /></PrivateRoute>} />
          <Route path="/cart/list" element={<PrivateRoute><MyCartList /></PrivateRoute>} />
          <Route path="/cart/shipto" element={<PrivateRoute><MyCartShipto /></PrivateRoute>} />
          <Route path="/cart/confirm" element={<PrivateRoute><MyCartConfirm /></PrivateRoute>} />
          <Route path="/cart/checkout" element={<PrivateRoute><MyCartCheckout /></PrivateRoute>} />
          <Route path="/fav/list" element={<PrivateRoute><MyFavoriteList /></PrivateRoute>} />
          <Route path="/order-history" element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
          <Route path="/seller/login" element={<PrivateRoute><SellerLogin /></PrivateRoute>} />
          <Route path="/seller/:id" element={<PrivateRoute><SellerDashboard /></PrivateRoute>} />

          <Route path="/admin/" element={<Admin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/user/create" element={<AdminCreateUser />} />
          <Route path="/admin/seller/create" element={<AdminCreateSeller />} />
          <Route path="/admin/seller/edit" element={<AdminUpdateSeller />} />
          <Route path="/admin/seller/delete" element={<AdminDeleteSeller />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
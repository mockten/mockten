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


import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchResultDashboard />} />
        <Route path="/user/login" element={<Login />} />
        <Route path="/user/:id" element={<UserDetail />} />
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/seller/:id" element={<SellerDashboard />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/cart/list" element={<MyCartList />} />
        <Route path="/fav/list" element={<MyFavoriteList />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/user/create" element={<AdminCreateUser />} />
        <Route path="/admin/seller/create" element={<AdminCreateSeller />} />
        <Route path="/admin/seller/edit" element={<AdminUpdateSeller />} />
        <Route path="/admin/seller/delete" element={<AdminDeleteSeller />} />
        <Route path="/admin/" element={<Admin />} />
      </Routes>
    </Router>
  );
};

export default App;

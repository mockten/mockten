import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import First from './pages/First';
import Login from './pages/Login';
import UserDetail from './pages/UserDetail';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<First />} />
        <Route path="/rc" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/user/:id" element={<UserDetail />} />
      </Routes>
    </Router>
  );
};

export default App;

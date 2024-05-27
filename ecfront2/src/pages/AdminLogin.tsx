import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLoginPage: React.FC = () => {
    const [adminID, setAdminID] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmitUser = (e: FormEvent) => {
        e.preventDefault();
        
        if (adminID && password) {
            navigate('/admin');
        } else {
            // ログイン失敗の処理をここに書く
            alert('Invalid username or password');
        }
    };

    return (
        <div className="login-page">
            <h1>Mockten Admin Login</h1>
            <form onSubmit={handleSubmitUser}>
                <div className="form-group">
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        value={adminID}
                        onChange={(e) => setAdminID(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default AdminLoginPage;
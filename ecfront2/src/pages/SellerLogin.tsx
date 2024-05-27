import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
    const [sellername, setSellername] = useState('');
    const [sellerpassword, setSellerPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmitSeller = (e: FormEvent) => {
        e.preventDefault();
        
        if (sellername && sellerpassword) {
            navigate(`/seller?name=${encodeURIComponent(sellername)}`);
        } else {
            alert('Invalid sellername or password');
        }
    };

    return (
        <div className="login-page">
            <h2>Seller Login</h2>
            <h4>If you want to display your products</h4>
            <form onSubmit={handleSubmitSeller}>
                <div className="form-group">
                    <label htmlFor="username">SellerName:</label>
                    <input
                        type="text"
                        id="sellername"
                        value={sellername}
                        onChange={(e) => setSellername(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="sellerpassword"
                        value={sellerpassword}
                        onChange={(e) => setSellerPassword(e.target.value)}
                    />
                </div>
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default LoginPage;
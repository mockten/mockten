import React, { useState, FormEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [sellername, setSellername] = useState('');
    const [sellerpassword, setSellerPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: FormEvent, isSeller: boolean) => {
        e.preventDefault();
        const clientId = 'mockten-react-client'; 
        const clientSecret = 'mockten-client-secret';
        const realm = 'mockten-realm-dev';
        const url = `http://localhost:8080/realms/${realm}/protocol/openid-connect/token`;

        try {
            const response = await axios.post(url, new URLSearchParams({
                grant_type: 'password',
                client_id: clientId,
                client_secret: clientSecret,
                username: isSeller ? sellername : username,
                password: isSeller ? sellerpassword : password,
                scope: 'openid profile'
            }));

            const token = response.data.access_token;
            console.log('Token:', token);

            try {
                const userInfoResponse = await axios.get(
                    `http://localhost:8080/realms/${realm}/protocol/openid-connect/userinfo`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                console.log('UserInfo Response:', userInfoResponse);
                const userInfo = userInfoResponse.data;
                console.log('User Info:', userInfo);
                console.log('Status Code:', userInfoResponse.status);
                const roles = userInfo.roles || [];
                console.log('Roles:', roles);

                if (isSeller && !roles.includes('seller')) {
                    throw new Error('You are not authorized as a seller');
                }

                if (isSeller) {
                    navigate(`/seller?name=${encodeURIComponent(sellername)}`, { state: { token } });
                } else {
                    navigate('/d', { state: { token } });
                }
            } catch (userInfoError) {
                if (userInfoError.response) {
                    console.error('Failed to fetch user info:', userInfoError.response.data);
                    console.error('Status Code:', userInfoError.response.status);
                } else {
                    console.error('Failed to fetch user info:', userInfoError.message);
                }
                alert('Failed to fetch user info');
            }

        } catch (error) {
            console.error('Login failed:', error);
            alert(`Login failed: ${error.message}`);
        }
    };

    return (
        <div className="login-page">
            <h2>User Login</h2>
            <form onSubmit={(e) => handleLogin(e, false)}>
                <div className="form-group">
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
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
            <h2>Seller Login</h2>
            <h4>If you want to display your products</h4>
            <form onSubmit={(e) => handleLogin(e, true)}>
                <div className="form-group">
                    <label htmlFor="sellername">SellerName:</label>
                    <input
                        type="text"
                        id="sellername"
                        value={sellername}
                        onChange={(e) => setSellername(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="sellerpassword">Password:</label>
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

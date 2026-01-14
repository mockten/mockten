import React, { useState, FormEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Auth';
// Import setTokens helper from apiClient to ensure consistency
import { setTokens } from '../../module/apiClient'; 
import { Container, TextField, Button, Grid, Typography } from '@mui/material';

const SellerLogin: React.FC = () => {
    const [sellerID, setSellerID] = useState('');
    const [sellerpassword, setSellerPassword] = useState('');
    const navigate = useNavigate();
    const auth = useAuth();

    const handleLogin = async (e: FormEvent ) => {
        e.preventDefault();
        const url = `/api/uam/token`;


        try {
            const response = await axios.post(url, new URLSearchParams({
                username: sellerID,
                password: sellerpassword,
            }));

            // Extract both tokens
            const token = response.data.access_token;
            const refreshToken = response.data.refresh_token; // Added
            
            console.log('Token:', token);

            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const roles = decodedToken.roles || [];

            if (!roles.includes('seller')) {
              throw new Error('You are not authorized as a seller');
            }

            try {
                // Ideally, use apiClient.get here too, but axios is fine for login flow
                const userInfoResponse = await axios.get(
                    `/api/uam/userinfo`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const userInfo = userInfoResponse.data;
                console.log('User Info:', userInfo);

                // Save tokens to localStorage manually to be safe
                setTokens(token, refreshToken);

                // Pass BOTH tokens to Auth Context (Fixes CI Error)
                auth.login(token, refreshToken);

                navigate(`/seller?name=${encodeURIComponent(sellerID)}`, { state: { token } });

            } catch (userInfoError) {
                if (axios.isAxiosError(userInfoError)) {
                    console.error('Login failed:', userInfoError.response?.data);
                    console.error('Status Code:', userInfoError.response?.status);
                } else {
                    console.error('Login failed:', userInfoError);
                }
                alert(`Login failed: ${userInfoError instanceof Error ? userInfoError.message : 'Unauthorized error'}`);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Login failed:', error.response?.data);
            } else {
                console.error('Login failed:', error);
            }
            alert(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <Container maxWidth="sm">
        <Grid container spacing={3} direction="column" alignItems="center" justifyContent="center" style={{ minHeight: '100vh' }}>
          <Grid item>
            <Typography variant="h4">Seller Login</Typography>
          </Grid>
          <Grid item>
            <TextField
              label="Seller Mail Address"
              variant="outlined"
              fullWidth
              value={sellerID}
              onChange={(e) => setSellerID(e.target.value)}
            />
          </Grid>
          <Grid item>
            <TextField
              label="Password"
              variant="outlined"
              type="password"
              fullWidth
              value={sellerpassword}
              onChange={(e) => setSellerPassword(e.target.value)}
            />
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" onClick={handleLogin} fullWidth>
              Login
            </Button>
          </Grid>
        </Grid>
      </Container>
    );
};

export default SellerLogin;
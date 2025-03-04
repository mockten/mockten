import React, { useState, FormEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth';
import { Container, TextField, Button, Grid, Typography } from '@mui/material';

const LoginPage: React.FC = () => {
    const [userID, setUserID] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const auth = useAuth();

    const handleLogin = async (e: FormEvent ) => {
        e.preventDefault();
        const url = `/api/uam/token`;
        try {
            const response = await axios.post(url, new URLSearchParams({
                username: userID,
                password: password,
            }));

            const token = response.data.access_token;
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const roles = decodedToken.roles || [];
            console.log('Access Token:', token);
            console.log('roles', roles);

            if (!roles.includes('customer')) {
              throw new Error('You are not authorized as a customer');
            }

            try {
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

                auth.login(token);

                // navigate('/', { state: { token } });
                navigate('/');
                
            } catch (userInfoError) {
                if (axios.isAxiosError(userInfoError)) {
                    console.error('Login failed:', userInfoError.response?.data);
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
            <Typography variant="h4">User Login</Typography>
          </Grid>
          <Grid item>
            <TextField
              label="User ID"
              variant="outlined"
              fullWidth
              value={userID}
              onChange={(e) => setUserID(e.target.value)}
            />
          </Grid>
          <Grid item>
            <TextField
              label="Password"
              variant="outlined"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
export default LoginPage;
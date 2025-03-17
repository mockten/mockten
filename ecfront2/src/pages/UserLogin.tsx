import React, { useState, FormEvent } from 'react';
import { login } from '../module/login';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth';
import { Container, TextField, Button, Grid, Typography } from '@mui/material';

const UserLogin: React.FC = () => {
    const [userID, setUserID] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const auth = useAuth();

    const handleLogin = async (e: FormEvent ) => {
        e.preventDefault();
        try {
          const { token, userInfo } = await login(userID, password);
          console.log('User Info:', userInfo);
          const decodedToken = JSON.parse(atob(token.split('.')[1]));
          const roles = decodedToken.roles || [];
      
          if (!roles.includes('customer')) {
            throw new Error('You are not authorized as a customer');
          }
    
          auth.login(token); 
          navigate('/');
    
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Login failed');
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

export default UserLogin;
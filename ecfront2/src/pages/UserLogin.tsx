import React, { useState, useEffect, FormEvent } from 'react';
import { login } from '../module/login';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth';
import {
  Container,
  TextField,
  Button,
  Grid,
  Typography,
} from '@mui/material';

const REDIRECT_URI = `${window.location.origin}/user/login`;

const UserLogin: React.FC = () => {
  const [userID, setUserID] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const auth = useAuth();
  const [codeProcessed, setCodeProcessed] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { token } = await login(userID, password);
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

  const handleSignUp = () => {
    navigate('/user/signup');
  };

  const startGoogleAuth = (prompt: 'login') => {
    const qs = new URLSearchParams({
      response_type: 'code',
      scope: 'openid profile email',
      redirect_uri: REDIRECT_URI,
      kc_idp_hint: 'google',
      prompt,
    });
    window.location.href = `/api/uam/auth?${qs.toString()}`;
  };
  const startFacebookAuth = (prompt: 'login') => {
    const qs = new URLSearchParams({
      response_type: 'code',
      scope: 'openid profile email',
      redirect_uri: REDIRECT_URI,
      kc_idp_hint: 'facebook',
      prompt,
    });
    window.location.href = `/api/uam/auth?${qs.toString()}`;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code || codeProcessed) return;
    window.history.replaceState({}, document.title, window.location.pathname);
    setCodeProcessed(true);
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    });
    (async () => {
      try {
        const res = await fetch(
          `/api/uam/token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error_description || 'Token exchange failed');
        auth.login(data.access_token);
        navigate('/');
      } catch (err: any) {
        alert(err?.message || 'Google login failed');
      }
    })();
  }, [auth, navigate, codeProcessed]);

  return (
    <Container maxWidth="sm">
      <Grid
        container
        spacing={3}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: '100vh' }}
      >
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
        <Grid item>
          <Typography variant="body2">登録していないユーザはこちら</Typography>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleSignUp}
            fullWidth
          >
            SIGN UP
          </Button>
        </Grid>
        <Grid item>
          <Typography variant="body2">または</Typography>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => startGoogleAuth('login')}
            fullWidth
          >
            SIGN IN WITH GOOGLE
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => startFacebookAuth('login')}
            fullWidth
          >
            SIGN IN WITH FACEBOOK
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UserLogin;
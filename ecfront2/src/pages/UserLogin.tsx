import React, { useState, useEffect } from 'react';
// Login API (returns both tokens)
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth';
import googleIcon from '../assets/google.png';
import facebookIcon from '../assets/facebook.svg';
import mocktenIcon from '../assets/mockten.png';

import {
  Box,
  Container,
  Button,
  Typography,
  Paper,
} from '@mui/material';

const REDIRECT_URI = `${window.location.origin}/user/login`;

const UserLoginNew: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [codeProcessed, setCodeProcessed] = useState(false);


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

  // Handle Google/Facebook Redirect
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

        // Extract both tokens from social login response
        const accessToken = data.access_token;
        const refreshToken = data.refresh_token;

        // Pass BOTH to Auth Context
        auth.login(accessToken, refreshToken);

        navigate('/');
      } catch (err: any) {
        alert(err?.message || 'Google login failed');
      }
    })();
  }, [auth, navigate, codeProcessed]);

  return (
    <Box
      sx={{
        width: '100vw',
        minHeight: '100vh',
        background: '#CADFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
    >

      {/* Login Form Container */}
      <Paper
        elevation={3}
        sx={{
          width: '788px',
          height: '891px',
          backgroundColor: 'white',
          padding: '50px 24px',
          borderRadius: 0,
          boxShadow: '0px 0px 4px 0px rgba(0,0,0,0.08)',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Center Area */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Welcome Header */}
            <Box sx={{ marginBottom: '32px', textAlign: 'center' }}>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: 'Poppins',
                  fontWeight: 500,
                  fontSize: '36px',
                  color: '#2F2F2F',
                  lineHeight: 1.355,
                }}
              >
                Welcome to{' '}
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'Poppins',
                    fontWeight: 900,
                    fontSize: '46px',
                    color: '#6358DC',
                    lineHeight: 1.355,
                  }}
                >
                  Mockten
                </Typography>
              </Typography>
            </Box>

            {/* Product Icon */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '40px',
              }}
            >
              <Box
                component="img"
                src={mocktenIcon}
                alt="Mockten Logo"
                sx={{
                  width: '140px',
                  height: '140px',
                  objectFit: 'contain',
                  opacity: 1,
                }}
              />
            </Box>

            {/* Social Login Buttons */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '28px',
                alignItems: 'center',
              }}
            >
              <Button
                variant="outlined"
                onClick={() => startGoogleAuth('login')}
                sx={{
                  height: '82px',
                  width: '681px',
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0px 4px 15px 0px rgba(0,0,0,0.11)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                    boxShadow: '0px 4px 15px 0px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <img src={googleIcon} alt="Google" style={{ width: '32px', height: '32px' }} />
                <Typography
                  sx={{
                    fontFamily: 'Poppins',
                    fontWeight: 400,
                    fontSize: '16px',
                    color: '#2F2F2F',
                  }}
                >
                  Login with Google
                </Typography>
              </Button>

              <Button
                variant="outlined"
                onClick={() => startFacebookAuth('login')}
                sx={{
                  height: '82px',
                  width: '681px',
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0px 4px 15px 0px rgba(0,0,0,0.11)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                    boxShadow: '0px 4px 15px 0px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <img src={facebookIcon} alt="Facebook" style={{ width: '34px', height: '34px' }} />
                <Typography
                  sx={{
                    fontFamily: 'Poppins',
                    fontWeight: 400,
                    fontSize: '16px',
                    color: '#2F2F2F',
                  }}
                >
                  Login with Facebook
                </Typography>
              </Button>
            </Box>
          </Box>

          {/* Footer Links */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 32px',
              pt: 4,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 400,
                fontSize: '16px',
                color: '#2F2F2F',
              }}
            >
              Don't have an account?{' '}
              <Typography
                component="span"
                sx={{
                  color: '#6358DC',
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
                onClick={handleSignUp}
              >
                Register
              </Typography>
            </Typography>
          </Box>
        </Container>
      </Paper>
    </Box>
  );
};

export default UserLoginNew;
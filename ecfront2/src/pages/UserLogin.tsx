import React, { useState, useEffect, FormEvent } from 'react';
// Login API (returns both tokens)
import { login } from '../module/login';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth';
import googleIcon from '../assets/google.png';
import facebookIcon from '../assets/facebook.svg';
import mocktenIcon from '../assets/mockten.png';

import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Divider,
  Paper,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';

const REDIRECT_URI = `${window.location.origin}/user/login`;

const UserLoginNew: React.FC = () => {
  const [userID, setUserID] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();
  const [codeProcessed, setCodeProcessed] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      // 1. Get both tokens from the API
      const { token, refreshToken } = await login(userID, password);
      
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      const roles = decodedToken.roles || [];
      if (!roles.includes('customer')) {
        throw new Error('You are not authorized as a customer');
      }

      // 2. Pass BOTH tokens to Auth Context to save them
      auth.login(token, refreshToken);
      
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
      {/* Mockten Icon */}
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 0,
        }}
      >
        <img
          src={mocktenIcon}
          alt="Mockten Logo"
          style={{
            width: '400px',
            height: '400px',
            objectFit: 'cover',
            opacity: 0.1,
          }}
        />
      </Box>

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
        }}
      >
        <Container maxWidth={false} sx={{ padding: '28px' }}>
          {/* Welcome Header */}
          <Box sx={{ marginBottom: '28px' }}>
            <Typography
              variant="h3"
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 500,
                fontSize: '36px',
                color: '#2F2F2F',
                marginBottom: 0,
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

          {/* Social Login Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '28px', marginBottom: '28px' }}>
            {/* Google Login */}
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

            {/* Facebook Login */}
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

          {/* OR Divider */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '35px',
              marginBottom: '28px',
              padding: '24px 28px',
            }}
          >
            <Divider sx={{ flex: 1, borderColor: '#D9D9D9' }} />
            <Typography
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 400,
                fontSize: '16px',
                color: '#2F2F2F',
                whiteSpace: 'nowrap',
              }}
            >
              OR
            </Typography>
            <Divider sx={{ flex: 1, borderColor: '#D9D9D9' }} />
          </Box>

          {/* Email and Password Form */}
          <Box component="form" onSubmit={handleLogin} sx={{ marginBottom: '28px' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 32px' }}>
              {/* Email Field */}
              <Box
                sx={{
                  backgroundColor: '#ECECEC',
                  borderRadius: '10px',
                  padding: '16px 32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <Email sx={{ color: '#2F2F2F', width: '30px', height: '25px' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '12px',
                      color: '#2F2F2F',
                      marginBottom: '12px',
                    }}
                  >
                    Email
                  </Typography>
                  <TextField
                    fullWidth
                    variant="standard"
                    placeholder="example@gmail.com"
                    value={userID}
                    onChange={(e) => setUserID(e.target.value)}
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        fontFamily: 'Poppins',
                        fontWeight: 700,
                        fontSize: '16px',
                        color: '#2F2F2F',
                      },
                    }}
                  />
                </Box>
              </Box>

              {/* Password Field */}
              <Box
                sx={{
                  backgroundColor: '#ECECEC',
                  borderRadius: '10px',
                  padding: '16px 32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <Lock sx={{ color: '#2F2F2F', width: '27px', height: '27px' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '12px',
                      color: '#2F2F2F',
                      marginBottom: '12px',
                    }}
                  >
                    Password
                  </Typography>
                  <TextField
                    fullWidth
                    variant="standard"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="***********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        fontFamily: 'Poppins',
                        fontWeight: 700,
                        fontSize: '16px',
                        color: '#2F2F2F',
                      },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: '#2F2F2F' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Remember Me */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '0 32px', marginBottom: '28px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{
                      color: '#D9D9D9',
                      '&.Mui-checked': {
                        color: '#6358DC',
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontSize: '16px',
                      color: '#2F2F2F',
                    }}
                  >
                    Remember me
                  </Typography>
                }
                sx={{ margin: 0 }}
              />
            </Box>

            {/* Login Button */}
            <Box sx={{ padding: '16px 32px' }}>
              <Button
                type="submit"
                fullWidth
                sx={{
                  height: '54px',
                  backgroundColor: '#6358DC',
                  borderRadius: '8px',
                  fontFamily: 'Poppins',
                  fontWeight: 600,
                  fontSize: '16px',
                  color: 'white',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#5a4bc7',
                  },
                }}
              >
                Login
              </Button>
            </Box>
          </Box>

          {/* Footer Links */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 32px',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 400,
                fontSize: '16px',
                color: '#6358DC',
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Forgot Password?
            </Typography>
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
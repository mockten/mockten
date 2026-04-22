import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import googleIcon from '../assets/google.png';
import facebookIcon from '../assets/facebook.svg';
import mocktenIcon from '../assets/mockten.png';


const UserSignUpNew: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/user/login');
  };

  const startGoogleAuth = () => {
    // TODO: Implement Google OAuth for signup
    console.log('Google signup');
    alert('Google signup to be implemented');
  };

  const startFacebookAuth = () => {
    // TODO: Implement Facebook OAuth for signup
    console.log('Facebook signup');
    alert('Facebook signup to be implemented');
  };

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
            {/* Header */}
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
                SignUp for{' '}
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
                }}
              />
            </Box>

            {/* Social Signup Buttons */}
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
                onClick={startGoogleAuth}
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
                  SignUp with Google
                </Typography>
              </Button>

              <Button
                variant="outlined"
                onClick={startFacebookAuth}
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
                  SignUp with Facebook
                </Typography>
              </Button>
            </Box>
          </Box>

          {/* Footer Area */}
          <Box sx={{ textAlign: 'center', pt: 4 }}>
            <Box sx={{ marginBottom: '16px' }}>
              <Typography
                sx={{
                  fontFamily: 'Poppins',
                  fontWeight: 400,
                  fontSize: '16px',
                  color: '#2F2F2F',
                }}
              >
                By creating an account, You agree our{' '}
                <Typography
                  component="span"
                  sx={{
                    color: '#6358DC',
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                  onClick={() => navigate('/terms')}
                >
                  Terms.
                </Typography>
              </Typography>
            </Box>

            <Typography
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 400,
                fontSize: '16px',
                color: '#2F2F2F',
              }}
            >
              You already have an account?{' '}
              <Typography
                component="span"
                sx={{
                  color: '#6358DC',
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
                onClick={handleLogin}
              >
                Login
              </Typography>
            </Typography>
          </Box>
        </Container>
      </Paper>
    </Box>
  );
};

export default UserSignUpNew;

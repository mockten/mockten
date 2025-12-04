import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import googleIcon from '../assets/google.png';
import facebookIcon from '../assets/facebook.svg';
import mocktenIcon from '../assets/mockten.png';


const UserSignUpNew: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    try {
      // TODO: Implement actual signup API call
      console.log('Signup attempt:', { email, password });
      alert('Signup functionality to be implemented');
    } catch (error) {
      alert('Signup failed. Please try again.');
    }
  };

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
        padding: '39px 235px',
      }}
    >
      {/* Mockten Icon Background */}
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
            width: '662px',
            height: '662px',
            objectFit: 'cover',
            opacity: 0.1,
          }}
        />
      </Box>

      {/* Signup Form Container */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: 'white',
          borderRadius: 0,
          padding: 0,
          position: 'relative',
          zIndex: 1,
          minWidth: 'fit-content',
        }}
      >
        <Container maxWidth={false} sx={{ padding: 0 }}>
          {/* Header */}
          <Box sx={{ padding: '32px', paddingBottom: '22px' }}>
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

          {/* Social Signup Buttons */}
          <Box sx={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Google Signup */}
            <Button
              variant="outlined"
              onClick={startGoogleAuth}
              sx={{
                height: '79px',
                width: '681px',
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0px 4px 15px 0px rgba(0,0,0,0.11)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  boxShadow: '0px 4px 15px 0px rgba(0,0,0,0.15)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src={googleIcon} alt="Google" style={{ width: '32px', height: '33px' }} />
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
              </Box>
            </Button>

            {/* Facebook Signup */}
            <Button
              variant="outlined"
              onClick={startFacebookAuth}
              sx={{
                height: '79px',
                width: '681px',
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0px 4px 15px 0px rgba(0,0,0,0.11)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  boxShadow: '0px 4px 15px 0px rgba(0,0,0,0.15)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src={facebookIcon} alt="Facebook" style={{ width: '16px', height: '34px' }} />
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
              </Box>
            </Button>
          </Box>

          {/* OR Divider */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 58px',
              height: '12px',
            }}
          >
            <Box sx={{ flex: 1, height: '1px', backgroundColor: '#D9D9D9' }} />
            <Typography
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 400,
                fontSize: '16px',
                color: '#2F2F2F',
                whiteSpace: 'nowrap',
                padding: '0 35px',
              }}
            >
              OR
            </Typography>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: '#D9D9D9' }} />
          </Box>

          {/* Email and Password Form */}
          <Box component="form" onSubmit={handleSignUp}>
            <Box sx={{ padding: '0 28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Email Field */}
              <Box
                sx={{
                  backgroundColor: '#ECECEC',
                  borderRadius: '8px',
                  height: '77px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 24px',
                  position: 'relative',
                }}
              >
                <Email sx={{ color: '#2F2F2F', width: '30px', height: '25px', marginRight: '28px' }} />
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
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
                  borderRadius: '8px',
                  height: '77px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 24px',
                  position: 'relative',
                }}
              >
                <Lock sx={{ color: '#2F2F2F', width: '27px', height: '27px', marginRight: '28px' }} />
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
                    required
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

              {/* Confirm Password Field */}
              <Box
                sx={{
                  backgroundColor: '#ECECEC',
                  borderRadius: '8px',
                  height: '77px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 24px',
                  position: 'relative',
                }}
              >
                <Lock sx={{ color: '#2F2F2F', width: '27px', height: '27px', marginRight: '28px' }} />
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
                    Confirm Password
                  </Typography>
                  <TextField
                    fullWidth
                    variant="standard"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="***********"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
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
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                            sx={{ color: '#2F2F2F' }}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Terms and Conditions */}
            <Box sx={{ padding: '10px 0', textAlign: 'center' }}>
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
                >
                  Terms.
                </Typography>
              </Typography>
            </Box>

            {/* SignUp Button */}
            <Box sx={{ padding: '10px 0', textAlign: 'center' }}>
              <Button
                type="submit"
                sx={{
                  height: '77px',
                  width: '671px',
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
                SignUp
              </Button>
            </Box>

            {/* Login Link */}
            <Box sx={{ padding: '10px 0', textAlign: 'center' }}>
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
          </Box>
        </Container>
      </Paper>
    </Box>
  );
};

export default UserSignUpNew;

import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const PasswordSettings: React.FC = () => {
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleInputChange =
    (field: keyof PasswordFormData) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData({
        ...formData,
        [field]: event.target.value,
      });
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement password update logic
    console.log('Password update requested');
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '4px',
      height: '50px',
      '& fieldset': {
        borderColor: '#dddddd',
      },
      '&:hover fieldset': {
        borderColor: '#dddddd',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#5856D6',
      },
    },
    '& .MuiInputBase-input': {
      color: '#aaaaaa',
      fontFamily: 'Noto Sans',
      fontSize: '16px',
      padding: '8px 16px',
    },
  } as const;

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <Appbar />

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ padding: '24px 16px' }}>
        {/* Page Title */}
        <Box
          sx={{
            borderLeft: '5px solid black',
            paddingLeft: '20px',
            paddingY: '8px',
            marginBottom: '32px',
            marginLeft: '16px',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
            }}
          >
            Change Password
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: '680px', margin: '0 auto' }}>
          {/* Current Password */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Current Password
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="password"
              value={formData.currentPassword}
              onChange={handleInputChange('currentPassword')}
              sx={inputSx}
            />
          </Box>

          {/* New Password */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              New Password
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="password"
              value={formData.newPassword}
              onChange={handleInputChange('newPassword')}
              sx={inputSx}
            />
          </Box>

          {/* Confirm New Password */}
          <Box sx={{ marginBottom: '48px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Confirm New Password
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              sx={inputSx}
            />
          </Box>

          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: 'black',
                color: 'white',
                padding: '16px 32px',
                borderRadius: '4px',
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                textTransform: 'none',
                minWidth: '400px',
                '&:hover': {
                  backgroundColor: '#333',
                },
              }}
            >
              Update Password
            </Button>
          </Box>
        </Box>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default PasswordSettings;

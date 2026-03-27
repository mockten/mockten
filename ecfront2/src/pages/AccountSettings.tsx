import React, { useState } from 'react';
import {
  Box,
  Container,
  TextField,
  Typography,
  Button,
  SelectChangeEvent,
  Snackbar,
  Alert,
} from '@mui/material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';
import apiClient from '../module/apiClient';
import { useEffect } from 'react';


interface AccountFormData {
  email: string;
  phoneNumber: string;
}


const AccountSettingsNew: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    email: '',
    phoneNumber: '',
  });

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userinfoRes = await apiClient.get('/api/uam/userinfo');
        const userData = userinfoRes.data;

        const email = userData.email || '';
        const phoneNumber = userData.phone_number || (userData.attributes && userData.attributes.phoneNumber ? userData.attributes.phoneNumber[0] : '');

        setFormData((prev) => ({
          ...prev,
          email,
          phoneNumber,
        }));
      } catch (e) {
        console.error('Failed to fetch user info', e);
      }
    };

    fetchUserInfo();
  }, []);


  const handleInputChange = (field: keyof AccountFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    const value = (event.target as HTMLInputElement | { value: unknown }).value as string;

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing) return;

    try {
      await apiClient.post('/api/profile', {
        phone_number: formData.phoneNumber,
      });

      setSnackbarMessage('Account information updated successfully.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setIsEditing(false);
    } catch (e) {
      setSnackbarMessage('Failed to update account information.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      console.error('Failed to update account settings', e);
    }
  };

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
            My Account Information
          </Typography>
        </Box>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: '680px', margin: '0 auto' }}>
          {/* Email Address */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Mail Address
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={formData.email}
              onChange={handleInputChange('email')}
              InputProps={{ readOnly: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '4px',
                  height: '50px',
                  backgroundColor: '#f0f0f0',
                  '& fieldset': {
                    borderColor: '#dddddd',
                  },
                  '&:hover fieldset': {
                    borderColor: '#dddddd',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#dddddd',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#777777',
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  padding: '8px 16px',
                  cursor: 'text',
                  userSelect: 'text',
                },
              }}
            />
          </Box>


          {/* Phone Number */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Phone Number
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="tel"
              inputMode="tel"

              value={formData.phoneNumber}
              onChange={handleInputChange('phoneNumber')}
              disabled={!isEditing}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '4px',
                  height: '50px',
                  backgroundColor: !isEditing ? '#f0f0f0' : 'white',
                  '& fieldset': { borderColor: '#dddddd' },
                  '&:hover fieldset': { borderColor: '#dddddd' },
                  '&.Mui-focused fieldset': { borderColor: '#5856D6' },
                },
                '& .MuiInputBase-input': {
                  color: !isEditing ? '#000000ff' : '#000000ff',
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  padding: '8px 16px',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#777777',
                  opacity: 1,
                },
              }}
            />
          </Box>


          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '32px' }}>
            {!isEditing ? (
              <Button
                type="button"
                variant="contained"
                onClick={() => setIsEditing(true)}
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
                  '&:hover': { backgroundColor: '#333' },
                }}
              >
                Edit
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => setIsEditing(false)}
                  sx={{
                    borderColor: '#dddddd',
                    color: 'black',
                    padding: '16px 32px',
                    borderRadius: '4px',
                    fontFamily: 'Noto Sans',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    textTransform: 'none',
                    minWidth: '190px',
                    '&:hover': { borderColor: '#cccccc', backgroundColor: '#f5f5f5' },
                  }}
                >
                  Cancel
                </Button>

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
                    minWidth: '190px',
                    '&:hover': { backgroundColor: '#333' },
                  }}
                >
                  Save
                </Button>
              </>
            )}
          </Box>
        </Box>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default AccountSettingsNew;

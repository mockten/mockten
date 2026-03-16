import React, { useState } from 'react';
import {
  Box,
  Container,
  TextField,
  Typography,
  Button,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ArrowDropDown,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';
import apiClient from '../module/apiClient';


interface AccountFormData {
  email: string;
  name: string;
  phoneNumber: string;
  postCode: string;
  country: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
}

const regionOptions: Record<string, { value: string; label: string }[]> = {
  japan: [
    { value: 'tokyo', label: 'Tokyo' },
    { value: 'osaka', label: 'Osaka' },
    { value: 'kyoto', label: 'Kyoto' },
    { value: 'kanagawa', label: 'Kanagawa' },
    { value: 'aichi', label: 'Aichi' },
  ],
  singapore: [
    { value: 'central', label: 'Central Region' },
    { value: 'east', label: 'East Region' },
    { value: 'north', label: 'North Region' },
    { value: 'north-east', label: 'North-East Region' },
    { value: 'west', label: 'West Region' },
  ],
};

const AccountSettingsNew: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    email: 'sample@sample.com',
    name: 'Taro Yamada',
    phoneNumber: '07012345678',
    country: 'japan',
    postCode: '1234567',
    state: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
  });

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');


  const handleInputChange = (field: keyof AccountFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    const value = (event.target as HTMLInputElement | { value: unknown }).value as string;

    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'country' ? { state: '' } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing) return;

    try {
      await apiClient.post('/api/profile', {
        phone_number: formData.phoneNumber,
        postal_code: formData.postCode,
        prefecture: formData.state,
        city: formData.city,
        town: formData.addressLine1,
        building_name: formData.addressLine2,
        country_code: formData.country,
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

          {/* Name */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Name
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={handleInputChange('name')}
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
                  color: !isEditing ? '#777777' : '#aaaaaa',
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

          {/* Post Code */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Post Code
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={formData.postCode}
              onChange={handleInputChange('postCode')}
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
                  color: !isEditing ? '#777777' : '#aaaaaa',
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

          {/* Country */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Country
            </Typography>
            <FormControl
              fullWidth
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
                  color: !isEditing ? '#777777' : '#aaaaaa',
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  padding: '8px 16px',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#777777',
                  opacity: 1,
                },
              }}
            >
              <Select
                value={formData.country}
                onChange={handleInputChange('country')}
                displayEmpty
                disabled={!isEditing}
                IconComponent={ArrowDropDown}
              >
                <MenuItem value="japan">Japan</MenuItem>
                <MenuItem value="singapore">Singapore</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* State/Province/Region */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Region / Prefecture
            </Typography>
            <FormControl
              fullWidth
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
                  color: !isEditing ? '#777777' : '#aaaaaa',
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  padding: '8px 16px',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#777777',
                  opacity: 1,
                },
              }}
            >
              <Select
                value={formData.state}
                onChange={handleInputChange('state')}
                displayEmpty
                disabled={!isEditing}
                IconComponent={ArrowDropDown}
              >
                <MenuItem value="">
                  <em>
                    {formData.country === 'singapore'
                      ? 'Choose your region'
                      : 'Choose your prefecture'}
                  </em>
                </MenuItem>

                {regionOptions[formData.country]?.map((region) => (
                  <MenuItem key={region.value} value={region.value}>
                    {region.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* City */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              City
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={formData.city}
              onChange={handleInputChange('city')}
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
                  color: !isEditing ? '#777777' : '#aaaaaa',
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

          {/* Address Line 1 */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Address Line 1
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={formData.addressLine1}
              onChange={handleInputChange('addressLine1')}
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
                  color: !isEditing ? '#777777' : '#aaaaaa',
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

          {/* Address Line 2 */}
          <Box sx={{ marginBottom: '48px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Address Line 2
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={formData.addressLine2}
              onChange={handleInputChange('addressLine2')}
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
                  color: !isEditing ? '#777777' : '#aaaaaa',
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

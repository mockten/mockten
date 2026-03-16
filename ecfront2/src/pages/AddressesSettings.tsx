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
import { useEffect } from 'react';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';
import apiClient from '../module/apiClient';


interface AddressFormData {
  postCode: string;
  country: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
}

interface GeoAddress {
  geo_id: string;
  is_primary: boolean;
  user_name: string;
  country_code: string;
  postal_code: string;
  prefecture: string;
  city: string;
  town: string;
  building_name: string;
  room_number: string;
}

const regionOptions: Record<string, { value: string; label: string }[]> = {
  japan: [
    { value: 'hokkaido', label: 'Hokkaido' },
    { value: 'aomori', label: 'Aomori' },
    { value: 'iwate', label: 'Iwate' },
    { value: 'miyagi', label: 'Miyagi' },
    { value: 'akita', label: 'Akita' },
    { value: 'yamagata', label: 'Yamagata' },
    { value: 'fukushima', label: 'Fukushima' },
    { value: 'ibaraki', label: 'Ibaraki' },
    { value: 'tochigi', label: 'Tochigi' },
    { value: 'gunma', label: 'Gunma' },
    { value: 'saitama', label: 'Saitama' },
    { value: 'chiba', label: 'Chiba' },
    { value: 'tokyo', label: 'Tokyo' },
    { value: 'kanagawa', label: 'Kanagawa' },
    { value: 'yamanashi', label: 'Yamanashi' },
    { value: 'nagano', label: 'Nagano' },
    { value: 'niigata', label: 'Niigata' },
    { value: 'toyama', label: 'Toyama' },
    { value: 'ishikawa', label: 'Ishikawa' },
    { value: 'fukui', label: 'Fukui' },
    { value: 'gifu', label: 'Gifu' },
    { value: 'shizuoka', label: 'Shizuoka' },
    { value: 'aichi', label: 'Aichi' },
    { value: 'mie', label: 'Mie' },
    { value: 'shiga', label: 'Shiga' },
    { value: 'kyoto', label: 'Kyoto' },
    { value: 'osaka', label: 'Osaka' },
    { value: 'hyogo', label: 'Hyogo' },
    { value: 'nara', label: 'Nara' },
    { value: 'wakayama', label: 'Wakayama' },
    { value: 'tottori', label: 'Tottori' },
    { value: 'shimane', label: 'Shimane' },
    { value: 'okayama', label: 'Okayama' },
    { value: 'hiroshima', label: 'Hiroshima' },
    { value: 'yamaguchi', label: 'Yamaguchi' },
    { value: 'tokushima', label: 'Tokushima' },
    { value: 'kagawa', label: 'Kagawa' },
    { value: 'ehime', label: 'Ehime' },
    { value: 'kochi', label: 'Kochi' },
    { value: 'fukuoka', label: 'Fukuoka' },
    { value: 'saga', label: 'Saga' },
    { value: 'nagasaki', label: 'Nagasaki' },
    { value: 'kumamoto', label: 'Kumamoto' },
    { value: 'oita', label: 'Oita' },
    { value: 'miyazaki', label: 'Miyazaki' },
    { value: 'kagoshima', label: 'Kagoshima' },
    { value: 'okinawa', label: 'Okinawa' },
  ],
  singapore: [
    { value: 'central', label: 'Central Region' },
    { value: 'east', label: 'East Region' },
    { value: 'north', label: 'North Region' },
    { value: 'north-east', label: 'North-East Region' },
    { value: 'west', label: 'West Region' },
  ],
};

const AddressesSettings: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AddressFormData>({
    country: '',
    postCode: '',
    state: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
  });

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const fetchAddressInfo = async () => {
      try {
        const response = await apiClient.get('/api/geo');
        let geoArray: GeoAddress[] = [];
        if (Array.isArray(response.data)) {
          geoArray = response.data;
        } else {
          // Just in case backend is outdated
          geoArray = [response.data];
        }

        const postCode = geoArray[0].postal_code;
        const country = geoArray[0].country_code;
        const state = geoArray[0].prefecture;
        const city = geoArray[0].city;
        const addressLine1 = geoArray[0].town;
        let addressLine2 = geoArray[0].building_name;
        const room_number = geoArray[0].room_number;

        addressLine2 = room_number ? addressLine2 + ', ' + room_number : addressLine2;

        setFormData((prev) => ({
          ...prev,
          country,
          postCode,
          state,
          city,
          addressLine1,
          addressLine2,
        }));
      } catch (e) {
        console.error('Failed to fetch address info', e);
      }
    };

    fetchAddressInfo();
  }, []);


  const handleInputChange = (field: keyof AddressFormData) => (
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
            Addresses
          </Typography>
        </Box>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: '680px', margin: '0 auto' }}>

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
                fontWeight: 'bold',
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

export default AddressesSettings;

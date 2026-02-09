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
} from '@mui/material';
import {
  ArrowDropDown,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';


interface AccountFormData {
  email: string;
  name: string;
  phoneNumber: string;
  postCode: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
}

const AccountSettingsNew: React.FC = () => {
  const [formData, setFormData] = useState<AccountFormData>({
    email: 'sample@sample.com',
    name: 'Taro Yamada',
    phoneNumber: '07012345678',
    postCode: '1234567',
    state: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
  });


  const handleInputChange = (field: keyof AccountFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    setFormData({
      ...formData,
      [field]: (event.target as HTMLInputElement | { value: unknown }).value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission logic
    console.log('Account settings updated:', formData);
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
              sx={{
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
              sx={{
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
              sx={{
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
              sx={{
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
              }}
            />
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
              State/Province/Region
            </Typography>
            <FormControl
              fullWidth
              sx={{
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
                '& .MuiSelect-select': {
                  color: '#aaaaaa',
                  fontFamily: 'Roboto',
                  fontSize: '16px',
                  padding: '16px',
                },
              }}
            >
              <Select
                value={formData.state}
                onChange={handleInputChange('state')}
                displayEmpty
                IconComponent={ArrowDropDown}
              >
                <MenuItem value="">
                  <em>Choose your region</em>
                </MenuItem>
                <MenuItem value="tokyo">Tokyo</MenuItem>
                <MenuItem value="osaka">Osaka</MenuItem>
                <MenuItem value="kyoto">Kyoto</MenuItem>
                <MenuItem value="yokohama">Yokohama</MenuItem>
                <MenuItem value="nagoya">Nagoya</MenuItem>
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
              placeholder="ex: Setagaya-ku, kasuya"
              value={formData.city}
              onChange={handleInputChange('city')}
              sx={{
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
                  '&::placeholder': {
                    color: '#aaaaaa',
                    opacity: 1,
                  },
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
              placeholder="ex: 1-2-3"
              value={formData.addressLine1}
              onChange={handleInputChange('addressLine1')}
              sx={{
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
                  '&::placeholder': {
                    color: '#aaaaaa',
                    opacity: 1,
                  },
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
              placeholder="ex: Domes House 10XX"
              value={formData.addressLine2}
              onChange={handleInputChange('addressLine2')}
              sx={{
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
                  '&::placeholder': {
                    color: '#aaaaaa',
                    opacity: 1,
                  },
                },
              }}
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
              Register
            </Button>
          </Box>
        </Box>
      </Container>

      {/* Footer */}
      <Footer/>
    </Box>
  );
};

export default AccountSettingsNew;

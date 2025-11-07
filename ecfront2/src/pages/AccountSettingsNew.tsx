import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  TextField,
  InputAdornment,
  Typography,
  IconButton,
  Container,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Search,
  ShoppingCart,
  History,
  FavoriteBorder,
  Person,
  KeyboardArrowRight,
  ArrowDropDown,
} from '@mui/icons-material';

// Mock image URLs - replace with actual asset URLs from your project
const searchIcon = "http://localhost:3845/assets/c535b42dcf7e566d2b67967fb9015d1c01b349ee.svg";
const shoppingCartIcon = "http://localhost:3845/assets/6860db0ced6811a1edcaf770921861e9208e14e7.svg";
const historyIcon = "http://localhost:3845/assets/127b7362eba9bb3a7b8dedc9f483e2c327967a29.svg";
const favoriteIcon = "http://localhost:3845/assets/d2ae4d607d49b9c7cb69fc521abc19d44737bd87.svg";
const personIcon = "http://localhost:3845/assets/dee4618eca47c5877a5dd52eaf0c6b5014b75e35.svg";
const arrowRightIcon = "http://localhost:3845/assets/ce1540ba1f8cb0bde2e26ff8f9fc566f7be994a6.svg";

interface AccountFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phoneNumber: string;
  postCode: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
}

const AccountSettingsNew: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AccountFormData>({
    email: 'sample@sample.com',
    password: '****',
    confirmPassword: '****',
    name: 'Taro Yamada',
    phoneNumber: '07012345678',
    postCode: '1234567',
    state: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
  });

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search-new?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleInputChange = (field: keyof AccountFormData) => (
    event: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent
  ) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission logic
    console.log('Account settings updated:', formData);
  };

  const footerLinks = [
    'About us', 'careers', 'USER guide',
    'careers', 'ir', 'CONTACT US'
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: '#5856D6',
          borderBottom: '1px solid #eeeeee',
        }}
      >
        <Toolbar sx={{ padding: '16px', gap: '24px' }}>
          {/* Logo */}
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
              whiteSpace: 'nowrap',
            }}
          >
            MOCKTEN
          </Typography>

          {/* Search Bar */}
          <Box sx={{ flexGrow: 1 }}>
            <form onSubmit={handleSearch}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '4px',
                    padding: '8px 16px',
                    '& fieldset': {
                      borderColor: '#cccccc',
                    },
                    '&:hover fieldset': {
                      borderColor: '#cccccc',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#cccccc',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#aaaaaa',
                    fontFamily: 'Noto Sans',
                    fontSize: '16px',
                    '&::placeholder': {
                      color: '#aaaaaa',
                      opacity: 1,
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <img src={searchIcon} alt="Search" style={{ width: '16px', height: '16px' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Box>

          {/* Navigation Icons */}
          <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <IconButton sx={{ color: 'black' }}>
              <img src={shoppingCartIcon} alt="Cart" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black' }}>
              <img src={historyIcon} alt="History" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black' }}>
              <img src={favoriteIcon} alt="Favorites" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black' }}>
              <img src={personIcon} alt="Profile" style={{ width: '24px', height: '24px' }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

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

          {/* Password */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Password
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
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

          {/* Confirm Password */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Confirm Password
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
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
      <Box
        sx={{
          backgroundColor: '#5856D6',
          padding: '40px 16px',
          marginTop: '48px',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              variant="h4"
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '24px',
                color: 'black',
                marginBottom: '16px',
              }}
            >
              MOCKTEN
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              {footerLinks.map((link, index) => (
                <Button
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 0',
                    borderBottom: '1px solid #dddddd',
                    borderRadius: 0,
                    textTransform: 'uppercase',
                    minWidth: '300px',
                    '&:hover': {
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: 'black',
                      textAlign: 'left',
                    }}
                  >
                    {link}
                  </Typography>
                  <img src={arrowRightIcon} alt="Arrow" style={{ width: '24px', height: '24px' }} />
                </Button>
              ))}
            </Box>
          </Box>
        </Container>
        
        <Box
          sx={{
            backgroundColor: 'black',
            padding: '8px',
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Noto Sans',
              fontSize: '12px',
              color: 'white',
            }}
          >
            © MOCKTEN, Inc.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default AccountSettingsNew;

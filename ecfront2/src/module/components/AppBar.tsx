import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar as MuiAppBar,
  Toolbar,
  TextField,
  InputAdornment,
  Typography,
  IconButton,
  Box,
} from '@mui/material';

// Mock image URLs - replace with actual asset URLs from your project
const searchIcon = "http://localhost:3845/assets/c535b42dcf7e566d2b67967fb9015d1c01b349ee.svg";
const shoppingCartIcon = "http://localhost:3845/assets/6860db0ced6811a1edcaf770921861e9208e14e7.svg";
const historyIcon = "http://localhost:3845/assets/127b7362eba9bb3a7b8dedc9f483e2c327967a29.svg";
const favoriteIcon = "http://localhost:3845/assets/d2ae4d607d49b9c7cb69fc521abc19d44737bd87.svg";
const personIcon = "http://localhost:3845/assets/dee4618eca47c5877a5dd52eaf0c6b5014b75e35.svg";

interface AppBarProps {
  onCartClick?: () => void;
  onHistoryClick?: () => void;
  onFavoriteClick?: () => void;
  onProfileClick?: () => void;
}

const AppBar: React.FC<AppBarProps> = ({
  onCartClick,
  onHistoryClick,
  onFavoriteClick,
  onProfileClick,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search-new?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleCartClick = () => {
    if (onCartClick) {
      onCartClick();
    } else {
      navigate('/cart/list-new');
    }
  };

  const handleHistoryClick = () => {
    if (onHistoryClick) {
      onHistoryClick();
    } else {
      navigate('/order-history');
    }
  };

  const handleFavoriteClick = () => {
    if (onFavoriteClick) {
      onFavoriteClick();
    } else {
      navigate('/fav/list-new');
    }
  };

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    } else {
      navigate('/user');
    }
  };

  return (
    <MuiAppBar
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
          onClick={() => navigate('/dashboard-new')}
          sx={{
            fontFamily: 'Noto Sans',
            fontWeight: 'bold',
            fontSize: '20px',
            color: 'black',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.8,
            },
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
          <IconButton onClick={handleCartClick} sx={{ color: 'black' }}>
            <img src={shoppingCartIcon} alt="Cart" style={{ width: '24px', height: '24px' }} />
          </IconButton>
          <IconButton onClick={handleHistoryClick} sx={{ color: 'black' }}>
            <img src={historyIcon} alt="History" style={{ width: '24px', height: '24px' }} />
          </IconButton>
          <IconButton onClick={handleFavoriteClick} sx={{ color: 'black' }}>
            <img src={favoriteIcon} alt="Favorites" style={{ width: '24px', height: '24px' }} />
          </IconButton>
          <IconButton onClick={handleProfileClick} sx={{ color: 'black' }}>
            <img src={personIcon} alt="Profile" style={{ width: '24px', height: '24px' }} />
          </IconButton>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;

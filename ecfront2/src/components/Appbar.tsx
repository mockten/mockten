import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../module/api';
import {
  AppBar as MuiAppBar,
  Toolbar,
  TextField,
  InputAdornment,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import {
  Search,
  ShoppingCart,
  History,
  FavoriteBorder,
  Person,
} from '@mui/icons-material';

interface AppbarProps {
  onCartClick?: () => void;
  onHistoryClick?: () => void;
  onFavoriteClick?: () => void;
  onProfileClick?: () => void;
  onLogoClick?: () => void;
}

const Appbar: React.FC<AppbarProps> = ({
  onCartClick,
  onHistoryClick,
  onFavoriteClick,
  onProfileClick,
  onLogoClick,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleCartClick = async () => {
    try {
      const response = await api.get("/cart/list");
      const cartData = response.data.items;

      console.log('🛒 Cart contents:', cartData);

      if (onCartClick) {
        onCartClick();
      } else {
        navigate('/cart/list', { state: { cartData } });
      }
    } catch (error) {
      console.error('Failed to get your cart', error);
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
      navigate('/fav/list');
    }
  };

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    } else {
      navigate('/user/account-settings');
    }
  };

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      navigate('/');
    }
  };

  return (
    <MuiAppBar
      position="static"
      sx={{
        backgroundColor: '#5856D6',
        borderBottom: '1px solid #eeeeee',
        padding: '16px',
      }}
    >
      <Toolbar sx={{ gap: '24px', padding: 0 }}>
        {/* Logo */}
        <Typography
          variant="h5"
          onClick={handleLogoClick}
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
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </form>
        </Box>

        {/* Navigation Icons */}
        <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <IconButton sx={{ color: 'black' }} onClick={handleCartClick}>
            <ShoppingCart />
          </IconButton>
          <IconButton sx={{ color: 'black' }} onClick={handleHistoryClick}>
            <History />
          </IconButton>
          <IconButton sx={{ color: 'black' }} onClick={handleFavoriteClick}>
            <FavoriteBorder />
          </IconButton>
          <IconButton sx={{ color: 'black' }} onClick={handleProfileClick}>
            <Person />
          </IconButton>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
};

export default Appbar;

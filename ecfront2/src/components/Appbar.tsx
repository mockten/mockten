import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../module/apiClient';
import {
  AppBar as MuiAppBar,
  Toolbar,
  TextField,
  InputAdornment,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
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
  const [accountMenuAnchorEl, setAccountMenuAnchorEl] = useState<null | HTMLElement>(null);
  const accountMenuCloseTimerRef = useRef<number | null>(null);
  const isAccountMenuOpen = Boolean(accountMenuAnchorEl);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleCartClick = async () => {
    try {
      const response = await apiClient.get("/api/cart/list");
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

  const clearAccountMenuCloseTimer = () => {
    if (accountMenuCloseTimerRef.current !== null) {
      window.clearTimeout(accountMenuCloseTimerRef.current);
      accountMenuCloseTimerRef.current = null;
    }
  };

  const handleAccountMenuClose = () => {
    clearAccountMenuCloseTimer();
    setAccountMenuAnchorEl(null);
  };

  const scheduleAccountMenuClose = () => {
    clearAccountMenuCloseTimer();
    accountMenuCloseTimerRef.current = window.setTimeout(() => {
      setAccountMenuAnchorEl(null);
      accountMenuCloseTimerRef.current = null;
    }, 150);
  };

  const handleAccountMenuToggle = (event: React.MouseEvent<HTMLElement>) => {
    clearAccountMenuCloseTimer();
    setAccountMenuAnchorEl((prev) => (prev ? null : event.currentTarget));
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
          <IconButton
            id="account-menu-button"
            aria-controls={isAccountMenuOpen ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={isAccountMenuOpen ? 'true' : undefined}
            sx={{ color: 'black' }}
            onClick={handleAccountMenuToggle}
          >
            <Person />
          </IconButton>
          <Menu
            id="account-menu"
            anchorEl={accountMenuAnchorEl}
            open={isAccountMenuOpen}
            onClose={handleAccountMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            MenuListProps={{
              'aria-labelledby': 'account-menu-button',
              onMouseEnter: clearAccountMenuCloseTimer,
              onMouseLeave: scheduleAccountMenuClose,
            }}
          >
            <MenuItem
              onClick={() => {
                handleAccountMenuClose();
                handleProfileClick();
              }}
            >
              My Account
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleAccountMenuClose();
                navigate('/user/password-settings');
              }}
            >
              Change Password
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleAccountMenuClose();
                navigate('/user/creditcard-settings');
              }}
            >
              Change Card
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
};

export default Appbar;

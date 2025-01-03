import React from 'react';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Menu from '@mui/material/Menu';

function AppbarUserIcon() {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuId = 'primary-search-account-menu';

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMyAccountClick = () => {
    window.open('/user/id', '_blank');
    handleClose();
  };

  const handleSellerAccountClick = () => {
    window.open('/seller/id', '_blank');
    handleClose();
  };

  return (
    <div>
      <IconButton
        size="large"
        edge="end"
        aria-label="account of current user"
        aria-controls={menuId}
        aria-haspopup="true"
        onClick={handleProfileMenuOpen}
        color="inherit"
      >
        <AccountCircle />
      </IconButton>
      <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
        <MenuItem onClick={handleMyAccountClick}>My Account</MenuItem>
        <MenuItem onClick={handleSellerAccountClick}>Seller Account</MenuItem>
      </Menu>
    </div>
  );
}

export default AppbarUserIcon;
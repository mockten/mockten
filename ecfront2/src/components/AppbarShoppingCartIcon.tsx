import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Badge from '@mui/material/Badge';

function AppbarShoppingCartIcon() {
  const [, setOpen] = useState(false);


  const handleIconClick = () => {
    setOpen(true);
  };

  return (
    <div>
      <IconButton onClick={() => handleIconClick()} size="large" aria-label="show 4 new mails" color="inherit">
        <Badge badgeContent={4} color="error">
          <ShoppingCartIcon />
        </Badge>
      </IconButton>
    </div>
  );
}

export default AppbarShoppingCartIcon;
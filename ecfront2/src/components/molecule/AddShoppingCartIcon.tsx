import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import AddShoppingCart from '@mui/icons-material/AddShoppingCart';

function AddShoppingCartIcon() {
  const [, setOpen] = useState(false);


  const handleIconClick = () => {
    setOpen(true);
  };

  return (
    <IconButton onClick={() => handleIconClick()} size="small" aria-label="show 4 new mails" color="inherit">
        <AddShoppingCart />
    </IconButton>
  );
}

export default AddShoppingCartIcon;
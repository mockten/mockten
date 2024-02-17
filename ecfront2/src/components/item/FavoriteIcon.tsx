import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Favorite from '@mui/icons-material/Favorite';

function AddShoppingCartIcon() {
  const [, setOpen] = useState(false);


  const handleIconClick = () => {
    setOpen(true);
  };

  return (
    <IconButton onClick={() => handleIconClick()} size="small" aria-label="show 4 new mails" color="inherit">
        <Favorite />
    </IconButton>
  );
}

export default AddShoppingCartIcon;
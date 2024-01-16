import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import PaymentIcon from '@mui/icons-material/Payment';

function AddShoppingCartIcon() {
  const [open, setOpen] = useState(false);


  const handleIconClick = () => {
    setOpen(true);
  };

  return (
    <IconButton onClick={() => handleIconClick()} size="small" aria-label="show 4 new mails" color="inherit">
        <PaymentIcon />
    </IconButton>
  );
}

export default AddShoppingCartIcon;
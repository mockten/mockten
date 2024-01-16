import React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/system/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2

function BelowAppbarSpace() {
  const handleClickAvatorIcon = () => {
    setOpen(true);
  };


  return (
    <div>
        <Box sx={{ flexGrow: 1 }}>
            <Grid container spacing={2}>
                
            </Grid>
        </Box>
    </div>
  );
}

export default BelowAppbarSpace;


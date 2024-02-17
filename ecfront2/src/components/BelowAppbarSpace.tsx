import Box from '@mui/system/Box';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2

function BelowAppbarSpace() {
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


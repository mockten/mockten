import React, { useState } from 'react';
import { Container, TextField, Button, Grid, Typography } from '@mui/material';

interface SellerUser {
  id: string;
  email: string;
  name: string;
  address: string;
  // Add any further user-information fields here
}

const AdminUpdateSeller = () => {

  const [selleruser, setSellerUser] = useState<SellerUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  // Relative path: resolved through nginx/Kong, so it works in any
  // environment (local, k8s, cloud) instead of a hardcoded localhost host.
  const apiUrl = '';

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `${apiUrl}/api/admin/seller?email=${encodeURIComponent(email)}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Something went wrong');
      }
      
      const responsedata = await response.json();
      console.log(responsedata); // Success handling
      setSellerUser(responsedata);
    } catch (error) {
      console.error(error); // Error handling
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (selleruser) {
      setSellerUser({
        ...selleruser,
        [event.target.name]: event.target.value,
      });
    }
  };


  return (
    <Container maxWidth="sm">
    <Grid container spacing={3} direction="column">
      <Grid item>
        <Typography variant="h5">Search Seller User</Typography>
      </Grid>
      <Grid item>
        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Grid>
      <Grid item>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSearch}
          disabled={loading}
          fullWidth
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </Grid>
      {error && (
        <Grid item>
          <Typography color="error">{error}</Typography>
        </Grid>
      )}
    </Grid>

    {selleruser && (
      <Grid container spacing={3} direction="column" style={{ marginTop: '20px' }}>
        <Grid item>
          <TextField
            label="Name"
            variant="outlined"
            fullWidth
            name="name"
            value={selleruser.name}
            onChange={handleInputChange}
          />
        </Grid>
        <Grid item>
          <TextField
            label="Address"
            variant="outlined"
            fullWidth
            name="address"
            value={selleruser.address}
            onChange={handleInputChange}
          />
        </Grid>
        {/* Additional fields can be added here */}
      </Grid>
    )}
  </Container>
  );
};

export default AdminUpdateSeller;
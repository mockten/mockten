import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Grid, Typography } from '@mui/material';

const SellerLogin: React.FC = () => {
    const [sellerID, setSellerID] = useState('');
    const [sellerpassword, setSellerPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e: FormEvent) => {
        e.preventDefault();
        if (sellerID && sellerpassword) {
            navigate(`/seller?name=${encodeURIComponent(sellerID)}`);
        } else {
            alert('Invalid sellername or password');
        }
    };

    return (
        <Container maxWidth="sm">
        <Grid container spacing={3} direction="column" alignItems="center" justifyContent="center" style={{ minHeight: '100vh' }}>
          <Grid item>
            <Typography variant="h4">Seller Login</Typography>
          </Grid>
          <Grid item>
            <TextField
              label="Seller Mail Address"
              variant="outlined"
              fullWidth
              value={sellerID}
              onChange={(e) => setSellerID(e.target.value)}
            />
          </Grid>
          <Grid item>
            <TextField
              label="Password"
              variant="outlined"
              type="password"
              fullWidth
              value={sellerpassword}
              onChange={(e) => setSellerPassword(e.target.value)}
            />
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" onClick={handleLogin} fullWidth>
              Login
            </Button>
          </Grid>
        </Grid>
      </Container>
    );
};

export default SellerLogin;
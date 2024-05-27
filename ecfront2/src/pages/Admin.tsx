import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Button, Container } from '@mui/material';

const AdminLoginPage: React.FC = () => {
    const navigate = useNavigate();

    const handleCreateUserBottun = () => {
        navigate('/admin/user/create');
    };

    const handleEditUserBottun = () => {
        navigate('/admin/user/edit');
    };

    const handleCreateSellerBottun = () => {
        navigate('/admin/seller/create');
    };

    const handleEditSellerBottun = () => {
        navigate('/admin/seller/edit');
    };

    return (
        <Container>
          <h1> Admin Page</h1>
        <Grid container direction="column" spacing={2}>
          <Grid item >
            <Button onClick={handleCreateUserBottun} fullWidth variant="contained" color="primary">
              Create User Account
            </Button>
          </Grid>
          <Grid item>
            <Button onClick={handleEditUserBottun} fullWidth variant="contained" color="primary">
              Edit User Account
            </Button>
          </Grid>
          <Grid item>
            <Button onClick={handleCreateSellerBottun} fullWidth variant="contained" color="success">
              Create Seller Account
            </Button>
          </Grid>
          <Grid item>
            <Button onClick={handleEditSellerBottun} fullWidth variant="contained" color="success">
              Edit Seller Account
            </Button>
          </Grid>
        </Grid>
      </Container>
    );
  };

export default AdminLoginPage;
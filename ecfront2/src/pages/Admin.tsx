import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Button, Container, Breadcrumbs, Link, Typography} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';

const AdminLoginPage: React.FC = () => {
    const navigate = useNavigate();

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      event.preventDefault();
      console.info('You clicked a breadcrumb.');
    };

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

    const handleDeleteUserBottun = () => {
        navigate('/admin/user/delete');
    };

    const handleDeleteSellerBottun = () => {
      navigate('/admin/seller/delete');
    };

    return (
        <Container>
          <Breadcrumbs aria-label="breadcrumb">
            <Link color="inherit" href="/" onClick={handleClick}>
              <LoginIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Admin Login
            </Link>
            <Typography color="textPrimary">Admin Home</Typography>
          </Breadcrumbs>
          <h1> Admin Page</h1>
        <Grid container direction="column" spacing={2}>
          <Grid item >
            <Button onClick={handleCreateUserBottun} fullWidth variant="contained" color="primary">
              Create Customer Account
            </Button>
          </Grid>
          <Grid item>
            <Button onClick={handleEditUserBottun} fullWidth variant="contained" color="primary">
              Edit Customer Account
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
          <Grid item>
            <Button onClick={handleDeleteUserBottun} fullWidth variant="contained" color="error">
              Delete Seller Account
            </Button>
          </Grid>
          <Grid item>
            <Button onClick={handleDeleteSellerBottun} fullWidth variant="contained" color="error">
              Delete Customer Account
            </Button>
          </Grid>
        </Grid>
      </Container>
    );
  };

export default AdminLoginPage;
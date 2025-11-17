import { useState } from 'react';
import { Container, TextField, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Grid, Typography } from '@mui/material';

const AdminDeleteSeller = () => {
  const [seller, ] = useState({
    userid: '',
    email: '',
    password: ''
  });

  const [, setUserExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [email, setEmail] = useState('');
  const apiUrl = process.env.REACT_APP_ADMIN_API;
  // const apiUrl = 'http://localhost:50051';

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `${apiUrl}/v1/admin/seller?email=${encodeURIComponent(email)}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Something went wrong');
      }
      
      const responsedata = await response.json();
      console.log(responsedata); // Success handling

      seller.userid = responsedata.id
      setUserExists(true);
      setOpenDeleteDialog(true);
    } catch (error) {
      console.error(error); // Error handling
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    seller.email = `${encodeURIComponent(email)}`;
    seller.password = "dummy";

    try {
      const url = `${apiUrl}/v1/admin/seller/delete`
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(seller)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setOpenDeleteDialog(false);
      alert('Seller User deleted.');
    } catch (error) {
      setError('Unexpected error when deleting seller user.');
    }
  };

  return (
    <Container maxWidth="lg">
    <Grid container spacing={2} direction="column">
      <Grid item>
        <Typography variant="h5">Search Seller User</Typography>
      </Grid>
      <Grid item>
        <TextField
          margin="normal"
          label="Email"
          variant="outlined"
          fullWidth
          autoComplete="email"
          autoFocus
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
          Search
        </Button>
      </Grid>
      {error && (
        <Grid item>
          <Typography color="error">{error}</Typography>
        </Grid>
      )}
    </Grid>
          {/* Seller delete dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Delete Seller User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you really want to delete this user?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="secondary" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDeleteSeller;
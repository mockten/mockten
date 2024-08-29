import React, { useState } from 'react';
import { Box, Container, TextField, Button, IconButton, InputAdornment, Grid, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const AdminCreateSeller = () => {
  const [seller, setSeller] = useState({
    displayname: '',
    firstname: '',
    lastname: '',
    password: '',
    email: '',
    phonenum: '',
    address1: '',
    address2: '',
    address3: '',
    postcode: '',
    birthday: ''
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeller({ ...seller, [e.target.name]: e.target.value });
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const apiUrl = process.env.REACT_APP_ADMIN_API;
    // const apiUrl = 'http://localhost:50051';

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
    } else if (!validateEmail(email)) {
      setErrorMessage('Invalid email address'); 
    } else {
      setErrorMessage('');
      seller.password = password;
      seller.email = email;
      try {
        const response = await fetch(`${apiUrl}/v1/admin/seller/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(seller)
        });

        if (!response.ok) {
          throw new Error('Something went wrong');
        }

        const apiStatus = await response.json();
        console.log(apiStatus); // Success handling
      } catch (error) {
        console.error(error); // Error handling
      }
    }
  };

  return (
    <Container component="main" maxWidth="xs">
    <h2>Create Seller Account </h2>
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="displayname"
          label="Display Name"
          name="displayname"
          autoComplete="displayname"
          autoFocus
          onChange={handleChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="firstname"
          label="First Name"
          name="firstname"
          autoComplete="firstname"
          autoFocus
          onChange={handleChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="lastname"
          label="Last Name"
          name="lastname"
          autoComplete="lastname"
          autoFocus
          onChange={handleChange}
        />
        <TextField
          margin="normal"
          required
          label="Password"
          variant="outlined"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          margin="normal"
          required
          label="Confirm Password"
          variant="outlined"
          type={showConfirmPassword ? 'text' : 'password'}
          fullWidth
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle confirm password visibility"
                  onClick={handleClickShowConfirmPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {errorMessage && (
          <Grid item>
            <Typography variant="body2" color="error">
              {errorMessage}
            </Typography>
          </Grid>
        )}
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Mail Address"
          name="email"
          autoComplete="email"
          autoFocus
          onChange={(e) => setEmail(e.target.value)}
          />
        <TextField
          margin="normal"
          required
          fullWidth
          id="phonenum"
          inputProps={{
            pattern: '\\d*',  
            inputMode: 'tel', 
            maxLength: 15,  
          }}
          label="Phone Number"
          name="phonenum"
          autoComplete="phonenum"
          autoFocus
          type="number"
          onChange={handleChange}
        /> 
        <TextField
          margin="normal"
          required
          fullWidth
          id="address1"
          label="Address(Prefecture)"
          name="address1"
          autoComplete="address1"
          autoFocus
          onChange={handleChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="address2"
          label="Address(City)"
          name="address2"
          autoComplete="address2"
          autoFocus
          onChange={handleChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="address3"
          label="Address(Street)"
          name="address3"
          autoComplete="address3"
          autoFocus
          onChange={handleChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="postcode"
          inputProps={{
            pattern: '[0-9]{3}-?[0-9]{4}', 
            inputMode: 'numeric',        
            maxLength: 8,               
          }}
          label="Postcode"
          name="postcode"
          autoComplete="postcode"
          autoFocus
          helperText="ex: 123-4567"
          onChange={handleChange}
        />
        <TextField
          margin="normal"
          type="date"
          required
          fullWidth
          id="birthday"
          InputLabelProps={{
            shrink: true,
          }}
          label="Birth Day"
          name="birthday"
          autoComplete="birthday"
          autoFocus
          onChange={handleChange}
        />
      <div>
    </div>
        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
          Create
        </Button>
      </Box>
    </Container>
  );
};

export default AdminCreateSeller;
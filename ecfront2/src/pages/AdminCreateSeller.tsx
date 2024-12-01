import React, { useState } from 'react';
import { Box, Container, TextField, Button, IconButton, InputAdornment, Grid, Typography, Snackbar, Alert } from '@mui/material';
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

  // const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  //const realm = 'mockten-realm-dev';
  //const keycloak = 'localhost:8080'

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

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setMessage(message);
    setSeverity(severity);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setErrorMessage('');
  };

  const getToken = async (): Promise<string | null> => {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    // params.append('client_id', 'admin-cli');
    params.append('client_id', 'mockten-react-client');
    params.append('client_secret', 'mockten-client-secret');
    params.append('username', 'superadmin');
    params.append('password', 'superadmin');
    // params.append('username', 'seller');
    // params.append('password', 'seller');

    try {
      //const response = await fetch(`http://${keycloak}/realms/${realm}/protocol/openid-connect/token`, {
      const response = await fetch(`/api/uam/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      // setToken(data.access_token);
      console.log('Access Token:', data.access_token);
      return data.access_token;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // const apiUrl = process.env.REACT_APP_ADMIN_API;
    //const apiUrl = 'http://localhost:8080';

    const token = await getToken();

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
    } else if (!validateEmail(email)) {
      setErrorMessage('Invalid email address'); 
    } else {
      setErrorMessage('');
      seller.password = password;
      seller.email = email;

      const userData = {
        username: seller.displayname,
        email: seller.email,
        enabled: true,
        emailVerified: true,
        firstName: seller.firstname,
        lastName: seller.lastname,
        credentials: [
          {
            type: 'password',
            value: seller.password,
            temporary: false,
          },
        ],
        groups: [
          "Seller"
        ],
        attributes: {
          phonenum: seller.phonenum,
          postcode: seller.postcode,
          address1: seller.address1,
          address2: seller.address2,
          address3: seller.address3,
          birthday: seller.birthday,
        }
      };

      try {
          //const response = await fetch(`http://localhost:8082/api/uam/users`, {
          const response = await fetch(`/api/uam/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(userData),
          mode: 'cors',
        });
        if (!response.ok) {
          console.error(`Failed to create user:  ${response.status}`);
          showSnackbar('Request ', 'error');          
          // throw new Error(`Failed to create user:'  ${response.status}`);
        }

        const apiStatus = await response.json();
        console.log(apiStatus); // Success handling
        showSnackbar('Request succeeded!', 'success');
      } catch (error) {
        console.error(error); // Error handling
        showSnackbar('Request succeeded!', 'success');          
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
        <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
          <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
            {message}
          </Alert>
      </Snackbar>
      </Box>
    </Container>
  );
};

export default AdminCreateSeller;
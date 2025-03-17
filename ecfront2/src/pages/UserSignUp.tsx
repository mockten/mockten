import DashboardBottomNavigation from '../components/DashboardBottomNavigation';
import Appbar from '../components/Appbar';
import { login } from '../module/login';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth';
import { Box, Container, TextField, Button, IconButton, InputAdornment, Grid, Typography, Snackbar, Alert  } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const CreateAccount = () => {
  const [user, setUser] = useState({
    displayname: '',
    firstname: '',
    lastname: '',
    password: '',
    email: '',
    address1: '',
    address2: '',
    address3: '',
    postcode: 0,
    birthday: ''
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  const auth = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUser({ ...user, [e.target.name]: e.target.value });
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
    try {
      const response = await fetch(`/api/uam/creation/token`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        mode: 'cors',
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const creationToken = await getToken();

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
    } else if (!validateEmail(email)) {
      setErrorMessage('Invalid email address'); 
    } else {
      setErrorMessage('');
      user.password = password;
      user.email = email;

      const userData = {
        username: user.displayname,
        email: user.email,
        enabled: true,
        emailVerified: true,
        firstName: user.firstname,
        lastName: user.lastname,
        credentials: [
          {
            type: 'password',
            value: user.password,
            temporary: false,
          },
        ],
        groups: [
          "Customer"
        ],
        attributes: {
          postcode: user.postcode,
          address1: user.address1,
          address2: user.address2,
          address3: user.address3,
          birthday: user.birthday,
        }
      };

      try {
        const response = await fetch(`/api/uam/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${creationToken}`
          },
          body: JSON.stringify(userData),
          mode: 'cors',
        });
        if (!response.ok) {
          console.error(`Failed to create user:  ${response.status}`);
          showSnackbar('Request ', 'error');          
          // throw new Error(`Failed to create user:'  ${response.status}`);
        }

        const userSearchResponse = await fetch(`/api/uam/users`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${creationToken}`,
          },
        });

        if (!userSearchResponse.ok) {
          console.error(`Failed to fetch users: ${userSearchResponse.status}`);
          showSnackbar("Failed to fetch users", "error");
          return;
        }
        const users = await userSearchResponse.json();
        const targetUser = users.find((u: { email: string }) => u.email === user.email);
    
        if (!targetUser) {
          console.error(`User with email ${user.email} not found`);
          showSnackbar(`User with email ${user.email} not found`, "error");
          return;
        }

        showSnackbar('Request succeeded!', 'success');
        const rolesResponse = await fetch(`/api/uam/roles`, {
          method: "GET",
          headers: { Authorization: `Bearer ${creationToken}` },
        });
    
        if (!rolesResponse.ok) {
          console.error(`Failed to fetch roles: ${rolesResponse.status}`);
          showSnackbar("Failed to fetch roles", "error");
          return;
        }
    
        const roles = await rolesResponse.json();
        const customerRole = roles.find((r: { name: string }) => r.name === "customer");
    
        if (!customerRole) {
          console.error(`Role "customer" not found`);
          showSnackbar(`Role "customer" not found`, "error");
          return;
        }
        const assignRoleRequestBody = [
          {
            id: customerRole.id,
            name: "customer"
          }
        ];
        ;
        const assignRoleResponse = await fetch(`/api/uam/users/${targetUser.id}/role-mappings/realm`, {

          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${creationToken}`
          },
          body: JSON.stringify(assignRoleRequestBody)
        });

        if (!assignRoleResponse.ok) {
          const errorText = await assignRoleResponse.text();
          console.error(`Failed to assign role: ${assignRoleResponse.status}, Response: ${errorText}`);
          showSnackbar('Role assignment failed', 'error');
        } else {
          console.log('Role assigned successfully');
        }

        try {
          // Diffrent token between login_token and token(L92).
          const { token, userInfo } = await login(user.email, user.password);
          console.log('User Info:', userInfo);
    
          auth.login(token); 
          navigate('/');
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Login failed');
        }
      } catch (error) {
        console.error(error); // Error handling
        showSnackbar('Request Error', 'error');
        navigate('/');     
      }
    }
  };


  return (
    
    <Container component="main" maxWidth="xs">
    <Appbar />
    <h2>Create Your Account!</h2>
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
          id="mail_address"
          label="Mail Address"
          name="mail_address1"
          autoComplete="mail_address1"
          autoFocus
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="phone_number1"
          inputProps={{
            pattern: '\\d*',  
            inputMode: 'tel', 
            maxLength: 15,  
          }}
          label="Phone Number"
          name="phone_number1"
          autoComplete="phone_number1"
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
      <DashboardBottomNavigation />
    </Container>
  );
};

export default CreateAccount;
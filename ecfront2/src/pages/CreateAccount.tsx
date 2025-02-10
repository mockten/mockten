import DashboardBottomNavigation from '../components/DashboardBottomNavigation';
import Appbar from '../components/Appbar';
import React, { useState } from 'react';
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
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    //params.append('client_id', 'admin-cli'); 
    params.append('client_id', 'mockten-react-client');
    params.append('client_secret', 'mockten-client-secret');
    params.append('username', 'superadmin');
    params.append('password', 'superadmin');
    // params.append('username', 'seller');
    // params.append('password', 'seller');

    try {
      console.log('(1) Requesting Admin Access Token...');
      //const response = await fetch(`http://localhost:8082/api/uam/token`, {     
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
      console.log('(1.1) Admin Access Token retrieved successfully.')
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

    const token = await getToken();

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
        realmRoles: [
          "customer"
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
        console.log('(2)Creating user with email:', user.email);
        const response = await fetch(`/api/uam/users`, {
          //const response = await fetch(`http://localhost:8082/api/uam/users`, {
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
        console.log('(3)User created successfully');     
        console.log('(4)Fetching created user by email: ', user.email);

        const userSearchResponse = await fetch(`/api/uam/users`, {
        //const userSearchResponse = await fetch(`http://localhost:8082/api/uam/users`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
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
        console.log('(5)User ID:', targetUser.id)   

        showSnackbar('Request succeeded!', 'success');
        console.log('(6) Fetching role ID for "customer"');
        //const rolesResponse = await fetch(`http://localhost:8082/api/uam/roles`, {
        const rolesResponse = await fetch(`/api/uam/roles`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
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
        console.log('(7) Retrieved role ID:', customerRole.id);
        console.log('(8)Fetching roles assigned to the user...')
        const assignRoleRequestBody = {
          user_id: targetUser.id,  
          roles: [{ id: customerRole.id, name: "customer" }] 
        };
        ;
        console.log("assignRoleRequestBody の型:", typeof assignRoleRequestBody);
        console.log("Assign Role Request Body:", assignRoleRequestBody);
        //const assignRoleResponse = await fetch(`http://localhost:8082/api/uam/role-mapping`, {
        const assignRoleResponse = await fetch(`/api/uam/role-mapping`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
      } catch (error) {
        console.error(error); // Error handling
        showSnackbar('Request succeeded!', 'success');          
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
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import apiClient, { getAccessToken } from '../module/apiClient';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Divider,
  Grid,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowDropDown,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

// Mock image URLs - replace with actual asset URLs from your project
const arrowRightIcon = "http://localhost:3845/assets/ce1540ba1f8cb0bde2e26ff8f9fc566f7be994a6.svg";

export interface GeoAddress {
  geo_id: string;
  is_primary: boolean;
  user_name: string;
  country_code: string;
  postal_code: string;
  prefecture: string;
  city: string;
  town: string;
  building_name: string;
  room_number: string;
}

const MyCartCheckout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shippingFee = 1820, subtotal = 18200, maxDays = 3, items = [] } = location.state || {};

  const getAvailableDates = (startOffset: number) => {
    const dates = [];
    const today = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + startOffset + i);
      const dateStr = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      dates.push(dateStr);
    }
    return dates;
  };

  const availableDates = getAvailableDates(maxDays);
  const [selectedDate, setSelectedDate] = useState(availableDates[0]);
  const availableTimeSlots = [
    '10:00〜12:00',
    '12:00〜14:00',
    '14:00〜16:00',
    '16:00〜18:00',
    '18:00〜20:00',
  ];

  const [selectedTime, setSelectedTime] = useState('10:00〜12:00');
  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [selectedCard, setSelectedCard] = useState('************1234');
  const [securityCode, setSecurityCode] = useState('');

  const [addresses, setAddresses] = useState<GeoAddress[]>([]);
  const [shippingAddress, setShippingAddress] = useState<GeoAddress | null>(null);
  const [isAddressPopupOpen, setIsAddressPopupOpen] = useState(false);
  const [selectedGeoIdInPopup, setSelectedGeoIdInPopup] = useState<string>('');

  // New address form state
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    country_code: 'jp',
    postal_code: '',
    prefecture: '',
    city: '',
    town: '',
    building_name: '',
    room_number: '',
  });

  const fetchData = async (isInitialLoad: boolean = false): Promise<GeoAddress[]> => {
    try {
      let name = 'User';
      // Fallback name logic omitted for brevity, but let's keep it just in case
      try {
        const userinfoRes = await apiClient.get('/api/uam/userinfo');
        const userData = userinfoRes.data;
        name = userData.name || userData.given_name || userData.preferred_username || userData.email || 'User';
      } catch (uiError) {
        // Fallback to token decoding
        const token = getAccessToken();
        if (token) {
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);
            name = decoded.name || decoded.preferred_username || decoded.email || 'User';
          } catch (e) { }
        }
      }

      const response = await apiClient.get('/api/geo');
      let geoArray: GeoAddress[] = [];
      if (Array.isArray(response.data)) {
        geoArray = response.data;
      } else {
        // Just in case backend is outdated
        geoArray = [response.data];
      }

      geoArray = geoArray.map(g => ({
        ...g,
        user_name: g.user_name && g.user_name !== 'User' ? g.user_name : name
      }));

      setAddresses(geoArray);
      if (isInitialLoad && geoArray.length > 0) {
        setShippingAddress(geoArray[0]);
        setSelectedGeoIdInPopup(geoArray[0].geo_id);
      }
      return geoArray;
    } catch (error) {
      console.error('Failed to fetch shipping address', error);
      return [];
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const orderSummary = {
    subtotal: subtotal,
    shipping: shippingFee,
    total: subtotal + shippingFee,
  };

  const savedCards = [
    '************1234',
    '************5678',
  ];

  const handleDateChange = (event: SelectChangeEvent) => {
    setSelectedDate(event.target.value);
  };

  const handleTimeChange = (event: SelectChangeEvent) => {
    setSelectedTime(event.target.value);
  };

  const handlePaymentMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentMethod(event.target.value);
  };

  const handleCardChange = (event: SelectChangeEvent) => {
    setSelectedCard(event.target.value);
  };

  const handleConfirmOrder = () => {
    // TODO: Implement order confirmation logic
    console.log('Confirm order clicked');
    navigate('/cart/confirm');
  };

  const handleBackToCart = () => {
    navigate('/cart/list');
  };

  const handleChangeAddress = () => {
    if (shippingAddress) {
      setSelectedGeoIdInPopup(shippingAddress.geo_id);
    }
    setIsAddressPopupOpen(true);
  };

  const handleCloseAddressPopup = () => {
    setIsAddressPopupOpen(false);
    setIsAddingNewAddress(false);
  };

  const handleApplyAddressSelection = () => {
    const selected = addresses.find(a => a.geo_id === selectedGeoIdInPopup);
    if (selected) {
      setShippingAddress(selected);
    }
    handleCloseAddressPopup();
  };

  const handleAddNewAddressSubmit = async () => {
    try {
      const existingIds = new Set(addresses.map(a => a.geo_id));
      await apiClient.post('/api/profile', {
        postal_code: newAddressForm.postal_code,
        prefecture: newAddressForm.prefecture,
        city: newAddressForm.city,
        town: newAddressForm.town,
        building_name: newAddressForm.building_name,
        room_number: newAddressForm.room_number,
        country_code: newAddressForm.country_code,
      });
      // Refresh addresses without forcefully resetting the GUI base selection to node[0]
      const newGeoArray = await fetchData(false);
      const newAddr = newGeoArray.find(a => !existingIds.has(a.geo_id));
      if (newAddr) {
        setShippingAddress(newAddr);
        setSelectedGeoIdInPopup(newAddr.geo_id);
        handleCloseAddressPopup();
      } else {
        setIsAddingNewAddress(false);
      }
    } catch (e) {
      console.error('Failed to add new address', e);
    }
  };

  const handleAddNewCard = () => {
    // TODO: Open new card form
    console.log('Add new card clicked');
  };

  const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <Box
      sx={{
        borderLeft: '5px solid black',
        paddingLeft: '20px',
        paddingY: '12px',
        marginBottom: '16px',
        width: '100%',
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Noto Sans',
          fontWeight: 'bold',
          fontSize: '20px',
          color: 'black',
        }}
      >
        {title}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <Appbar />

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ padding: '24px 16px' }}>
        <Grid container spacing={4}>
          {/* Left Column */}
          <Grid item xs={12} md={7}>
            {/* Breadcrumb */}
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: '#8c8c8c',
                marginBottom: '16px',
              }}
            >
              <Link to="/" style={{ color: '#8c8c8c', textDecoration: 'none' }}>
                Home
              </Link>{' '}
              &gt;{' '}
              <Link to="/cart/list" style={{ color: '#8c8c8c', textDecoration: 'none' }}>
                My Cart
              </Link>{' '}
              &gt; Checkout
            </Typography>

            <Divider sx={{ marginBottom: '16px', backgroundColor: '#dddddd' }} />

            {/* Delivery Date and Time */}
            <SectionTitle title="Delivery Date and Time" />
            <FormControl
              fullWidth
              sx={{
                marginBottom: '16px',
                '& .MuiOutlinedInput-root': {
                  height: '50px',
                  borderRadius: '4px',
                  '& fieldset': {
                    borderColor: '#dddddd',
                  },
                },
              }}
            >
              <Select
                value={selectedDate}
                onChange={handleDateChange}
                displayEmpty
                IconComponent={ArrowDropDown}
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  color: 'black',
                }}
              >
                {availableDates.map((date) => (
                  <MenuItem key={date} value={date}>
                    {date}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              fullWidth
              sx={{
                marginBottom: '32px',
                '& .MuiOutlinedInput-root': {
                  height: '50px',
                  borderRadius: '4px',
                  '& fieldset': {
                    borderColor: '#dddddd',
                  },
                },
              }}
            >
              <Select
                value={selectedTime}
                onChange={handleTimeChange}
                displayEmpty
                IconComponent={ArrowDropDown}
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  color: 'black',
                }}
              >
                {availableTimeSlots.map((time) => (
                  <MenuItem key={time} value={time}>
                    {time}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Shipping Address */}
            <SectionTitle title="Shipping Address" />
            <Paper
              variant="outlined"
              sx={{
                padding: '16px 8px',
                borderColor: '#cccccc',
                borderRadius: '2px',
                marginBottom: '8px',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: 'black',
                  marginBottom: '8px',
                }}
              >
                {shippingAddress?.user_name || 'Loading...'}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  color: 'black',
                  lineHeight: 1.5,
                }}
              >
                {shippingAddress?.postal_code}<br />
                {[shippingAddress?.prefecture, shippingAddress?.city, shippingAddress?.town, shippingAddress?.building_name, shippingAddress?.room_number].filter(Boolean).join(' ')}
              </Typography>
            </Paper>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: '#666666',
                marginBottom: '16px',
              }}
            >
              Same as member address
            </Typography>
            <Button
              variant="outlined"
              onClick={handleChangeAddress}
              sx={{
                borderColor: '#cccccc',
                borderRadius: '4px',
                padding: '16px',
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                textTransform: 'none',
                width: '520px',
                '&:hover': {
                  borderColor: '#999999',
                  backgroundColor: '#f5f5f5',
                },
              }}
            >
              Change
            </Button>

            {/* Payment Method */}
            <Box sx={{ marginTop: '32px' }}>
              <SectionTitle title="Payment Method" />
              <RadioGroup
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
                sx={{ marginBottom: '8px' }}
              >
                <FormControlLabel
                  value="credit-card"
                  control={
                    <Radio
                      sx={{
                        color: 'black',
                        '&.Mui-checked': {
                          color: 'black',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontSize: '16px',
                        color: 'black',
                      }}
                    >
                      Credit Card
                    </Typography>
                  }
                />
              </RadioGroup>
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  color: 'black',
                  marginBottom: '16px',
                }}
              >
                Credit card used for previous order
              </Typography>
              <Button
                variant="outlined"
                onClick={handleAddNewCard}
                sx={{
                  borderColor: '#cccccc',
                  borderRadius: '4px',
                  padding: '16px',
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: 'black',
                  textTransform: 'none',
                  width: '520px',
                  marginBottom: '16px',
                  '&:hover': {
                    borderColor: '#999999',
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                + Pay with New Card
              </Button>
              <FormControl
                fullWidth
                sx={{
                  marginBottom: '16px',
                  '& .MuiOutlinedInput-root': {
                    height: '50px',
                    borderRadius: '4px',
                    '& fieldset': {
                      borderColor: '#dddddd',
                    },
                  },
                }}
              >
                <Select
                  value={selectedCard}
                  onChange={handleCardChange}
                  displayEmpty
                  IconComponent={ArrowDropDown}
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontSize: '16px',
                    color: 'black',
                  }}
                >
                  {savedCards.map((card) => (
                    <MenuItem key={card} value={card}>
                      {card}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px' }}>
                <Typography
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontSize: '16px',
                    color: 'black',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Security Code
                </Typography>
                <TextField
                  type="password"
                  value={securityCode}
                  onChange={(e) => setSecurityCode(e.target.value)}
                  placeholder=""
                  sx={{
                    width: '175px',
                    '& .MuiOutlinedInput-root': {
                      height: '50px',
                      borderRadius: '4px',
                      '& fieldset': {
                        borderColor: '#dddddd',
                      },
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginTop: '32px' }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleConfirmOrder}
                sx={{
                  backgroundColor: 'black',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '4px',
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'none',
                  maxWidth: '313px',
                  '&:hover': {
                    backgroundColor: '#333',
                  },
                }}
              >
                Confirm your Order
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={handleBackToCart}
                sx={{
                  backgroundColor: 'black',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '4px',
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'none',
                  maxWidth: '313px',
                  '&:hover': {
                    backgroundColor: '#333',
                  },
                }}
              >
                Back to Cart
              </Button>
            </Box>
          </Grid>

          {/* Right Column - Order Summary */}
          <Grid item xs={12} md={5}>
            <Box sx={{ paddingTop: '50px' }}>
              {/* Item List Summary */}
              <Box sx={{ marginBottom: '32px' }}>
                <Typography
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color: 'black',
                    marginBottom: '16px',
                  }}
                >
                  Items in Cart ({items.length})
                </Typography>
                {items.map((item: any) => (
                  <Box key={item.id} sx={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: '64px', height: '64px', objectFit: 'contain', backgroundColor: '#f5f5f5', borderRadius: '4px' }}
                      onError={(e) => { e.currentTarget.src = "http://localhost:3845/assets/ce1540ba1f8cb0bde2e26ff8f9fc566f7be994a6.svg"; }} /* Fallback to existing icon if fail? Or just the photo placeholder */
                    />
                    <Box>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', fontWeight: 'bold' }}>{item.name}</Typography>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '12px', color: '#666' }}>Quantity: {item.quantity}</Typography>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '12px', color: '#666' }}>Shipping: {item.shipping_type}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Order Summary */}
              <Box sx={{ marginBottom: '16px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: 'black',
                    }}
                  >
                    Subtotal:
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: 'black',
                      textAlign: 'right',
                    }}
                  >
                    $ {orderSummary.subtotal.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '45px' }}>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: 'black',
                    }}
                  >
                    Shipping Fee:
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: 'black',
                      textAlign: 'right',
                    }}
                  >
                    $ {orderSummary.shipping.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      color: 'black',
                    }}
                  >
                    Total Amount :
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <Typography
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: 'black',
                      }}
                    >
                      $
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontWeight: 'bold',
                        fontSize: '20px',
                        color: 'black',
                      }}
                    >
                      {orderSummary.total.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ marginY: '16px', backgroundColor: '#dddddd' }} />

              {/* Cancellation Policy Link */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.7,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontSize: '16px',
                    color: 'black',
                  }}
                >
                  Cancellation Policy
                </Typography>
                <img src={arrowRightIcon} alt="Arrow" style={{ width: '24px', height: '24px' }} />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Address Selection Dialog */}
      <Dialog open={isAddressPopupOpen} onClose={handleCloseAddressPopup} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold' }}>
          {isAddingNewAddress ? 'Add New Address' : 'Select Shipping Address'}
        </DialogTitle>
        <DialogContent dividers>
          {!isAddingNewAddress ? (
            <Box>
              <RadioGroup
                value={selectedGeoIdInPopup}
                onChange={(e) => setSelectedGeoIdInPopup(e.target.value)}
              >
                {addresses.map((addr) => {
                  const fullAddr = [addr.prefecture, addr.city, addr.town, addr.building_name, addr.room_number].filter(Boolean).join(' ');
                  return (
                    <Paper key={addr.geo_id} variant="outlined" sx={{ padding: '12px', marginBottom: '12px', borderColor: selectedGeoIdInPopup === addr.geo_id ? 'black' : '#cccccc' }}>
                      <FormControlLabel
                        value={addr.geo_id}
                        control={<Radio sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                        label={
                          <Box>
                            <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold' }}>
                              {addr.user_name} {addr.is_primary && <span style={{ color: '#007bff', fontSize: '12px', marginLeft: '8px' }}>(Primary)</span>}
                            </Typography>
                            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px' }}>
                              {addr.postal_code}<br />{fullAddr}
                            </Typography>
                          </Box>
                        }
                      />
                    </Paper>
                  );
                })}
              </RadioGroup>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setIsAddingNewAddress(true)}
                sx={{
                  marginTop: '16px',
                  borderColor: 'black',
                  color: 'black',
                  textTransform: 'none',
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                }}
              >
                + Add New Address
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
              <TextField label="Postal Code" value={newAddressForm.postal_code} onChange={e => setNewAddressForm({ ...newAddressForm, postal_code: e.target.value })} fullWidth size="small" />
              <TextField label="Prefecture" value={newAddressForm.prefecture} onChange={e => setNewAddressForm({ ...newAddressForm, prefecture: e.target.value })} fullWidth size="small" />
              <TextField label="City" value={newAddressForm.city} onChange={e => setNewAddressForm({ ...newAddressForm, city: e.target.value })} fullWidth size="small" />
              <TextField label="Town" value={newAddressForm.town} onChange={e => setNewAddressForm({ ...newAddressForm, town: e.target.value })} fullWidth size="small" />
              <TextField label="Building Name" value={newAddressForm.building_name} onChange={e => setNewAddressForm({ ...newAddressForm, building_name: e.target.value })} fullWidth size="small" />
              <TextField label="Room Number" value={newAddressForm.room_number} onChange={e => setNewAddressForm({ ...newAddressForm, room_number: e.target.value })} fullWidth size="small" />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: '16px' }}>
          <Button onClick={isAddingNewAddress ? () => setIsAddingNewAddress(false) : handleCloseAddressPopup} sx={{ color: '#666', textTransform: 'none', fontFamily: 'Noto Sans' }}>
            Cancel
          </Button>
          <Button
            onClick={isAddingNewAddress ? handleAddNewAddressSubmit : handleApplyAddressSelection}
            variant="contained"
            sx={{ backgroundColor: 'black', color: 'white', textTransform: 'none', fontFamily: 'Noto Sans', '&:hover': { backgroundColor: '#333' } }}
          >
            {isAddingNewAddress ? 'Save Address' : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default MyCartCheckout;

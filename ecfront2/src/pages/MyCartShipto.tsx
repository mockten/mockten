import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
} from '@mui/material';
import {
  ArrowDropDown,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

// Mock image URLs - replace with actual asset URLs from your project
const arrowRightIcon = "http://localhost:3845/assets/ce1540ba1f8cb0bde2e26ff8f9fc566f7be994a6.svg";

const MyCartShipto: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Get state
  // Get state
  const { shippingFee = 1820, subtotal = 18200, maxDays = 3, items = [] } = location.state || {};

  // Generate available dates based on maxDays
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
  /* New time slots as requested: 10:00-20:00, 2-hour intervals */
  const availableTimeSlots = [
    '10:00〜12:00',
    '12:00〜14:00',
    '14:00〜16:00',
    '16:00〜18:00',
    '18:00〜20:00',
  ];

  /* Update default state to first available slot */
  const [selectedTime, setSelectedTime] = useState('10:00〜12:00');
  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [selectedCard, setSelectedCard] = useState('************1234');
  const [securityCode, setSecurityCode] = useState('');

  // Mock data - replace with actual API calls
  const shippingAddress = {
    name: 'Taro Yamada',
    postalCode: '1530064',
    address: '103, Hikari Building, 5-3-11 Nakamachi, Shibuya-ku, Tokyo',
  };

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
    // TODO: Navigate to address change page
    console.log('Change address clicked');
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
                {shippingAddress.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  color: 'black',
                  lineHeight: 1.5,
                }}
              >
                {shippingAddress.postalCode}<br />
                {shippingAddress.address}
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

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default MyCartShipto;

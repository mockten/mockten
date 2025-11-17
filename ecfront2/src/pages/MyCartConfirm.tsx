import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Divider,
  Grid,
} from '@mui/material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

// Sample photo icon when a customer does not set prodct image.
import photoSvg from "../assets/photo.svg";
const arrowRightIcon = "http://localhost:3845/assets/ce1540ba1f8cb0bde2e26ff8f9fc566f7be994a6.svg";

interface CartItem {
  id: number;
  name: string;
  description: string;
  quantity: number;
  image: string;
}

const MyCartConfirm: React.FC = () => {
  const navigate = useNavigate();

  // Mock data - replace with actual API calls
  const shippingAddress = {
    name: 'Taro Yamada',
    postalCode: '1530064',
    address: '103, Hikari Building, 5-3-11 Nakamachi, Shibuya-ku, Tokyo',
  };

  const dubbingDateTime = {
    date: 'April 1, 2023',
    timeSlot: '19:00〜21:00',
  };

  const cancelPolicy = `Returns and Exchanges for Initial Defects We do not accept returns except in cases where there is a defect on our part. In the unlikely event of a defective product, please contact us by e-mail within 7 days of receipt of the product. If the initial defect is confirmed, we will contact you back with return shipping instructions. We will bear the shipping costs.`;

  const cartItems: CartItem[] = [
    {
      id: 1,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      quantity: 1,
      image: photoSvg,
    },
    {
      id: 2,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      quantity: 1,
      image: photoSvg,
    },
    {
      id: 3,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      quantity: 1,
      image: photoSvg,
    },
    {
      id: 4,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      quantity: 1,
      image: photoSvg,
    },
    {
      id: 5,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      quantity: 1,
      image: photoSvg,
    },
  ];

  const orderSummary = {
    subtotal: 18200,
    shipping: 1820,
    total: 20020,
  };

  const handlePlaceOrder = () => {
    // TODO: Implement order placement logic
    console.log('Place order clicked');
    navigate('/cart/checkout');
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
    <Box sx={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <Appbar />

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ padding: '24px 16px' }}>
        {/* Breadcrumb */}
        <Typography
          sx={{
            fontFamily: 'Noto Sans',
            fontSize: '14px',
            color: '#8c8c8c',
            marginBottom: '24px',
          }}
        >
          Home &gt; My Cart List &gt; Ship to &gt; Confirmation
        </Typography>

        <Grid container spacing={4}>
          {/* Left Column */}
          <Grid item xs={12} md={7}>
            {/* Shipping Address */}
            <SectionTitle title="Shipping Address" />
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
              }}
            >
              {shippingAddress.name}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '16px',
                color: 'black',
                marginBottom: '32px',
                lineHeight: 1.8,
              }}
            >
              {shippingAddress.postalCode}<br />
              {shippingAddress.address}
            </Typography>

            {/* Date and Time of Dubbing */}
            <SectionTitle title="Date and Time of Dubbing" />
            <Paper
              variant="outlined"
              sx={{
                padding: '16px',
                borderColor: '#cccccc',
                borderRadius: '4px',
                marginBottom: '32px',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  color: 'black',
                  lineHeight: 1.8,
                }}
              >
                {dubbingDateTime.date}<br />
                {dubbingDateTime.timeSlot}
              </Typography>
            </Paper>

            {/* About Cancel */}
            <SectionTitle title="About Cancel" />
            <Paper
              variant="outlined"
              sx={{
                padding: '16px',
                borderColor: 'rgba(204, 204, 204, 0.8)',
                borderRadius: '4px',
                marginBottom: '16px',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  color: 'black',
                  lineHeight: 1.8,
                }}
              >
                {cancelPolicy}
              </Typography>
            </Paper>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '32px',
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

            {/* Item List */}
            <SectionTitle title="Item List" />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cartItems.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '16px 0',
                  }}
                >
                  {/* Product Image */}
                  <Box
                    sx={{
                      width: '140px',
                      height: '140px',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      flexShrink: 0,
                    }}
                  >
                    <img src={item.image} alt={item.name} style={{ width: '64px', height: '64px' }} />
                  </Box>

                  {/* Product Details */}
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontWeight: 'bold',
                        fontSize: '20px',
                        color: 'black',
                        marginBottom: '8px',
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontSize: '16px',
                        color: '#666666',
                        lineHeight: 1.5,
                        marginBottom: '8px',
                      }}
                    >
                      {item.description}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontSize: '16px',
                        color: '#666666',
                      }}
                    >
                      Quantity：{item.quantity}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Right Column - Order Summary */}
          <Grid item xs={12} md={5}>
            <Box sx={{ paddingTop: '128px' }}>
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
                    Shipping and service charges:
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
                    Amount billed :
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

              {/* Place Order Button */}
              <Button
                fullWidth
                variant="contained"
                onClick={handlePlaceOrder}
                sx={{
                  backgroundColor: 'black',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '4px',
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#333',
                  },
                }}
              >
                Place Order
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default MyCartConfirm;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Container,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import {
  Star,
  StarHalf,
  StarBorder,
  KeyboardArrowRight,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

// Sample photo icon when a customer does not set prodct image.
import photoSvg from "../assets/photo.svg";
const closeIcon = "http://localhost:3845/assets/7918491eb7e0f27c67545a7abdd2b451c819a811.svg";

interface CartItem {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
  rating: number;
}

interface RecommendedProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number;
  image: string;
}

const CartListNew: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Mock data - replace with actual API calls
  const mockCartItems: CartItem[] = [
    {
      id: 1,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      price: 4550,
      quantity: 1,
      image: photoSvg,
      rating: 4.5,
    },
    {
      id: 2,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      price: 4550,
      quantity: 1,
      image: photoSvg,
      rating: 4.5,
    },
    {
      id: 3,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      price: 4550,
      quantity: 1,
      image: photoSvg,
      rating: 4.5,
    },
    {
      id: 4,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      price: 4550,
      quantity: 1,
      image: photoSvg,
      rating: 4.5,
    },
  ];

  const mockRecommendedProducts: RecommendedProduct[] = [
    {
      id: 1,
      name: 'Sample',
      description: 'Product description and price will be included.',
      price: 2999,
      rating: 4.5,
      image: photoSvg,
    },
    {
      id: 2,
      name: 'Sample',
      description: 'Product description and price will be included.',
      price: 3999,
      rating: 4.5,
      image: photoSvg,
    },
    {
      id: 3,
      name: 'Sample',
      description: 'Product description and price will be included.',
      price: 4999,
      rating: 4.5,
      image: photoSvg,
    },
    {
      id: 4,
      name: 'Sample',
      description: 'Product description and price will be included.',
      price: 5999,
      rating: 4.5,
      image: photoSvg,
    },
  ];

  useEffect(() => {
    // Mock API call for cart items
    setCartItems(mockCartItems);
  }, []);


  const handleRemoveItem = (itemId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const handleCheckout = () => {
    // TODO: Implement checkout functionality
    navigate('/cart/shipto');
    console.log('Proceeding to checkout');
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} sx={{ color: '#ffc107', fontSize: '16px' }} />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" sx={{ color: '#ffc107', fontSize: '16px' }} />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<StarBorder key={`empty-${i}`} sx={{ color: '#ffc107', fontSize: '16px' }} />);
    }

    return stars;
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateShipping = () => {
    const subtotal = calculateSubtotal();
    return Math.round(subtotal * 0.1); // 10% shipping
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping();
  };


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
            marginBottom: '16px',
          }}
        >
          Home &gt; My Cart List
        </Typography>

        {/* Cart Title */}
        <Box
          sx={{
            borderLeft: '5px solid black',
            paddingLeft: '20px',
            paddingY: '8px',
            marginBottom: '32px',
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
            Cart
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Cart Items */}
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {cartItems.map((item, ) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    position: 'relative',
                    padding: '16px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '8px',
                  }}
                >
                  {/* Remove Button */}
                  <IconButton
                    onClick={() => handleRemoveItem(item.id)}
                    sx={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: 'black',
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      '&:hover': {
                        backgroundColor: '#333',
                      },
                    }}
                  >
                    <img src={closeIcon} alt="Remove" style={{ width: '16px', height: '16px' }} />
                  </IconButton>

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
                      marginTop: '12px',
                    }}
                  >
                    <img src={item.image} alt={item.name} style={{ width: '64px', height: '64px' }} />
                  </Box>

                  {/* Product Details */}
                  <Box sx={{ flex: 1, marginTop: '16px' }}>
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
                      Quantity: {item.quantity}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Cart Summary */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                backgroundColor: '#f9f9f9',
                padding: '24px',
                borderRadius: '8px',
                position: 'sticky',
                top: '100px',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  color: 'black',
                  marginBottom: '24px',
                }}
              >
                Order Summary
              </Typography>

              {/* Pricing Breakdown */}
              <Box sx={{ marginBottom: '24px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
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
                    }}
                  >
                    $ {calculateSubtotal().toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
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
                    }}
                  >
                    $ {calculateShipping().toLocaleString()}
                  </Typography>
                </Box>

                <Divider sx={{ margin: '16px 0' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      color: 'black',
                    }}
                  >
                    Amount billed:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                      {calculateTotal().toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Checkout Button */}
              <Button
                fullWidth
                variant="contained"
                onClick={handleCheckout}
                sx={{
                  backgroundColor: 'black',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '4px',
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'none',
                  marginBottom: '24px',
                  '&:hover': {
                    backgroundColor: '#333',
                  },
                }}
              >
                CheckOut
              </Button>

              {/* Cancellation Policy */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontSize: '16px',
                    color: 'black',
                  }}
                >
                  Cancellation Policy
                </Typography>
                <KeyboardArrowRight sx={{ color: 'black', fontSize: '24px' }} />
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Recommended Products */}
        <Box sx={{ marginTop: '64px' }}>
          <Typography
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
              borderLeft: '5px solid black',
              paddingLeft: '20px',
              paddingY: '8px',
              marginBottom: '32px',
            }}
          >
            Recommended products based on browsing history
          </Typography>

          <Grid container spacing={2}>
            {mockRecommendedProducts.map((product) => (
              <Grid item xs={12} sm={6} md={3} key={product.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => navigate(`/item-new/${product.id}`)}
                >
                  <Box
                    sx={{
                      height: '100px',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img src={product.image} alt="Product" style={{ width: '64px', height: '64px' }} />
                  </Box>
                  <CardContent sx={{ padding: '8px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '8px' }}>
                      {renderStars(product.rating)}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        color: 'black',
                        marginBottom: '8px',
                      }}
                    >
                      {product.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontSize: '14px',
                        color: '#666666',
                      }}
                    >
                      {product.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default CartListNew;

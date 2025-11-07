import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  TextField,
  InputAdornment,
  Typography,
  IconButton,
  Container,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Divider,
} from '@mui/material';
import {
  Search,
  ShoppingCart,
  History,
  FavoriteBorder,
  Person,
  Close,
  Star,
  StarHalf,
  StarBorder,
  KeyboardArrowRight,
} from '@mui/icons-material';

// Mock image URLs - replace with actual asset URLs from your project
const searchIcon = "http://localhost:3845/assets/c535b42dcf7e566d2b67967fb9015d1c01b349ee.svg";
const shoppingCartIcon = "http://localhost:3845/assets/6860db0ced6811a1edcaf770921861e9208e14e7.svg";
const historyIcon = "http://localhost:3845/assets/127b7362eba9bb3a7b8dedc9f483e2c327967a29.svg";
const favoriteIcon = "http://localhost:3845/assets/d2ae4d607d49b9c7cb69fc521abc19d44737bd87.svg";
const personIcon = "http://localhost:3845/assets/dee4618eca47c5877a5dd52eaf0c6b5014b75e35.svg";
const arrowRightIcon = "http://localhost:3845/assets/ce1540ba1f8cb0bde2e26ff8f9fc566f7be994a6.svg";
const photoIcon = "http://localhost:3845/assets/3b8e50376eaa12f5e8f94e365596b31206067da6.svg";
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
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with actual API calls
  const mockCartItems: CartItem[] = [
    {
      id: 1,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      price: 4550,
      quantity: 1,
      image: photoIcon,
      rating: 4.5,
    },
    {
      id: 2,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      price: 4550,
      quantity: 1,
      image: photoIcon,
      rating: 4.5,
    },
    {
      id: 3,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      price: 4550,
      quantity: 1,
      image: photoIcon,
      rating: 4.5,
    },
    {
      id: 4,
      name: 'Sample',
      description: 'Sample text. Sample text. Sample text. Sample text. Sample text.',
      price: 4550,
      quantity: 1,
      image: photoIcon,
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
      image: photoIcon,
    },
    {
      id: 2,
      name: 'Sample',
      description: 'Product description and price will be included.',
      price: 3999,
      rating: 4.5,
      image: photoIcon,
    },
    {
      id: 3,
      name: 'Sample',
      description: 'Product description and price will be included.',
      price: 4999,
      rating: 4.5,
      image: photoIcon,
    },
    {
      id: 4,
      name: 'Sample',
      description: 'Product description and price will be included.',
      price: 5999,
      rating: 4.5,
      image: photoIcon,
    },
  ];

  useEffect(() => {
    // Mock API call for cart items
    setCartItems(mockCartItems);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search-new?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleRemoveItem = (itemId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const handleCheckout = () => {
    // TODO: Implement checkout functionality
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

  const footerLinks = [
    'About us', 'careers', 'USER guide',
    'careers', 'ir', 'CONTACT US'
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: '#5856D6',
          borderBottom: '1px solid #eeeeee',
        }}
      >
        <Toolbar sx={{ padding: '16px', gap: '24px' }}>
          {/* Logo */}
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
              whiteSpace: 'nowrap',
            }}
          >
            MOCKTEN
          </Typography>

          {/* Search Bar */}
          <Box sx={{ flexGrow: 1 }}>
            <form onSubmit={handleSearch}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '4px',
                    padding: '8px 16px',
                    '& fieldset': {
                      borderColor: '#cccccc',
                    },
                    '&:hover fieldset': {
                      borderColor: '#cccccc',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#cccccc',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#aaaaaa',
                    fontFamily: 'Noto Sans',
                    fontSize: '16px',
                    '&::placeholder': {
                      color: '#aaaaaa',
                      opacity: 1,
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <img src={searchIcon} alt="Search" style={{ width: '16px', height: '16px' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Box>

          {/* Navigation Icons */}
          <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <IconButton sx={{ color: 'black' }}>
              <img src={shoppingCartIcon} alt="Cart" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black' }}>
              <img src={historyIcon} alt="History" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black' }}>
              <img src={favoriteIcon} alt="Favorites" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black' }}>
              <img src={personIcon} alt="Profile" style={{ width: '24px', height: '24px' }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

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
              {cartItems.map((item, index) => (
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
      <Box
        sx={{
          backgroundColor: '#5856D6',
          padding: '40px 16px',
          marginTop: '48px',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              variant="h4"
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '24px',
                color: 'black',
                marginBottom: '16px',
              }}
            >
              MOCKTEN
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              {footerLinks.map((link, index) => (
                <Button
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 0',
                    borderBottom: '1px solid #dddddd',
                    borderRadius: 0,
                    textTransform: 'uppercase',
                    minWidth: '300px',
                    '&:hover': {
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: 'black',
                      textAlign: 'left',
                    }}
                  >
                    {link}
                  </Typography>
                  <img src={arrowRightIcon} alt="Arrow" style={{ width: '24px', height: '24px' }} />
                </Button>
              ))}
            </Box>
          </Box>
        </Container>
        
        <Box
          sx={{
            backgroundColor: 'black',
            padding: '8px',
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Noto Sans',
              fontSize: '12px',
              color: 'white',
            }}
          >
            © MOCKTEN, Inc.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default CartListNew;

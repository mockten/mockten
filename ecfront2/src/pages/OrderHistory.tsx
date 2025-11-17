import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  Inventory,
  LocalShipping,
  Home,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

// Mock image URLs - replace with actual asset URLs from your project
const photoIcon = "http://localhost:3845/assets/3b8e50376eaa12f5e8f94e365596b31206067da6.svg";

interface Order {
  id: number;
  name: string;
  purchaseDate: string;
  status: 'Order Confirming' | 'Shipping' | 'Delivered';
  quantity: number;
  image: string;
}

interface RecommendedProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number;
  image: string;
}

const OrderHistoryNew: React.FC = () => {
  const navigate = useNavigate();

  // Mock data - replace with actual API calls
  const mockOrders: Order[] = [
    {
      id: 1,
      name: 'Sample Name',
      purchaseDate: 'July 12',
      status: 'Order Confirming',
      quantity: 1,
      image: photoIcon,
    },
    {
      id: 2,
      name: 'Sample Name',
      purchaseDate: 'Jun 23',
      status: 'Shipping',
      quantity: 1,
      image: photoIcon,
    },
    {
      id: 3,
      name: 'Sample Name',
      purchaseDate: 'Jun 15',
      status: 'Delivered',
      quantity: 1,
      image: photoIcon,
    },
    {
      id: 4,
      name: 'Sample',
      purchaseDate: 'May 30',
      status: 'Delivered',
      quantity: 1,
      image: photoIcon,
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

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Box key={i} sx={{ width: '16px', height: '16px', backgroundColor: '#ffc107', borderRadius: '50%' }} />);
    }

    if (hasHalfStar) {
      stars.push(<Box key="half" sx={{ width: '16px', height: '16px', backgroundColor: '#ffc107', borderRadius: '50%', opacity: 0.5 }} />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Box key={`empty-${i}`} sx={{ width: '16px', height: '16px', backgroundColor: '#ddd', borderRadius: '50%' }} />);
    }

    return stars;
  };

  const getStatusProgress = (status: Order['status']) => {
    switch (status) {
      case 'Order Confirming':
        return { step1: true, step2: false, step3: false, progress: 33 };
      case 'Shipping':
        return { step1: true, step2: true, step3: false, progress: 66 };
      case 'Delivered':
        return { step1: true, step2: true, step3: true, progress: 100 };
      default:
        return { step1: false, step2: false, step3: false, progress: 0 };
    }
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
          Home &gt; My Purchase History
        </Typography>

        {/* Purchase History Title */}
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
            Purchase History
          </Typography>
        </Box>

        {/* Order Items */}
        <Box sx={{ marginBottom: '64px' }}>
          {mockOrders.map((order) => {
            const progress = getStatusProgress(order.status);
            return (
              <Box
                key={order.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '32px',
                  marginBottom: '48px',
                  padding: '16px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px',
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
                  <img src={order.image} alt={order.name} style={{ width: '64px', height: '64px' }} />
                </Box>

                {/* Order Details */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontWeight: 'bold',
                      fontSize: '20px',
                      color: 'black',
                      marginBottom: '16px',
                    }}
                  >
                    {order.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: '#666666',
                      marginBottom: '8px',
                    }}
                  >
                    Purchase Date: {order.purchaseDate}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: '#666666',
                      marginBottom: '8px',
                    }}
                  >
                    Status: {order.status}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: '#666666',
                      marginBottom: '24px',
                    }}
                  >
                    Quantity: {order.quantity}
                  </Typography>

                  {/* Status Tracker */}
                  <Box sx={{ marginTop: '24px', width: '100%', maxWidth: '400px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Inventory
                        sx={{
                          color: progress.step1 ? '#5856D6' : '#ccc',
                          fontSize: '32px',
                        }}
                      />
                      <LocalShipping
                        sx={{
                          color: progress.step2 ? '#5856D6' : '#ccc',
                          fontSize: '32px',
                        }}
                      />
                      <Home
                        sx={{
                          color: progress.step3 ? '#5856D6' : '#ccc',
                          fontSize: '32px',
                        }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={progress.progress}
                      sx={{
                        height: '4px',
                        borderRadius: '2px',
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#5856D6',
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

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

export default OrderHistoryNew;

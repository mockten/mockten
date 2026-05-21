import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../module/apiClient';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Select,
  MenuItem,
  Pagination,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material';
import {
  Inventory,
  LocalShipping,
  Home,
  Star,
  StarHalf,
  StarBorder,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

// Sample photo icon when a customer does not set prodct image.
import photoSvg from "../assets/photo.svg";

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

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const userinfoRes = await apiClient.get('/api/uam/userinfo');
        const userId = userinfoRes.data.email || userinfoRes.data.preferred_username;
        if (!userId) {
          setLoading(false);
          return;
        }

        const res = await apiClient.get(`/api/shipment?userId=${userId}`);
        const data = res.data || [];
        
        const mappedOrders: Order[] = data.map((item: any) => ({
          id: item.transaction_id,
          name: item.product_name || 'Unknown Product',
          purchaseDate: item.purchase_date,
          status: item.status === 'booked' ? 'Order Confirming' : 
                  (item.status === 'picked_up' || item.status === 'in_transit') ? 'Shipping' : 'Delivered',
          quantity: 1,
          image: `/api/storage/${item.product_id}.png`,
        }));
        setOrders(mappedOrders);
      } catch (err) {
        console.error('Failed to fetch orders', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

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



  const getStatusProgress = (status: Order['status']) => {
    switch (status) {
      case 'Order Confirming':
        return { step1: true, step2: false, step3: false, progress: 15 };
      case 'Shipping':
        return { step1: true, step2: true, step3: false, progress: 55 };
      case 'Delivered':
        return { step1: true, step2: true, step3: true, progress: 100 };
      default:
        return { step1: false, step2: false, step3: false, progress: 0 };
    }
  };

  const totalPages = Math.ceil(orders.length / rowsPerPage);
  const paginatedOrders = orders.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
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
        <Box sx={{ marginBottom: '32px' }}>
          {loading ? (
            <Typography>Loading...</Typography>
          ) : orders.length === 0 ? (
            <Typography>There are no purchase history records.</Typography>
          ) : (
            paginatedOrders.map((order) => {
              const progress = getStatusProgress(order.status);
              return (
              <Box
                key={order.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '32px',
                  marginBottom: '24px',
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
                  <img src={order.image} alt={order.name} style={{ width: '64px', height: '64px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = photoSvg; }} />
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
          }))}
        </Box>

        {/* Pagination */}
        {!loading && orders.length > 0 && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ marginBottom: '48px', flexWrap: 'wrap', gap: 2 }}
          >
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ fontFamily: 'Noto Sans' }}>Per page</InputLabel>
              <Select
                value={rowsPerPage}
                label="Per page"
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                sx={{ fontFamily: 'Noto Sans' }}
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
              </Select>
            </FormControl>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_e, v) => setPage(v)}
              color="primary"
              shape="rounded"
              sx={{
                '& .MuiPaginationItem-root': { fontFamily: 'Noto Sans' },
                '& .Mui-selected': { backgroundColor: '#5856D6 !important', color: 'white' },
              }}
            />
            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#666' }}>
              {(page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, orders.length)} of {orders.length}
            </Typography>
          </Stack>
        )}

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
                  onClick={() => navigate(`/item/${product.id}`)}
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

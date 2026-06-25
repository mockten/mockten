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
  IconButton,
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
  Favorite,
  FavoriteBorder,
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

const OrderHistoryNew: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());


  useEffect(() => {
    apiClient.get('/api/fav').then(res => {
      if (res.data && Array.isArray(res.data)) {
        setFavorites(new Set(res.data.map((f: any) => String(f.productId))));
      }
    }).catch(() => {});
  }, []);

  const handleToggleFavorite = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    const isFav = favorites.has(productId);
    setFavorites(prev => { const s = new Set(prev); isFav ? s.delete(productId) : s.add(productId); return s; });
    try {
      if (isFav) await apiClient.delete(`/api/fav/${productId}`);
      else await apiClient.post(`/api/fav/${productId}`);
    } catch {
      setFavorites(prev => { const s = new Set(prev); isFav ? s.add(productId) : s.delete(productId); return s; });
    }
  };

  const getUserIdFromToken = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('mockten_access_token');
    if (!token) return '';
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const decoded = JSON.parse(jsonPayload);
      return decoded.email || decoded.preferred_username || decoded.sub || '';
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const userId = getUserIdFromToken();
        const res = await apiClient.get(`/api/recommendation?user_id=${encodeURIComponent(userId)}&limit=4`);
        if (res.data && Array.isArray(res.data.recommendations)) {
          setRecommendedProducts(res.data.recommendations);
        }
      } catch (err) {
        console.error('Failed to fetch recommendations', err);
      }
    };
    fetchRecommendations();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Decode userId from JWT locally to avoid Keycloak roundtrip
        const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('mockten_access_token');
        let userId = '';
        if (token) {
          try {
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
            userId = payload.email || payload.preferred_username || payload.sub || '';
          } catch { /* fall through to API */ }
        }
        if (!userId) {
          const userinfoRes = await apiClient.get('/api/uam/userinfo');
          userId = userinfoRes.data.email || userinfoRes.data.preferred_username;
        }
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
          quantity: item.quantity || 1,
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
            {recommendedProducts.length > 0 ? (
              recommendedProducts.map((product) => (
                <Grid item xs={12} sm={6} md={3} key={product.product_id}>
                  <Card
                    sx={{ cursor: 'pointer', position: 'relative', '&:hover': { boxShadow: 3, transform: 'translateY(-4px)', transition: 'transform 0.2s' } }}
                    onClick={() => navigate(`/item/${product.product_id}`)}
                  >
                    <Box sx={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={`/api/storage/${product.product_id}.png`}
                        alt={product.product_name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }}
                        onError={(e) => { e.currentTarget.src = photoSvg; }}
                      />
                      <IconButton sx={{ position: 'absolute', top: 4, right: 4 }} onClick={(e) => handleToggleFavorite(e, product.product_id)}>
                        {favorites.has(product.product_id) ? <Favorite sx={{ color: 'red', fontSize: '20px' }} /> : <FavoriteBorder sx={{ fontSize: '20px' }} />}
                      </IconButton>
                    </Box>
                    <CardContent sx={{ padding: '8px' }}>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '14px', color: 'black', marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '40px' }}>
                        {product.product_name}
                      </Typography>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', fontWeight: 'bold', color: 'black' }}>
                        ${product.price}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              Array.from({ length: 4 }, (_, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card>
                    <Box
                      sx={{
                        height: '100px',
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img src={photoSvg} alt="Placeholder" style={{ width: '64px', height: '64px' }} />
                    </Box>
                    <CardContent sx={{ padding: '8px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '8px' }}>
                        {renderStars(4.5)}
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
                        Sample
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'Noto Sans',
                          fontSize: '14px',
                          color: '#666666',
                        }}
                      >
                        Product description and price will be included.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </Box>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default OrderHistoryNew;

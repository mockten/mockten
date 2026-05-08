import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../module/apiClient';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Star,
  StarHalf,
  StarBorder,
  Close,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

// Sample photo icon when a customer does not set prodct image.
import photoSvg from "../assets/photo.svg";

interface FavoriteItem {
  id: string | number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  stocks: number;
  availableStocks: number;
  selectedQuantity: number;
  image: string;
  rating: number;
  shippingOptions: { fee: number, label: string, days: number }[];
  selectedShippingLabel: string;
}

interface RecommendedProduct {
  id: string | number;
  name: string;
  description: string;
  price: number;
  rating: number;
  image: string;
}

interface ShippingInfo {
  sea_standard_fee?: number;
  sea_express_fee?: number;
  sea_standard_days?: number;
  sea_express_days?: number;
  air_standard_fee?: number;
  air_express_fee?: number;
  air_standard_days?: number;
  air_express_days?: number;
  standard_fee?: number;
  express_fee?: number;
  standard_days?: number;
  express_days?: number;
}

const FavoritesListNew: React.FC = () => {
  const navigate = useNavigate();
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const fetchFavorites = async () => {
    try {
      const res = await apiClient.get('/api/fav');
      if (res.data && Array.isArray(res.data)) {
        // Fetch cart items to check current cart quantity
        let cartMap = new Map();
        try {
          const cartRes = await apiClient.get('/api/cart/list');
          const cartItems = cartRes.data.items || [];
          for (const c of cartItems) {
            const pid = c.product?.product_id || c.product_id || c.productId || c.id;
            // c.id could be "PID:ShippingType", so we try c.product.product_id first
            cartMap.set(String(pid), (cartMap.get(String(pid)) || 0) + c.quantity);
          }
        } catch (e) { console.error("Failed to fetch cart", e); }

        const mappedItems: FavoriteItem[] = await Promise.all(res.data.map(async (item: any) => {
          let shippingOptions: { fee: number, label: string, days: number }[] = [];
          try {
            const shipRes = await apiClient.get<ShippingInfo>('/api/shipping', { params: { product_id: item.productId }});
            const data = shipRes.data;
            if (typeof data.sea_standard_fee === 'number') shippingOptions.push({ fee: data.sea_standard_fee, label: 'Sea Standard', days: data.sea_standard_days || 0 });
            if (typeof data.sea_express_fee === 'number') shippingOptions.push({ fee: data.sea_express_fee, label: 'Sea Express', days: data.sea_express_days || 0 });
            if (typeof data.air_standard_fee === 'number') shippingOptions.push({ fee: data.air_standard_fee, label: 'Air Standard', days: data.air_standard_days || 0 });
            if (typeof data.air_express_fee === 'number') shippingOptions.push({ fee: data.air_express_fee, label: 'Air Express', days: data.air_express_days || 0 });
            if (typeof data.standard_fee === 'number') shippingOptions.push({ fee: data.standard_fee, label: 'Standard Delivery', days: data.standard_days || 0 });
            if (typeof data.express_fee === 'number') shippingOptions.push({ fee: data.express_fee, label: 'Express Delivery', days: data.express_days || 0 });
          } catch(e) {}
          
          if (shippingOptions.length === 0) {
            shippingOptions.push({ fee: 0, label: 'Standard Delivery', days: 3 });
          }
          let cheapest = shippingOptions[0];
          for(const opt of shippingOptions) {
            if(opt.fee < cheapest.fee) cheapest = opt;
          }

          const cartQty = cartMap.get(String(item.productId)) || 0;
          const availableStocks = Math.max(0, (item.stocks || 0) - cartQty);

          return {
            id: item.productId,
            name: item.productName,
            description: item.summary || 'No description',
            price: item.price,
            quantity: 1, // Favorite item usually doesn't have quantity
            stocks: item.stocks || 0,
            availableStocks,
            selectedQuantity: availableStocks > 0 ? 1 : 0,
            image: `/api/storage/${item.productId}.png`,
            rating: item.avgReview || 0,
            shippingOptions,
            selectedShippingLabel: cheapest.label,
          };
        }));
        setFavoriteItems(mappedItems);
      } else {
        setFavoriteItems([]);
      }
    } catch (e) {
      console.error('Failed to fetch favorites', e);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemoveItem = async (itemId: string | number) => {
    try {
      await apiClient.delete(`/api/fav/${itemId}`);
      setFavoriteItems(prevItems => prevItems.filter(item => item.id !== itemId));
    } catch (e) {
      console.error('Failed to remove favorite item', e);
    }
  };

  const handleRemoveAll = async () => {
    for (const item of favoriteItems) {
      try {
        await apiClient.delete(`/api/fav/${item.id}`);
      } catch (e) {
        console.error('Failed to remove favorite item', e);
      }
    }
    setFavoriteItems([]);
  };

  const handleQuantityChange = (itemId: string | number, newQuantity: number) => {
    setFavoriteItems(prevItems => prevItems.map(item => 
      item.id === itemId ? { ...item, selectedQuantity: newQuantity } : item
    ));
  };

  const handleShippingChange = (itemId: string | number, newLabel: string) => {
    setFavoriteItems(prevItems => prevItems.map(item => 
      item.id === itemId ? { ...item, selectedShippingLabel: newLabel } : item
    ));
  };

  const handleAddToCart = async (item: FavoriteItem) => {
    if (item.availableStocks === 0 || item.selectedQuantity === 0) return;
    try {
      const selectedShip = item.shippingOptions.find(opt => opt.label === item.selectedShippingLabel) || item.shippingOptions[0];

      await apiClient.post("/api/cart/items", {
        product_id: item.id,
        quantity: item.selectedQuantity,
        shipping_fee: selectedShip.fee,
        shipping_type: selectedShip.label,
        shipping_days: selectedShip.days,
      });

      // Update available stock locally
      setFavoriteItems(prev => prev.map(f => {
        if (f.id === item.id) {
          const newAvail = Math.max(0, f.availableStocks - item.selectedQuantity);
          return {
            ...f,
            availableStocks: newAvail,
            selectedQuantity: newAvail > 0 ? 1 : 0
          };
        }
        return f;
      }));

      setSnackbarMessage('Added to cart');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err: any) {
      console.error(err);
      setSnackbarMessage('Failed to add to cart');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleBuy = (item: FavoriteItem) => {
    if (item.availableStocks === 0 || item.selectedQuantity === 0) return;
    
    const selectedShip = item.shippingOptions.find(opt => opt.label === item.selectedShippingLabel) || item.shippingOptions[0];
    
    const purchaseItem = {
      id: item.id,
      productId: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      quantity: item.selectedQuantity,
      shipping_fee: selectedShip.fee,
      shipping_type: selectedShip.label,
      shipping_days: selectedShip.days,
      stocks: item.stocks,
      image: item.image,
    };

    const itemSubtotal = item.price * item.selectedQuantity;
    const fee = selectedShip.fee;

    navigate('/cart/checkout', { 
      state: { 
        shippingFee: fee, 
        subtotal: itemSubtotal,
        maxDays: selectedShip.days,
        items: [purchaseItem],
        isFromCart: false
      } 
    });
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
          Home &gt; My Favorite List
        </Typography>

        {/* Favorites Title */}
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
            Favorite List
          </Typography>
        </Box>

        {/* Favorite Items */}
        <Box sx={{ marginBottom: '64px' }}>
          {favoriteItems.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {favoriteItems.map((item) => (
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
                    <Close sx={{ width: '16px', height: '16px' }} />
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
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      style={{ width: '64px', height: '64px', objectFit: 'contain' }} 
                      onError={(e) => { e.currentTarget.src = photoSvg; }}
                    />
                  </Box>

                  {/* Product Details */}
                  <Box sx={{ flex: 1, marginTop: '16px' }}>
                    <Typography
                      variant="h6"
                      onClick={() => navigate(`/item/${item.id}`)}
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontWeight: 'bold',
                        fontSize: '20px',
                        color: 'black',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
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
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: 'black',
                        marginTop: '8px',
                      }}
                    >
                      ${item.price}
                    </Typography>
                  </Box>

                  {/* Add to Cart Section */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginTop: '16px', width: '240px', flexShrink: 0 }}>
                    <Select
                      value={item.selectedQuantity}
                      onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                      disabled={item.availableStocks === 0}
                      size="small"
                      sx={{
                        backgroundColor: 'white',
                        border: '1px solid #cccccc',
                        borderRadius: '4px',
                        width: '100%',
                      }}
                    >
                      {item.availableStocks === 0 ? (
                        <MenuItem value={0}>Out of stock</MenuItem>
                      ) : (
                        Array.from({ length: Math.min(10, item.availableStocks) }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            {i + 1}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    
                    {/* Shipping Options */}
                    <Select
                      value={item.selectedShippingLabel}
                      onChange={(e) => handleShippingChange(item.id, e.target.value)}
                      disabled={item.availableStocks === 0 || item.shippingOptions.length === 0}
                      size="small"
                      sx={{
                        backgroundColor: 'white',
                        border: '1px solid #cccccc',
                        borderRadius: '4px',
                        width: '100%',
                        fontFamily: 'Noto Sans',
                        fontSize: '14px',
                      }}
                    >
                      {item.shippingOptions.map((opt, idx) => (
                        <MenuItem key={idx} value={opt.label}>
                          {opt.label} (${opt.fee})
                        </MenuItem>
                      ))}
                    </Select>

                      <Button
                        variant="contained"
                        fullWidth
                        sx={{
                          backgroundColor: '#5C59E8',
                          '&:hover': { backgroundColor: '#4A47D1' },
                          textTransform: 'none',
                          fontFamily: 'Noto Sans',
                          fontWeight: 'bold',
                          marginBottom: '8px'
                        }}
                        disabled={item.availableStocks === 0}
                        onClick={() => handleAddToCart(item)}
                      >
                        Add to Cart
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        sx={{
                          borderColor: '#5C59E8',
                          color: '#5C59E8',
                          '&:hover': { borderColor: '#4A47D1', backgroundColor: 'rgba(92, 89, 232, 0.04)' },
                          textTransform: 'none',
                          fontFamily: 'Noto Sans',
                          fontWeight: 'bold',
                        }}
                        disabled={item.availableStocks === 0}
                        onClick={() => handleBuy(item)}
                      >
                        Buy Now
                      </Button>
                  </Box>
                </Box>
              ))}

              {/* Remove All Button */}
              <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                <Button
                  variant="contained"
                  onClick={handleRemoveAll}
                  sx={{
                    backgroundColor: 'black',
                    color: 'white',
                    padding: '16px 32px',
                    borderRadius: '4px',
                    fontFamily: 'Noto Sans',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    textTransform: 'none',
                    minWidth: '384px',
                    '&:hover': {
                      backgroundColor: '#333',
                    },
                  }}
                >
                  Remove All
                </Button>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px 16px',
                textAlign: 'center',
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                  fontSize: '24px',
                  color: '#666666',
                  marginBottom: '16px',
                }}
              >
                No favorite items yet
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '16px',
                  color: '#666666',
                  marginBottom: '32px',
                }}
              >
                Start adding items to your favorites to see them here
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/')}
                sx={{
                  backgroundColor: '#5856D6',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#4a47a3',
                  },
                }}
              >
                Browse Products
              </Button>
            </Box>
          )}
        </Box>

        {/* Recommended Products 
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
        */}
      </Container>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default FavoritesListNew;

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../module/apiClient';
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
  Select,
  MenuItem,
  FormControl,
  Skeleton,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Star,
  StarHalf,
  StarBorder,
  KeyboardArrowRight,
  Close,
  Favorite,
  FavoriteBorder,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

// Sample photo icon when a customer does not set prodct image.
import photoSvg from "../assets/photo.svg";

interface ProductBackend {
  product_id: string;
  product_name: string;
  seller_id: string;
  price: number;
  category_id: string;
  summary: string;
  product_condition: string;
  geo_id: string;
  regist_day: string;
  last_update: string;
  stocks: number;
  sale_flag?: boolean;
  discount_rate?: number;
}

interface CartItemBackend {
  product: ProductBackend;
  quantity: number;
  added_at: string;
}

interface ShippingOption {
  fee: number;
  days: number;
  label: string;
}

interface CartItem {
  id: string; // This is now the line item ID (e.g. "prodID:shipping")
  productId: string; // Original product ID for images/links
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
  rating: number;
  shipping_fee: number;
  shipping_type: string;
  shipping_days: number;
  stocks: number;
  shippingOptions?: ShippingOption[];
  saleFlag?: boolean;
  discountRate?: number;
}

const CartListNew: React.FC = () => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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
      console.error('Failed to decode JWT token', e);
      return '';
    }
  };

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

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const userId = getUserIdFromToken();
        const res = await apiClient.get(`/api/recommendation?user_id=${userId}&limit=4`);
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
    const initCart = async () => {
      setLoading(true);
      let items: CartItemBackend[] = [];
      try {
        const res = await apiClient.get('/api/cart/list');
        items = res.data.items;
      } catch (e) {
        console.error('Failed to fetch cart items', e);
      }

      if (items && Array.isArray(items)) {
        // Render immediately with shipping info from cart data
        const initialItems: CartItem[] = items.map((item: any) => {
          const defaultShipping: ShippingOption = {
            fee: item.shipping_fee || 0,
            label: item.shipping_type || 'Standard Delivery',
            days: item.shipping_days || 3,
          };
          return {
            id: item.id || item.product.product_id,
            productId: item.product.product_id,
            name: item.product.product_name,
            description: item.product.summary,
            price: item.product.price,
            quantity: item.quantity,
            image: `/api/storage/${item.product.product_id}.png`,
            rating: 0,
            shipping_fee: item.shipping_fee || 0,
            shipping_type: item.shipping_type || 'Standard',
            shipping_days: item.shipping_days || 3,
            stocks: item.product.stocks || 0,
            shippingOptions: [defaultShipping],
            saleFlag: item.product.sale_flag || false,
            discountRate: item.product.discount_rate || 0,
          };
        });
        setCartItems(initialItems);
        setLoading(false);

        // Enrich with full shipping options asynchronously
        const enriched = await Promise.all(items.map(async (item: any) => {
          let shippingOptions: ShippingOption[] = [];
          try {
            const shipRes = await apiClient.get('/api/shipping', { params: { product_id: item.product.product_id } });
            const data = shipRes.data;
            if (typeof data.sea_standard_fee === 'number') shippingOptions.push({ fee: data.sea_standard_fee, label: 'Sea Standard', days: data.sea_standard_days || 0 });
            if (typeof data.sea_express_fee === 'number') shippingOptions.push({ fee: data.sea_express_fee, label: 'Sea Express', days: data.sea_express_days || 0 });
            if (typeof data.air_standard_fee === 'number') shippingOptions.push({ fee: data.air_standard_fee, label: 'Air Standard', days: data.air_standard_days || 0 });
            if (typeof data.air_express_fee === 'number') shippingOptions.push({ fee: data.air_express_fee, label: 'Air Express', days: data.air_express_days || 0 });
            if (typeof data.standard_fee === 'number') shippingOptions.push({ fee: data.standard_fee, label: 'Standard Delivery', days: data.standard_days || 0 });
            if (typeof data.express_fee === 'number') shippingOptions.push({ fee: data.express_fee, label: 'Express Delivery', days: data.express_days || 0 });
          } catch(e) {}
          if (shippingOptions.length === 0) shippingOptions.push({ fee: item.shipping_fee || 0, label: item.shipping_type || 'Standard Delivery', days: item.shipping_days || 3 });
          return { productId: item.product.product_id, shippingOptions };
        }));

        setCartItems(prev => prev.map(cartItem => {
          const e = enriched.find(r => r.productId === cartItem.productId);
          return e ? { ...cartItem, shippingOptions: e.shippingOptions } : cartItem;
        }));
      } else {
        setLoading(false);
      }
    };
    initCart();
  }, []);


  const handleRemoveItem = async (itemId: string) => {
    const removed = cartItems.find(i => i.id === itemId);
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
    try {
      await apiClient.delete(`/api/cart/items/${encodeURIComponent(itemId)}`);
    } catch (error) {
      console.error('Failed to remove item', error);
      if (removed) setCartItems(prev => [...prev, removed]);
      setSnackbar({ open: true, message: 'Failed to remove item. Please try again.', severity: 'error' });
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      await handleRemoveItem(itemId);
      return;
    }
    try {
      await apiClient.put(`/api/cart/items/${itemId}`, { quantity: newQuantity });
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch (error) {
      console.error('Failed to update quantity', error);
    }
  };

  const handleShippingChange = async (itemId: string, newShippingLabel: string) => {
    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;
    const newOption = item.shippingOptions?.find(o => o.label === newShippingLabel);
    if (!newOption || newOption.label === item.shipping_type) return;

    try {
      await apiClient.delete(`/api/cart/items/${itemId}`);
      await apiClient.post(`/api/cart/items`, {
        product_id: item.productId,
        quantity: item.quantity,
        shipping_fee: newOption.fee,
        shipping_type: newOption.label,
        shipping_days: newOption.days,
      });
      window.location.reload();
    } catch (e) {
      console.error('Failed to update shipping', e);
    }
  };



  const handleCheckout = () => {
    const fee = calculateShipping();
    const subtotal = calculateSubtotal();
    const maxDays = cartItems.reduce((max, item) => Math.max(max, item.shipping_days || 3), 0);
    // If no items or all 0, default to 3
    const finalDays = maxDays > 0 ? maxDays : 3;

    navigate('/cart/checkout', { state: { shippingFee: fee, subtotal: subtotal, maxDays: finalDays, items: [...cartItems], isFromCart: true } });
    console.log('Proceeding to checkout with fee:', fee, 'subtotal:', subtotal, 'days:', finalDays, 'items:', cartItems.length, 'isFromCart: true');
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
    return cartItems.reduce((total, item) => {
      const activePrice = item.saleFlag && item.discountRate && item.discountRate > 0
        ? Math.round(item.price * (1 - item.discountRate))
        : item.price;
      return total + (activePrice * item.quantity);
    }, 0);
  };

  // Removed getShippingFee (localStorage based)

  const calculateShipping = () => {
    // Sum up shipping fee of all items
    // Assuming backend fee is PER ITEM UNIT. If it is total for that line, then just add it.
    // Based on backend change: `c.Cart[idx].Quantity += quantity` and `ShippingFee` stored in struct.
    // If we add 2 items, `ShippingFee` in struct stays same (unit fee).
    // So Total = sum(item.quantity * item.shipping_fee)
    return cartItems.reduce((total, item) => total + (item.shipping_fee * item.quantity), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping();
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
          <Link to="/" style={{ color: '#8c8c8c', textDecoration: 'none' }}>
            Home
          </Link>{' '}
          &gt; My Cart
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
              {loading ? (
                [1, 2].map((i) => (
                  <Box key={i} sx={{ display: 'flex', gap: '16px', padding: '16px', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                    <Skeleton variant="rectangular" width={140} height={140} sx={{ borderRadius: '8px', flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="60%" height={32} sx={{ mb: 1 }} />
                      <Skeleton width="40%" height={20} sx={{ mb: 1 }} />
                      <Skeleton width="20%" height={28} />
                    </Box>
                  </Box>
                ))
              ) : null}
              {cartItems.map((item,) => (
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
                      '&:hover': { backgroundColor: '#333' },
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
                      style={{ width: '120px', height: '120px', objectFit: 'contain' }}
                      onError={(e) => {
                        e.currentTarget.src = photoSvg;
                      }}
                    />
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

                    {item.saleFlag && item.discountRate && item.discountRate > 0 ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'red', textDecoration: 'line-through' }}>
                          ${item.price.toLocaleString()}
                        </Typography>
                        <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '18px', color: 'black' }}>
                          ${Math.round(item.price * (1 - item.discountRate)).toLocaleString()}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography
                        sx={{
                          fontFamily: 'Noto Sans',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: 'black',
                          marginBottom: '8px',
                        }}
                      >
                        ${item.price.toLocaleString()}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <Typography
                        sx={{
                          fontFamily: 'Noto Sans',
                          fontSize: '16px',
                          color: '#666666',
                        }}
                      >
                        Quantity:
                      </Typography>
                      <FormControl variant="standard" sx={{ minWidth: 60 }}>
                        <Select
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))}
                          disableUnderline
                          disabled={item.stocks === 0}
                          sx={{
                            fontFamily: 'Noto Sans',
                            fontSize: '16px',
                            color: '#666666',
                            fontWeight: 'bold',
                            '& .MuiSelect-select': {
                              paddingY: '0px',
                            }
                          }}
                        >
                          {item.stocks === 0 && item.quantity === 0 ? (
                            <MenuItem value={0}>0 (Out of stock)</MenuItem>
                          ) : (
                            [0, ...Array.from({ length: Math.max(item.quantity, Math.min(10, item.stocks)) }, (_, i) => i + 1)].map((num) => (
                              <MenuItem key={num} value={num}>
                                {num === 0 ? '0 (Remove)' : num}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <Typography
                        sx={{
                          fontFamily: 'Noto Sans',
                          fontSize: '14px',
                          color: '#666666',
                        }}
                      >
                        Shipping:
                      </Typography>
                      <FormControl variant="standard" sx={{ minWidth: 120 }}>
                        <Select
                          value={item.shipping_type}
                          onChange={(e) => handleShippingChange(item.id, e.target.value)}
                          disableUnderline
                          sx={{
                            fontFamily: 'Noto Sans',
                            fontSize: '14px',
                            color: '#666666',
                            '& .MuiSelect-select': {
                              paddingY: '0px',
                            }
                          }}
                        >
                          {item.shippingOptions?.map(opt => (
                            <MenuItem key={opt.label} value={opt.label}>
                              {opt.label} (${opt.fee})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
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
                    Shipping fee:
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
                    Total Amount:
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => navigate('/cancellation-policy')}>
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Footer */}
      <Footer />
    </Box >
  );
};

export default CartListNew;

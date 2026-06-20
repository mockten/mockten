import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../module/apiClient';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Container,
  Grid,
  Button,
} from '@mui/material';
import {
  PhotoOutlined,
  KeyboardArrowRight,
  Star,
  StarHalf,
  StarBorder,
  Favorite,
  FavoriteBorder,
} from '@mui/icons-material';
import { IconButton } from '@mui/material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';
import photoSvg from "../assets/photo.svg";


interface Product {
  id: string;
  title: string;
  description: string;
  image: string;
  score?: number;
  price?: number;
  rating?: number;
}

interface Category {
  id: string;
  name: string;
  image: string;
}

const DashboardNew: React.FC = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);

  const [rankingProducts, setRankingProducts] = useState<Product[]>([]);
  const [activeSales, setActiveSales] = useState<{ id: string; name: string }[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [saleProducts, setSaleProducts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

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
    const fetchRecommendations = async () => {
      try {
        const userId = getUserIdFromToken();
        const res = await apiClient.get(`/api/recommendation?user_id=${userId}&limit=7`);
        if (res.data && Array.isArray(res.data.recommendations)) {
          setRecommendations(res.data.recommendations);
        }
      } catch (err) {
        console.error('Failed to fetch recommendations', err);
      }
    };
    fetchRecommendations();
  }, []);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const res = await apiClient.get('/api/ranking');
        if (res.data && res.data.ranking) {
          const formatted = res.data.ranking.slice(0, 10).map((item: any) => ({
            id: item.product_id,
            title: item.product_name,
            description: item.summary,
            image: item.image,
            score: item.score,
            price: item.price,
            rating: item.rating,
          }));
          setRankingProducts(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch ranking:', err);
      }
    };
    fetchRanking();
  }, []);

  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await apiClient.get('/api/fav');
        if (res.data && Array.isArray(res.data)) {
          const favSet = new Set<string>(res.data.map((f: any) => String(f.productId)));
          setFavorites(favSet);
        }
      } catch (e) {
        console.error('Failed to fetch favorites', e);
      }
    };
    fetchFavorites();
    
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get('/api/categories');
        if (res.data && Array.isArray(res.data)) {
          const formatted = res.data.map((c: any) => ({
            id: c.category_id,
            name: c.category_name,
            image: `/api/storage/${c.category_image}.png`,
          }));
          setCategories(formatted);
        }
      } catch (e) {
        console.error('Failed to fetch categories', e);
      }
    };
    fetchCategories();

    const fetchSales = async () => {
      try {
        const res = await apiClient.get('/api/sale/active');
        if (res.data && Array.isArray(res.data)) {
          setActiveSales(res.data);
        }
      } catch (e) {
        console.error('Failed to fetch active sales', e);
      }
    };
    fetchSales();

    const fetchSaleProducts = async () => {
      try {
        const res = await apiClient.get('/api/sale/products/random');
        if (res.data && res.data.items) {
          setSaleProducts(res.data.items.slice(0, 7));
        }
      } catch (e) {
        console.error('Failed to fetch sale products', e);
      }
    };
    fetchSaleProducts();
  }, []);

  useEffect(() => {
    if (activeSales.length >= 4) {
      const timer = setInterval(() => {
        setSlideIndex(prev => (prev + 1) % activeSales.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [activeSales]);

  const handleToggleFavorite = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    const isFav = favorites.has(productId);
    try {
      if (isFav) {
        await apiClient.delete(`/api/fav/${productId}`);
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        await apiClient.post(`/api/fav/${productId}`);
        setFavorites(prev => {
          const next = new Set(prev);
          next.add(productId);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
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

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/search`, { state: { category: categoryName } });
  };

  const handleProductClick = (productId: string) => {
    navigate(`/item/${productId}`);
  };

  const handleSaleClick = (saleId: string) => {
    navigate(`/search`, { state: { saleId } });
  };

  const getDisplaySales = () => {
    if (activeSales.length === 0) return [];
    if (activeSales.length < 4) return activeSales;
    const items = [];
    for (let i = 0; i < 3; i++) {
      items.push(activeSales[(slideIndex + i) % activeSales.length]);
    }
    return items;
  };

  return (
    <Box sx={{  width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <Appbar />

      {/* Main Content */}
      <Container maxWidth='lg' sx={{ padding: '72px 0' }}>
        {/* Hero Section */}
        <Box sx={{ display: 'flex', gap: '16px', marginBottom: '64px' }}>
          {getDisplaySales().map((sale) => (
            <Box
              key={sale.id}
              onClick={() => handleSaleClick(sale.id)}
              sx={{
                flex: 1,
                height: '240px',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                cursor: 'pointer',
                overflow: 'hidden',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s',
                },
              }}
            >
              <img
                src={`/api/storage/sale/${sale.id}.png`}
                alt={sale.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.src = photoSvg;
                }}
              />
            </Box>
          ))}
        </Box>

        {/* Limited-time sale Section */}
        <Box sx={{ marginBottom: '32px' }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
              borderLeft: '5px solid black',
              paddingLeft: '20px',
              paddingY: '8px',
              marginBottom: '16px',
            }}
          >
            Limited-time sale!
          </Typography>
          
          <Box sx={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
            {saleProducts.map((product) => (
              <Box
                key={product.product_id}
                onClick={() => handleProductClick(product.product_id)}
                sx={{
                  width: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s',
                  },
                }}
              >
                <Box
                  sx={{
                    width: '120px',
                    height: '120px',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    position: 'relative',
                  }}
                >
                  <img
                    src={`/api/storage/${product.product_id}.png`}
                    alt={product.product_name}
                    style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                    onError={(e) => {
                      e.currentTarget.src = photoSvg;
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontSize: '12px',
                    color: 'black',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '4px',
                  }}
                >
                  {product.product_name}
                </Typography>
                {product.discount_rate && product.discount_rate > 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <Typography
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontSize: '12px',
                        color: 'red',
                        textDecoration: 'line-through',
                      }}
                    >
                      ${product.price}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: 'black',
                      }}
                    >
                      ${Math.round(product.price * (1 - product.discount_rate))}
                    </Typography>
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '12px',
                      color: '#666666',
                    }}
                  >
                    ${product.price}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Top picks for you Section */}
        <Box sx={{ marginBottom: '32px' }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
              borderLeft: '5px solid black',
              paddingLeft: '20px',
              paddingY: '8px',
              marginBottom: '16px',
            }}
          >
            Top picks for you
          </Typography>
          
          <Box sx={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
            {recommendations.length > 0 ? (
              recommendations.map((product) => (
                <Box
                  key={product.product_id}
                  onClick={() => handleProductClick(product.product_id)}
                  sx={{
                    width: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: '120px',
                      height: '120px',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={`/api/storage/${product.product_id}.png`}
                      alt={product.product_name}
                      style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                      onError={(e) => {
                        e.currentTarget.src = photoSvg;
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '12px',
                      color: 'black',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: '4px',
                    }}
                  >
                    {product.product_name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '12px',
                      color: 'black',
                      fontWeight: 'bold',
                    }}
                  >
                    ${product.price}
                  </Typography>
                </Box>
              ))
            ) : (
              Array.from({ length: 7 }, (_, index) => (
                <Box
                  key={index}
                  sx={{
                    width: '120px',
                    height: '120px',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                  }}
                >
                  <PhotoOutlined />
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* Browse by Category Section */}
        <Box sx={{ marginBottom: '32px' }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
              borderLeft: '5px solid black',
              paddingLeft: '20px',
              paddingY: '8px',
              marginBottom: '16px',
            }}
          >
            Browse by Category
          </Typography>
          
          <Box sx={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
            {categories.map((category) => (
              <Box
                key={category.id}
                onClick={() => handleCategoryClick(category.name)}
                sx={{
                  minWidth: '120px',
                  width: '120px',
                  height: '120px',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 2,
                  },
                }}
              >
                <img 
                  src={category.image} 
                  alt={category.name} 
                  style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '8px' }}
                  onError={(e) => { e.currentTarget.src = photoSvg; }}
                />
                <Typography
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    color: 'black',
                    textAlign: 'center',
                    textTransform: 'uppercase'
                  }}
                >
                  {category.name}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Category Buttons */}
          <Grid container spacing={2}>
            {categories.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Button
                  fullWidth
                  onClick={() => handleCategoryClick(category.name)}
                  sx={{
                    justifyContent: 'space-between',
                    padding: '16px 0',
                    borderBottom: '1px solid #EEEEEE',
                    borderRadius: 0,
                    textTransform: 'none',
                    color: 'black',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      '& .MuiTypography-root': {
                        textDecoration: 'underline',
                      }
                    }
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      textTransform: 'uppercase'
                    }}
                  >
                    {category.name}
                  </Typography>
                  <KeyboardArrowRight />
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Ranking Section */}
        <Box sx={{ marginBottom: '32px' }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
              borderLeft: '5px solid black',
              paddingLeft: '20px',
              paddingY: '8px',
              marginBottom: '16px',
            }}
          >
            Ranking
          </Typography>
          
          <Box 
            sx={{ 
              display: 'flex', 
              gap: '16px', 
              overflowX: 'auto', 
              paddingBottom: '16px',
              '::-webkit-scrollbar': { height: '8px' },
              '::-webkit-scrollbar-thumb': { backgroundColor: '#EEEEEE', borderRadius: '4px' }
            }}
          >
            {rankingProducts.length > 0 ? rankingProducts.map((product, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#666666';

              return (
                <Box key={product.id} sx={{ minWidth: '180px', width: '180px' }}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      height: '100%',
                      position: 'relative',
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-4px)',
                        transition: 'transform 0.2s'
                      },
                    }}
                    onClick={() => handleProductClick(product.id)}
                  >
                    {/* Rank Badge */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px 8px',
                        backgroundColor: isTop3 ? rankColor : 'rgba(255,255,255,0.9)',
                        color: isTop3 ? 'white' : 'black',
                        borderRadius: '0 0 8px 0',
                        fontWeight: 'bold',
                        boxShadow: 1
                      }}
                    >
                      {isTop3 && <Star sx={{ fontSize: '16px', marginRight: '4px' }} />}
                      {rank}
                    </Box>

                    <Box
                      sx={{
                        width: '100%',
                        aspectRatio: '1/1',
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <img 
                        src={product.image} 
                        alt="Product" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }} 
                        onError={(e) => { e.currentTarget.src = photoSvg; }}
                      />
                      <IconButton
                        sx={{ position: 'absolute', top: 4, right: 4 }}
                        onClick={(e) => handleToggleFavorite(e, product.id)}
                      >
                        {favorites.has(product.id) ? (
                          <Favorite sx={{ color: 'red', fontSize: '20px' }} />
                        ) : (
                          <FavoriteBorder sx={{ fontSize: '20px' }} />
                        )}
                      </IconButton>
                    </Box>
                    <CardContent sx={{ padding: '8px' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontFamily: 'Noto Sans',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          color: 'black',
                          marginBottom: '4px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          height: '40px'
                        }}
                      >
                        {product.title}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '8px' }}>
                        {renderStars(product.rating ?? 0)}
                      </Box>

                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'Noto Sans',
                          fontSize: '14px',
                          color: '#666666',
                          fontWeight: 'bold',
                        }}
                      >
                        ${product.price}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              );
            }) : (
              <Box sx={{ width: '100%', textAlign: 'center', padding: '40px' }}>
                <Typography color="textSecondary">No ranking data available yet.</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default DashboardNew;

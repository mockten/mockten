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

  // Mock data - replace with actual API calls
  const categories: Category[] = [
    { id: 'toy', name: 'Toy', image: PhotoOutlined.toString() },
    { id: 'game', name: 'Game', image: PhotoOutlined.toString() },
    { id: 'music', name: 'Music', image: PhotoOutlined.toString() },
    { id: 'fashion', name: 'FASHION', image: PhotoOutlined.toString() },
    { id: 'home', name: 'HOME', image: PhotoOutlined.toString() },
    { id: 'electronics', name: 'ELECT', image: PhotoOutlined.toString() },
  ];

  const [rankingProducts, setRankingProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const res = await apiClient.get('/api/ranking');
        if (res.data && res.data.ranking) {
          const formatted = res.data.ranking.map((item: any) => ({
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
  }, []);

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

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/category/${categoryId}`);
  };

  const handleProductClick = (productId: string) => {
    navigate(`/item/${productId}`);
  };

  return (
    <Box sx={{  width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <Appbar />

      {/* Main Content */}
      <Container maxWidth='lg' sx={{ padding: '72px 0' }}>
        {/* Hero Section */}
        <Box sx={{ display: 'flex', gap: '16px', marginBottom: '64px' }}>
          <Box
            sx={{
              flex: 1,
              height: '240px',
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            <PhotoOutlined />
          </Box>
          <Box
            sx={{
              flex: 1,
              height: '240px',
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            <PhotoOutlined />
          </Box>
          <Box
            sx={{
              flex: 1,
              height: '240px',
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            <PhotoOutlined />
          </Box>
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
          
          <Box sx={{ display: 'flex', gap: '16px' }}>
            {Array.from({ length: 7 }, (_, index) => (
              <Box
                key={index}
                onClick={() => handleProductClick(index)}
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
          
          <Box sx={{ display: 'flex', gap: '16px' }}>
            {Array.from({ length: 7 }, (_, index) => (
              <Box
                key={index}
                onClick={() => handleProductClick(index)}
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
            ))}
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
          
          <Box sx={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            {Array.from({ length: 7 }, (_, index) => (
              <Box
                key={index}
                onClick={() => handleProductClick(index)}
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
            ))}
          </Box>

          {/* Category Buttons */}
          <Grid container spacing={3}>
            {categories.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Button
                  fullWidth
                  onClick={() => handleCategoryClick(category.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 0',
                    borderBottom: '1px solid #dddddd',
                    borderRadius: 0,
                    textTransform: 'uppercase',
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
          
          <Grid container spacing={2}>
            {rankingProducts.length > 0 ? rankingProducts.map((product, index) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={product.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => handleProductClick(product.id)}
                >
                  <Box
                    sx={{
                      height: '100px',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <img 
                      src={product.image} 
                      alt="Product" 
                      style={{ width: '64px', height: '64px', objectFit: 'contain' }} 
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
                        fontSize: '16px',
                        color: 'black',
                        marginBottom: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
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
              </Grid>
            )) : (
              <Box sx={{ width: '100%', textAlign: 'center', padding: '40px' }}>
                <Typography color="textSecondary">No ranking data available yet.</Typography>
              </Box>
            )}
          </Grid>
        </Box>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default DashboardNew;

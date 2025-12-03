import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
} from '@mui/material';
import {
  Star,
  StarHalf,
  StarBorder,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

// Sample photo icon when a customer does not set prodct image.
import photoSvg from "../assets/photo.svg";
import closeIcon from "../assets/close.png";

interface FavoriteItem {
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

const FavoritesListNew: React.FC = () => {
  const navigate = useNavigate();
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  // Mock data - replace with actual API calls
  const mockFavoriteItems: FavoriteItem[] = [
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
    // Mock API call for favorite items
    setFavoriteItems(mockFavoriteItems);
  }, []);

  const handleRemoveItem = (itemId: number) => {
    setFavoriteItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const handleRemoveAll = () => {
    setFavoriteItems([]);
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
              {favoriteItems.map((item, index) => (
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

                  {/* Remove All Button (only show on first item) */}
                  {index === 0 && (
                    <Box sx={{ marginTop: '16px' }}>
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
                  )}
                </Box>
              ))}
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
                onClick={() => navigate('/dashboard-new')}
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

export default FavoritesListNew;

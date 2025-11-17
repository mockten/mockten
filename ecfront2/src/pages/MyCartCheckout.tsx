import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Star,
  StarHalf,
  StarBorder,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

// Mock image URLs - replace with actual asset URLs from your project
const photoIcon = "http://localhost:3845/assets/3b8e50376eaa12f5e8f94e365596b31206067da6.svg";

interface RecommendedProduct {
  id: number;
  name: string;
  description: string;
  rating: number;
  image: string;
}

const MyCartCheckout: React.FC = () => {
  const navigate = useNavigate();

  // Mock data - replace with actual API calls
  const purchaseId = '000-000-000';

  const recommendedProducts: RecommendedProduct[] = [
    {
      id: 1,
      name: 'Sample',
      description: 'Product description and price will be included.',
      rating: 4.5,
      image: photoIcon,
    },
    {
      id: 2,
      name: 'Sample',
      description: 'Product description and price will be included.',
      rating: 4.5,
      image: photoIcon,
    },
    {
      id: 3,
      name: 'Sample',
      description: 'Product description and price will be included.',
      rating: 4.5,
      image: photoIcon,
    },
    {
      id: 4,
      name: 'Sample',
      description: 'Product description and price will be included.',
      rating: 4.5,
      image: photoIcon,
    },
  ];

  const handleBackToTop = () => {
    navigate('/');
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

  const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <Box
      sx={{
        borderLeft: '5px solid black',
        paddingLeft: '20px',
        paddingY: '12px',
        marginBottom: '16px',
        width: '100%',
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
        {title}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <Appbar />

      {/* Order Confirmation Section */}
      <Box
        sx={{
          backgroundColor: '#f5f5f5',
          padding: '32px 0',
          width: '100%',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              backgroundColor: 'white',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '14px',
                color: '#666666',
                height: '21px',
              }}
            >
              Purchase ID
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '32px',
                color: 'black',
                height: '48px',
              }}
            >
              {purchaseId}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '32px',
                color: 'black',
                height: '48px',
              }}
            >
              Thank you for your order!
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '24px',
                color: 'black',
                lineHeight: 1.8,
                height: '98px',
              }}
            >
              When you contact us,<br />
              we may ask you for this number.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ padding: '24px 16px' }}>
        {/* Back to Top Page Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <Button
            variant="outlined"
            onClick={handleBackToTop}
            sx={{
              borderColor: '#cccccc',
              borderRadius: '4px',
              padding: '16px',
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '16px',
              color: 'black',
              textTransform: 'none',
              width: '400px',
              '&:hover': {
                borderColor: '#999999',
                backgroundColor: '#f5f5f5',
              },
            }}
          >
            Back to Top Page
          </Button>
        </Box>

        {/* Recommended Products Section */}
        <SectionTitle title="Products purchased by the same person who purchased the same product" />

        <Grid container spacing={2}>
          {recommendedProducts.map((product) => (
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
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default MyCartCheckout;

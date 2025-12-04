import React from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';
import photoSvg from "../assets/photo.svg";


interface Product {
  id: number;
  title: string;
  description: string;
  image: string;
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

  const products: Product[] = [
    { id: 1, title: 'Sample', description: 'This is where you enter a description of the product.', image: photoSvg },
    { id: 2, title: 'Sample', description: 'This is where you enter a description of the product.', image: photoSvg },
    { id: 3, title: 'Sample', description: 'This is where you enter a description of the product.', image: photoSvg },
    { id: 4, title: 'Sample', description: 'This is where you enter a description of the product.', image: photoSvg },
    { id: 5, title: 'Sample', description: 'This is where you enter a description of the product.', image: photoSvg },
    { id: 6, title: 'Sample', description: 'This is where you enter a description of the product.', image: photoSvg },
  ];

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/category/${categoryId}`);
  };

  const handleProductClick = (productId: number) => {
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
            {products.map((product, index) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={product.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
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
                    }}
                  >
                    <img src={product.image} alt="Product" style={{ width: '64px', height: '64px' }} />
                  </Box>
                  <CardContent sx={{ padding: '8px' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontSize: '14px',
                        color: 'black',
                        marginBottom: '2px',
                      }}
                    >
                      # {index + 1}
                    </Typography>
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
                      {product.title}
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

export default DashboardNew;

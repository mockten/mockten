import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  TextField,
  InputAdornment,
  Typography,
  Card,
  CardContent,
  IconButton,
  Container,
  Grid,
  Button,
} from '@mui/material';
import {
  Search,
  ShoppingCart,
  History,
  FavoriteBorder,
  Person,
  KeyboardArrowRight,
  PhotoOutlined,
} from '@mui/icons-material';


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
  const [searchQuery, setSearchQuery] = useState('');
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
    { id: 1, title: 'Sample', description: 'This is where you enter a description of the product.', image: PhotoOutlined.toString() },
    { id: 2, title: 'Sample', description: 'This is where you enter a description of the product.', image: PhotoOutlined.toString() },
    { id: 3, title: 'Sample', description: 'This is where you enter a description of the product.', image: PhotoOutlined.toString() },
    { id: 4, title: 'Sample', description: 'This is where you enter a description of the product.', image: PhotoOutlined.toString() },
    { id: 5, title: 'Sample', description: 'This is where you enter a description of the product.', image: PhotoOutlined.toString() },
    { id: 6, title: 'Sample', description: 'This is where you enter a description of the product.', image: PhotoOutlined.toString() },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/category/${categoryId}`);
  };

  const handleProductClick = (productId: number) => {
    navigate(`/item/${productId}`);
  };

  const footerLinks = [
    'About us', 'CAREERS', 'user guide',
    'Careers', 'IR', 'COntact us'
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: '#5856D6',
          borderBottom: '1px solid #eeeeee',
          padding: '16px',
        }}
      >
        <Toolbar sx={{ gap: '24px', padding: 0 }}>
          {/* Logo */}
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
              whiteSpace: 'nowrap',
            }}
          >
            MOCKTEN
          </Typography>

          {/* Search Bar */}
          <Box sx={{ flexGrow: 1 }}>
            <form onSubmit={handleSearch}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '4px',
                    padding: '8px 16px',
                    '& fieldset': {
                      borderColor: '#cccccc',
                    },
                    '&:hover fieldset': {
                      borderColor: '#cccccc',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#cccccc',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#aaaaaa',
                    fontFamily: 'Noto Sans',
                    fontSize: '16px',
                    '&::placeholder': {
                      color: '#aaaaaa',
                      opacity: 1,
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Box>

          {/* Navigation Icons */}
          <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <IconButton sx={{ color: 'black' }} onClick={() => navigate('/cart/list')}>
              <ShoppingCart />
            </IconButton>
            <IconButton sx={{ color: 'black' }} onClick={() => navigate('/history')}>
              <History />
            </IconButton>
            <IconButton sx={{ color: 'black' }} onClick={() => navigate('/fav/list')}>
              <FavoriteBorder />
            </IconButton>
            <IconButton sx={{ color: 'black' }} onClick={() => navigate('/profile')}>
              <Person />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ padding: '72px 0' }}>
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
      <Box
        sx={{
          backgroundColor: '#5856D6',
          padding: '40px 16px',
          marginTop: 'auto',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              variant="h4"
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '24px',
                color: 'black',
                marginBottom: '16px',
              }}
            >
              MOCKTEN
            </Typography>
            
            <Grid container spacing={3}>
              {footerLinks.map((link, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Button
                    fullWidth
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
                      {link}
                    </Typography>
                    <KeyboardArrowRight />
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
        
        <Box
          sx={{
            backgroundColor: 'black',
            padding: '8px',
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Noto Sans',
              fontSize: '12px',
              color: 'white',
            }}
          >
            © MOCKTEN, Inc.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardNew;

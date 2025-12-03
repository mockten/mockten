import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  IconButton,
  Grid,
  Button,
  Checkbox,
  FormControlLabel,
  Chip,
  Pagination,
} from '@mui/material';
import {
  Star,
  StarHalf,
  StarBorder,
  Sort,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';
// Sample photo icon when a customer does not set prodct image.
import photoSvg from "../assets/photo.svg";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number;
  image: string;
  inStock: boolean;
  isNew: boolean;
  category: string;
}

interface SearchFilters {
  priceRange: [number, number];
  category: string[];
  rating: number;
  status: string[];
  stock: boolean;
  freeShipping: boolean;
}

const SearchResultNew: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    priceRange: [0, 1000],
    category: [],
    rating: 0,
    status: [],
    stock: false,
    freeShipping: false,
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data - replace with actual API calls
  const mockProducts: Product[] = Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    name: `Product ${index + 1}`,
    description: 'Product description and price will be included.',
    price: Math.floor(Math.random() * 500) + 10,
    rating: 4.5,
    image: photoSvg,
    inStock: Math.random() > 0.3,
    isNew: Math.random() > 0.7,
    category: ['Toy', 'Game', 'Music', 'Fashion', 'Home', 'Electronics'][Math.floor(Math.random() * 6)],
  }));

  useEffect(() => {
    // Extract search query from URL
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    setSearchQuery(query);
    
    // Mock API call for search results
    setProducts(mockProducts);
  }, [location.search]);

  const handleProductClick = (productId: number) => {
    navigate(`/item/${productId}`);
  };

  const handleFilterChange = (filterType: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      category: prev.category.includes(category)
        ? prev.category.filter(c => c !== category)
        : [...prev.category, category],
    }));
  };

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
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
    <Box sx={{  width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <Appbar />

      <Box maxWidth="lg" sx={{ display: 'flex' }}>
        {/* Sidebar Filters */}
        <Box
          sx={{
            width: '240px',
            backgroundColor: '#f5f5f5',
            minHeight: 'calc(100vh - 72px)',
            padding: '16px',
            borderRight: '1px solid #dddddd',
          }}
        >
          {/* Price Filter */}
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
                paddingLeft: '20px',
              }}
            >
              Price
            </Typography>
            <Box sx={{ paddingLeft: '20px' }}>
              <TextField
                size="small"
                placeholder="Min"
                type="number"
                sx={{ width: '120px', marginBottom: '8px' }}
              />
              <TextField
                size="small"
                placeholder="Max"
                type="number"
                sx={{ width: '120px' }}
              />
            </Box>
          </Box>

          {/* Category Filter */}
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
                paddingLeft: '20px',
              }}
            >
              Category
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingLeft: '20px' }}>
              <Chip
                label="Toy"
                onClick={() => handleCategoryToggle('Toy')}
                color={filters.category.includes('Toy') ? 'primary' : 'default'}
                size="small"
              />
              <Chip
                label="Game"
                onClick={() => handleCategoryToggle('Game')}
                color={filters.category.includes('Game') ? 'primary' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          {/* Rating Filter */}
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
                paddingLeft: '20px',
              }}
            >
              Review
            </Typography>
            <Box sx={{ paddingLeft: '20px' }}>
              {[4.5, 4.0, 3.5].map((rating) => (
                <Box
                  key={rating}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleFilterChange('rating', rating)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Star sx={{ color: '#ffc107', fontSize: '16px' }} />
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '14px',
                      color: 'black',
                    }}
                  >
                    {rating}〜
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Status Filter */}
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
                paddingLeft: '20px',
              }}
            >
              Status
            </Typography>
            <Box sx={{ paddingLeft: '20px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.status.includes('New')}
                    onChange={() => handleStatusToggle('New')}
                  />
                }
                label="New"
                sx={{ display: 'block' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.status.includes('Used')}
                    onChange={() => handleStatusToggle('Used')}
                  />
                }
                label="Used"
                sx={{ display: 'block' }}
              />
            </Box>
          </Box>

          {/* Stock Filter */}
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
                paddingLeft: '20px',
              }}
            >
              Stocks
            </Typography>
            <Box sx={{ paddingLeft: '20px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.stock}
                    onChange={(e) => handleFilterChange('stock', e.target.checked)}
                  />
                }
                label="Show only in stock"
              />
            </Box>
          </Box>

          {/* Shipping Filter */}
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
                paddingLeft: '20px',
              }}
            >
              Shipping
            </Typography>
            <Box sx={{ paddingLeft: '20px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.freeShipping}
                    onChange={(e) => handleFilterChange('freeShipping', e.target.checked)}
                  />
                }
                label="Show only free shipping"
              />
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ paddingLeft: '20px' }}>
            <Button
              variant="outlined"
              fullWidth
              sx={{ marginBottom: '8px', textTransform: 'none' }}
            >
              Search by these criteria
            </Button>
            <Button
              variant="text"
              fullWidth
              sx={{ textTransform: 'none' }}
              onClick={() => setFilters({
                priceRange: [0, 1000],
                category: [],
                rating: 0,
                status: [],
                stock: false,
                freeShipping: false,
              })}
            >
              Clear
            </Button>
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, padding: '24px' }}>
          {/* Search Header */}
          <Box sx={{ marginBottom: '16px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '20px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Category
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '14px',
                  color: '#666666',
                }}
              >
                Showing results for "{searchQuery}"
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontSize: '14px',
                    color: 'black',
                  }}
                >
                  Sort
                </Typography>
                <IconButton size="small">
                  <Sort sx={{ fontSize: '16px' }} />
                </IconButton>
              </Box>
            </Box>
          </Box>

          {/* Product Grid */}
          <Grid container spacing={2} sx={{ marginBottom: '32px' }}>
            {products.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '8px' }}>
                      {renderStars(product.rating)}
                    </Box>
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

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <Pagination
              count={5}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
            />
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default SearchResultNew;

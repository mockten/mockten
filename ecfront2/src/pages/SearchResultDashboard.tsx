import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  TextField,
  InputAdornment,
  Typography,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Container,
  Grid,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Chip,
  Pagination,
  Divider,
} from '@mui/material';
import {
  Search,
  ShoppingCart,
  History,
  FavoriteBorder,
  Person,
  Star,
  StarHalf,
  StarBorder,
  Sort,
  KeyboardArrowRight,
  PhotoOutlined,
} from '@mui/icons-material';

// Mock image URLs - replace with actual asset URLs from your project
const searchIcon = "http://localhost:3845/assets/c535b42dcf7e566d2b67967fb9015d1c01b349ee.svg";
const shoppingCartIcon = "http://localhost:3845/assets/cf00e2c65ca28692962425347773c9601b9b0872.svg";
const historyIcon = "http://localhost:3845/assets/127b7362eba9bb3a7b8dedc9f483e2c327967a29.svg";
const favoriteIcon = "http://localhost:3845/assets/0da304d80e782560b534fd7a29404144052ed6c2.svg";
const personIcon = "http://localhost:3845/assets/b8de36d7cafb2c108413879c186f2b787b24aa6c.svg";
const arrowRightIcon = "http://localhost:3845/assets/ce1540ba1f8cb0bde2e26ff8f9fc566f7be994a6.svg";
const photoIcon = "http://localhost:3845/assets/3b8e50376eaa12f5e8f94e365596b31206067da6.svg";

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
  const [sortBy, setSortBy] = useState('relevance');

  // Mock data - replace with actual API calls
  const mockProducts: Product[] = Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    name: `Product ${index + 1}`,
    description: 'Product description and price will be included.',
    price: Math.floor(Math.random() * 500) + 10,
    rating: 4.5,
    image: photoIcon,
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

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

  const footerLinks = [
    'About us', 'CAREERS', 'user guide',
    'Careers', 'IR', 'CONTACT US'
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: '#5856D6',
          borderBottom: '1px solid #eeeeee',
          height: '72px',
        }}
      >
        <Toolbar sx={{ padding: '16px', gap: '24px' }}>
          {/* Logo */}
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
              whiteSpace: 'nowrap',
              width: '100px',
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
                    height: '40px',
                    padding: '0 16px',
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
                    padding: '8px 0',
                    '&::placeholder': {
                      color: '#aaaaaa',
                      opacity: 1,
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <img src={searchIcon} alt="Search" style={{ width: '16px', height: '16px' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Box>

          {/* Navigation Icons */}
          <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center', width: '144px', height: '24px' }}>
            <IconButton sx={{ color: 'black', padding: '0' }}>
              <img src={shoppingCartIcon} alt="Cart" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black', padding: '0' }}>
              <img src={historyIcon} alt="History" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black', padding: '0' }}>
              <img src={favoriteIcon} alt="Favorites" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black', padding: '0' }}>
              <img src={personIcon} alt="Profile" style={{ width: '24px', height: '24px' }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex' }}>
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
                    <img src={arrowRightIcon} alt="Arrow" style={{ width: '24px', height: '24px' }} />
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

export default SearchResultNew;

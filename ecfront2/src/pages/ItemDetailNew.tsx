import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  Avatar,
  Chip,
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
  KeyboardArrowRight,
  PhotoOutlined,
  CardGiftcard,
  LocalShipping,
  Apartment,
  ArrowDropDown,
} from '@mui/icons-material';

// Mock image URLs - replace with actual asset URLs from your project
const searchIcon = "http://localhost:3845/assets/c535b42dcf7e566d2b67967fb9015d1c01b349ee.svg";
const shoppingCartIcon = "http://localhost:3845/assets/6860db0ced6811a1edcaf770921861e9208e14e7.svg";
const historyIcon = "http://localhost:3845/assets/127b7362eba9bb3a7b8dedc9f483e2c327967a29.svg";
const favoriteIcon = "http://localhost:3845/assets/d2ae4d607d49b9c7cb69fc521abc19d44737bd87.svg";
const personIcon = "http://localhost:3845/assets/b8de36d7cafb2c108413879c186f2b787b24aa6c.svg";
const arrowRightIcon = "http://localhost:3845/assets/ce1540ba1f8cb0bde2e26ff8f9fc566f7be994a6.svg";
const photoIcon = "http://localhost:3845/assets/a1b0ed7702166474c37dc399310037a954fd840e.svg";
const photoIcon2 = "http://localhost:3845/assets/3b8e50376eaa12f5e8f94e365596b31206067da6.svg";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  description: string;
  specifications: {
    area: string;
    size: string;
    vendor: string;
    material: string;
    weight: string;
    content: string;
  };
  images: string[];
  reviews: Review[];
}

interface Review {
  id: number;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

const ItemDetailNew: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with actual API calls
  const mockProduct: Product = {
    id: parseInt(id || '1'),
    name: 'Sample Product Name',
    category: 'Category Name',
    price: 3880,
    rating: 4.5,
    description: 'Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text.',
    specifications: {
      area: 'Japan',
      size: 'Approximately 45cm ✕ 100cm',
      vendor: '◯◯◯Co, Ltd.',
      material: 'wooden',
      weight: '5.3kg',
      content: '1',
    },
    images: [photoIcon, photoIcon, photoIcon, photoIcon],
    reviews: [
      {
        id: 1,
        userName: 'Anonymous',
        rating: 4.5,
        comment: 'Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text.',
        date: '2024-01-01',
      },
      {
        id: 2,
        userName: 'Anonymous',
        rating: 4.5,
        comment: 'Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text.',
        date: '2024-01-02',
      },
    ],
  };

  useEffect(() => {
    // Mock API call for product details
    setProduct(mockProduct);
  }, [id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search-new?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} sx={{ color: '#ffc107', fontSize: '24px' }} />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" sx={{ color: '#ffc107', fontSize: '24px' }} />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<StarBorder key={`empty-${i}`} sx={{ color: '#ffc107', fontSize: '24px' }} />);
    }

    return stars;
  };

  const renderStarsSmall = (rating: number) => {
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

  const handlePurchase = () => {
    // TODO: Implement purchase functionality
    console.log('Purchase clicked', { productId: product?.id, quantity });
  };

  const relatedProducts = [
    { id: 1, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
    { id: 2, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
    { id: 3, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
    { id: 4, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
  ];

  const footerLinks = [
    'About us', 'CAREERS', 'user guide',
    'Careers', 'IR', 'CONTACT US'
  ];

  if (!product) {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* App Bar */}
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: '#5856D6',
          borderBottom: '1px solid #eeeeee',
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
                      <img src={searchIcon} alt="Search" style={{ width: '16px', height: '16px' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Box>

          {/* Navigation Icons */}
          <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <IconButton sx={{ color: 'black' }}>
              <img src={shoppingCartIcon} alt="Cart" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black' }}>
              <img src={historyIcon} alt="History" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black' }}>
              <img src={favoriteIcon} alt="Favorites" style={{ width: '24px', height: '24px' }} />
            </IconButton>
            <IconButton sx={{ color: 'black' }}>
              <img src={personIcon} alt="Profile" style={{ width: '24px', height: '24px' }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

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
          Home &gt; {product.name}
        </Typography>

        <Grid container spacing={4}>
          {/* Product Images */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {/* Main Image */}
              <Grid item xs={12} md={9}>
                <Box
                  sx={{
                    height: '400px',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                  }}
                >
                  <img src={product.images[selectedImage]} alt="Product" style={{ width: '64px', height: '64px' }} />
                </Box>
              </Grid>

              {/* Thumbnail Images */}
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {product.images.map((image, index) => (
                    <Box
                      key={index}
                      sx={{
                        height: '120px',
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: selectedImage === index ? '2px solid #5856D6' : '1px solid #ddd',
                      }}
                      onClick={() => setSelectedImage(index)}
                    >
                      <img src={image} alt={`Product ${index + 1}`} style={{ width: '64px', height: '64px' }} />
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Grid>

          {/* Product Details */}
          <Grid item xs={12} md={4}>
            <Box sx={{ padding: '0 16px' }}>
              {/* Category */}
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '14px',
                  color: 'black',
                  marginBottom: '8px',
                }}
              >
                {product.category}
              </Typography>

              {/* Product Name */}
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
                {product.name}
              </Typography>

              {/* Price and Rating */}
              <Box sx={{ marginBottom: '16px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: 'black',
                    }}
                  >
                    $
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontWeight: 'bold',
                      fontSize: '22px',
                      color: 'black',
                    }}
                  >
                    {product.price.toLocaleString()}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: 'black',
                    }}
                  >
                    Free shipping
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {renderStars(product.rating)}
                </Box>
              </Box>

              {/* Quantity */}
              <Box sx={{ marginBottom: '16px' }}>
                <Typography
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontSize: '16px',
                    color: 'black',
                    marginBottom: '8px',
                  }}
                >
                  Quantity
                </Typography>
                <FormControl sx={{ minWidth: 120 }}>
                  <Select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    displayEmpty
                    sx={{
                      backgroundColor: 'white',
                      border: '1px solid #cccccc',
                      borderRadius: '4px',
                      '& .MuiSelect-select': {
                        padding: '8px 16px',
                      },
                    }}
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        {i + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Purchase Button */}
              <Button
                fullWidth
                variant="contained"
                onClick={handlePurchase}
                sx={{
                  backgroundColor: 'black',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '4px',
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'none',
                  marginBottom: '16px',
                  '&:hover': {
                    backgroundColor: '#333',
                  },
                }}
              >
                購入する
              </Button>

              {/* Product Overview */}
              <Box sx={{ marginBottom: '16px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CardGiftcard sx={{ color: 'black', fontSize: '24px' }} />
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontWeight: 'bold',
                      fontSize: '20px',
                      color: 'black',
                    }}
                  >
                    Product Overview
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontSize: '16px',
                    color: 'black',
                    lineHeight: 1.8,
                  }}
                >
                  {product.description}
                </Typography>
              </Box>

              {/* Product Specifications */}
              <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #dddddd' }}>
                <Table>
                  <TableBody>
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <TableRow key={key} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell
                          component="th"
                          scope="row"
                          sx={{
                            backgroundColor: '#f5f5f5',
                            fontFamily: 'Noto Sans',
                            fontSize: '14px',
                            color: 'black',
                            borderRight: '1px solid #dddddd',
                            width: '120px',
                          }}
                        >
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontFamily: 'Noto Sans',
                            fontSize: '14px',
                            color: 'black',
                          }}
                        >
                          {value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Grid>
        </Grid>

        {/* Product Description */}
        <Box sx={{ marginTop: '48px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CardGiftcard sx={{ color: 'black', fontSize: '24px' }} />
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '20px',
                color: 'black',
              }}
            >
              Product description
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: 'Noto Sans',
              fontSize: '16px',
              color: 'black',
              lineHeight: 1.8,
              marginBottom: '16px',
            }}
          >
            {product.description}
          </Typography>
        </Box>

        {/* About the Vendor */}
        <Box sx={{ marginTop: '48px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Apartment sx={{ color: 'black', fontSize: '24px' }} />
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '20px',
                color: 'black',
              }}
            >
              About the vendor
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: 'Noto Sans',
              fontSize: '16px',
              color: 'black',
              lineHeight: 1.8,
              marginBottom: '16px',
            }}
          >
            Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text.
          </Typography>
        </Box>

        {/* About Delivery */}
        <Box sx={{ marginTop: '48px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <LocalShipping sx={{ color: 'black', fontSize: '24px' }} />
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '20px',
                color: 'black',
              }}
            >
              About delivery
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: 'Noto Sans',
              fontSize: '16px',
              color: 'black',
              lineHeight: 1.8,
              marginBottom: '16px',
            }}
          >
            Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text.
          </Typography>
        </Box>

        {/* Customer Reviews */}
        <Box sx={{ marginTop: '48px' }}>
          <Typography
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
              borderLeft: '5px solid black',
              paddingLeft: '20px',
              paddingY: '8px',
              marginBottom: '24px',
            }}
          >
            Customer Review
          </Typography>

          <Grid container spacing={4}>
            {product.reviews.map((review, index) => (
              <Grid item xs={12} md={6} key={review.id}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <Avatar
                    sx={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#f5f5f5',
                    }}
                  >
                    <img src={photoIcon} alt="User" style={{ width: '22px', height: '22px' }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Typography
                        sx={{
                          fontFamily: 'Noto Sans',
                          fontSize: '16px',
                          color: 'black',
                          fontWeight: 'bold',
                        }}
                      >
                        {review.rating}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {renderStarsSmall(review.rating)}
                      </Box>
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontSize: '16px',
                        color: 'black',
                        marginBottom: '8px',
                      }}
                    >
                      {review.userName}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontSize: '16px',
                        color: 'black',
                        lineHeight: 1.8,
                      }}
                    >
                      {review.comment}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
            <Button
              variant="outlined"
              sx={{
                border: '1px solid #cccccc',
                borderRadius: '4px',
                padding: '16px',
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#5856D6',
                  color: '#5856D6',
                },
              }}
            >
              See all reviews
            </Button>
          </Box>
        </Box>

        {/* Frequently Bought Together */}
        <Box sx={{ marginTop: '48px' }}>
          <Typography
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '20px',
              color: 'black',
              borderLeft: '5px solid black',
              paddingLeft: '20px',
              paddingY: '8px',
              marginBottom: '24px',
            }}
          >
            Frequently bought together
          </Typography>

          <Grid container spacing={2}>
            {relatedProducts.map((relatedProduct) => (
              <Grid item xs={12} sm={6} md={3} key={relatedProduct.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => navigate(`/item/${relatedProduct.id}`)}
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
                    <img src={photoIcon2} alt="Product" style={{ width: '64px', height: '64px' }} />
                  </Box>
                  <CardContent sx={{ padding: '8px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '8px' }}>
                      {renderStarsSmall(relatedProduct.rating)}
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
                      {relatedProduct.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontSize: '14px',
                        color: '#666666',
                      }}
                    >
                      {relatedProduct.description}
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
          marginTop: '48px',
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

export default ItemDetailNew;

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
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
} from '@mui/material';
import {
  Star,
  StarHalf,
  StarBorder,
  CardGiftcard,
  LocalShipping,
  Apartment,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';
import photoSvg from "../assets/photo.svg";

interface Review {
  id: number;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

interface Product {
  product_id: string;
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
  reviews: Review[];
}

const parseS3ListXmlKeys = (xmlText: string): string[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseError = doc.getElementsByTagName('parsererror');
  if (parseError && parseError.length > 0) {
    return [];
  }

  const keyNodes = Array.from(doc.getElementsByTagName('Key'));
  return keyNodes
    .map((n) => (n.textContent || '').trim())
    .filter((k) => k.length > 0)
    .filter((k) => !k.endsWith('/'))
    .filter((k) => k.toLowerCase().endsWith('.png'));
};

const sortObjectKeys = (keys: string[]): string[] => {
  const getFileName = (k: string) => {
    const idx = k.lastIndexOf('/');
    return idx >= 0 ? k.slice(idx + 1) : k;
  };

  const getNumericPrefix = (fileName: string): number | null => {
    const dot = fileName.lastIndexOf('.');
    const base = dot >= 0 ? fileName.slice(0, dot) : fileName;
    const n = Number(base);
    return Number.isFinite(n) ? n : null;
  };

  return [...keys].sort((a, b) => {
    const fa = getFileName(a);
    const fb = getFileName(b);
    const na = getNumericPrefix(fa);
    const nb = getNumericPrefix(fb);

    if (na !== null && nb !== null) {
      return na - nb;
    }

    if (na !== null && nb === null) {
      return -1;
    }

    if (na === null && nb !== null) {
      return 1;
    }

    return fa.localeCompare(fb);
  });
};

const ItemDetailNew: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

  const productIdForImages = useMemo(() => {
    if (product?.product_id) return product.product_id;
    return id || '';
  }, [product?.product_id, id]);

  const mockProduct: Product = useMemo(() => {
    return {
      product_id: id || 'unknown-product',
      name: 'Sample Product Name',
      category: 'Category Name',
      price: 3880,
      rating: 4.5,
      description:
        'Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text.',
      specifications: {
        area: 'Japan',
        size: 'Approximately 45cm ✕ 100cm',
        vendor: '◯◯◯Co, Ltd.',
        material: 'wooden',
        weight: '5.3kg',
        content: '1',
      },
      reviews: [
        {
          id: 1,
          userName: 'Anonymous',
          rating: 4.5,
          comment:
            'Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text.',
          date: '2024-01-01',
        },
        {
          id: 2,
          userName: 'Anonymous',
          rating: 4.5,
          comment:
            'Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text. Sample text.',
          date: '2024-01-02',
        },
      ],
    };
  }, [id]);

  useEffect(() => {
    setProduct(mockProduct);
  }, [mockProduct]);

  useEffect(() => {
    const run = async () => {
      if (!productIdForImages) {
        setImages([photoSvg]);
        setSelectedImage(0);
        return;
      }

      const base = '/api/storage';
      const mainUrl = `${base}/${encodeURIComponent(productIdForImages)}.png`;
      const listUrl = `${base}?list-type=2&prefix=${encodeURIComponent(`${productIdForImages}/`)}`;

      try {
        const res = await fetch(listUrl, { method: 'GET' });
        if (!res.ok) {
          setImages([mainUrl]);
          setSelectedImage(0);
          return;
        }

        const xml = await res.text();
        const keys = parseS3ListXmlKeys(xml);
        const sorted = sortObjectKeys(keys);
        const thumbs = sorted.slice(0, 3).map((k) => `${base}/${k}`);
        const merged = [mainUrl, ...thumbs];

        setImages(merged);
        setSelectedImage(0);
      } catch {
        setImages([mainUrl]);
        setSelectedImage(0);
      }
    };

    run();
  }, [productIdForImages]);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} sx={{ color: '#ffc107', fontSize: '24px' }} />);
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
      stars.push(<Star key={`full-s-${i}`} sx={{ color: '#ffc107', fontSize: '16px' }} />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half-s" sx={{ color: '#ffc107', fontSize: '16px' }} />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<StarBorder key={`empty-s-${i}`} sx={{ color: '#ffc107', fontSize: '16px' }} />);
    }

    return stars;
  };

  const handlePurchase = () => {
    console.log('Purchase clicked', { productId: product?.product_id, quantity });
  };

  const handleAddtocart = () => {
    console.log('Add to cart clicked', { productId: product?.product_id, quantity });
  };

  const relatedProducts = [
    { id: 1, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
    { id: 2, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
    { id: 3, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
    { id: 4, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
  ];

  if (!product) {
    return <div>Loading...</div>;
  }

  const currentMain = images[selectedImage] || images[0] || photoSvg;

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
      <Appbar />

      <Container maxWidth="lg" sx={{ padding: '24px 16px' }}>
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
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={9}>
                <Box
                  sx={{
                    height: '400px',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={imgErrorMap[currentMain] ? photoSvg : currentMain}
                    alt="Product"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    onError={() => setImgErrorMap((m) => ({ ...m, [currentMain]: true }))}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {images.slice(0, 4).map((image, index) => {
                    const src = imgErrorMap[image] ? photoSvg : image;
                    return (
                      <Box
                        key={`${image}-${index}`}
                        sx={{
                          height: '120px',
                          backgroundColor: '#f5f5f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: selectedImage === index ? '2px solid #5856D6' : '1px solid #ddd',
                          overflow: 'hidden',
                        }}
                        onClick={() => setSelectedImage(index)}
                      >
                        <img
                          src={src}
                          alt={`Product ${index + 1}`}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={() => setImgErrorMap((m) => ({ ...m, [image]: true }))}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ padding: '0 16px' }}>
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

              <Box sx={{ marginBottom: '16px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black' }}>$</Typography>
                  <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '22px', color: 'black' }}>
                    {product.price.toLocaleString()}
                  </Typography>
                  <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black' }}>
                    Free shipping
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {renderStars(product.rating)}
                </Box>
              </Box>

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

              <Button
                fullWidth
                variant="contained"
                onClick={handleAddtocart}
                sx={{
                  backgroundColor: 'gray',
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
                Add to Cart
              </Button>

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
                Buy
              </Button>

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
                        <TableCell sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black' }}>
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

        <Box sx={{ marginTop: '48px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CardGiftcard sx={{ color: 'black', fontSize: '24px' }} />
            <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '20px', color: 'black' }}>
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

        <Box sx={{ marginTop: '48px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Apartment sx={{ color: 'black', fontSize: '24px' }} />
            <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '20px', color: 'black' }}>
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

        <Box sx={{ marginTop: '48px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <LocalShipping sx={{ color: 'black', fontSize: '24px' }} />
            <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '20px', color: 'black' }}>
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
            {product.reviews.map((review) => (
              <Grid item xs={12} md={6} key={review.id}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <Avatar sx={{ width: '40px', height: '40px', backgroundColor: '#f5f5f5' }}>
                    <img src={photoSvg} alt="User" style={{ width: '22px', height: '22px' }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black', fontWeight: 'bold' }}>
                        {review.rating}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {renderStarsSmall(review.rating)}
                      </Box>
                    </Box>
                    <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black', marginBottom: '8px' }}>
                      {review.userName}
                    </Typography>
                    <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black', lineHeight: 1.8 }}>
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
                    <img src={photoSvg} alt="Product" style={{ width: '64px', height: '64px' }} />
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
                    <Typography variant="body2" sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#666666' }}>
                      {relatedProduct.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      <Footer
        footerLinks={[
          'About us', 'CAREERS', 'user guide',
          'Careers', 'IR', 'CONTACT US'
        ]}
      />
    </Box>
  );
};

export default ItemDetailNew;

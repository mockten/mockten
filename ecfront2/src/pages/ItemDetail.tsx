import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Pagination,
} from '@mui/material';
import {
  Star,
  StarHalf,
  StarBorder,
  CardGiftcard,
  LocalShipping,
  Apartment,
  DirectionsBoat,
  Flight,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';
import photoSvg from '../assets/photo.svg';
import apiClient from '../module/apiClient';

interface Review {
  id: string;
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
  reviewCount: number;
  description: string;
  specifications: {
    area: string;
    vendor: string;
    condition: string;
    content: string;
  };
  vendorDescription: string;
  reviews: Review[];
}

interface ApiReview {
  reviewId: string;
  userId: string;
  userName?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ApiItemDetailResponse {
  productId: string;
  productName: string;
  sellerName: string;
  price: number;
  categoryName: string;
  productCondition: string;
  inStock: boolean;
  stocks: number;
  summary: string;
  geo: {
    geoId: string;
    countryCode: string;
    postalCode: string;
    prefecture: string;
    city: string;
    town: string;
    buildingName: string;
    roomNumber: string;
    latitude: number | null;
    longitude: number | null;
  };
  registDay: string;
  lastUpdate: string;
  avgReview?: number;
  reviewCount?: number;
  vendorUserName?: string;
  vendorDescription?: string;
  reviews?: ApiReview[];
}

interface ApiItemReviewsResponse {
  productId: string;
  total: number;
  limit: number;
  offset: number;
  reviews: ApiReview[];
}

interface ShippingInfo {
  sea_standard_fee?: number;
  sea_express_fee?: number;
  sea_standard_days?: number;
  sea_express_days?: number;
  air_standard_fee?: number;
  air_express_fee?: number;
  air_standard_days?: number;
  air_express_days?: number;
  standard_fee?: number;
  express_fee?: number;
  standard_days?: number;
  express_days?: number;
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

    if (na !== null && nb !== null) return na - nb;
    if (na !== null && nb === null) return -1;
    if (na === null && nb !== null) return 1;
    return fa.localeCompare(fb);
  });
};

const countryLabel = (code: string): string => {
  const c = (code || '').toUpperCase();
  if (c === 'JP') return 'Japan';
  if (c === 'SG') return 'Singapore';
  if (c.length > 0) return c;
  return 'N/A';
};

const safeUserName = (s?: string): string => {
  const t = (s || '').trim();
  return t.length > 0 ? t : 'Anonymous';
};

const mapApiReviewsToUi = (apiReviews: ApiReview[] | undefined): Review[] => {
  if (!apiReviews || apiReviews.length === 0) return [];
  return apiReviews.map((r) => ({
    id: r.reviewId,
    userName: safeUserName(r.userName),
    rating: typeof r.rating === 'number' ? r.rating : 0,
    comment: r.comment || '',
    date: r.createdAt || '',
  }));
};

const mapApiToProduct = (api: ApiItemDetailResponse, fallbackId: string): Product => {
  const rating = typeof api.avgReview === 'number' ? api.avgReview : 0.0;

  const vendorName =
    (api.vendorUserName && api.vendorUserName.trim().length > 0)
      ? api.vendorUserName
      : (api.sellerName || '');

  const vendorDesc =
    (api.vendorDescription && api.vendorDescription.trim().length > 0)
      ? api.vendorDescription
      : 'Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text.';

  const reviews = mapApiReviewsToUi(api.reviews);
  const reviewCount =
    typeof api.reviewCount === 'number'
      ? api.reviewCount
      : reviews.length;

  return {
    product_id: api.productId || fallbackId,
    name: api.productName || 'Sample Product Name',
    category: api.categoryName || 'Category Name',
    price: typeof api.price === 'number' ? api.price : 0,
    rating,
    reviewCount,
    description: api.summary || '',
    specifications: {
      area: countryLabel(api.geo?.countryCode || ''),
      vendor: vendorName || 'N/A',
      condition: api.productCondition || 'new',
      content: '1',
    },
    vendorDescription: vendorDesc,
    reviews,
  };
};

const ItemDetailNew: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<string>('');

  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [selectedShipping, setSelectedShipping] = useState<{ fee: number, label: string; days: number } | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const reviewsPageSize = 20;

  const productIdForImages = useMemo(() => {
    if (product?.product_id) return product.product_id;
    return id || '';
  }, [product?.product_id, id]);

  const location = useLocation();
  const state = (location.state ?? {}) as { successMessage?: string };
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state?.successMessage) {
      setOpen(true);
    }
  }, [state]);

  useEffect(() => {
    const run = async () => {
      setLoadError('');
      setProduct(null);

      if (!id) {
        setLoadError('Missing product id.');
        return;
      }

      try {
        const res = await apiClient.get<ApiItemDetailResponse>(`/api/item/detail/${encodeURIComponent(id)}`);
        const apiData = res.data;
        setProduct(mapApiToProduct(apiData, id));
      } catch {
        setLoadError('Failed to load product detail.');
      }
    };

    run();
  }, [id]);

  useEffect(() => {
    const fetchShipping = async () => {
      setShippingInfo(null);
      setShippingLoading(false);
      setShippingError('');

      if (!id) return;

      setShippingLoading(true);
      try {
        const res = await apiClient.get<ShippingInfo>('/api/shipping', {
          params: { product_id: id }
        });
        setShippingInfo(res.data);
      } catch (err) {
        setShippingError('Failed to load shipping info');
      } finally {
        setShippingLoading(false);
      }
    };

    fetchShipping();
  }, [id]);

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
    if (!selectedShipping) {
      setSnackbarMessage('Please select a delivery method');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    navigate('/cart/shipto', { state: { shippingFee: selectedShipping.fee } });
  };

  const handleAddtocart = async () => {
    console.log('Add to cart clicked', { product_id: product?.product_id, quantity });
    if (!product?.product_id) {
      console.error('Product ID is missing');
      return;
    }
    if (!selectedShipping) {
      setSnackbarMessage('Please select a delivery method');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      // Use apiClient.post which requires full path starts with /api
      await apiClient.post("/api/cart/items", {
        product_id: product.product_id,
        quantity,
        shipping_fee: selectedShipping.fee,
        shipping_type: selectedShipping.label,
        shipping_days: selectedShipping.days,
      });

      console.log('Product added to cart');
      setSnackbarMessage('Added to cart');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err: any) {
      console.error(err.message || 'Add to cart failed');
      setSnackbarMessage('Add to cart failed');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const relatedProducts = [
    { id: 1, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
    { id: 2, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
    { id: 3, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
    { id: 4, name: 'Sample Product', description: 'Sample Text. Sample TextSample TextSample TextSample TextSample Text', rating: 4.5 },
  ];

  const hasReviews = useMemo(() => {
    if (!product) return false;
    if (product.reviewCount > 0) return true;
    return product.reviews.length > 0;
  }, [product]);

  const openAllReviews = async () => {
    if (!product?.product_id) return;

    setReviewsOpen(true);
    setReviewsError('');
    setReviewsLoading(true);
    setAllReviews([]);
    setReviewsTotal(0);
    setReviewsPage(1);

    try {
      const offset = 0;
      const url = `/api/item/reviews/${encodeURIComponent(product.product_id)}?limit=${reviewsPageSize}&offset=${offset}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        setReviewsError(`Failed to load reviews. status=${res.status}`);
        setReviewsLoading(false);
        return;
      }
      const data = (await res.json()) as ApiItemReviewsResponse;
      setAllReviews(mapApiReviewsToUi(data.reviews));
      setReviewsTotal(typeof data.total === 'number' ? data.total : 0);
    } catch {
      setReviewsError('Failed to load reviews.');
    } finally {
      setReviewsLoading(false);
    }
  };

  const closeAllReviews = () => {
    setReviewsOpen(false);
    setReviewsLoading(false);
    setReviewsError('');
    setAllReviews([]);
    setReviewsTotal(0);
    setReviewsPage(1);
  };

  const totalReviewPages = useMemo(() => {
    if (!reviewsTotal) return 1;
    return Math.max(1, Math.ceil(reviewsTotal / reviewsPageSize));
  }, [reviewsTotal]);

  const onChangeReviewsPage = async (_: React.ChangeEvent<unknown>, value: number) => {
    if (!product?.product_id) return;
    setReviewsPage(value);
    setReviewsError('');
    setReviewsLoading(true);

    try {
      const offset = (value - 1) * reviewsPageSize;
      const url = `/api/item/reviews/${encodeURIComponent(product.product_id)}?limit=${reviewsPageSize}&offset=${offset}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        setReviewsError(`Failed to load reviews. status=${res.status}`);
        setReviewsLoading(false);
        return;
      }
      const data = (await res.json()) as ApiItemReviewsResponse;
      setAllReviews(mapApiReviewsToUi(data.reviews));
      setReviewsTotal(typeof data.total === 'number' ? data.total : 0);
    } catch {
      setReviewsError('Failed to load reviews.');
    } finally {
      setReviewsLoading(false);
    }
  };

  if (loadError) {
    return (
      <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
        <Appbar />
        <Container maxWidth="lg" sx={{ padding: '24px 16px' }}>
          <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black' }}>
            {loadError}
          </Typography>
        </Container>
        <Footer footerLinks={['About us', 'CAREERS', 'user guide', 'Careers', 'IR', 'CONTACT US']} />
      </Box>
    );
  }

  if (!product) {
    return (
      <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
        <Appbar />
        <Container maxWidth="lg" sx={{ padding: '24px 16px' }}>
          <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black' }}>
            Loading...
          </Typography>
        </Container>
        <Footer footerLinks={['About us', 'CAREERS', 'user guide', 'Careers', 'IR', 'CONTACT US']} />
      </Box>
    );
  }

  const currentMain = images[selectedImage] || images[0] || photoSvg;

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
      <Appbar />
      {state.successMessage && (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          PaperProps={{
            sx: {
              padding: '16px',
              minWidth: '300px',
            }
          }}
        >
          <DialogTitle sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '20px', textAlign: 'center' }}>
            Success
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', textAlign: 'center', color: 'black' }}>
              {state.successMessage}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center' }}>
            <Button
              onClick={() => setOpen(false)}
              variant="contained"
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                backgroundColor: '#5856D6',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#4846C6',
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <Container maxWidth="lg" sx={{ padding: '24px 16px' }}>
        <Typography
          sx={{
            fontFamily: 'Noto Sans',
            fontSize: '14px',
            color: '#8c8c8c',
            marginBottom: '16px',
          }}
        >
          <Box
            component="span"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/');
            }}
            sx={{
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/');
              }
            }}
          >
            Home
          </Box>
          {' > '}
          {product.name}
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
              <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              >
                <Alert
                  onClose={() => setSnackbarOpen(false)}
                  severity={snackbarSeverity}
                  sx={{ width: '100%' }}
                >
                  {snackbarMessage}
                </Alert>
              </Snackbar>

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
                    textAlign: 'left',
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
              textAlign: 'left',
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
              textAlign: 'left',
            }}
          >
            {product.vendorDescription}
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
            component="div"
            sx={{
              fontFamily: 'Noto Sans',
              fontSize: '16px',
              color: 'black',
              lineHeight: 1.8,
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            {shippingLoading ? (
              <Box>Loading shipping info...</Box>
            ) : shippingError ? (
              <Box sx={{ color: 'red' }}>{shippingError}</Box>
            ) : shippingInfo ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Air Standard Shipping */}
                {shippingInfo.air_standard_fee !== undefined && (
                  <Box
                    onClick={() => {
                      if (selectedShipping?.label === 'Air Standard') {
                        setSelectedShipping(null);
                      } else {
                        setSelectedShipping({ fee: shippingInfo.air_standard_fee!, label: 'Air Standard', days: shippingInfo.air_standard_days! });
                      }
                    }}
                    sx={{
                      border: selectedShipping?.label === 'Air Standard' ? '2px solid #5856D6' : '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: selectedShipping?.label === 'Air Standard' ? '#f0effc' : '#fafafa',
                      cursor: 'pointer',
                    }}
                  >
                    <Box sx={{ marginRight: '16px', display: 'flex', alignItems: 'center' }}>
                      <Flight sx={{ color: '#5856D6', fontSize: '28px' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '16px', color: 'black' }}>
                        Air Standard
                      </Typography>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#666' }}>
                        Estimated delivery within {shippingInfo.air_standard_days} days
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '18px', color: 'black' }}>
                      ${shippingInfo.air_standard_fee.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                {/* Air Express Shipping */}
                {shippingInfo.air_express_fee !== undefined && (
                  <Box
                    onClick={() => {
                      if (selectedShipping?.label === 'Air Express') {
                        setSelectedShipping(null);
                      } else {
                        setSelectedShipping({ fee: shippingInfo.air_express_fee!, label: 'Air Express', days: shippingInfo.air_express_days! });
                      }
                    }}
                    sx={{
                      border: selectedShipping?.label === 'Air Express' ? '2px solid #5856D6' : '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: selectedShipping?.label === 'Air Express' ? '#f0effc' : '#fafafa',
                      cursor: 'pointer',
                    }}
                  >
                    <Box sx={{ marginRight: '16px', display: 'flex', alignItems: 'center' }}>
                      <Flight sx={{ color: '#5856D6', fontSize: '28px' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '16px', color: 'black' }}>
                        Air Express
                      </Typography>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#666' }}>
                        Estimated delivery within {shippingInfo.air_express_days} days
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '18px', color: 'black' }}>
                      ${shippingInfo.air_express_fee.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                {/* Sea Standard Shipping */}
                {shippingInfo.sea_standard_fee !== undefined && (
                  <Box
                    onClick={() => {
                      if (selectedShipping?.label === 'Sea Standard') {
                        setSelectedShipping(null);
                      } else {
                        setSelectedShipping({ fee: shippingInfo.sea_standard_fee!, label: 'Sea Standard', days: shippingInfo.sea_standard_days! });
                      }
                    }}
                    sx={{
                      border: selectedShipping?.label === 'Sea Standard' ? '2px solid #5856D6' : '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: selectedShipping?.label === 'Sea Standard' ? '#f0effc' : '#fafafa',
                      cursor: 'pointer',
                    }}
                  >
                    <Box sx={{ marginRight: '16px', display: 'flex', alignItems: 'center' }}>
                      <DirectionsBoat sx={{ color: '#5856D6', fontSize: '28px' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '16px', color: 'black' }}>
                        Sea Standard
                      </Typography>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#666' }}>
                        Estimated delivery within {shippingInfo.sea_standard_days} days
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '18px', color: 'black' }}>
                      ${shippingInfo.sea_standard_fee.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                {/* Sea Express Shipping */}
                {shippingInfo.sea_express_fee !== undefined && (
                  <Box
                    onClick={() => {
                      if (selectedShipping?.label === 'Sea Express') {
                        setSelectedShipping(null);
                      } else {
                        setSelectedShipping({ fee: shippingInfo.sea_express_fee!, label: 'Sea Express', days: shippingInfo.sea_express_days! });
                      }
                    }}
                    sx={{
                      border: selectedShipping?.label === 'Sea Express' ? '2px solid #5856D6' : '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: selectedShipping?.label === 'Sea Express' ? '#f0effc' : '#fafafa',
                      cursor: 'pointer',
                    }}
                  >
                    <Box sx={{ marginRight: '16px', display: 'flex', alignItems: 'center' }}>
                      <DirectionsBoat sx={{ color: '#5856D6', fontSize: '28px' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '16px', color: 'black' }}>
                        Sea Express
                      </Typography>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#666' }}>
                        Estimated delivery within {shippingInfo.sea_express_days} days
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '18px', color: 'black' }}>
                      ${shippingInfo.sea_express_fee.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                {/* Domestic Standard Shipping */}
                {shippingInfo.standard_fee !== undefined && (
                  <Box
                    onClick={() => {
                      if (selectedShipping?.label === 'Standard Delivery') {
                        setSelectedShipping(null);
                      } else {
                        setSelectedShipping({ fee: shippingInfo.standard_fee!, label: 'Standard Delivery', days: shippingInfo.standard_days! });
                      }
                    }}
                    sx={{
                      border: selectedShipping?.label === 'Standard Delivery' ? '2px solid #5856D6' : '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: selectedShipping?.label === 'Standard Delivery' ? '#f0effc' : '#fafafa',
                      cursor: 'pointer',
                    }}
                  >
                    <Box sx={{ marginRight: '16px', display: 'flex', alignItems: 'center' }}>
                      <LocalShipping sx={{ color: '#5856D6', fontSize: '28px' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '16px', color: 'black' }}>
                        Standard Delivery
                      </Typography>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#666' }}>
                        Estimated delivery within {shippingInfo.standard_days} days
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '18px', color: 'black' }}>
                      ${shippingInfo.standard_fee.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                {/* Domestic Express Shipping */}
                {shippingInfo.express_fee !== undefined && (
                  <Box
                    onClick={() => {
                      if (selectedShipping?.label === 'Express Delivery') {
                        setSelectedShipping(null);
                      } else {
                        setSelectedShipping({ fee: shippingInfo.express_fee!, label: 'Express Delivery', days: shippingInfo.express_days! });
                      }
                    }}
                    sx={{
                      border: selectedShipping?.label === 'Express Delivery' ? '2px solid #5856D6' : '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: selectedShipping?.label === 'Express Delivery' ? '#f0effc' : '#fafafa',
                      cursor: 'pointer',
                    }}
                  >
                    <Box sx={{ marginRight: '16px', display: 'flex', alignItems: 'center' }}>
                      <LocalShipping sx={{ color: '#5856D6', fontSize: '28px' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '16px', color: 'black' }}>
                        Express Delivery
                      </Typography>
                      <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#666' }}>
                        Estimated delivery within {shippingInfo.express_days} days
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: 'Noto Sans', fontWeight: 'bold', fontSize: '18px', color: 'black' }}>
                      ${shippingInfo.express_fee.toFixed(2)}
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              'No shipping information available.'
            )}
          </Typography>
        </Box>

        {/* Customer Review (always visible) */}
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

          {hasReviews ? (
            <>
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
                        <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black', lineHeight: 1.8, textAlign: 'left' }}>
                          {review.comment}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginTop: '24px' }}>
                {product.reviewCount > 0 ? (
                  <Button
                    variant="outlined"
                    onClick={openAllReviews}
                    sx={{
                      border: '1px solid #cccccc',
                      borderRadius: '4px',
                      padding: '16px',
                      fontFamily: 'Noto Sans',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      color: 'black',
                      textTransform: 'none',
                      width: '400px',
                      backgroundColor: 'white',
                      '&:hover': {
                        borderColor: '#5856D6',
                        color: '#5856D6',
                      },
                    }}
                  >
                    See all reviews
                  </Button>
                ) : null}

                <Button
                  variant="outlined"
                  onClick={() => navigate(`/item/${encodeURIComponent(product.product_id)}/review`)}
                  sx={{
                    border: '1px solid #cccccc',
                    borderRadius: '4px',
                    padding: '16px',
                    fontFamily: 'Noto Sans',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: 'black',
                    textTransform: 'none',
                    width: '400px',
                    backgroundColor: 'white',
                    '&:hover': {
                      borderColor: '#5856D6',
                      color: '#5856D6',
                    },
                  }}
                >
                  Write review
                </Button>
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: '#666666' }}>
                No reviews yet
              </Typography>

              <Button
                variant="outlined"
                onClick={() => navigate(`/item/${encodeURIComponent(product.product_id)}/review`)}
                sx={{
                  border: '1px solid #cccccc',
                  borderRadius: '4px',
                  padding: '16px',
                  fontFamily: 'Noto Sans',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: 'black',
                  textTransform: 'none',
                  width: '400px',
                  backgroundColor: 'white',
                  '&:hover': {
                    borderColor: '#5856D6',
                    color: '#5856D6',
                  },
                }}
              >
                Write review
              </Button>
            </Box>
          )}
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
          'Careers', 'IR', 'CONTACT US',
        ]}
      />

      <Dialog open={reviewsOpen} onClose={closeAllReviews} fullWidth maxWidth="md">
        <DialogTitle>All reviews</DialogTitle>
        <DialogContent dividers>
          {reviewsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
              <CircularProgress />
            </Box>
          ) : reviewsError ? (
            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black' }}>
              {reviewsError}
            </Typography>
          ) : allReviews.length === 0 ? (
            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black' }}>
              No reviews
            </Typography>
          ) : (
            <Box>
              <Grid container spacing={4}>
                {allReviews.map((review) => (
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
                        <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black', lineHeight: 1.8, textAlign: 'left' }}>
                          {review.comment}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {reviewsTotal > reviewsPageSize ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                  <Pagination
                    count={totalReviewPages}
                    page={reviewsPage}
                    onChange={onChangeReviewsPage}
                  />
                </Box>
              ) : null}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAllReviews}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ItemDetailNew;

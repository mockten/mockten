import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  IconButton,
} from '@mui/material';
import {
  Star,
  StarHalf,
  StarBorder,
  CardGiftcard,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';
import photoSvg from '../assets/photo.svg';

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
}

type ProductData = {
  id: string;
  category: string;
  name: string;
  description: string;
};

type CreateReviewRequest = {
  productId: string;
  rating: number;
  comment: string;
};

const ACCESS_TOKEN_STORAGE_KEYS = [
  'accessToken',
  'access_token',
  'kc_access_token',
  'keycloak_access_token',
  'mockten_access_token',
];

const getAccessTokenFromStorage = (): string => {
  for (const k of ACCESS_TOKEN_STORAGE_KEYS) {
    const v = localStorage.getItem(k);
    if (v && v.trim().length > 0) return v.trim();
  }
  for (const k of ACCESS_TOKEN_STORAGE_KEYS) {
    const v = sessionStorage.getItem(k);
    if (v && v.trim().length > 0) return v.trim();
  }
  return '';
};

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

const ItemReview: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [rating, setRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');

  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loadError, setLoadError] = useState<string>('');

  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

  const [submitError, setSubmitError] = useState<string>('');
  const [submitOk, setSubmitOk] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const productIdForFetch = useMemo(() => id || '', [id]);
  const productIdForImages = useMemo(() => productData?.id || id || '', [productData?.id, id]);

  useEffect(() => {
    const run = async () => {
      setLoadError('');
      setProductData(null);

      if (!productIdForFetch) {
        setLoadError('Missing product id.');
        return;
      }

      try {
        const res = await fetch(`/api/item/detail/${encodeURIComponent(productIdForFetch)}`, { method: 'GET' });
        if (!res.ok) {
          setLoadError(`Failed to load product detail. status=${res.status}`);
          return;
        }

        const api = (await res.json()) as ApiItemDetailResponse;

        const mapped: ProductData = {
          id: api.productId || productIdForFetch,
          category: (api.categoryName && api.categoryName.trim().length > 0) ? api.categoryName : 'N/A',
          name: (api.productName && api.productName.trim().length > 0) ? api.productName : 'N/A',
          description: api.summary || '',
        };

        setProductData(mapped);
      } catch {
        setLoadError('Failed to load product detail.');
      }
    };

    run();
  }, [productIdForFetch]);

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

  const handleStarClick = (value: number) => {
    setRating(value);
  };

  const handleSubmitReview = async () => {
    setSubmitError('');
    setSubmitOk('');

    const productId = productData?.id || '';
    if (!productId) {
      setSubmitError('Missing product id.');
      return;
    }

    const token = getAccessTokenFromStorage();
    if (!token) {
      setSubmitError('Missing access token. Please login again.');
      return;
    }

    const payload: CreateReviewRequest = {
      productId,
      rating,
      comment: reviewComment.trim(),
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/item/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        setSubmitError(`Failed to submit review. status=${res.status}${t ? ` body=${t}` : ''}`);
        return;
      }

      setSubmitOk('Review submitted.');
      setRating(0);
      setReviewComment('');
    } catch {
      setSubmitError('Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const starValue = i;
      if (starValue <= currentRating) {
        stars.push(
          <IconButton
            key={i}
            onClick={() => handleStarClick(starValue)}
            sx={{ padding: 0 }}
          >
            <Star sx={{ color: '#f1bd02', fontSize: '24px' }} />
          </IconButton>
        );
      } else if (starValue - 0.5 <= currentRating) {
        stars.push(
          <IconButton
            key={i}
            onClick={() => handleStarClick(starValue)}
            sx={{ padding: 0 }}
          >
            <StarHalf sx={{ color: '#f1bd02', fontSize: '24px' }} />
          </IconButton>
        );
      } else {
        stars.push(
          <IconButton
            key={i}
            onClick={() => handleStarClick(starValue)}
            sx={{ padding: 0 }}
          >
            <StarBorder sx={{ color: '#f1bd02', fontSize: '24px' }} />
          </IconButton>
        );
      }
    }
    return stars;
  };

  if (loadError) {
    return (
      <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
        <Appbar />
        <Container maxWidth="lg" sx={{ padding: '24px 16px' }}>
          <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black' }}>
            {loadError}
          </Typography>
        </Container>
        <Footer
          footerLinks={[
            'About us', 'CAREERS', 'user guide',
            'Careers', 'IR', 'CONTACT US',
          ]}
        />
      </Box>
    );
  }

  if (!productData) {
    return (
      <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
        <Appbar />
        <Container maxWidth="lg" sx={{ padding: '24px 16px' }}>
          <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '16px', color: 'black' }}>
            Loading...
          </Typography>
        </Container>
        <Footer
          footerLinks={[
            'About us', 'CAREERS', 'user guide',
            'Careers', 'IR', 'CONTACT US',
          ]}
        />
      </Box>
    );
  }

  const currentMain = images[selectedImage] || images[0] || photoSvg;

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
      <Appbar />

      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', padding: '27px 0' }}>
        <Container maxWidth="lg" sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', gap: '16px' }}>
            <Box sx={{ flexGrow: 1 }} />

            <Box sx={{ width: '944px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '14px',
                  color: '#8c8c8c',
                  lineHeight: 1.5,
                  width: '335px',
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Box
                  component="span"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate('/')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate('/');
                  }}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Home
                </Box>

                <Box component="span">&gt;</Box>

                <Box
                  component="span"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/item/${encodeURIComponent(productData.id)}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/item/${encodeURIComponent(productData.id)}`);
                  }}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {productData.name}
                </Box>

                <Box component="span">&gt;</Box>

                <Box component="span">Review</Box>
              </Typography>
              <Box sx={{ display: 'flex', gap: '10px', height: '233px' }}>
                <Box sx={{ width: '645px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '14px',
                      color: 'black',
                      lineHeight: 1.5,
                    }}
                  >
                    {productData.category}
                  </Typography>

                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontWeight: 'bold',
                      fontSize: '24px',
                      color: 'black',
                      lineHeight: 1.5,
                    }}
                  >
                    {productData.name}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CardGiftcard sx={{ color: 'black', fontSize: '24px' }} />
                    <Typography
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontWeight: 'bold',
                        fontSize: '20px',
                        color: 'black',
                        lineHeight: 1.5,
                        textAlign: 'center',
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
                      height: '71px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {productData.description}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: '233px',
                    height: '233px',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
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
              </Box>

              <Box
                sx={{
                  backgroundColor: 'white',
                  borderLeft: '5px solid black',
                  padding: '12px 20px',
                  width: '960px',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    color: 'black',
                    lineHeight: 1.5,
                  }}
                >
                  Rating
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: '3.364px', alignItems: 'center' }}>
                {renderStars(rating)}
              </Box>

              <Box
                sx={{
                  backgroundColor: 'white',
                  borderLeft: '5px solid black',
                  padding: '12px 20px',
                  width: '960px',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Noto Sans',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    color: 'black',
                    lineHeight: 1.5,
                  }}
                >
                  Review Comment
                </Typography>
              </Box>

              <Box sx={{ padding: '8px 10px', width: '635px' }}>
                <TextField
                  multiline
                  rows={6}
                  fullWidth
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Enter your review here..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: 'black',
                      '& fieldset': {
                        borderColor: '#ccc',
                        borderRadius: '2px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#ccc',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#5856D6',
                      },
                    },
                    '& .MuiInputBase-input': {
                      padding: '16px 8px',
                    },
                  }}
                />
              </Box>

              {submitError && (
                <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#d32f2f' }}>
                  {submitError}
                </Typography>
              )}
              {submitOk && (
                <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#2e7d32' }}>
                  {submitOk}
                </Typography>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '16px', width: '960px' }}>
                <Button
                  variant="contained"
                  onClick={handleSubmitReview}
                  disabled={submitting || rating === 0 || reviewComment.trim() === ''}
                  sx={{
                    backgroundColor: '#5856D6',
                    color: 'white',
                    padding: '16px 32px',
                    borderRadius: '4px',
                    fontFamily: 'Noto Sans',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: '#4846C6',
                    },
                    '&:disabled': {
                      backgroundColor: '#cccccc',
                      color: '#999999',
                    },
                  }}
                >
                  Submit
                </Button>
              </Box>
            </Box>

            <Box sx={{ flexGrow: 1 }} />
          </Box>
        </Container>
      </Box>

      <Footer
        footerLinks={[
          'About us', 'CAREERS', 'user guide',
          'Careers', 'IR', 'CONTACT US',
        ]}
      />
    </Box>
  );
};

export default ItemReview;

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../module/apiClient';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';
import photoSvg from "../assets/photo.svg";

interface AlsoBoughtProduct {
  product_id: string;
  product_name: string;
  category_id: string;
  price: number;
  image_url: string;
}

const MyCartOrderComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const purchaseId = location.state?.paymentId || '000-000-000';
  const purchasedProductId: string | undefined = location.state?.productId;

  const [alsoBought, setAlsoBought] = useState<AlsoBoughtProduct[]>([]);

  useEffect(() => {
    if (!purchasedProductId) return;
    apiClient
      .get(`/api/recommendation/also-bought?product_id=${purchasedProductId}&limit=4`)
      .then((res) => {
        if (res.data?.also_bought) setAlsoBought(res.data.also_bought);
      })
      .catch((e) => console.error('Failed to fetch also-bought', e));
  }, [purchasedProductId]);

  const handleBackToTop = () => {
    navigate('/');
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
    <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
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

        {/* Also Bought Section */}
        {alsoBought.length > 0 && (
          <>
            <SectionTitle title="Products purchased by the same person who purchased the same product" />
            <Grid container spacing={2} sx={{ marginBottom: '32px' }}>
              {alsoBought.map((product) => (
                <Grid item xs={12} sm={6} md={3} key={product.product_id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 3, transform: 'translateY(-2px)', transition: 'transform 0.2s' },
                    }}
                    onClick={() => navigate(`/item/${product.product_id}`)}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        aspectRatio: '1/1',
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '16px' }}
                        onError={(e) => { e.currentTarget.src = photoSvg; }}
                      />
                    </Box>
                    <CardContent sx={{ padding: '8px' }}>
                      <Typography
                        sx={{
                          fontFamily: 'Noto Sans',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          color: 'black',
                          marginBottom: '4px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {product.product_name}
                      </Typography>
                      <Typography
                        sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#666666', fontWeight: 'bold' }}
                      >
                        ${product.price}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default MyCartOrderComplete;

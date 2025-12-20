import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
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

const ItemReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Mock data - replace with actual API calls
  const productData = {
    id: id || '1',
    category: 'Category Name',
    name: 'Sample Product Name',
    description: 'Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. ',
    rating: 4.5,
    reviewComment: 'Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, Sample Text, ',
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} sx={{ color: '#f1bd02', fontSize: '24px' }} />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" sx={{ color: '#f1bd02', fontSize: '24px' }} />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<StarBorder key={`empty-${i}`} sx={{ color: '#f1bd02', fontSize: '24px' }} />);
    }

    return stars;
  };

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* App Bar */}
      <Appbar />

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', padding: '27px 0' }}>
        <Container maxWidth="lg" sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', gap: '16px' }}>
            {/* Left Spacer */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Middle Content */}
            <Box sx={{ width: '944px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Breadcrumb */}
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '14px',
                  color: '#8c8c8c',
                  lineHeight: 1.5,
                  width: '335px',
                }}
              >
                Home &gt; &lt;Sample Product&gt; &gt; Review
              </Typography>

              {/* Product Info and Image */}
              <Box sx={{ display: 'flex', gap: '10px', height: '233px' }}>
                {/* Product Info Section */}
                <Box sx={{ width: '645px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}>
                  {/* Category */}
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

                  {/* Product Name */}
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

                  {/* Product Overview */}
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

                  {/* Description */}
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

                {/* Product Image Placeholder */}
                <Box
                  sx={{
                    width: '233px',
                    height: '233px',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <img src={photoSvg} alt="Product" style={{ width: '64px', height: '64px' }} />
                </Box>
              </Box>

              {/* Rating Section */}
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

              {/* Stars */}
              <Box sx={{ display: 'flex', gap: '3.364px', alignItems: 'center' }}>
                {renderStars(productData.rating)}
              </Box>

              {/* Review Comment Section */}
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

              {/* Review Comment Text */}
              <Box sx={{ padding: '8px 10px', width: '635px' }}>
                <Box
                  sx={{
                    border: '1px solid #ccc',
                    borderRadius: '2px',
                    padding: '16px 8px',
                    width: '625px',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: 'black',
                      lineHeight: 1.5,
                      width: '601px',
                    }}
                  >
                    {productData.reviewComment}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Right Spacer */}
            <Box sx={{ flexGrow: 1 }} />
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Footer
        footerLinks={[
          'About us', 'CAREERS', 'user guide',
          'Careers', 'IR', 'CONTACT US'
        ]}
      />
    </Box>
  );
};

export default ItemReview;


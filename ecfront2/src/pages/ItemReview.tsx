import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
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

const ItemReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [rating, setRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');

  // Mock data - replace with actual API calls
  const productData = {
    id: id || '1',
    category: 'Category Name',
    name: 'Sample Product Name',
    description: 'Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. Sample Text. ',
  };

  const handleStarClick = (value: number) => {
    setRating(value);
  };

  const handleSubmitReview = () => {
    // TODO: Implement API call to submit review
    console.log('Submitting review:', { rating, reviewComment, productId: productData.id });
    // You can add navigation or success message here
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
                {renderStars(rating)}
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
                <TextField
                  multiline
                  rows={6}
                  fullWidth
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="レビューを入力してください..."
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

              {/* Submit Button */}
              <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '16px', width: '960px' }}>
                <Button
                  variant="contained"
                  onClick={handleSubmitReview}
                  disabled={rating === 0 || reviewComment.trim() === ''}
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
                  レビューする
                </Button>
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


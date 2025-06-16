import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Grid,
  Divider,
  Chip,
} from '@mui/material';
import FavoriteIcon from './item/FavoriteIcon';
import AddShoppingCartIcon from './item/AddShoppingCartIcon';
import PaymentIcon from './item/PaymentIcon';
import { PrevArrow, NextArrow } from './item/NextIcon';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

type ItemDetailType = {
  product_id: string;
  product_name: string;
  price: number;
  category: string;
  category_id: string;
  summary: string;
  regist_day: string;
  last_update: string;
  seller_name: string;
  stocks: number;
};

type Props = {
  onMetaReady?: (meta: { productName: string; categoryName: string }) => void;
};

const ItemDetailCard: React.FC<Props> = ({ onMetaReady }) => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ItemDetailType | null>(null);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
  };

  useEffect(() => {
    const fetchItemDetail = async () => {
      try {
        const response = await fetch(`/api/item/detail?id=${id}`);
        if (!response.ok) throw new Error('Failed to fetch item details');
        const data = await response.json();
        setItem(data);
        onMetaReady?.({
          productName: data.product_name,
          categoryName: data.category,
        });
      } catch (error) {
        console.error('Error fetching item detail:', error);
      }
    };

    if (id) fetchItemDetail();
  }, [id]);

  if (!item) {
    return <p>Loading...</p>;
  }

  const imageUrls = Array.from({ length: 5 }, () => `/api/storage/${item.product_id}.png`);

  return (
    <Card sx={{ maxWidth: 1000, margin: 'auto', mt: 4, p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Box sx={{ width: '100%' }}>
            <Slider {...settings}>
              {imageUrls.map((url, index) => (
                <Box key={index} component="img" src={url} sx={{ width: '100%' }} />
              ))}
            </Slider>
          </Box>
        </Grid>
        <Grid item xs={12} md={7}>
          <Grid item xs={15} md={5} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CardMedia
              component="img"
              image={`/api/storage/${item.product_id}.png`}
              alt={item.product_name}
              sx={{ height: '100%', objectFit: 'cover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </Grid>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              {item.product_name}
            </Typography>
            <Typography variant="h6" color="primary">
              ${item.price.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item.seller_name}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1">{item.summary}</Typography>
            <Divider sx={{ my: 2 }} />
            <Box my={1}>
              <Chip
                label={`Category: ${item.category || 'unknown'}`}
                sx={{ mr: 1 }}
                component="a"
                clickable
              />
              <Chip label={`Stocks: ${item.stocks}`} />
            </Box>
            <FavoriteIcon productId={item.product_id} />
            <PaymentIcon />
            <AddShoppingCartIcon />
          </CardContent>
        </Grid>
      </Grid>
    </Card>
  );
};

export default ItemDetailCard;

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
import FavoriteIcon from '../components/item/FavoriteIcon';
import AddShoppingCartIcon from '../components/item/AddShoppingCartIcon';
import PaymentIcon from '../components/item/PaymentIcon';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';


type ItemDetailType = {
    product_id: string;
    product_name: string;
    price: number;
    category: number;
    summary: string;
    regist_day: string;
    last_update: string;
    seller_name: string;
    stocks: number;
  };
  

const ItemDetailsPage: React.FC = () => {

    const { id } = useParams<{ id: string }>();
    const [item, setItem] = useState<ItemDetailType | null>(null);

    const settings = {
      dots: true,
      infinite: true,
      speed: 500,
      slidesToShow: 1,
      slidesToScroll: 1,
    };
  
    useEffect(() => {
      const fetchItemDetail = async () => {
        try {
          const response = await fetch(`/api/item/detail?id=${id}`);
          if (!response.ok) {
            throw new Error('Failed to fetch item details');
          }
          const data = await response.json();
          setItem(data);
        } catch (error) {
          console.error('Error fetching item detail:', error);
        }
      };
  
      if (id) {
        fetchItemDetail();
      }
    }, [id]);
  
    if (!item) {
      return <p>Loading...</p>;
    }

    const imageUrls = Array.from({ length: 5 }, (_) => `/api/storage/${item.product_id}.png`);
  
    return (
      <Card sx={{ maxWidth: 800, margin: 'auto', mt: 4, boxShadow: 3 }}>
      <Box sx={{ width: '100%', maxWidth: 500 }}>
      <Slider {...settings}>
        {imageUrls.map((url, index) => (
          <Box key={index} component="img" src={url} sx={{ width: '100%' }} />
        ))}
      </Slider>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <CardMedia
            component="img"
            image={`/api/storage/${item.product_id}.png`}
            alt={item.product_name}
            sx={{ height: '100%', objectFit: 'cover' }}
          />
        </Grid>

        {/* 商品詳細 */}
        <Grid item xs={12} md={7}>
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
              <Chip label={`Category: ${item.category}`} sx={{ mr: 1 }} />
              <Chip label={`Stocks: ${item.stocks}`} />
            </Box>
            <FavoriteIcon productId={item.product_id}/>
            <PaymentIcon />
            <AddShoppingCartIcon />
          </CardContent>
        </Grid>
      </Grid>
    </Card>
    );
  };

export default ItemDetailsPage;
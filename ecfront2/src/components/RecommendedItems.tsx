import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import FavoriteIcon from './item/FavoriteIcon';
import AddShoppingCartIcon from './item/AddShoppingCartIcon';
import PaymentIcon from './item/PaymentIcon';
import { Button, CardActionArea, CardActions } from '@mui/material';

type ItemSummary = {
    id: string;
    name: string;
    imageUrl: string;
    favorite: boolean;
    category: string;
};

// Test Data
const testitems: ItemSummary[] = [
    { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Sample Item 1', imageUrl: '/images/img1.jpg', favorite: true, category: '四谷物産 課長'},
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Sample Item 2', imageUrl: '/images/img2.jpg', favorite: false, category: 'Yahoo! Japan 第四営業部部長'},
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Sample Item 3', imageUrl: '/images/img3.jpg', favorite: false, category: 'Splunk Service合同会社 CustomerSuccessManager'},
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Sample Item 4', imageUrl: '/images/img4.jpg', favorite: false, category: '東京大学 学生'},
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Sample Item 5', imageUrl: '/images/img5.jpg', favorite: false, category: 'NEC Corporation SI営業部 主任'},
    { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Sample Item 6', imageUrl: '/images/img6.jpg', favorite: false, category: 'material-Design 主任'},
    { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Sample Item 7', imageUrl: '/images/img1.jpg', favorite: false, category: 'Splunk Service合同会社 TechnicalSuccess'},
    { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Sample Item 8', imageUrl: '/images/img1.jpg', favorite: false, category: 'Splunk Service合同会社 TechnicalSuccess'},
    { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Sample Item 9', imageUrl: '/images/img1.jpg', favorite: false, category: 'Splunk Service合同会社 TechnicalSuccess'},
    { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Sample Item 10', imageUrl: '/images/img1.jpg', favorite: false, category: 'Splunk Service合同会社 TechnicalSuccess'},
];

// コンポーネントのプロップの型定義
interface RecommendedItemsProps {
    itemId: string; 
}

interface PaymentIconProps {
  onClick: () => void; 
}

const PaymentPopup = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Credit Card Information</DialogTitle>
      <DialogContent>
        <TextField autoFocus margin="dense" id="cardNumber" label="Card Number" type="text" fullWidth />
        <TextField margin="dense" id="expiryDate" label="MM/YY" type="text" fullWidth />
        <TextField margin="dense" id="cvv" label="CVV" type="text" fullWidth />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onClose}>Pay</Button>
      </DialogActions>
    </Dialog>
  );
};

const RecommendedItems: React.FC<RecommendedItemsProps> = ({ itemId }) => {
    const [items, setItems] = useState<ItemSummary[]>([]);
    const [item, setItem] = useState(null);
    const [page, setPage] = useState(1);
    const [isCopied, setIsCopied] = useState(false);
    const [isPaymentPopupOpen, setPaymentPopupOpen] = useState(false);

    const handlePaymentClick = () => {
      setPaymentPopupOpen(true);
    };

    const handleClosePaymentPopup = () => {
      setPaymentPopupOpen(false);
    };

    const handleItemCardClick = () => {
      fetch(`/item/${itemId}`)
        .then((response) => response.json())
        .then((item) => setItem(item));
    };

    const handleShareButtonClick = () => {
      const url = `https://mockten.net/item/${itemId}`;
      navigator.clipboard.writeText(url);
      setIsCopied(true);
    };

    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await axios.post('/service/recousers/', {
            id: itemId,
            page: page,
          });
          setItems(response.data);
        } catch (error) {
          console.error('Error fetching recommended users:', error);
          setItems(testitems);
        }
      };
  
      fetchData();
    }, [itemId, page]);

    return (
      <>
        <Grid container spacing={3}>
            {items.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Card>
                    <CardActionArea onClick={handleItemCardClick}>
                      <CardMedia
                      component="img"
                      height="200"
                      image={item.imageUrl}
                      alt={item.name}
                      />
                      <CardContent>
                        <Typography variant="h6" component="div" color="text.secondary">
                            {item.name}
                            <br></br>
                            {item.favorite}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                    <CardActions>
                      <Button size="small" color="primary" onClick={handleShareButtonClick}>
                        SHARE
                      </Button>
                      {isCopied && (
                        <p>Copied URL!</p>
                      )}
                      <FavoriteIcon />
                      <PaymentIcon onClick={handlePaymentClick} />
                      <AddShoppingCartIcon />
                    </CardActions>
                  </Card>
                </Grid>
            ))}
        </Grid>
        <PaymentPopup open={isPaymentPopupOpen} onClose={handleClosePaymentPopup} />
      </>
    );
};

export default RecommendedItems;
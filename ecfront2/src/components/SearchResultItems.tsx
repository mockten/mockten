import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface Product {
  product_id: string;
  product_name: string;
  seller_name: string;
  category: number;
  price: number;
  ranking: number;
  stocks: number;
  main_url: string;
}

interface SearchApiResponse {
  items: Product[];
  page: number;
}

type PaymentPopupProps = {
  open: boolean;
  onClose: () => void;
};

const PaymentPopup: React.FC<PaymentPopupProps> = ({ open, onClose }) => {
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

function RecommendedItems() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isCopied, setIsCopied] = useState(false);
    const [isPaymentPopupOpen, setPaymentPopupOpen] = useState(false);
    const [page] = useState(1); // current page of page nation
    const navigate = useNavigate();
    // const apiUrl = process.env.REACT_APP_SEARCH_API;
    const apiUrl = 'http://localhost:8080';

    const handleClosePaymentPopup = () => {
      setPaymentPopupOpen(false);
    };

    const handleItemCardClick = (item_id: string) => {
      navigate(`/item/${item_id}`);
    };

    const handleShareButtonClick = () => {
      const url = `https://mockten.net/item/001`;
      navigator.clipboard.writeText(url);
      setIsCopied(true);
    };

    useEffect(() => {
      const fetchData = async () => {
        try {
          // const response = await axios.get('/v1/recommend?category=0');
          // actually we have to use recommend API. but this is for test. 
          const response = await fetch(`${apiUrl}/v1/search?q=product&p=1&t=hoge`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
          });
          const data: SearchApiResponse = await response.json();
          setProducts(data.items);
        } catch (error) {
          console.error('Error fetching recommended users:', error);
        }
      };
  
      fetchData();
    }, [page]);


    return (
      <>
        <Grid container spacing={3}>
            {products.map((product) => (
                <Grid item xs={12} sm={6} md={4} key={product.product_id}>
                  <Card>
                    <CardActionArea onClick={() => handleItemCardClick(product.product_id)}>
                      <CardMedia
                      component="img"
                      height="200"
                      image={product.main_url}
                      alt={product.product_name}
                      />
                      <CardContent>
                        <Typography variant="h6" component="div" color="text.secondary">
                            {product.product_name}
                            <br></br>
                            {product.price} ¥
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
                      <PaymentIcon />
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
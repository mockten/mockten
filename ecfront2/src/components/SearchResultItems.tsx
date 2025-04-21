import { useState } from 'react';
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


type Props = {
  items: Item[];
};

interface Item {
  product_id: string;
  product_name: string;
  seller_name: string;
  category: number;
  price: number;
  ranking: number;
  stocks: number;
  main_url: string;
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

const SearchResultItems: React.FC<Props> = ({ items }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isPaymentPopupOpen, setPaymentPopupOpen] = useState(false);
    const navigate = useNavigate();

    const handleClosePaymentPopup = () => {
      setPaymentPopupOpen(false);
    };

    const handleItemCardClick = (product_id: string) => {
      navigate(`/item/${product_id}`);
    };

    const handleShareButtonClick = (product_id: string) => {
      const url = `https://mockten.net/item/${product_id}`;
      navigator.clipboard.writeText(url);
      setIsCopied(true);
    };


    return (
      <>
        <Grid container spacing={3}>
            {items.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.product_id}>
                  <Card>
                    <CardActionArea onClick={() => handleItemCardClick(item.product_id)}>
                      <CardMedia
                      component="img"
                      height="200"
                      image={item.main_url}
                      alt={item.product_name}
                      />
                      <CardContent>
                        <Typography variant="h6" component="div" color="text.secondary">
                            {item.product_name}
                            <br></br>
                            {item.price} ¥
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                    <CardActions>
                      <Button size="small" color="primary" onClick={() => handleShareButtonClick(item.product_id)}>
                        SHARE
                      </Button>
                      {isCopied && (
                        <p>Copied URL!</p>
                      )}
                      <FavoriteIcon productId={item.product_id}/>
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

export default SearchResultItems;
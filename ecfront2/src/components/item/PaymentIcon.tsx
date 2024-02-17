// PaymentIcon.tsx
import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import PaymentIconMaterial from '@mui/icons-material/Payment';
import { loadStripe, PaymentMethod } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

const stripePromise = loadStripe('pk_test_j5fvxJmoN3TlTaNTgcATv0W000HRwOI317');

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (cardElement) {
      try {
        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
        });

        if (error) {
          setError(error.message);
          setPaymentMethod(null);
          console.log('PaymentMethod creation failed');
        } else {
          setError(undefined);
          setPaymentMethod(paymentMethod as PaymentMethod);
          console.log('PaymentMethod created successfully!');
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <Button type="submit" disabled={!stripe}>
        Submit Payment
      </Button>
      {error && <div>{error}</div>}
      {paymentMethod && paymentMethod.id && <div>Payment Method ID: {paymentMethod.id}</div>}
    </form>
  );
};

type PaymentPopupProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const PaymentPopup: React.FC<PaymentPopupProps>  = ({ setOpen }) => { 
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={true} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Payment</DialogTitle>
      <DialogContent>
        <Elements stripe={stripePromise}>
          <CheckoutForm />
        </Elements>
      </DialogContent>
      <DialogActions>
      <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};


const PaymentIcon: React.FC = () => {
  const [open, setOpen] = useState(false);

  const handleIconClick = () => {
    setOpen(true);
  };

  return (
    <>
      <IconButton onClick={handleIconClick} size="small" aria-label="payment" color="inherit">
        <PaymentIconMaterial />
      </IconButton>
      {open && <PaymentPopup open={open} setOpen={setOpen} />}
    </>
  );
};

export default PaymentIcon;

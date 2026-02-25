import React, { useMemo, useState } from 'react';
import {
  Box,
  Container,
  TextField,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

interface CreditCardFormData {
  cardHolderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
}

type SavedCard = {
  brand?: 'VISA' | 'Mastercard' | 'JCB' | 'AMEX' | 'Diners' | 'Discover' | 'Unknown';
  last4: string;
  expMonth?: string;
  expYear?: string;
  cardHolderName?: string;
};

const CreditCardSettings: React.FC = () => {
  const [savedCard] = useState<SavedCard | null>({
    brand: 'VISA',
    last4: '1234',
    expMonth: '08',
    expYear: '28',
    cardHolderName: 'TARO YAMADA',
  });

  const [formData, setFormData] = useState<CreditCardFormData>({
    cardHolderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
  });

  const handleInputChange =
    (field: keyof CreditCardFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call (tokenization recommended; do NOT send raw card data to your server unless PCI compliant)
    console.log('Credit card registered:', formData);
  };

  const savedCardTitle = useMemo(() => {
    if (!savedCard) return 'No card registered';
    const brand = savedCard.brand ?? 'CARD';
    return `${brand} •••• ${savedCard.last4}`;
  }, [savedCard]);

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
      <Appbar />

      <Container maxWidth="lg" sx={{ padding: '24px 16px' }}>
        {/* Page Title */}
        <Box
          sx={{
            borderLeft: '5px solid black',
            paddingLeft: '20px',
            paddingY: '8px',
            marginBottom: '24px',
            marginLeft: '16px',
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
            Credit Card Information
          </Typography>
        </Box>

        <Box sx={{ maxWidth: '680px', margin: '0 auto 24px' }}>
          <Card
            variant="outlined"
            sx={{
              borderColor: '#dddddd',
              borderRadius: '4px',
              backgroundColor: '#fafafa',
            }}
          >
            <CardContent sx={{ padding: '16px' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#333' }}>
                    Current Card
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      color: 'black',
                      mt: 0.5,
                    }}
                  >
                    {savedCardTitle}
                  </Typography>

                  {savedCard ? (
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                      {savedCard.expMonth && savedCard.expYear && (
                        <Chip
                          size="small"
                          label={`Exp ${savedCard.expMonth}/${savedCard.expYear}`}
                          sx={{ fontFamily: 'Noto Sans' }}
                        />
                      )}
                      {savedCard.cardHolderName && (
                        <Chip
                          size="small"
                          label={savedCard.cardHolderName}
                          sx={{ fontFamily: 'Noto Sans' }}
                        />
                      )}
                    </Stack>
                  ) : (
                    <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '12px', color: '#777', mt: 1 }}>
                      You can register a new card below.
                    </Typography>
                  )}
                </Box>

                {/* 任意：カードがある時だけ表示したい操作ボタン */}
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    sx={{
                      borderColor: '#dddddd',
                      color: 'black',
                      textTransform: 'none',
                      fontFamily: 'Noto Sans',
                      '&:hover': { borderColor: '#cccccc', backgroundColor: '#f5f5f5' },
                    }}
                    onClick={() => {
                      // TODO: Implement "remove card" or "change card" flow
                      console.log('Change/Remove clicked');
                    }}
                  >
                    Manage
                  </Button>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2, borderColor: '#eeeeee' }} />

              <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '12px', color: '#777' }}>
                For security reasons, we only display the last 4 digits.
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box
          sx={{
            borderLeft: '5px solid black',
            paddingLeft: '20px',
            paddingY: '8px',
            marginBottom: '24px',
            marginLeft: '16px',
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
            New Credit Card
          </Typography>
        </Box>
        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: '680px', margin: '0 auto' }}>
          {/* Card Holder Name */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black', mb: '8px' }}>
              Card Holder Name
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="ex: TARO YAMADA"
              value={formData.cardHolderName}
              onChange={handleInputChange('cardHolderName')}
              sx={textFieldSx}
            />
          </Box>

          {/* Card Number */}
          <Box sx={{ marginBottom: '32px' }}>
            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black', mb: '8px' }}>
              Card Number
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="1234 5678 9012 3456"
              value={formData.cardNumber}
              onChange={handleInputChange('cardNumber')}
              inputProps={{ inputMode: 'numeric' }}
              sx={textFieldSx}
            />
          </Box>

          {/* Expiry + CVC */}
          <Grid container spacing={2} sx={{ marginBottom: '48px' }}>
            <Grid item xs={12} sm={4}>
              <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black', mb: '8px' }}>
                Expiry Month
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="MM"
                value={formData.expiryMonth}
                onChange={handleInputChange('expiryMonth')}
                inputProps={{ inputMode: 'numeric' }}
                sx={textFieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black', mb: '8px' }}>
                Expiry Year
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="YY"
                value={formData.expiryYear}
                onChange={handleInputChange('expiryYear')}
                inputProps={{ inputMode: 'numeric' }}
                sx={textFieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black', mb: '8px' }}>
                CVC
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="123"
                value={formData.cvc}
                onChange={handleInputChange('cvc')}
                inputProps={{ inputMode: 'numeric' }}
                sx={textFieldSx}
              />
            </Grid>
          </Grid>

          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: 'black',
                color: 'white',
                padding: '16px 32px',
                borderRadius: '4px',
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                textTransform: 'none',
                minWidth: '400px',
                '&:hover': {
                  backgroundColor: '#333',
                },
              }}
            >
              Register Card
            </Button>
          </Box>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '4px',
    height: '50px',
    '& fieldset': {
      borderColor: '#dddddd',
    },
    '&:hover fieldset': {
      borderColor: '#dddddd',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#5856D6',
    },
  },
  '& .MuiInputBase-input': {
    color: '#aaaaaa',
    fontFamily: 'Noto Sans',
    fontSize: '16px',
    padding: '8px 16px',
    '&::placeholder': {
      color: '#aaaaaa',
      opacity: 1,
    },
  },
} as const;

export default CreditCardSettings;
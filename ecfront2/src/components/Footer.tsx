import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
} from '@mui/material';
import {
  KeyboardArrowRight,
} from '@mui/icons-material';

interface FooterProps {
  footerLinks?: string[];
}

const Footer: React.FC<FooterProps> = ({
  footerLinks = [
    'About us', 'CAREERS', 'user guide',
    'Careers', 'IR', 'COntact us'
  ],
}) => {
  return (
    <Box
      sx={{
        backgroundColor: '#5856D6',
        padding: '40px 16px',
        marginTop: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ marginBottom: '24px' }}>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'Noto Sans',
              fontWeight: 'bold',
              fontSize: '24px',
              color: 'black',
              marginBottom: '16px',
            }}
          >
            MOCKTEN
          </Typography>
          
          <Grid container spacing={3}>
            {footerLinks.map((link, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Button
                  fullWidth
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 0',
                    borderBottom: '1px solid #dddddd',
                    borderRadius: 0,
                    textTransform: 'uppercase',
                    '&:hover': {
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Noto Sans',
                      fontSize: '16px',
                      color: 'black',
                      textAlign: 'left',
                    }}
                  >
                    {link}
                  </Typography>
                  <KeyboardArrowRight />
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
      
      <Box
        sx={{
          backgroundColor: 'black',
          padding: '8px',
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Noto Sans',
            fontSize: '12px',
            color: 'white',
          }}
        >
          © MOCKTEN, Inc.
        </Typography>
      </Box>
    </Box>
  );
};

export default Footer;

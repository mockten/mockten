import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
} from '@mui/material';

// Mock image URLs - replace with actual asset URLs from your project
const arrowRightIcon = "http://localhost:3845/assets/ce1540ba1f8cb0bde2e26ff8f9fc566f7be994a6.svg";

interface FooterProps {
  footerLinks?: string[];
}

const Footer: React.FC<FooterProps> = ({
  footerLinks = [
    'About us', 'careers', 'USER guide',
    'careers', 'ir', 'CONTACT US'
  ],
}) => {
  return (
    <Box
      sx={{
        backgroundColor: '#5856D6',
        padding: '40px 16px',
        marginTop: '48px',
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

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            {footerLinks.map((link, index) => (
              <Button
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 0',
                  borderBottom: '1px solid #dddddd',
                  borderRadius: 0,
                  textTransform: 'uppercase',
                  minWidth: '300px',
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
                <img src={arrowRightIcon} alt="Arrow" style={{ width: '24px', height: '24px' }} />
              </Button>
            ))}
          </Box>
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

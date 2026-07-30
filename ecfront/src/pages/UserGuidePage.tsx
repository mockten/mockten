import React from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Divider,
    Chip,
} from '@mui/material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

const guideSteps = [
    {
        title: '1. Sign In',
        description:
            'Use Google or Facebook authentication to sign in and access your account.',
    },
    {
        title: '2. Browse Products',
        description:
            'Explore products from the dashboard, category pages, or search results.',
    },
    {
        title: '3. Save Favorites',
        description:
            'Add products to your favorites list so you can review them later.',
    },
    {
        title: '4. Add to Cart',
        description:
            'Choose the items you want and add them to your shopping cart.',
    },
    {
        title: '5. Checkout',
        description:
            'Review your cart, confirm your address and payment method, and place your order.',
    },
];

const featureCards = [
    {
        title: 'Account Management',
        body: 'View your profile, update address information, and manage saved payment methods.',
    },
    {
        title: 'Search & Filter',
        body: 'Find products using categories, price ranges, ratings, stock, and other filters.',
    },
    {
        title: 'Favorites',
        body: 'Keep track of products you are interested in and revisit them later.',
    },
    {
        title: 'Order Flow',
        body: 'Experience a sample purchase flow from cart to checkout confirmation.',
    },
];

const UserGuidePage: React.FC = () => {
    return (
        <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: '#f8f9fb' }}>
            <Appbar />

            <Container maxWidth="lg" sx={{ py: 6 }}>
                {/* Hero */}
                <Paper
                    elevation={0}
                    sx={{
                        background: 'linear-gradient(135deg, #6358DC 0%, #8B84F4 100%)',
                        color: 'white',
                        borderRadius: 2,
                        px: { xs: 3, sm: 6 },
                        py: { xs: 5, sm: 8 },
                        mb: 5,
                    }}
                >
                    <Typography
                        sx={{
                            fontFamily: 'Poppins',
                            fontWeight: 700,
                            fontSize: { xs: '32px', sm: '48px' },
                            mb: 2,
                        }}
                    >
                        User Guide
                    </Typography>

                    <Typography
                        sx={{
                            fontFamily: 'Noto Sans',
                            fontSize: { xs: '16px', sm: '18px' },
                            lineHeight: 1.9,
                            maxWidth: '760px',
                        }}
                    >
                        This is a sample user guide for Mockten. It explains the basic flow of using the application,
                        from signing in and browsing products to managing your account and completing checkout.
                    </Typography>
                </Paper>

                {/* Getting Started */}
                <Paper
                    elevation={0}
                    sx={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: 2,
                        p: { xs: 3, sm: 5 },
                        mb: 5,
                    }}
                >
                    <Typography
                        sx={{
                            fontFamily: 'Poppins',
                            fontWeight: 600,
                            fontSize: '28px',
                            color: '#111827',
                            mb: 3,
                        }}
                    >
                        Getting Started
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {guideSteps.map((step, index) => (
                            <Box key={step.title}>
                                <Typography
                                    sx={{
                                        fontFamily: 'Poppins',
                                        fontWeight: 600,
                                        fontSize: '20px',
                                        color: '#111827',
                                        mb: 1,
                                    }}
                                >
                                    {step.title}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontFamily: 'Noto Sans',
                                        fontSize: '15px',
                                        lineHeight: 1.9,
                                        color: '#374151',
                                    }}
                                >
                                    {step.description}
                                </Typography>
                                {index < guideSteps.length - 1 && <Divider sx={{ mt: 2.5 }} />}
                            </Box>
                        ))}
                    </Box>
                </Paper>

                {/* Features */}
                <Box sx={{ mb: 5 }}>
                    <Typography
                        sx={{
                            fontFamily: 'Poppins',
                            fontWeight: 600,
                            fontSize: '28px',
                            color: '#111827',
                            mb: 3,
                        }}
                    >
                        Main Features
                    </Typography>

                    <Grid container spacing={3}>
                        {featureCards.map((feature) => (
                            <Grid item xs={12} sm={6} key={feature.title}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        borderRadius: 2,
                                        border: '1px solid #e5e7eb',
                                        boxShadow: 'none',
                                    }}
                                >
                                    <CardContent>
                                        <Typography
                                            sx={{
                                                fontFamily: 'Poppins',
                                                fontWeight: 600,
                                                fontSize: '20px',
                                                color: '#111827',
                                                mb: 1.5,
                                            }}
                                        >
                                            {feature.title}
                                        </Typography>

                                        <Typography
                                            sx={{
                                                fontFamily: 'Noto Sans',
                                                fontSize: '15px',
                                                lineHeight: 1.8,
                                                color: '#4b5563',
                                            }}
                                        >
                                            {feature.body}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* FAQ */}
                <Paper
                    elevation={0}
                    sx={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: 2,
                        p: { xs: 3, sm: 5 },
                    }}
                >
                    <Typography
                        sx={{
                            fontFamily: 'Poppins',
                            fontWeight: 600,
                            fontSize: '28px',
                            color: '#111827',
                            mb: 3,
                        }}
                    >
                        Quick Tips
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <Typography
                                sx={{
                                    fontFamily: 'Poppins',
                                    fontWeight: 600,
                                    fontSize: '18px',
                                    color: '#111827',
                                    mb: 1,
                                }}
                            >
                                How do I sign in?
                            </Typography>
                            <Typography
                                sx={{
                                    fontFamily: 'Noto Sans',
                                    fontSize: '15px',
                                    lineHeight: 1.8,
                                    color: '#374151',
                                }}
                            >
                                Use one of the available social authentication options such as Google or Facebook.
                            </Typography>
                        </Box>

                        <Box>
                            <Typography
                                sx={{
                                    fontFamily: 'Poppins',
                                    fontWeight: 600,
                                    fontSize: '18px',
                                    color: '#111827',
                                    mb: 1,
                                }}
                            >
                                How do I save products?
                            </Typography>
                            <Typography
                                sx={{
                                    fontFamily: 'Noto Sans',
                                    fontSize: '15px',
                                    lineHeight: 1.8,
                                    color: '#374151',
                                }}
                            >
                                Add products to your favorites list or cart depending on what you want to do next.
                            </Typography>
                        </Box>

                        <Box>
                            <Typography
                                sx={{
                                    fontFamily: 'Poppins',
                                    fontWeight: 600,
                                    fontSize: '18px',
                                    color: '#111827',
                                    mb: 1,
                                }}
                            >
                                Where can I manage my information?
                            </Typography>
                            <Typography
                                sx={{
                                    fontFamily: 'Noto Sans',
                                    fontSize: '15px',
                                    lineHeight: 1.8,
                                    color: '#374151',
                                }}
                            >
                                Go to the account settings area to review your profile, addresses, and payment information.
                            </Typography>
                        </Box>

                        <Box sx={{ pt: 1 }}>
                            <Chip label="Sample Guide" sx={{ fontFamily: 'Noto Sans' }} />
                        </Box>
                    </Box>
                </Paper>
            </Container>

            <Footer />
        </Box>
    );
};

export default UserGuidePage;
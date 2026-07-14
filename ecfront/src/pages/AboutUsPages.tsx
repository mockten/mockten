import React from 'react';
import { Box, Container, Typography, Paper, Grid, Card, CardContent, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

const AboutUsPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: '#f8f9fb' }}>
            <Appbar />

            <Container maxWidth="lg" sx={{ py: 6 }}>
                {/* Hero Section */}
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
                        About Mockten
                    </Typography>

                    <Typography
                        sx={{
                            fontFamily: 'Noto Sans',
                            fontSize: { xs: '16px', sm: '18px' },
                            lineHeight: 1.9,
                            maxWidth: '760px',
                        }}
                    >
                        Mockten is a sample marketplace application created for learning, prototyping,
                        and UI/UX experimentation. It demonstrates user authentication, product browsing,
                        search, checkout flows, reviews, favorites, and profile management in a modern web application.
                    </Typography>
                </Paper>

                {/* Mission Section */}
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
                            mb: 2,
                        }}
                    >
                        Our Mission
                    </Typography>

                    <Typography
                        sx={{
                            fontFamily: 'Noto Sans',
                            fontSize: '15px',
                            lineHeight: 1.9,
                            color: '#374151',
                        }}
                    >
                        Our goal is to provide a simple but realistic environment for studying modern frontend
                        and backend application design. Mockten helps developers learn how commerce platforms
                        can be structured, from authentication and product discovery to account management and purchasing flows.
                    </Typography>
                </Paper>

                {/* Features Section */}
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
                        What Mockten Demonstrates
                    </Typography>

                    <Grid container spacing={3}>
                        {[
                            {
                                title: 'Authentication',
                                body: 'Google / Facebook sign-in flows and account onboarding experience.',
                            },
                            {
                                title: 'Product Discovery',
                                body: 'Search pages, category filters, reviews, and recommendation sections.',
                            },
                            {
                                title: 'Shopping Experience',
                                body: 'Favorites, cart, checkout, address management, and order-related flows.',
                            },
                            {
                                title: 'Account Management',
                                body: 'User profile settings, addresses, payment information, and policies.',
                            },
                        ].map((item) => (
                            <Grid item xs={12} sm={6} key={item.title}>
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
                                            {item.title}
                                        </Typography>

                                        <Typography
                                            sx={{
                                                fontFamily: 'Noto Sans',
                                                fontSize: '15px',
                                                lineHeight: 1.8,
                                                color: '#4b5563',
                                            }}
                                        >
                                            {item.body}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Closing Section */}
                <Paper
                    elevation={0}
                    sx={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: 2,
                        p: { xs: 3, sm: 5 },
                        textAlign: 'center',
                    }}
                >
                    <Typography
                        sx={{
                            fontFamily: 'Poppins',
                            fontWeight: 600,
                            fontSize: '28px',
                            color: '#111827',
                            mb: 2,
                        }}
                    >
                        Built for Learning
                    </Typography>

                    <Typography
                        sx={{
                            fontFamily: 'Noto Sans',
                            fontSize: '15px',
                            lineHeight: 1.9,
                            color: '#374151',
                            maxWidth: '760px',
                            mx: 'auto',
                            mb: 3,
                        }}
                    >
                        This project is intended as a study application. The content, policies, and product data
                        are sample materials created to support UI implementation, system design practice, and frontend development learning.
                    </Typography>

                    <Button
                        variant="contained"
                        onClick={() => navigate('/')}
                        sx={{
                            backgroundColor: '#6358DC',
                            textTransform: 'none',
                            fontFamily: 'Noto Sans',
                            fontWeight: 'bold',
                            px: 4,
                            py: 1.5,
                            '&:hover': {
                                backgroundColor: '#5548c9',
                            },
                        }}
                    >
                        Explore Mockten
                    </Button>
                </Paper>
            </Container>

            <Footer />
        </Box>
    );
};

export default AboutUsPage;
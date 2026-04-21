import React from 'react';
import { Box, Container, Typography, Paper, Grid, Card, CardContent, Button, Divider } from '@mui/material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

const positions = [
    {
        title: 'Frontend Engineer',
        type: 'Full-time / Sample',
        description:
            'Build modern user interfaces using React, TypeScript, and component-based design systems.',
    },
    {
        title: 'Backend Engineer',
        type: 'Full-time / Sample',
        description:
            'Design APIs, services, and data flows for scalable application features and integrations.',
    },
    {
        title: 'UI/UX Designer',
        type: 'Full-time / Sample',
        description:
            'Create intuitive experiences, wireframes, prototypes, and design systems for web applications.',
    },
    {
        title: 'Product Intern',
        type: 'Internship / Sample',
        description:
            'Support research, documentation, testing, and product operations in a learning-focused environment.',
    },
];

const CareerPage: React.FC = () => {
    return (
        <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: '#f8f9fb' }}>
            <Appbar />

            <Container maxWidth="lg" sx={{ py: 6 }}>
                {/* Hero */}
                <Paper
                    elevation={0}
                    sx={{
                        background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
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
                        Careers at Mockten
                    </Typography>

                    <Typography
                        sx={{
                            fontFamily: 'Noto Sans',
                            fontSize: { xs: '16px', sm: '18px' },
                            lineHeight: 1.9,
                            maxWidth: '760px',
                        }}
                    >
                        Mockten is a sample learning application, and this page demonstrates what a simple
                        careers page might look like. We imagine a team that values curiosity, thoughtful design,
                        practical engineering, and continuous learning.
                    </Typography>
                </Paper>

                {/* Why Join Us */}
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
                        Why Join Us
                    </Typography>

                    <Typography
                        sx={{
                            fontFamily: 'Noto Sans',
                            fontSize: '15px',
                            lineHeight: 1.9,
                            color: '#374151',
                        }}
                    >
                        At Mockten, we care about building clear, maintainable, and enjoyable products.
                        This sample page represents a workplace where people collaborate across design,
                        engineering, and product disciplines to create learning-focused experiences.
                    </Typography>
                </Paper>

                {/* Open Roles */}
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
                        Open Roles
                    </Typography>

                    <Grid container spacing={3}>
                        {positions.map((position) => (
                            <Grid item xs={12} sm={6} key={position.title}>
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
                                                mb: 1,
                                            }}
                                        >
                                            {position.title}
                                        </Typography>

                                        <Typography
                                            sx={{
                                                fontFamily: 'Noto Sans',
                                                fontSize: '13px',
                                                color: '#6b7280',
                                                mb: 1.5,
                                            }}
                                        >
                                            {position.type}
                                        </Typography>

                                        <Typography
                                            sx={{
                                                fontFamily: 'Noto Sans',
                                                fontSize: '15px',
                                                lineHeight: 1.8,
                                                color: '#4b5563',
                                            }}
                                        >
                                            {position.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Hiring Process */}
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
                        Hiring Process
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[
                            '1. Application review',
                            '2. Introductory conversation',
                            '3. Technical or portfolio discussion',
                            '4. Team conversation',
                            '5. Final decision',
                        ].map((step) => (
                            <Typography
                                key={step}
                                sx={{
                                    fontFamily: 'Noto Sans',
                                    fontSize: '15px',
                                    lineHeight: 1.8,
                                    color: '#374151',
                                }}
                            >
                                {step}
                            </Typography>
                        ))}
                    </Box>
                </Paper>

                {/* Closing */}
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
                        Interested in Joining?
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
                        This is a sample recruitment page for study purposes. In a real product, this area could
                        link to application forms, hiring contacts, or job detail pages.
                    </Typography>

                    <Divider sx={{ mb: 3 }} />

                    <Button
                        variant="contained"
                        sx={{
                            backgroundColor: '#111827',
                            textTransform: 'none',
                            fontFamily: 'Noto Sans',
                            fontWeight: 'bold',
                            px: 4,
                            py: 1.5,
                            '&:hover': {
                                backgroundColor: '#374151',
                            },
                        }}
                    >
                        Apply Now
                    </Button>
                </Paper>
            </Container>

            <Footer />
        </Box>
    );
};

export default CareerPage;
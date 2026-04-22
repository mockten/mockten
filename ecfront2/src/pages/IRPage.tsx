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

const irHighlights = [
    { label: 'Revenue Growth', value: '+18%' },
    { label: 'Monthly Active Users', value: '120K' },
    { label: 'Orders Processed', value: '48K' },
    { label: 'Markets Served', value: '2' },
];

const irNews = [
    {
        date: '2026-03-01',
        title: 'Mockten releases sample Q1 financial update',
    },
    {
        date: '2026-02-15',
        title: 'Platform feature expansion announced for learning environment',
    },
    {
        date: '2026-01-20',
        title: 'New sample investor materials published',
    },
];

const IRPage: React.FC = () => {
    return (
        <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: '#f8f9fb' }}>
            <Appbar />

            <Container maxWidth="lg" sx={{ py: 6 }}>
                {/* Hero */}
                <Paper
                    elevation={0}
                    sx={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
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
                        Investor Relations
                    </Typography>

                    <Typography
                        sx={{
                            fontFamily: 'Noto Sans',
                            fontSize: { xs: '16px', sm: '18px' },
                            lineHeight: 1.9,
                            maxWidth: '760px',
                        }}
                    >
                        This is a sample IR page for a study application. It demonstrates how a company
                        might present financial highlights, recent announcements, and investor-related information.
                    </Typography>
                </Paper>

                {/* Highlights */}
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
                        Highlights
                    </Typography>

                    <Grid container spacing={3}>
                        {irHighlights.map((item) => (
                            <Grid item xs={12} sm={6} md={3} key={item.label}>
                                <Card
                                    sx={{
                                        borderRadius: 2,
                                        border: '1px solid #e5e7eb',
                                        boxShadow: 'none',
                                        height: '100%',
                                    }}
                                >
                                    <CardContent>
                                        <Typography
                                            sx={{
                                                fontFamily: 'Noto Sans',
                                                fontSize: '14px',
                                                color: '#6b7280',
                                                mb: 1,
                                            }}
                                        >
                                            {item.label}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontFamily: 'Poppins',
                                                fontWeight: 700,
                                                fontSize: '28px',
                                                color: '#111827',
                                            }}
                                        >
                                            {item.value}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Company Overview */}
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
                        Company Overview
                    </Typography>

                    <Typography
                        sx={{
                            fontFamily: 'Noto Sans',
                            fontSize: '15px',
                            lineHeight: 1.9,
                            color: '#374151',
                        }}
                    >
                        Mockten is a sample commerce and learning platform built to demonstrate modern web
                        application patterns. The service showcases account authentication, product discovery,
                        shopping flows, address management, and other common product features in a study-friendly format.
                    </Typography>
                </Paper>

                {/* IR News */}
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
                        Latest IR News
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {irNews.map((news, index) => (
                            <Box key={news.title}>
                                <Typography
                                    sx={{
                                        fontFamily: 'Noto Sans',
                                        fontSize: '13px',
                                        color: '#6b7280',
                                        mb: 0.5,
                                    }}
                                >
                                    {news.date}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontFamily: 'Noto Sans',
                                        fontSize: '16px',
                                        color: '#111827',
                                        fontWeight: 600,
                                    }}
                                >
                                    {news.title}
                                </Typography>
                                {index < irNews.length - 1 && <Divider sx={{ mt: 2.5 }} />}
                            </Box>
                        ))}
                    </Box>
                </Paper>

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
                        Investor FAQ
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <Typography sx={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '18px', color: '#111827', mb: 1 }}>
                                Is this a real investor relations page?
                            </Typography>
                            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '15px', lineHeight: 1.8, color: '#374151' }}>
                                No. This is a sample page created for learning and UI demonstration purposes.
                            </Typography>
                        </Box>

                        <Box>
                            <Typography sx={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '18px', color: '#111827', mb: 1 }}>
                                Are the financial numbers real?
                            </Typography>
                            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '15px', lineHeight: 1.8, color: '#374151' }}>
                                No. All figures shown here are illustrative sample values only.
                            </Typography>
                        </Box>

                        <Box>
                            <Typography sx={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '18px', color: '#111827', mb: 1 }}>
                                What is this page useful for?
                            </Typography>
                            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '15px', lineHeight: 1.8, color: '#374151' }}>
                                It can be used to study layout design, content hierarchy, and how an investor relations page may be structured.
                            </Typography>
                        </Box>

                        <Box sx={{ pt: 1 }}>
                            <Chip label="Sample Content" sx={{ fontFamily: 'Noto Sans' }} />
                        </Box>
                    </Box>
                </Paper>
            </Container>

            <Footer />
        </Box>
    );
};

export default IRPage;
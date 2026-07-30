import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    TextField,
    Button,
    MenuItem,
    Snackbar,
    Alert,
} from '@mui/material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

const inquiryTypes = [
    'General Question',
    'Order Support',
    'Payment Issue',
    'Account Support',
    'Bug Report',
    'Other',
];

const ContactUsPage: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        inquiryType: '',
        message: '',
    });

    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const handleChange =
        (field: 'name' | 'email' | 'inquiryType' | 'message') =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                setFormData((prev) => ({
                    ...prev,
                    [field]: event.target.value,
                }));
            };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Contact form submitted:', formData);
        setSnackbarOpen(true);
        setFormData({
            name: '',
            email: '',
            inquiryType: '',
            message: '',
        });
    };

    return (
        <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: '#f8f9fb' }}>
            <Appbar />

            <Container maxWidth="md" sx={{ py: 6 }}>
                <Paper
                    elevation={0}
                    sx={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: 2,
                        p: { xs: 3, sm: 5 },
                    }}
                >
                    <Box sx={{ mb: 4 }}>
                        <Typography
                            sx={{
                                fontFamily: 'Poppins',
                                fontWeight: 700,
                                fontSize: { xs: '28px', sm: '36px' },
                                color: '#2F2F2F',
                                mb: 1,
                            }}
                        >
                            Contact Us
                        </Typography>

                        <Typography
                            sx={{
                                fontFamily: 'Noto Sans',
                                fontSize: '15px',
                                color: '#6b7280',
                                lineHeight: 1.8,
                            }}
                        >
                            Have a question or need help? This is a sample contact page for a study application.
                            You can use this form layout as a base for support or inquiry features.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            backgroundColor: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: 2,
                            p: 3,
                            mb: 4,
                        }}
                    >
                        <Typography
                            sx={{
                                fontFamily: 'Poppins',
                                fontWeight: 600,
                                fontSize: '18px',
                                color: '#111827',
                                mb: 1.5,
                            }}
                        >
                            Support Information
                        </Typography>

                        <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#374151', mb: 0.5 }}>
                            Email: support@mockten.example
                        </Typography>
                        <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#374151', mb: 0.5 }}>
                            Business Hours: Mon - Fri / 10:00 - 18:00
                        </Typography>
                        <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: '#6b7280', mt: 1 }}>
                            This contact information is sample content for demonstration purposes.
                        </Typography>
                    </Box>

                    <Box component="form" onSubmit={handleSubmit}>
                        <Box sx={{ mb: 3 }}>
                            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black', mb: 1 }}>
                                Name
                            </Typography>
                            <TextField
                                fullWidth
                                value={formData.name}
                                onChange={handleChange('name')}
                                placeholder="Your name"
                            />
                        </Box>

                        <Box sx={{ mb: 3 }}>
                            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black', mb: 1 }}>
                                Email
                            </Typography>
                            <TextField
                                fullWidth
                                type="email"
                                value={formData.email}
                                onChange={handleChange('email')}
                                placeholder="your@email.com"
                            />
                        </Box>

                        <Box sx={{ mb: 3 }}>
                            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black', mb: 1 }}>
                                Inquiry Type
                            </Typography>
                            <TextField
                                select
                                fullWidth
                                value={formData.inquiryType}
                                onChange={handleChange('inquiryType')}
                                placeholder="Select inquiry type"
                            >
                                {inquiryTypes.map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        <Box sx={{ mb: 4 }}>
                            <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black', mb: 1 }}>
                                Message
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={6}
                                value={formData.message}
                                onChange={handleChange('message')}
                                placeholder="Please describe your question or issue."
                            />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Button
                                type="submit"
                                variant="contained"
                                sx={{
                                    backgroundColor: '#111827',
                                    textTransform: 'none',
                                    fontFamily: 'Noto Sans',
                                    fontWeight: 'bold',
                                    px: 5,
                                    py: 1.5,
                                    '&:hover': {
                                        backgroundColor: '#374151',
                                    },
                                }}
                            >
                                Send Message
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Container>

            <Footer />

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
            >
                <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
                    Your message has been submitted.
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ContactUsPage;
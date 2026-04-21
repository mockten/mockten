import React from 'react';
import { Box, Container, Typography, Paper, Divider } from '@mui/material';
import Footer from '../components/Footer';

const sections = [
    {
        title: '1. Introduction',
        body: `Welcome to Mockten. These Terms of Service govern your use of this application.
By accessing or using the service, you agree to these terms. If you do not agree,
please do not use the service.`,
    },
    {
        title: '2. Account Registration',
        body: `You may need to sign in using a supported third-party authentication provider such as
Google or Facebook. You are responsible for maintaining the security of your account
and for any activity conducted through it.`,
    },
    {
        title: '3. Use of the Service',
        body: `This application is provided for learning and demonstration purposes.
You agree not to misuse the service, attempt unauthorized access, disrupt normal operation,
or use the platform in a way that violates applicable laws or regulations.`,
    },
    {
        title: '4. User Content',
        body: `If you submit information such as profile data, product reviews, or other content,
you are responsible for the accuracy and legality of that content.
We may remove content that is inappropriate, misleading, or harmful.`,
    },
    {
        title: '5. Payments and Orders',
        body: `If the application includes shopping, checkout, or payment-related features,
all transactions are subject to availability and system status.
We do not guarantee uninterrupted service or error-free processing.`,
    },
    {
        title: '6. Privacy',
        body: `We may collect limited account and usage information necessary to operate the service.
Please refer to the Privacy Policy for more information about how data is handled.`,
    },
    {
        title: '7. Limitation of Liability',
        body: `This application is provided "as is" without warranties of any kind.
To the maximum extent permitted by law, we are not liable for indirect, incidental,
or consequential damages arising from your use of the service.`,
    },
    {
        title: '8. Changes to the Terms',
        body: `We may update these Terms of Service from time to time.
Continued use of the application after changes become effective constitutes acceptance
of the revised terms.`,
    },
    {
        title: '9. Contact',
        body: `If you have any questions about these terms, please contact the administrator
or development team of this application.`,
    },
];

const TermsPage: React.FC = () => {
    return (
        <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: '#f8f9fb' }}>

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
                            Terms of Service
                        </Typography>

                        <Typography
                            sx={{
                                fontFamily: 'Noto Sans',
                                fontSize: '14px',
                                color: '#6b7280',
                            }}
                        >
                            Last updated: March 2026
                        </Typography>
                    </Box>

                    <Divider sx={{ mb: 4 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {sections.map((section) => (
                            <Box key={section.title}>
                                <Typography
                                    sx={{
                                        fontFamily: 'Poppins',
                                        fontWeight: 600,
                                        fontSize: '20px',
                                        color: '#111827',
                                        mb: 1.5,
                                    }}
                                >
                                    {section.title}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontFamily: 'Noto Sans',
                                        fontSize: '15px',
                                        lineHeight: 1.9,
                                        color: '#374151',
                                        whiteSpace: 'pre-line',
                                    }}
                                >
                                    {section.body}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            </Container>

            <Footer />
        </Box>
    );
};

export default TermsPage;
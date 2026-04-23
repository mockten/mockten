import React from 'react';
import { Box, Container, Typography, Paper, Divider } from '@mui/material';
import Footer from '../components/Footer';

const sections = [
    {
        title: '1. Purpose of the Service',
        body: `This e-commerce application is provided strictly for educational and testing purposes. It is designed to help users learn web development, local deployment, and UI/UX design. This service is NOT intended for actual commercial transactions or production use.`,
    },
    {
        title: '2. Prohibition of Commercial Use',
        body: `Users shall not use this software to process real payments, handle real customer data, or operate an actual business. Any attempt to use this platform for real-world commerce is strictly prohibited and at the user's own risk.`,
    },
    {
        title: '3. Data Handling and Security',
        body: `No Real Personal Data: Do not input real credit card numbers, passwords, or personal identification information. Please use dummy data for testing. Local Environment: Since this application is deployed locally, the security of the environment depends on the user's own setup. Data Loss: The provider is not responsible for any data loss or corruption occurring in the user's local environment.`,
    },
    {
        title: '4. Disclaimer of Warranties',
        body: `This software is provided "AS IS", without warranty of any kind, express or implied. The provider does not guarantee that the software will be bug-free or compatible with all local environments.`,
    },
    {
        title: '5. Intellectual Property',
        body: `While users are encouraged to modify and experiment with the source code for learning, the original copyright belongs to the provider unless otherwise specified by an Open Source License (e.g., MIT).`,
    },
    {
        title: '6. Limitation of Liability',
        body: `In no event shall the provider be liable for any claim, damages, or other liability arising from the use of this educational tool.`,
    },
];

const TermsPage: React.FC = () => {
    return (
        <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: '#CADFFF' }}>

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
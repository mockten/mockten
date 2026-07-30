import React from 'react';
import { Box, Container, Typography, Paper, Divider } from '@mui/material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';

const sections = [
    {
        title: '1. Overview',
        body: `This Cancellation Policy explains how order cancellations, refunds, and returns are handled on Mockten.
This page is provided as a sample policy for educational and demonstration purposes.`,
    },
    {
        title: '2. Order Cancellation Before Shipment',
        body: `You may request cancellation of an order before the item has been shipped.
If the cancellation request is accepted, the order will be canceled and any payment already made may be refunded according to the payment provider's process.`,
    },
    {
        title: '3. Order Cancellation After Shipment',
        body: `Once an item has been shipped, the order may no longer be canceled directly.
In such cases, you may need to wait until the item is delivered and then request a return or refund in accordance with the return conditions.`,
    },
    {
        title: '4. Seller or System-Initiated Cancellation',
        body: `An order may be canceled by the seller or by the platform in situations such as:
- item out of stock
- payment authorization failure
- suspected fraudulent activity
- incorrect pricing or listing errors

If this happens, you will be notified and any eligible refund will be processed.`,
    },
    {
        title: '5. Refund Policy',
        body: `Approved refunds will generally be issued to the original payment method.
The timing of the refund may vary depending on your payment provider, bank, or card issuer.
In some cases, processing may take several business days.`,
    },
    {
        title: '6. Non-Cancellable or Non-Refundable Items',
        body: `Certain items may not be eligible for cancellation, return, or refund after purchase.
Examples may include:
- digital goods
- personalized or custom-made products
- final sale items
- opened or used items where return is restricted`,
    },
    {
        title: '7. Return Requests',
        body: `If your order cannot be canceled because it has already been shipped, you may be able to submit a return request.
Returned items may need to meet certain conditions, such as being unused, in original packaging, and returned within the stated period.`,
    },
    {
        title: '8. Failed Deliveries and Incorrect Addresses',
        body: `If delivery fails due to an incorrect shipping address entered by the customer, additional shipping charges or cancellation restrictions may apply.
Please ensure that your shipping address is accurate before completing your order.`,
    },
    {
        title: '9. Contact and Support',
        body: `If you need help with cancellation, refund, or return requests, please contact the support team or application administrator.
Response times may vary depending on system status and workload.`,
    },
];

const CancellationPolicyPage: React.FC = () => {
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
                            Cancellation Policy
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

export default CancellationPolicyPage;
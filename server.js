require("dotenv").config();
const express = require('express');
const cors = require('cors');
const payuRoutes = require('./routes/payu');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/payu', payuRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Nestex Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      payu: {
        generateQRStatic: '/api/payu/generate-qr-static',
        generateQR: '/api/payu/generate-qr',
        verifyPayment: '/api/payu/verify-payment',
        paymentStatus: '/api/payu/payment-status/:txnid',
        transactionDetails: '/api/payu/transaction/:txnid',
        createForm: '/api/payu/create-form',
        webhook: '/api/payu/webhook',
        success: '/api/payu/success',
        failure: '/api/payu/failure'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
}); 
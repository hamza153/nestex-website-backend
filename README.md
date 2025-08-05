# Nestex Backend - Express.js with PayU.in Integration

A Node.js/Express.js backend API that generates QR codes for payments using PayU.in integration.

## Features

- ✅ Express.js REST API
- ✅ PayU.in payment gateway integration
- ✅ QR code generation for payments
- ✅ Payment verification
- ✅ Webhook handling
- ✅ CORS enabled
- ✅ Environment-based configuration
- ✅ Error handling

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the environment example file and configure your PayU credentials:

```bash
cp env.example .env
```

Edit `.env` file with your PayU credentials:

```env
# PayU Configuration
PAYU_MERCHANT_KEY=your_merchant_key_here
PAYU_MERCHANT_SALT=your_merchant_salt_here
PAYU_MODE=test
PAYU_BASE_URL=https://test.payu.in

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /health
```

### Generate QR Code for Payment
```
POST /api/payu/generate-qr
```

**Request Body:**
```json
{
  "amount": 100,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "9999999999"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN_1234567890_abc123",
    "amount": 100,
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "9999999999",
    "paymentUrl": "https://test.payu.in/_payment",
    "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "formData": {
      "key": "your_merchant_key",
      "txnid": "TXN_1234567890_abc123",
      "amount": "100",
      "productinfo": "Payment for services",
      "firstname": "John Doe",
      "email": "john@example.com",
      "phone": "9999999999",
      "surl": "http://localhost:3000/api/payu/success",
      "furl": "http://localhost:3000/api/payu/failure",
      "mode": "test",
      "hash": "generated_hash_here"
    },
    "timestamp": "2023-12-01T10:30:00.000Z"
  },
  "message": "QR code generated successfully"
}
```

### Verify Payment
```
POST /api/payu/verify-payment
```

**Request Body:**
```json
{
  "txnid": "TXN_1234567890_abc123"
}
```

### Get Payment Status
```
GET /api/payu/payment-status/:txnid
```

### PayU Webhook
```
POST /api/payu/webhook
```

## Project Structure

```
nestex-backend/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── env.example           # Environment variables template
├── README.md             # This file
├── routes/
│   └── payu.js          # PayU API routes
└── services/
    └── payuService.js   # PayU integration service
```

## PayU Integration Details

### Configuration

1. **Merchant Key & Salt**: Get these from your PayU merchant dashboard
2. **Mode**: Use `test` for development, `live` for production
3. **Base URL**: 
   - Test: `https://test.payu.in`
   - Live: `https://secure.payu.in`

### Features Implemented

- **QR Code Generation**: Creates QR codes for payment URLs
- **Hash Generation**: Secure hash generation for PayU API
- **Transaction ID**: Unique transaction ID generation
- **Payment Verification**: Verify payment status
- **Webhook Handling**: Process PayU webhooks
- **Error Handling**: Comprehensive error handling

### Security Features

- Hash verification for webhooks
- Environment-based configuration
- Input validation
- Error logging

## Testing the API

### Using cURL

1. **Generate QR Code:**
```bash
curl -X POST http://localhost:3000/api/payu/generate-qr \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "customerPhone": "9999999999"
  }'
```

2. **Verify Payment:**
```bash
curl -X POST http://localhost:3000/api/payu/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "txnid": "TXN_1234567890_abc123"
  }'
```

### Using Postman

Import these endpoints to Postman:

1. **Generate QR**: `POST http://localhost:3000/api/payu/generate-qr`
2. **Verify Payment**: `POST http://localhost:3000/api/payu/verify-payment`
3. **Health Check**: `GET http://localhost:3000/health`

## Development

### Adding New Features

1. Create new routes in `routes/` directory
2. Add business logic in `services/` directory
3. Update environment variables if needed
4. Test thoroughly before deployment

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PAYU_MERCHANT_KEY` | PayU merchant key | Yes | - |
| `PAYU_MERCHANT_SALT` | PayU merchant salt | Yes | - |
| `PAYU_MODE` | Environment mode | No | `test` |
| `PAYU_BASE_URL` | PayU API base URL | No | `https://test.payu.in` |
| `PORT` | Server port | No | `3000` |
| `NODE_ENV` | Node environment | No | `development` |

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure `PAYU_MODE=live`
3. Use production PayU credentials
4. Set up proper SSL certificates
5. Configure webhook URLs
6. Set up monitoring and logging

## Troubleshooting

### Common Issues

1. **PayU credentials not configured**: Check your `.env` file
2. **QR code not generating**: Verify PayU credentials and network connectivity
3. **Webhook not working**: Check webhook URL configuration in PayU dashboard

### Logs

Check console logs for detailed error messages and debugging information.

## License

ISC License

## Support

For issues and questions, please check the PayU documentation or create an issue in this repository. 
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'OBAnalyzer API',
      version: '1.0.0',
      description:
        'Order Book Analyzer for Prediction Markets — capture, store, and replay real-time market data from Polymarket and BTC/USD.',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            user_id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            status: { type: 'string', enum: ['active', 'disabled'] },
            plan: { type: 'string', enum: ['free', 'premium', 'institutional'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

module.exports = swaggerJsdoc(options);

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const routes = require('./routes');
const swaggerSpec = require('./docs/swagger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// "simple": mantém a chave literal "option[45]" (o parser "qs" transformaria em array e perderia o id).
// Precisa ser definido ANTES do primeiro app.use().
app.set('query parser', 'simple');

app.use(cors());
app.use(express.json({ limit: '20mb' })); // imagens chegam em base64

// imagens dos produtos
app.use('/media', express.static(config.mediaDir));

// documentação interativa (Swagger UI) e especificação OpenAPI em JSON
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Digital Store API' }));

app.use('/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

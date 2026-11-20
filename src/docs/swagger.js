/**
 * Especificação OpenAPI 3.0 da API (servida em /api-docs e /api-docs.json).
 * Mantida como objeto JS para reaproveitar trechos repetidos (respostas, parâmetros).
 */
const config = require('../config');

/* ------------------------------ helpers ------------------------------ */

const json = (schema) => ({ 'application/json': { schema } });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const body = (schema, required = true) => ({ required, content: json(schema) });
const idParam = (what) => ({
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 },
  description: `ID ${what}`,
});

const R = {
  ok: (description, schema) => ({ description, ...(schema && { content: json(schema) }) }),
  noContent: { description: '204 No Content - sucesso, sem corpo na resposta' },
  badRequest: { description: '400 Bad Request - dados da requisição incorretos', content: json(ref('Error')) },
  unauthorized: {
    description: '401 Unauthorized - token de autorização não enviado ou incorreto',
    content: json(ref('Error')),
  },
  notFound: { description: '404 Not Found - o recurso solicitado não existe', content: json(ref('Error')) },
};

const secured = [{ bearerAuth: [] }];

const pagination = [
  {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', default: 12 },
    description: 'Itens por página. Use `-1` para buscar todos os itens.',
  },
  {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', minimum: 1, default: 1 },
    description: 'Página. Sem efeito quando `limit=-1`.',
  },
];

/* ------------------------------ schemas ------------------------------ */

const schemas = {
  Error: {
    type: 'object',
    properties: { message: { type: 'string', example: 'Dados da requisição incorretos' } },
  },

  User: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      firstname: { type: 'string', example: 'user firstname' },
      surname: { type: 'string', example: 'user surname' },
      email: { type: 'string', format: 'email', example: 'user@mail.com' },
    },
  },
  UserCreate: {
    type: 'object',
    required: ['firstname', 'surname', 'email', 'password', 'confirmPassword'],
    properties: {
      firstname: { type: 'string', example: 'user firstname' },
      surname: { type: 'string', example: 'user surname' },
      email: { type: 'string', format: 'email', example: 'user@mail.com' },
      password: { type: 'string', example: '123@123' },
      confirmPassword: { type: 'string', example: '123@123' },
    },
  },
  UserUpdate: {
    type: 'object',
    required: ['firstname', 'surname', 'email'],
    properties: {
      firstname: { type: 'string', example: 'user firstname' },
      surname: { type: 'string', example: 'user surname' },
      email: { type: 'string', format: 'email', example: 'user@mail.com' },
    },
  },
  TokenRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'user@mail.com' },
      password: { type: 'string', example: '123@123' },
    },
  },
  TokenResponse: {
    type: 'object',
    properties: { token: { type: 'string', example: '<JWT>' } },
  },

  Category: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      name: { type: 'string', example: 'Shoes' },
      slug: { type: 'string', example: 'shoes' },
      use_in_menu: { type: 'boolean', example: true },
    },
  },
  CategoryInput: {
    type: 'object',
    required: ['name', 'slug'],
    properties: {
      name: { type: 'string', example: 'Shoes' },
      slug: { type: 'string', example: 'shoes' },
      use_in_menu: { type: 'boolean', default: false, example: true },
    },
  },
  CategoryList: {
    type: 'object',
    properties: {
      data: { type: 'array', items: ref('Category') },
      total: { type: 'integer', example: 10 },
      limit: { type: 'integer', example: 12 },
      page: { type: 'integer', example: 1 },
    },
  },

  ProductImage: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      content: { type: 'string', example: 'http://localhost:3000/media/product-1/image-01.png' },
    },
  },
  ProductOption: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      title: { type: 'string', example: 'Tamanho' },
      shape: { type: 'string', enum: ['square', 'circle'], example: 'square' },
      radius: { type: 'integer', example: 4 },
      type: { type: 'string', enum: ['text', 'color'], example: 'text' },
      values: { type: 'array', items: { type: 'string' }, example: ['PP', 'M', 'GG'] },
    },
  },
  Product: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      enabled: { type: 'boolean', example: true },
      name: { type: 'string', example: 'Produto 01' },
      slug: { type: 'string', example: 'produto-01' },
      use_in_menu: { type: 'boolean', example: false },
      stock: { type: 'integer', example: 10 },
      description: { type: 'string', example: 'Descrição do produto 01' },
      price: { type: 'number', format: 'float', example: 119.9 },
      price_with_discount: { type: 'number', format: 'float', example: 99.9 },
      category_ids: { type: 'array', items: { type: 'integer' }, example: [1, 15, 24, 68] },
      images: { type: 'array', items: ref('ProductImage') },
      options: { type: 'array', items: ref('ProductOption') },
    },
  },
  ProductList: {
    type: 'object',
    properties: {
      data: { type: 'array', items: ref('Product') },
      total: { type: 'integer', example: 120 },
      limit: { type: 'integer', example: 12 },
      page: { type: 'integer', example: 1 },
    },
  },
  ProductImageInput: {
    type: 'object',
    description:
      'Na criação: `type` + `content` (base64). Na atualização: sem `id` = nova; `id` + `deleted: true` = remove; ' +
      '`id` + base64 = substitui o arquivo; `id` + URL em `content` = mantém a imagem atual.',
    properties: {
      id: { type: 'integer', example: 2 },
      type: { type: 'string', enum: ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'], example: 'image/png' },
      content: { type: 'string', example: 'base64 da imagem' },
      deleted: { type: 'boolean', example: true },
    },
  },
  ProductOptionInput: {
    type: 'object',
    description:
      'Na criação `title` e `values` são obrigatórios. Na atualização: sem `id` = nova; `id` + `deleted: true` = remove; ' +
      '`id` + campos = atualiza só o que foi enviado. `radius` aceita número ou texto como "4px"; `value` é aceito como ' +
      'sinônimo de `values`. Os valores não podem conter vírgula.',
    properties: {
      id: { type: 'integer', example: 1 },
      title: { type: 'string', example: 'Tamanho' },
      shape: { type: 'string', enum: ['square', 'circle'], default: 'square' },
      radius: { oneOf: [{ type: 'integer' }, { type: 'string', example: '4px' }], default: 0 },
      type: { type: 'string', enum: ['text', 'color'], default: 'text' },
      values: { type: 'array', items: { type: 'string' }, example: ['PP', 'GG', 'M'] },
      deleted: { type: 'boolean' },
    },
  },
  ProductInput: {
    type: 'object',
    description: 'Na atualização (PUT) todos os campos são opcionais: só o que for enviado é alterado.',
    required: ['name', 'slug', 'price', 'price_with_discount'],
    properties: {
      enabled: { type: 'boolean', default: false, example: true },
      name: { type: 'string', example: 'Produto 01' },
      slug: { type: 'string', example: 'produto-01' },
      use_in_menu: { type: 'boolean', default: false },
      stock: { type: 'integer', default: 0, example: 10 },
      description: { type: 'string', example: 'Descrição do produto 01' },
      price: { type: 'number', example: 119.9 },
      price_with_discount: { type: 'number', example: 99.9 },
      category_ids: { type: 'array', items: { type: 'integer' }, example: [1, 15, 24, 68] },
      images: { type: 'array', items: ref('ProductImageInput') },
      options: { type: 'array', items: ref('ProductOptionInput') },
    },
  },
};

/* ------------------------------- paths ------------------------------- */

const paths = {
  '/user/token': {
    post: {
      tags: ['Usuários'],
      summary: 'Gera o token JWT',
      requestBody: body(ref('TokenRequest')),
      responses: { 200: R.ok('Token gerado', ref('TokenResponse')), 400: R.badRequest },
    },
  },
  '/user': {
    post: {
      tags: ['Usuários'],
      summary: 'Cadastra um usuário',
      requestBody: body(ref('UserCreate')),
      responses: { 201: R.ok('Usuário criado', ref('User')), 400: R.badRequest },
    },
  },
  '/user/{id}': {
    get: {
      tags: ['Usuários'],
      summary: 'Obtém um usuário pelo ID',
      parameters: [idParam('do usuário')],
      responses: { 200: R.ok('Usuário encontrado', ref('User')), 404: R.notFound },
    },
    put: {
      tags: ['Usuários'],
      summary: 'Atualiza um usuário',
      security: secured,
      parameters: [idParam('do usuário')],
      requestBody: body(ref('UserUpdate')),
      responses: { 204: R.noContent, 400: R.badRequest, 401: R.unauthorized, 404: R.notFound },
    },
    delete: {
      tags: ['Usuários'],
      summary: 'Remove um usuário',
      security: secured,
      parameters: [idParam('do usuário')],
      responses: { 204: R.noContent, 401: R.unauthorized, 404: R.notFound },
    },
  },

  '/category/search': {
    get: {
      tags: ['Categorias'],
      summary: 'Lista categorias (paginada)',
      parameters: [
        ...pagination,
        {
          name: 'fields',
          in: 'query',
          schema: { type: 'string', example: 'name,slug' },
          description: 'Campos a retornar, separados por vírgula (id, name, slug, use_in_menu).',
        },
        {
          name: 'use_in_menu',
          in: 'query',
          schema: { type: 'boolean' },
          description: 'Filtra as categorias que podem (ou não) aparecer no menu.',
        },
      ],
      responses: { 200: R.ok('Lista de categorias', ref('CategoryList')), 400: R.badRequest },
    },
  },
  '/category': {
    post: {
      tags: ['Categorias'],
      summary: 'Cadastra uma categoria',
      security: secured,
      requestBody: body(ref('CategoryInput')),
      responses: { 201: R.ok('Categoria criada', ref('Category')), 400: R.badRequest, 401: R.unauthorized },
    },
  },
  '/category/{id}': {
    get: {
      tags: ['Categorias'],
      summary: 'Obtém uma categoria pelo ID',
      parameters: [idParam('da categoria')],
      responses: { 200: R.ok('Categoria encontrada', ref('Category')), 404: R.notFound },
    },
    put: {
      tags: ['Categorias'],
      summary: 'Atualiza uma categoria',
      security: secured,
      parameters: [idParam('da categoria')],
      requestBody: body(ref('CategoryInput')),
      responses: { 204: R.noContent, 400: R.badRequest, 401: R.unauthorized, 404: R.notFound },
    },
    delete: {
      tags: ['Categorias'],
      summary: 'Remove uma categoria',
      security: secured,
      parameters: [idParam('da categoria')],
      responses: { 204: R.noContent, 401: R.unauthorized, 404: R.notFound },
    },
  },

  '/product/search': {
    get: {
      tags: ['Produtos'],
      summary: 'Lista produtos (paginada, com filtros)',
      parameters: [
        ...pagination,
        {
          name: 'fields',
          in: 'query',
          schema: { type: 'string', example: 'name,images,price' },
          description: 'Campos a retornar, separados por vírgula.',
        },
        {
          name: 'match',
          in: 'query',
          schema: { type: 'string', example: 'Tênis' },
          description: 'Termo que combine com o nome ou a descrição do produto.',
        },
        {
          name: 'category_ids',
          in: 'query',
          schema: { type: 'string', example: '15,24' },
          description: 'IDs de categorias, separados por vírgula.',
        },
        {
          name: 'price-range',
          in: 'query',
          schema: { type: 'string', example: '100-200' },
          description: 'Faixa de preço `min-max` (aplicada ao campo `price`).',
        },
        {
          name: 'option[45]',
          in: 'query',
          schema: { type: 'string', example: 'GG,PP' },
          description:
            'Filtra pelos valores da opção de ID 45 (troque 45 pelo ID da opção). Traz produtos que tenham ' +
            '*algum* dos valores; vários `option[...]` se combinam (E).',
        },
      ],
      responses: { 200: R.ok('Lista de produtos', ref('ProductList')), 400: R.badRequest },
    },
  },
  '/product': {
    post: {
      tags: ['Produtos'],
      summary: 'Cria um produto',
      security: secured,
      requestBody: body(ref('ProductInput')),
      responses: { 201: R.ok('Produto criado', ref('Product')), 400: R.badRequest, 401: R.unauthorized },
    },
  },
  '/product/{id}': {
    get: {
      tags: ['Produtos'],
      summary: 'Obtém um produto pelo ID',
      parameters: [idParam('do produto')],
      responses: { 200: R.ok('Produto encontrado', ref('Product')), 404: R.notFound },
    },
    put: {
      tags: ['Produtos'],
      summary: 'Atualiza um produto',
      security: secured,
      parameters: [idParam('do produto')],
      requestBody: body(ref('ProductInput')),
      responses: { 204: R.noContent, 400: R.badRequest, 401: R.unauthorized, 404: R.notFound },
    },
    delete: {
      tags: ['Produtos'],
      summary: 'Remove um produto',
      security: secured,
      parameters: [idParam('do produto')],
      responses: { 204: R.noContent, 401: R.unauthorized, 404: R.notFound },
    },
  },
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Digital Store API',
    version: '1.0.0',
    description:
      'API REST da Digital Store (Node.js, Express, Sequelize, MySQL, JWT).\n\n' +
      '**Como autenticar:** faça `POST /v1/user/token`, copie o `token` e clique em **Authorize** informando-o. ' +
      'Os endpoints POST, PUT e DELETE (exceto cadastro de usuário e geração do token) exigem ' +
      '`Authorization: Bearer <jwt>`.',
  },
  servers: [{ url: `${config.baseUrl}/v1`, description: 'API' }],
  tags: [{ name: 'Usuários' }, { name: 'Categorias' }, { name: 'Produtos' }],
  paths,
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas,
  },
};

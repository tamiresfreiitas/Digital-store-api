# Digital Store API

API REST de uma loja virtual, com cadastro de usuários, categorias e produtos, autenticação via JWT e documentação em Swagger.

## Tecnologias

- Node.js e Express
- MySQL com Sequelize (migrations)
- JWT para autenticação
- bcrypt para hash de senhas
- Jest e Supertest para testes
- Swagger UI para documentação
- Dotenv e Nodemon

## Requisitos

- Node.js 18 ou superior
- MySQL 5.7+ (ou MariaDB) em execução

## Instalação

```bash
git clone https://github.com/tamiresfreiitas/Digital-store-api.git
cd backend
npm install
cp .env.example .env
```

Edite o `.env` com os dados do seu MySQL e defina um `JWT_SECRET`.

Crie o banco e rode as migrations:

```bash
mysql -u root -p -e "CREATE DATABASE digital_store;"
npm run db:migrate
```

Opcionalmente, popule com dados de exemplo (categorias, produtos e o usuário `admin@mail.com` / `123@123`):

```bash
npm run seed
```

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do servidor | `3000` |
| `BASE_URL` | URL base, usada nos links das imagens | `http://localhost:3000` |
| `DB_HOST` | Host do MySQL | `localhost` |
| `DB_PORT` | Porta do MySQL | `3306` |
| `DB_NAME` | Nome do banco | |
| `DB_USER` | Usuário do banco | |
| `DB_PASSWORD` | Senha do banco | |
| `JWT_SECRET` | Segredo usado para assinar os tokens | |
| `JWT_EXPIRES_IN` | Validade do token | `1h` |
| `MEDIA_DIR` | Pasta onde as imagens são salvas | `media` |

## Executando

```bash
npm run dev     # desenvolvimento (nodemon)
npm start       # produção
```

A API fica em `http://localhost:3000/v1`.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor com nodemon |
| `npm start` | Inicia o servidor |
| `npm run db:migrate` | Aplica as migrations pendentes |
| `npm run db:migrate:undo` | Desfaz a última migration |
| `npm run db:reset` | Desfaz todas as migrations e aplica novamente (apaga os dados) |
| `npm run seed` | Popula o banco com dados de exemplo |
| `npm test` | Roda os testes |

## Documentação da API

Com o servidor rodando, acesse `http://localhost:3000/api-docs`.

Para testar as rotas protegidas:

1. Faça `POST /user/token` com e-mail e senha.
2. Copie o token retornado.
3. Clique em Authorize e cole o token.

A especificação OpenAPI também está disponível em `/api-docs.json`.

## Endpoints

| Método | Rota | Autenticação |
|---|---|---|
| POST | `/v1/user/token` | Não |
| POST | `/v1/user` | Não |
| GET | `/v1/user/:id` | Não |
| PUT | `/v1/user/:id` | Sim |
| DELETE | `/v1/user/:id` | Sim |
| GET | `/v1/category/search` | Não |
| GET | `/v1/category/:id` | Não |
| POST | `/v1/category` | Sim |
| PUT | `/v1/category/:id` | Sim |
| DELETE | `/v1/category/:id` | Sim |
| GET | `/v1/product/search` | Não |
| GET | `/v1/product/:id` | Não |
| POST | `/v1/product` | Sim |
| PUT | `/v1/product/:id` | Sim |
| DELETE | `/v1/product/:id` | Sim |

As rotas protegidas exigem o header `Authorization: Bearer <token>`.

### Exemplos

```bash
# gerar token
curl -X POST http://localhost:3000/v1/user/token \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.com","password":"123@123"}'

# criar categoria
curl -X POST http://localhost:3000/v1/category \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Shoes","slug":"shoes","use_in_menu":true}'

# buscar produtos
curl -g "http://localhost:3000/v1/product/search?match=K-Swiss&price-range=100-300&limit=5"
```

### Filtros da busca de produtos

| Parâmetro | Descrição |
|---|---|
| `limit` | Itens por página (padrão 12, `-1` retorna todos) |
| `page` | Página (padrão 1) |
| `fields` | Campos retornados, separados por vírgula |
| `match` | Termo buscado no nome ou na descrição |
| `category_ids` | IDs de categorias, separados por vírgula |
| `price-range` | Faixa de preço, no formato `100-200` |
| `option[id]` | Valores de uma opção, ex.: `option[45]=GG,PP` |

## Banco de dados

O schema é criado por migrations, que ficam em `migrations/`.

| Tabela | Descrição |
|---|---|
| `users` | Usuários (senha com hash bcrypt) |
| `categories` | Categorias |
| `products` | Produtos |
| `product_images` | Imagens dos produtos |
| `product_options` | Opções dos produtos (tamanho, cor etc.) |
| `product_categories` | Relação entre produtos e categorias |

As imagens são enviadas em base64, salvas em `MEDIA_DIR` e servidas em `/media`.

## Testes

```bash
npm test
```

Por padrão os testes usam SQLite em memória e não precisam de MySQL. O schema é criado pelas próprias migrations.

Para rodar contra um MySQL (use um banco só para testes, pois as tabelas são apagadas):

```bash
# Linux, macOS ou Git Bash
TEST_DB=mysql DB_NAME=digital_store_test npm test

# PowerShell
$env:TEST_DB="mysql"; $env:DB_NAME="digital_store_test"; npm test
```

## Estrutura do projeto

```
backend/
├── migrations/
├── scripts/
│   └── seed.js
├── src/
│   ├── config/
│   ├── controllers/
│   ├── docs/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── tests/
├── .env.example
└── package.json
```

## Observações

- Token ausente ou inválido retorna 401. O enunciado cita 400 em um ponto e 401 nos demais, então foi adotado 401.
- Credenciais inválidas em `POST /v1/user/token` retornam 400.
- `PUT /v1/product/:id` é parcial: apenas os campos enviados são alterados.
- Em `options`, o campo `radius` aceita número ou texto como `"4px"`, e `values` também pode ser enviado como `value`.
- Qualquer usuário autenticado pode alterar ou remover qualquer recurso, pois não há perfis de acesso.

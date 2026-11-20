const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');
const { sequelize } = require('../src/models');

// PNG 1x1 em base64
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// O schema dos testes é criado pelas próprias migrations (assim elas ficam cobertas pelos testes).
const migrationsDir = path.resolve(__dirname, '../migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.js')).sort();

async function resetDb() {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.dropAllTables();
  for (const file of migrationFiles) {
    await require(path.join(migrationsDir, file)).up(queryInterface, Sequelize);
  }
  fs.rmSync(config.mediaDir, { recursive: true, force: true });
}

async function createUserAndToken(email = 'user@mail.com') {
  const body = { firstname: 'User', surname: 'Test', email, password: '123@123', confirmPassword: '123@123' };
  const created = await request(app).post('/v1/user').send(body);
  const res = await request(app).post('/v1/user/token').send({ email, password: '123@123' });
  return { user: created.body, token: res.body.token, auth: { Authorization: `Bearer ${res.body.token}` } };
}

module.exports = { app, request, sequelize, resetDb, createUserAndToken, PNG };

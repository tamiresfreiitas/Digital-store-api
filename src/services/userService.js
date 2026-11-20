const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const HttpError = require('../utils/HttpError');
const { isEmail, requireString, parseId } = require('../utils/validators');

const toPublic = (u) => ({ id: u.id, firstname: u.firstname, surname: u.surname, email: u.email });

function validateProfile(body = {}) {
  const firstname = requireString(body.firstname, 'firstname');
  const surname = requireString(body.surname, 'surname');
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : body.email;
  if (!isEmail(email)) throw HttpError.badRequest('E-mail inválido');
  return { firstname, surname, email };
}

async function getById(rawId) {
  const user = await User.findByPk(parseId(rawId));
  if (!user) throw HttpError.notFound('Usuário não encontrado');
  return toPublic(user);
}

async function create(body = {}) {
  const profile = validateProfile(body);

  if (typeof body.password !== 'string' || body.password === '') {
    throw HttpError.badRequest('O campo "password" é obrigatório');
  }
  if (body.password !== body.confirmPassword) {
    throw HttpError.badRequest('As senhas não conferem');
  }
  if (await User.findOne({ where: { email: profile.email } })) {
    throw HttpError.badRequest('E-mail já cadastrado');
  }

  const password = await bcrypt.hash(body.password, 10);
  const user = await User.create({ ...profile, password });
  return toPublic(user);
}

async function update(rawId, body = {}) {
  const user = await User.findByPk(parseId(rawId));
  if (!user) throw HttpError.notFound('Usuário não encontrado');

  const profile = validateProfile(body);
  const other = await User.findOne({ where: { email: profile.email } });
  if (other && other.id !== user.id) throw HttpError.badRequest('E-mail já cadastrado');

  await user.update(profile);
}

async function remove(rawId) {
  const user = await User.findByPk(parseId(rawId));
  if (!user) throw HttpError.notFound('Usuário não encontrado');
  await user.destroy();
}

async function generateToken(body = {}) {
  const { email, password } = body;
  if (!isEmail(typeof email === 'string' ? email.trim().toLowerCase() : email) || typeof password !== 'string' || !password) {
    throw HttpError.badRequest('E-mail ou senha inválidos');
  }

  const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
  const valid = user && (await bcrypt.compare(password, user.password));
  if (!valid) throw HttpError.badRequest('E-mail ou senha inválidos');

  const token = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
  return { token };
}

module.exports = { getById, create, update, remove, generateToken };

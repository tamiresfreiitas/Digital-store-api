const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const HttpError = require('./HttpError');

const EXTENSIONS = {
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const isRemoteUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);

/** Valida o base64 e devolve { buffer, ext }. Aceita também o prefixo "data:image/png;base64,". */
function decodeImage(type, content) {
  let mime = type;
  let data = content;

  const dataUrl = typeof content === 'string' && content.match(/^data:([\w/+.-]+);base64,(.*)$/s);
  if (dataUrl) {
    mime = mime || dataUrl[1];
    data = dataUrl[2];
  }

  const ext = EXTENSIONS[String(mime).toLowerCase()];
  if (!ext) throw HttpError.badRequest('Tipo de imagem inválido (use png, jpg, gif ou webp)');
  if (typeof data !== 'string' || data.length === 0 || !/^[A-Za-z0-9+/=\s]+$/.test(data)) {
    throw HttpError.badRequest('Conteúdo da imagem deve estar em base64');
  }
  const buffer = Buffer.from(data, 'base64');
  if (!buffer.length) throw HttpError.badRequest('Conteúdo da imagem deve estar em base64');
  return { buffer, ext };
}

/** Salva o arquivo e devolve o caminho relativo (usado no banco e na URL pública). */
async function saveImage(productId, { buffer, ext }) {
  const relative = `product-${productId}/${crypto.randomUUID()}.${ext}`;
  const absolute = path.join(config.mediaDir, relative);
  await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
  await fs.promises.writeFile(absolute, buffer);
  return relative;
}

async function removeImage(relative) {
  await fs.promises.rm(path.join(config.mediaDir, relative), { force: true });
}

async function removeProductFolder(productId) {
  await fs.promises.rm(path.join(config.mediaDir, `product-${productId}`), { recursive: true, force: true });
}

const publicUrl = (relative) => `${config.baseUrl}/media/${relative}`;

module.exports = { decodeImage, saveImage, removeImage, removeProductFolder, publicUrl, isRemoteUrl };

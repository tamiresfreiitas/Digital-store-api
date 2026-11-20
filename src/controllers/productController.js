const service = require('../services/productService');

exports.search = async (req, res) => res.status(200).json(await service.search(req.query));
exports.getById = async (req, res) => res.status(200).json(await service.getById(req.params.id));
exports.create = async (req, res) => res.status(201).json(await service.create(req.body));
exports.update = async (req, res) => {
  await service.update(req.params.id, req.body);
  res.status(204).send();
};
exports.remove = async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
};

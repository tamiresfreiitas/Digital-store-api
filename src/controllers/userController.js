const userService = require('../services/userService');

exports.getById = async (req, res) => res.status(200).json(await userService.getById(req.params.id));
exports.create = async (req, res) => res.status(201).json(await userService.create(req.body));
exports.update = async (req, res) => {
  await userService.update(req.params.id, req.body);
  res.status(204).send();
};
exports.remove = async (req, res) => {
  await userService.remove(req.params.id);
  res.status(204).send();
};
exports.token = async (req, res) => res.status(200).json(await userService.generateToken(req.body));

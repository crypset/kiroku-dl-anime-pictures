const path = require('path');

module.exports = {
  development: {
    username: null,
    password: null,
    database: 'pot',
    host: null,
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../../../pot.sqlite'),
    logging: false
  },
  test: {
    username: null,
    password: null,
    database: 'pot_test',
    host: null,
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../../../pot_test.sqlite'),
    logging: false
  },
  production: {
    username: null,
    password: null,
    database: 'pot',
    host: null,
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../../../pot.sqlite'),
    logging: false
  }
}; 
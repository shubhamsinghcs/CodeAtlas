// javascript-basic
const _ = require('lodash');

function add(a, b) {
  return a + b;
}

module.exports = {
  add,
  subtract: (a, b) => a - b
};

/**
 * Helpers for various tasks
 */
const crypto = require('crypto');
const config = require('../config');

const helpers = {};

/**
 * Returns SHA-256 hashed password
 * @param {string} password 
 */
helpers.hash = password => {
  if(!typeof(password) == 'string' && str.length > 0) return false;
  const hash = crypto.createHmac('sha256', config.hashingSecret).update(password).digest('hex');
  return hash;
}

/**
 * Parse the JSON string to an object in all cases, without throwing
 * @param {string} str 
 */
helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch(e) {
    return {}
  }
}

module.exports = helpers;

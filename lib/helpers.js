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

helpers.createRandomString = (strLength) => {
  strLength = typeof (strLength) == 'number' && strLength > 0 ? strLength : false;
  if(strLength) {
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    var str = '';
    for(var i = 1; i <= strLength; i++) {
      var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

      str += randomCharacter;
    }

    return str;
  }
}

module.exports = helpers;

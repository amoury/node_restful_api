const _data = require("./data");
const helpers = require("./helpers");
const config = require("../config");

// Define the handlers
const handlers = {};

handlers.ping = (data, callback) => {
  callback(200);
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

handlers.users = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (!acceptableMethods.indexOf(data.method) <= -1) return callback(405);
  handlers._users[data.method](data, callback);
};

// Container for the user submethods
handlers._users = {};

// Required data: FirstName, lastName, phone, password, tosAgreement
handlers._users.post = (data, callback) => {
  // check all required fields are filled out
  let { firstName, lastName, phone, password, tosAgreement } = data.payload;

  firstName =
    typeof firstName == "string" && firstName.trim().length > 0
      ? firstName.trim()
      : false;
  lastName =
    typeof lastName == "string" && lastName.trim().length > 0
      ? lastName.trim()
      : false;
  phone =
    typeof phone == "string" && phone.trim().length == 10
      ? phone.trim()
      : false;
  password =
    typeof password == "string" && password.trim().length > 0
      ? password.trim()
      : false;
  tosAgreement =
    typeof tosAgreement == "boolean" && tosAgreement == true ? true : false;

  if (!firstName && !lastName && !phone && !password && !tosAgreement)
    return callback(400, { Error: "Missing required Fields" });
  // Make sure the user is unique
  _data.read("users", phone, (err, data) => {
    if (!err)
      return callback(400, {
        Error: " A user with that phone number already exists"
      });
    // Hash the password
    const hashedPassword = helpers.hash(password);

    if (!hashedPassword)
      return callback(500, { Error: "Password couldnt be hashed" });

    // Create the user object
    const userObject = {
      firstName,
      lastName,
      phone,
      hashedPassword,
      tosAgreement: true
    };

    // Store the user to the disk
    _data.create("users", phone, userObject, err => {
      if (!err) return callback(200);
      console.log(err);
      callback(500, { Error: "Could not create the new user" });
    });
  });
};

// Only let authenticated user access their object.
handlers._users.get = (data, callback) => {
  // 1. check the phone number is valid
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (!phone) return callback(400, { Error: "Missing required fields" });

  const token =
    typeof data.headers.token == "string" ? data.headers.token : false;

  // Verify that the given token is valid for the phone number
  handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
    if (tokenIsValid) {
      _data.read("users", phone, (err, data) => {
        if (err && !data) return callback(404);
        // Remove the hashed password from the user object before returning it to the request
        delete data.hashedPassword;
        callback(200, data);
      });
    } else {
      callback(403, {
        Error: "Missing required token in header, or token is missing"
      });
    }
  });
};

// Users - Put
// Required data : phone
// Optional data: Atleast one field must be specified
// @TODO - Only let an authenticated user update their own object.
handlers._users.put = (data, callback) => {
  let { firstName, lastName, phone, password } = data.payload;
  // Check for the required field
  phone =
    typeof phone == "string" && phone.trim().length == 10
      ? phone.trim()
      : false;

  // Check for optional fields
  firstName =
    typeof firstName == "string" && firstName.trim().length > 0
      ? firstName.trim()
      : false;
  lastName =
    typeof lastName == "string" && lastName.trim().length > 0
      ? lastName.trim()
      : false;
  password =
    typeof password == "string" && password.trim().length > 0
      ? password.trim()
      : false;

  // Error if the phone is invalid
  if (!phone) return callback(400, { Error: "Missing required Fields" });
  if (!firstName && !lastName && !password)
    return callback(400, { Error: "Missing fields to update" });

  handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
    if (tokenIsValid) {
      _data.read("users", phone, (err, userData) => {
        if (err && !userData)
          return callback(400, { Error: "The specified user does not exist" });
        delete data.payload.phone;
        for (key in data.payload) {
          if (key === "password")
            userData.hashedPassword = helpers.hash(data.payload[key]);
          userData[key] = data.payload[key];
          delete userData.password;
        }

        _data.update("users", phone, userData, (err, data) => {
          if (err && !userData)
            return callback(400, { Error: "Unable to Update" });
          callback(200, { Message: "File successfully updated" });
        });
      });
    } else {
      callback(403, {
        Error: "Missing required token in header, or token is missing"
      });
    }
  });
};

// @TODO - Only let an authenticated user delete their object
handlers._users.delete = (data, callback) => {
  // Check their phone is valid
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (!phone) return callback(400, { Error: "Missing required fields" });

  handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
    if (tokenIsValid) {
      _data.read("users", phone, (err, data) => {
        if (err && !data) return callback(400, { Error: "User not found" });

        _data.delete("users", phone, (err, data) => {
          if (err && !data) return callback(500, { Error: "Internal issue" });
          callback(200);
        });
      });
    } else {
      callback(403, {
        Error: "Missing required token in header, or token is missing"
      });
    }
  });
};

handlers.tokens = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (!acceptableMethods.indexOf(data.method) <= -1) return callback(405);
  handlers._tokens[data.method](data, callback);
};

handlers._tokens = {};

// Tokens - post
handlers._tokens.post = (data, callback) => {
  let { phone, password } = data.payload;
  phone =
    typeof phone == "string" && phone.trim().length == 10
      ? phone.trim()
      : false;
  password =
    typeof password == "string" && password.trim().length > 0
      ? password.trim()
      : false;

  if (phone && password) {
    // Lookup the user who matches that phone number
    _data.read("users", phone, (err, userData) => {
      if (!err && userData) {
        // Hash the sent password, and compare it to the password stored in the user object
        let hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // if valid, create a new token with a random name. Set expirati0n 1 hour in future
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone: phone,
            id: tokenId,
            expires: expires
          };

          // Store the token
          _data.create("tokens", tokenId, tokenObject, err => {
            console.log("From DATA.CREATE");
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: "Cannot create token" });
            }
          });
        } else {
          callback(400, {
            Error: "Password did not match the specified user's password"
          });
        }
      } else {
        callback(400, { Error: "Could not find the specified user" });
      }
    });
  } else {
  }
};

// Tokens - get
handlers._tokens.get = (data, callback) => {
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;
  if (!id) return callback(400, { Error: "Missing required fields" });

  _data.read("tokens", id, (err, data) => {
    if (err && !data) return callback(404);
    callback(200, data);
  });
};

// Tokens - put
// Required data : id, extend
//  Optional data: none
handlers._tokens.put = (data, callback) => {
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;
  const extend =
    typeof data.payload.extend == "boolean" && data.payload.extend == true
      ? true
      : false;

  if (id && extend) {
    _data.read("tokens", id, function(err, tokenData) {
      if (!err && tokenData) {
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          _data.update("tokens", id, tokenData, function(err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, {
                Error: "Could not update the token's expiration"
              });
            }
          });
        } else {
          callback(400, {
            Error: "The Token has already expired, and cannot be extended"
          });
        }
      } else {
        callback(400, { Error: "Specified token does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields or fields are invalid" });
  }
};

// Tokens - delete
handlers._tokens.delete = (data, callback) => {
  // Check that the id is valid
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    _data.read("tokens", id, (err, data) => {
      if (err && !data) return callback(400, { Error: "Token not found" });

      _data.delete("tokens", id, (err, data) => {
        if (err && !data)
          return callback(500, {
            Error: "Could not delete the specified token"
          });
        callback(200);
      });
    });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback) {
  _data.read("tokens", id, function(err, tokenData) {
    if (!err && tokenData) {
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Checks

handlers.checks = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (!acceptableMethods.indexOf(data.method) <= -1) return callback(405);
  handlers._checks[data.method](data, callback);
};

handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none

handlers._checks.post = function(data, callback) {
  // Validate all the inputs
  let { protocol, url, method, successCodes, timeoutSeconds } = data.payload;
  protocol =
    typeof protocol == "string" && ["https", "http"].indexOf(protocol) > -1
      ? protocol
      : false;
  method =
    typeof method == "string" &&
    ["post", "get", "put", "delete"].indexOf(method) > -1
      ? method
      : false;
  url = typeof url == "string" && url.trim().length > 0 ? url.trim() : false;
  successCodes =
    typeof successCodes == "object" &&
    successCodes instanceof Array &&
    successCodes.length > 0
      ? successCodes
      : false;
  timeoutSeconds =
    typeof timeoutSeconds == "number" &&
    timeoutSeconds % 1 === 0 &&
    timeoutSeconds >= 1 &&
    timeoutSeconds <= 5
      ? timeoutSeconds
      : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from headers
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    // Look up the user by reading the token
    _data.read("tokens", token, function(err, tokenData) {
      if (!err && tokenData) {
        var userPhone = tokenData.phone;

        // Lookup the user data
        _data.read("users", userPhone, function(err, userData) {
          if (!err && userData) {
            const userChecks =
              typeof userData.checks == "object" &&
              userData.checks instanceof Array
                ? userData.checks
                : [];
            // Verify that the user has less than the number of max-checks-per-user
            if (userChecks.length < config.maxChecks) {
              // Create a random id for the check
              var checkId = helpers.createRandomString(20);

              // Create the check object and include the user's phone
              const checkObject = {
                id: checkId,
                userPhone: userPhone,
                protocol: protocol,
                url: url,
                method: method,
                successCodes: successCodes,
                timeoutSeconds: timeoutSeconds
              };

              // Save the object
              _data.create("checks", checkId, checkObject, function(err) {
                if (!err) {
                  // Add the check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update("users", userPhone, userData, function(err) {
                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        Error: "Could not update the user with the new check"
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Couldnt create the check" });
                }
              });
            } else {
              callback(400, {
                Error: "The user already has the maximum number of checks"
              });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { Error: "Missing required inputs, or inputs are invalid" });
  }
};



handlers._checks.get = function(data, callback) {
  // 1. check the id is valid
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;


  if(id) {
    _data.read('checks', id, function(err, checkData) {
      if(!err && checkData) {

        const token = typeof data.headers.token == "string" ? data.headers.token : false;
      
        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
          if (tokenIsValid) {
            callback(200, checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    })
  } else {
    callback(400, {'Error': 'Missing required fields'});
  }

};

// Required Data: id
// Optional Data: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.put = function(data, callback) {
  let { id, protocol, method, url, successCodes, timeoutSeconds } = data.payload;
  id = typeof id == "string" && id.trim().length == 20 ? id.trim() : false;
  protocol =
    typeof protocol == "string" && ["https", "http"].indexOf(protocol) > -1
      ? protocol
      : false;
  method =
    typeof method == "string" &&
    ["post", "get", "put", "delete"].indexOf(method) > -1
      ? method
      : false;
  url = typeof url == "string" && url.trim().length > 0 ? url.trim() : false;
  successCodes =
    typeof successCodes == "object" &&
    successCodes instanceof Array &&
    successCodes.length > 0
      ? successCodes
      : false;
  timeoutSeconds = typeof timeoutSeconds == "number" && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;

  if(id) {
    // Check to make sure one or more optional fields has been sent

    if(protocol || url || method || successCodes || timeoutSeconds) {
      _data.read('checks', id, function(err, checkData) {
        if(!err && checkData) {
          // Get the token from Headers
          const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
          handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
            if(tokenIsValid) {
              // Update the check where necessary
              if(protocol) {
                checkData.protocol = protocol;
              }
              if(url) {
                checkData.url = url;
              }
              if(method) {
                checkData.method = method;
              }
              if(successCodes) {
                checkData.successCodes = successCodes;
              } 
              if(timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // Store the new updates
              _data.update('checks', id, checkData, function(err) {
                if(!err) {
                  callback(200);
                } else {
                  callback(500, {'Error': 'Could not update the checks'});
                }
              })
            } else {
              callback(403);
            }
          })
        } else {
          callback(400, {"Error" : "Check ID did not exist"})
        }
      })
    } else {
      callback(400, {'Error' : 'Missing Fields to update'})
    }

  } else {
    callback(400, {'Error' : 'Missing Required Fields'})
  }
}

module.exports = handlers;

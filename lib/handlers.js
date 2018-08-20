const _data = require('./data');
const helpers = require('./helpers');


// Define the handlers
const handlers = {};

handlers.ping = (data, callback) => {
  callback(200);
}

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

handlers.users = (data, callback) => {

  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(!acceptableMethods.indexOf(data.method) <= -1) return callback(405);
  handlers._users[data.method](data, callback);
}

// Container for the user submethods
handlers._users = {};

// Required data: FirstName, lastName, phone, password, tosAgreement
handlers._users.post = (data, callback ) => {
  
  // check all required fields are filled out
  let { firstName, lastName, phone, password, tosAgreement } = data.payload;

  firstName = typeof(firstName) == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
  lastName = typeof(lastName) == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  password = typeof(password) == 'string' && password.trim().length > 0 ? password.trim() : false;
  tosAgreement = typeof(tosAgreement) == 'boolean' && tosAgreement == true ? true : false;

  if(!firstName && !lastName && !phone && !password && !tosAgreement) return callback(400, {'Error' : 'Missing required Fields'});
  // Make sure the user is unique
  _data.read('users', phone, (err, data) => {
    if(!err) return callback(400, {'Error': ' A user with that phone number already exists'});
    // Hash the password 
    const hashedPassword = helpers.hash(password);

    if(!hashedPassword) return callback(500, {'Error': 'Password couldnt be hashed'});

    // Create the user object
    const userObject = {
      firstName,
      lastName,
      phone,
      hashedPassword,
      tosAgreement: true
    }

    // Store the user to the disk
    _data.create('users', phone, userObject, err => {
      if (!err) return callback(200);
      console.log(err);
      callback(500, {'Error': 'Could not create the new user'});
    })
  })

};


// Only let authenticated user access their object.
handlers._users.get = (data, callback ) => {
  // 1. check the phone number is valid
  const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(!phone) return callback(400, {'Error' : 'Missing required fields'});
  
  _data.read('users', phone, (err, data) => {
    if(err && !data) return callback(404);
    // Remove the hashed password from the user object before returning it to the request
    delete data.hashedPassword;
    callback(200, data);
  })
  
};

// Users - Put
// Required data : phone
// Optional data: Atleast one field must be specified
// @TODO - Only let an authenticated user update their own object. 
handlers._users.put = (data, callback ) => {
  let { firstName, lastName, phone, password } = data.payload;
  // Check for the required field
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;

  // Check for optional fields
  firstName = typeof firstName == "string" && firstName.trim().length > 0 ? firstName.trim() : false;
  lastName = typeof lastName == "string" && lastName.trim().length > 0 ? lastName.trim() : false;
  password = typeof password == "string" && password.trim().length > 0 ? password.trim() : false;


  // Error if the phone is invalid
  if(!phone) return callback(400, {'Error': 'Missing required Fields'});
  if(!firstName && !lastName && !password) return callback(400, {'Error': 'Missing fields to update'});
  _data.read('users', phone, (err, userData) => {
    if(err && !userData) return callback(400, {'Error': 'The specified user does not exist'});
    delete data.payload.phone;
    for(key in data.payload) {
      if (key === 'password') userData.hashedPassword = helpers.hash(data.payload[key]);
      userData[key] = data.payload[key];
      delete userData.password;
    }
    
    _data.update('users', phone, userData, (err, data) => {
      if(err && !userData) return callback(400, { "Error" : "Unable to Update" })
      callback(200, { "Message" : "File successfully updated"})
    });
  })
};

// @TODO - Only let an authenticated user delete their object
handlers._users.delete = (data, callback ) => {
  // Check their phone is valid
  const phone = typeof data.queryStringObject.phone == "string" && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if (!phone) return callback(400, { Error: "Missing required fields" });

  _data.read("users", phone, (err, data) => {
    if (err && !data) return callback(400, {'Error': 'User not found'});
    
    _data.delete("users", phone, (err, data) => {
      if(err && !data) return callback(500, {'Error': "Internal issue"});
      callback(200);
    })
  });
};

module.exports = handlers;

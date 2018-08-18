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

handlers._users.get = (data, callback ) => {

};

handlers._users.put = (data, callback ) => {

};

handlers._users.delete = (data, callback ) => {

};

module.exports = handlers;

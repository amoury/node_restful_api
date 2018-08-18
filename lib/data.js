/**
 * Library for storing and editing data
 */

var fs = require("fs");
var path = require("path");
const helpers = require('./helpers');

const lib = {};

//  Base directory of the data folder
lib.baseDir = path.join(__dirname, "/../.data");

lib.create = (dir, file, data, callback) => {
  // Open the file for writing
   fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {

    if(err && !fileDescriptor) return callback('could not create new file, it may already exist');

    // Convert data to string
    let stringData = JSON.stringify(data);

      // Write to file and close it
      fs.writeFile(fileDescriptor, stringData, () => {
        if(err) return callback('Error writing to new file');
        fs.close(fileDescriptor, (err) => {
          if(err) return callback('Error closing new file');
          callback(false);
        })
      });

   })
};


// Read data from a file

lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.baseDir}/${dir}/${file}.json`, 'utf-8', (err, data) => {
    if(err && !data) return callback(err,data);
    const parsedData = helpers.parseJsonToObject(data);
    callback(false, parsedData);
  })
}

// const read = (dir, file, callback) => {
//   fs.readFile(`${lib.baseDir}/${dir}/${file}.json`, 'utf-8', (err, data) => {
//     callback(err, data);
//   })
// }

// lib.readAsync = (dir, file) => {
//   return new Promise( (resolve, reject) => {
//     read(dir, file, (err, data) => {
//       if(err) return reject(err);
//       resolve(data);
//     })
//   })
// };

// Update data inside the file
lib.update = (dir, file, data, callback) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'r+', ( err, fileDescriptor ) => {
    if(err && !fileDescriptor) return callback('Could not open the file for updating, it may not exist yet');

    let stringData = JSON.stringify(data);
    fs.truncate(fileDescriptor, err => {
      if (err) return callback('Error truncating file');
      fs.writeFile(fileDescriptor, stringData, err => {
        if (err) return callback('Error writing to exisiting file');
        fs.close(fileDescriptor, err => {
          if (err) return callback('Error closing the file');
          callback(false);
        })
      })
    })
  })
};

// Deleting the file
lib.delete = (dir, file, callback) => {
  // Unlink the file
  fs.unlink(`${lib.baseDir}/${dir}/${file}.json`, err => {
    if (err) return callback('Error deleting the file');
    callback(false);
  })
}

module.exports = lib;

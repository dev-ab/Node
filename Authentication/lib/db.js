var mongoose = require('mongoose');
var Schema = mongoose.Schema;
module.exports.mongoose = mongoose;
module.exports.Schema = Schema;
// Connect to cloud database
var username = "stock"
var password = "stock";
var address = '@ds053798.mongolab.com:53798/stock';
connect();
// Connect to mongo
function connect() {
    var url = 'mongodb://' + username + ':' + password + address;
    mongoose.connect(url);
}
function disconnect() {
    mongoose.disconnect()
}
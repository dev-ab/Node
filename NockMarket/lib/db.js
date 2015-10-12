var Db = require('mongodb').Db
        , Connection = require('mongodb').Connection
        , Server = require('mongodb').Server;
var envHost = process.env['MONGO_NODE_DRIVER_HOST']
        , envPort = process.env['MONGO_NODE_DRIVER_PORT']
        , host = $OPENSHIFT_MONGODB_DB_HOST != null ? $OPENSHIFT_MONGODB_DB_HOST : envHost != null ? envHost : '127.0.0.1'
        , port = $OPENSHIFT_MONGODB_DB_PORT != null ? $OPENSHIFT_MONGODB_DB_PORT : envPort != null ? envPort : 27017;//Connection.DEFAULT_PORT;
var db = new Db('nockmarket', new Server(host, port, {}), {native_parser: false});

module.exports = {
    find: function (name, query, limit, callback) {
        db.collection(name).find(query)
                .sort({_id: -1})
                .limit(limit)
                .toArray(callback);
    },
    findOne: function (name, query, callback) {
        db.collection(name).findOne(query, callback);
    },
    insert: function (name, items, callback) {
        db.collection(name).insert(items, callback);
    },
    insertOne: function (name, item, callback) {
        module.exports.insert(name, item, function (err, items) {
            callback(err, items.ops[0]);
        });
    },
    push: function (name, id, updateQuery, callback) {
        db.collection(name).update({_id: id}, {$push: updateQuery}, {safe: true}, callback);
    },
    updateById: function (name, id, updateQuery, callback) {
        db.collection(name).update({_id: id}, {$set: updateQuery}, {safe: true}, callback);
    },
    open: function (callback) {
        db.open(callback);
    }
}
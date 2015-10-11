'use strict';
var cookie = require('cookie')
        , crypto = require('crypto')
        , db = require('./db')
        , exchange = require('./exchange')
        , session = require('express-session')
        , http = require('http')
        , MemoryStore = session.MemoryStore
        , ObjectID = require('mongodb').ObjectID
        , priceFloor = 35
        , priceRange = 10
        , volFloor = 80
        , volRange = 40;

var sessionStore = new MemoryStore();
var io;
var online = [];

module.exports = {
    createSocket: function (server) {
        io = require('socket.io')(server);
        io.use(function (socket, next) {
            var handshakeData = socket.handshake;
            if (handshakeData.headers.cookie) {
                handshakeData.cookie = cookie.parse(decodeURIComponent(handshakeData.headers.cookie));
                handshakeData.sessionID = handshakeData.cookie['connect.sid'];
                var new_id = '';
                for (var prop in sessionStore.sessions) {
                    if (handshakeData.sessionID.indexOf(prop) > -1)
                        new_id = prop;
                }
                sessionStore.get(new_id, function (err, session) {
                    if (err || !session) {
                        console.log('no session');
                        next(new Error('not authorized'));
                    } else {
                        handshakeData.session = session;
                        //console.log('session data', session);
                        next();
                    }
                });
            } else {
                next(new Error('not authorized'));
            }
        });

        io.sockets.on('connection', function (socket) {
            console.log('connected');
            socket.on('joined', function (data) {
                online.push(socket.handshake.session.username);
                var message = socket.handshake.session.username + ': ' + data.message + '\n';
                var message = 'Admin: ' + socket.handshake.session.username + ' has joined\n';
                socket.emit('chat', {message: message, users: online});
                socket.broadcast.emit('chat', {message: message, username: socket.handshake.session.username});
            });
            socket.on('clientchat', function (data) {
                var message = socket.handshake.session.username + ': ' + data.message + '\n';
                socket.emit('chat', {message: message});
                socket.broadcast.emit('chat', {message: message});
            });
            socket.on('updateAccount', function (data) {
                module.exports.updateEmail(socket.handshake.session._id, data.email, function (err, numUpdates) {
                    socket.emit('updateSuccess', {});
                });
            });
            socket.on('disconnect', function (data) {
                var username = socket.handshake.session.username;
                var index = online.indexOf(username);
                online.splice(index, 1);
                socket.broadcast.emit('dis', {username: username});
            });
        });
    },
    getSessionStore: function () {
        return sessionStore;
    },
    addStock: function (uid, stock, callback) {
        function doCallback() {
            counter++;
            if (counter == 2) {
                callback(null, price);
            }
        }
        var counter = 0;
        var price;
        module.exports.getStockPrices([stock], function (err, retrieved) {
            price = retrieved[0];
            doCallback();
        });
        db.push('users', new ObjectID(uid), {portfolio: stock}, doCallback);
    },
    authenticate: function (username, password, callback) {
        db.findOne('users', {username: username}, function (err, user) {
            if (user && (user.password === encryptPassword(password)))
                callback(err, user._id);
            else
                callback(err, null);
        });
    },
    getStockPrices: function (stocks, callback) {
        var stockList = '';
        stocks.forEach(function (stock) {
            stockList += stock + ',';
        });
        var options = {
            host: 'download.finance.yahoo.com',
            port: 80,
            path: '/d/quotes.csv?s=' + stockList + '&f=sl1c1d1&e=.csv'
        };
        http.get(options, function (res) {
            var data = '';
            res.on('data', function (chunk) {
                data += chunk.toString();
            }).on('error', function (err) {
                console.err('Error retrieving Yahoo stock prices');
                throw err;
            }).on('end', function () {
                var tokens = data.split('\n');
                var prices = [];
                tokens.forEach(function (line) {
                    var price = line.split(",")[1];
                    if (price)
                        prices.push(price);
                });
                callback(null, prices);
            });
        });
    },
    sendTrades: function (trades) {
        io.sockets.emit('trade', JSON.stringify(trades));
    },
    updateEmail: function (id, email, callback) {
        db.updateById('users', new ObjectID(id), {email: email}, callback);
    },
    createUser: function (username, email, password, callback) {
        var user = {username: username, email: email, password: encryptPassword(password)};
        db.insertOne('users', user, callback);
    },
    getUser: function (username, callback) {
        db.findOne('users', {username: username}, callback);
    },
    getUserById: function (id, callback) {
        db.findOne('users', {_id: new ObjectID(id)}, callback);
    },
    ensureAuthenticated: function (req, res, next) {
        if (req.session._id) {
            return next();
        }
        res.redirect('/');
    },
    generateRandomOrder: function (exchangeData) {
        var order = {};
        if (Math.random() > 0.5)
            order.type = exchange.BUY
        else
            order.type = exchange.SELL
        var buyExists = exchangeData.buys && exchangeData.buys.prices.peek();
        var sellExists = exchangeData.sells && exchangeData.sells.prices.peek();
        var ran = Math.random();
        if (!buyExists && !sellExists)
            order.price = Math.floor(ran * priceRange) + priceFloor;
        else if (buyExists && sellExists) {
            if (Math.random() > 0.5)
                order.price = exchangeData.buys.prices.peek();
            else
                order.price = exchangeData.sells.prices.peek();
        } else if (buyExists) {
            order.price = exchangeData.buys.prices.peek();
        } else {
            order.price = exchangeData.sells.prices.peek();
        }
        var shift = Math.floor(Math.random() * priceRange / 2);
        if (Math.random() > 0.5)
            order.price += shift;
        else
            order.price -= shift;
        order.volume = Math.floor(Math.random() * volRange) + volFloor;
        return order;
    }
}

function encryptPassword(plainText) {
    return crypto.createHash('md5').update(plainText).digest('hex');
}

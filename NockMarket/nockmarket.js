'use strict';
var exchangeData = {}
, exch = require('./lib/exchange')
        , nocklib = require('./lib/nocklib')
        , express = require('express')
        , connect = require('connect')
        , http = require('http')
        , db = require('./lib/db')
        , nockroutes = require('./routes/nockroutes.js')
        , timeFloor = 500
        , timeRange = 1000;
function submitRandomOrder() {
    // order
    var ord = nocklib.generateRandomOrder(exchangeData);
    //console.log('order', ord);
    if (ord.type == exch.BUY)
        exchangeData = exch.buy(ord.price, ord.volume, exchangeData);
    else
        exchangeData = exch.sell(ord.price, ord.volume, exchangeData);

    db.insertOne('transactions', ord, function (err, order) {
        if (exchangeData.trades && exchangeData.trades.length > 0) {
            var trades = exchangeData.trades.map(function (trade) {
                trade.init = (ord.type == exch.BUY) ? 'b' : 's';
                return trade;
            });
            db.insert('transactions', trades, function (err, trades) {
                pauseThenTrade();
            });
        } else
            pauseThenTrade();
    });
    function pauseThenTrade() {
        var pause = Math.floor(Math.random() * timeRange) + timeFloor;
        setTimeout(submitRandomOrder, pause);
        //console.log(exch.getDisplay(exchangeData));
    }
}
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var cookie = require('cookie')
        , MemoryStore = session.MemoryStore
        , sessionStore = new MemoryStore();

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use(session({secret: 'secretpasswordforsessions', resave: false, saveUninitialized: false, store: sessionStore}));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.set('view options', {
    layout: false
});


app.get('/', nockroutes.getIndex);
app.get('/api/user/:username', nockroutes.getUser);
app.post('/signup', nockroutes.signup);
app.post('/login', nockroutes.login);
app.post('/add-stock', nockroutes.addStock);
app.get('/portfolio', nocklib.ensureAuthenticated, nockroutes.portfolio);
/*app.get('/', function (req, res) {
 res.render('chart');
 });*/

app.get('/api/trades', function (req, res) {
    db.find('transactions', {init: {$exists: true}}, 100, function (err, trades) {
        if (err) {
            console.error(err);
            return;
        }
        var json = [];
        var lastTime = 0;
        // Highstock expects an array of arrays. Each
        // subarray of form [time, price]
        trades.reverse().forEach(function (trade) {
            var date = new Date(parseInt(trade._id.toString().substring(0, 8), 16) * 1000);
            var dataPoint = [date.getTime(), trade.price];
            if (date - lastTime > 1000)
                json.push(dataPoint);
            lastTime = date;
        });
        res.json(json);
    });
});

var server = http.createServer(app);
var io = require('socket.io')(server);

db.open(function () {
    //nocklib.createSocket(io);
    io.use(function (socket, next) {
        //console.log(socket.handshake);
        var handshakeData = socket.handshake;
        
        console.log(handshakeData);
        if (handshakeData.headers.cookie) {
            handshakeData.cookie = cookie.parse(decodeURIComponent(handshakeData.headers.cookie));
            handshakeData.sessionID = handshakeData.cookie['connect.sid'];
            console.log(handshakeData.cookie);
            console.log(handshakeData.sessionID);
            console.log(sessionStore.sessions);
            sessionStore.get(handshakeData.sessionID, function (err, session) {
                if (err || !session) {
                    console.log('no session');
                    //next(new Error('not authorized'));
                } else {
                    handshakeData.session = session;
                    console.log('session data', session);
                    //next();
                }
            });
        } else {
            //next(new Error('not authorized'));
        }
        next();
    });
    submitRandomOrder();
    server.listen(3000);

    io.on('connection', function (socket) {
        socket.emit('news', {hello: 'world'});
        socket.on('my other event', function (data) {
            console.log(data);
        });
    });
});



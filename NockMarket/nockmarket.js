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
var stocks = ['NOCK1', 'NOCK2', 'NOCK3', 'NOCK4', 'NOCK5'];
var allData = [];
stocks.forEach(function (stock) {
    allData.push({});
});
function submitRandomOrder(index) {
    var exchangeData = allData[index];
    // order
    var ord = nocklib.generateRandomOrder(exchangeData);
    ord.stock = stocks[index];
    //console.log('order', ord);
    if (ord.type == exch.BUY)
        allData[index] = exch.buy(ord.price, ord.volume, exchangeData);
    else
        allData[index] = exch.sell(ord.price, ord.volume, exchangeData);

    db.insertOne('transactions', ord, function (err, order) {
        if (exchangeData.trades && exchangeData.trades.length > 0) {
            var trades = exchangeData.trades.map(function (trade) {
                trade.init = (ord.type == exch.BUY) ? 'b' : 's';
                trade.stock = stocks[index];
                return trade;
            });
            //nocklib.sendTrades(trades);
            console.log(trades);
            nocklib.sendExchangeData(stocks[index], exchangeData);
            db.insert('transactions', trades, function (err, trades) {
                pauseThenTrade();
            });
        } else {
            pauseThenTrade();
        }
    });
    function pauseThenTrade() {
        var pause = Math.floor(Math.random() * timeRange) + timeFloor;
        setTimeout(submitRandomOrder.bind(this, index), pause);
        //console.log(exch.getDisplay(exchangeData));
    }
}
var app = express();
var server = http.createServer(app);
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var cookie = require('cookie');
var errorHandler = require('errorhandler');

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(session({secret: 'secretpasswordforsessions', resave: false, saveUninitialized: false, store: nocklib.getSessionStore()}));
app.use(express.static(__dirname + '/public'));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('view options', {layout: false});

if ('development' == app.get('env')) {
    app.use(errorHandler({dumpExceptions: true, showStack: true}));
}
if ('production' == app.get('env')) {
    app.use(errorHandler());
}



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



db.open(function () {
    nocklib.createSocket(server);
    var port = process.env.PORT || 3000;
    server.listen(port);
    for (var i = 0; i < stocks.length; i++) {
        submitRandomOrder(i);
    }


});


app.use(function (req, res) {
    res.render('404');
});
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
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
var session = require('express-session')
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use(session({secret: 'secretpasswordforsessions', resave: false, saveUninitialized: false}));

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


db.open(function () {
    submitRandomOrder();
    app.listen(3000);
});
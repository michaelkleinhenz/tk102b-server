
var config = require(process.env.CONFIGFILE || "./config.json");

var net = require('net');
var Datastore = require('nedb');

var db = new Datastore({ filename: config.databasePath, autoload: true });

var server = net.createServer(function(socket) {

    console.log(new Date() + "Client connected: " + socket.remoteAddress);

    socket.on('data', function (data) {
        /*
            Use:
            var re = /\(([0-9]{12})BR00([0-9]{2})([0-9]{2})([0-9]{2})([AV])([0-9]{2})([0-9]{2}\.[0-9]{4})([NS])([0-9]{3})([0-9]{2}\.[0-9]{4})([EW])([0-9]{3}\.[0-9])([0-9]{2})([0-9]{2})([0-9]{5}\.[0-9]{2}\,[0-9]{8}L[0-9]{8}).*\)/;
            for this format:
            (... 45000.00,00000000L00000000)
        */
        var re = /\(([0-9]{12})BR00([0-9]{2})([0-9]{2})([0-9]{2})([AV])([0-9]{2})([0-9]{2}\.[0-9]{4})([NS])([0-9]{3})([0-9]{2}\.[0-9]{4})([EW])([0-9]{3}\.[0-9])([0-9]{2})([0-9]{2})([0-9]{3}\.[0-9]{12}L[0-9]{8}).*\)/;
        var m;
        if ((m = re.exec(data)) !== null) {
            if (m.index === re.lastIndex) {
                re.lastIndex++;
            }
            var doc = {
                type: "trackerinfo",
                timestamp: new Date(),
                trackerId: m[1],
                trackerDate: new Date("20" + m[2] + "." + m[3] + "." + m[4] + " " + m[13] + ":" + m[14]),
                trackingState: m[5],
                latitudeDegree: parseInt(m[6]),
                latitudePoint: parseFloat(m[7]),
                latitudeFlag: m[8],
                longitudeDegree: parseInt(m[9]),
                longitudePoint: parseFloat(m[10]),
                longitudeFlag: m[11],
                speed: parseFloat(m[10]),
                origData: m[0],
                unknown: m[15]
            };
            console.log(doc.timestamp + " - " + doc.origData);
            db.insert(doc, function (err, newDoc) {
                if (err)
                    console.log("Database Error: " + err.message);
            });
        }
   });

    socket.on('close', function () {
        console.log(new Date() + " - Client disconnected: " + socket.remoteAddress);
    });

    socket.on('error', function (err) {
        console.log(new Date() + " - Error: " + socket.remoteAddress + " - " + err.message);
    });

});

server.listen(config.trackerPort, '0.0.0.0');

var express = require('express');
var basicAuth = require('basic-auth');
var app = express();
var router = express.Router();

app.set('view engine', 'jade');
app.use(express.static('static'));

var auth = function (req, res, next) {
    var user = basicAuth(req);
    if (!user || !user.name || !user.pass) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        res.sendStatus(401);
    } else
        if (user && user.name === config.username && user.pass === config.password) {
            next();
        } else {
            res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
            res.sendStatus(401);
        }
};

router.get('/latest', auth, function(req, res) {
    db.find({ type: "trackerinfo" }).sort({ timestamp: -1 }).limit(1).exec(function (err, docs) {
        if (err)
            res.send(500, err.message);
        else
        if (docs[0])
            res.json(docs[0]);
        else
            res.send(404);
    });
});

router.get('/latest/:trackerId', auth, function(req, res) {
    db.find({ $and: [ { trackerId: req.param("trackerId") }, { type: "trackerinfo" } ]}).sort({ timestamp: -1 }).limit(1).exec(function (err, docs) {
        if (err)
            res.send(500, err.message);
        else
            if (docs[0])
                res.json(docs[0]);
            else
                res.send(404);
    });
});

router.get('/range/:trackerId/:start/:end', auth, function(req, res) {
    var tsS = new Date(parseInt(req.param("start")));
    var tsE = new Date(parseInt(req.param("end")));
    db.find({ $and: [{ trackerId: req.param("trackerId") }, { trackerDate: { $gte: tsS } }, { trackerDate: { $lte: tsE } }] }).sort({ trackerDate: 1 }).exec(function (err, docs) {
        if (err)
            res.send(500, err.message);
        else
            if (docs)
                res.json(docs);
            else
                res.send(404);
    });
});

router.get('/trackerlist', auth, function(req, res) {
    db.find({}, { trackerId: 1 }).exec(function (err, docs) {
        if (err)
            res.send(500, err.message);
        else
            if (docs) {
                var list = [];
                for (var i=0; i<docs.length; i++) {
                    if (list.indexOf(docs[i].trackerId)==-1)
                        list.push(docs[i].trackerId);
                }
                res.json(list);
            }
            else
                res.send(404);
    });
});

app.use('/api', router);

app.get("/", auth, function(req, res) {
    res.render("index", {apiKey: config.googleMapsAPIKey});
});

app.listen(config.httpPort, function () {
    console.log('GeoServer frontend listening on port ' + config.httpPort);
    console.log('Tracking listening on port ' + config.trackerPort);
});

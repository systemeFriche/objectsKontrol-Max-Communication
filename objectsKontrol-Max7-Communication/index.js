// --------------------------------------------------------------------------
// objectsKontrol-Mac-communication - a generic Node/Express application that send and receive OSC messages
//                                    to and from web browser thanks websocket. 
//                                    This is part of the Node for
//                                    Max system for Max 7.
// --------------------------------------------------------------------------


// -----------------------------------------------------------------------------------
// Gestion du serveur Web pour servir l'interface Web qui pilotera l'application MAX
// -----------------------------------------------------------------------------------

const express = require("express");
const http = require("http");
const path = require("path");

const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

var index = require("./routes/index");
var app = express();


app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", index);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	var err = new Error("Not Found");
	err.status = 404;
	next(err);
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render("error");
});

let server = http.createServer(app);

server.listen(8080, function listening() {
    console.log("Listening on %d", server.address().port);
});

// --------------------------------------------------------------------------
// Gestion de la liaison websocket entre le serveur Node.JS et le client Web
// Il faut que la connexion WebSocket soit ouverte pour ouvrir liaison UDP
// --------------------------------------------------------------------------

var osc = require("osc");
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 7474 });

console.log("WebSocket Server started...");

wss.on("connection", function (ws) {
    
    console.log("Browser connected online...")
    
    var oscPort = new osc.WebSocketPort({
        socket: ws,
        metadata: true
    });

    //Gestion de la réception des messages
    oscPort.on("message", function (oscMsg) {
        console.log("Received from Web Browser: ", oscMsg);
        addresse=oscMsg['address'];
        valeur=oscMsg['args'][0]['value'];
        message=addresse+" "+valeur;
    });

    // -----------------------------------------------------------------------------------
    // Gestion de la liaison UDP entre le serveur Node.JS et l'application MAX 7
    // -----------------------------------------------------------------------------------

    var udp = new osc.UDPPort({
        localAddress: "0.0.0.0",
        //port écouté par le serveur NODE.JS côté liaison Node<-Max
        localPort: 7400,
        //port écouté par MAX à préciser
        //on reste en local
        remoteAddress: "127.0.0.1",
        remotePort: 7500,
        metadata:true
    });

    udp.on("ready", function () {
        var ipAddresses = getIPAddresses();
        console.log("Listening for OSC over UDP.");
        ipAddresses.forEach(function (address) {
            console.log(" Host:", address + ", Port:", udp.options.localPort);
        });
        console.log("Broadcasting OSC over UDP to", udp.options.remoteAddress + ", Port:", udp.options.remotePort);
    });

    //Gestion de la réception des messages
    udp.on("message", function (message,timetag,info) {
        console.log("Received from Max :", message);
    });

    udp.on("error", function (error) {
        console.log("An error occurred: ", error.message);
    });

    udp.open();

    //Définit un relais entre liaison OSC et liaison UDP
    //Dès qu'un message OSC arrive par la liaison WebSocket (depuis client web), le message est renvoyé par la liaison UDP (vers MAX)
    //Dès qu'un message OSC arrive par la liaison UDP (depuis MAX), le message est renvoyé par la liaison WebSocket (vers client web)
    var relay = new osc.Relay(udp, oscPort, {
        raw: true
    });

});


var getIPAddresses = function () {
    var os = require("os"),
        interfaces = os.networkInterfaces(),
        ipAddresses = [];

    for (var deviceName in interfaces){
        var addresses = interfaces[deviceName];

        for (var i = 0; i < addresses.length; i++) {
            var addressInfo = addresses[i];

            if (addressInfo.family === "IPv4" && !addressInfo.internal) {
                ipAddresses.push(addressInfo.address);
            }
        }
    }
    return ipAddresses;
};




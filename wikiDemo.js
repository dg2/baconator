/*
 * Using BaconJS to process data from a websocket
 * in NodeJS
 *
 * Dario Garcia, 2015
 */

var WebSocketClient = require('websocket').client
var Bacon = require('baconjs').Bacon

/**
 * This function wraps a WebSocket connection
 * into a BaconJS EventStream.
 */
function webSocketStream(client, address) {
    // fromBinder is used to wrap an object with callbacks
    // (in this case a WebSocket). Its argument is a "subscribe"
    // function that receives another function `sink` that can 
    // be used to push values to the stream. 
    // The usual process inside the argument function is to 
    // register a callback that will use sink to send data 
    // to the stream. The return value is a function that will 
    // be used to "unsubscribe" from the event source.
    // References:
    // https://baconjs.github.io/api.html#creating-streams
    var stream = Bacon.fromBinder(function(sink) {
        client.on('connectFailed', function(error) {
            console.log('Connection error: ' + error.toString());
        });
        client.on('connect', function(connection) {
            console.log('Connected');
            connection.on('error', function(error) { console.log('Connection error: ' + error.toString()); });
            connection.on('message', function(msg) {
                if (msg.type == "utf8") {
                    sink(JSON.parse(msg.utf8Data))
                }
            });
            connection.on('close', function() {
                console.log('Connection closed');
            });
        });
        client.connect(address);
        return function () { client.off('connect'); }
    });
    
    return stream
}
console.log("Instantiating client");
var client = new WebSocketClient();
var stream = webSocketStream(client, "ws://wiki-update-sockets.herokuapp.com/");

// Let's create a second stream which is generated from the first by counting
// the number of characters of the `content` field, only when that field is
// not empty
var charCntStream = stream
                    .filter(function(v) { return v.content != "" })
                    .map(function(v) { return v.content.length } );

stream.onValue(function(v) { console.log("Original stream: " + JSON.stringify(v)) })

charCntStream.onValue(function(v) { console.log("Message length: " + v) });

// A `Property` is BaconJS notion of state derived from an event stream
// They are generated using the `scan` method, which is analogous to a
// fold
var state = charCntStream.scan(0, function(acc, cnt) {
    return acc + cnt;
});

state.onValue(function(v) { console.log('Cumulative length: ' + v) });

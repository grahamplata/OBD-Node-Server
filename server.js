// imports
var app = require('http').createServer();
var io = require('socket.io').listen(app);
var port = 3000;
var fs = require('fs');
var OBD = require('obd-parser');
var path = require('path');


// If developement mode use fake-obd, if production use comm
// var getConnector = require('obd-parser-serial-connection');
var getConnector = require('obd-parser-development-connection');

// Serial connections settings
var connect = getConnector({
    serialPath: '/dev/rfcomm0',
    serialOpts: {
        baudrate: 115200
    }
});

//globals
var rpm = 0;
var mph = 0;
var coolantTemp = 0;

io.on('connection', function (socket) {


    console.log('New client connected!\n----\n');
    // OBD functions upon connection
    OBD.init(connect).then(function () {

        // initialize data pollers
        var rpmPoller = new OBD.ECUPoller({
            pid: new OBD.PIDS.Rpm(),
            interval: 1000
        });
        var vehicleSpeedPoller = new OBD.ECUPoller({
            pid: new OBD.PIDS.VehicleSpeed(),
            interval: 1000
        });
        var coolantTempPoller = new OBD.ECUPoller({
            pid: new OBD.PIDS.CoolantTemp(),
            interval: 100
        });

        //ready
        console.log('OBDII connected and ready');

        // Poll for vehicle RPM and pass value to global
        rpmPoller.on('data', function (output) {
            rpm = output.value;
        });

        vehicleSpeedPoller.on('data', function (output) {
            mph = output.value;
        });

        coolantTempPoller.on('data', function (output) {
            coolantTemp = output.value;
        });

        // Start Vehicle Polling
        console.log('Starting Polling');
        vehicleSpeedPoller.startPolling();
        rpmPoller.startPolling();
        coolantTempPoller.startPolling();

    });

    setInterval(function () {
        io.emit('new_data', {
            rpm: rpm,
            mph: mph,
            coolantTemp: coolantTemp
        });
        console.log('Data Emitted! --- ' + 'rpm: ' + rpm + ' mph: ' + mph + ' Temp: ' + coolantTemp);
    }, 1000);

});

// on disconnect functions
io.on('disconnect', function () {
    socket.emit('disconnected', socket.id);
    console.log('Client has lost connection!');
});


app.listen(port);
console.log("listening on port: ", port);
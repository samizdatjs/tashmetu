var chalk  = require('chalk');
var events = require('events');
var _      = require('lodash');

var io = null;
var eventEmitter = new events.EventEmitter();

module.exports = {
  init: function(tashmetu, storage, cache, app) {
    tashmetu.on('ready', function(server, port) {
      io = require('socket.io')(server);

      io.on('connection', function(socket) {
        eventEmitter.emit('client-connected', socket);
        socket.on('disconnect', function() {
          eventEmitter.emit('client-disconnected', socket);
        });
      });
    });

    eventEmitter.on('client-connected', function(socket) {
      tashmetu.log('INFO', 'Client connected: ' + chalk.grey(socket.id));
    });
    eventEmitter.on('client-disconnected', function(socket) {
      tashmetu.log('INFO', 'Client disconnected: ' + chalk.grey(socket.id));
    });
  },

  forward: function(emitter, eventName) {
    emitter.on(eventName, function() {
      var args = [eventName].concat(_.map(arguments, function(arg) { return arg }));
      io.emit.apply(io, args);
    });
  }
}

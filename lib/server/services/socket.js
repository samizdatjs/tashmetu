var events = require('events');
var http   = require('http');
var _      = require('lodash');

var eventEmitter = new events.EventEmitter();


/**
 * @module socket
 * @requires server
 * @requires log
 *
 * @description
 * Provides event-based communication with clients
 *
 * @fires client-connected
 * @fires client-disconnected
 */
exports = module.exports = function(server, log) {
  var io = require('socket.io').listen(server);

  /**
   * Client connected event.
   * Fired when a client has established a connection.
   *
   * @event client-connected
   * @type {Object}
   * @see {@link http://socket.io/docs/server-api/#socket}
   *
   * @example
   * socket.on('client-connected', function(socket) {
   *   console.log('Client connected. Session ID: ' + socket.id);
   * });
   */

  /**
   * Client disconnected event.
   * Fired when a client was disconnected.
   *
   * @event client-disconnected
   * @type {Object}
   * @see {@link http://socket.io/docs/server-api/#socket}
   *
   * @example
   * socket.on('client-disconnected', function(socket) {
   *   console.log('Client disconnected. Session ID: ' + socket.id);
   * });
   */

  /**
   * @description
   * Forward events from an emitter to the socket.
   *
   * This function will subscribe to the given event on the given emitter.
   * When a message is recieved it will be sent to the socket.
   *
   * @example
   * <caption>Notify clients when a post is added</caption>
   * socket.forward(cache, 'post-added');
   *
   * @param {Object} emitter - An emitter
   * @param {string|Array.<string>} eventName - One or more events to forward.
   */
  this.forward = function(emitter, eventName) {
    var eventNames = _.isString(eventName) ? [eventName] : eventName;

    eventNames.forEach(function(name) {
      emitter.on(name, function() {
        var args = [name].concat(_.map(arguments, function(arg) {
          return arg;
        }));
        io.emit.apply(io, args);
      });
    });
  };

  /**
   * Emit a message on the socket.
   *
   * @param {String} eventName - Name of the event.
   * @param {} message - The message to send.
   */
  this.emit = function(eventName, message) {
    io.emit(eventName, message);
  };

  /**
   * Register an event handler.
   *
   * @param {String} eventName - The name of the event.
   * @param {Function} listener - The callback function.
   */
  this.on = function(eventName, listener) {
    eventEmitter.on(eventName, listener);
  };


  io.on('connection', function(socket) {
    eventEmitter.emit('client-connected', socket);
    socket.on('disconnect', function() {
      eventEmitter.emit('client-disconnected', socket);
    });
  });

  return this;
};

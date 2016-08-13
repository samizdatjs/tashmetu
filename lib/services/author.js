var events = require('events');
var _      = require('lodash');

var eventEmitter = new events.EventEmitter();

var schema = {
  "id": "author",
  "type": "object",
  "properties": {
    "firstname":{ "type": "string" },
    "lastname": { "type": "string" },
    "email": { "type": "email" }
  },
  "required": ["firstname", "lastname"]
};

/**
 * @module author
 * @requires express
 * @requires storage
 * @requires database
 * @requires yaml
 * @requires validator
 * @requires socket
 * @requires pipeline
 *
 * @description
 * This service is responsible for loading authors from the storage into the
 * cache. It also provides the routes necessary for a basic author api.
 *
 * @fires author-added
 * @fires author-changed
 * @fires author-removed
 * @fires author-requested
 * @fires author-sent
 * @fires author-list-requested
 * @fires author-list-sent
 */
exports = module.exports = function(app, storage, db, yaml, validator, socket, pipe) {
  var authorService = this;

  function validate(author, options, cb) {
    validator.check(author, schema, function(err) {
      cb(err, author);
    });
  }

  var inputPipe = new pipe.Pipeline()
    .step('parse yaml', function(data, options, cb) {
      yaml.parse(data, cb);
    })
    .step('validate', validate)
    .step('add name', function(author, options, cb) {
      author.name = author.__id;
      cb(null, author);
    });

  var outputPipe = new pipe.Pipeline()
    .step('remove name', function(author, options, cb) {
      delete author.name;
      cb(null, author);
    })
    .step('validate', validate)
    .step('serialize yaml', function(author, options, cb) {
      yaml.serialize(obj, cb);
    });

  var collection = db.collection(storage.directory('authors', {
    extension: 'yml',
    input: inputPipe,
    output: outputPipe
  }));

  collection.on('document-added', function(ev) {
    eventEmitter.emit('author-added', ev);
  });
  collection.on('document-changed', function(ev) {
    eventEmitter.emit('author-changed', ev);
  });
  collection.on('document-removed', function(ev) {
    eventEmitter.emit('author-removed', ev);
  });
  collection.on('document-error', function(ev) {
    eventEmitter.emit('author-error', ev);
  });
  collection.on('ready', function(ev) {
    eventEmitter.emit('ready', ev);
  });

  collection.sync();


  /**
   * Author requested event.
   * Fired when an author has been requested and contains the request object.
   *
   * @event author-requested
   * @type {Object}
   */

  /**
   * Author sent event.
   * Fired when an author has been sent and contains the author sent.
   *
   * @event author-sent
   * @type {Object}
   */

  /**
   * Author list requested event.
   * Fired when the list of authors has been requested and contains the
   * request object.
   *
   * @event author-list-requested
   * @type {Object}
   */

  /**
   * Author list sent event.
   * Fired when the list of authors has been sent and contains the list.
   *
   * @event author-list-sent
   * @type {Array}
   */


  /**
   * Get an author by its name.
   *
   * @param {String} name - Name of the author
   * @param {Function} cb - Callback delivering the author.
   * @param {Boolean} forceLoad - Read the author from data source rather than
   *    returning the cached version.
   */
  this.getByName = function(name, cb, forceLoad) {
    collection.get(name, cb, forceLoad);
  };

  /**
   * Get all authors.
   *
   * @param {Function} cb - Callback delivering a list of authors.
   */
  this.findAll = function(cb) {
    collection.findAll(cb);
  };

  /**
   * Store an author.
   *
   * @param {Object} author - The author object to store.
   * @param {Function} cb - Callback
   */
  this.store = function(author, cb) {
    collection.store(author, cb);
  };

  /**
   * Register an event handler.
   */
  this.on = function(event, fn) {
    eventEmitter.on(event, fn);
  };

  socket.forward(this, [
    'author-added',
    'author-changed',
    'author-removed'
  ]);

  /*
   * Wire-up routes
   */
  app.get('/api/authors/:author', function(req, res, next) {
    eventEmitter.emit('author-requested', req);
    authorService.getByName(req.params.author, function(author) {
      res.setHeader('Content-Type', 'application/json');
      res.send(author);
      eventEmitter.emit('author-sent', author.terms);
    });
  });

  app.get('/api/authors', function(req, res, next) {
    eventEmitter.emit('author-list-requested', req);
    res.setHeader('Content-Type', 'application/json');
    authorService.findAll(function(err, authors) {
      res.send(authors);
      eventEmitter.emit('author-list-sent', authors);
    });
  });

  return this;
};

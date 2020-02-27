import {provider, Logger} from '@ziqquratu/core';
import {EventEmitter} from 'eventemitter3';
import {ManagedCollection} from './collections/managed';
import {
  Collection,
  CollectionConfig,
  CollectionFactory,
  Database,
  DatabaseConfig,
  Middleware,
} from './interfaces';

@provider({
  key: 'ziqquratu.Database',
  inject: [
    'ziqquratu.DatabaseConfig',
    'ziqquratu.DatabaseLogger',
  ]
})
export class DatabaseService extends EventEmitter implements Database {
  private collections: {[name: string]: Promise<Collection>} = {};
  private logger: Logger;

  public constructor(
    private config: DatabaseConfig,
    logger: Logger,
  ) {
    super();
    this.logger = logger.inScope('DatabaseService');
    for (const name of Object.keys(config.collections)) {
      this.createCollection(name, config.collections[name]);
    }
  }

  public collection(name: string): Promise<Collection> {
    return this.collections[name];
  }

  public createCollection<T = any>(
    name: string, factory: CollectionFactory<T> | CollectionConfig): Promise<Collection<T>>
  {
    try {
      if (name in this.collections) {
        throw new Error(`A collection named '${name}' already exists`);
      }

      return this.collections[name] = this.createManagedCollection(name, factory).then(collection => {
        collection.on('document-upserted', (doc: any) => {
          this.emit('document-upserted', doc, collection);
        });
        collection.on('document-removed', (doc: any) => {
          this.emit('document-removed', doc, collection);
        });
        collection.on('document-error', (err: any) => {
          this.emit('document-error', err, collection);
        });
        this.logger.inScope('createCollection').info(collection.toString());
        return collection;
      });
    } catch (err) {
      this.logger.error(err.message);
      throw err;
    }
  }

  private async createManagedCollection<T = any>(
    name: string, factory: CollectionFactory<T> | CollectionConfig): Promise<Collection<T>>
  {
    let source: Collection;
    let middlewareFactories = this.config.use || [];

    if (factory instanceof CollectionFactory) {
      source = await factory.create(name, this);
    } else {
      source = await factory.source.create(name, this);
      middlewareFactories = (factory.useBefore || []).concat(
        middlewareFactories, factory.use || []);
    }

    return new ManagedCollection(
      name, source, middlewareFactories.reduce((middleware, middlewareFactory) => {
        return middleware.concat(middlewareFactory.create(source, this));
      }, [] as Middleware[]));
  }
}

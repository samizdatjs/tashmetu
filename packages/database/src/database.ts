import {provider} from '@ziqquratu/ioc';
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
  ]
})
export class DatabaseService extends EventEmitter implements Database {
  private collections: {[name: string]: Collection} = {};

  public constructor(
    private config: DatabaseConfig,
  ) {
    super();
    for (let name of Object.keys(config.collections)) {
      this.createCollection(name, config.collections[name]);
    }
  }

  public collection(name: string): Collection {
    return this.collections[name];
  }

  public createCollection<T = any>(
    name: string, factory: CollectionFactory<T> | CollectionConfig): Collection<T>
  {
    if (name in this.collections) {
      throw new Error(`A collection named '${name}' already exists`);
    }

    let source: Collection;
    let middlewareFactories = this.config.use || [];

    if (factory instanceof CollectionFactory) {
      source = factory.create(name);
    } else {
      source = factory.source.create(name);
      middlewareFactories = (factory.useBefore || []).concat(
        middlewareFactories, factory.use || []);
    }

    let collection = new ManagedCollection(
      source, middlewareFactories.reduce((middleware, middlewareFactory) => {
        return middleware.concat(middlewareFactory.create(source));
      }, [] as Middleware[]));

    collection.on('document-upserted', (doc: any) => {
      this.emit('document-upserted', doc, collection);
    });
    collection.on('document-removed', (doc: any) => {
      this.emit('document-removed', doc, collection);
    });
    collection.on('document-error', (err: any) => {
      this.emit('document-error', err, collection);
    });

    return this.collections[name] = collection;
  }
}

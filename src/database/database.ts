import {inject, provider, activate} from '@samizdatjs/tiamat';
import {Injector} from '@samizdatjs/tiamat';
import {LocalDatabase, RemoteDatabase, Collection, Database, DatabaseConfig,
  CollectionMapping} from '../interfaces';
import {CollectionController} from '../controllers/collection';
import {DocumentController} from '../controllers/document';
import {RoutineAggregator} from '../controllers/routine';
import {EventEmitter} from '../util';

@provider({
  for: 'tashmetu.Database',
  singleton: true
})
export class DatabaseService extends EventEmitter implements Database
{
  private collections: {[name: string]: Collection} = {};
  private syncedCount = 0;

  @inject('tashmetu.DatabaseConfig') private dbConfig: DatabaseConfig;
  @inject('tashmetu.LocalDatabase') private localDB: LocalDatabase;
  @inject('tashmetu.RemoteDatabase') private remoteDB: RemoteDatabase;
  @inject('tashmetu.RoutineAggregator') private routineAggregator: RoutineAggregator;
  @inject('tiamat.Injector') private injector: Injector;

  public collection(name: string): Collection {
    return this.collections[name];
  }

  @activate('tashmetu.Document')
  private activateDocumentController(document: DocumentController): DocumentController {
    let meta = Reflect.getOwnMetadata('tashmetu:document', document.constructor);
    let collection = this.injector.get<CollectionController>(meta.collection);
    collection.addDocumentController(document);
    document.setCollection(collection);
    return document;
  }

  @activate('tashmetu.Collection')
  private activateCollectionController(collection: CollectionController): CollectionController {
    let providerMeta = Reflect.getOwnMetadata('tiamat:provider', collection.constructor);
    let meta = Reflect.getOwnMetadata('tashmetu:collection', collection.constructor);
    this.dbConfig.mappings.forEach((mapping: CollectionMapping) => {
      if (mapping.name === providerMeta.for) {
        let source: Collection;
        if (typeof mapping.source === 'string') {
          source = this.injector.get<Collection>(mapping.source);
        } else {
          source = mapping.source(this.injector);
        }
        collection.setSource(source);
      }
    });
    let cache = this.localDB.createCollection(meta.name);
    let buffer = this.localDB.createCollection(meta.name + ':buffer');
    let routines = this.routineAggregator.getRoutines(collection);
    collection.setCache(cache);
    collection.setBuffer(buffer);
    routines.forEach((routine: any) => {
      routine.setController(collection);
      collection.addRoutine(routine);
    });

    if (this.isServer()) {
      collection.populate();
    }

    collection.on('ready', () => {
      this.syncedCount += 1;
      if (this.syncedCount === Object.keys(this.collections).length) {
        this.emit('database-synced');
      }
    });

    collection.on('document-upserted', (doc: any) => {
      this.emit('document-upserted', doc, collection);
    });
    collection.on('document-removed', (doc: any) => {
      this.emit('document-removed', doc, collection);
    });
    collection.on('document-error', (err: any) => {
      this.emit('document-error', err, collection);
    });

    this.collections[meta.name] = collection;

    return collection;
  }

  private isServer() {
     return ! (typeof window !== 'undefined' && window.document);
  }
}

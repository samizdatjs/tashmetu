import {inject, service} from '@samizdatjs/tiamat';
import {Provider, Activator} from '@samizdatjs/tiamat';
import {LocalDatabase, RemoteDatabase, Collection, Database} from '../interfaces';
import {CollectionController} from '../controllers/collection';
import {DocumentController} from '../controllers/document';
import {RoutineAggregator} from '../controllers/routine';
import {EventEmitter} from '../util';

@service({
  name: 'tashmetu.Database',
  singleton: true
})
export class DatabaseService extends EventEmitter
  implements Database, Activator<any>
{
  private collections: {[name: string]: Collection} = {};

  public constructor(
    @inject('tashmetu.LocalDatabase') private localDB: LocalDatabase,
    @inject('tashmetu.RemoteDatabase') private remoteDB: RemoteDatabase,
    @inject('tashmetu.RoutineAggregator') private routineAggregator: RoutineAggregator,
    @inject('tiamat.Provider') private provider: Provider
  ) {
    super();
  }

  public collection(name: string): Collection {
    return this.collections[name];
  }

  public activate(config: any): any {
    let meta = Reflect.getOwnMetadata('tashmetu:content', config.constructor);
    Object.keys(meta).forEach((name: string) => {
      let ctrlConfig = meta[name];
      let colCtrl = this.activateCollectionController(name, ctrlConfig);
      ctrlConfig.documents = ctrlConfig.documents || [];

      ctrlConfig.documents.forEach((docName: string) => {
        let docCtrl = this.provider.get<DocumentController>(docName);
        docCtrl.setCollection(colCtrl);
        colCtrl.addDocumentController(docCtrl);
      });
    });
  }

  private activateCollectionController(name: string, config: any): CollectionController {
    let source: Collection;
    if (this.isServer()) {
      source = this.provider.get<Collection>(config.source);
    } else {
      source = this.remoteDB.createCollection(name);
    }
    let controller = this.provider.get<CollectionController>(name);
    let collection = this.localDB.createCollection(name);
    let buffer = this.localDB.createCollection(name + ':buffer');
    let routines = this.routineAggregator.getRoutines(controller);
    controller.setCache(collection);
    controller.setBuffer(buffer);
    controller.setSource(source);
    routines.forEach((routine: any) => {
      routine.setController(controller);
      controller.addRoutine(routine);
    });
    this.collections[name] = controller;

    if (this.isServer()) {
      controller.populate();
    }

    controller.on('document-upserted', (doc: any) => {
      this.emit('document-upserted', doc, controller);
    });
    controller.on('document-removed', (doc: any) => {
      this.emit('document-removed', doc, controller);
    });
    controller.on('document-error', (err: any) => {
      this.emit('document-error', err, controller);
    });
    return controller;
  }

  private isServer() {
     return ! (typeof window !== 'undefined' && window.document);
  }
}

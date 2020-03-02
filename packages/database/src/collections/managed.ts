import {EventEmitter} from 'eventemitter3';
import {Collection, Cursor, Middleware, ReplaceOneOptions, QueryOptions} from '../interfaces';

export class ManagedCollection<T = any> extends EventEmitter implements Collection<T> {
  public constructor(
    public readonly name: string,
    private source: Collection<T>,
    middleware: Middleware[]
  ) {
    super();

    const emitters = {
      'document-upserted': 'emitDocumentUpserted',
      'document-removed': 'emitDocumentRemoved',
    };

    source.on('document-upserted', doc => {
      this.emitDocumentUpserted(doc);
    });
    source.on('document-removed', doc => {
      this.emitDocumentRemoved(doc);
    });

    for (const mw of middleware.reverse()) {
      this.use(mw.methods || {});
    }
    for (const mw of middleware) {
      if (mw.events) {
        for (const event of Object.keys(emitters)) {
          if ((mw.events as any)[event]) {
            this.proxy((mw.events as any)[event], (emitters as any)[event]);
          }
        }
      }
    }
  }

  public toString(): string {
    return this.source.toString();
  }

  public find(selector: object = {}, options: QueryOptions = {}): Cursor<T> {
    return this.source.find(selector, options);
  }

  public async findOne(selector: object): Promise<T | null> {
    return this.source.findOne(selector);
  }

  public insertOne(doc: T): Promise<T> {
    return this.source.insertOne(doc);
  }

  public insertMany(docs: T[]): Promise<T[]> {
    return this.source.insertMany(docs);
  }

  public async replaceOne(selector: object, doc: T, options?: ReplaceOneOptions): Promise<T | null> {
    return this.source.replaceOne(selector, doc, options);
  }

  public deleteOne(selector: object): Promise<T | null> {
    return this.source.deleteOne(selector);
  }

  public deleteMany(selector: object): Promise<T[]> {
    return this.source.deleteMany(selector);
  }

  private emitDocumentUpserted(doc: T) {
    this.emit('document-upserted', doc);
  }

  private emitDocumentRemoved(doc: T) {
    this.emit('document-removed', doc);
  }

  private proxy(fn: Function, methodName: string) {
    const f = (this as any)[methodName];
    (this as any)[methodName] = (...args: any[]) => fn(f.bind(this), ...args);
  }

  private use(mw: any) {
    for (const method of Object.keys(mw)) {
      if (typeof mw[method] === 'function' && (this as any)[method]) {
        this.proxy(mw[method], method);
      }
    }
  }
}

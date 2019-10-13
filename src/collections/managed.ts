import {EventEmitter} from 'eventemitter3';
import {Collection, Middleware, QueryOptions} from '../interfaces';

export class ManagedCollection<T = any> extends EventEmitter implements Collection<T> {
  public constructor(
    private source: Collection<T>,
    middleware: Middleware[]
  ) {
    super();

    source.on('document-upserted', doc => this.emit('document-upserted', doc));
    source.on('document-removed', doc => this.emit('document-removed', doc));
    source.on('document-error', err => this.emit('document-error', err));

    for (let mw of middleware.reverse()) {
      this.use(mw);
    }
  }

  public get name(): string {
    return this.source.name;
  }

  public async find(selector: object = {}, options: QueryOptions = {}): Promise<any[]> {
    return this.source.find(selector, options);
  }

  public async findOne(selector: object): Promise<any> {
    return this.source.findOne(selector);
  }

  public upsert(obj: any): Promise<any> {
    return this.source.upsert(obj);
  }

  public async remove(selector: object): Promise<any[]> {
    return this.source.remove(selector);
  }

  public async count(selector?: object): Promise<number> {
    return this.source.count(selector);
  }

  private use(mw: any) {
    for (let prop of Object.getOwnPropertyNames(mw).concat(Object.getOwnPropertyNames(mw.__proto__))) {
      if (typeof mw[prop] === 'function' && prop !== 'constructor' && (this as any)[prop]) {
        const f = (this as any)[prop];
        (this as any)[prop] = mw[prop](f.bind(this));
      }
    }
  }
}

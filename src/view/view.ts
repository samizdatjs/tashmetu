import {injectable} from '@ziggurat/tiamat';
import {QueryOptions} from '../interfaces';
import {Filter} from './interfaces';
import {EventEmitter} from 'eventemitter3';
import {Controller} from '../database/controller';
import {Document} from '../models/document';
import {each, find, includes} from 'lodash';

@injectable()
export class View<T extends Document = Document> extends EventEmitter {
  private _selector: any = {};
  private _options: QueryOptions = {};
  private _data: T[] = [];
  private filters: Filter[] = [];

  public constructor(
    private controller: Controller
  ) {
    super();

    this.on('data-updated', (results: T[]) => {
      this._data = results;
    });

    controller.on('document-upserted', (doc: any) => {
      this.documentUpdated(doc);
    });
    controller.on('document-removed', (doc: any) => {
      this.documentUpdated(doc);
    });
  }

  public filter<F extends Filter>(filter: F, observe: string[] = []): F {
    let proxy = new Proxy(filter, {
      set: (target: any, key: PropertyKey, value: any, reciever: any): boolean => {
        target[key] = value;
        if (includes(observe, key) || (key === 'dirty' && value === true)) {
          this.refresh();
        }
        return true;
      }
    });
    this.filters.push(proxy);
    this.applyFilters();
    return proxy;
  }

  public get selector(): any {
    return this._selector;
  }

  public get options(): QueryOptions {
    return this._options;
  }

  public get data(): T[] {
    return this._data;
  }

  public async refresh(): Promise<T[]> {
    this.applyFilters();

    let docs = await this.controller.find<T>(this.selector, this.options);
    let totalCount = await this.controller.count(this.selector);
    this.emit('data-updated', docs, totalCount);
    return docs;
  }

  private applyFilters() {
    this._selector = {};
    this._options = {};

    each(this.filters, (f: Filter) => {
      f.apply(this.selector, this.options);
    });
  }

  private async documentUpdated(doc: T) {
    if (doc._collection !== this.controller.name()) {
      return;
    }
    let docs = await this.controller.cache.find<any>(this.selector, this.options);
    if (find(docs, ['_id', doc._id])) {
      this.emit('data-updated', docs);
    }
  }
}

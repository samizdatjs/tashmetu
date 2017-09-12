import {injectable} from '@ziggurat/tiamat';
import {QueryOptions} from '../interfaces';
import {ViewConfig, Filter, FilterProvider} from './interfaces';
import {EventEmitter} from 'eventemitter3';
import {Document} from '../models/document';
import {CollectionController} from '../controllers/collection';
import {each, find, values} from 'lodash';
import * as Promise from 'bluebird';

@injectable()
export class View<T extends Document = Document> extends EventEmitter {
  private _selector: any = {};
  private _options: QueryOptions = {};
  private _data: T[] = [];
  private filters: {[name: string]: any} = {};

  public constructor() {
    super();

    this.on('data-updated', (results: T[], totalCount: number) => {
      this._data = results;
    });
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

  public addFilter(name: string, provider: Function): View<T> {
    this.filters[name] = provider(this);
    this.filters[name].on('filter-changed', () => {
      this.refresh();
    });
    return this;
  }

  public filter<U>(name: string): U {
    return <U>(this.filters[name]);
  }

  public refresh(): View<T> {
    this._selector = {};
    this._options = {};

    each(this.filters, (f: Filter) => {
      f.apply(this.selector, this.options);
    });
    this.emit('refresh');
    return this;
  }
}

export class ViewManager {
  private views: {[name: string]: View} = {};

  public constructor(private collection: CollectionController) {
    collection.on('document-upserted', (doc: any) => {
      this.onDocumentUpdated(doc);
    });
    collection.on('document-removed', (doc: any) => {
      this.onDocumentUpdated(doc);
    });
  }

  public addView(view: View) {
    let config: ViewConfig = Reflect.getOwnMetadata('isimud:view', view.constructor);
    each(config.filters, (provider: FilterProvider, name: string) => {
      view.addFilter(name, provider);
    });

    view.on('refresh', () => {
      this.collection.find(view.selector, view.options)
        .then((results: Document[]) => {
          this.collection.count(view.selector).then((totalCount: number) => {
            view.emit('data-updated', results, totalCount);
          });
        });
    });
    this.views[config.name] = view;
  }

  public view(name: string): View {
    return this.views[name];
  }

  private onDocumentUpdated(doc: any) {
    Promise.each(values(this.views), (view: View) => {
      return this.collection.cache.find(view.selector, view.options)
        .then((documents: any[]) => {
          if (find(documents, ['_id', doc._id])) {
            view.emit('data-updated', documents, 1);
          }
        });
    });
  }
}

import {Injector} from '@ziggurat/tiamat';
import * as Promise from 'bluebird';

/**
 *
 */
export interface Database {
  collection(name: string): Collection;

  view(name: string, collection: string): View;

  on(event: string, fn: any): void;
}

export interface DatabaseConfig {
  sources: {[name: string]: Function};
}

/**
 * The cache holds collections of documents in memory.
 */
export interface LocalDatabase {
  /**
   * Create a new collection given a name.
   */
  createCollection(name: string): Collection;
}

export interface RemoteDatabase {
  /**
   * Create a new collection given a name.
   */
  createCollection(path: string, name: string): Collection;
}

export interface View {
  readonly selector: any;

  readonly options: QueryOptions;

  addFilter(name: string, filter: Function): View;

  refresh(): View;

  on(event: 'data-updated', fn: (results: any[], totalCount: number) => void): View;
  on(event: 'refresh', fn: Function): View;

  emit(event: 'data-updated', results: any[], totalCount: number): boolean;
}

export interface ViewConfig {
  name: string;

  collection: string;

  filters: {[name: string]: FilterProvider};
}

export interface Filter {
  apply(selector: any, options: QueryOptions): void;

  on(event: 'filter-changed', fn: Function): Filter;
}

export type FilterProvider = (view: View) => Filter;

export interface FeedConfig {
  limit: number;

  increment: number;
}

export interface Feed extends FeedConfig {
  loadMore(): void;

  hasMore(): boolean;
}

export interface Selector {
  value?: any;

  template?: any;

  disableOn?: any;
}

export enum SortingOrder {
    Ascending = 0,
    Descending
}

export interface Sorting {
  key: string;

  order: SortingOrder;
}

/**
 *
 */
export interface QueryOptions {
  /**
   * Sort by one or more properties in ascending or descending order.
   */
  sort?: Sorting[];

  /**
   * Skip the first number of documents from the results.
   */
  offset?: number;

  /**
   * Limit the number of items that are fetched.
   */
  limit?: number;
}

/**
 * A collection of documents.
 */
export interface Collection {
  /**
   * Insert a document into the collection. If the document already exists it
   * will be updated.
   * A promise for the upserted document is returned.
   */
  upsert<T>(obj: T): Promise<T>;

  /**
   * Find documents in the collection.
   */
  find<T>(selector?: Object, options?: QueryOptions): Promise<T[]>;

  /**
   * Find a single document in the collection.
   */
  findOne<T>(selector: Object): Promise<T>;

  /**
   * Get the number of documents in the collection that matches a given selector.
   */
  count(selector?: Object): Promise<number>;

  /**
   * Get the name of the collection.
   */
  name(): string;

  /**
   * Listen for when a document in the collection has been added or changed.
   * The callback supplies the document.
   */
  on(event: 'document-upserted', fn: (obj: any) => void): Collection;

  /**
   * Listen for when a document in the collection has been removed.
   * The callback supplies the removed document.
   */
  on(event: 'document-removed', fn: (obj: any) => void): Collection;

  /**
   * Listen for when an error was generated when loading or saving a document
   * in the collection. The callback supplies the document error.
   */
  on(event: 'document-error', fn: (err: DocumentError) => void): Collection;

  /**
   * Listen for when the collection has been synced.
   */
  on(event: 'ready', fn: () => void): Collection;

  emit(event: string, ...args: any[]): void;
}

export type CollectionProvider = (injector: Injector) => Collection;

export interface CollectionMapping {
  name: string;

  source: string | CollectionProvider;
}

export interface CacheEvaluator {
  isCached(selector: any, options: QueryOptions): boolean;

  setCached(selector: any, options: QueryOptions): void;

  add(doc: any): void;

  optimizeQuery(selector: any, options: QueryOptions): any;
}

export class DocumentError extends Error {
  public name = 'DocumentError';

  public constructor(public instance: any, message: string) {
    super(message);
  }
}

export interface Document {
  /**
   * Get the content of the document as an object.
   *
   * If a copy of the document does not exist in its collection a new one will
   * be created and returned with the default values from the schema.
   */
  get(): Promise<any>;

  /**
   * Set the content of the document.
   */
  set(obj: any): Promise<any>;

  /**
   * Listen for when the document has been added or changed.
   * The callback supplies the document.
   */
  on(event: 'document-upserted', fn: (obj: any) => void): Document;

  /**
   * Listen for when the document has been removed.
   * The callback supplies the removed document.
   */
  on(event: 'document-removed', fn: (obj: any) => void): Document;

  /**
   * Listen for when an error was generated when loading or saving the document.
   * The callback supplies the document error.
   */
  on(event: 'document-error', fn: (err: DocumentError) => void): Document;
}

/**
 * A pipe processes a single document and provides the result through a callback.
 * Multiple pipes can be chained together to form a pipeline.
 */
export interface Pipe {
  /**
   * Processes the input and passes the result to the 'next'-callback.
   * If an error occurs, it can be passed to the callback instead.
   */
  process(input: any): Promise<any>;
}

/**
 *
 */
export interface Serializer {
  parse(data: string): Object;

  serialize(data: any): string;
}

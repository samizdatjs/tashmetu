import {ValidationResult, ValidationErrorMap} from '@ziggurat/common';
import {CollectionConfig} from './database/interfaces';

export enum CollectionType {
  Source = 'source',
  Cache = 'cache',
  Buffer = 'buffer'
}

/**
 * Generic interface for creating collections.
 */
export interface CollectionFactory<T = any> {
  /**
   * Create a new collection.
   */
  createCollection(ctrlConfig: CollectionConfig, type: CollectionType): Collection<T>;
}

export enum SortingOrder {
  Ascending = 'asc',
  Descending = 'desc'
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

export interface Query {
  selector: any;

  options: QueryOptions;
}

export interface CacheQuery extends Query {
  cached: boolean;
}

/**
 * A collection of documents.
 */
export interface Collection<U = any> {
  /**
   * Name of the collection.
   */
  readonly name: string;

  /**
   * Insert a document into the collection.
   *
   * If the document already exists it will be updated.
   *
   * @param doc The document to insert.
   * @returns A promise for the upserted document.
   */
  upsert<T extends U = any>(doc: T): Promise<T>;

  /**
   * Find documents in the collection.
   *
   * @param selector The selector which documents are matched against.
   * @param options A set of options determining sorting order, limit and offset.
   * @returns A promise for the list of matching documents.
   */
  find<T extends U = any>(selector?: object, options?: QueryOptions): Promise<T[]>;

  /**
   * Find a single document in the collection.
   *
   * @param selector The selector which documents are matched against.
   * @returns A promise for the first matching document if one was found.
   * @throws DocumentError if no document was found.
   */
  findOne<T extends U = any>(selector: object): Promise<T>;

  /**
   * Remove all documents matching selector from collection.
   *
   * @param selector The selector which documents are matched against.
   * @returns A list of all the documents that were removed.
   */
  remove<T extends U = any>(selector: object): Promise<T[]>;

  /**
   * Get the number of documents in the collection that matches a given selector.
   *
   * @param selector The selector which documents are matched against.
   * @returns A promise for the document count.
   */
  count(selector?: object): Promise<number>;

  /**
   * Listen for when a document in the collection has been added or changed.
   * The callback supplies the document.
   */
  on(event: 'document-upserted', fn: (obj: any) => void): Collection<U>;

  /**
   * Listen for when a document in the collection has been removed.
   * The callback supplies the removed document.
   */
  on(event: 'document-removed', fn: (obj: any) => void): Collection<U>;

  /**
   * Listen for when an error was generated when loading or saving a document
   * in the collection. The callback supplies the document error.
   */
  on(event: 'document-error', fn: (err: DocumentError) => void): Collection<U>;

  /**
   * Listen for when the collection has been synced.
   */
  on(event: 'ready', fn: () => void): Collection<U>;

  emit(event: string, ...args: any[]): void;
}

export class DocumentError extends Error {
  public name = 'DocumentError';

  public constructor(public instance: any, message: string) {
    super(message);
  }
}

export class DocumentValidationError extends DocumentError {
  public name = 'DocumentValidationError';
  public children: ValidationErrorMap;

  public constructor(validationResult: ValidationResult) {
    super(validationResult.instance, 'Document validation failed');
    this.children = validationResult.errors;
  }
}

/**
 * An enumeration of the different pipes that can be hooked into by database middleware,
 */
export enum Pipe {
  /**
   * Population of collection from its source.
   *
   * steps: Validate -> Cache
   */
  Populate = 'populate',

  /**
   * Document being upserted to controller by upsert() method.
   *
   * signature: (doc: any) => Promise<any>
   * steps: Validate -> Cache -> Persist
   */
  Upsert = 'upsert',

  /**
   * Document being removed from controller by remove() method.
   *
   * signature: (selector: object) => Promise<any[]>
   * steps: Uncache -> Unpersist
   */
  Remove = 'remove',

  /**
   * Document being upserted to collection as a result of getting a 'document-upserted' event
   * from the source collection.
   *
   * signature: (doc: any) => Promise<any>
   * steps: Validate -> Cache
   */
  SourceUpsert = 'source-upsert',

  /**
   * Document being removed from collection as a result of getting a 'document-removed' event
   * from the source collection.
   *
   * signature: (doc: any) => Promise<any>
   * steps: Uncache
   */
  SourceRemove = 'source-remove',

  /**
   * Find query performed on the collection.
   *
   * signature: (q: Query) => Promise<any[]>
   * steps: CacheQuery -> (SourceQuery -> Validate -> Cache)
   */
  Find = 'find',

  /**
   * Find one query performed on the collection.
   *
   * signature: (selector: object) => Promise<any>
   * steps: CacheQuery -> (SourceQuery -> Validate -> Cache)
   */
  FindOne = 'find-one',
}

/**
 * An enumeration of the different steps that can be hooked into by database middleware,
 */
export enum Step {
  /**
   * Validation of document according to its model schema.
   *
   * signature: (doc: any) => Promise<any>
   */
  Validate = 'validate',

  /**
   * Upserting of document to cache collection.
   *
   * signature: (doc: any) => Promise<any>
   */
  Cache = 'cache',

  /**
   * Removal of documents from cache collection.
   *
   * signature: (selector: object) => Promise<any[]>
   */
  Uncache = 'uncache',

  /**
   * Upserting of document to source collection.
   *
   * signature: (doc: any) => Promise<any>
   */
  Persist = 'persist',

  /**
   * Removal of documents from source collection.
   *
   * signature: (selector: object) => Promise<any[]>
   */
  Unpersist = 'unpersist',

  /**
   * Querrying of documents in cache collection.
   *
   * signature: (q: CacheQuery) => Promise<any[]>
   */
  CacheQuery = 'cache-query',

  /**
   * Querrying of documents in source collection.
   *
   * signature: (q: Query) => Promise<any[]>
   */
  SourceQuery = 'source-query',
}

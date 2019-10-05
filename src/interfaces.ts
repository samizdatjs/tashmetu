import {Container} from '@ziggurat/tiamat';

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

/**
 * Configuration for the database.
 */
export interface DatabaseConfig {
  /**
   * Base URL that will prefix the name of each collection added to the database.
   */
  baseUrl: string;

  /**
   * A map of producers of collections to be created by the database.
   */
  collections: {[name: string]: CollectionProducer};
}

/**
 *
 */
export interface Database {
  /**
   * Get an existing collection by name.
   *
   * @param name The name of the collection.
   * @returns The instance of the collection.
   */
  collection<T = any>(name: string): Collection<T>;

  /**
   * Create a collection.
   *
   * This function will create a new instance given a name and producer.
   *
   * @param name The name of the collection.
   * @param producer The producer creating the collection.
   * @returns An instance of the collection.
   */
  createCollection<T = any>(name: string, producer: CollectionProducer<T>): Collection<T>;

  on(event: string, fn: any): void;
}

export type CollectionProducer<T = any> = (container: Container, name: string) => Collection<T>;

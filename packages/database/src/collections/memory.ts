import {
  Collection,
  CollectionFactory,
  Cursor,
  ReplaceOneOptions,
  QueryOptions,
  SortingKey,
  SortingDirection
} from '../interfaces';
import {AbstractCursor} from '../cursor';
import {EventEmitter} from 'eventemitter3';
import mingo from 'mingo';
import ObjectID from 'bson-objectid';

export class MemoryCollectionCursor<T> extends AbstractCursor<T> {
  private cursor: mingo.Cursor<T>;
  private selCursor: mingo.Cursor<T>;

  public constructor(
    collection: any[],
    selector: any,
    options: QueryOptions,
  ) {
    super(selector, options);
    this.cursor = mingo.find(collection, selector);
    this.selCursor = mingo.find(collection, selector);
    AbstractCursor.applyOptions(this, options);
  }

  public sort(key: SortingKey, direction?: SortingDirection): Cursor<T> {
    this.cursor.sort(this.sortingMap(key, direction));
    return super.sort(key, direction);
  }

  public skip(count: number): Cursor<T> {
    this.cursor.skip(count);
    return super.skip(count);
  }

  public limit(count: number): Cursor<T> {
    this.cursor.limit(count);
    return super.limit(count);
  }

  public async toArray(): Promise<T[]> {
    return this.cursor.all();
  }

  public async count(applySkipLimit = true): Promise<number> {
    return applySkipLimit ? this.cursor.count() : this.selCursor.count();
  }
}

export class MemoryCollection<U = any> extends EventEmitter implements Collection<U> {
  private collection: any[] = [];

  public constructor(public readonly name: string) {
    super();
  }

  public toString(): string {
    return `memory collection '${this.name}' (${this.collection.length} documents)`;
  }

  public find<T extends U = any>(selector: object = {}, options: QueryOptions = {}): Cursor<T> {
    return new MemoryCollectionCursor<T>(this.collection, selector, options);
  }

  public async findOne(selector: object): Promise<any> {
    const result = await this.find(selector).limit(1).toArray();
    if (result.length > 0) {
      return result[0];
    } else {
      return null;
    }
  }

  public async insertOne(doc: any): Promise<any> {
    if (!doc.hasOwnProperty('_id')) {
      doc._id = new ObjectID().toHexString();
      this.collection.push(doc);
    } else {
      const index = this.collection.findIndex(o => o._id === doc._id);
      if (index >= 0) {
        throw new Error(
          `Insertion failed: A document with ID '${doc._id}' already exists in '${this.name}'`
        );
      } else {
        this.collection.push(doc);
      }
    }
    this.emit('document-upserted', doc);
    return doc;
  }

  public async insertMany(docs: any[]): Promise<any[]> {
    const result: any[] = [];
    for (const doc of docs) {
      result.push(await this.insertOne(doc));
    }
    return result;
  }

  public async replaceOne(selector: object, doc: any, options: ReplaceOneOptions = {}): Promise<any> {
    const old = mingo.find(this.collection, selector).next();
    if (old) {
      const index = this.collection.findIndex(o => o._id === old._id);
      this.collection[index] = Object.assign({}, {_id: old._id}, doc);
      this.emit('document-upserted', this.collection[index]);
      return this.collection[index];
    } else if (options.upsert) {
      return this.insertOne(doc);
    }
    return null;
  }

  public async deleteOne(selector: object): Promise<any> {
    const affected = await this.findOne(selector);
    if (affected) {
      this.collection = this.collection.filter(doc => doc._id !== affected._id);
      this.emit('document-removed', affected);
    }
    return affected;
  }

  public async deleteMany(selector: object): Promise<any[]> {
    const affected = await this.find(selector).toArray();
    const ids = affected.map(doc => doc._id);
    this.collection = this.collection.filter(doc => ids.indexOf(doc._id) === -1);
    for (const doc of affected) {
      this.emit('document-removed', doc);
    }
    return affected;
  }
}

export class MemoryCollectionFactory<T> extends CollectionFactory<T> {
  public constructor(private docs: T[] = []) {
    super();
  }

  public create(name: string) {
    const collection = new MemoryCollection(name);
    collection.insertMany(this.docs);
    return collection;
  }
}

export function memory<T = any>(docs: T[] = []) {
  return new MemoryCollectionFactory(docs);
}

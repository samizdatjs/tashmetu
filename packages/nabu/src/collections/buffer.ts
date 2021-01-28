import {Collection, Cursor, ReplaceOneOptions, QueryOptions, AggregationPipeline, AggregationOptions, CollectionFactory, Database, MemoryCollection} from '@ziqquratu/ziqquratu';
import {EventEmitter} from 'eventemitter3';
import {merge} from 'lodash';
import {Duplex} from 'stream';

export class BufferCollection extends EventEmitter implements Collection {
  public constructor(
    private stream: Duplex,
    private cache: Collection,
    private bundle: boolean = false,
  ) {
    super();
  }

  public toString(): string {
    return `buffer collection '${this.name}'`;
  }

  public async aggregate(pipeline: AggregationPipeline, options?: AggregationOptions): Promise<any> {
    return this.cache.aggregate(pipeline, options);
  }

  public async insertOne(doc: any): Promise<any> {
    const res = await this.cache.insertOne(doc);
    try {
      await this.write([res]);
    } catch (err) {
      await this.cache.deleteOne({_id: doc._id});
      throw err;
    }
    this.emit('document-upserted', doc);
    return res;
  }
 
  public async insertMany(docs: any[]): Promise<any[]> {
    const res = await this.cache.insertMany(docs);
    try {
      await this.write(docs);
    } catch (err) {
      await this.cache.deleteMany({_id: {$in: docs.map(d => d._id)}});
      throw err;
    }
    for (const doc of docs) {
      this.emit('document-upserted', doc);
    }
    return res;
  }
 
  public async replaceOne(selector: object, doc: any, options: ReplaceOneOptions = {}): Promise<any> {
    const result = await this.cache.replaceOne(selector, doc, options);
    return this.write([result]);
  }

  public find(selector?: object, options?: QueryOptions): Cursor<any> {
    return this.cache.find(selector, options);
  }

  public async findOne(selector: any): Promise<any> {
    return this.cache.findOne(selector);
  }

  public async deleteOne(selector: any): Promise<any> {
    const affected = await this.cache.deleteOne(selector);
    if (affected) {
      await this.write([{_id: affected._id}]);
      this.emit('document-removed', affected);
    }
    return affected;
  }

  public async deleteMany(selector: any): Promise<any[]> {
    const affected = await this.cache.deleteMany(selector);
    // await this.adapter.remove(affected.map(d => d._id));
    await this.write(affected.map(d => ({_delete: d._id})));
    for (const doc of affected) {
      this.emit('document-removed', doc);
    }
    return affected;
  }

  public get name(): string {
    return this.cache.name;
  }

  private async write(docs: any[]): Promise<void> {
    if (this.bundle) {
      return this.writeAsync(await this.cache.find().toArray());
    }
    for (const doc of docs) {
      await this.writeAsync(doc);
    }
  }

  private writeAsync(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stream.write(data, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async load(id: string, doc: Record<string, any>): Promise<any> {
    const res = await this.cache.replaceOne({_id: id}, merge({}, doc, {_id: id}), {upsert: true});
    if (res) {
      this.emit('document-upserted', res);
    }
    return res;
  }
}

export interface BufferConfig {
  /**
   * Input/Output stream
   */
  stream: Duplex;

  bundle: boolean;
}

export class BufferCollectionFactory extends CollectionFactory {
  constructor(private config: BufferConfig) {
    super('nabu.FileSystemConfig', 'chokidar.FSWatcher');
  }

  public async create(name: string, database: Database): Promise<Collection> {
    return new BufferCollection(this.config.stream, 
      new MemoryCollection(name, database, {disableEvents: true}),
      this.config.bundle,
    );
  }
}

export const buffer = (config: BufferConfig) => new BufferCollectionFactory(config);

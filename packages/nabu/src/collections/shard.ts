import {AsyncFactory} from '@ziqquratu/core';
import {Collection, CollectionFactory, Database, MemoryCollection} from '@ziqquratu/database';
import {BufferCollection} from './buffer';
import {Generator} from '../generator';

export interface ShardStreamConfig<T> {
  /**
   * Input/Output stream
   */
  seed?: Generator<T>;
  
  input?: Generator<T>;

  inputDelete?: Generator<Partial<T>>;

  output: (source: Generator<T>, deletion: boolean) => Promise<void>;
}

export abstract class ShardStreamFactory<T> extends AsyncFactory<ShardStreamConfig<T>> {
  public abstract create(): Promise<ShardStreamConfig<T>>;
}

export interface ShardBufferConfig<T> {
  stream: ShardStreamFactory<T>;
}

class ShardBuffer<T> extends BufferCollection<T> {
  public constructor(
    private output: (source: Generator<T>, deletion: boolean) => Promise<void>,
    cache: Collection,
  ) {
    super(cache);
  }

  public async populate(seed: Generator<T>) {
    for await (const doc of seed) {
      await this.cache.insertOne(doc);
    }
  }

  public async listen(input: Generator<T>) {
    for await (const doc of input) {
      await this.replaceOne({_id: doc._id}, doc, {upsert: true}, false);
    }
  }

  public async listenDelete(input: Generator<Partial<T>>) {
    for await (const doc of input) {
      await this.deleteOne({_id: doc._id}, false);
    }
  }

  protected write(affectedDocs: any[], deletion: boolean): Promise<void> {
    return this.output(Generator.fromMany(affectedDocs), deletion);
  }
}

export class ShardBufferFactory<T> extends CollectionFactory<T> {
  public constructor(private config: ShardBufferConfig<T>) {super()}

  public async create(name: string, database: Database) {
    const {stream} = this.config;

    const {seed, input, inputDelete, output} = await stream.create();
    const cache = new MemoryCollection(name, database, {disableEvents: true});
    const buffer = new ShardBuffer(output, cache);

    if (seed) {
      await buffer.populate(seed);
    }
    if (input) {
      buffer.listen(input);
    }
    if (inputDelete) {
      buffer.listenDelete(inputDelete);
    }
    return buffer;
  }
}

/**
 * A buffered collection based on documents in multiple locations
 */
export function shards<T = any>(config: ShardBufferConfig<T>) {
  return new ShardBufferFactory<T>(config);
}

import {AsyncFactory} from '@ziqquratu/core';
import {Pipe} from '@ziqquratu/pipe';
import {bundle, BundleStreamConfig, BundleStreamFactory} from '../collections/bundle';
import {FileAccess, ReadableFile, Serializer} from '../interfaces'
import * as Pipes from '../pipes';
import {Generator} from '../generator';

export interface FileConfig<T extends object, TStored = T> {
  path: string;

  /**
   * A serializer that will parse and serialize incoming and outgoing data.
   */
  serializer: Serializer<TStored[] | Record<string, TStored>>;

  /**
   * Stream the collection as a dictionary instead of a list
   * 
   * If set the collection will be streamed as a dictionary with keys
   * being the IDs of each document.
   * 
   * @default false
   */
  dictionary?: boolean;

  /**
   * The underlying file system driver to use.
   */
  driver: AsyncFactory<FileAccess>;

  /**
   * An optional pipe that can modify incoming files (and their content)
   * after the content has been parsed.
   */
  afterParse?: Pipe<TStored, T>;

  /**
   * An optional pipe that can modify outgoing files (and their content)
   * before the content is serialized and written to the file system.
   *
   * This is a good opportunity to, for instance, remove run-time data that
   * does not need to be persisted.
   */
  beforeSerialize?: Pipe<T, TStored>;
}

export class FileStreamFactory<T extends object, TStored extends object> extends BundleStreamFactory<T> {
  public constructor(private config: FileConfig<T, TStored>) {
    super()
  }

  public async create(): Promise<BundleStreamConfig<T>> {
    const {path, serializer, dictionary, afterParse, beforeSerialize} = this.config;
    const driver = await this.config.driver.create();

    const input = (source: AsyncGenerator<ReadableFile>) => new Generator(source)
      .pipe(Pipes.File.read())
      .pipe(Pipes.File.parse(serializer))
      .pipe(Pipes.File.content())
      .pipe(dictionary ? Pipes.toList<TStored>() : Pipes.identity<TStored>())
      .pipe(Pipes.disperse())
      .pipe(afterParse || Pipes.identity<T>())

    const output = (source: AsyncGenerator<T>) => new Generator(source)
      .pipe(beforeSerialize || Pipes.identity())
      .pipe(Pipes.collect())
      .pipe(dictionary ? Pipes.toDict<TStored>() : Pipes.identity<TStored>())
      .pipe(Pipes.File.create(path))
      .pipe(Pipes.File.serialize(serializer));

    const watch = driver.watch(path);

    return {
      seed: input(driver.read(path)),
      input: watch ? input(watch) : undefined,
      output: (source) => driver.write(output(source)),
    };
  }
}

export function file<T extends object = any, TStored extends object = T>(config: FileConfig<T, TStored>) {
  return bundle<T>({
    stream: new FileStreamFactory<T, TStored>(config)
  });
}

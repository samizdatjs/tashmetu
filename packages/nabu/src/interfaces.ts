import {Factory} from '@ziqquratu/ziqquratu';
import { IOGate } from '../../pipe/dist';
import { ObjectPipeTransformFactory } from './pipes';

/**
 * Serializer for reading and writing objects.
 */
export interface Serializer {
  /**
   * Load an object from buffer.
   */
  deserialize(buffer: Buffer): Promise<object>;

  /**
   * Store an object to buffer.
   */
  serialize(data: object): Promise<Buffer>;
}

export interface Channel {
  read(): Promise<any>;

  write(data: any): Promise<any>;

  on(event: 'data-updated', fn: (data: any) => void): void;
}

export abstract class SerializerFactory extends Factory<Serializer> {
  public abstract create(): Serializer;
}

export interface Converter {
  publish(text: string): Promise<string>;
}

export abstract class ConverterFactory extends Factory<Converter> {
  public abstract create(): Converter;
}

export interface DirectoryConfig {
  /**
   * Path to directory.
   */
  path: string;

  /**
   * A serializer factory creating a serializer that will parse and serialize
   * documents when reading from and writing to the file system.
   */
  serializer: ObjectPipeTransformFactory;

  /**
   * file extension of files in the directory.
   */
  extension: string;

  /**
   * When set to true the directory will be created if it does not exist.
   * (false by default).
   */
  create?: boolean;
}

export interface FileConfig {
  /**
   * Path to file.
   */
  path: string;

  /**
   * A serializer factory creating a serializer that will parse and serialize
   * documents when reading from and writing to the file system.
   */
  serializer: ObjectPipeTransformFactory;

  dictionary: boolean;
}

export interface FileSystemConfig {
  /**
   * Monitor file system for changes to files and update sources accordingly.
   *
   * @default false
   */
  watch: boolean;
}

export type ObjectMap = {[id: string]: any};

export interface PersistenceAdapter {
  write(docs: ObjectMap): Promise<void>;

  read(): Promise<ObjectMap>;

  remove(ids: string[]): Promise<void>;

  on(event: 'document-updated', fn: (id: string, data: any) => void): PersistenceAdapter;

  on(event: 'document-removed', fn: (id: string) => void): PersistenceAdapter;
}

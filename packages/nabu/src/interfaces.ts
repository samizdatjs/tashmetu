import {IOGate, Pipe} from "@ziqquratu/pipe";
import {Generator} from "./generator";

export interface File<T = any> {
  path: string;
  content: T;
  isDir: boolean;
}

export type ReadableFile = File<AsyncGenerator<Buffer> | undefined>;

export abstract class FileAccess {
  public abstract read(path: string | string[]): Generator<ReadableFile>;

  public abstract write(files: AsyncGenerator<File<Buffer>>): Promise<void>;

  public abstract remove(files: AsyncGenerator<File>): Promise<void>;

  public watch(globs: string | string[], deletion?: boolean): Generator<File> | null {
    return null;
  }
}

export type GeneratorSink<T = any, TReturn = any> = (gen: AsyncGenerator<T>) => Promise<TReturn>;

export interface Serializer<T = any> extends IOGate<Pipe> {
  input: Pipe<Buffer, T>;
  output: Pipe<T, Buffer>;
}

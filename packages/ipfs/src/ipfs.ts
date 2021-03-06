import {AsyncFactory} from '@ziqquratu/core';
import {FileAccess, File, ReadableFile, Pipeline} from '@ziqquratu/nabu';
import path from 'path';
import minimatch from 'minimatch';

const createClient = require('ipfs-http-client')

export class IPFSService extends FileAccess  {
  public constructor(private ipfs: any) { super(); }

  public read(location: string | string[]): Pipeline<ReadableFile> {
    const ipfs = this.ipfs;

    if (Array.isArray(location)) {
      throw Error('Multiple paths currently not supported');
    }
    const dir = path.dirname(location);

    async function* content(filePath: string) {
      for await (const chunk of ipfs.files.read(filePath)) {
        yield chunk;
      }
    }

    async function* gen() {
      for await (const file of await ipfs.files.ls(dir)) {
        const filePath = path.join(dir, file.name);
        if (minimatch(filePath, location as string)) {
          yield {
            path: filePath,
            content: file.type === 'file' ? content(filePath) : undefined,
            isDir: file.type === 'dir',
          };
        }
      }
    }
    return new Pipeline(gen());
  }

  public async write(files: Pipeline<File>): Promise<void> {
    for await (const file of files) {
      await this.ipfs.files.write(file.path, file.content, {create: true});
    }
  }

  public async remove(files: Pipeline<File>): Promise<void> {
    for await (const file of files) {
      await this.ipfs.files.rm(file.path);
    }
  }
}

export class IPFSServiceFactory extends AsyncFactory<FileAccess> {
  public constructor(private url: string | undefined) { super(); }

  public async create() {
    return new IPFSService(createClient({url: this.url}));
  }
}

export const ipfs = (url?: string) => new IPFSServiceFactory(url);

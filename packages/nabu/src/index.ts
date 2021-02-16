export {json} from './pipes/json';
export {yaml, YamlConfig} from './pipes/yaml';
export {shards} from './collections/shard';
export {fsFile, FileStreamConfig} from './collections/file';
export {bundle, BundleConfig} from './collections/bundle';
export {fsDirectory} from './collections/directory';
export {fsGlob, GlobConfig} from './collections/glob';
// export {ipfs, ipfsDirectory, IPFSConfig} from './collections/ipfs';
export {vinylFS, VinylFSConfig} from './collections/vinyl';
export * from './interfaces';

import {component, Logger, Provider} from '@ziqquratu/ziqquratu';
import {FileSystemConfig} from './interfaces';
import {ShardBufferFactory} from './collections/shard';
import {LocalFileConfigFactory} from './collections/file';
import {BundleBufferFactory} from './collections/bundle';
// import {IPFSFactory} from './collections/ipfs';
import {VinylFSStreamFactory} from './collections/vinyl';
import {VinylFS} from './vinyl/fs';
import * as chokidar from 'chokidar';
// import ipfsClient from 'ipfs-http-client';

@component({
  providers: [
    Provider.ofInstance<chokidar.FSWatcher>('chokidar.FSWatcher', chokidar.watch([], {
      ignoreInitial: true,
      persistent: true
    })),
    Provider.ofInstance<FileSystemConfig>('nabu.FileSystemConfig', {
      watch: false,
    }),
    Provider.ofFactory({
      key: 'nabu.Logger',
      inject: ['ziqquratu.Logger'],
      create: (logger: Logger) => logger.inScope('nabu')
    }),
    VinylFS,
    /*
    Provider.ofFactory({
      key: 'ipfs',
      create: () => ipfsClient(),
    }),
    */
  ],
  factories: [
    BundleBufferFactory,
    ShardBufferFactory,
    LocalFileConfigFactory,
    VinylFSStreamFactory,
    // IPFSFactory,
  ]
})
export default class Nabu {}

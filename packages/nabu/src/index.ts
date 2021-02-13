export {json} from './pipes/json';
export {yaml, YamlConfig} from './pipes/yaml';
export {buffer} from './collections/buffer';
export {file, FileConfig} from './collections/file';
export {directory, DirectoryConfig} from './collections/directory';
export {glob, GlobConfig} from './collections/glob';
export * from './interfaces';

import {component, Logger, Provider} from '@ziqquratu/ziqquratu';
import {FileSystemConfig} from './interfaces';
import {BufferCollectionFactory} from './collections/buffer';
import {DirectoryFactory} from './collections/directory';
import {FileFactory} from './collections/file';
import {GlobFactory} from './collections/glob';
import * as chokidar from 'chokidar';

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
    })
  ],
  factories: [
    BufferCollectionFactory,
    DirectoryFactory,
    FileFactory,
    GlobFactory,
  ]
})
export default class Nabu {}

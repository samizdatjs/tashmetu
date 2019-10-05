import {component} from '@ziggurat/tiamat';

export {inline, MemoryCollection} from './collections/memory';
export {http} from './collections/http';
export * from './interfaces';

import {DatabaseConfig} from './interfaces';
import {DatabaseService} from './database';

@component({
  providers: [
    DatabaseService,
  ],
  definitions: {
    'ziggurat.DatabaseConfig': {
      baseUrl: '',
      collections: {}
    } as DatabaseConfig
  }
})
export default class Ziggurat {}

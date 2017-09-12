import {component} from '@ziggurat/tiamat';

export {CollectionController} from './controllers/collection';
export {Routine} from './controllers/routine';
export {ViewBase} from './view/view';
export {remote} from './database/remote';
export {feed} from './view/filters/feed';
export {sorting} from './view/filters/sort';
export {selector} from './view/filters/selector';
export {Document} from './models/document';
export {inline} from './sources/inline';
export * from './interfaces';
export * from './controllers/meta/decorators';
export * from './view/decorators';
export * from './schema/decorators';
export * from './schema/interfaces';

import {RoutineAggregator} from './controllers/routine';
import {DatabaseService} from './database/database';
import {LocalDB} from './database/local';
import {RemoteDB} from './database/remote';
import {TransformerService} from './schema/transformer';
import {ValidatorService} from './schema/validator';

@component({
  providers: [
    LocalDB,
    RemoteDB,
    DatabaseService,
    RoutineAggregator,
    TransformerService,
    ValidatorService
  ]
})
export class Isimud {}

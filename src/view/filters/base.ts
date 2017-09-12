import {View, QueryOptions, Filter} from '../../interfaces';
import {EventEmitter} from 'eventemitter3';
import {extend} from 'lodash';

export class BaseFilter extends EventEmitter implements Filter {
  public constructor(protected view: View) {
    super();
  }

  public apply(selector: any, options: QueryOptions): void {
    return;
  }
}

import {QueryOptions, SortingOrder} from '../../interfaces';
import {Filter, SortingConfig} from '../interfaces';

export class SortingFilter extends Filter {
  public key: string;
  public order: SortingOrder;

  public constructor(private config: SortingConfig) {
    super(config);
    this.key = config.key;
    this.order = config.order;
  }

  public apply(selector: any, options: QueryOptions): void {
    if (!options.sort) {
      options.sort = [];
    }
    options.sort.push({key: this.key, order: this.order});
  }
}

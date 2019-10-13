import {QueryOptions} from '../../interfaces';
import {FilterConfig} from '../interfaces';
import {Filter} from '../view';

/**
 * Configuration options for range filter
 */
export interface RangeConfig extends FilterConfig {
  /**
   * Offset from the beginning of the result set.
   *
   * @default 0
   */
  offset?: number;

  /** Number of documents to include in the range */
  length: number;
}

/**
 * A filter that limits the range of documents.
 *
 * The range filter allows us to limit the number of documents displayed in the view to a
 * specific range of the result set.
 *
 * @usageNotes
 * The range is configured by supplying a length and an optional offset. Here we create a filter
 * that will limit the view to the first 10 matching documents in the collection. Note that
 * omitting the offset in this case would yield the same result.
 *
 * ```typescript
 * class MyView extends View {
 *   range = new RangeFilter({
 *     offset: 0
 *     length: 10
 *   })
 * }
 * ```
 */
export class RangeFilter extends Filter {
  public offset: number;
  public length: number;

  public constructor(
    config: RangeConfig
  ) {
    super(config);
    this.offset = config.offset || 0;
    this.length = config.length;
  }

  public apply(selector: any, options: QueryOptions): void {
    options.offset = this.offset;
    options.limit = this.length;
  }
}

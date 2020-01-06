import {propertyDecorator} from '@ziggurat/tiamat';
import {QueryOptions, SortingOrder} from '../../interfaces';
import {ViewPropertyAnnotation, QueryModifier} from '../view';

export class SortBy extends QueryModifier<SortingOrder | undefined> {
  public constructor(private sortKey: string) { super(); }

  public modifyOptions(value: SortingOrder | undefined, key: string, options: QueryOptions) {
    if (!options.sort) {
      options.sort = {};
    }
    if (value !== undefined) {
      options.sort[this.sortKey] = value;
    }
  }
}

/**
 * Sort documents according to a given key and order.
 *
 * A view can have multiple sorting properties acting on different keys.
 *
 * @usageNotes
 * Sorting articles according to their publication date could look as following:
 *
 * ```typescript
 * class MyView extends View {
 *   @sortBy('datePublished')
 *   public dateSort = SortingOrder.Descending;
 * }
 * ```
 */
export const sortBy = (key: string) =>
  propertyDecorator<SortingOrder | undefined>(ViewPropertyAnnotation)(new SortBy(key));
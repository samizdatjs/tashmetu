import {View} from './view';

/**
 * A view monitoring a single document.
 */
export abstract class Item<T = any> extends View<T> {
  public async refresh(): Promise<T> {
    this.compileQuery();

    this._data = await this.collection.findOne<T>(this.selector);
    this.emit('item-updated', this._data);
    return this._data;
  }

  public on(event: 'item-updated', fn: (doc: T) => void) {
    return super.on(event, fn);
  }
}

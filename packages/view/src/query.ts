import {Annotation} from '@ziqquratu/core';
import {Collection, QueryOptions, SortingOrder} from '@ziqquratu/database';
import mingo from 'mingo';
import {getType} from 'reflect-helper';
const assignDeep = require('assign-deep');

export interface Selection<T> {
  one(collection: Collection<T>): Promise<T>;
  all(collection: Collection<T>): Promise<T[]>;
  count(collection: Collection<T>): Promise<number>;
  test(doc: any): boolean;
}

export interface Range {
  offset?: number;
  limit?: number;
}

export class Cursor<T = any> implements Selection<T> {
  public constructor(
    public selector: object = {},
    public options: QueryOptions = {},
  ) {}

  public filter(selector: object): Cursor {
    return new Cursor(assignDeep({}, this.selector, selector), this.options);
  }

  public sort(key: string, order: SortingOrder): Cursor {
    return new Cursor(this.selector, assignDeep({}, this.options, {sort: {[key]: order}}));
  }

  public skip(count: number): Cursor {
    return new Cursor(this.selector, assignDeep({}, this.options, {offset: count}));
  }

  public limit(count: number): Cursor {
    return new Cursor(this.selector, assignDeep({}, this.options, {limit: count}));
  }

  public one(collection: Collection<T>): Promise<T> {
    return collection.findOne(this.selector);
  }

  public all(collection: Collection<T>): Promise<T[]> {
    return collection.find(this.selector, this.options);
  }

  public count(collection: Collection<T>): Promise<number> {
    return collection.count(this.selector);
  }

  public test(doc: any): boolean {
    return new mingo.Query(this.selector).test(doc);
  }
}

export class QueryPropertyAnnotation extends Annotation {
  public apply(cursor: Cursor, value: any): Cursor {
    return cursor;
  }
}

export abstract class Query<T = any> implements Selection<T>, Range {
  public offset = 0;

  public async one(collection: Collection<T>): Promise<T> {
    return this.compileQuery().one(collection);
  }

  public async all(collection: Collection<T>): Promise<T[]> {
    return this.compileQuery().all(collection);
  }

  public async count(collection: Collection<T>): Promise<number> {
    return this.compileQuery().count(collection);
  }

  public test(doc: any): boolean {
    return this.compileQuery().test(doc);
  }

  protected get target(): Range {
    return this;
  }

  private compileQuery(): Selection<T> {
    let cursor = new Cursor();

    for (const prop of getType(this.target.constructor).properties) {
      for (const annotation of prop.getAnnotations(QueryPropertyAnnotation)) {
        cursor = annotation.apply(cursor, (this.target as any)[prop.name]);
      }
    }
    if (this.target.limit) {
      cursor = cursor.limit(this.target.limit);
    }
    if (this.target.offset) {
      cursor = cursor.skip(this.target.offset);
    }
    return cursor;
  }
}

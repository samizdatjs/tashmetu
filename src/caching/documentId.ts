import {Middleware, after, before} from '@ziggurat/ningal';
import {CacheQuery, QueryOptions, Step, Pipe} from '../interfaces';
import {isString, isObject, each, filter, every} from 'lodash';

export class DocumentIdEvaluator extends Middleware {
  private ids: {[id: string]: boolean} = {};

  @before({
    step: Step.CacheQuery,
    pipe: Pipe.Find
  })
  public processQuery(q: CacheQuery): CacheQuery {
    if (isObject(q.selector._id) && q.selector._id.hasOwnProperty('$in')) {
      q.selector._id['$in'] = filter(q.selector._id['$in'], (id: string) => {
        return !(id in this.ids);
      });
    }
    q.cached = q.cached || this.isCached(q.selector, q.options);
    return q;
  }

  @after({
    step: Step.Cache
  })
  public add(doc: any): any {
    this.ids[doc._id] = true;
    return doc;
  }

  @after({
    step: Step.Uncache
  })
  public remove(doc: any): any {
    delete this.ids[doc._id];
    return doc;
  }

  private isCached(selector: any, options: QueryOptions): boolean {
    if (!selector.hasOwnProperty('_id')) {
      return false;
    }
    if (isString(selector._id)) {
      return selector._id in this.ids;
    }
    if (isObject(selector._id) && selector._id.hasOwnProperty('$in')) {
      return every(selector._id['$in'], (id: string) => {
        return id in this.ids;
      });
    }
    return false;
  }
}

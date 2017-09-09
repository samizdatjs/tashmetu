import {NumberModelConfig} from '../interfaces';
import {ModelPropertyDecorator} from './common';
import {IsNumber, IsDivisibleBy, Min, Max} from 'class-validator';

export class NumberModelDecorator extends ModelPropertyDecorator<NumberModelConfig> {
  public decorate(data: NumberModelConfig, target: any, key: string) {
    let options: any = {};

    if (Reflect.getOwnMetadata('isimud:type', target, key) === 'array') {
      options.each = true;
    } else {
      Reflect.defineMetadata('isimud:type', 'number', target, key);
      super.decorate(data, target, key);
    }

    let decorators: any[] = [IsNumber(options)];

    if (data) {
      if (data.multipleOf) {
        decorators.push(IsDivisibleBy(data.multipleOf, options));
      }
      if (data.minimum) {
        decorators.push(Min(data.minimum, options));
      }
      if (data.maximum) {
        decorators.push(Max(data.maximum, options));
      }
    }

    Reflect.decorate(decorators, target, key);
  }
}

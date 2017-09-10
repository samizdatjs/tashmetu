import {TypeDecorator} from './common';
import {ArrayTypeConfig} from '../interfaces';
import {IsArray, ArrayMinSize, ArrayMaxSize, ArrayUnique} from 'class-validator';

export class ArrayTypeDecorator extends TypeDecorator<ArrayTypeConfig> {
  public decorate(data: ArrayTypeConfig, target: any, key: string) {
    super.decorate(data, target, key);

    Reflect.defineMetadata('isimud:type', 'array', target, key);

    let decorators: any[] = [IsArray()];

    if (data) {
      if (data.items) {
        decorators.push(data.items.type);
      }
      if (data.minItems) {
        decorators.push(ArrayMinSize(data.minItems));
      }
      if (data.maxItems) {
        decorators.push(ArrayMaxSize(data.maxItems));
      }
      if (data.uniqueItems) {
        decorators.push(ArrayUnique());
      }
    }

    Reflect.decorate(decorators, target, key);
  }
}

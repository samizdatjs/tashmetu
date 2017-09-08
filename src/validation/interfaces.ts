import * as Promise from 'bluebird';

export interface Validator {
  validate(instance: any): Promise<any>;
}

export interface ArrayModelConfig {
  items?: {type: Function};

  minItems?: number;

  maxItems?: number;

  uniqueItems?: boolean;
}

export interface NumberModelConfig {
  multipleOf?: number;

  minimum?: number;

  maximum?: number;
}

export interface StringModelConfig {
  minLength?: number;

  maxLength?: number;

  pattern?: RegExp;

  format?: 'date-time' | 'email' | 'hostname' | 'ipv4' | 'ipv6' | 'uri';
}

export interface DateModelConfig {
  min?: Date;

  max?: Date;
}

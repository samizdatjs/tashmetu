import {injectable} from '@ziggurat/tiamat';
import {Collection, DocumentError, Pipe, QueryOptions, CacheEvaluator} from '../interfaces';
import {Document} from '../models/document';
import {Pipeline, HookablePipeline, UpsertPipe, RevisionUpsertPipe,
  Validator, MergeDefaults, StripDefaults, Hook, HookablePipe} from '../pipes';
import {CollectionConfig} from './meta/decorators';
import {HookMeta, HookConfig} from './meta/decorators';
import {Routine} from './routine';
import {EventEmitter} from 'eventemitter3';
import * as Promise from 'bluebird';

export class Processor extends EventEmitter {
  private pipes: {[name: string]: HookablePipeline} = {};

  public constructor(
    source: Collection,
    cache: Collection,
    config: CollectionConfig,
    schemas: any[])
  {
    super();
    let cachePipe = new RevisionUpsertPipe(cache);
    let persistPipe = new UpsertPipe(source);
    let validationPipe = new Validator(schemas);
    let mergePipe = new MergeDefaults(schemas);
    let stripPipe = new StripDefaults(schemas);

    this.pipes['source-upsert'] = new HookablePipeline(true)
      .step('validate', validationPipe)
      .step('merge',    mergePipe)
      .step('cache',    cachePipe)
      .on('document-error', (err: DocumentError) => {
        this.emit('document-error', err);
      });

    this.pipes['upsert'] = new HookablePipeline(true)
      .step('validate', validationPipe)
      .step('merge',    mergePipe)
      .step('cache',    cachePipe)
      .step('strip',    stripPipe)
      .step('persist',  persistPipe)
      .on('document-error', (err: DocumentError) => {
        this.emit('document-error', err);
      });

    this.pipes['populate-pre-buffer'] = new HookablePipeline(true)
      .step('validate', validationPipe)
      .step('merge',    mergePipe)
      .on('document-error', (err: DocumentError) => {
        this.emit('document-error', err);
      });

    this.pipes['populate-post-buffer'] = new HookablePipeline(true)
      .step('cache',    cachePipe)
      .on('document-error', (err: DocumentError) => {
        this.emit('document-error', err);
      });

    this.pipes['cache'] = new HookablePipeline(true)
      .step('cache',    cachePipe)
      .on('document-error', (err: DocumentError) => {
        this.emit('document-error', err);
      });

    // this.addHooks(this);
  }

  public process(doc: any, pipe: string): Promise<any> {
    return this.pipes[pipe].process(doc);
  }

  public addRoutine(routine: Routine<any>): void {
    this.addHooks(routine);
  }

  private addHooks(host: any): void {
    const hooks: HookMeta[] = Reflect.getMetadata(
      'isimud:hook', host.constructor) || [];

    hooks.forEach((hook: HookMeta) => {
      const pipe = new Hook(host, hook.key);
      let steps = this.getMatchingSteps(hook.data);

      steps.forEach((step: HookablePipe) => {
        switch (hook.type) {
          case 'before': step.before(pipe); break;
          case 'after':  step.after(pipe);  break;
          case 'error':  step.error(pipe);  break;
        }
      });
    });
  }

  private getMatchingSteps(hook: HookConfig): HookablePipe[] {
    let steps: HookablePipe[] = [];
    if (hook.pipe) {
      if (hook.pipe in this.pipes) {
        let step = <HookablePipe>this.pipes[hook.pipe].getStep(hook.step);
        if (step) {
          steps.push(step);
        }
      }
    } else {
      for (let name in this.pipes) {
        if (this.pipes[name]) {
          let step = <HookablePipe>this.pipes[name].getStep(hook.step);
          if (step) {
            steps.push(step);
          }
        }
      }
    }
    return steps;
  }
}

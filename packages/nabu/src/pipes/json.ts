import {IOGate, Pipe} from '@ziqquratu/pipe';

/**
 * JSON parsing pipe 
 * 
 * @param buffer Buffer containing raw JSON data
 */
export const jsonParse: Pipe<Buffer, any> = async buffer =>
  JSON.parse(buffer.toString('utf-8'));

/**
 * JSON serialization pipe 
 * 
 * @param obj JSON
 */
export const jsonSerialize: Pipe<any, Buffer> = async obj =>
  Buffer.from(JSON.stringify(obj), 'utf-8');

export const json = () => ({ input: jsonParse, output: jsonSerialize}) as IOGate<Pipe>;

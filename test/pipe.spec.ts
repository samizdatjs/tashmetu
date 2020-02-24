import {expect} from 'chai';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mocha';

import {pipeConnection, Pipe, PipeFactory} from '../packages/pipe/dist';
import {
  bootstrap,
  component,
  Provider,
  Collection,
  Database,
  DatabaseConfig,
  memory,
} from '../packages/ziqquratu/dist';

chai.use(chaiAsPromised);

describe('pipe', () => {
  class PlusOnePipe implements Pipe {
    public async process(doc: any): Promise<any> {
      return Object.assign({}, doc, {amount: doc.amount + 1});
    }
  }

  class PlusOnePipeFactory extends PipeFactory {
    public create() {
      return new PlusOnePipe();
    }
  }

  @component({
    providers: [
      Provider.ofInstance<DatabaseConfig>('ziqquratu.DatabaseConfig', {
        collections: {
          'test': {
            source: memory(),
            use: [
              pipeConnection({
                methods: ['find', 'findOne'],
                pipe: new PlusOnePipeFactory(),
              })
            ]
          }
        }
      })
    ],
    inject: ['ziqquratu.Database']
  })
  class TestComponent {
    public constructor(public database: Database) {}
  }

  let collection: Collection;

  before(async () => {
    const app = (await bootstrap(TestComponent));
    collection = app.database.collection('test');
  });

  beforeEach(async () => {
    await collection.deleteMany({});
    await collection.insertMany([{_id: 1, amount: 1}, {_id: 2, amount: 2}]);
  });

  describe('findOne', () => {
    it('should transform single document', async () => {
      const doc = await collection.findOne({_id: 1});
      expect(doc.amount).to.eql(2);
    });
  });

  describe('find', () => {
    it('should transform documents with toArray', async () => {
      const docs = await collection.find().toArray();
      expect(docs.map(d => d.amount)).to.eql([2, 3]);
    });
    it('should transform documents with next', async () => {
      const cursor = collection.find();

      const docs: any[] = [];
      while(await cursor.hasNext()) {
        docs.push(await cursor.next());
      }
      expect(docs.map(d => d.amount)).to.eql([2, 3]);
    });
    it('should transform documents with forEach', async () => {
      const cursor = collection.find();

      const docs: any[] = [];
      await cursor.forEach(doc => docs.push(doc));
      expect(docs.map(d => d.amount)).to.eql([2, 3]);
    });
  });
});

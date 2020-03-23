import {expect} from 'chai';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mocha';

import {eachDocument} from '../../packages/pipe/dist';
import {
  bootstrap,
  component,
  Provider,
  Collection,
  Database,
  DatabaseConfig,
  memory,
} from '../../packages/ziqquratu/dist';

chai.use(chaiAsPromised);

describe('pipe', () => {
  @component({
    providers: [
      Provider.ofInstance<DatabaseConfig>('ziqquratu.DatabaseConfig', {
        collections: {
          'test': {
            source: memory(),
            use: [
              eachDocument([
                'insertOne',
                'insertMany',
                'replaceOne',
                'find',
                'findOne'
              ],
                async doc => Object.assign({}, doc, {amount: doc.amount + 1})
              )
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
    collection = await app.database.collection('test');
  });

  beforeEach(async () => {
    await collection.deleteMany({});
    await collection.insertMany([{_id: 1, amount: 0}, {_id: 2, amount: 1}]);
  });

  describe('insertOne', () => {
    it('should transform document', async () => {
      const doc = await collection.insertOne({_id: 3, amount: 3});
      expect(doc.amount).to.eql(4);
    });
  });

  describe('insertMany', () => {
    it('should transform documents', async () => {
      const docs = await collection.insertMany([{_id: 3, amount: 3}, {_id: 4, amount: 4}]);
      expect(docs.map(d => d.amount)).to.eql([4, 5]);
    });
  });

  describe('replaceOne', () => {
    it('should transform document', async () => {
      const doc = await collection.replaceOne({_id: 1}, {amount: 10});
      expect(doc.amount).to.eql(11);
    });
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

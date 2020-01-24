import {expect} from 'chai';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import 'mocha';

import {caching} from '../packages/caching';
import {view, filter, sortBy, Range} from '../packages/view';
import {
  bootstrap,
  component,
  Provider,
  Collection,
  Database,
  DatabaseConfig,
  memory,
  SortingOrder,
} from '../packages/ziqquratu';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const data = [
  {_id: 1, item: { category: 'cake', type: 'chiffon' }, amount: 10 },
  {_id: 2, item: { category: 'cookies', type: 'chocolate chip'}, amount: 50 },
  {_id: 3, item: { category: 'cookies', type: 'chocolate chip'}, amount: 15 },
  {_id: 4, item: { category: 'cake', type: 'lemon' }, amount: 30 },
  {_id: 5, item: { category: 'cake', type: 'carrot' }, amount: 20 },
];

describe('view', () => {
  @view({
    collection: 'test',
    monitor: ['sort', 'category']
  })
  class TestView extends Range {
    public limit = 2;

    @sortBy('amount')
    public sort = SortingOrder.Descending;

    @filter({
      compile: value => ({'item.category': value}),
      disableOn: 'all',
    })
    public category = 'all';
  }

  @component({
    providers: [
      TestView,
      Provider.ofInstance<DatabaseConfig>('ziqquratu.DatabaseConfig', {
        collections: {
          'test': memory()
        },
        use: [caching()]
      })
    ],
    inject: [TestView, 'ziqquratu.Database']
  })
  class TestComponent {
    public constructor(public testView: TestView, public database: Database) {}
  }

  let sut: TestView;
  let collection: Collection;

  let sandbox: any;

  before(async () => {
    const app = (await bootstrap(TestComponent));
    sut = app.testView;
    collection = app.database.collection('test');
  });

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    await collection.remove({});
    for (const doc of data) {
      await collection.upsert(doc);
    }
  });

  afterEach(() => {
    sut.removeAllListeners();
    sandbox.restore();
  });

  describe('collection events', () => {
    beforeEach(async () => {
      sut.category = 'cake';
      await sut.refresh();
    });

    after(async () => {
      sut.category = 'all';
      await sut.refresh();
    });

    it('should initially have documents', () => {
      expect(sut.data.map(d => d._id)).to.eql([4, 5]);
    });

    it('should update when document matching selector is added', (done) => {
      sut.on('item-set-updated', (docs, totalCount) => {
        expect(docs.length).to.eql(2);
        expect(totalCount).to.eql(4);
        expect(docs.map(d => d._id)).to.eql([6, 4]);
        done();
      });

      collection.upsert(
        {_id: 6, item: { category: 'cake', type: 'pound'}, amount: 60 });
    });

    it('should not update when document not matching selector is added', (done) => {
      const spy = sandbox.spy();
      sut.on('item-set-updated', spy);

      collection.upsert(
        {_id: 7, item: { category: 'cookies', type: 'gingerbread'}, amount: 25 });

      setTimeout(() => {
        expect(spy).to.have.callCount(0);
        done();
      }, 500);
    });

    it('should update when document is updated to match view', (done) => {
      sut.on('item-set-updated', (docs, totalCount) => {
        expect(docs.length).to.eql(2);
        expect(totalCount).to.eql(3);
        expect(docs.map(d => d._id)).to.eql([1, 4]);
        done();
      });

      collection.upsert(
        {_id: 1, item: { category: 'cake', type: 'chiffon' }, amount: 35 }
      );
    });

    it('should update when document matching selector is removed', (done) => {
      sut.on('item-set-updated', (docs, totalCount) => {
        expect(docs.length).to.eql(2);
        expect(totalCount).to.eql(2);
        expect(docs.map(d => d._id)).to.eql([4, 5]);
        done();
      });
      collection.remove({_id: 1});
    });

    it('should update when document matching query options is removed', (done) => {
      sut.on('item-set-updated', (docs, totalCount) => {
        expect(docs.length).to.eql(2);
        expect(totalCount).to.eql(2);
        expect(docs.map(d => d._id)).to.eql([4, 1]);
        done();
      });
      collection.remove({_id: 5});
    });

    it('should not update when document outside view is removed', (done) => {
      const spy = sandbox.spy();
      sut.on('item-set-updated', spy);

      collection.remove({_id: 2});

      setTimeout(() => {
        expect(spy).to.have.callCount(0);
        done();
      }, 500);
    });
  });

  describe('changing sorting order', () => {
    it('should update data', (done) => {
      expect(sut.data.map(d => d._id)).to.eql([2, 4]);

      sut.on('item-set-updated', docs => {
        expect(docs.map(d => d._id)).to.eql([1, 3]);
        done();
      });
      sut.sort = SortingOrder.Ascending;
    });
  });

  describe('changing selector', () => {
    it('should filter by category', (done) => {
      sut.on('item-set-updated', docs => {
        expect(docs.length).to.eql(2);
        expect(sut.totalCount).to.eql(2);
        expect(sut.excludedCount).to.eql(0);
        done();
      });
      sut.category = 'cookies';
    });
  });
});

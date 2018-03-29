import {bootstrap, component, provider, inject, Injector} from '@ziggurat/tiamat';
import {Isimud} from '../../src';
import {collection} from '../../src/database/decorators';
import {Collection, CollectionFactory, MemoryCollectionConfig} from '../../src/interfaces';
import {MemoryCollection} from '../../src/collections/memory';
import {Document} from '../../src/models/document';
import {Controller} from '../../src/database/controller';
import {expect} from 'chai';
import 'mocha';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Controller', async () => {
  let cache  = new MemoryCollection();
  let buffer = new MemoryCollection();
  let source = new MemoryCollection();

  @provider({
    key: 'isimud.MemoryCollectionFactory'
  })
  class MockCollectionFactory implements CollectionFactory<MemoryCollectionConfig> {
    public createCollection(name: string, config: MemoryCollectionConfig): Collection {
      if (name === 'test') {
        return cache;
      } else {
        return buffer;
      }
    }
  }

  @provider({
    key: 'test.Controller'
  })
  @collection({
    name: 'test',
    source: injector => source
  })
  class TestController extends Controller {
    public model = Document;
  }

  @component({
    dependencies: [Isimud],
    providers: [TestController, MockCollectionFactory],
  })
  class TestComponent {
    @inject('test.Controller') public controller: TestController;
  }

  let controller = (await bootstrap(TestComponent)).controller;

  describe('findOne', () => {
    const stub = sinon.stub(source, 'findOne');

    before(() => {
      return controller.remove({});
    });

    afterEach(() => {
      stub.reset();
    });

    it('should fail if document does not exist in source', async () => {
      stub.returns(Promise.reject(new Error()));

      return expect(controller.findOne({_id: 'bar'})).to.eventually.be.rejected;
    });

    it('should read uncached document from source and cache it', async () => {
      stub.returns(Promise.resolve(new Document('foo')));

      let doc = await controller.findOne({_id: 'foo'});

      expect(doc).to.include({_id: 'foo', _revision: 1});
      expect(cache.count()).to.eventually.equal(1);
    });

    it('should read cached document from cache', async () => {
      let doc = await controller.findOne({_id: 'foo'});

      expect(doc).to.include({_id: 'foo', _revision: 1});
      expect(stub).to.not.have.been.called;
    });
  });

  describe('find', () => {
    let stub: any;

    before(async () => {
      await controller.remove({});
      stub = sinon.stub(source, 'find');
    });

    afterEach(() => {
      stub.reset();
    });

    after(() => {
      stub.restore();
    });

    it('should read uncached documents from source', async () => {
      stub.returns([
        new Document('foo'),
        new Document('bar')
      ]);

      let docs = await controller.find();

      expect(docs).to.have.lengthOf(2);
    });

    it('should have added the documents to the cache', async () => {
      expect(await cache.count()).to.equal(2);
    });

    it('should read cached documents from cache', async () => {
      let docs = await controller.find();

      expect(docs).to.have.lengthOf(2);
      expect(stub).to.not.have.been.called;
    });
  });

  describe('upsert', () => {
    let stub: any;

    before(() => {
      stub = sinon.stub(source, 'upsert');
      return controller.remove({});
    });

    after(() => {
      stub.reset();
    });

    after(() => {
      stub.restore();
    });

    it('should add and return the document', async () => {
      let doc = await controller.upsert(new Document('foo'));

      expect(doc).to.include({_id: 'foo', _revision: 1});
    });

    it('should upsert the document to the cache', () => {
      return expect(cache.count()).to.eventually.equal(1);
    });

    it('should upsert the document to the source', () => {
      return expect(stub).to.have.been.calledOnce;
    });
  });

  describe('remove', () => {
    let stub: any;

    before(async () => {
      await controller.remove({});
      await controller.upsert(new Document('doc1'));
      await controller.upsert(new Document('doc2'));
      stub = sinon.stub(source, 'remove');
    });

    after(() => {
      stub.restore();
    });

    it('should remove a single document from the cache', async () => {
      await controller.remove({_id: 'doc1'});
      return expect(cache.count()).to.eventually.equal(1);
    });

    it('should remove the document from the source', () => {
      return expect(stub).to.have.been.calledOnce;
    });
  });

  describe('populate', () => {
    let stub: any;

    before(async () => {
      await controller.remove({});
      stub = sinon.stub(source, 'find');
    });

    afterEach(() => {
      stub.reset();
    });

    after(() => {
      stub.restore();
    });

    it('should load all documents from source into cache', async () => {
      stub.returns(Promise.resolve([
        new Document('foo'),
        new Document('bar')
      ]));

      await controller.populate();
      return expect(cache.count()).to.eventually.equal(2);
    });

    it('should make all subsequent querries look only in the cache', async () => {
      let docs = await controller.find();

      expect(docs).to.have.lengthOf(2);
      expect(stub).to.not.have.been.called;
    })
  });

  describe('source upsert', () => {
    before(() => {
      return controller.remove({});
    });

    it('should trigger document-upserted in controller', (done) => {
      controller.on('document-upserted', (doc: Document) => {
        controller.removeAllListeners();
        done();
      });

      source.upsert(new Document('doc1'));
    });

    it('should upsert the document to the cache', () => {
      return expect(controller.cache.count()).to.eventually.equal(1);
    });
  });

  describe('source remove', () => {
    before(async () => {
      await controller.remove({});
      await source.upsert(new Document('doc1'));
    });

    it('should trigger document-removed in controller', (done) => {
      controller.on('document-removed', (doc: Document) => {
        controller.removeAllListeners();
        done();
      });

      source.remove({_id: 'doc1'});
    });

    it('should remove the document from the cache', () => {
      return expect(cache.count()).to.eventually.equal(0);
    });
  });
});

import * as petitionHandler from './petitionHandler';
import axiosInstance from './axiosSetup';
import nodeAxiosInstance, { updateNodeAxiosBaseURL } from './nodeAxiosSetup';
import { vi } from "vitest";

vi.mock('./axiosSetup', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./nodeAxiosSetup', () => {
  const instance = { 
    get: vi.fn(), 
    post: vi.fn(),
    delete: vi.fn(),
  };
  return {
    __esModule: true,
    default: instance,
    updateNodeAxiosBaseURL: vi.fn(),
  };
});

describe('petitionHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getNodeList', () => {
    it('fetches /nodes/connect/list and returns data', async () => {
      axiosInstance.get.mockResolvedValue({ data: [{ id: 'n1' }] });
      const result = await petitionHandler.getNodeList();
      expect(axiosInstance.get).toHaveBeenCalledWith('/nodes/connect/list');
      expect(result).toEqual([{ id: 'n1' }]);
    });

    it('propagates errors', async () => {
      axiosInstance.get.mockRejectedValue(new Error('oops'));
      await expect(petitionHandler.getNodeList()).rejects.toThrow('oops');
    });
  });

  describe('getNodeInfo', () => {
    it('fetches node info and returns data', async () => {
      axiosInstance.get.mockResolvedValue({ data: { foo: 1 } });
      const data = await petitionHandler.getNodeInfo('abc');
      expect(axiosInstance.get)
        .toHaveBeenCalledWith('/nodes/connect/info/abc');
      expect(data).toEqual({ foo: 1 });
    });

    it('throws Error(response.data.error) when present', async () => {
      const err = { response: { data: { error: 'bad id' } } };
      axiosInstance.get.mockRejectedValue(err);
      await expect(petitionHandler.getNodeInfo('x'))
        .rejects.toThrow('bad id');
    });

    it('throws generic error otherwise', async () => {
      axiosInstance.get.mockRejectedValue(new TypeError('net'));
      await expect(petitionHandler.getNodeInfo('x'))
        .rejects.toThrow('net');
    });
  });

  describe('getNodeMetadata', () => {
    it('returns data on success', async () => {
      axiosInstance.get.mockResolvedValue({ data: { m: true } });
      await expect(petitionHandler.getNodeMetadata('n'))
        .resolves.toEqual({ m: true });
    });

    it('on 404 returns { metadata: null }', async () => {
      const e = { response: { status: 404 } };
      axiosInstance.get.mockRejectedValue(e);
      await expect(petitionHandler.getNodeMetadata('n'))
        .resolves.toEqual({ metadata: null });
    });

    it('throws Error(response.data.error) when other status', async () => {
      const e = { response: { status: 500, data: { error: 'oops' } } };
      axiosInstance.get.mockRejectedValue(e);
      await expect(petitionHandler.getNodeMetadata('n'))
        .rejects.toThrow('oops');
    });
  });

  describe('schema endpoints', () => {
    it('saveSchemaToBackend posts schema', async () => {
      axiosInstance.post.mockResolvedValue({ data: { ok: true } });
      const data = await petitionHandler.saveSchemaToBackend({ a: 1 });
      expect(axiosInstance.post)
        .toHaveBeenCalledWith('/nodes/schema', { schema: { a: 1 } });
      expect(data).toEqual({ ok: true });
    });

    it('fetchSchemaFromBackend gets schema', async () => {
      axiosInstance.get.mockResolvedValue({ data: { s: 2 } });
      await expect(petitionHandler.fetchSchemaFromBackend())
        .resolves.toEqual({ s: 2 });
    });

    it('removeSchemaFromBackend deletes schema', async () => {
      axiosInstance.delete.mockResolvedValue({ data: { deleted: true } });
      await expect(petitionHandler.removeSchemaFromBackend())
        .resolves.toEqual({ deleted: true });
    });
  });

  describe('RDF endpoints', () => {
    it('fetchClasses returns data', async () => {
      axiosInstance.get.mockResolvedValue({ data: ['A', 'B'] });
      await expect(petitionHandler.fetchClasses())
        .resolves.toEqual(['A', 'B']);
      expect(axiosInstance.get).toHaveBeenCalledWith('/rdf/class');
    });

    it('fetchClassFields encodes type', async () => {
      axiosInstance.get.mockResolvedValue({ data: { f: 3 } });
      const t = 'My Type';
      await expect(petitionHandler.fetchClassFields(t))
        .resolves.toEqual({ f: 3 });
      expect(axiosInstance.get)
        .toHaveBeenCalledWith(`/rdf/class/${encodeURIComponent(t)}`);
    });

    it('fetchSuggestions chooses endpoint by type', async () => {
      axiosInstance.get.mockResolvedValue({ data: [1, 2] });
      await expect(petitionHandler.fetchSuggestions('q', 'foo'))
        .resolves.toEqual([1, 2]);
      expect(axiosInstance.get).toHaveBeenCalledWith(
        '/rdf/class/suggestions/foo',
        { params: { query: 'q' } }
      );

      axiosInstance.get.mockClear();
      await expect(petitionHandler.fetchSuggestions('q', 'snomed'))
        .resolves.toEqual([1, 2]);
      expect(axiosInstance.get).toHaveBeenCalledWith(
        '/rdf/snomed',
        { params: { query: 'q' } }
      );
    });
  });

  describe('uploadSemanticMappingCsv & createInitialClusters', () => {
    it('uploadSemanticMappingCsv posts text/plain', async () => {
      axiosInstance.post.mockResolvedValue({ data: 123 });
      const res = await petitionHandler.uploadSemanticMappingCsv('csv text');
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/rdf/semanticalignment',
        'csv text',
        { headers: { 'Content-Type': 'text/plain;charset=utf-8' } }
      );
      expect(res).toBe(123);
    });

    it('createInitialClusters posts json', async () => {
      axiosInstance.post.mockResolvedValue({ data: { c: 4 } });
      const out = await petitionHandler.createInitialClusters({ foo: 'bar' });
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/fhir/clusters',
        { foo: 'bar' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      expect(out).toEqual({ c: 4 });
    });
  });

  describe('loginUser', () => {
    it('stores tokens on success', async () => {
      axiosInstance.post.mockResolvedValue({
        status: 200,
        data: { token: 't1', tgt: 't2' }
      });
      const data = await petitionHandler.loginUser('u', 'p');
      expect(localStorage.getItem('jwtToken')).toBe('t1');
      expect(localStorage.getItem('kerberosTGT')).toBe('t2');
      expect(data).toEqual({ token: 't1', tgt: 't2' });
    });

    it('throws on non-200', async () => {
      axiosInstance.post.mockResolvedValue({ status: 500 });
      await expect(petitionHandler.loginUser('u', 'p'))
        .rejects.toThrow('Login failed');
    });

    it('handles network errors', async () => {
      axiosInstance.post.mockRejectedValue(new Error('Network error'));
      await expect(petitionHandler.loginUser('u', 'p'))
        .rejects.toThrow('Network error');
    });
  });

  describe('nodeAuth', () => {
    const svc = 'http://node';
    beforeEach(() => {
      nodeAxiosInstance.post.mockReset();
      updateNodeAxiosBaseURL.mockClear();
    });

    it('on Unauthorized jwtNodeToken clears storage and throws', async () => {
      updateNodeAxiosBaseURL.mockClear();
      localStorage.setItem('jwtNodeTokens', '{"http://node":"old"}');

      nodeAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { jwtNodeToken: 'Unauthorized' }
      });

      await expect(
        petitionHandler.nodeAuth(svc, 'kt')
      ).rejects.toThrow('Received an Unauthorized jwtNodeToken. JWT has been removed.');

      expect(updateNodeAxiosBaseURL).toHaveBeenCalledWith(svc);
      expect(localStorage.getItem('jwtNodeTokens')).toBe('{}');
      expect(localStorage.getItem('jwtToken')).toBeNull();
    });

    it('on success stores mapping and returns data', async () => {
      nodeAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { jwtNodeToken: 'OK', otherData: 'value' }
      });
      const result = await petitionHandler.nodeAuth(svc, 'kt');
      expect(updateNodeAxiosBaseURL).toHaveBeenCalledWith(svc);
      const tokens = JSON.parse(localStorage.getItem('jwtNodeTokens'));
      expect(tokens[svc]).toBe('OK');
      expect(result).toEqual({ jwtNodeToken: 'OK', otherData: 'value' });
    });

    it('throws error on non-200 status', async () => {
      nodeAxiosInstance.post.mockResolvedValue({ status: 500 });
      await expect(petitionHandler.nodeAuth(svc, 'kt'))
        .rejects.toThrow('Node auth failed');
    });

    it('handles network errors', async () => {
      const networkError = new Error('Network error');
      nodeAxiosInstance.post.mockImplementationOnce(() => Promise.reject(networkError));
    
      await expect(petitionHandler.nodeAuth(svc, 'kt'))
        .rejects.toBe(networkError);
    });
  });

  describe('uploadFile, recalculateFeature, filterMultipleFiles', () => {
    it('uploadFile sends FormData and returns data', async () => {
      const fakeFile = new Blob(['x']);
      nodeAxiosInstance.post.mockResolvedValue({ data: { f: 5 } });
      const progressCallback = vi.fn();
      const out = await petitionHandler.uploadFile(fakeFile, progressCallback);
      expect(nodeAxiosInstance.post).toHaveBeenCalledWith(
        '/taniwha/api/data/process',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: progressCallback
        })
      );
      expect(out).toEqual({ f: 5 });
    });

    it('recalculateFeature appends params', async () => {
      nodeAxiosInstance.post.mockResolvedValue({ data: 'ok' });
      const out = await petitionHandler.recalculateFeature(
        'file', 'feat', 'type'
      );
      expect(nodeAxiosInstance.post).toHaveBeenCalledWith(
        '/taniwha/api/data/reprocessList',
        null,
        {
          params: new URLSearchParams({
            fileName: 'file',
            featureName: 'feat',
            featureType: 'type'
          })
        }
      );
      expect(out).toBe('ok');
    });

    it('filterMultipleFiles posts JSON', async () => {
      nodeAxiosInstance.post.mockResolvedValue({ data: [1, 2, 3] });
      const payload = { multipleFileFilters: [] };
      await expect(
        petitionHandler.filterMultipleFiles(payload)
      ).resolves.toEqual([1, 2, 3]);
      expect(nodeAxiosInstance.post).toHaveBeenCalledWith(
        '/taniwha/api/data/filterByNameList',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
    });
  });

  describe('other endpoints', () => {
    it('saveMockFile returns data', async () => {
      nodeAxiosInstance.post.mockResolvedValue({ data: 7 });
      const file = new Blob(['content']);
      await expect(petitionHandler.saveMockFile(file))
        .resolves.toBe(7);
      expect(nodeAxiosInstance.post).toHaveBeenCalledWith(
        '/taniwha/api/harmonization/mock',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    });

    it('setParseConfigs returns data', async () => {
      nodeAxiosInstance.post.mockResolvedValue({ data: 'cfg' });
      await expect(petitionHandler.setParseConfigs({ config: 'test' }))
        .resolves.toBe('cfg');
      expect(nodeAxiosInstance.post).toHaveBeenCalledWith(
        '/taniwha/api/harmonization/parse',
        { config: 'test' },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });

    it('getNodeDatasets returns data', async () => {
      nodeAxiosInstance.get.mockResolvedValue({ data: [9] });
      await expect(petitionHandler.getNodeDatasets()).resolves.toEqual([9]);
      expect(nodeAxiosInstance.get).toHaveBeenCalledWith(
        '/taniwha/api/files/datasets'
      );
    });

    it('getNodeMappedDatasets returns data', async () => {
      nodeAxiosInstance.get.mockResolvedValue({ data: [10] });
      await expect(petitionHandler.getNodeMappedDatasets()).resolves.toEqual([10]);
    });

    it('getNodeFHIR returns data', async () => {
      nodeAxiosInstance.get.mockResolvedValue({ data: [11] });
      await expect(petitionHandler.getNodeFHIR()).resolves.toEqual([11]);
    });

    it('getNodeElements returns data', async () => {
      nodeAxiosInstance.get.mockResolvedValue({ data: [12] });
      await expect(petitionHandler.getNodeElements()).resolves.toEqual([12]);
    });

    describe('processSelectedDatasets', () => {
      it('returns sync object when status is 200 without jobId', async () => {
        nodeAxiosInstance.post.mockResolvedValue({ data: 'p' });
        const result = await petitionHandler.processSelectedDatasets(['a']);
        expect(result).toEqual({ mode: "sync", results: 'p' });
      });

      it('returns async object when status is 202 with jobId', async () => {
        nodeAxiosInstance.post.mockResolvedValue({ 
          status: 202, 
          data: { jobId: '123', progress: true } 
        });
        const result = await petitionHandler.processSelectedDatasets(['a']);
        expect(result).toEqual({ 
          mode: "async", 
          jobId: '123', 
          progress: true 
        });
      });

      it('returns async object when data contains jobId regardless of status', async () => {
        nodeAxiosInstance.post.mockResolvedValue({ 
          data: { jobId: '456', progress: false } 
        });
        const result = await petitionHandler.processSelectedDatasets(['a']);
        expect(result).toEqual({ 
          mode: "async", 
          jobId: '456', 
          progress: false 
        });
      });
    });

    describe('processSelectedDatasets status and result', () => {
      it('getProcessSelectedDatasetsStatus fetches status', async () => {
        nodeAxiosInstance.get.mockResolvedValue({ data: { status: 'processing' } });
        const result = await petitionHandler.getProcessSelectedDatasetsStatus('job123');
        expect(result).toEqual({ status: 'processing' });
        expect(nodeAxiosInstance.get).toHaveBeenCalledWith(
          '/taniwha/api/data/processList/status/job123'
        );
      });

      it('getProcessSelectedDatasetsResult fetches result', async () => {
        nodeAxiosInstance.get.mockResolvedValue({ data: { result: 'data' } });
        const result = await petitionHandler.getProcessSelectedDatasetsResult('job123');
        expect(result).toEqual({ result: 'data' });
        expect(nodeAxiosInstance.get).toHaveBeenCalledWith(
          '/taniwha/api/data/processList/result/job123'
        );
      });
    });

    it('saveDatasetElements returns data', async () => {
      nodeAxiosInstance.post.mockResolvedValue({ data: 'ok' });
      const se = await petitionHandler.saveDatasetElements('f.csv', 'csv');
      expect(se).toBe('ok');
      expect(nodeAxiosInstance.post).toHaveBeenCalledWith(
        '/taniwha/api/files/save_dataset_elements',
        'csv',
        { 
          params: { fileName: 'f.csv' }, 
          headers: { 'Content-Type': 'text/plain' } 
        }
      );
    });

    it('fetchElementFile encodes filename', async () => {
      nodeAxiosInstance.get.mockResolvedValue({ data: { e: 1 } });
      await expect(
        petitionHandler.fetchElementFile('na me.csv')
      ).resolves.toEqual({ e: 1 });
      expect(nodeAxiosInstance.get).toHaveBeenCalledWith(
        `/taniwha/api/files/dataset_elements/${encodeURIComponent('na me.csv')}`
      );
    });
  });

  describe('explorer endpoints', () => {
    it('listExplorerFiles returns data with category param', async () => {
      nodeAxiosInstance.get.mockResolvedValue({ data: ['file1', 'file2'] });
      const result = await petitionHandler.listExplorerFiles('testCategory');
      expect(result).toEqual(['file1', 'file2']);
      expect(nodeAxiosInstance.get).toHaveBeenCalledWith(
        '/taniwha/api/files',
        { params: { category: 'testCategory' } }
      );
    });

    it('renameExplorerFile sends rename request', async () => {
      nodeAxiosInstance.post.mockResolvedValue({ data: 'renamed' });
      const result = await petitionHandler.renameExplorerFile('cat', 'old', 'new');
      expect(result).toBe('renamed');
      expect(nodeAxiosInstance.post).toHaveBeenCalledWith(
        '/taniwha/api/files/rename',
        null,
        { params: { category: 'cat', from: 'old', to: 'new' } }
      );
    });

    it('deleteExplorerFile sends delete request', async () => {
      nodeAxiosInstance.delete.mockResolvedValue({ data: 'deleted' });
      const result = await petitionHandler.deleteExplorerFile('cat', 'file');
      expect(result).toBe('deleted');
      expect(nodeAxiosInstance.delete).toHaveBeenCalledWith(
        '/taniwha/api/files',
        { params: { category: 'cat', name: 'file' } }
      );
    });

    it('cleanExplorerFile sends clean request', async () => {
      nodeAxiosInstance.post.mockResolvedValue({ data: 'cleaned' });
      const result = await petitionHandler.cleanExplorerFile('cat', 'file');
      expect(result).toBe('cleaned');
      expect(nodeAxiosInstance.post).toHaveBeenCalledWith(
        '/taniwha/api/files/clean',
        null,
        { params: { category: 'cat', name: 'file' } }
      );
    });
  });

  describe('logError', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      console.log = vi.fn();
      console.error = vi.fn();
    });

    it('posts the error and logs success when status is 200', async () => {
      axiosInstance.post.mockResolvedValue({ status: 200 });
      petitionHandler.logError(new Error('boom'), { ctx: 'test' });

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/api/error',
        expect.objectContaining({
          error: 'Error: boom',
          info: { ctx: 'test' },
          timestamp: expect.any(String),
        })
      );

      const p = axiosInstance.post.mock.results[0].value;
      await p;

      expect(console.log).toHaveBeenCalledWith('Error logged to server successfully.');
    });

    it('logs an unexpected‐status error when status !== 200', async () => {
      axiosInstance.post.mockResolvedValue({ status: 500 });
      petitionHandler.logError('uh oh', {});

      const p = axiosInstance.post.mock.results[0].value;
      await p;

      expect(console.error).toHaveBeenCalledWith(
        'Failed to log error to server. Unexpected response status:',
        500
      );
    });

    it('catches network failures and logs them', async () => {
      const netErr = new Error('network gone');
      axiosInstance.post.mockRejectedValue(netErr);
      petitionHandler.logError('uh oh', {});

      const p = axiosInstance.post.mock.results[0].value;
      await p.catch(() => { });

      expect(console.error).toHaveBeenCalledWith('Error logging to server:', netErr);
    });
  });

  describe('error handling for all endpoints', () => {
    it('propagates errors from axios calls', async () => {
      const testError = new Error('Test error');

      axiosInstance.get.mockRejectedValue(testError);
      await expect(petitionHandler.getNodeList()).rejects.toThrow('Test error');
      
      nodeAxiosInstance.post.mockRejectedValue(testError);
      await expect(petitionHandler.nodeAuth('url', 'token')).rejects.toThrow('Test error');

      nodeAxiosInstance.post.mockRejectedValue(testError);
      await expect(petitionHandler.uploadFile(new Blob())).rejects.toThrow('Test error');
    });
  });

});

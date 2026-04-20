import { describe, it, expect } from 'vitest';
import { buildMappingSpec } from './mappingSpec';

describe('buildMappingSpec', () => {
  it('returns the required top-level structure with empty mappings', () => {
    const result = buildMappingSpec({ mappings: [], schema: null, selectedDatasets: {} });

    expect(result).toMatchObject({
      specVersion: '2.0.0',
      ruleLanguage: 'json-logic',
      targetSchema: null,
      sources: [],
      datasetBindings: [],
      mappings: [],
    });
  });

  it('normalizes a JSON string schema', () => {
    const schema = JSON.stringify({ type: 'object', properties: { age: { type: 'integer' } } });
    const result = buildMappingSpec({ mappings: [], schema });
    expect(result.targetSchema).toEqual({ type: 'object', properties: { age: { type: 'integer' } } });
  });

  it('passes through an object schema as-is', () => {
    const schema = { type: 'object' };
    const result = buildMappingSpec({ mappings: [], schema });
    expect(result.targetSchema).toEqual({ type: 'object' });
  });

  it('returns null for an invalid JSON string schema', () => {
    const result = buildMappingSpec({ mappings: [], schema: 'not-json' });
    expect(result.targetSchema).toBeNull();
  });

  it('builds a standard mapping with exact-value entries', () => {
    const mappings = [
      {
        Status: {
          mappingType: 'standard',
          fileName: 'source.csv',
          terminology: 'SNOMED',
          description: 'Status field',
          groups: [
            {
              values: [
                {
                  name: 'Active',
                  terminology: 'SNOMED-A',
                  description: 'active',
                  mapping: [
                    { nodeId: 'n1', fileName: 'src.csv', groupColumn: 'col1', value: 'yes' },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    const result = buildMappingSpec({ mappings });
    expect(result.mappings).toHaveLength(1);

    const m = result.mappings[0];
    expect(m.id).toBe('map-0-Status');
    expect(m.targetField).toBe('Status');
    expect(m.mappingType).toBe('standard');
    expect(m.sourceConfigFile).toBe('source.csv');
    expect(m.metadata).toEqual({ terminology: 'SNOMED', description: 'Status field' });
    expect(m.removeSourceColumns).toBe(false);

    expect(m.rules).toHaveLength(1);
    const rule = m.rules[0];
    expect(rule.id).toBe('rule-0-0');
    expect(rule.then).toEqual({ kind: 'constant', value: 'Active' });
    expect(rule.logic).toEqual({
      '==': [{ var: 'n1::src.csv::col1' }, 'yes'],
    });
    expect(rule.metadata).toEqual({ terminology: 'SNOMED-A', description: 'active' });
  });

  it('builds a standard mapping with integer type logic', () => {
    const mappings = [
      {
        Age: {
          mappingType: 'standard',
          fileName: '',
          groups: [
            {
              values: [
                {
                  name: 'integer',
                  terminology: '',
                  description: '',
                  mapping: [
                    { nodeId: 'n1', fileName: 'data.csv', groupColumn: 'age_col', value: 'integer' },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    const result = buildMappingSpec({ mappings });
    const rule = result.mappings[0].rules[0];
    expect(rule.logic).toEqual({ is_integer: [{ var: 'n1::data.csv::age_col' }] });
    expect(rule.then).toEqual({ kind: 'source-value', sourceId: 'n1::data.csv', column: 'age_col' });
  });

  it('builds a standard mapping with double type logic', () => {
    const mappings = [
      {
        Score: {
          mappingType: 'standard',
          fileName: '',
          groups: [
            {
              values: [
                {
                  name: 'double',
                  terminology: '',
                  description: '',
                  mapping: [
                    { nodeId: 'n1', fileName: 'data.csv', groupColumn: 'score_col', value: 'double' },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    const result = buildMappingSpec({ mappings });
    const rule = result.mappings[0].rules[0];
    expect(rule.logic).toEqual({ is_number: [{ var: 'n1::data.csv::score_col' }] });
  });

  it('builds a standard mapping with date type logic', () => {
    const mappings = [
      {
        BirthDate: {
          mappingType: 'standard',
          fileName: '',
          groups: [
            {
              values: [
                {
                  name: 'date',
                  terminology: '',
                  description: '',
                  mapping: [
                    { nodeId: 'n1', fileName: 'data.csv', groupColumn: 'bdate', value: 'date' },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    const result = buildMappingSpec({ mappings });
    const rule = result.mappings[0].rules[0];
    expect(rule.logic).toEqual({ is_date: [{ var: 'n1::data.csv::bdate' }] });
  });

  it('builds a standard mapping with numeric range logic', () => {
    const mappings = [
      {
        Weight: {
          mappingType: 'standard',
          fileName: '',
          groups: [
            {
              values: [
                {
                  name: 'heavy',
                  terminology: '',
                  description: '',
                  mapping: [
                    {
                      nodeId: 'n1',
                      fileName: 'data.csv',
                      groupColumn: 'w',
                      value: { type: 'double', minValue: 50, maxValue: 200 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    const result = buildMappingSpec({ mappings });
    const rule = result.mappings[0].rules[0];
    expect(rule.logic).toEqual({
      and: [
        { '>=': [{ to_number: [{ var: 'n1::data.csv::w' }] }, 50] },
        { '<=': [{ to_number: [{ var: 'n1::data.csv::w' }] }, 200] },
      ],
    });
    expect(rule.then).toEqual({ kind: 'constant', value: 'heavy' });
  });

  it('builds a standard mapping with date range logic', () => {
    const mappings = [
      {
        EventDate: {
          mappingType: 'standard',
          fileName: '',
          groups: [
            {
              values: [
                {
                  name: 'in-period',
                  terminology: '',
                  description: '',
                  mapping: [
                    {
                      nodeId: 'n1',
                      fileName: 'data.csv',
                      groupColumn: 'edate',
                      value: { type: 'date', minValue: '2020-01-01', maxValue: '2023-12-31' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    const result = buildMappingSpec({ mappings });
    const rule = result.mappings[0].rules[0];
    expect(rule.logic).toEqual({
      and: [
        { '>=': [{ to_date: [{ var: 'n1::data.csv::edate' }] }, '2020-01-01'] },
        { '<=': [{ to_date: [{ var: 'n1::data.csv::edate' }] }, '2023-12-31'] },
      ],
    });
  });

  it('combines multiple entries for the same value using OR logic', () => {
    const mappings = [
      {
        Target: {
          mappingType: 'standard',
          fileName: '',
          groups: [
            {
              values: [
                {
                  name: 'X',
                  terminology: '',
                  description: '',
                  mapping: [
                    { nodeId: 'n1', fileName: 'f.csv', groupColumn: 'col', value: 'a' },
                    { nodeId: 'n1', fileName: 'f.csv', groupColumn: 'col', value: 'b' },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    const result = buildMappingSpec({ mappings });
    const rule = result.mappings[0].rules[0];
    expect(rule.logic).toEqual({
      or: [
        { '==': [{ var: 'n1::f.csv::col' }, 'a'] },
        { '==': [{ var: 'n1::f.csv::col' }, 'b'] },
      ],
    });
  });

  it('collects deduplicated sources from mapping entries', () => {
    const mappings = [
      {
        Target: {
          mappingType: 'standard',
          fileName: '',
          groups: [
            {
              values: [
                {
                  name: 'A',
                  terminology: '',
                  description: '',
                  mapping: [
                    { nodeId: 'n1', fileName: 'src.csv', groupColumn: 'c1', value: 'x' },
                    { nodeId: 'n1', fileName: 'src.csv', groupColumn: 'c2', value: 'y' },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    const result = buildMappingSpec({ mappings });
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({ sourceId: 'n1::src.csv', nodeId: 'n1', fileName: 'src.csv' });
  });

  it('collects deduplicated inputs at the mapping level', () => {
    const mappings = [
      {
        Target: {
          mappingType: 'standard',
          fileName: '',
          groups: [
            {
              values: [
                {
                  name: 'A',
                  terminology: '',
                  description: '',
                  mapping: [
                    { nodeId: 'n1', fileName: 'f.csv', groupColumn: 'c1', value: 'x' },
                    { nodeId: 'n1', fileName: 'f.csv', groupColumn: 'c1', value: 'y' },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    const result = buildMappingSpec({ mappings });
    expect(result.mappings[0].inputs).toHaveLength(1);
    expect(result.mappings[0].inputs[0]).toMatchObject({ sourceId: 'n1::f.csv', column: 'c1' });
  });

  it('builds dataset bindings from selectedDatasets', () => {
    const selectedDatasets = {
      'n1::config.csv': ['ds1', 'ds2'],
    };

    const result = buildMappingSpec({ mappings: [], selectedDatasets });
    expect(result.datasetBindings).toHaveLength(1);
    expect(result.datasetBindings[0]).toMatchObject({
      sourceId: 'n1::config.csv',
      nodeId: 'n1',
      elementFileName: 'config.csv',
      datasets: ['ds1', 'ds2'],
    });
  });

  it('deduplicates dataset values in bindings', () => {
    const selectedDatasets = {
      'n1::f.csv': ['ds1', 'ds1', 'ds2'],
    };

    const result = buildMappingSpec({ mappings: [], selectedDatasets });
    expect(result.datasetBindings[0].datasets).toEqual(['ds1', 'ds2']);
  });

  it('skips empty dataset bindings', () => {
    const selectedDatasets = { 'n1::f.csv': [] };
    const result = buildMappingSpec({ mappings: [], selectedDatasets });
    expect(result.datasetBindings).toHaveLength(0);
  });

  it('builds a one-hot mapping family', () => {
    const mappings = [
      {
        Sex_male: {
          mappingType: 'one-hot',
          fileName: '',
          terminology: '',
          description: '',
          groups: [
            {
              values: [
                {
                  name: '1',
                  terminology: '',
                  description: '',
                  mapping: [
                    { nodeId: 'n1', fileName: 'f.csv', groupColumn: 'sex', value: 'M' },
                  ],
                },
                { name: '0', terminology: '', description: '', mapping: [] },
              ],
            },
          ],
        },
        Sex_female: {
          mappingType: 'one-hot',
          fileName: '',
          terminology: '',
          description: '',
          groups: [
            {
              values: [
                {
                  name: '1',
                  terminology: '',
                  description: '',
                  mapping: [
                    { nodeId: 'n1', fileName: 'f.csv', groupColumn: 'sex', value: 'F' },
                  ],
                },
                { name: '0', terminology: '', description: '', mapping: [] },
              ],
            },
          ],
        },
      },
    ];

    const result = buildMappingSpec({ mappings });
    expect(result.mappings).toHaveLength(1);

    const m = result.mappings[0];
    expect(m.mappingType).toBe('one-hot');
    expect(m.groupName).toBe('Sex');
    expect(m.outputs).toHaveLength(2);

    const female = m.outputs.find((o) => o.targetField === 'Sex_female');
    expect(female).toBeDefined();
    expect(female.trueValue).toBe('1');
    expect(female.falseValue).toBe('0');
  });

  it('handles null or undefined value in mapping entries gracefully', () => {
    const mappings = [
      {
        Field: {
          mappingType: 'standard',
          fileName: '',
          groups: [
            {
              values: [
                {
                  name: null,
                  terminology: undefined,
                  description: null,
                  mapping: [
                    { nodeId: null, fileName: null, groupColumn: null, value: null },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    expect(() => buildMappingSpec({ mappings })).not.toThrow();
    const result = buildMappingSpec({ mappings });
    expect(result.mappings[0].rules[0].then).toEqual({ kind: 'constant', value: '' });
  });

  it('returns empty mappings when input is not an array', () => {
    const result = buildMappingSpec({ mappings: null });
    expect(result.mappings).toHaveLength(0);
    expect(result.sources).toHaveLength(0);
  });
});

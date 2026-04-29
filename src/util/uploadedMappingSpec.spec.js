import { describe, it, expect } from 'vitest';
import {
  analyzeUploadedSpecAvailability,
  applyUploadedSpecResolutions,
  collectRequiredColumnsBySource,
  normalizeUploadedSpec,
  collectSpecSources,
  reconcileMappingsWithColumnsData,
  rebuildMappingsFromSpec,
} from './uploadedMappingSpec';

function makeSpec(overrides = {}) {
  return {
    specVersion: '1.0',
    ruleLanguage: 'json-logic',
    targetSchema: 'TestSchema',
    sources: [],
    datasetBindings: [],
    mappings: [],
    ...overrides,
  };
}

describe('normalizeUploadedSpec', () => {
  it('throws when null', () => {
    expect(() => normalizeUploadedSpec(null)).toThrow();
  });

  it('throws when undefined', () => {
    expect(() => normalizeUploadedSpec(undefined)).toThrow();
  });

  it('throws when given an array', () => {
    expect(() => normalizeUploadedSpec([])).toThrow();
  });

  it('throws when object has no mappings array', () => {
    expect(() => normalizeUploadedSpec({ specVersion: '1.0' })).toThrow();
  });

  it('returns the spec unchanged when valid', () => {
    const spec = makeSpec();
    expect(normalizeUploadedSpec(spec)).toBe(spec);
  });
});

describe('collectSpecSources', () => {
  it('returns [] for empty spec', () => {
    expect(collectSpecSources(makeSpec())).toEqual([]);
  });

  it('collects sources from spec.sources', () => {
    const spec = makeSpec({ sources: [{ sourceId: 'node1::file.csv' }] });
    expect(collectSpecSources(spec)).toEqual([{ nodeId: 'node1', fileName: 'file.csv' }]);
  });

  it('collects sources from mappings[].inputs', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'field1',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [{ sourceId: 'node2::data.csv' }],
          rules: [],
        },
      ],
    });
    expect(collectSpecSources(spec)).toEqual([{ nodeId: 'node2', fileName: 'data.csv' }]);
  });

  it('collects sources from rule logic (== operator with var)', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'field1',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: { '==': [{ var: 'node3::file.csv::col' }, 'value1'] },
              then: { kind: 'constant', value: 'result' },
            },
          ],
        },
      ],
    });
    expect(collectSpecSources(spec)).toEqual([{ nodeId: 'node3', fileName: 'file.csv' }]);
  });

  it('collects sources from is_integer logic', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'field1',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: { is_integer: [{ var: 'nodeA::typeFile.csv::num' }] },
              then: { kind: 'constant', value: 'integer' },
            },
          ],
        },
      ],
    });
    expect(collectSpecSources(spec)).toEqual([{ nodeId: 'nodeA', fileName: 'typeFile.csv' }]);
  });

  it('collects sources from is_number logic', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'field1',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: { is_number: [{ var: 'nodeB::numFile.csv::dbl' }] },
              then: { kind: 'constant', value: 'double' },
            },
          ],
        },
      ],
    });
    expect(collectSpecSources(spec)).toEqual([{ nodeId: 'nodeB', fileName: 'numFile.csv' }]);
  });

  it('collects sources from is_date logic', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'field1',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: { is_date: [{ var: 'nodeC::dateFile.csv::dt' }] },
              then: { kind: 'constant', value: 'date' },
            },
          ],
        },
      ],
    });
    expect(collectSpecSources(spec)).toEqual([{ nodeId: 'nodeC', fileName: 'dateFile.csv' }]);
  });

  it('collects sources from and/range logic (to_number)', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'field1',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: {
                and: [
                  { '>=': [{ to_number: [{ var: 'nodeD::rangeFile.csv::val' }] }, 10] },
                  { '<=': [{ to_number: [{ var: 'nodeD::rangeFile.csv::val' }] }, 20] },
                ],
              },
              then: { kind: 'constant', value: 'range' },
            },
          ],
        },
      ],
    });
    expect(collectSpecSources(spec)).toEqual([{ nodeId: 'nodeD', fileName: 'rangeFile.csv' }]);
  });

  it('collects sources from and/range logic (to_date)', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'field1',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: {
                and: [
                  { '>=': [{ to_date: [{ var: 'nodeE::drange.csv::dval' }] }, '2020-01-01'] },
                  { '<=': [{ to_date: [{ var: 'nodeE::drange.csv::dval' }] }, '2022-12-31'] },
                ],
              },
              then: { kind: 'constant', value: 'date-range' },
            },
          ],
        },
      ],
    });
    expect(collectSpecSources(spec)).toEqual([{ nodeId: 'nodeE', fileName: 'drange.csv' }]);
  });

  it('collects sources from one-hot outputs logic', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          groupName: 'group1',
          mappingType: 'one-hot',
          outputs: [
            {
              targetField: 'field_hot',
              trueValue: '1',
              falseValue: '0',
              logic: { '==': [{ var: 'nodeF::hotFile.csv::col' }, 'yes'] },
            },
          ],
        },
      ],
    });
    expect(collectSpecSources(spec)).toEqual([{ nodeId: 'nodeF', fileName: 'hotFile.csv' }]);
  });

  it('deduplicates sources', () => {
    const spec = makeSpec({
      sources: [{ sourceId: 'nodeX::dup.csv' }],
      mappings: [
        {
          id: 'm1',
          targetField: 'field1',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [{ sourceId: 'nodeX::dup.csv' }],
          rules: [
            {
              id: 'r1',
              logic: { '==': [{ var: 'nodeX::dup.csv::col' }, 'val'] },
              then: { kind: 'constant', value: 'v' },
            },
          ],
        },
      ],
    });
    const sources = collectSpecSources(spec);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toEqual({ nodeId: 'nodeX', fileName: 'dup.csv' });
  });

  it('ignores entries with missing nodeId or fileName', () => {
    const spec = makeSpec({
      sources: [{ sourceId: 'onlyFileName' }],
      mappings: [
        {
          id: 'm1',
          targetField: 'field1',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [{ sourceId: 'onlyFileName' }],
          rules: [],
        },
      ],
    });
    expect(collectSpecSources(spec)).toEqual([]);
  });
});

describe('rebuildMappingsFromSpec', () => {
  it('returns [] for empty spec', () => {
    expect(rebuildMappingsFromSpec(makeSpec())).toEqual([]);
  });

  it('rebuilds standard mapping from exact-value rule (== logic)', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'status',
          mappingType: 'standard',
          sourceConfigFile: 'myConfig',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: { '==': [{ var: 'node1::file.csv::code' }, 'A'] },
              then: { kind: 'constant', value: 'Active' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('status');
    const m = result[0]['status'];
    expect(m.mappingType).toBe('standard');
    expect(m.fileName).toBe('myConfig');
    expect(m.groups[0].values[0].name).toBe('Active');
    expect(m.groups[0].values[0].mapping[0].value).toBe('A');
  });

  it('rebuilds standard mapping from integer rule (is_integer logic) → value is "integer"', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'age',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: { is_integer: [{ var: 'node1::file.csv::age_col' }] },
              then: { kind: 'constant', value: 'Integer' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    expect(result).toHaveLength(1);
    expect(result[0]['age'].groups[0].values[0].mapping[0].value).toBe('integer');
  });

  it('rebuilds standard mapping from double rule (is_number logic) → value is "double"', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'score',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: { is_number: [{ var: 'node1::file.csv::score_col' }] },
              then: { kind: 'constant', value: 'Double' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    expect(result[0]['score'].groups[0].values[0].mapping[0].value).toBe('double');
  });

  it('rebuilds standard mapping from date rule (is_date logic) → value is "date"', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'dob',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: { is_date: [{ var: 'node1::file.csv::date_col' }] },
              then: { kind: 'constant', value: 'Date' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    expect(result[0]['dob'].groups[0].values[0].mapping[0].value).toBe('date');
  });

  it('rebuilds standard mapping from numeric range (and with to_number) → value is {type:"double", minValue, maxValue}', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'bmi',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: {
                and: [
                  { '>=': [{ to_number: [{ var: 'node1::file.csv::bmi_col' }] }, 18.5] },
                  { '<=': [{ to_number: [{ var: 'node1::file.csv::bmi_col' }] }, 25] },
                ],
              },
              then: { kind: 'constant', value: 'Normal' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    const val = result[0]['bmi'].groups[0].values[0].mapping[0].value;
    expect(val).toEqual({ type: 'double', minValue: 18.5, maxValue: 25 });
  });

  it('rebuilds standard mapping from date range (and with to_date) → value is {type:"date", minValue, maxValue}', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'eventDate',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: {
                and: [
                  { '>=': [{ to_date: [{ var: 'node1::file.csv::date_col' }] }, '2020-01-01'] },
                  { '<=': [{ to_date: [{ var: 'node1::file.csv::date_col' }] }, '2022-12-31'] },
                ],
              },
              then: { kind: 'constant', value: 'InRange' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    const val = result[0]['eventDate'].groups[0].values[0].mapping[0].value;
    expect(val).toEqual({ type: 'date', minValue: '2020-01-01', maxValue: '2022-12-31' });
  });

  it('rebuilds standard mapping from OR logic (multiple entries)', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'gender',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: {
                or: [
                  { '==': [{ var: 'node1::file.csv::gender_col' }, 'M'] },
                  { '==': [{ var: 'node1::file.csv::gender_col' }, 'Male'] },
                ],
              },
              then: { kind: 'constant', value: 'Male' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    const mapping = result[0]['gender'].groups[0].values[0].mapping;
    expect(mapping).toHaveLength(2);
    expect(mapping.map((e) => e.value)).toEqual(['M', 'Male']);
  });

  it('handles rule with null logic gracefully (produces entry with empty mapping)', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'field1',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: null,
              then: { kind: 'constant', value: 'SomeValue' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    expect(result).toHaveLength(1);
    const m = result[0]['field1'];
    expect(m.groups[0].values[0].mapping).toEqual([]);
    expect(m.groups[0].values[0].name).toBe('SomeValue');
  });

  it('rebuilds one-hot mapping with true/false outputs', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          groupName: 'diagnosis',
          mappingType: 'one-hot',
          outputs: [
            {
              targetField: 'has_diabetes',
              trueValue: '1',
              falseValue: '0',
              logic: { '==': [{ var: 'node1::file.csv::diag' }, 'DM2'] },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('has_diabetes');
    const m = result[0]['has_diabetes'];
    expect(m.mappingType).toBe('one-hot');
    expect(m.groups[0].values[0].name).toBe('1');
    expect(m.groups[0].values[1].name).toBe('0');
    expect(m.groups[0].values[0].mapping[0].value).toBe('DM2');
  });

  it('skips standard mappings with no targetField', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: '',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [],
        },
      ],
    });
    expect(rebuildMappingsFromSpec(spec)).toEqual([]);
  });

  it('skips one-hot mappings with no groupName', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          groupName: '',
          mappingType: 'one-hot',
          outputs: [
            {
              targetField: 'field_hot',
              logic: { '==': [{ var: 'node1::file.csv::col' }, 'X'] },
            },
          ],
        },
      ],
    });
    expect(rebuildMappingsFromSpec(spec)).toEqual([]);
  });

  it('uses "custom_mapping" as fileName when sourceConfigFile is empty', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'field1',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    expect(result[0]['field1'].fileName).toBe('custom_mapping');
  });

  // -----------------------------------------------------------------------
  // right.var branch — logic["=="] with the var on the RIGHT side
  // -----------------------------------------------------------------------
  it('rebuilds standard mapping when var is on the right side of == (constant == var)', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'status',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            {
              id: 'r1',
              // constant == var  (right has var, left is constant)
              logic: { '==': ['Active', { var: 'node1::file.csv::code' }] },
              then: { kind: 'constant', value: 'Active' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    expect(result).toHaveLength(1);
    const val = result[0]['status'].groups[0].values[0];
    expect(val.mapping[0].value).toBe('Active');   // left (the constant) becomes the value
    expect(val.mapping[0].groupColumn).toBe('code');
  });

  // -----------------------------------------------------------------------
  // and clause with missing lower or upper → returns []
  // -----------------------------------------------------------------------
  it('and clause with only >= (no <=) returns no entries', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'age',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            {
              id: 'r1',
              // Only >= present, no <= → lower is set but upper is null → returns []
              logic: {
                and: [
                  { '>=': [{ to_number: [{ var: 'node1::file.csv::age' }] }, 18] },
                ],
              },
              then: { kind: 'constant', value: 'Adult' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    // Entry is built but with empty mapping array (no entries from and-logic)
    const val = result[0]['age'].groups[0].values[0];
    expect(val.mapping).toEqual([]);
  });

  it('and clause with mismatched vars returns no entries', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'score',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            {
              id: 'r1',
              // lowerVar !== upperVar → returns []
              logic: {
                and: [
                  { '>=': [{ to_number: [{ var: 'n1::f.csv::col_a' }] }, 10] },
                  { '<=': [{ to_number: [{ var: 'n1::f.csv::col_b' }] }, 20] },
                ],
              },
              then: { kind: 'constant', value: 'Mid' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    const val = result[0]['score'].groups[0].values[0];
    expect(val.mapping).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // buildGroupsFromLoadedEntries deduplication
  // -----------------------------------------------------------------------
  it('deduplicates identical string values within the same group', () => {
    // Two rules with the same (nodeId, fileName, column, value) → only one entry
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'status',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            {
              id: 'r1',
              logic: { '==': [{ var: 'n1::file.csv::code' }, 'A'] },
              then: { kind: 'constant', value: 'Active' },
            },
            {
              id: 'r2',
              // same var and same constant value → duplicate entry
              logic: { '==': [{ var: 'n1::file.csv::code' }, 'A'] },
              then: { kind: 'constant', value: 'Active2' },
            },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    // columns should contain 'code' exactly once despite two rules sharing it
    expect(result[0]['status'].columns).toEqual(['code']);
  });

  it('deduplicates identical range values (object) within the same group', () => {
    const rangeLogic = {
      and: [
        { '>=': [{ to_number: [{ var: 'n1::f.csv::val' }] }, 5] },
        { '<=': [{ to_number: [{ var: 'n1::f.csv::val' }] }, 10] },
      ],
    };
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'range',
          mappingType: 'standard',
          sourceConfigFile: 'cfg',
          inputs: [],
          rules: [
            { id: 'r1', logic: rangeLogic, then: { kind: 'constant', value: 'Low' } },
            { id: 'r2', logic: rangeLogic, then: { kind: 'constant', value: 'Low2' } },
          ],
        },
      ],
    });

    const result = rebuildMappingsFromSpec(spec);
    // columns should contain 'val' exactly once
    expect(result[0]['range'].columns).toEqual(['val']);
  });
});

describe('analyzeUploadedSpecAvailability', () => {
  it('separates resolved sources from missing-file and missing-node references', () => {
    const spec = makeSpec({
      sources: [{ sourceId: 'node1::present.csv' }],
      mappings: [
        {
          targetField: 'status',
          mappingType: 'standard',
          inputs: [{ sourceId: 'node2::missing.csv' }],
          rules: [
            {
              logic: { '==': [{ var: 'node3::ghost.csv::code' }, 'A'] },
              then: { kind: 'constant', value: 'Active' },
            },
          ],
        },
      ],
    });

    const result = analyzeUploadedSpecAvailability(
      spec,
      [
        { nodeId: 'node1', name: 'Node 1' },
        { nodeId: 'node2', name: 'Node 2' },
      ],
      [
        { nodeId: 'node1', files: ['present.csv'] },
        { nodeId: 'node2', files: ['other.csv'] },
      ]
    );

    expect(result.requiresResolution).toBe(true);
    expect(result.resolved).toEqual([
      {
        nodeId: 'node1',
        fileName: 'present.csv',
        sourceId: 'node1::present.csv',
      },
    ]);
    expect(result.missing).toEqual([
      {
        sourceId: 'node2::missing.csv',
        nodeId: 'node2',
        fileName: 'missing.csv',
        reason: 'missing-file',
        candidateNodes: [
          {
            nodeId: 'node2',
            nodeName: 'Node 2',
            files: ['other.csv'],
          },
        ],
      },
      {
        sourceId: 'node3::ghost.csv',
        nodeId: 'node3',
        fileName: 'ghost.csv',
        reason: 'missing-node',
        candidateNodes: [
          {
            nodeId: 'node1',
            nodeName: 'Node 1',
            files: ['present.csv'],
          },
          {
            nodeId: 'node2',
            nodeName: 'Node 2',
            files: ['other.csv'],
          },
        ],
      },
    ]);
  });
});

describe('applyUploadedSpecResolutions', () => {
  it('rewrites sources, dataset bindings, inputs, logic vars, and output refs', () => {
    const spec = makeSpec({
      sources: [
        {
          sourceId: 'node-old::source.csv',
          nodeId: 'node-old',
          fileName: 'source.csv',
        },
      ],
      datasetBindings: [
        {
          sourceId: 'node-old::source.csv',
          nodeId: 'node-old',
          elementFileName: 'source.csv',
        },
      ],
      mappings: [
        {
          targetField: 'status',
          mappingType: 'standard',
          inputs: [{ sourceId: 'node-old::source.csv' }],
          rules: [
            {
              then: {
                kind: 'copy',
                sourceId: 'node-old::source.csv',
              },
              logic: {
                direct: { var: 'node-old::source.csv::code' },
                wrapped: { var: ['node-old::source.csv::status'] },
                untouched: { var: 'plain_column' },
              },
            },
          ],
          outputs: [
            {
              logic: {
                nested: { var: 'node-old::source.csv::result_col' },
              },
            },
          ],
        },
      ],
    });

    const result = applyUploadedSpecResolutions(spec, {
      'node-old::source.csv': {
        sourceId: 'node-new::replacement.csv',
      },
    });

    expect(result.sources).toEqual([
      {
        sourceId: 'node-new::replacement.csv',
        nodeId: 'node-new',
        fileName: 'replacement.csv',
      },
    ]);
    expect(result.datasetBindings).toEqual([
      {
        sourceId: 'node-new::replacement.csv',
        nodeId: 'node-new',
        elementFileName: 'replacement.csv',
      },
    ]);
    expect(result.mappings[0].inputs).toEqual([
      {
        sourceId: 'node-new::replacement.csv',
      },
    ]);
    expect(result.mappings[0].rules[0].then.sourceId).toBe('node-new::replacement.csv');
    expect(result.mappings[0].rules[0].logic.direct.var).toBe('node-new::replacement.csv::code');
    expect(result.mappings[0].rules[0].logic.wrapped.var[0]).toBe('node-new::replacement.csv::status');
    expect(result.mappings[0].rules[0].logic.untouched.var).toBe('plain_column');
    expect(result.mappings[0].outputs[0].logic.nested.var).toBe('node-new::replacement.csv::result_col');

    expect(spec.sources[0].sourceId).toBe('node-old::source.csv');
  });
});

describe('reconcileMappingsWithColumnsData', () => {
  it('drops unavailable mapping entries and recalculates the mapped columns list', () => {
    const mappings = [
      {
        status: {
          columns: ['stale'],
          groups: [
            {
              column: 'status',
              values: [
                {
                  name: 'Active',
                  mapping: [
                    {
                      nodeId: 'node1',
                      fileName: 'file.csv',
                      groupColumn: 'code',
                      value: 'A',
                    },
                    {
                      nodeId: 'node1',
                      fileName: 'file.csv',
                      groupColumn: 'missing',
                      value: 'B',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    const result = reconcileMappingsWithColumnsData(mappings, [
      { nodeId: 'node1', fileName: 'file.csv', column: 'code' },
    ]);

    expect(result[0].status.groups[0].values[0].mapping).toEqual([
      {
        nodeId: 'node1',
        fileName: 'file.csv',
        groupColumn: 'code',
        value: 'A',
      },
    ]);
    expect(result[0].status.columns).toEqual(['code']);
  });
});

describe('collectRequiredColumnsBySource', () => {
  it('groups unique required columns by source across rules and one-hot outputs', () => {
    const spec = makeSpec({
      mappings: [
        {
          targetField: 'status',
          mappingType: 'standard',
          rules: [
            {
              logic: {
                or: [
                  { '==': [{ var: 'node1::file.csv::code' }, 'A'] },
                  { is_integer: [{ var: 'node1::file.csv::age' }] },
                  { '==': [{ var: 'node1::file.csv::code' }, 'B'] },
                ],
              },
              then: { kind: 'constant', value: 'Active' },
            },
          ],
        },
        {
          groupName: 'visits',
          mappingType: 'one-hot',
          outputs: [
            {
              targetField: 'recent_visit',
              logic: {
                and: [
                  { '>=': [{ to_date: [{ var: 'node2::visits.csv::visit_date' }] }, '2024-01-01'] },
                  { '<=': [{ to_date: [{ var: 'node2::visits.csv::visit_date' }] }, '2024-12-31'] },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(collectRequiredColumnsBySource(spec)).toEqual({
      'node1::file.csv': ['code', 'age'],
      'node2::visits.csv': ['visit_date'],
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Branch coverage for uncovered lines: 35, 57-58, 100, 203
// ──────────────────────────────────────────────────────────────────────────────

describe('collectSpecSources – branch gaps', () => {
  // Line 35: parseVarName with no "::" separator returns column=raw, empty ids
  it('handles a rule var name without "::" separator (no sourceId part)', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'field',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [
            {
              id: 'r1',
              // varName has no "::" so parseVarName returns empty nodeId/fileName
              logic: { '==': [{ var: 'bareColumn' }, 'X'] },
              then: { kind: 'constant', value: 'X' },
            },
          ],
        },
      ],
    });
    // Should not throw; it just collects an entry with empty nodeId/fileName
    const sources = collectSpecSources(spec);
    expect(sources).toEqual([]);
  });

  // Lines 57-58: unwrapJsonLogicArgs receives Array and null/undefined
  it('collects sources when rule logic is an or-of-arrays (triggers Array.isArray path)', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'f',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [
            {
              id: 'r1',
              // or whose value is an array (triggers the Array.isArray branch in unwrapJsonLogicArgs)
              logic: { or: [{ '==': [{ var: 'n1::file.csv::col' }, 'A'] }, { '==': [{ var: 'n1::file.csv::col' }, 'B'] }] },
              then: { kind: 'constant', value: 'A' },
            },
          ],
        },
      ],
    });
    const sources = collectSpecSources(spec);
    expect(sources).toEqual([{ nodeId: 'n1', fileName: 'file.csv' }]);
  });

  // Line 58: unwrapJsonLogicArgs with null → returns []
  it('handles is_integer rule whose logic value wraps null argument (no var key)', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'f',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [
            {
              id: 'r1',
              // is_integer with null as the argument → unwrapJsonLogicArgs(null) returns []
              logic: { is_integer: null },
              then: { kind: 'constant', value: 'integer' },
            },
          ],
        },
      ],
    });
    const sources = collectSpecSources(spec);
    // null arg → refArg is undefined → early return []
    expect(sources).toEqual([]);
  });

  // Line 100: extractLogicEntries returns [] for "==" when neither side has .var
  it('ignores == rule where neither operand is a var reference', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'f',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [
            {
              id: 'r1',
              // Both operands are literals, not vars → hits the final "return []" at line 100
              logic: { '==': ['literal_a', 'literal_b'] },
              then: { kind: 'constant', value: 'A' },
            },
          ],
        },
      ],
    });
    const sources = collectSpecSources(spec);
    expect(sources).toEqual([]);
  });

  // Line 203: extractLogicEntries returns [] when and-range logic doesn't match expected pattern
  it('returns [] for and-logic that has only one clause (incomplete range)', () => {
    const spec = makeSpec({
      mappings: [
        {
          id: 'm1',
          targetField: 'f',
          mappingType: 'standard',
          sourceConfigFile: '',
          inputs: [],
          rules: [
            {
              id: 'r1',
              // and with only one entry – can't build a range → returns []
              logic: { and: [{ '>=': [{ to_number: [{ var: 'n1::f.csv::v' }] }, 5] }] },
              then: { kind: 'constant', value: 'Low' },
            },
          ],
        },
      ],
    });
    const sources = collectSpecSources(spec);
    expect(sources).toEqual([]);
  });
});

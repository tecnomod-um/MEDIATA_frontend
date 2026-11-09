import {expect, it} from 'vitest';
import {statisticsCsvRows, statisticsObjectsCsv} from './statisticsCsv';

it('neutralises formulas hidden behind leading whitespace or newlines', () => {
  for (const value of ['=SUM(A1)', ' +cmd', '\n=SUM(A1)', '\t@SUM(A1)', '-A1', '\r=SUM(A1)']) {
    expect(statisticsCsvRows([[value]])).toBe(`"'${value}"`);
  }
});

it('preserves small negative numerical results in scientific notation', () => {
  expect(statisticsCsvRows([[-1.23e-8, -42, 'Age', 'a"b']]))
    .toBe('"-1.23e-8","-42","Age","a""b"');
});

it('keeps commas, quotes and category JSON in their own cells for individual exports too', () => {
  const csv=statisticsObjectsCsv([{Name:'=SUM(A1)',CategoryCounts:JSON.stringify({'a,b':6,'c"d':12}),Value:-.01}]);
  expect(csv).toBe('"Name","CategoryCounts","Value"\r\n"\'=SUM(A1)","{""a,b"":6,""c\\""d"":12}","-0.01"');
  expect(statisticsObjectsCsv([])).toBe('');
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import DataExporter from './dataExporter';

const { mockStatisticsObjectsCsv } = vi.hoisted(() => ({
  mockStatisticsObjectsCsv: vi.fn(() => 'csv-content'),
}));

vi.mock('../../../util/statisticsCsv', async importOriginal => ({
  ...await importOriginal(),
  statisticsObjectsCsv: mockStatisticsObjectsCsv,
}));

describe('<DataExporter />', () => {
  const sampleData = {
    continuousFeatures: [
      {
        featureName: 'len',
        count: 2,
        mean: 1.5,
        stdDev: 0.7,
        min: 1,
        qrt1: 1.25,
        median: 1.5,
        qrt3: 1.75,
        max: 2,
        missingValuesCount: 0,
      },
    ],
    dateFeatures: [
      {
        featureName: 'd',
        count: 2,
        mean: null,
        stdDev: null,
        earliestDate: '2020-01-01',
        q1: null,
        median: null,
        q3: null,
        latestDate: '2020-12-31',
        missingValuesCount: 0,
      },
    ],
    categoricalFeatures: [
      {
        featureName: 'col',
        count: 3,
        mode: 'A',
        modeFrequency: 2,
        modeFrequencyPercentage: 66.67,
        secondMode: 'B',
        secondModeFrequency: 1,
        secondModePercentage: 33.33,
        missingValuesCount: 0,
        categoryCounts: { A: 2, B: 1 },
      },
    ],
  };

  let linkMocks;
  let origCreateElement;
  let origAppendChild;

  beforeEach(() => {
    mockStatisticsObjectsCsv.mockClear();
    linkMocks = [];

    origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        const link = {
          href: '',
          download: '',
          style: {},
          click: vi.fn(),
        };
        linkMocks.push(link);
        return link;
      }
      return origCreateElement(tag);
    });

    origAppendChild = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof Element) {
        return origAppendChild(node);
      }
      return node;
    });

    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    vi.spyOn(global.URL, 'createObjectURL').mockImplementation(() => 'blob:url');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the existing export button for the current combined table rows', () => {
    render(<DataExporter data={sampleData} statisticsExport={{ features: [], cohort: 'cluster = 1' }} />);
    fireEvent.click(screen.getByRole('button', { name: /export statistics/i }));
    expect(linkMocks).toHaveLength(1);
    expect(linkMocks[0].download).toBe('combined_statistics.csv');
    expect(mockStatisticsObjectsCsv).not.toHaveBeenCalled();
  });

  it('exports relationships instead of pooled features when the aggregate view is active', () => {
    render(<DataExporter data={sampleData} statisticsExport={{ features: [] }} relationshipExport={{
      data: { covariances: { Age: { Score: 2 }, Score: { Age: 2 } } },
    }} />);
    fireEvent.click(screen.getByRole('button', { name: /export statistics/i }));
    expect(linkMocks).toHaveLength(1);
    expect(linkMocks[0].download).toBe('relationship_statistics.csv');
    expect(mockStatisticsObjectsCsv).not.toHaveBeenCalled();
  });

  it('exports the visible feature set instead of restoring hidden features', () => {
    render(<DataExporter data={sampleData} filteredData={{ ...sampleData, continuousFeatures: [] }} />);
    fireEvent.click(screen.getByRole('button', { name: /export statistics/i }));
    expect(mockStatisticsObjectsCsv.mock.calls[0][0].some(feature => feature.Name === 'len')).toBe(false);
  });

  it('renders a button and downloads two CSVs on click', () => {
    render(<DataExporter data={sampleData} filteredData={[]} />);

    const btn = screen.getByRole('button', {
      name: /export statistics data to csv files/i,
    });

    fireEvent.click(btn);

    expect(mockStatisticsObjectsCsv).toHaveBeenCalledTimes(2);
    expect(linkMocks).toHaveLength(2);
    expect(linkMocks[0].download).toBe('continuous_data.csv');
    expect(linkMocks[1].download).toBe('categorical_data.csv');
    expect(linkMocks[0].click).toHaveBeenCalled();
    expect(linkMocks[1].click).toHaveBeenCalled();
  });

  it('includes mean and stdDev in CSV when dateFeature has them', () => {
    const dataWithDateValues = {
      ...sampleData,
      dateFeatures: [
        {
          featureName: 'eventDate',
          count: 5,
          mean: 1710000000,     // truthy → .toString() branch
          stdDev: 2.3456,       // truthy → .toFixed(2) branch
          earliestDate: '2022-01-01',
          q1: '2022-03-01',
          median: '2022-06-01',
          q3: '2022-09-01',
          latestDate: '2022-12-31',
          missingValuesCount: 1,
        },
      ],
    };

    render(<DataExporter data={dataWithDateValues} filteredData={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    // Both date CSV calls were made
    expect(mockStatisticsObjectsCsv).toHaveBeenCalledTimes(2);
    // The continuous/date row should have non-N/A values
    const dateRow = mockStatisticsObjectsCsv.mock.calls[0][0].find(
      (r) => r.Name === 'eventDate'
    );
    expect(dateRow.Mean).toBe('1710000000');
    expect(dateRow['Std. Dev.']).toBe('2.35');
  });

  it('uses "N/A" for null categorical fields', () => {
    const dataWithNullCat = {
      continuousFeatures: [],
      dateFeatures: [],
      categoricalFeatures: [
        {
          featureName: 'status',
          count: 10,
          mode: null,               // → "N/A"
          modeFrequency: null,      // → "N/A"
          modeFrequencyPercentage: null, // → "N/A"
          secondMode: null,         // → "N/A"
          secondModeFrequency: null, // → "N/A"
          secondModePercentage: null, // → "N/A"
          missingValuesCount: 2,
          categoryCounts: {},
        },
      ],
    };

    render(<DataExporter data={dataWithNullCat} filteredData={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    const catRow = mockStatisticsObjectsCsv.mock.calls[1][0][0];
    expect(catRow.Mode).toBe('N/A');
    expect(catRow['Mode Frequency']).toBe('N/A');
    expect(catRow['Mode %']).toBe('N/A');
    expect(catRow['2nd Mode']).toBe('N/A');
    expect(catRow['2nd Mode Frequency']).toBe('N/A');
    expect(catRow['2nd Mode %']).toBe('N/A');
  });});

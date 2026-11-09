import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import AggregateDisplay from './aggregateDisplay';

const matrix2x2 = (diag, off) => ({
  age: { age: diag, weight: off },
  weight: { age: off, weight: diag },
});

const COV = matrix2x2(12.3, 3.33);
const PEAR = matrix2x2(1.0, 0.81);
const SPEAR = matrix2x2(1.0, 0.77);

const CHI = [
  { category1: 'smoker', category2: 'disease', pvalue: 0.008978 },
];

const OMIT = [
  { featureName: 'zipcode', reason: 'Too many missing', percentMissing: 93.12 },
];

afterEach(cleanup);

describe('AggregateDisplay', () => {
  test('shows small p-values without rounding them to zero and normalizes display-only negative zero', () => {
    render(<AggregateDisplay covariances={{ X: { X: 1, Y: -1e-15 }, Y: { X: -1e-15, Y: 2 } }}
      chiSquareTest={[{ category1: 'A', category2: 'B', pvalue: 4.26e-12 }]} />);
    expect(screen.getByText('4.26e-12')).toBeInTheDocument();
    expect(screen.queryByText('-0.00')).not.toBeInTheDocument();
  });
  test('uses pooled cell counts and suppression reasons as tooltips within the original matrix', () => {
    render(<AggregateDisplay covariances={{ Age: { Age: 4, FIM: null }, FIM: { Age: null, FIM: 9 } }}
      relationshipDetails={{ covariance: { Age: { Age: { count: 24, datasets: ['Alpha', 'Beta'] }, FIM: { reason: 'Paired statistics suppressed' } } } }} />);
    expect(screen.getByTitle('24 paired observations · Alpha; Beta')).toHaveTextContent('4.00');
    expect(screen.getByTitle('Paired statistics suppressed')).toHaveTextContent('N/A');
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });
  test('shows categorical tests and suppressed features even without numeric relationships', () => {
    render(<AggregateDisplay chiSquareTest={CHI} omittedFeatures={OMIT} />);
    expect(screen.getByText(/0\.0090/)).toBeInTheDocument();
    expect(screen.getByText(/Too many missing/)).toBeInTheDocument();
  });

  test('keeps the original metric picker without extra controls or explanatory text', () => {
    render(<AggregateDisplay covariances={COV} featureFilters={{ age: 'cluster (= 1)' }} />);
    expect(screen.queryByText(/Relationships are calculated within/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.queryByRole('combobox', { name: 'Dataset for relationships' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Filtered records: cluster (= 1)' })).toHaveLength(2);
  });

  test('does not crash or render non-finite relationship values as statistics', () => {
    render(<AggregateDisplay covariances={{ age: { weight: null }, weight: { age: .5, weight: Infinity } }} />);
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    expect(screen.queryByText('Infinity')).not.toBeInTheDocument();
  });
  test('renders “No aggregated data …” when everything is empty', () => {
    render(<AggregateDisplay />);
    expect(
      screen.getByText(/no aggregated data available/i),
    ).toBeInTheDocument();
  });

  test('renders covariance matrix by default and switches tabs', () => {
    render(
      <AggregateDisplay
        covariances={COV}
        pearsonCorrelations={PEAR}
        spearmanCorrelations={SPEAR}
      />,
    );

    expect(screen.getAllByRole('columnheader', { name: /age|weight/i })).toHaveLength(2);

    expect(screen.getAllByText('3.33')).toHaveLength(2);
    expect(screen.getAllByText('12.30')).toHaveLength(2);

    fireEvent.change(
      screen.getByRole('combobox'),
      { target: { value: 'pearson' } },
    );

    expect(screen.getAllByText('0.81')).toHaveLength(2);
    expect(screen.queryByText('3.33')).toBeNull();
  });

  test('renders Chi-square and omitted-feature panels', () => {
    render(
      <AggregateDisplay
        covariances={COV}
        chiSquareTest={CHI}
        omittedFeatures={OMIT}
      />,
    );
    expect(screen.getByText(/0\.0090/)).toBeInTheDocument();
  });

  test('does not display missingness for privacy-suppressed features', () => {
    render(
      <AggregateDisplay
        covariances={COV}
        omittedFeatures={[{
          featureName: 'small cohort',
          reason: 'Suppressed for privacy: 5 or fewer observations',
          percentMissing: 0,
        }]}
      />,
    );

    const omission = screen.getByText(/Suppressed for privacy/);
    expect(omission).toHaveTextContent('small cohort: Suppressed for privacy: 5 or fewer observations');
    expect(omission).not.toHaveTextContent('Missing:');
  });

  test('splitter drag updates (reduces) top-panel height', () => {
    render(<AggregateDisplay covariances={COV} />);

    const splitter =
      screen.queryByRole('separator') ||
      screen.getByRole('separator');

    expect(splitter).toBeTruthy();

    const topPanel = screen.getByTestId('top-panel');
    const startHeight = parseInt(topPanel.style.height, 10) || 300;

    fireEvent.mouseDown(splitter, { clientY: 200 });
    fireEvent.mouseMove(window, { clientY: 250 });
    fireEvent.mouseUp(window);

    const newHeight = parseInt(topPanel.style.height, 10);
    expect(newHeight).toBeLessThan(startHeight);
  });

  test('ignores mouse move when not dragging', () => {
    render(<AggregateDisplay covariances={COV} />);
    
    const topPanel = screen.getByTestId('top-panel');
    const startHeight = parseInt(topPanel.style.height, 10) || 300;
    
    // Mouse move without mousedown should not change height
    fireEvent.mouseMove(window, { clientY: 100 });
    
    const newHeight = parseInt(topPanel.style.height, 10) || 300;
    expect(newHeight).toBe(startHeight);
  });

  test('handles missing values in correlation matrix with N/A', () => {
    const incompleteMatrix = {
      age: { age: 1.0 },
      weight: { age: 0.5 },
    };

    render(<AggregateDisplay covariances={incompleteMatrix} />);
    
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThan(0);
  });

  test('handles chi-square test with non-numeric p-value', () => {
    const chiWithBadValue = [
      { category1: 'cat1', category2: 'cat2', pvalue: null },
    ];

    render(<AggregateDisplay covariances={COV} chiSquareTest={chiWithBadValue} />);
    
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThan(0);
  });
});

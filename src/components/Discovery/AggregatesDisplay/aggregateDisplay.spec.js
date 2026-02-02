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
    
    // Should show N/A for missing weight-weight value
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

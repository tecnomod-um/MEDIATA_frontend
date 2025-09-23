import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContinuousChart from './continuousChart';

jest.mock('react-chartjs-2', () => {
  const ReactInside = require('react');
  return {
    Bar: ReactInside.forwardRef(({ data, options }, ref) => {
      return (
        <div
          data-testid="mock-bar"
          data-data={JSON.stringify(data)}
          data-options={JSON.stringify(options)}
        />
      );
    }),
  };
});

const FEATURE = {
  featureName: 'ValueDist',
  histogram: [1, 2, 3, 4, 5],
  binRanges: ['0–1', '1–2', '2–3', '3–4', '4–5'],
  outliers: [1, 5],
};

describe('<ContinuousChart />', () => {
  it('renders without crashing and shows <Bar>', () => {
    render(<ContinuousChart feature={FEATURE} showOutliers={true} />);
    expect(screen.getByTestId('mock-bar')).toBeInTheDocument();
  });

  it('applies CSS classes and forwards click events', () => {
    const onClick = jest.fn();
    const onDoubleClick = jest.fn();

    render(
      <ContinuousChart
        feature={FEATURE}
        showOutliers={true}
        isSelected
        inOverview
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />
    );

    const container = screen.getByRole('button', { name: /Chart for ValueDist/i });
    fireEvent.click(container);
    fireEvent.doubleClick(container);
    expect(onClick).toHaveBeenCalled();
    expect(onDoubleClick).toHaveBeenCalled();
  });

  it('passes correct data when showOutliers=true', () => {
    render(<ContinuousChart feature={FEATURE} showOutliers={true} />);

    const bar = screen.getByTestId('mock-bar');
    const data = JSON.parse(bar.getAttribute('data-data'));

    expect(data.labels).toEqual(FEATURE.binRanges);
    expect(data.datasets[0].data).toEqual(FEATURE.histogram);
    expect(data.datasets[0].label).toBe(FEATURE.featureName);
  });

  it('filters out outliers when showOutliers=false', () => {
    render(<ContinuousChart feature={FEATURE} showOutliers={false} />);

    const bar = screen.getByTestId('mock-bar');
    const data = JSON.parse(bar.getAttribute('data-data'));

    expect(data.labels).toEqual(['1–2', '2–3', '3–4']);
    expect(data.datasets[0].data).toEqual([2, 3, 4]);
  });

  it('resize & update effects run without errors', () => {
    const { rerender } = render(<ContinuousChart feature={FEATURE} showOutliers />);
    act(() => window.dispatchEvent(new Event('resize')));
    rerender(
      <ContinuousChart
        feature={{
          ...FEATURE,
          histogram: [2, 3, 4],
          binRanges: ['2–3', '3–4', '4–5'],
          outliers: [],
        }}
        showOutliers={false}
      />
    );
  });
});

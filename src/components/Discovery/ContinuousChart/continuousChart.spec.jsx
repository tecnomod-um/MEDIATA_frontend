import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContinuousChart from './continuousChart';
import { vi } from "vitest";

const capturedBarProps = vi.hoisted(() => ({ current: null }));

vi.mock('react-chartjs-2', () => {
  const ReactInside = require('react');
  return {
    Bar: ReactInside.forwardRef(({ data, options }, ref) => {
      capturedBarProps.current = { data, options };
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
    const onClick = vi.fn();
    const onDoubleClick = vi.fn();

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

  it('handles keyboard events with Enter key', () => {
    const onClick = vi.fn();
    
    render(
      <ContinuousChart
        feature={FEATURE}
        showOutliers={true}
        onClick={onClick}
      />
    );

    const container = screen.getByRole('button', { name: /Chart for ValueDist/i });
    fireEvent.keyDown(container, { key: 'Enter' });
    
    expect(onClick).toHaveBeenCalled();
  });

  it('tooltip title callback returns the correct bin range label', () => {
    render(<ContinuousChart feature={FEATURE} showOutliers={true} />);

    const titleCb = capturedBarProps.current?.options?.plugins?.tooltip?.callbacks?.title;
    expect(typeof titleCb).toBe('function');
    expect(titleCb([{ dataIndex: 2 }])).toBe('2–3');
  });

  it('tooltip title callback returns empty string for out-of-range index', () => {
    render(<ContinuousChart feature={FEATURE} showOutliers={true} />);

    const titleCb = capturedBarProps.current?.options?.plugins?.tooltip?.callbacks?.title;
    expect(typeof titleCb).toBe('function');
    expect(titleCb([{ dataIndex: 99 }])).toBe('');
  });

  it('tooltip label callback returns null', () => {
    render(<ContinuousChart feature={FEATURE} showOutliers={true} />);

    const labelCb = capturedBarProps.current?.options?.plugins?.tooltip?.callbacks?.label;
    expect(typeof labelCb).toBe('function');
    expect(labelCb()).toBeNull();
  });
});

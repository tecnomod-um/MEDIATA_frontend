import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DateChart from './dateChart';

jest.mock('chartjs-adapter-moment', () => { });
jest.mock('react-chartjs-2', () => {
  const React = require('react');
  const update = jest.fn();
  const resize = jest.fn();
  return {
    __esModule: true,
    Line: React.forwardRef(({ data, options }, ref) => {
      React.useImperativeHandle(ref, () => ({ update, resize }), []);
      return (
        <div data-testid="mock-line">
          {JSON.stringify({ data, options })}
        </div>
      );
    }),
    __updateSpy: update,
    __resizeSpy: resize,
  };
});

const { __updateSpy: updateSpy, __resizeSpy: resizeSpy } =
  jest.requireMock('react-chartjs-2');

describe('<DateChart />', () => {
  const baseDateData = {
    dateHistogram: {
      '2020-01-01': 1,
      '2021-01-01': 2,
      '2022-01-01': 3,
    },
    outliers: ['2021-01-01'],
  };
  const dateDataKey = 'TestKey';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders only non-outliers when showOutliers=false', () => {
    render(
      <DateChart
        dateData={baseDateData}
        dateDataKey={dateDataKey}
        showOutliers={false}
      />
    );
    const payload = JSON.parse(screen.getByTestId('mock-line').textContent);
    expect(payload.data.labels).toEqual(['2020-01-01', '2022-01-01']);
    expect(payload.data.datasets[0].data).toEqual([1, 3]);
    expect(payload.options.plugins.title.text).toBe(
      'TestKey Distribution Over Time'
    );
  });

  it('renders all dates when showOutliers=true', () => {
    render(
      <DateChart
        dateData={baseDateData}
        dateDataKey={dateDataKey}
        showOutliers={true}
      />
    );
    const payload = JSON.parse(screen.getByTestId('mock-line').textContent);
    expect(payload.data.labels).toEqual([
      '2020-01-01',
      '2021-01-01',
      '2022-01-01',
    ]);
    expect(payload.data.datasets[0].data).toEqual([1, 2, 3]);
  });

  it('applies CSS classes and forwards click events', () => {
    const handleClick = jest.fn();
    const handleDouble = jest.fn();
    const { container } = render(
      <DateChart
        dateData={baseDateData}
        dateDataKey={dateDataKey}
        showOutliers
        isSelected
        onClick={handleClick}
        onDoubleClick={handleDouble}
      />
    );
    const wrapper = container.firstElementChild;
    fireEvent.click(wrapper);
    fireEvent.doubleClick(wrapper);
    expect(handleClick).toHaveBeenCalled();
    expect(handleDouble).toHaveBeenCalled();
  });

  it('invokes chart.update once on mount and again when data changes', () => {
    const { rerender } = render(
      <DateChart
        dateData={baseDateData}
        dateDataKey={dateDataKey}
        showOutliers={true}
      />
    );

    expect(updateSpy).toHaveBeenCalledTimes(1);
    rerender(
      <DateChart
        dateData={{
          ...baseDateData,
          dateHistogram: {
            ...baseDateData.dateHistogram,
            '2023-01-01': 4,
          },
        }}
        dateDataKey={dateDataKey}
        showOutliers={true}
      />
    );
    expect(updateSpy).toHaveBeenCalledTimes(2);
  });

  it('invokes chart.resize on window resize', () => {
    render(
      <DateChart
        dateData={baseDateData}
        dateDataKey={dateDataKey}
        showOutliers
      />
    );
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(resizeSpy).toHaveBeenCalledTimes(1);
  });
});

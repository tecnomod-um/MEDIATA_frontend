import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompareFilesModal from './compareFilesModal';
import { vi } from "vitest";

vi.mock('../../Common/OverlayWrapper/overlayWrapper', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
}));

describe('<CompareFilesModal />', () => {
  const file2 = {
    fileName: 'second.csv',
    continuousFeatures: [
      { featureName: 'Cont (second.csv)', count: 5, missingValuesCount: 2 },
    ],
    categoricalFeatures: [
      { featureName: 'Cat (second.csv)', count: 3, missingValuesCount: 1, percentMissing: 50 },
    ],
    dateFeatures: [
      {
        featureName: 'Date (second.csv)',
        count: 4,
        outliers: [1, 2, 3, 2],
      },
    ],
  };

  it('renders tables for missing values and outliers and toggles sections', () => {
    render(
      <CompareFilesModal
        isOpen={true}
        closeModal={() => { }}
        filesData={[file2]}
      />
    );

    expect(screen.getByText('second.csv')).toBeInTheDocument();
    expect(screen.getByText('5 rows')).toBeInTheDocument();

    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(2);

    const missingTable = tables[0];
    expect(within(missingTable).getByText('Missing Count')).toBeInTheDocument();
    expect(within(missingTable).getByText('Cont')).toBeInTheDocument();
    expect(within(missingTable).getByText('2')).toBeInTheDocument();
    expect(within(missingTable).getByText('Cat')).toBeInTheDocument();
    expect(within(missingTable).getByText('50')).toBeInTheDocument();

    const outlierTable = tables[1];
    expect(within(outlierTable).getByText('Outlier Values')).toBeInTheDocument();
    expect(within(outlierTable).getByText(/3 items:/)).toBeInTheDocument();
    expect(within(outlierTable).getByText('1, 2, 3')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Missing Values'));
    expect(tables[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Outliers'));
    expect(tables[1]).toBeInTheDocument();
  });
});

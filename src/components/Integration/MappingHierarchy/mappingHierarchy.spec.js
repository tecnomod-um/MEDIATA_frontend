import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MappingHierarchy from './mappingHierarchy.js';

const fmt = (v) => v;
const makeProps = () => {
  const mappingIndex = 0;
  const mappingKey = 'TargetCol';

  const mapping = {
    mappingType: 'standard',
    fileName: 'file.csv',
    groups: [
      {
        values: [
          {
            name: 'Val1',
            mapping: [
              { groupColumn: 'TargetCol', value: 'Val1' },
              { groupColumn: 'SourceCol1', value: 'A' },
            ],
          },
          {
            name: 'Val2',
            mapping: [
              { groupColumn: 'SourceCol2', value: 'B' },
            ],
          },
        ],
      },
    ],
  };

  const columnsData = [
    { column: 'TargetCol', color: '#123' },
    { column: 'SourceCol1', color: '#456' },
    { column: 'SourceCol2', color: '#789' },
  ];

  return {
    mappingIndex,
    mappingKey,
    mapping,
    columnsData,
    onDeleteMapping: jest.fn(),
    onUpdateMapping: jest.fn(),
    formatValue: fmt,
  };
};

describe('<MappingHierarchy />', () => {
  it('renders column heading and file-name', () => {
    render(<MappingHierarchy {...makeProps()} />);

    expect(screen.getByText('TargetCol')).toBeInTheDocument();
    expect(screen.getByText(/file\.csv/i)).toBeInTheDocument();
    expect(screen.getByText('Val1')).toBeInTheDocument();
    expect(screen.getByText('Val2')).toBeInTheDocument();
  });

  it('invokes onDeleteMapping when the close icon is clicked', () => {
    const props = makeProps();
    const { container } = render(<MappingHierarchy {...props} />);
    const closeSvg = container.querySelector('[data-testid="CloseIcon"]');
    fireEvent.click(closeSvg);

    expect(props.onDeleteMapping).toHaveBeenCalledWith(
      props.mappingIndex,
      props.mappingKey
    );
  });

  it('allows editing a value name and propagates via onUpdateMapping', () => {
    const props = makeProps();
    render(<MappingHierarchy {...props} />);
    const val1 = screen.getByText('Val1');
    fireEvent.doubleClick(val1);

    const input = screen.getByDisplayValue('Val1');
    fireEvent.change(input, { target: { value: 'Alpha' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(props.onUpdateMapping).toHaveBeenCalledTimes(1);

    const updated = props.onUpdateMapping.mock.calls[0][2];
    expect(
      updated.groups[0].values[0].name
    ).toBe('Alpha');
  });

  it('allows renaming the column title', () => {
    const props = makeProps();
    render(<MappingHierarchy {...props} />);

    const header = screen.getByText('TargetCol');
    fireEvent.doubleClick(header);

    const input = screen.getByDisplayValue('TargetCol');
    fireEvent.change(input, { target: { value: 'NewCol' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(props.onUpdateMapping).toHaveBeenCalledWith(
      props.mappingIndex,
      props.mappingKey,
      expect.any(Object),
      'NewCol'
    );
  });
});

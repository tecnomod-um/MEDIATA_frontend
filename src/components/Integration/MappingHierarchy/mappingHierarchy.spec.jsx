import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MappingHierarchy from './mappingHierarchy';
import { vi } from "vitest";

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
    onDeleteMapping: vi.fn(),
    onUpdateMapping: vi.fn(),
    formatValue: fmt,
  };
};

describe('<MappingHierarchy />', () => {
  it('renders column heading and file-name', () => {
    render(<MappingHierarchy {...makeProps()} autoOpen={true} />);

    expect(screen.getByText('TargetCol')).toBeInTheDocument();
    expect(screen.getByText(/file\.csv/i)).toBeInTheDocument();
    expect(screen.getByText('Val1')).toBeInTheDocument();
    expect(screen.getByText('Val2')).toBeInTheDocument();
  });

  it('invokes onDeleteMapping when the close icon is clicked', () => {
    const props = makeProps();
    render(<MappingHierarchy {...props} />);
    const closeSvg = screen.getByTestId('CloseIcon');
    fireEvent.click(closeSvg);

    expect(props.onDeleteMapping).toHaveBeenCalledWith(
      props.mappingIndex,
      props.mappingKey
    );
  });

  it('allows editing a value name and propagates via onUpdateMapping', () => {
    const props = makeProps();
    render(<MappingHierarchy {...props} autoOpen={true} />);
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
    render(<MappingHierarchy {...props} autoOpen={true} />);

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

  it('shows "custom mapping" when fileName is custom_mapping', () => {
    const props = makeProps();
    props.mapping = { ...props.mapping, fileName: 'custom_mapping' };
    render(<MappingHierarchy {...props} autoOpen={true} />);
    expect(screen.getByText(/custom mapping/i)).toBeInTheDocument();
  });

  it('opens when the header row is clicked (was closed)', () => {
    const props = makeProps();
    // autoOpen=false → closed by default
    render(<MappingHierarchy {...props} autoOpen={false} />);
    // Verify it's closed (file-row text NOT shown)
    expect(screen.queryByText(/file\.csv/i)).not.toBeInTheDocument();

    // The header row has role="button" with name "TargetCol" (the h4 inside)
    const headerRow = screen.getByRole('button', { name: 'TargetCol' });
    fireEvent.click(headerRow);
    expect(screen.getByText(/file\.csv/i)).toBeInTheDocument();
  });

  it('calls onSelect when header is clicked', () => {
    const onSelect = vi.fn();
    const props = { ...makeProps(), onSelect, autoOpen: true };
    render(<MappingHierarchy {...props} />);
    const headerRow = screen.getAllByRole('button')[0].closest('[role="button"]') || document.querySelector('[role="button"]');
    fireEvent.click(headerRow);
    expect(onSelect).toHaveBeenCalled();
  });

  it('toggles open/closed when the collapse arrow is clicked', () => {
    const props = makeProps();
    render(<MappingHierarchy {...props} autoOpen={true} />);
    expect(screen.getByText(/file\.csv/i)).toBeInTheDocument();

    // Click the collapse button (KeyboardArrowUpIcon is shown when open)
    const collapseBtn = screen.getByLabelText('Collapse');
    fireEvent.click(collapseBtn);

    // Now closed — file row gone
    expect(screen.queryByText(/file\.csv/i)).not.toBeInTheDocument();

    // Click again to re-open (label changes to Expand)
    const expandBtn = screen.getByLabelText('Expand');
    fireEvent.click(expandBtn);
    expect(screen.getByText(/file\.csv/i)).toBeInTheDocument();
  });

  it('opens via Enter key on the header row', () => {
    const props = makeProps();
    render(<MappingHierarchy {...props} autoOpen={false} />);
    const headerRow = document.querySelector('[role="button"]');
    fireEvent.keyDown(headerRow, { key: 'Enter' });
    expect(screen.getByText(/file\.csv/i)).toBeInTheDocument();
  });

  it('opens via Space key on the header row', () => {
    const props = makeProps();
    render(<MappingHierarchy {...props} autoOpen={false} />);
    const headerRow = document.querySelector('[role="button"]');
    fireEvent.keyDown(headerRow, { key: ' ' });
    expect(screen.getByText(/file\.csv/i)).toBeInTheDocument();
  });

  it('cancels value-name edit on Escape key', () => {
    const props = makeProps();
    render(<MappingHierarchy {...props} autoOpen={true} />);
    fireEvent.doubleClick(screen.getByText('Val1'));
    const input = screen.getByDisplayValue('Val1');
    fireEvent.keyDown(input, { key: 'Escape' });
    // Input gone → edit cancelled
    expect(screen.queryByDisplayValue('Val1')).not.toBeInTheDocument();
  });

  it('cancels column-title edit on Escape key', () => {
    const props = makeProps();
    render(<MappingHierarchy {...props} autoOpen={true} />);
    fireEvent.doubleClick(screen.getByText('TargetCol'));
    const input = screen.getByDisplayValue('TargetCol');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByDisplayValue('TargetCol')).not.toBeInTheDocument();
  });

  it('shows the column metadata button when mapping has terminology', () => {
    const props = makeProps();
    props.mapping = { ...props.mapping, terminology: 'SNOMED', description: '' };
    render(<MappingHierarchy {...props} autoOpen={true} />);
    const metaBtn = screen.getByTitle(`Show metadata for TargetCol`);
    expect(metaBtn).toBeInTheDocument();
  });

  it('opens and closes metadata popper', () => {
    const props = makeProps();
    props.mapping = { ...props.mapping, terminology: 'SNOMED', description: 'A desc' };
    render(<MappingHierarchy {...props} autoOpen={true} />);

    const metaBtn = screen.getByTitle('Show metadata for TargetCol');
    fireEvent.click(metaBtn);

    // Popper should show terminology and description
    expect(screen.getByText('SNOMED')).toBeInTheDocument();
    expect(screen.getByText('A desc')).toBeInTheDocument();
  });

  it('shows "No terminology" and "No description" when meta is empty strings', () => {
    const props = makeProps();
    // metaPayload with no terminology or description → should show No terminology/No description
    // To open the popper we need hasColumnMeta=true, but then metaPayload comes from openMeta args
    props.mapping = { ...props.mapping, terminology: 'T', description: '' };
    render(<MappingHierarchy {...props} autoOpen={true} />);

    // Open with terminology='T', description='' → no desc branch
    fireEvent.click(screen.getByTitle('Show metadata for TargetCol'));
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('shows "No terminology" when terminology is empty', () => {
    const props = makeProps();
    props.mapping = { ...props.mapping, terminology: '', description: 'Some desc' };
    render(<MappingHierarchy {...props} autoOpen={true} />);
    fireEvent.click(screen.getByTitle('Show metadata for TargetCol'));
    expect(screen.getByText('No terminology')).toBeInTheDocument();
  });

  it('closes meta popper via the X button', () => {
    const props = makeProps();
    props.mapping = { ...props.mapping, terminology: 'T', description: '' };
    render(<MappingHierarchy {...props} autoOpen={true} />);
    fireEvent.click(screen.getByTitle('Show metadata for TargetCol'));
    expect(screen.getByText('T')).toBeInTheDocument();

    // Click the Close button inside the Popper
    const closeMetaBtn = screen.getByTitle('Close');
    fireEvent.click(closeMetaBtn);
    expect(screen.queryByText('T')).not.toBeInTheDocument();
  });

  it('shows value metadata button when value has terminology', () => {
    const props = makeProps();
    props.mapping = {
      ...props.mapping,
      groups: [
        {
          values: [
            {
              name: 'Val1',
              terminology: 'ICD10',
              description: '',
              mapping: [],
            },
          ],
        },
      ],
    };
    render(<MappingHierarchy {...props} autoOpen={true} />);
    expect(screen.getByTitle('Show metadata for Val1')).toBeInTheDocument();
  });

  it('renders one-hot mapping with Presence(1) and Absence(0) labels', () => {
    const props = makeProps();
    props.mapping = {
      mappingType: 'one-hot',
      fileName: 'custom_mapping',
      groups: [
        {
          values: [
            {
              name: '1',
              mapping: [{ groupColumn: 'SrcCol', value: 'Yes' }],
            },
            {
              name: '0',
              mapping: [],
            },
          ],
        },
      ],
    };
    render(<MappingHierarchy {...props} autoOpen={true} />);
    expect(screen.getByText('Presence (1)')).toBeInTheDocument();
    expect(screen.getByText('Absence (0)')).toBeInTheDocument();
    expect(screen.getByText('Rest of values')).toBeInTheDocument();
  });

  it('shows "range of integers" for a defaultLoaded integer value', () => {
    const props = makeProps();
    props.mapping = {
      mappingType: 'standard',
      fileName: 'file.csv',
      groups: [
        {
          values: [
            {
              name: 'integer',
              mapping: [{ groupColumn: 'TargetCol', value: 'integer' }],
            },
          ],
        },
      ],
    };
    render(<MappingHierarchy {...props} autoOpen={true} />);
    expect(screen.getByText('range of integers')).toBeInTheDocument();
  });

  it('shows "range of doubles" for a defaultLoaded double value', () => {
    const props = makeProps();
    props.mapping = {
      mappingType: 'standard',
      fileName: 'file.csv',
      groups: [
        {
          values: [
            {
              name: 'double',
              mapping: [{ groupColumn: 'TargetCol', value: 'double' }],
            },
          ],
        },
      ],
    };
    render(<MappingHierarchy {...props} autoOpen={true} />);
    expect(screen.getByText('range of doubles')).toBeInTheDocument();
  });

  it('renders range value as "min - max" string', () => {
    const props = makeProps();
    props.mapping = {
      mappingType: 'standard',
      fileName: 'file.csv',
      groups: [
        {
          values: [
            {
              name: 'InRange',
              mapping: [
                {
                  groupColumn: 'AgeCol',
                  value: { type: 'double', minValue: 18, maxValue: 65 },
                  fileName: 'file.csv',
                },
              ],
            },
          ],
        },
      ],
    };
    props.formatValue = (v) => String(v);
    render(<MappingHierarchy {...props} autoOpen={true} />);
    expect(screen.getByText('18 - 65')).toBeInTheDocument();
  });

  it('renders per-column color indicators when multiple source files', () => {
    const props = makeProps();
    props.mapping = {
      mappingType: 'standard',
      fileName: 'file.csv',
      groups: [
        {
          values: [
            {
              name: 'Val',
              mapping: [
                { groupColumn: 'ColA', value: 'x', fileName: 'f1.csv', nodeId: 'n1' },
                { groupColumn: 'ColB', value: 'y', fileName: 'f2.csv', nodeId: 'n2' },
              ],
            },
          ],
        },
      ],
    };
    props.columnsData = [
      { column: 'ColA', color: '#aaa', fileName: 'f1.csv', nodeId: 'n1' },
      { column: 'ColB', color: '#bbb', fileName: 'f2.csv', nodeId: 'n2' },
    ];
    render(<MappingHierarchy {...props} autoOpen={true} />);
    // When multiple colors exist, per-column indicators are shown
    const indicators = document.querySelectorAll('[title^="File:"]');
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('saves value edit via CheckIcon mouseDown', () => {
    const props = makeProps();
    render(<MappingHierarchy {...props} autoOpen={true} />);
    fireEvent.doubleClick(screen.getByText('Val1'));

    const input = screen.getByDisplayValue('Val1');
    fireEvent.change(input, { target: { value: 'SavedVal' } });

    const checkIcon = screen.getByTestId('CheckIcon');
    fireEvent.mouseDown(checkIcon);
    expect(props.onUpdateMapping).toHaveBeenCalledTimes(1);
    expect(props.onUpdateMapping.mock.calls[0][2].groups[0].values[0].name).toBe('SavedVal');
  });

  it('saves column title edit via CheckIcon mouseDown', () => {
    const props = makeProps();
    render(<MappingHierarchy {...props} autoOpen={true} />);
    fireEvent.doubleClick(screen.getByText('TargetCol'));

    const input = screen.getByDisplayValue('TargetCol');
    fireEvent.change(input, { target: { value: 'RenamedCol' } });

    const checkIcon = screen.getByTestId('CheckIcon');
    fireEvent.mouseDown(checkIcon);
    expect(props.onUpdateMapping).toHaveBeenCalledWith(
      0, 'TargetCol', expect.any(Object), 'RenamedCol'
    );
  });

  it('renders nothing in value container when groups is empty', () => {
    const props = makeProps();
    props.mapping = { mappingType: 'standard', fileName: 'file.csv', groups: [] };
    render(<MappingHierarchy {...props} autoOpen={true} />);
    // Value container empty — no Val1/Val2
    expect(screen.queryByText('Val1')).not.toBeInTheDocument();
  });
});

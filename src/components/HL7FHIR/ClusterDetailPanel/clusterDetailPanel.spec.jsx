import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ClusterDetailPanel from './clusterDetailPanel';

vi.mock('@mui/material/IconButton', () => ({
  __esModule: true,
  default: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@mui/icons-material/ArrowBackIos', () => ({
  __esModule: true,
  default: () => <span>Back</span>,
}));

vi.mock('@mui/icons-material/Close', () => ({
  __esModule: true,
  default: () => <span>Remove</span>,
}));

vi.mock('react-transition-group', () => ({
  __esModule: true,
  CSSTransition: ({ children }) => children,
  TransitionGroup: ({ children, component: Component = 'div' }) => {
    return React.createElement(Component, null, children);
  },
}));

describe('<ClusterDetailPanel />', () => {
  const el1 = { id: 1, label: 'One', description: 'Desc 1' };
  const el2 = { id: 2, label: 'Two', description: 'Desc 2' };
  const el3 = { id: 3, label: 'Three', description: 'Desc 3' };

  const cluster = {
    name: 'MyCluster',
    elements: [el1, el2],
  };

  const allElements = [el1, el2, el3];

  let onBack;
  let onRemove;
  let onAdd;
  let onDragStart;
  let onDragEnd;

  beforeEach(() => {
    onBack = vi.fn();
    onRemove = vi.fn();
    onAdd = vi.fn();
    onDragStart = vi.fn();
    onDragEnd = vi.fn();
  });

  function setup() {
    return render(
      <ClusterDetailPanel
        cluster={cluster}
        allElements={allElements}
        onRemoveElement={onRemove}
        onAddElement={onAdd}
        onBack={onBack}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    );
  }

  it('renders header title, list of cluster elements, and footer controls', () => {
    setup();

    expect(screen.getByText('MyCluster')).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('One');
    expect(items[1]).toHaveTextContent('Two');

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('3');
    expect(screen.getByRole('option', { name: 'Three' })).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /\+ add/i });
    expect(addBtn).toBeEnabled();
  });

  it('calls onBack when the back button is clicked', () => {
    setup();

    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onRemoveElement with the correct id when remove is clicked', () => {
    setup();

    const removeButtons = screen.getAllByLabelText('Remove element');

    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith(1);

    fireEvent.click(removeButtons[1]);
    expect(onRemove).toHaveBeenCalledWith(2);
  });

  it('adds a new element when selecting and clicking "+ Add"', () => {
    setup();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '3' } });

    const addBtn = screen.getByRole('button', { name: /\+ add/i });
    fireEvent.click(addBtn);

    expect(onAdd).toHaveBeenCalledWith(el3);
  });

  it('starts a drag with the right data and calls onDragStart', () => {
    setup();

    const firstItem = screen.getAllByRole('listitem')[0];
    const dataTransfer = {
      data: {},
      setData(format, value) {
        this.data[format] = value;
      },
      getData(format) {
        return this.data[format];
      },
    };

    fireEvent.dragStart(firstItem, { dataTransfer });

    expect(onDragStart).toHaveBeenCalledTimes(1);

    const dumped = dataTransfer.getData('app/element');
    expect(JSON.parse(dumped)).toEqual({ elementId: 1 });
  });

  it('handles drop by calling onAddElement and onDragEnd', () => {
    setup();

    const dropZone = screen.getByRole('region');
    const dataTransfer = {
      data: {
        'app/element': JSON.stringify({ elementId: 3 }),
      },
      setData(format, value) {
        this.data[format] = value;
      },
      getData(format) {
        return this.data[format];
      },
    };

    fireEvent.dragOver(dropZone, { dataTransfer });
    fireEvent.drop(dropZone, { dataTransfer });

    expect(onAdd).toHaveBeenCalledWith(el3);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });
});
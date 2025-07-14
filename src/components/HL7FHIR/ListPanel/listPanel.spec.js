import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListPanel from './listPanel';

jest.mock('../../Common/ElementList/elementList', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({
      items,
      activeIndex,
      onSelect,
      builtClasses,
      searchPlaceholder,
      showCategories,
      draggableItems,
      onDragStart,
      onDragEnd,
    }) => (
      <div
        data-testid="element-list"
        data-items={JSON.stringify(items)}
        data-activeindex={activeIndex}
        data-builtclasses={JSON.stringify(builtClasses)}
        data-searchplaceholder={searchPlaceholder}
        data-showcategories={showCategories}
        data-draggableitems={draggableItems}
        onClick={() => onSelect && onSelect(1)}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    ),
  };
});

describe('<ListPanel />', () => {
  const elements = [
    { id: 10, label: 'First' },
    { id: 20, label: 'Second' },
    { id: 30, label: 'Third' },
  ];
  const builtClasses = [{ id: 20, name: 'ClassA' }];
  const onSelectElement = jest.fn();
  const onDragStart = jest.fn();
  const onDragEnd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the correct props into ElementList', () => {
    const selectedElement = elements[2];

    render(
      <ListPanel
        elements={elements}
        selectedElement={selectedElement}
        builtClasses={builtClasses}
        onSelectElement={onSelectElement}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    );

    const elList = screen.getByTestId('element-list');

    const expectedItems = elements.map((el) => ({ id: el.id, label: el.label }));
    expect(elList).toHaveAttribute('data-items', JSON.stringify(expectedItems));
    expect(elList).toHaveAttribute('data-activeindex', '2');
    expect(elList).toHaveAttribute('data-builtclasses', JSON.stringify(builtClasses));
    expect(elList).toHaveAttribute('data-searchplaceholder', 'Filter elements');
    expect(elList).toHaveAttribute('data-showcategories', 'false');
    expect(elList).toHaveAttribute('data-draggableitems', 'true');
  });

  it('calls onSelectElement with the correct element when an item is selected', () => {
    render(
      <ListPanel
        elements={elements}
        selectedElement={null}
        builtClasses={[]}
        onSelectElement={onSelectElement}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    );

    const elList = screen.getByTestId('element-list');
    fireEvent.click(elList);
    expect(onSelectElement).toHaveBeenCalledWith(elements[1]);
  });

  it('forwards onDragStart and onDragEnd', () => {
    render(
      <ListPanel
        elements={elements}
        selectedElement={null}
        builtClasses={[]}
        onSelectElement={onSelectElement}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    );

    const elList = screen.getByTestId('element-list');
    fireEvent.dragStart(elList);
    fireEvent.dragEnd(elList);

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });
});

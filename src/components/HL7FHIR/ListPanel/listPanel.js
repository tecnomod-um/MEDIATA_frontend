// List panel wrapper for FHIR elements using ElementList component
import React from 'react';
import ElementList from '../../Common/ElementList/elementList';

export default function ListPanel({ elements, selectedElement, builtClasses, onSelectElement, onDragStart, onDragEnd }) {
  const items = elements.map(el => ({ id: el.id, label: el.label }));
  const activeIndex = selectedElement
    ? elements.findIndex(el => el.id === selectedElement.id)
    : null;

  return (
    <ElementList
      items={items}
      activeIndex={activeIndex}
      onSelect={(idx) => onSelectElement(elements[idx])}
      builtClasses={builtClasses}
      searchPlaceholder="Filter elements"
      showCategories={false}

      draggableItems={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
  );
}

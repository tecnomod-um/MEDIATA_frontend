import React, { useCallback, useMemo } from 'react';
import ElementList from '../../Common/ElementList/elementList';

// List panel wrapper for FHIR elements using ElementList component
function ListPanel({ elements, selectedElement, builtClasses, onSelectElement, onDragStart, onDragEnd }) {
  const items = useMemo(
    () => elements.map(el => ({ id: el.id, label: el.label })),
    [elements]
  );
  const activeIndex = selectedElement
    ? elements.findIndex(el => el.id === selectedElement.id)
    : null;
  const handleSelect = useCallback(
    (index) => onSelectElement(elements[index]),
    [elements, onSelectElement]
  );

  return (
    <ElementList
      items={items}
      activeIndex={activeIndex}
      onSelect={handleSelect}
      builtClasses={builtClasses}
      searchPlaceholder="Filter elements"
      showCategories={false}

      draggableItems={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
  );
}

export default React.memo(ListPanel);

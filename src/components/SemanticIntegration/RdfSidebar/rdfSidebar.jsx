import React, { useMemo } from 'react';
import ElementList from '../../Common/ElementList/elementList';

// Sidebar wrapper for RDF semantic integration elements. Heavy stylization
function RdfSidebar({ elements, activeElementIndex, activeCategoryIndex, onSelectElement, builtClasses }) {
  const items = useMemo(() => (elements?.elements || []).map((el) => ({
      id: el.name,
      label: el.name,
      categories: el.categories
    })),
    [elements]
  );

  return (
    <ElementList
      items={items}
      activeIndex={activeElementIndex}
      activeCategoryIndex={activeCategoryIndex}
      onSelect={onSelectElement}
      builtClasses={builtClasses}
      searchPlaceholder="Search elements"
      showCategories={false}
    />
  );
}

export default React.memo(RdfSidebar);

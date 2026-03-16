import React from 'react';
import ElementList from '../../Common/ElementList/elementList';

// Sidebar wrapper for RDF semantic alignment elements. Heavy stylization
export default function RdfSidebar({ elements, activeElementIndex, activeCategoryIndex, onSelectElement, builtClasses }) {
  const items = (elements?.elements || []).map((el, idx) => ({
    id: el.name,
    label: el.name,
    categories: el.categories
  }));

  return (
    <ElementList
      items={items}
      activeIndex={activeElementIndex}
      activeCategoryIndex={activeCategoryIndex}
      onSelect={(idx, catIdx) => onSelectElement(idx, catIdx)}
      builtClasses={builtClasses}
      searchPlaceholder="Search elements"
      showCategories={false}
    />
  );
}

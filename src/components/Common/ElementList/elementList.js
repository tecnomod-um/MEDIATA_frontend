import React, { useState, useMemo } from 'react';
import ElementListStyles from './elementList.module.css';

const ElementList = ({
  items = [],
  activeIndex = null,
  activeCategoryIndex = null,
  onSelect,
  builtClasses = {},
  searchPlaceholder = 'Search',
  showCategories = true,

  draggableItems = false,
  onDragStart,
  onDragEnd
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => items.map((item, index) => ({ item, index }))
    .filter(({ item }) => item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.categories && item.categories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase())))),
    [items, searchTerm]);

  const handleItemClick = (idx) => onSelect(idx, null);
  const handleCategoryClick = (idx, catIdx) => onSelect(idx, catIdx);

  return (
    <div className={ElementListStyles.sidebarContainer}>
      <div className={ElementListStyles.search}>
        <input
          type="search"
          placeholder={searchPlaceholder}
          className={ElementListStyles.searchInput}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className={ElementListStyles.elementsListWrapper}>
        <div className={ElementListStyles.elementsList}>
          {filteredItems.map(({ item, index }) => {
            const isItemActive = activeIndex === index && activeCategoryIndex == null;
            const itemBuilt = builtClasses[index];
            return (
              <div key={item.id ?? index} className={ElementListStyles.elementContainer}>
                <button
                  className={`${ElementListStyles.elementButton}
                             ${isItemActive ? ElementListStyles.active : ''}
                             ${itemBuilt ? ElementListStyles.built : ''}`}
                  onClick={() => handleItemClick(index)}

                  // NEW: make draggable if enabled
                  draggable={draggableItems}
                  onDragStart={e => {
                    if (!draggableItems) return;
                    onDragStart?.();
                    e.dataTransfer.setData(
                      'app/element',
                      JSON.stringify({ elementId: item.id })
                    );
                  }}
                  onDragEnd={e => {
                    if (!draggableItems) return;
                    onDragEnd?.();
                  }}
                >
                  {item.label}
                </button>
                {showCategories && item.categories && item.categories.length > 0 && (
                  <div className={ElementListStyles.categoriesContainer}>
                    {item.categories.map((cat, catIdx) => {
                      const key = `${index}-cat-${catIdx}`;
                      const isCatActive = activeIndex === index && activeCategoryIndex === catIdx;
                      const catBuilt = builtClasses[key];
                      return (
                        <button
                          key={key}
                          className={`${ElementListStyles.categoryButton} ${isCatActive ? ElementListStyles.activeCategory : ''} ${catBuilt ? ElementListStyles.built : ''}`}
                          onClick={() => handleCategoryClick(index, catIdx)}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ElementList;
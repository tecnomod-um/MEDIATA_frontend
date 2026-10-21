import React, { useCallback, useMemo, useRef, useState } from 'react';
import ElementListStyles from './elementList.module.css';

const ElementListItem = React.memo(function ElementListItem({
  item,
  index,
  isItemActive,
  activeCategoryIndex,
  itemBuilt,
  categoryBuiltState,
  showCategories,
  draggableItems,
  onSelect,
  onDragStart,
  onDragEnd,
}) {
  const handleItemClick = () => onSelect(index, null);

  return (
    <div className={ElementListStyles.elementContainer} role="listitem">
      <button
        className={`${ElementListStyles.elementButton}
                   ${isItemActive ? ElementListStyles.active : ''}
                   ${itemBuilt ? ElementListStyles.built : ''}`}
        onClick={handleItemClick}
        aria-label={`${item.label}${itemBuilt ? ' (built)' : ''}`}
        aria-current={isItemActive ? 'true' : undefined}
        draggable={draggableItems}
        onDragStart={e => {
          if (!draggableItems) return;
          onDragStart();
          e.dataTransfer.setData(
            'app/element',
            JSON.stringify({ elementId: item.id })
          );
        }}
        onDragEnd={() => {
          if (draggableItems) onDragEnd();
        }}
      >
        {item.label}
      </button>
      {showCategories && item.categories && item.categories.length > 0 && (
        <div className={ElementListStyles.categoriesContainer} role="list" aria-label={`${item.label} categories`}>
          {item.categories.map((cat, catIdx) => {
            const isCatActive = activeCategoryIndex === catIdx;
            const catBuilt = categoryBuiltState[catIdx] === '1';
            return (
              <button
                key={`${index}-cat-${catIdx}`}
                className={`${ElementListStyles.categoryButton} ${isCatActive ? ElementListStyles.activeCategory : ''} ${catBuilt ? ElementListStyles.built : ''}`}
                onClick={() => onSelect(index, catIdx)}
                role="listitem"
                aria-label={`Category: ${cat}${catBuilt ? ' (built)' : ''}`}
                aria-current={isCatActive ? 'true' : undefined}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

// List component with categories and drag support
const ElementList = ({ items = [], activeIndex = null, activeCategoryIndex = null, onSelect, builtClasses = {}, searchPlaceholder = 'Search', showCategories = true, draggableItems = false, onDragStart, onDragEnd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const callbacksRef = useRef({ onSelect, onDragStart, onDragEnd });
  callbacksRef.current = { onSelect, onDragStart, onDragEnd };

  const selectItem = useCallback((index, categoryIndex) => {
    callbacksRef.current.onSelect?.(index, categoryIndex);
  }, []);
  const startDrag = useCallback(() => callbacksRef.current.onDragStart?.(), []);
  const endDrag = useCallback(() => callbacksRef.current.onDragEnd?.(), []);

  const filteredItems = useMemo(() => items.map((item, index) => ({ item, index }))
    .filter(({ item }) => item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.categories && item.categories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase())))),
    [items, searchTerm]);

  return (
    <div className={ElementListStyles.sidebarContainer}>
      <div className={ElementListStyles.search}>
        <input
          type="search"
          placeholder={searchPlaceholder}
          className={ElementListStyles.searchInput}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          aria-label={searchPlaceholder}
          role="searchbox"
          id="element-list-search"
        />
      </div>
      <div className={ElementListStyles.elementsListWrapper}>
        <div className={ElementListStyles.elementsList} role="list" aria-label="Elements">
          {filteredItems.map(({ item, index }) => {
            const isItemActive = activeIndex === index && activeCategoryIndex == null;
            const rowActiveCategoryIndex = activeIndex === index ? activeCategoryIndex : null;
            const categoryBuiltState = (item.categories || [])
              .map((_, catIdx) => builtClasses[`${index}-cat-${catIdx}`] ? '1' : '0')
              .join('');
            return (
              <ElementListItem
                key={item.id ?? index}
                item={item}
                index={index}
                isItemActive={isItemActive}
                activeCategoryIndex={rowActiveCategoryIndex}
                itemBuilt={Boolean(builtClasses[index])}
                categoryBuiltState={categoryBuiltState}
                showCategories={showCategories}
                draggableItems={draggableItems}
                onSelect={selectItem}
                onDragStart={startDrag}
                onDragEnd={endDrag}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default React.memo(ElementList);

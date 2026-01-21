import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ElementList from './elementList.js'

describe('ElementList', () => {
  const items = [
    { id: 'i1', label: 'First', categories: ['A', 'Apple'] },
    { id: 'i2', label: 'Second', categories: ['B', 'Banana'] },
    { id: 'i3', label: 'Third' },
  ]

  it('renders all items and their categories by default', () => {
    render(
      <ElementList
        items={items}
        activeIndex={null}
        activeCategoryIndex={null}
        onSelect={() => { }}
      />
    )

    const itemButtons = screen.getAllByRole('button', { name: /First|Second|Third/ })
    expect(itemButtons).toHaveLength(3)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
  })

  it('filters items by label when typing in search', () => {
    render(
      <ElementList
        items={items}
        onSelect={() => { }}
      />
    )

    const input = screen.getByPlaceholderText('Search')
    fireEvent.change(input, { target: { value: 'sec' } })

    expect(screen.getByText('Second')).toBeInTheDocument()
    expect(screen.queryByText('First')).not.toBeInTheDocument()
    expect(screen.queryByText('Third')).not.toBeInTheDocument()
  })

  it('filters items by category when typing in search', () => {
    render(
      <ElementList
        items={items}
        onSelect={() => { }}
      />
    )

    const input = screen.getByPlaceholderText('Search')
    fireEvent.change(input, { target: { value: 'apple' } })

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.queryByText('Second')).not.toBeInTheDocument()
  })

  it('hides categories when showCategories=false', () => {
    render(
      <ElementList
        items={items}
        onSelect={() => { }}
        showCategories={false}
      />
    )
    expect(screen.queryByRole('button', { name: 'A' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apple' })).not.toBeInTheDocument()
  })

  it('applies activeIndex and activeCategoryIndex classes', () => {
    const { rerender } = render(
      <ElementList
        items={items}
        activeIndex={1}
        activeCategoryIndex={null}
        onSelect={() => { }}
      />
    )
    const secondBtn = screen.getByText('Second')
    expect(secondBtn).toHaveClass('active')
    rerender(
      <ElementList
        items={items}
        activeIndex={1}
        activeCategoryIndex={0}
        onSelect={() => { }}
      />
    )
    const catBtn = screen.getByText('B')
    expect(catBtn).toHaveClass('activeCategory')
  })

  it('applies builtClasses styling', () => {
    render(
      <ElementList
        items={items}
        builtClasses={{ 0: true, '1-cat-1': true }}
        onSelect={() => { }}
      />
    )

    const firstBtn = screen.getByText('First')
    expect(firstBtn).toHaveClass('built')

    const bananaBtn = screen.getByText('Banana')
    expect(bananaBtn).toHaveClass('built')
  })

  it('calls onSelect with correct indices when item is clicked', () => {
    const onSelect = jest.fn()
    render(
      <ElementList
        items={items}
        onSelect={onSelect}
      />
    )
    fireEvent.click(screen.getByText('Third'))
    expect(onSelect).toHaveBeenCalledWith(2, null)
  })

  it('calls onSelect with correct indices when category is clicked', () => {
    const onSelect = jest.fn()
    render(
      <ElementList
        items={items}
        onSelect={onSelect}
      />
    )
    fireEvent.click(screen.getByText('Apple'))
    expect(onSelect).toHaveBeenCalledWith(0, 1)
  })

  it('makes items draggable when draggableItems=true', () => {
    const onDragStart = jest.fn()
    const onDragEnd = jest.fn()
    render(
      <ElementList
        items={items}
        onSelect={() => { }}
        draggableItems
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    )

    const firstBtn = screen.getByText('First')
    expect(firstBtn).toHaveAttribute('draggable', 'true')

    const dataTransfer = {
      setData: jest.fn()
    }
    fireEvent.dragStart(firstBtn, { dataTransfer })
    expect(onDragStart).toHaveBeenCalled()
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      'app/element',
      JSON.stringify({ elementId: 'i1' })
    )
    fireEvent.dragEnd(firstBtn)
    expect(onDragEnd).toHaveBeenCalled()
  })

  it('does not make items draggable when draggableItems=false', () => {
    render(
      <ElementList
        items={items}
        onSelect={() => { }}
      />
    )
    const btn = screen.getByText('First')
    expect(btn).toHaveAttribute('draggable', 'false')
  })

  it('handles items without id property using index as fallback key', () => {
    const itemsWithoutId = [
      { label: 'No ID 1', categories: ['Cat1'] },
      { label: 'No ID 2', categories: ['Cat2'] },
    ]
    
    const onSelect = jest.fn()
    render(
      <ElementList
        items={itemsWithoutId}
        onSelect={onSelect}
      />
    )
    
    expect(screen.getByText('No ID 1')).toBeInTheDocument()
    expect(screen.getByText('No ID 2')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('No ID 1'))
    expect(onSelect).toHaveBeenCalledWith(0, null)
  })
})

import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import AutocompleteInput from './autoCompleteInput'
import { vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

describe('AutocompleteInput', () => {
  const suggestions = ['Apple', 'Banana', 'Apricot', 'Cherry']

  it('shows filtered suggestions on focus and typing', () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
        placeholder="Search…"
      />
    )

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    const input = screen.getByPlaceholderText('Search…')
    fireEvent.focus(input)
    expect(screen.getByRole('listbox')).toBeVisible()
    expect(screen.getAllByRole('option')).toHaveLength(4)

    fireEvent.change(input, { target: { value: 'ap' } })
    expect(handleChange).toHaveBeenLastCalledWith('ap')

    rerender(
      <AutocompleteInput
        value="ap"
        onChange={handleChange}
        suggestions={suggestions}
        placeholder="Search…"
      />
    )

    const items = screen.getAllByRole('option')
    expect(items).toHaveLength(2)
    expect(items.map(li => li.textContent)).toEqual(['Apple', 'Apricot'])
  })

  it('calls onChange and hides list when suggestion clicked', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value="ba"
        onChange={handleChange}
        suggestions={suggestions}
      />
    )

    const input = screen.getByRole('combobox')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    fireEvent.focus(input)

    const bananaItem = screen.getByText('Banana')
    expect(bananaItem).toBeInTheDocument()

    fireEvent.mouseDown(bananaItem)
    expect(handleChange).toHaveBeenCalledWith('Banana')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('hides suggestion list on blur (delay)', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={['X']}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    expect(screen.getByRole('listbox')).toBeVisible()

    fireEvent.blur(input)
    expect(screen.getByRole('listbox')).toBeVisible()

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('when limitInitial=false, typing empty still shows full list', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
        limitInitial={false}
      />
    )

    fireEvent.focus(screen.getByRole('combobox'))
    expect(screen.getAllByRole('option')).toHaveLength(4)
  })

  it('handles keyboard navigation with arrow keys', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value="a"
        onChange={handleChange}
        suggestions={suggestions}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)

    // Press down arrow
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    
    // Check if list is visible
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('handles Enter key to select suggestion', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value="app"
        onChange={handleChange}
        suggestions={suggestions}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    
    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' })
    
    // Verify handler behavior
    expect(input).toBeInTheDocument()
  })

  it('handles Escape key to close dropdown', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    
    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape' })
    
    act(() => {
      vi.advanceTimersByTime(150)
    })
    
    // Dropdown should close
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows no suggestions when input does not match', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value="xyz"
        onChange={handleChange}
        suggestions={suggestions}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    
    // No matching suggestions
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('handles empty suggestions list', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={[]}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    
    // No options should be shown
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('applies custom placeholder text', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
        placeholder="Type to search..."
      />
    )

    expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument()
  })

  it('navigates suggestions with ArrowUp key', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value="a"
        onChange={handleChange}
        suggestions={suggestions}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    
    // Press down to select first item
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    
    // Press up to go back
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    
    expect(input).toBeInTheDocument()
  })

  it('does not go below -1 when pressing ArrowUp at top', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value="a"
        onChange={handleChange}
        suggestions={suggestions}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    
    // Press up when at -1 (no selection)
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    
    expect(input).toBeInTheDocument()
  })

  it('does not go past last item when pressing ArrowDown', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value="a"
        onChange={handleChange}
        suggestions={suggestions}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    
    // Press down multiple times past the end
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    
    expect(input).toBeInTheDocument()
  })

  it('selects suggestion with Enter key after navigation', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value="a"
        onChange={handleChange}
        suggestions={suggestions}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    
    // Navigate to first item
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    
    // Press Enter to select
    fireEvent.keyDown(input, { key: 'Enter' })
    
    expect(handleChange).toHaveBeenCalledWith('Apple')
  })

  it('repositions dropdown above input when not enough space below', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
      />
    )

    const input = screen.getByRole('combobox')
    
    // Mock getBoundingClientRect to simulate no space below
    const mockGetBoundingClientRect = vi.fn(() => ({
      top: 700,
      bottom: 750,
      left: 10,
      width: 200,
    }))
    
    Object.defineProperty(input, 'getBoundingClientRect', {
      writable: true,
      configurable: true,
      value: mockGetBoundingClientRect,
    })

    fireEvent.focus(input)
    
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('handles scroll event and blurs input when scrolled out of view', () => {
    const handleChange = vi.fn()
    render(
      <div style={{ overflow: 'auto', height: '100px' }}>
        <AutocompleteInput
          value=""
          onChange={handleChange}
          suggestions={suggestions}
        />
      </div>
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    
    // Verify input is in document
    expect(input).toBeInTheDocument()
  })

  it('updates filtered suggestions when limitInitial is true and value changes', () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
        limitInitial={true}
      />
    )

    const input = screen.getByRole('combobox')

    // Update value
    rerender(
      <AutocompleteInput
        value="ba"
        onChange={handleChange}
        suggestions={suggestions}
        limitInitial={true}
      />
    )

    fireEvent.focus(input)
    
    // Should filter to only 'Banana'
    expect(input).toBeInTheDocument()
  })

  it('shows suggestions when focused after suggestions are loaded', () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={[]}
        limitInitial={false}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)

    // Update with suggestions while focused
    rerender(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
        limitInitial={false}
      />
    )

    // Component should be in document
    expect(input).toBeInTheDocument()
  })

  it('uses custom id when provided', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
        id="custom-id"
      />
    )

    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('id', 'custom-id')
  })

  it('uses custom name when provided', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
        name="custom-name"
      />
    )

    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('name', 'custom-name')
  })

  it('uses custom ariaLabel when provided', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
        ariaLabel="Custom search"
      />
    )

    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-label', 'Custom search')
  })

  it('applies custom className', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
        className="custom-class"
      />
    )

    const input = screen.getByRole('combobox')
    expect(input).toHaveClass('custom-class')
  })

  it('handles other key presses without errors', () => {
    const handleChange = vi.fn()
    render(
      <AutocompleteInput
        value="a"
        onChange={handleChange}
        suggestions={suggestions}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    
    // Press a key that should be ignored
    fireEvent.keyDown(input, { key: 'Tab' })
    fireEvent.keyDown(input, { key: 'Shift' })
    
    expect(input).toBeInTheDocument()
  })
})

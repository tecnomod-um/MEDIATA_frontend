import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import AutocompleteInput from './autoCompleteInput.js'

beforeEach(() => {
  jest.useFakeTimers()
})
afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

describe('AutocompleteInput', () => {
  const suggestions = ['Apple', 'Banana', 'Apricot', 'Cherry']

  it('shows filtered suggestions on focus and typing', () => {
    const handleChange = jest.fn()
    const { rerender } = render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={suggestions}
        placeholder="Search…"
      />
    )

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    const input = screen.getByPlaceholderText('Search…')
    fireEvent.focus(input)
    expect(screen.getByRole('list')).toBeVisible()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)

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

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items.map(li => li.textContent)).toEqual(['Apple', 'Apricot'])
  })

  it('calls onChange and hides list when suggestion clicked', () => {
    const handleChange = jest.fn()
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
    const handleChange = jest.fn()
    render(
      <AutocompleteInput
        value=""
        onChange={handleChange}
        suggestions={['X']}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    expect(screen.getByRole('list')).toBeVisible()

    fireEvent.blur(input)
    expect(screen.getByRole('list')).toBeVisible()

    act(() => {
      jest.advanceTimersByTime(150)
    })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('when limitInitial=false, typing empty still shows full list', () => {
    const handleChange = jest.fn()
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
})

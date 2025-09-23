jest.mock('distinct-colors', () => jest.fn(() => []));

import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import ColumnMapping from './columnMapping'

// Mock CSS module to simple class names
jest.mock('./columnMapping.module.css', () => new Proxy({}, { get: (_, k) => String(k) }), { virtual: true })

// Mock child components we don't need to exercise deeply
jest.mock('react-switch', () => (props) => (
  <input
    type="checkbox"
    role="checkbox"
    aria-label="switch"
    checked={!!props.checked}
    onChange={(e) => props.onChange?.(e.target.checked)}
  />
))

jest.mock('../../Common/TooltipPopup/tooltipPopup.js', () => () => null)
jest.mock('../RangePicker/rangePicker.js', () => (props) => (
  <button type="button" onClick={() => props.onRangeChange?.({ minValue: 1, maxValue: 10 })}>
    Mock RangePicker
  </button>
))
jest.mock('../../Common/AutoCompleteInput/autoCompleteInput.js', () => (props) => (
  <input
    type="text"
    role="textbox"
    placeholder={props.placeholder || ''}
    value={props.value || ''}
    onChange={(e) => props.onChange?.(e.target.value)}
  />
))
// MUI icons as inert spans
jest.mock('@mui/icons-material/Add', () => () => <span />)
jest.mock('@mui/icons-material/Save', () => () => <span />)
jest.mock('@mui/icons-material/Close', () => () => <span />)

// Utility to simulate a proper DataTransfer for drop
const makeDataTransfer = (payloadObj) => ({
  getData: jest.fn((type) => (type === 'column' ? JSON.stringify(payloadObj) : '')),
  setData: jest.fn(),
  dropEffect: 'move',
  effectAllowed: 'all',
  files: [],
  items: [],
  types: ['column'],
})

describe('ColumnMapping', () => {
  it('renders drop area and keeps Save disabled until name + value names are set', () => {
    const onMappingChange = jest.fn()
    const onSave = jest.fn()

    render(<ColumnMapping onMappingChange={onMappingChange} onSave={onSave} groups={[]} schema={null} />)

    // Drop area message visible
    expect(screen.getByText(/click or drop columns here/i)).toBeInTheDocument()

    const saveBtn = screen.getByRole('button', { name: /save/i })
    expect(saveBtn).toBeDisabled()

    // Set union name
    const unionInput = screen.getByRole('textbox', { name: '' }) // mocked AutocompleteInput
    fireEvent.change(unionInput, { target: { value: 'CombinedColor' } })
    expect(saveBtn).toBeDisabled() // still disabled until a value is added & named

    // Add a custom value row
    fireEvent.click(screen.getByRole('button', { name: /add value/i }))
    const valueName = screen.getByPlaceholderText(/value name/i)
    fireEvent.change(valueName, { target: { value: 'Red-ish' } })

    expect(saveBtn).toBeEnabled()
  })

  it('handles drop of a new group and calls onMappingChange with appended group', () => {
    const onMappingChange = jest.fn()
    const onSave = jest.fn()

    render(<ColumnMapping onMappingChange={onMappingChange} onSave={onSave} groups={[]} schema={null} />)

    const dropArea = screen.getByText(/click or drop columns here/i)
    const dropped = {
      column: 'color',
      values: ['red', 'blue', 'green'],
      fileName: 'file.csv',
      color: '#336699',
    }

    fireEvent.dragOver(dropArea)
    fireEvent.drop(dropArea, { dataTransfer: makeDataTransfer(dropped) })

    expect(onMappingChange).toHaveBeenCalledTimes(1)
    const arg = onMappingChange.mock.calls[0][0]
    expect(arg).toEqual([dropped])
  })

  it('adds a categorical mapping via the sliding pane and saves the mapping payload', () => {
    const onSave = jest.fn()
    const onMappingChange = jest.fn()

    const groups = [
      {
        column: 'color',
        values: ['red', 'blue', 'green'],
        fileName: 'colors.csv',
        color: '#ff0000',
      },
    ]

    render(<ColumnMapping onMappingChange={onMappingChange} onSave={onSave} groups={groups} schema={null} />)

    // Set union name
    const unionInput = screen.getByRole('textbox')
    fireEvent.change(unionInput, { target: { value: 'UnifiedColor' } })

    // Add one custom value
    fireEvent.click(screen.getByRole('button', { name: /add value/i }))
    fireEvent.change(screen.getByPlaceholderText(/value name/i), { target: { value: 'Warm' } })

    // Click "Add Mapping" inside the value row
    const addMappingBtn = screen.getByRole('button', { name: /add mapping/i })
    fireEvent.click(addMappingBtn)

    // Sliding pane shows mapping options for the group values
    // Pick "red"
    fireEvent.click(screen.getByRole('button', { name: 'red' }))

    // Optional: mapping summary text appears
    expect(screen.getByText(/1 values from/i)).toBeInTheDocument()
    expect(screen.getByText(/columns mapped/i)).toBeInTheDocument()

    // Toggle the two switches (mocked as checkboxes)
    const switches = screen.getAllByRole('checkbox')
    // 0: Remove columns, 1: One-Hot (based on render order)
    fireEvent.click(switches[0])
    fireEvent.click(switches[1])

    // Save
    const saveBtn = screen.getByRole('button', { name: /save/i })
    expect(saveBtn).toBeEnabled()
    fireEvent.click(saveBtn)

    // Validate payload shape
    expect(onSave).toHaveBeenCalledTimes(1)
    const [savedGroups, unionName, customValues, removeFromHierarchy, useHotOneMapping] = onSave.mock.calls[0]

    expect(savedGroups).toEqual(groups)
    expect(unionName).toBe('UnifiedColor')
    expect(removeFromHierarchy).toBe(true)
    expect(useHotOneMapping).toBe(true)

    // customValues: [{ name: 'Warm', mapping: [{ groupColumn: 'color', value: 'red' }]}]
    expect(customValues).toHaveLength(1)
    expect(customValues[0].name).toBe('Warm')
    expect(customValues[0].mapping).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ groupColumn: 'color', value: 'red' }),
      ])
    )
  })
})

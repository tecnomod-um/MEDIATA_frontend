import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import SchemaTray from './schemaTray'
import { saveSchemaToBackend, fetchSchemaFromBackend, removeSchemaFromBackend } from '../../../util/petitionHandler'

jest.mock('../../../util/petitionHandler', () => ({
  saveSchemaToBackend: jest.fn(),
  fetchSchemaFromBackend: jest.fn(),
  removeSchemaFromBackend: jest.fn(),
}))

const renderTray = (props = {}) =>
  render(
    <SchemaTray
      error=""
      setError={jest.fn()}
      setShowError={jest.fn()}
      nodesFetched={false}
      {...props}
    />,
  )

const openTray = () => fireEvent.click(screen.getByText(/^Schema$/i))

beforeAll(() => {
  class MockFileReader {
    readAsText(file) {
      setTimeout(() => {
        this.onload?.({ target: { result: file.__content } })
      }, 0)
    }
  }
  global.FileReader = MockFileReader
})

const originalFetch = global.fetch

afterAll(() => {
  global.fetch = originalFetch
})

describe('SchemaTray • basic UI', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders closed tab initially', () => {
    renderTray()
    expect(screen.getByText(/^Schema$/i)).toBeInTheDocument()
  })

  it('opens tray on tab click', () => {
    renderTray()
    openTray()
    expect(screen.getByText(/JSON Schema/i)).toBeInTheDocument()
  })

  it('shows “No schema has been set” when empty', () => {
    renderTray()
    openTray()
    expect(
      screen.getByText(/No schema has been set/i),
    ).toBeInTheDocument()
  })

  it('renders external schema if provided', () => {
    renderTray({ externalSchema: { title: 'test' } })
    openTray()
    expect(screen.getByText(/test/i)).toBeInTheDocument()
  })
})

describe('SchemaTray • persistence actions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('removes schema on “Remove Schema” click', async () => {
    removeSchemaFromBackend.mockResolvedValue({})
    const onSchemaChange = jest.fn()
    const onRemoveExternalSchema = jest.fn()

    renderTray({
      externalSchema: { title: 'x' },
      onSchemaChange,
      onRemoveExternalSchema,
    })

    openTray()
    fireEvent.click(screen.getByText(/Remove Schema/i))

    await waitFor(() =>
      expect(removeSchemaFromBackend).toHaveBeenCalledTimes(1),
    )
    expect(onSchemaChange).toHaveBeenCalledWith(null)
    expect(onRemoveExternalSchema).toHaveBeenCalled()
  })

  it('fetches schema from backend once nodes are fetched', async () => {
    fetchSchemaFromBackend.mockResolvedValue({
      schema: { title: 'Fetched' },
    })

    renderTray({ nodesFetched: true })
    openTray()

    await waitFor(() => expect(fetchSchemaFromBackend).toHaveBeenCalled(),)
    expect(screen.getByText(/Fetched/i)).toBeInTheDocument()
  })
})

describe('SchemaTray • file upload & URL fetch', () => {
  beforeEach(() => jest.clearAllMocks())

  it('parses uploaded JSON file, shows preview & saves', async () => {
    const onSchemaChange = jest.fn()
    renderTray({ onSchemaChange })
    openTray()

    const file = new File(['{}'], 'schema.json', { type: 'application/json' })
    file.__content = JSON.stringify({ title: 'Upload' })

    const input = screen.getByLabelText(/Upload JSON File/i)
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(saveSchemaToBackend).toHaveBeenCalledWith({ title: 'Upload' }),
    )
    expect(onSchemaChange).toHaveBeenCalledWith({ title: 'Upload' })
    expect(screen.getByText(/Upload/i)).toBeInTheDocument()
  })

  it('fetches schema from URL and persists it', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: 'Remote' }),
    })

    renderTray()
    openTray()

    fireEvent.change(screen.getByPlaceholderText(/Enter schema URL/i), {
      target: { value: 'https://example.com/schema.json' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Fetch/i }))

    await waitFor(() =>
      expect(saveSchemaToBackend).toHaveBeenCalledWith({ title: 'Remote' }),
    )
    expect(screen.getByText(/Remote/i)).toBeInTheDocument()
  })

  it('shows error when URL fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false })

    const setError = jest.fn()
    const setShowError = jest.fn()
    global.fetch = jest.fn().mockResolvedValue({ ok: false })

    renderTray({ setError, setShowError })
    openTray()

    fireEvent.change(screen.getByPlaceholderText(/Enter schema URL/i), {
      target: { value: 'bad-url' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Fetch/i }))

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith('Failed to fetch schema.')
    })
  })
})

describe('SchemaTray • interaction details', () => {
  beforeEach(() => jest.clearAllMocks())

  it('toggles Expand / Contract button', () => {
    renderTray({ externalSchema: { msg: 'foo' } })
    openTray()

    const btn = screen.getByRole('button', { name: /Expand/i })
    expect(btn).toBeInTheDocument()

    fireEvent.click(btn)
    expect(
      screen.getByRole('button', { name: /Contract/i }),
    ).toBeInTheDocument()
  })

  it('closes tray when user clicks outside', () => {
    renderTray();
    openTray()
    expect(screen.getByText(/JSON Schema/i)).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.getByText(/^Schema$/i)).toBeInTheDocument()
  })
})

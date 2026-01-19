import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SchemaTray from './schemaTray'
import { saveSchemaToBackend, fetchSchemaFromBackend, removeSchemaFromBackend } from '../../../util/petitionHandler'

jest.mock('../../../util/petitionHandler', () => ({
  saveSchemaToBackend: jest.fn().mockResolvedValue(undefined),
  fetchSchemaFromBackend: jest.fn().mockResolvedValue(null),
  removeSchemaFromBackend: jest.fn().mockResolvedValue(undefined),
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

  it('closes tray when user clicks outside', async () => {
    renderTray();
    openTray()
    expect(screen.getByText(/JSON Schema/i)).toBeInTheDocument()
    // When open, closed tab should not be visible
    expect(screen.queryByText(/^Schema$/i)).not.toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    await waitFor(() => {
      // When closed, the closed tab should be visible
      expect(screen.getByText(/^Schema$/i)).toBeInTheDocument()
    })
  })

  it('saves draft on Ctrl+S when expanded', async () => {
    const schema = { title: 'Test' };
    renderTray({ externalSchema: schema });
    openTray();
    
    const expandBtn = screen.getByRole('button', { name: /Expand/i });
    fireEvent.click(expandBtn);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: JSON.stringify({ title: 'Updated' }) } });
    
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    
    await waitFor(() => {
      expect(saveSchemaToBackend).toHaveBeenCalledWith({ title: 'Updated' });
    });
  });

  it('saves draft on Meta+S (Mac) when expanded', async () => {
    const schema = { title: 'Test' };
    renderTray({ externalSchema: schema });
    openTray();
    
    const expandBtn = screen.getByRole('button', { name: /Expand/i });
    fireEvent.click(expandBtn);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: JSON.stringify({ title: 'MetaUpdated' }) } });
    
    fireEvent.keyDown(window, { key: 'S', metaKey: true });
    
    await waitFor(() => {
      expect(saveSchemaToBackend).toHaveBeenCalledWith({ title: 'MetaUpdated' });
    });
  });

  it('does not save on Ctrl+S when not expanded', () => {
    const schema = { title: 'Test' };
    renderTray({ externalSchema: schema });
    openTray();
    
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    
    expect(saveSchemaToBackend).not.toHaveBeenCalled();
  });

  it('prevents closing tray with invalid JSON', async () => {
    const schema = { title: 'Valid' };
    const setError = jest.fn();
    renderTray({ externalSchema: schema, setError });
    openTray();
    
    const expandBtn = screen.getByRole('button', { name: /Expand/i });
    fireEvent.click(expandBtn);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'invalid json {' } });
    
    fireEvent.mouseDown(document.body);
    
    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
    });
    
    // Tray should still be open
    expect(screen.getByText(/JSON Schema/i)).toBeInTheDocument();
  });

  it('prevents contracting with invalid JSON', async () => {
    const schema = { title: 'Valid' };
    const setError = jest.fn();
    renderTray({ externalSchema: schema, setError });
    openTray();
    
    const expandBtn = screen.getByRole('button', { name: /Expand/i });
    fireEvent.click(expandBtn);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'bad json' } });
    
    const contractBtn = screen.getByRole('button', { name: /Contract/i });
    fireEvent.click(contractBtn);
    
    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
    });
    
    // Should still be expanded
    expect(screen.getByRole('button', { name: /Contract/i })).toBeInTheDocument();
  });

  it('shows error when file upload contains invalid JSON', async () => {
    const setError = jest.fn();
    renderTray({ setError });
    openTray();

    const file = new File(['{}'], 'schema.json', { type: 'application/json' });
    file.__content = 'not valid json {';

    const input = screen.getByLabelText(/Upload JSON File/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith('Invalid JSON file.');
    });
  });

  it('handles reduced mode prop', () => {
    renderTray({ reduced: true });
    openTray();
    // Should still render basic functionality
    expect(screen.getByText(/JSON Schema/i)).toBeInTheDocument();
  });

  it('calls onSchemaChange when schema changes via upload', async () => {
    const onSchemaChange = jest.fn();
    renderTray({ onSchemaChange });
    openTray();

    const file = new File(['{}'], 'schema.json', { type: 'application/json' });
    file.__content = JSON.stringify({ title: 'Uploaded' });

    const input = screen.getByLabelText(/Upload JSON File/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onSchemaChange).toHaveBeenCalledWith({ title: 'Uploaded' });
    });
  });

  it('calls onSchemaChange when schema changes via URL fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: 'FromURL' }),
    });

    const onSchemaChange = jest.fn();
    renderTray({ onSchemaChange });
    openTray();

    fireEvent.change(screen.getByPlaceholderText(/Enter schema URL/i), {
      target: { value: 'https://example.com/schema' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Fetch/i }));

    await waitFor(() => {
      expect(onSchemaChange).toHaveBeenCalledWith({ title: 'FromURL' });
    });
  });

  it('clears schema on null onSchemaChange when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    const onSchemaChange = jest.fn();
    renderTray({ onSchemaChange });
    openTray();

    fireEvent.change(screen.getByPlaceholderText(/Enter schema URL/i), {
      target: { value: 'bad-url' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Fetch/i }));

    await waitFor(() => {
      expect(onSchemaChange).toHaveBeenCalledWith(null);
    });
  });

  it('handles error when removing schema fails', async () => {
    const setError = jest.fn();
    removeSchemaFromBackend.mockRejectedValue(new Error('Delete failed'));
    
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    renderTray({ externalSchema: { title: 'x' }, setError });
    openTray();
    
    fireEvent.click(screen.getByText(/Remove Schema/i));
    
    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith('Failed to remove schema from server.');
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('handles backend fetch error gracefully', async () => {
    const setError = jest.fn();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchSchemaFromBackend.mockRejectedValue(new Error('Network error'));

    renderTray({ nodesFetched: true, setError });
    
    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith('Failed fetching schema from backend');
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('does not fetch from backend if externalSchema is provided', async () => {
    renderTray({ externalSchema: { title: 'External' }, nodesFetched: true });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(fetchSchemaFromBackend).not.toHaveBeenCalled();
  });

  it('does not fetch from backend if nodes are not fetched', async () => {
    renderTray({ nodesFetched: false });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(fetchSchemaFromBackend).not.toHaveBeenCalled();
  });

  it('formats schema object correctly for display', () => {
    const schema = { properties: { field1: { type: 'string' } } };
    renderTray({ externalSchema: schema });
    openTray();
    
    const expandBtn = screen.getByRole('button', { name: /Expand/i });
    fireEvent.click(expandBtn);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toContain('properties');
    expect(textarea.value).toContain('field1');
  });

  it('handles string schema in getFormattedSchema', () => {
    const schema = '{"simple":"string"}';
    renderTray({ externalSchema: schema });
    openTray();
    
    const expandBtn = screen.getByRole('button', { name: /Expand/i });
    fireEvent.click(expandBtn);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toContain('simple');
  });

  it('handles invalid schema string in getFormattedSchema', () => {
    const schema = 'not json {';
    renderTray({ externalSchema: schema });
    openTray();
    
    const expandBtn = screen.getByRole('button', { name: /Expand/i });
    fireEvent.click(expandBtn);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe(schema);
  });
});

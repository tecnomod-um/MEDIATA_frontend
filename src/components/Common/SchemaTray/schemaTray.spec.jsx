import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import SchemaTray from './schemaTray';
import {
  saveSchemaToBackend,
  fetchSchemaFromBackend,
  removeSchemaFromBackend,
} from '../../../util/petitionHandler';

vi.mock('../../../util/petitionHandler', () => ({
  __esModule: true,
  saveSchemaToBackend: vi.fn().mockResolvedValue(undefined),
  fetchSchemaFromBackend: vi.fn().mockResolvedValue(null),
  removeSchemaFromBackend: vi.fn().mockResolvedValue(undefined),
}));

const renderTray = (props = {}) =>
  render(
    <SchemaTray
      error=""
      setError={vi.fn()}
      setShowError={vi.fn()}
      nodesFetched={false}
      {...props}
    />
  );

const openTray = () => fireEvent.click(screen.getByText(/^Schema$/i));

beforeAll(() => {
  class MockFileReader {
    readAsText(file) {
      setTimeout(() => {
        this.onload?.({ target: { result: file.__content } });
      }, 0);
    }
  }

  global.FileReader = MockFileReader;
});

const originalFetch = global.fetch;

afterAll(() => {
  global.fetch = originalFetch;
});

describe('SchemaTray • basic UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders closed tab initially', () => {
    renderTray();
    expect(screen.getByText(/^Schema$/i)).toBeInTheDocument();
  });

  it('opens tray on tab click', () => {
    renderTray();
    openTray();
    expect(screen.getByText(/JSON Schema/i)).toBeInTheDocument();
  });

  it('shows “No schema has been set” when empty', () => {
    renderTray();
    openTray();
    expect(screen.getByText(/No schema has been set/i)).toBeInTheDocument();
  });

  it('renders external schema if provided', () => {
    renderTray({ externalSchema: { title: 'test' } });
    openTray();
    expect(screen.getByText(/test/i)).toBeInTheDocument();
  });
});

describe('SchemaTray • persistence actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes schema on “Remove Schema” click', async () => {
    removeSchemaFromBackend.mockResolvedValue({});
    const onSchemaChange = vi.fn();
    const onRemoveExternalSchema = vi.fn();

    renderTray({
      externalSchema: { title: 'x' },
      onSchemaChange,
      onRemoveExternalSchema,
    });

    openTray();
    fireEvent.click(screen.getByText(/Remove Schema/i));

    await waitFor(() =>
      expect(removeSchemaFromBackend).toHaveBeenCalledTimes(1)
    );

    expect(onSchemaChange).toHaveBeenCalledWith(null);
    expect(onRemoveExternalSchema).toHaveBeenCalled();
  });

  it('fetches schema from backend once nodes are fetched', async () => {
    fetchSchemaFromBackend.mockResolvedValue({
      schema: { title: 'Fetched' },
    });

    renderTray({ nodesFetched: true });
    openTray();

    await waitFor(() => {
      expect(fetchSchemaFromBackend).toHaveBeenCalled();
    });

    expect(screen.getByText(/Fetched/i)).toBeInTheDocument();
  });
});

describe('SchemaTray • file upload & URL fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses uploaded JSON file, shows preview & saves', async () => {
    const onSchemaChange = vi.fn();

    renderTray({ onSchemaChange });
    openTray();

    const file = new File(['{}'], 'schema.json', { type: 'application/json' });
    file.__content = JSON.stringify({ title: 'Upload' });

    const input = screen.getByLabelText(/Upload JSON File/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(saveSchemaToBackend).toHaveBeenCalledWith({ title: 'Upload' })
    );

    expect(onSchemaChange).toHaveBeenCalledWith({ title: 'Upload' });
    expect(screen.getByText(/Upload/i)).toBeInTheDocument();
  });

  it('fetches schema from URL and persists it', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: 'Remote' }),
    });

    renderTray();
    openTray();

    fireEvent.change(screen.getByPlaceholderText(/Enter schema URL/i), {
      target: { value: 'https://example.com/schema.json' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Fetch/i }));

    await waitFor(() =>
      expect(saveSchemaToBackend).toHaveBeenCalledWith({ title: 'Remote' })
    );

    expect(screen.getByText(/Remote/i)).toBeInTheDocument();
  });

  it('shows error when URL fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const setError = vi.fn();
    const setShowError = vi.fn();

    renderTray({ setError, setShowError });
    openTray();

    fireEvent.change(screen.getByPlaceholderText(/Enter schema URL/i), {
      target: { value: 'bad-url' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Fetch/i }));

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith('Failed to fetch schema.');
    });
  });
});

describe('SchemaTray • interaction details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles Expand / Contract button', () => {
    renderTray({ externalSchema: { msg: 'foo' } });
    openTray();

    const btn = screen.getByRole('button', { name: /Expand/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: /Contract/i })).toBeInTheDocument();
  });

  it('closes tray when user clicks outside', async () => {
    renderTray();
    openTray();

    expect(screen.getByText(/JSON Schema/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Schema$/i)).not.toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.getByText(/^Schema$/i)).toBeInTheDocument();
    });
  });

  it('saves draft on Ctrl+S when expanded', async () => {
    const schema = { title: 'Test' };

    renderTray({ externalSchema: schema });
    openTray();

    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ title: 'Updated' }) },
    });

    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    await waitFor(() => {
      expect(saveSchemaToBackend).toHaveBeenCalledWith({ title: 'Updated' });
    });
  });

  it('saves draft on Meta+S (Mac) when expanded', async () => {
    const schema = { title: 'Test' };

    renderTray({ externalSchema: schema });
    openTray();

    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ title: 'MetaUpdated' }) },
    });

    fireEvent.keyDown(window, { key: 'S', metaKey: true });

    await waitFor(() => {
      expect(saveSchemaToBackend).toHaveBeenCalledWith({
        title: 'MetaUpdated',
      });
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
    const setError = vi.fn();

    renderTray({ externalSchema: schema, setError });
    openTray();

    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'invalid json {' } });

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON')
      );
    });

    expect(screen.getByText(/JSON Schema/i)).toBeInTheDocument();
  });

  it('prevents contracting with invalid JSON', async () => {
    const schema = { title: 'Valid' };
    const setError = vi.fn();

    renderTray({ externalSchema: schema, setError });
    openTray();

    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'bad json' } });

    fireEvent.click(screen.getByRole('button', { name: /Contract/i }));

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON')
      );
    });

    expect(screen.getByRole('button', { name: /Contract/i })).toBeInTheDocument();
  });

  it('shows error when file upload contains invalid JSON', async () => {
    const setError = vi.fn();

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
    expect(screen.getByText(/JSON Schema/i)).toBeInTheDocument();
  });

  it('calls onSchemaChange when schema changes via upload', async () => {
    const onSchemaChange = vi.fn();

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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: 'FromURL' }),
    });

    const onSchemaChange = vi.fn();

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
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const onSchemaChange = vi.fn();

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
    const setError = vi.fn();
    removeSchemaFromBackend.mockRejectedValue(new Error('Delete failed'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderTray({ externalSchema: { title: 'x' }, setError });
    openTray();

    fireEvent.click(screen.getByText(/Remove Schema/i));

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith(
        'Failed to remove schema from server.'
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles backend fetch error gracefully', async () => {
    const setError = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchSchemaFromBackend.mockRejectedValue(new Error('Network error'));

    renderTray({ nodesFetched: true, setError });

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith(
        'Failed fetching schema from backend'
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('does not fetch from backend if externalSchema is provided', async () => {
    renderTray({ externalSchema: { title: 'External' }, nodesFetched: true });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(fetchSchemaFromBackend).not.toHaveBeenCalled();
  });

  it('does not fetch from backend if nodes are not fetched', async () => {
    renderTray({ nodesFetched: false });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(fetchSchemaFromBackend).not.toHaveBeenCalled();
  });

  it('formats schema object correctly for display', () => {
    const schema = { properties: { field1: { type: 'string' } } };

    renderTray({ externalSchema: schema });
    openTray();

    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));

    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toContain('properties');
    expect(textarea.value).toContain('field1');
  });

  it('handles string schema in getFormattedSchema', () => {
    const schema = '{"simple":"string"}';

    renderTray({ externalSchema: schema });
    openTray();

    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));

    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toContain('simple');
  });

  it('handles invalid schema string in getFormattedSchema', () => {
    const schema = 'not json {';

    renderTray({ externalSchema: schema });
    openTray();

    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));

    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe(schema);
  });

  it('prevents closing tray with close button when JSON is invalid', async () => {
    const schema = { title: 'Valid' };
    const setError = vi.fn();

    renderTray({ externalSchema: schema, setError });
    openTray();

    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'invalid json' } });

    fireEvent.click(screen.getByLabelText(/Close/i));

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON')
      );
    });

    expect(screen.getByText(/JSON Schema/i)).toBeInTheDocument();
  });

  it('closes tray successfully with close button when JSON is valid', async () => {
    const schema = { title: 'Valid' };

    renderTray({ externalSchema: schema });
    openTray();

    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ title: 'Updated' }) },
    });

    fireEvent.click(screen.getByLabelText(/Close/i));

    await waitFor(() => {
      expect(saveSchemaToBackend).toHaveBeenCalledWith({ title: 'Updated' });
    });

    await waitFor(() => {
      expect(screen.getByText(/^Schema$/i)).toBeInTheDocument();
    });
  });

  it('clears error when editing text in expanded mode', () => {
    const schema = { title: 'Valid' };
    const setError = vi.fn();

    renderTray({ externalSchema: schema, setError, error: 'Some error' });
    openTray();

    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ title: 'New' }) },
    });

    expect(setError).toHaveBeenCalledWith('');
  });
});
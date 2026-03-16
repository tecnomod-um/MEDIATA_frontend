import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ElementForm from './elementForm';
import { vi } from "vitest";

describe('<ElementForm />', () => {
  const element = { id: 123, label: 'Test Element' };
  const formValues = {
    description: 'Initial desc',
    possibleValues: 'val1, val2',
    valueType: 'string',
  };
  const onChange = vi.fn();
  const onCreateClusters = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no element is provided', () => {
    render(
      <ElementForm
        element={null}
        formValues={formValues}
        onChange={onChange}
        onCreateClusters={onCreateClusters}
        allDescribed={false}
      />
    );
    expect(screen.queryByTestId('element-form')).toBeNull();
  });

  it('renders the element label and form fields without Create Clusters button', () => {
    render(
      <ElementForm
        element={element}
        formValues={formValues}
        onChange={onChange}
        onCreateClusters={onCreateClusters}
        allDescribed={false}
      />
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Element');
    expect(screen.queryByText(/create clusters/i)).toBeNull();
    const nameInput = screen.getByDisplayValue('Test Element');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeDisabled();
    const descTextarea = screen.getByDisplayValue('Initial desc');
    expect(descTextarea.tagName).toBe('TEXTAREA');
    const pvTextarea = screen.getByDisplayValue('val1, val2');
    expect(pvTextarea.tagName).toBe('TEXTAREA');
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('string');
  });

  it('shows Create Clusters button when allDescribed=true and calls handler on click', () => {
    render(
      <ElementForm
        element={element}
        formValues={formValues}
        onChange={onChange}
        onCreateClusters={onCreateClusters}
        allDescribed={true}
      />
    );

    const btn = screen.getByRole('button', { name: /create clusters/i });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(onCreateClusters).toHaveBeenCalledTimes(1);
  });

  it('calls onChange correctly for description textarea', () => {
    render(
      <ElementForm
        element={element}
        formValues={formValues}
        onChange={onChange}
        onCreateClusters={onCreateClusters}
        allDescribed={false}
      />
    );

    const descTextarea = screen.getByDisplayValue('Initial desc');
    fireEvent.change(descTextarea, { target: { value: 'New description' } });
    expect(onChange).toHaveBeenCalledWith('description', 'New description');
  });

  it('calls onChange correctly for possibleValues textarea', () => {
    render(
      <ElementForm
        element={element}
        formValues={formValues}
        onChange={onChange}
        onCreateClusters={onCreateClusters}
        allDescribed={false}
      />
    );

    const pvTextarea = screen.getByDisplayValue('val1, val2');
    fireEvent.change(pvTextarea, { target: { value: 'A,B,C' } });
    expect(onChange).toHaveBeenCalledWith('possibleValues', 'A,B,C');
  });

  it('calls onChange correctly for valueType select', () => {
    render(
      <ElementForm
        element={element}
        formValues={formValues}
        onChange={onChange}
        onCreateClusters={onCreateClusters}
        allDescribed={false}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'integer' } });
    expect(onChange).toHaveBeenCalledWith('valueType', 'integer');
  });
});

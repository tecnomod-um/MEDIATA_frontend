import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeleteConfirmation from './deleteConfirmation';

describe('DeleteConfirmation', () => {
  const defaultProps = {
    show: true,
    selectedCount: 3,
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
    busy: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when show is false', () => {
    const { container } = render(<DeleteConfirmation {...defaultProps} show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when show is true', () => {
    render(<DeleteConfirmation {...defaultProps} />);
    expect(screen.getByRole('dialog', { name: /delete confirmation/i })).toBeInTheDocument();
  });

  it('displays correct text for multiple files', () => {
    render(<DeleteConfirmation {...defaultProps} selectedCount={3} />);
    expect(screen.getByText('Delete 3 files?')).toBeInTheDocument();
  });

  it('displays correct text for single file', () => {
    render(<DeleteConfirmation {...defaultProps} selectedCount={1} />);
    expect(screen.getByText('Delete 1 file?')).toBeInTheDocument();
  });

  it('displays title', () => {
    render(<DeleteConfirmation {...defaultProps} />);
    // Use a more specific query to avoid finding both the title and button
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete');
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<DeleteConfirmation {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when delete button is clicked', () => {
    render(<DeleteConfirmation {...defaultProps} />);
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when close icon is clicked', () => {
    render(<DeleteConfirmation {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when clicking overlay background', () => {
    render(<DeleteConfirmation {...defaultProps} />);
    const overlay = screen.getByRole('presentation');
    fireEvent.mouseDown(overlay);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking dialog content', () => {
    render(<DeleteConfirmation {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('disables buttons when busy is true', () => {
    render(<DeleteConfirmation {...defaultProps} busy={true} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    const closeButton = screen.getByLabelText(/close/i);
    
    expect(cancelButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(closeButton).toBeDisabled();
  });

  it('does not close overlay when busy and clicking background', () => {
    render(<DeleteConfirmation {...defaultProps} busy={true} />);
    const overlay = screen.getByRole('presentation');
    fireEvent.mouseDown(overlay);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('enables buttons when busy is false', () => {
    render(<DeleteConfirmation {...defaultProps} busy={false} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    const closeButton = screen.getByLabelText(/close/i);
    
    expect(cancelButton).not.toBeDisabled();
    expect(deleteButton).not.toBeDisabled();
    expect(closeButton).not.toBeDisabled();
  });

  it('handles zero selected count', () => {
    render(<DeleteConfirmation {...defaultProps} selectedCount={0} />);
    expect(screen.getByText('Delete 0 files?')).toBeInTheDocument();
  });

  it('handles large selected count', () => {
    render(<DeleteConfirmation {...defaultProps} selectedCount={100} />);
    expect(screen.getByText('Delete 100 files?')).toBeInTheDocument();
  });
});

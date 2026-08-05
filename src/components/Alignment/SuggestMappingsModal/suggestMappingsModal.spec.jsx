import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SuggestMappingsModal from './suggestMappingsModal';

vi.mock('../../Common/OverlayWrapper/overlayWrapper', () => ({
  __esModule: true,
  default: ({ isOpen, children }) => isOpen ? <>{children}</> : null,
}));

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onReplace: vi.fn(),
  onAppend: vi.fn(),
  hasExistingMappings: false,
};

describe('SuggestMappingsModal', () => {
  it('renders nothing when isOpen=false', () => {
    const { container } = render(<SuggestMappingsModal {...baseProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal content when isOpen=true', () => {
    render(<SuggestMappingsModal {...baseProps} />);
    expect(screen.getByText('Apply suggested mappings')).toBeInTheDocument();
  });

  it('shows text about existing mappings when hasExistingMappings=true', () => {
    render(<SuggestMappingsModal {...baseProps} hasExistingMappings={true} />);
    expect(
      screen.getByText('You already have a mapping hierarchy. How should the suggested mappings be applied?')
    ).toBeInTheDocument();
  });

  it('shows different text when hasExistingMappings=false', () => {
    render(<SuggestMappingsModal {...baseProps} hasExistingMappings={false} />);
    expect(
      screen.getByText('No existing mappings found. Choose how to apply suggestions.')
    ).toBeInTheDocument();
  });

  it('Replace button is disabled when hasExistingMappings=false', () => {
    render(<SuggestMappingsModal {...baseProps} hasExistingMappings={false} />);
    expect(screen.getByRole('button', { name: 'Replace' })).toBeDisabled();
  });

  it('Replace button is enabled when hasExistingMappings=true', () => {
    render(<SuggestMappingsModal {...baseProps} hasExistingMappings={true} />);
    expect(screen.getByRole('button', { name: 'Replace' })).not.toBeDisabled();
  });

  it('calls onReplace when Replace clicked and enabled', () => {
    const onReplace = vi.fn();
    render(<SuggestMappingsModal {...baseProps} hasExistingMappings={true} onReplace={onReplace} />);
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(onReplace).toHaveBeenCalledTimes(1);
  });

  it('calls onAppend when Append clicked', () => {
    const onAppend = vi.fn();
    render(<SuggestMappingsModal {...baseProps} onAppend={onAppend} />);
    fireEvent.click(screen.getByRole('button', { name: 'Append' }));
    expect(onAppend).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<SuggestMappingsModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key calls onClose when isOpen=true', () => {
    const onClose = vi.fn();
    render(<SuggestMappingsModal {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('key listener is removed on cleanup', () => {
    const onClose = vi.fn();
    const { unmount } = render(<SuggestMappingsModal {...baseProps} onClose={onClose} />);
    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

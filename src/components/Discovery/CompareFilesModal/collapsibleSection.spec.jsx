import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CollapsibleSection from './collapsibleSection';
import { vi } from "vitest";

describe('CollapsibleSection', () => {
  it('renders with title and children', () => {
    const toggle = vi.fn();
    render(
      <CollapsibleSection title="Test Section" isCollapsed={false} toggle={toggle}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls toggle when Enter key is pressed', () => {
    const toggle = vi.fn();
    render(
      <CollapsibleSection title="Test Section" isCollapsed={true} toggle={toggle}>
        <div>Content</div>
      </CollapsibleSection>
    );

    const heading = screen.getByRole('button', { name: /Test Section/i });
    fireEvent.keyDown(heading, { key: 'Enter' });
    
    expect(toggle).toHaveBeenCalled();
  });

  it('calls toggle when Space key is pressed', () => {
    const toggle = vi.fn();
    render(
      <CollapsibleSection title="Test Section" isCollapsed={true} toggle={toggle}>
        <div>Content</div>
      </CollapsibleSection>
    );

    const heading = screen.getByRole('button', { name: /Test Section/i });
    fireEvent.keyDown(heading, { key: ' ' });
    
    expect(toggle).toHaveBeenCalled();
  });

  it('renders badge when provided', () => {
    const toggle = vi.fn();
    render(
      <CollapsibleSection title="Test Section" badge={5} isCollapsed={false} toggle={toggle}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

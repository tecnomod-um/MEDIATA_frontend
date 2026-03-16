import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChartPreview from './chartPreview';
import { vi } from "vitest";

vi.mock('../../Common/OverlayWrapper/overlayWrapper', () => ({
  __esModule: true,
  default: ({ isOpen, closeModal, children }) => (
    <div
      data-testid="overlay"
      data-isopen={String(isOpen)}
      data-has-closemodal={String(typeof closeModal === 'function')}
    >
      {children}
    </div>
  ),
}));

vi.mock('./chartPreview.module.css', () => ({
  __esModule: true,
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

describe('<ChartPreview />', () => {
  const content = <span data-testid="inner">Hello World</span>;
  const closeFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders content inside the chartContainer when open', () => {
    render(<ChartPreview isOpen={true} content={content} closeModal={closeFn} />);

    const overlay = screen.getByTestId('overlay');
    expect(overlay).toHaveAttribute('data-isopen', 'true');
    expect(overlay).toHaveAttribute('data-has-closemodal', 'true');
    expect(screen.getByTestId('inner')).toHaveTextContent('Hello World');
  });

  it('still renders content when closed but indicates isOpen=false', () => {
    render(<ChartPreview isOpen={false} content={content} closeModal={closeFn} />);

    const overlay = screen.getByTestId('overlay');
    expect(overlay).toHaveAttribute('data-isopen', 'false');
    expect(overlay).toHaveAttribute('data-has-closemodal', 'true');
    expect(screen.getByTestId('inner')).toBeInTheDocument();
  });
});
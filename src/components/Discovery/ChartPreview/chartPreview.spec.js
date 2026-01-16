import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChartPreview from './chartPreview';

jest.mock('../../Common/OverlayWrapper/overlayWrapper', () => {
  return ({ isOpen, closeModal, children }) => (
    <div
      data-testid="overlay"
      data-isopen={isOpen}
      data-has-closemodal={typeof closeModal === 'function'}
    >
      {children}
    </div>
  );
});

describe('<ChartPreview />', () => {
  const content = <span data-testid="inner">Hello World</span>;
  const closeFn = jest.fn();

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

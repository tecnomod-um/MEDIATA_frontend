import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import PageImage from './pageImage';
import useScrollFade from '../../../hooks/useScrollFade';

vi.mock('./pageImage.module.css', () => ({
  default: {
    image: 'mock-image-class',
    darkShadow: 'mock-dark-shadow-class',
  },
}));

vi.mock('../../../hooks/useScrollFade', () => ({
  default: vi.fn(() => ({
    ref: { current: null },
    style: { opacity: 1 },
  })),
}));

describe('PageImage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useScrollFade.mockReturnValue({
      ref: { current: null },
      style: { opacity: 1 },
    });
  });

  it('renders image with required imageSrc prop', () => {
    render(<PageImage imageSrc="test-image.jpg" />);

    const img = screen.getByAltText('Sample');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'test-image.jpg');

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).toBeInTheDocument();
  });

  it('renders container (outer div) properly', () => {
    render(<PageImage imageSrc="test.jpg" />);

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).toBeInTheDocument();
  });

  it('applies width and height when maintainAspectRatio is false', () => {
    render(
      <PageImage
        imageSrc="test.jpg"
        width="300px"
        height="200px"
        maintainAspectRatio={false}
      />
    );

    const img = screen.getByAltText('Sample');
    expect(img).toHaveStyle({ width: '300px', height: '200px' });
  });

  it('applies maxWidth and maxHeight when maintainAspectRatio is true', () => {
    render(
      <PageImage
        imageSrc="test.jpg"
        width="300px"
        height="200px"
        maintainAspectRatio
      />
    );

    const img = screen.getByAltText('Sample');
    expect(img).toHaveStyle({ maxWidth: '100%', maxHeight: '100%' });
  });

  it('applies dark shadow class when addDarkBorder is true', () => {
    render(<PageImage imageSrc="test.jpg" addDarkBorder />);

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).toHaveClass('mock-dark-shadow-class');
  });

  it('does not apply dark shadow class when addDarkBorder is false', () => {
    render(<PageImage imageSrc="test.jpg" addDarkBorder={false} />);

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).not.toHaveClass('mock-dark-shadow-class');
  });

  it('does not apply dark shadow class when addDarkBorder is undefined', () => {
    render(<PageImage imageSrc="test.jpg" />);

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).not.toHaveClass('mock-dark-shadow-class');
  });

  it('applies useScrollFade styles to container', () => {
    const mockStyle = { opacity: 0.5, transform: 'translateY(10px)' };

    useScrollFade.mockReturnValue({
      ref: { current: null },
      style: mockStyle,
    });

    render(<PageImage imageSrc="test.jpg" />);

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).toHaveStyle(mockStyle);
  });

  it('handles missing imageSrc gracefully', () => {
    render(<PageImage />);

    const img = screen.getByAltText('Sample');
    expect(img).toBeInTheDocument();
    expect(img).not.toHaveAttribute('src');
  });

  it('uses correct default prop values (no width/height inline styles)', () => {
    render(<PageImage imageSrc="test.jpg" />);

    const img = screen.getByAltText('Sample');
    const styleAttr = img.getAttribute('style') || '';
    expect(styleAttr).not.toMatch(/width:/i);
    expect(styleAttr).not.toMatch(/height:/i);
  });

  it('applies base image class to container', () => {
    render(<PageImage imageSrc="test.jpg" />);

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).toHaveClass('mock-image-class');
  });
});
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PageImage from './pageImage.js';

jest.mock('./pageImage.module.css', () => ({
  __esModule: true,
  default: {
    image: 'mock-image-class',
    darkShadow: 'mock-dark-shadow-class',
  },
}));

jest.mock('../../../hooks/useScrollFade.js', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    ref: { current: null },
    style: { opacity: 1 },
  })),
}));

const useScrollFade = require('../../../hooks/useScrollFade.js').default;

describe('PageImage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useScrollFade.mockReturnValue({
      ref: { current: null },
      style: { opacity: 1 },
    });
  });

  test('renders image with required imageSrc prop', () => {
    render(<PageImage imageSrc="test-image.jpg" />);
    const img = screen.getByAltText('Sample');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'test-image.jpg');

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).toBeInTheDocument();
  });

  test('renders container (outer div) properly', () => {
    render(<PageImage imageSrc="test.jpg" />);

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).toBeInTheDocument();
  });

  test('applies width and height when maintainAspectRatio is false', () => {
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

  test('applies maxWidth and maxHeight when maintainAspectRatio is true', () => {
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

  test('applies dark shadow class when addDarkBorder is true', () => {
    render(<PageImage imageSrc="test.jpg" addDarkBorder />);

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).toHaveClass('mock-dark-shadow-class');
  });

  test('does not apply dark shadow class when addDarkBorder is false', () => {
    render(<PageImage imageSrc="test.jpg" addDarkBorder={false} />);

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).not.toHaveClass('mock-dark-shadow-class');
  });

  test('does not apply dark shadow class when addDarkBorder is undefined', () => {
    render(<PageImage imageSrc="test.jpg" />);

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).not.toHaveClass('mock-dark-shadow-class');
  });

  test('applies useScrollFade styles to container', () => {
    const mockStyle = { opacity: 0.5, transform: 'translateY(10px)' };
    useScrollFade.mockReturnValue({
      ref: { current: null },
      style: mockStyle,
    });

    render(<PageImage imageSrc="test.jpg" />);

    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).toHaveStyle(mockStyle);
  });

  test('handles missing imageSrc gracefully', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => { });
    render(<PageImage />);

    const img = screen.getByAltText('Sample');
    expect(img).toBeInTheDocument();
    expect(img).not.toHaveAttribute('src');
    spy.mockRestore();
  });

  test('uses correct default prop values (no width/height inline styles)', () => {
    render(<PageImage imageSrc="test.jpg" />);
    const img = screen.getByAltText('Sample');
    const styleAttr = img.getAttribute('style') || '';
    expect(styleAttr).not.toMatch(/width:/i);
    expect(styleAttr).not.toMatch(/height:/i);
  });

  test('applies base image class to container', () => {
    render(<PageImage imageSrc="test.jpg" />);
    const container = screen.getByRole('img', { name: /page image container/i });
    expect(container).toHaveClass('mock-image-class');
  });
});

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Slide from './slide.js';

jest.mock('./slide.module.css', () => ({
  slideContainer: 'slideContainer',
  imageContainer: 'imageContainer',
  slideImage: 'slideImage',
  active: 'active',
  arrow: 'arrow',
  left: 'left',
  right: 'right',
  slideTextContainer: 'slideTextContainer',
  slideText: 'slideText',
  controls: 'controls',
  controlButton: 'controlButton',
  activeControl: 'activeControl',
}), { virtual: true });

jest.mock('@mui/icons-material/ChevronLeft', () => () => <span>◀</span>);
jest.mock('@mui/icons-material/ChevronRight', () => () => <span>▶</span>);

const IMGS = ['a.jpg', 'b.jpg', 'c.jpg'];
const STEPS = ['Step 1', 'Step 2', 'Step 3'];

const setup = (images = IMGS, steps = STEPS) => {
  render(<Slide images={images} steps={steps} />);

  const getActiveImageIndex = () => {
    const imgs = screen.queryAllByRole('img', { name: /Slide \d+/ });
    return imgs.findIndex((img) => img.className.split(' ').includes('active'));
  };

  const getControlsGroup = () =>
    screen.getByRole('group', { name: /slide controls/i });

  const getPrevArrow = () =>
    screen.getByRole('button', { name: /previous slide/i });

  const getNextArrow = () =>
    screen.getByRole('button', { name: /next slide/i });

  const getSlideText = () =>
    screen.getByRole('status', { name: /slide text/i });

  return {
    getActiveImageIndex,
    getControlsGroup,
    getPrevArrow,
    getNextArrow,
    getSlideText,
  };
};

describe('Slide • basic rendering', () => {
  it('renders images/alt, first is active, text and controls are correct', () => {
    const { getActiveImageIndex, getControlsGroup, getSlideText } = setup();

    const imgs = screen.getAllByRole('img', { name: /Slide \d+/ });
    expect(imgs).toHaveLength(3);
    expect(imgs[0]).toHaveAttribute('src', IMGS[0]);
    expect(imgs[1]).toHaveAttribute('src', IMGS[1]);
    expect(imgs[2]).toHaveAttribute('src', IMGS[2]);

    expect(imgs[0]).toHaveAttribute('alt', 'Slide 1');
    expect(imgs[1]).toHaveAttribute('alt', 'Slide 2');
    expect(imgs[2]).toHaveAttribute('alt', 'Slide 3');

    expect(getActiveImageIndex()).toBe(0);
    expect(getSlideText()).toHaveTextContent('Step 1');

    const controls = getControlsGroup();
    const buttons = within(controls).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['1', '2', '3']);
    expect(buttons[0].className).toEqual(expect.stringContaining('activeControl'));
    expect(buttons[1].className).not.toEqual(expect.stringContaining('activeControl'));
  });

  it('renders safely with empty arrays', () => {
    const { getControlsGroup, getSlideText, getPrevArrow, getNextArrow } = setup([], []);

    expect(screen.queryAllByRole('img', { name: /Slide \d+/ })).toHaveLength(0);
    const controls = getControlsGroup();
    expect(within(controls).queryAllByRole('button')).toHaveLength(0);
    expect(getSlideText()).toHaveTextContent('');
    expect(getPrevArrow()).toBeDisabled();
    expect(getNextArrow()).toBeDisabled();
  });
});

describe('Slide • numbered control navigation', () => {
  it('clicking a control moves to that slide, updates text and active classes', () => {
    const { getActiveImageIndex, getControlsGroup, getSlideText } = setup();

    fireEvent.click(
      screen.getByRole('button', { name: /go to slide 2/i })
    );
    expect(getActiveImageIndex()).toBe(1);
    expect(getSlideText()).toHaveTextContent('Step 2');

    const controls = getControlsGroup();
    const [b1, b2] = within(controls).getAllByRole('button');
    expect(b2.className).toEqual(expect.stringContaining('activeControl'));
    expect(b1.className).not.toEqual(expect.stringContaining('activeControl'));

    fireEvent.click(
      screen.getByRole('button', { name: /go to slide 3/i })
    );
    expect(getActiveImageIndex()).toBe(2);
    expect(getSlideText()).toHaveTextContent('Step 3');
  });
});

describe('Slide • arrow navigation', () => {
  it('right arrow advances and wraps to first', () => {
    const { getNextArrow, getActiveImageIndex, getSlideText } = setup();

    fireEvent.click(getNextArrow());
    expect(getActiveImageIndex()).toBe(1);
    expect(getSlideText()).toHaveTextContent('Step 2');

    fireEvent.click(getNextArrow());
    expect(getActiveImageIndex()).toBe(2);
    expect(getSlideText()).toHaveTextContent('Step 3');

    fireEvent.click(getNextArrow());
    expect(getActiveImageIndex()).toBe(0);
    expect(getSlideText()).toHaveTextContent('Step 1');
  });

  it('left arrow goes back and wraps from first to last', () => {
    const { getPrevArrow, getActiveImageIndex, getSlideText } = setup();

    fireEvent.click(getPrevArrow());
    expect(getActiveImageIndex()).toBe(2);
    expect(getSlideText()).toHaveTextContent('Step 3');

    fireEvent.click(getPrevArrow());
    expect(getActiveImageIndex()).toBe(1);
    expect(getSlideText()).toHaveTextContent('Step 2');
  });

  it('with a single image, arrows are disabled and index stays at 0', () => {
    const { getPrevArrow, getNextArrow, getActiveImageIndex, getSlideText } =
      setup(['only.jpg'], ['Only']);

    expect(getActiveImageIndex()).toBe(0);
    expect(getSlideText()).toHaveTextContent('Only');

    expect(getNextArrow()).toBeDisabled();
    expect(getPrevArrow()).toBeDisabled();
  });
});

describe('Slide • class management', () => {
  it('applies `active` to current image and `activeControl` to current dot', () => {
    const { getNextArrow, getControlsGroup } = setup();

    const imgs = screen.getAllByRole('img', { name: /Slide \d+/ });
    const controls = getControlsGroup();
    const dots = within(controls).getAllByRole('button');

    expect(imgs[0].className).toEqual(expect.stringContaining('active'));
    expect(dots[0].className).toEqual(expect.stringContaining('activeControl'));
    expect(imgs[1].className).not.toEqual(expect.stringContaining('active'));

    fireEvent.click(getNextArrow());

    expect(imgs[1].className).toEqual(expect.stringContaining('active'));
    expect(dots[1].className).toEqual(expect.stringContaining('activeControl'));
    expect(imgs[0].className).not.toEqual(expect.stringContaining('active'));
    expect(dots[0].className).not.toEqual(expect.stringContaining('activeControl'));
  });
});

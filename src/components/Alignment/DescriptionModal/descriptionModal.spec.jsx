import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DescriptionModal from './descriptionModal';

vi.mock('../../Common/OverlayWrapper/overlayWrapper', () => ({
  __esModule: true,
  default: ({ isOpen, children }) => isOpen ? <>{children}</> : null,
}));

const baseProps = {
  isOpen: true,
  closeModal: vi.fn(),
  items: [],
  activeIndex: 0,
  value: '',
  onChange: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
};

const unionItem = { kind: 'union', label: 'ColName', index: 0 };
const valueItem = { kind: 'value', label: 'ValName', index: 0 };
const unlabelledValueItem0 = { kind: 'value', label: '', index: 0 };
const unlabelledValueItem1 = { kind: 'value', label: '', index: 1 };

describe('DescriptionModal', () => {
  it('renders nothing when isOpen=false', () => {
    const { container } = render(<DescriptionModal {...baseProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal content when isOpen=true', () => {
    render(<DescriptionModal {...baseProps} items={[unionItem]} />);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('shows counter "1 / 2" with activeIndex=0 and 2 items', () => {
    render(<DescriptionModal {...baseProps} items={[unionItem, valueItem]} activeIndex={0} />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('shows "0 / 0" when items=[]', () => {
    render(<DescriptionModal {...baseProps} items={[]} />);
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });

  it('shows union item label in context section', () => {
    render(<DescriptionModal {...baseProps} items={[unionItem]} activeIndex={0} />);
    expect(screen.getByText('Column:')).toBeInTheDocument();
    expect(screen.getByText('ColName')).toBeInTheDocument();
  });

  it('shows value item label in context section', () => {
    render(<DescriptionModal {...baseProps} items={[valueItem]} activeIndex={0} />);
    expect(screen.getByText('Value:')).toBeInTheDocument();
    expect(screen.getByText('ValName')).toBeInTheDocument();
  });

  it('shows ordinal "(value #1)" when value item has no label and activeIndex=1', () => {
    render(
      <DescriptionModal
        {...baseProps}
        items={[valueItem, unlabelledValueItem1]}
        activeIndex={1}
      />
    );
    expect(screen.getByText('(value #1)')).toBeInTheDocument();
  });

  it('prev button is disabled when activeIndex=0', () => {
    render(<DescriptionModal {...baseProps} items={[unionItem, valueItem]} activeIndex={0} />);
    expect(screen.getByLabelText('Previous')).toBeDisabled();
  });

  it('prev button is enabled when activeIndex=1', () => {
    render(<DescriptionModal {...baseProps} items={[unionItem, valueItem]} activeIndex={1} />);
    expect(screen.getByLabelText('Previous')).not.toBeDisabled();
  });

  it('next button is disabled at last index', () => {
    render(<DescriptionModal {...baseProps} items={[unionItem, valueItem]} activeIndex={1} />);
    expect(screen.getByLabelText('Next')).toBeDisabled();
  });

  it('next button is enabled before last index', () => {
    render(<DescriptionModal {...baseProps} items={[unionItem, valueItem]} activeIndex={0} />);
    expect(screen.getByLabelText('Next')).not.toBeDisabled();
  });

  it('calls onPrev when prev button clicked and not disabled', () => {
    const onPrev = vi.fn();
    render(
      <DescriptionModal {...baseProps} items={[unionItem, valueItem]} activeIndex={1} onPrev={onPrev} />
    );
    fireEvent.click(screen.getByLabelText('Previous'));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when next button clicked and not disabled', () => {
    const onNext = vi.fn();
    render(
      <DescriptionModal {...baseProps} items={[unionItem, valueItem]} activeIndex={0} onNext={onNext} />
    );
    fireEvent.click(screen.getByLabelText('Next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('calls closeModal on close button click', () => {
    const closeModal = vi.fn();
    render(<DescriptionModal {...baseProps} items={[unionItem]} closeModal={closeModal} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('calls closeModal on Done button click', () => {
    const closeModal = vi.fn();
    render(<DescriptionModal {...baseProps} items={[unionItem]} closeModal={closeModal} />);
    fireEvent.click(screen.getByText('Done'));
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('calls onChange when textarea changes', () => {
    const onChange = vi.fn();
    render(<DescriptionModal {...baseProps} items={[unionItem]} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('textarea shows correct value prop', () => {
    render(<DescriptionModal {...baseProps} items={[unionItem]} value="my text" />);
    expect(screen.getByRole('textbox')).toHaveValue('my text');
  });

  it('placeholder is "Describe ColName" when union item has label', () => {
    render(<DescriptionModal {...baseProps} items={[unionItem]} activeIndex={0} />);
    expect(screen.getByPlaceholderText('Describe ColName')).toBeInTheDocument();
  });

  it('placeholder is "Describe the first value" when value item has no label (index=0)', () => {
    render(<DescriptionModal {...baseProps} items={[unlabelledValueItem0]} activeIndex={0} />);
    expect(screen.getByPlaceholderText('Describe the first value')).toBeInTheDocument();
  });

  it('placeholder is "Describe the second value" for value item with index=1', () => {
    render(<DescriptionModal {...baseProps} items={[unlabelledValueItem1]} activeIndex={0} />);
    expect(screen.getByPlaceholderText('Describe the second value')).toBeInTheDocument();
  });

  it('placeholder falls back to "Describe" when no activeItem', () => {
    render(<DescriptionModal {...baseProps} items={[]} activeIndex={0} />);
    expect(screen.getByPlaceholderText('Describe')).toBeInTheDocument();
  });

  it('Escape key calls closeModal when isOpen=true', () => {
    const closeModal = vi.fn();
    render(<DescriptionModal {...baseProps} items={[unionItem]} closeModal={closeModal} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('ArrowLeft key calls onPrev when canPrev=true', () => {
    const onPrev = vi.fn();
    render(
      <DescriptionModal {...baseProps} items={[unionItem, valueItem]} activeIndex={1} onPrev={onPrev} />
    );
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('ArrowRight key calls onNext when canNext=true', () => {
    const onNext = vi.fn();
    render(
      <DescriptionModal {...baseProps} items={[unionItem, valueItem]} activeIndex={0} onNext={onNext} />
    );
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('key listeners are cleaned up when component unmounts', () => {
    const closeModal = vi.fn();
    const { unmount } = render(
      <DescriptionModal {...baseProps} items={[unionItem]} closeModal={closeModal} />
    );
    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closeModal).not.toHaveBeenCalled();
  });
});

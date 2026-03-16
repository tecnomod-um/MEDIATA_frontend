import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Tutorial from './tutorial';
import { DiscoverySlides, AggregateSlides, IntegrationSlides } from './images';
import { vi } from "vitest";

vi.mock('./tutorial.module.css', () => ({
  __esModule: true,
  default: {
    pageContainer: 'pageContainer',
    sidebar: 'sidebar',
    contentContainer: 'contentContainer',
    textContainer: 'textContainer',
    textImageContainer: 'textImageContainer',
    centeredHeading: 'centeredHeading',
    introText: 'introText',
    lesserText: 'lesserText',
    variablesTable: 'variablesTable',
    bulletList: 'bulletList',
  },
}));

vi.mock('./images', () => ({
  __esModule: true,
  DiscoverySlides: [
    'RESOLVED:./1.jpg',
    'RESOLVED:./2.jpg',
    'RESOLVED:./10.jpg',
    'RESOLVED:./11.jpg',
  ],
  AggregateSlides: [
    'RESOLVED:./a1.jpg',
    'RESOLVED:./a2.jpg',
    'RESOLVED:./a3.jpg',
    'RESOLVED:./a4.jpg',
    'RESOLVED:./a5.jpg',
  ],
  IntegrationSlides: [
    'RESOLVED:./b1.jpg',
    'RESOLVED:./b2.jpg',
    'RESOLVED:./b3.jpg',
    'RESOLVED:./b4.jpg',
    'RESOLVED:./b5.jpg',
  ],
}));

vi.mock('../../resources/images/tutorial/1_nodes.gif', () => ({
  __esModule: true,
  default: 'nodes_gif',
}));

vi.mock('../../resources/images/tutorial/2_navbar.gif', () => ({
  __esModule: true,
  default: 'navbar_gif',
}));

vi.mock('../../resources/images/tutorial/3_integration_usage.gif', () => ({
  __esModule: true,
  default: 'integration_usage_gif',
}));

vi.mock('../../resources/images/tutorial/4_change_files_modal.png', () => ({
  __esModule: true,
  default: 'change_files_png',
}));

vi.mock('../../components/Common/ScrollSidebar/scrollSidebar', () => ({
  __esModule: true,
  default: (props) => {
    const { sections = [], offset } = props || {};
    return (
      <nav data-testid="scroll-sidebar" data-offset={offset}>
        <ul>
          {sections.map((s) => (
            <li key={s} data-section={s}>{s}</li>
          ))}
        </ul>
      </nav>
    );
  },
}));

vi.mock('../../components/Common/Slide/slide', () => ({
  __esModule: true,
  default: (props) => {
    const { images = [], steps = [] } = props || {};
    return (
      <div
        data-testid="slide"
        data-images-count={images.length}
        data-steps-count={steps.length}
      />
    );
  },
}));

vi.mock('../../components/Common/PageImage/pageImage', () => ({
  __esModule: true,
  default: (props) => {
    const { alt = '' } = props || {};
    return <div role="img" aria-label={alt} data-testid="page-image" />;
  },
}));

describe('<Tutorial /> + images.js', () => {
  it('renders the main sections and sidebar with correct offset', () => {
    render(<Tutorial />);
    expect(screen.getByRole('heading', { name: /Introduction/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Navigating the tool/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Selecting files/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Discovery$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Discovery: Individual metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Discovery: Aggregate metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Integration$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Integration: Updating files/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Semantic Alignment/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /HL7 FHIR/i })).toBeInTheDocument();
    const nav = screen.getByTestId('scroll-sidebar');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('data-offset', '55');
    const items = within(nav).getAllByRole('listitem');
    expect(items.length).toBe(10);
  });

  it('renders three Slide components with images count matching the steps per section', () => {
    render(<Tutorial />);
    const slides = screen.getAllByTestId('slide');
    expect(slides.length).toBe(3);
    expect(slides[0]).toHaveAttribute('data-images-count', '4');
    expect(slides[0]).toHaveAttribute('data-steps-count', '4');
    expect(slides[1]).toHaveAttribute('data-images-count', '5');
    expect(slides[1]).toHaveAttribute('data-steps-count', '5');
    expect(slides[2]).toHaveAttribute('data-images-count', '5');
    expect(slides[2]).toHaveAttribute('data-steps-count', '5');
  });

  it('renders the variable tables and key metric labels for individual metrics', () => {
    render(<Tutorial />);
    expect(screen.getAllByRole('cell', { name: /^count$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^mean$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^standard deviation$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^minimum$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^maximum$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^missing$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^mode$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^mode frequency$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^mode percentage$/i }).length).toBeGreaterThan(0);
  });

  it('exposes DiscoverySlides, AggregateSlides, IntegrationSlides arrays from images.js', () => {
    expect(Array.isArray(DiscoverySlides)).toBe(true);
    expect(Array.isArray(AggregateSlides)).toBe(true);
    expect(Array.isArray(IntegrationSlides)).toBe(true);
    expect(DiscoverySlides).toEqual([
      'RESOLVED:./1.jpg',
      'RESOLVED:./2.jpg',
      'RESOLVED:./10.jpg',
      'RESOLVED:./11.jpg',
    ]);
    expect(AggregateSlides).toEqual([
      'RESOLVED:./a1.jpg',
      'RESOLVED:./a2.jpg',
      'RESOLVED:./a3.jpg',
      'RESOLVED:./a4.jpg',
      'RESOLVED:./a5.jpg',
    ]);
    expect(IntegrationSlides).toEqual([
      'RESOLVED:./b1.jpg',
      'RESOLVED:./b2.jpg',
      'RESOLVED:./b3.jpg',
      'RESOLVED:./b4.jpg',
      'RESOLVED:./b5.jpg',
    ]);
  });

  it('renders inline tutorial images via PageImage with accessible alt text', () => {
    render(<Tutorial />);
    expect(screen.getAllByRole('img', { name: /Dragging nodes and joining them/i }).length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole('img', { name: /Top navigation bar showing the available sections/i })
    ).toBeInTheDocument();
    const allImgs = screen.getAllByTestId('page-image');
    expect(allImgs.length).toBeGreaterThanOrEqual(3);
  });
});

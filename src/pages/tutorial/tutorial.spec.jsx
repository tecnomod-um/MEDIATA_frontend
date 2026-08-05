import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Tutorial from './tutorial';
import { DiscoverySlides, AggregateSlides, AlignmentSlides, SemanticIntegrationSlides } from './images';
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
  ],
  AlignmentSlides: [
    'RESOLVED:./b1.jpg',
    'RESOLVED:./b2.jpg',
    'RESOLVED:./b3.jpg',
    'RESOLVED:./b4.jpg',
    'RESOLVED:./b5.jpg',
  ],
  SemanticIntegrationSlides: [
    'RESOLVED:./c1.jpg',
    'RESOLVED:./c2.jpg',
    'RESOLVED:./c3.jpg',
    'RESOLVED:./c4.jpg',
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

vi.mock('../../resources/images/tutorial/3_alignment_usage.gif', () => ({
  __esModule: true,
  default: 'alignment_usage_gif',
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

vi.mock('../../components/Common/ImageHighlights/imageHighlights', () => ({
  __esModule: true,
  default: (props) => {
    const { imageSrc = '', steps = [] } = props || {};
    return (
      <div
        data-testid="image-highlights"
        data-image-src={imageSrc}
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
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /mediata tutorial/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Introduction/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Navigating the tool/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /FAIR Data Point/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /FAIR Data Point/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Selecting files/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Data cleaning/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Discovery$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Discovery: Individual metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Discovery: Aggregate metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Alignment$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Alignment: Creating mappings/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Alignment: Semantic enrichment/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Alignment: Updating files/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Semantic Integration$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Semantic Integration: Generating RDF/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /HL7 FHIR/i })).toBeInTheDocument();
    const nav = screen.getByTestId('scroll-sidebar');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('data-offset', '55');
    const items = within(nav).getAllByRole('listitem');
    expect(items.length).toBe(15);
  });

  it('renders four ImageHighlights components with the expected step counts', () => {
    render(<Tutorial />);
    const highlights = screen.getAllByTestId('image-highlights');
    expect(highlights.length).toBe(4);
    expect(highlights[0]).toHaveAttribute('data-image-src', 'RESOLVED:./1.jpg');
    expect(highlights[0]).toHaveAttribute('data-steps-count', '4');
    expect(highlights[1]).toHaveAttribute('data-image-src', 'RESOLVED:./a1.jpg');
    expect(highlights[1]).toHaveAttribute('data-steps-count', '5');
    expect(highlights[2]).toHaveAttribute('data-image-src', 'RESOLVED:./b1.jpg');
    expect(highlights[2]).toHaveAttribute('data-steps-count', '5');
    expect(highlights[3]).toHaveAttribute('data-image-src', 'RESOLVED:./c1.jpg');
    expect(highlights[3]).toHaveAttribute('data-steps-count', '4');
  });

  it('renders the variable tables and key metric labels for individual metrics', () => {
    render(<Tutorial />);
    expect(screen.getAllByRole('cell', { name: /^count$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^mean$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^standard deviation$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^minimum$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^maximum$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^missing entries$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^mode$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^mode frequency$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: /^mode %$/i }).length).toBeGreaterThan(0);
  });

  it('exposes DiscoverySlides, AggregateSlides, AlignmentSlides, SemanticIntegrationSlides arrays from images.js', () => {
    expect(Array.isArray(DiscoverySlides)).toBe(true);
    expect(Array.isArray(AggregateSlides)).toBe(true);
    expect(Array.isArray(AlignmentSlides)).toBe(true);
    expect(Array.isArray(SemanticIntegrationSlides)).toBe(true);
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
    ]);
    expect(AlignmentSlides).toEqual([
      'RESOLVED:./b1.jpg',
      'RESOLVED:./b2.jpg',
      'RESOLVED:./b3.jpg',
      'RESOLVED:./b4.jpg',
      'RESOLVED:./b5.jpg',
    ]);
    expect(SemanticIntegrationSlides).toEqual([
      'RESOLVED:./c1.jpg',
      'RESOLVED:./c2.jpg',
      'RESOLVED:./c3.jpg',
      'RESOLVED:./c4.jpg',
    ]);
  });

  it('renders inline tutorial images via PageImage with accessible alt text', () => {
    render(<Tutorial />);
    expect(screen.getAllByRole('img', { name: /Dragging and joining nodes/i }).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole('img', { name: /Top navigation bar showing the available sections/i })
    ).toBeInTheDocument();
    const allImgs = screen.getAllByTestId('page-image');
    expect(allImgs.length).toBeGreaterThanOrEqual(3);
  });
});

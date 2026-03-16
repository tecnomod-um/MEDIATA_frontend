import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingDiscovery from './landingDiscovery';
import LandingIntegration from './landingIntegrations';
import LandingSecurity from './landingSecurity';
import LandingStandards from './landingStandards';
import { vi } from "vitest";

vi.mock('./landingIcons.module.css', () => ({
  default: new Proxy({}, { get: (_, k) => String(k) }),
}));

describe('Landing icons', () => {
  describe('<LandingDiscovery />', () => {
    it('is accessible via role=img and default aria-label', () => {
      render(<LandingDiscovery />);
      const svg = screen.getByRole('img', { name: /search document/i });
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('iconSvg');
    });

    it('applies size prop as inline width/height', () => {
      render(<LandingDiscovery size={128} />);
      const svg = screen.getByRole('img', { name: /search document/i });
      expect(svg).toHaveStyle({ width: '128px', height: '128px' });
    });

    it('contains expected defs and animated motion', () => {
      render(<LandingDiscovery />);
      const defs = screen.getByTestId('ld-defs');
      expect(defs).toBeInTheDocument();
      expect(screen.getByTestId('ld-shadow')).toBeInTheDocument();
      expect(screen.getByTestId('ld-scanPath')).toBeInTheDocument();
      expect(screen.getByTestId('ld-iconSquare')).toBeInTheDocument();
      expect(screen.getByTestId('ld-magnifier')).toBeInTheDocument();
      expect(screen.getByTestId('ld-animateMotion')).toBeInTheDocument();
    });
  });

  describe('<LandingIntegration />', () => {
    it('is accessible via role=img and default aria-label', () => {
      render(<LandingIntegration />);
      const svg = screen.getByRole('img', { name: /integrate documents/i });
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('iconSvg');
    });

    it('applies size prop', () => {
      render(<LandingIntegration size={150} />);
      const svg = screen.getByRole('img', { name: /integrate documents/i });
      expect(svg).toHaveStyle({ width: '150px', height: '150px' });
    });

    it('renders background and three document groups with animated bars', () => {
      render(<LandingIntegration />);

      expect(screen.getByTestId('li-iconSquare')).toBeInTheDocument();

      const docGroups = screen.getAllByTestId('li-docGroup');
      expect(docGroups.length).toBeGreaterThanOrEqual(3);

      expect(screen.getByTestId('li-barLeft1')).toBeInTheDocument();
      expect(screen.getByTestId('li-barLeft2')).toBeInTheDocument();
      expect(screen.getByTestId('li-barRight1')).toBeInTheDocument();
      expect(screen.getByTestId('li-barRight2')).toBeInTheDocument();
    });
  });

  describe('<LandingSecurity />', () => {
    it('is accessible via role=img and default aria-label', () => {
      render(<LandingSecurity />);
      const svg = screen.getByRole('img', { name: /security/i });
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('iconSvg', 'iconSvgLarger');
    });

    it('applies size prop', () => {
      render(<LandingSecurity size={140} />);
      const svg = screen.getByRole('img', { name: /security/i });
      expect(svg).toHaveStyle({ width: '140px', height: '140px' });
    });

    it('has shield arcs and three animated arrows', () => {
      render(<LandingSecurity />);
      expect(screen.getByTestId('ls-iconSquare')).toBeInTheDocument();

      const arcGroup = screen.getByTestId('ls-shieldArcGroup');
      expect(arcGroup).toBeInTheDocument();
      expect(screen.getByTestId('ls-shieldArc')).toBeInTheDocument();
      expect(screen.getByTestId('ls-shieldArcInner')).toBeInTheDocument();

      const arrows = screen.getAllByTestId('ls-arrow');
      expect(arrows.length).toBeGreaterThanOrEqual(3);

      arrows.forEach(() => {
        expect(screen.getByTestId('ls-arrow-animateMotion')).toBeInTheDocument();
      });
    });
  });

  describe('<LandingStandards />', () => {
    it('is accessible via role=img and default aria-label', () => {
      render(<LandingStandards />);
      const svg = screen.getByRole('img', { name: /standards supported/i });
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('iconSvg');
    });

    it('applies size prop', () => {
      render(<LandingStandards size={160} />);
      const svg = screen.getByRole('img', { name: /standards supported/i });
      expect(svg).toHaveStyle({ width: '160px', height: '160px' });
    });

    it('renders background and four puzzle pieces with one movable', () => {
      render(<LandingStandards />);
      expect(screen.getByTestId('ls-iconSquare')).toBeInTheDocument();
      const allPieces = screen.getAllByTestId('ls-puzzlePiece');
      expect(allPieces.length).toBeGreaterThanOrEqual(4);
      const mover = screen.getByTestId('ls-puzzleMover');
      expect(mover).toBeInTheDocument();
      expect(screen.getByTestId('ls-puzzlePiece-path')).toBeInTheDocument();
    });
  });
});
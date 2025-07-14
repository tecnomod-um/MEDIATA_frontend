import React from 'react';
import { render, screen } from '@testing-library/react';
import IntroductionSection from './landingIntroduction';
import LandingIntroStyles from './landingIntroduction.module.css';
import '@testing-library/jest-dom'

jest.mock(
  '../LandingBackground/landingBackground',
  () => {
    const React = require('react');
    return {
      __esModule: true,
      default: () => React.createElement('div', { 'data-testid': 'landing-background' }),
    };
  }
);

describe('IntroductionSection', () => {
  it('applies the introSection class to the section element', () => {
    const { container } = render(<IntroductionSection />);
    const section = container.querySelector(
      `.${LandingIntroStyles.introSection}`
    );
    expect(section).toBeInTheDocument();
  });

  it('renders the MEDIATA logo with correct attributes', () => {
    render(<IntroductionSection />);

    const logo = screen.getByAltText('MEDIATA logo');
    expect(logo).toHaveAttribute(
      'src',
      expect.stringContaining('/mediata_logo.png?v=1.0.1')
    );
    expect(logo).toHaveAttribute('loading', 'eager');
    expect(logo).toHaveAttribute('fetchpriority', 'high');
    expect(logo).toHaveClass(LandingIntroStyles.logo);
  });

  it('includes the LandingBackground component', () => {
    render(<IntroductionSection />);
    expect(screen.getByTestId('landing-background')).toBeInTheDocument();
  });

  it('renders the introductory paragraph text', () => {
    render(<IntroductionSection />);
    expect(
      screen.getByText(
        /Mediata is your comprehensive solution for managing clinical patient data with precision/i
      )
    ).toBeInTheDocument();
  });
});

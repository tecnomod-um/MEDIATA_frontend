import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Main from './main.js';

jest.mock('./main.module.css', () => ({
  pageContainer: 'pageContainer',
  mainContainer: 'mainContainer',
  mainHeader: 'mainHeader',
  contentContainer: 'contentContainer',
  textImageContainer: 'textImageContainer',
  textContainer: 'textContainer',
  centeredHeading: 'centeredHeading',
  introText: 'introText',
  lesserText: 'lesserText',
  buttonContainer: 'buttonContainer',
  big_button: 'big_button',
  scrollIndicator: 'scrollIndicator',
  arrow: 'arrow',
}));

jest.mock(
  '../../components/Landing/LandingIntroduction/landingIntroduction',
  () => () => <div data-testid="landing-intro">Intro</div>
);

describe('<Main />', () => {
  let origInnerHeight, origScrollY, origDocHeight;

  beforeEach(() => {

    origScrollY = window.scrollY;
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    origInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true });
    origDocHeight = document.documentElement.scrollHeight;
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1500, configurable: true });
    Object.defineProperty(document.body, 'scrollHeight', { value: 1500, configurable: true });
    jest.spyOn(window, 'scrollTo').mockImplementation(() => { });
  });

  afterEach(() => {
    window.scrollTo.mockRestore();
    Object.defineProperty(window, 'innerHeight', { value: origInnerHeight });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: origDocHeight });
    Object.defineProperty(document.body, 'scrollHeight', { value: origDocHeight });
    Object.defineProperty(window, 'scrollY', { value: origScrollY });
  });

  const renderWithRouter = () =>
    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Main />
      </MemoryRouter>
    );

  it('renders intro, header, content and buttons, and scrolls to top on mount', () => {
    renderWithRouter();
    expect(screen.getByTestId('landing-intro')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Access your data securely/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /User accessible/i })).toBeInTheDocument();
    expect(screen.getByText(/The MEDIATA platform aims to provide a unified/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check the tutorial/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore your datasets/i })).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });

  it('hides scroll indicator after scrolling past one viewport and near bottom', () => {
    const { rerender } = renderWithRouter();
    window.scrollY = 600;
    fireEvent.scroll(window);
    rerender(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Main />
      </MemoryRouter>
    );
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, configurable: true });
    fireEvent.scroll(window);
    rerender(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Main />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('scrollIndicator')).toBeNull();
  });

  it('shows scroll indicator when not at bottom', () => {
    window.scrollY = 0;
    const { container } = renderWithRouter();
    expect(container.querySelector('.scrollIndicator')).toBeInTheDocument();
  });

  it('handles scroll indicator click to scroll down', () => {
    window.scrollY = 0;
    const { container } = renderWithRouter();
    const indicator = container.querySelector('.scrollIndicator');
    fireEvent.click(indicator);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'smooth' });
  });

  it('handles resize event correctly', () => {
    const { container } = renderWithRouter();
    window.scrollY = 0;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    fireEvent.resize(window);
    expect(container.querySelector('.pageContainer')).toBeInTheDocument();
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderWithRouter();
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('renders all feature cards with correct content', () => {
    renderWithRouter();
    expect(screen.getByText('Discovery and profiling')).toBeInTheDocument();
    expect(screen.getByText('Integration made easy')).toBeInTheDocument();
    expect(screen.getByText('Health standards ready')).toBeInTheDocument();
  });

  it('renders feature descriptions correctly', () => {
    renderWithRouter();
    expect(screen.getByText(/Scan and search across local clinical files/i)).toBeInTheDocument();
    expect(screen.getByText(/Bring in heterogeneous spreadsheets/i)).toBeInTheDocument();
    expect(screen.getByText(/Map local fields to common healthcare terminologies/i)).toBeInTheDocument();
  });

  it('renders security section with correct heading', () => {
    renderWithRouter();
    expect(screen.getByText(/Access your data securely/i)).toBeInTheDocument();
    expect(screen.getByText(/MEDIATA is built with security and privacy/i)).toBeInTheDocument();
  });

  it('has working link to tutorial', () => {
    renderWithRouter();
    const tutorialButton = screen.getByRole('button', { name: /Check the tutorial/i });
    expect(screen.getByRole('link', { name: /Check the tutorial/i })).toHaveAttribute('href', '/tutorial');
  });

  it('has working link to discovery', () => {
    renderWithRouter();
    const exploreButton = screen.getByRole('button', { name: /Explore your datasets/i });
    expect(screen.getByRole('link', { name: /Explore your datasets/i })).toHaveAttribute('href', '/discovery');
  });
});

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
});

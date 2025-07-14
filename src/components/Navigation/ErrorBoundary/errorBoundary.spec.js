import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from './errorBoundary';
import { logError } from '../../../util/petitionHandler';

jest.mock('../../../util/petitionHandler', () => ({
  logError: jest.fn(),
}));

describe('ErrorBoundary', () => {
  const FallbackMessage = /App is currently under maintenance\. Check back later\./i;

  const Bomb = () => { throw new Error('Test error'); };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
    logError.mockClear();
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('renders children normally when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">All good</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('All good');
  });

  it('catches errors from children and displays fallback UI', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText(FallbackMessage)).toBeInTheDocument();
  });

  it('logs the error and component stack via logError', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(logError).toHaveBeenCalledTimes(1);
    const [errorArg, stackArg] = logError.mock.calls[0];
    expect(errorArg).toBeInstanceOf(Error);
    expect(errorArg.message).toBe('Test error');
    expect(typeof stackArg).toBe('string');
    expect(stackArg).toMatch(/ErrorBoundary/);
  });
});

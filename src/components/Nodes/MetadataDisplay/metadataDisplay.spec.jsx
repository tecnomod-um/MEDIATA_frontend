import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MetadataDisplay from './metadataDisplay';
import DatasetCard from './datasetCard';
import '@testing-library/jest-dom';
import { vi } from "vitest";

vi.mock(
  '../../Common/OverlayWrapper/overlayWrapper',
  () => ({
    __esModule: true,
    default: ({ isOpen, children }) =>
      isOpen ? <div data-testid="overlay">{children}</div> : null,
  })
);

describe('MetadataDisplay', () => {
  const baseProps = {
    nodeName: 'Node A',
    nodeDescription: '',
    headerColor: '#123456',
    closeModal: vi.fn(),
    onAccessNode: vi.fn(),
  };

  it('does not render when isOpen is false', () => {
    render(
      <MetadataDisplay
        {...baseProps}
        isOpen={false}
        metadata={null}
        loadingMetadata={false}
        accessingNode={false}
      />
    );
    expect(screen.queryByTestId('overlay')).toBeNull();
  });

  it('renders loading state', () => {
    render(
      <MetadataDisplay
        {...baseProps}
        isOpen
        metadata={null}
        loadingMetadata={true}
        accessingNode={false}
      />
    );
    expect(screen.getByTestId('overlay')).toBeInTheDocument();
    expect(screen.getByText(/Loading metadata\.\.\./i)).toBeInTheDocument();
  });

  it('renders no-metadata placeholder', () => {
    render(
      <MetadataDisplay
        {...baseProps}
        isOpen
        metadata={null}
        loadingMetadata={false}
        accessingNode={false}
      />
    );
    expect(screen.getByText(/No metadata available\./i)).toBeInTheDocument();
  });

  it('renders context and dataset titles when metadata provided', () => {
    const md = {
      '@context': 'http://example.com',
      dataset: [{ title: 'DS1' }, { title: 'DS2' }],
    };

    render(
      <MetadataDisplay
        {...baseProps}
        isOpen
        metadata={md}
        loadingMetadata={false}
        accessingNode={false}
      />
    );

    const contextParagraph = screen.getByText((_, el) =>
      el.tagName === 'P' && /Context:\s*http:\/\/example\.com/i.test(el.textContent)
    );
    expect(contextParagraph).toBeInTheDocument();
    expect(screen.getByText('DS1')).toBeInTheDocument();
    expect(screen.getByText('DS2')).toBeInTheDocument();
  });

  it('access button toggles disabled state and invokes callback', () => {
    const onAccess = vi.fn();
    const { rerender } = render(
      <MetadataDisplay
        {...baseProps}
        isOpen
        metadata={{}}
        loadingMetadata={false}
        accessingNode={true}
        onAccessNode={onAccess}
      />
    );
    const btnLoading = screen.getByRole('button', { name: /Accessing\.\.\./i });
    expect(btnLoading).toBeDisabled();

    rerender(
      <MetadataDisplay
        {...baseProps}
        isOpen
        metadata={{}}
        loadingMetadata={false}
        accessingNode={false}
        onAccessNode={onAccess}
      />
    );
    const btn = screen.getByRole('button', { name: /Access the node/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onAccess).toHaveBeenCalled();
  });
});

describe('DatasetCard', () => {
  it('renders fallback values when fields are missing', () => {
    render(<DatasetCard dataset={{}} />);
    expect(screen.getByText('Untitled Dataset')).toBeInTheDocument();
    expect(screen.getByText(/No description provided/i)).toBeInTheDocument();
    expect(screen.getByText(/No distributions provided\./i)).toBeInTheDocument();
  });

  it('renders provided fields and nests extra and distribution fields', () => {
    const dataset = {
      title: 'My Data',
      description: 'Line1\nLine2',
      identifier: 'ID123',
      distribution: [
        {
          title: 'Dist A',
          description: 'Dist desc',
          format: 'json',
          license: 'MIT',
          extraField: ['one', 'two'],
        },
      ],
      contactPoint: { email: 'a@b.com' },
      customField: 'CustomValue',
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('My Data')).toBeInTheDocument();
    expect(screen.getByText(/Line1/)).toBeInTheDocument();
    expect(screen.getByText('ID123')).toBeInTheDocument();
    expect(screen.getByText(/Contact Point:/i)).toBeInTheDocument();
    expect(screen.getByText(/email:/i)).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
    expect(screen.getByText(/Distributions:/i)).toBeInTheDocument();
    expect(screen.getByText('Dist A')).toBeInTheDocument();
    expect(screen.getByText('json')).toBeInTheDocument();
    expect(screen.getByText('MIT')).toBeInTheDocument();
    expect(screen.getByText('one, two')).toBeInTheDocument();
    expect(screen.getByText(/Additional Fields:/i)).toBeInTheDocument();
    expect(screen.getByText(/customField:/i)).toBeInTheDocument();
    expect(screen.getByText('CustomValue')).toBeInTheDocument();
  });
});

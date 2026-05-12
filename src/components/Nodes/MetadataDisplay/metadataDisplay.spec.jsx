import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MetadataDisplay from './metadataDisplay';
import DatasetCard from './datasetCard';
import '@testing-library/jest-dom';
import { vi } from "vitest";
import { toast } from "react-toastify";

const getByExactTextContent = (text) =>
  screen.getByText((_, element) => element?.textContent === text);

vi.mock(
  '../../Common/OverlayWrapper/overlayWrapper',
  () => ({
    __esModule: true,
    default: ({ isOpen, children }) =>
      isOpen ? <div data-testid="overlay">{children}</div> : null,
  })
);

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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
        fairDataPointEnabled={false}
        loadingMetadata={false}
        accessingNode={false}
      />
    );
    expect(screen.getByText(/No metadata available\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /no fair data point configured/i })).toBeDisabled();
  });

  it('renders metadata summary details and dataset titles when metadata provided', () => {
    const md = {
      '@context': 'http://example.com',
      '@type': 'DatasetCatalog',
      sourceFile: 'catalog.ttl',
      dataset: [{ title: 'DS1' }, { title: 'DS2' }],
    };

    render(
      <MetadataDisplay
        {...baseProps}
        isOpen
        metadata={md}
        fairDataPointEnabled={true}
        fairDataPointUrl="https://node.example/taniwha/fdp"
        loadingMetadata={false}
        accessingNode={false}
      />
    );

    expect(
      screen.getByRole('button', { name: /https:\/\/node\.example\/taniwha\/fdp/i })
    ).toBeInTheDocument();
    const contextParagraph = screen.getByText((_, el) =>
      el.tagName === 'P' && /Context:\s*http:\/\/example\.com/i.test(el.textContent)
    );
    const typeParagraph = screen.getByText((_, el) =>
      el.tagName === 'P' && /Type:\s*DatasetCatalog/i.test(el.textContent)
    );
    const sourceFileParagraph = screen.getByText((_, el) =>
      el.tagName === 'P' && /Source File:\s*catalog\.ttl/i.test(el.textContent)
    );
    expect(contextParagraph).toBeInTheDocument();
    expect(typeParagraph).toBeInTheDocument();
    expect(sourceFileParagraph).toBeInTheDocument();
    expect(screen.getByText('DS1')).toBeInTheDocument();
    expect(screen.getByText('DS2')).toBeInTheDocument();
  });

  it('copies the fair data point URL and shows a success toast when clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <MetadataDisplay
        {...baseProps}
        isOpen
        metadata={{}}
        fairDataPointEnabled={true}
        fairDataPointUrl="https://node.example/taniwha/fdp"
        loadingMetadata={false}
        accessingNode={false}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /https:\/\/node\.example\/taniwha\/fdp/i })
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://node.example/taniwha/fdp');
      expect(toast.success).toHaveBeenCalledWith('FAIR URL copied to clipboard.');
    });
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
    expect(screen.getByText('Responsibility and Contact')).toBeInTheDocument();
    expect(screen.getByText('Contact Point')).toBeInTheDocument();
    expect(getByExactTextContent('Email:')).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
    expect(screen.getByText('Distributions')).toBeInTheDocument();
    expect(screen.getByText('Dist A')).toBeInTheDocument();
    expect(screen.getByText('json')).toBeInTheDocument();
    expect(screen.getByText('MIT')).toBeInTheDocument();
    expect(screen.getByText('Additional Distribution Fields')).toBeInTheDocument();
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    expect(screen.getByText('Additional Dataset Fields')).toBeInTheDocument();
    expect(screen.getByText('Custom Field')).toBeInTheDocument();
    expect(screen.getByText('CustomValue')).toBeInTheDocument();
  });
});

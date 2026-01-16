import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JoinedNodesDisplay from './joinedNodesDisplay';
import { getNodeMetadata } from '../../../util/petitionHandler';

jest.mock('../../Common/OverlayWrapper/overlayWrapper', () => ({
  __esModule: true,
  default: ({ isOpen, children }) =>
    isOpen ? <div data-testid="overlay">{children}</div> : null,
}));

jest.mock('../MetadataDisplay/datasetCard', () => ({
  __esModule: true,
  default: ({ dataset }) => (
    <div data-testid="dataset-card">{dataset.title}</div>
  ),
}));

jest.mock('../../../util/petitionHandler', () => ({
  getNodeMetadata: jest.fn(),
}));

describe('JoinedNodesDisplay', () => {
  const simpleNode = {
    nodeId: 'n1',
    name: 'First Node',
    description: 'Descr 1',
  };

  it('does not render when isOpen is false', () => {
    render(
      <JoinedNodesDisplay
        isOpen={false}
        joinedNodes={[simpleNode]}
        onClose={jest.fn()}
        onAccessJoinedNodes={jest.fn()}
        accessingNode={false}
      />
    );
    expect(screen.queryByTestId('overlay')).toBeNull();
  });

  it('shows empty-message when no joinedNodes', () => {
    render(
      <JoinedNodesDisplay
        isOpen
        joinedNodes={[]}
        onClose={jest.fn()}
        onAccessJoinedNodes={jest.fn()}
        accessingNode={false}
      />
    );
    expect(screen.getByTestId('overlay')).toBeInTheDocument();
    expect(screen.getByText(/No joined nodes found\./i)).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(
      <JoinedNodesDisplay
        isOpen
        joinedNodes={[simpleNode]}
        onClose={onClose}
        onAccessJoinedNodes={jest.fn()}
        accessingNode={false}
      />
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('expands a node card, fetches metadata, and renders DatasetCard items', async () => {
    const fake = { metadata: { dataset: [{ title: 'A' }, { title: 'B' }] } };
    getNodeMetadata.mockResolvedValueOnce(fake);

    render(
      <JoinedNodesDisplay
        isOpen
        joinedNodes={[simpleNode]}
        onClose={jest.fn()}
        onAccessJoinedNodes={jest.fn()}
        accessingNode={false}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Show datasets/i })
    );

    await waitFor(() => { expect(getNodeMetadata).toHaveBeenCalledWith('n1') });

    const hideBtn = await screen.findByRole('button', {
      name: /Hide datasets/i,
    });
    expect(hideBtn).toBeInTheDocument();
    const cards = screen.getAllByTestId('dataset-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('A');
    expect(cards[1]).toHaveTextContent('B');
  });

  it('shows loading state while metadata is pending', async () => {

    let resolveFetch;
    const p = new Promise((res) => { resolveFetch = res; });
    getNodeMetadata.mockReturnValueOnce(p);

    render(
      <JoinedNodesDisplay
        isOpen
        joinedNodes={[simpleNode]}
        onClose={jest.fn()}
        onAccessJoinedNodes={jest.fn()}
        accessingNode={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Show datasets/i }));
    expect(screen.getByText(/Loading datasets\.\.\./i)).toBeInTheDocument();
    resolveFetch({ metadata: { dataset: [] } });
    await waitFor(() => {
      expect(screen.queryByText(/Loading datasets\.\.\./i)).toBeNull();
    });
  });

  it('access button disables/enables and calls callback', () => {
    const onAccess = jest.fn();
    const { rerender } = render(
      <JoinedNodesDisplay
        isOpen
        joinedNodes={[simpleNode]}
        onClose={jest.fn()}
        onAccessJoinedNodes={onAccess}
        accessingNode={true}
      />
    );

    const btn1 = screen.getByRole('button', { name: /Accessing\.\.\./i });
    expect(btn1).toBeDisabled();

    rerender(
      <JoinedNodesDisplay
        isOpen
        joinedNodes={[simpleNode]}
        onClose={jest.fn()}
        onAccessJoinedNodes={onAccess}
        accessingNode={false}
      />
    );
    const btn2 = screen.getByRole('button', { name: /Access joined nodes/i });
    expect(btn2).not.toBeDisabled();
    fireEvent.click(btn2);
    expect(onAccess).toHaveBeenCalled();
  });
});

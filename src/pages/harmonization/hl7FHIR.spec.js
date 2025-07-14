import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HL7FHIR from './hl7FHIR';

let pickerProps, listProps, clusterProps;

jest.mock('react-transition-group', () => {
  const React = require('react');
  return { CSSTransition: ({ children }) => <>{children}</> };
});

jest.mock(
  '../../components/Common/FilePicker/uploadFilePicker',
  () => props => { pickerProps = props; return <div data-testid="picker" />; },
);
jest.mock(
  '../../components/HL7FHIR/ListPanel/listPanel',
  () => props => { listProps = props; return <div data-testid="list" />; },
);
jest.mock(
  '../../components/HL7FHIR/ElementForm/elementForm',
  () => props => (
    <button data-testid="create-btn" onClick={() => props.onCreateClusters()}>
      create
    </button>
  ),
);
jest.mock(
  '../../components/HL7FHIR/ClusterListPanel/clusterListPanel',
  () => props => { clusterProps = props; return <div data-testid="cluster-list" />; },
);
jest.mock('../../components/HL7FHIR/ClusterDetailPanel/clusterDetailPanel', () => () => null);

jest.mock('../../util/petitionHandler', () => {
  const spy = jest.fn().mockResolvedValue({ 'Cluster 1': { Foo: 'bar' } });
  return { __esModule: true, createInitialClusters: spy, __spy: spy };
});

const CSV = 'Name,string\nAge,integer,0,120';
class FakeReader { readAsText() { setTimeout(() => this.onload?.({ target: { result: CSV } }), 0); } }
global.FileReader = FakeReader;
const { __spy: mockCreateInitial } = require('../../util/petitionHandler');

beforeEach(() => {
  pickerProps = listProps = clusterProps = undefined;
  mockCreateInitial.mockClear().mockResolvedValue({ 'Cluster 1': { Foo: 'bar' } });
});

describe('<HL7FHIR />', () => {
  it('CSV upload → list → create clusters', async () => {
    render(<HL7FHIR />);
    expect(screen.getByTestId('picker')).toBeInTheDocument();
    await act(async () => {
      pickerProps.onFileUpload(new File(['dummy'], 'format.csv'));
    });

    await waitFor(() => expect(screen.getByTestId('list')).toBeInTheDocument());
    expect(listProps.elements).toHaveLength(1);
    await act(async () => {
      screen.getByTestId('create-btn').click();
    });

    expect(mockCreateInitial).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('cluster-list')).toBeInTheDocument());
    expect(clusterProps.clusters).toHaveLength(1);
    expect(clusterProps.clusters[0].name).toBe('Cluster 1');
  });
});

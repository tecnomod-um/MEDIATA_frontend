import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DatasetCard from './datasetCard';

const getByExactTextContent = (text) =>
  screen.getByText((_, element) => element?.textContent === text);

describe('DatasetCard', () => {
  it('renders with minimal dataset', () => {
    const dataset = {
      title: 'Test Dataset'
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('Test Dataset')).toBeInTheDocument();
  });

  it('omits empty nested values while preserving populated nested metadata', () => {
    const dataset = {
      title: 'Dataset with nested null',
      publisher: {
        name: 'Publisher Name',
        nestedNull: null,
      },
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('Publisher')).toBeInTheDocument();
    expect(getByExactTextContent('Name:')).toBeInTheDocument();
    expect(screen.getByText('Publisher Name')).toBeInTheDocument();
    expect(screen.queryByText((_, element) => element?.textContent === 'Nested Null:')).toBeNull();
  });

  it('renders arrays as list items inside the discovery section', () => {
    const dataset = {
      title: 'Dataset with arrays',
      keyword: ['data', 'science', 'test'],
      theme: ['theme1', 'theme2'],
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Keywords')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('data')).toBeInTheDocument();
    expect(screen.getByText('science')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('theme1')).toBeInTheDocument();
    expect(screen.getByText('theme2')).toBeInTheDocument();
  });

  it('renders object values recursively', () => {
    const dataset = {
      title: 'Dataset with object publisher',
      publisher: {
        name: 'Test Publisher',
        location: 'New York'
      },
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('Publisher')).toBeInTheDocument();
    expect(getByExactTextContent('Name:')).toBeInTheDocument();
    expect(screen.getByText('Test Publisher')).toBeInTheDocument();
    expect(getByExactTextContent('Location:')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
  });

  it('renders extra dataset fields with formatted labels', () => {
    const dataset = {
      title: 'Dataset with extra fields',
      customField: 'custom value',
      anotherField: 'another value'
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('Additional Dataset Fields')).toBeInTheDocument();
    expect(screen.getByText('Custom Field')).toBeInTheDocument();
    expect(screen.getByText('custom value')).toBeInTheDocument();
    expect(screen.getByText('Another Field')).toBeInTheDocument();
    expect(screen.getByText('another value')).toBeInTheDocument();
  });

  it('renders distributions and their extra fields', () => {
    const dataset = {
      title: 'Dataset with distributions',
      distribution: [
        {
          title: 'Distribution 1',
          description: 'A sample distribution',
          format: 'CSV',
          license: 'MIT',
          extraField: 'extra value'
        }
      ]
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('Distributions')).toBeInTheDocument();
    expect(screen.getByText('Distribution 1')).toBeInTheDocument();
    expect(screen.getByText('A sample distribution')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('MIT')).toBeInTheDocument();
    expect(screen.getByText('Additional Distribution Fields')).toBeInTheDocument();
    expect(screen.getByText('Extra Field')).toBeInTheDocument();
    expect(screen.getByText('extra value')).toBeInTheDocument();
  });

  it('renders contact point as object', () => {
    const dataset = {
      title: 'Dataset with contact object',
      contactPoint: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('Contact Point')).toBeInTheDocument();
    expect(getByExactTextContent('Name:')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(getByExactTextContent('Email:')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('renders fallback title, formatted links, booleans, and single-item arrays', () => {
    const dataset = {
      uri: 'https://catalog.example.org/datasets/clinical%20records',
      keyword: ['public health'],
      hasPersonalData: false,
      isStructured: true,
    };

    render(<DatasetCard dataset={dataset} />);

    expect(screen.getByText('Untitled Dataset')).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: 'catalog.example.org / clinical records',
    })).toHaveAttribute('href', 'https://catalog.example.org/datasets/clinical%20records');
    expect(screen.getByText('No description provided')).toBeInTheDocument();
    expect(screen.getByText('No identifier provided')).toBeInTheDocument();
    expect(screen.getByText('public health')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).toBeNull();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('renders variable and distribution extras with fallback names and nested links', () => {
    const dataset = {
      title: 'Dataset with extras',
      variables: [
        {
          dataType: 'integer',
          customFlag: true,
        },
      ],
      distribution: [
        {
          downloadURL: 'https://downloads.example.org/files/my%20file.csv',
          accessService: {
            endpointURL: 'https://api.example.org/query',
            docs: {},
          },
          mediaProfile: 'FHIR',
        },
      ],
    };

    render(<DatasetCard dataset={dataset} />);

    expect(screen.getByText('Variable 1')).toBeInTheDocument();
    expect(screen.getByText('No definition provided')).toBeInTheDocument();
    expect(screen.getByText('Additional Variable Fields')).toBeInTheDocument();
    expect(screen.getByText('Custom Flag')).toBeInTheDocument();

    expect(screen.getByText('Untitled Distribution')).toBeInTheDocument();
    expect(screen.getByText('Additional Distribution Fields')).toBeInTheDocument();
    expect(screen.getByText('Media Profile')).toBeInTheDocument();
    expect(screen.getByText('FHIR')).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: 'downloads.example.org / my file.csv',
    })).toHaveAttribute('href', 'https://downloads.example.org/files/my%20file.csv');
    expect(screen.getByRole('link', {
      name: 'api.example.org / query',
    })).toHaveAttribute('href', 'https://api.example.org/query');
    expect(screen.queryByText((_, element) => element?.textContent === 'Docs:')).toBeNull();
  });
});

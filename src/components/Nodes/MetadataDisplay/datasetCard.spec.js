import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DatasetCard from './datasetCard';

describe('DatasetCard', () => {
  it('renders with minimal dataset', () => {
    const dataset = {
      title: 'Test Dataset'
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('Test Dataset')).toBeInTheDocument();
  });

  it('renders "No value" for null/undefined in nested objects', () => {
    const dataset = {
      title: 'Dataset with nested null',
      publisher: {
        name: 'Publisher Name',
        nestedNull: null,
      },
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('No value')).toBeInTheDocument();
  });

  it('renders arrays as comma-separated values', () => {
    const dataset = {
      title: 'Dataset with arrays',
      keyword: ['data', 'science', 'test'],
      theme: ['theme1', 'theme2'],
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('data, science, test')).toBeInTheDocument();
    expect(screen.getByText('theme1, theme2')).toBeInTheDocument();
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
    expect(screen.getByText('name:')).toBeInTheDocument();
    expect(screen.getByText('Test Publisher')).toBeInTheDocument();
  });

  it('renders extra fields not in known list', () => {
    const dataset = {
      title: 'Dataset with extra fields',
      customField: 'custom value',
      anotherField: 'another value'
    };

    render(<DatasetCard dataset={dataset} />);
    expect(screen.getByText('Additional Fields:')).toBeInTheDocument();
    expect(screen.getByText('customField:')).toBeInTheDocument();
    expect(screen.getByText('custom value')).toBeInTheDocument();
  });

  it('renders distributions with all fields', () => {
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
    expect(screen.getByText('Distribution 1')).toBeInTheDocument();
    expect(screen.getByText('A sample distribution')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('MIT')).toBeInTheDocument();
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
    expect(screen.getByText('name:')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});

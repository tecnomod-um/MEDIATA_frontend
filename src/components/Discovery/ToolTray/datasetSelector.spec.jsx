import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {expect, it, vi} from 'vitest';
import DatasetSelector from './datasetSelector';

const sources = ['Alpha', 'Beta', 'Gamma'].flatMap((nodeName, nodeId) =>
  ['patients.csv', 'longitudinal-outcomes-with-a-long-name.csv', 'clusters.csv'].map(fileName => ({nodeName, nodeId, fileName})));

it('groups nine files by site, shows selection counts and preserves each source index', () => {
  const toggle = vi.fn();
  render(<DatasetSelector sources={sources} activeIndices={[true,true,false,true,false,true,true,true,true]} onToggle={toggle} />);
  const selector = screen.getByRole('region', {name:'Datasets by site'});
  expect(within(selector).getAllByRole('checkbox')).toHaveLength(9);
  const beta = screen.getByText('Beta').closest('details');
  expect(within(beta).getByText('2/3')).toHaveAttribute('title','2 of 3 datasets included');
  fireEvent.click(within(beta).getByRole('checkbox', {name:'patients.csv'}));
  expect(toggle).toHaveBeenCalledWith(3);
  fireEvent.click(beta.querySelector('summary'));
  expect(beta).not.toHaveAttribute('open');
  expect(screen.getByText('Gamma').closest('details')).toHaveAttribute('open');
});

it('keeps a collapsed site collapsed while selection counts update', () => {
  const props = {sources, activeIndices:sources.map(()=>true), onToggle:vi.fn()};
  const {rerender} = render(<DatasetSelector {...props} />);
  const alpha = screen.getByText('Alpha').closest('details');
  fireEvent.click(alpha.querySelector('summary'));
  rerender(<DatasetSelector {...props} activeIndices={sources.map((_,index)=>index!==0)} />);
  expect(alpha).not.toHaveAttribute('open');
  expect(within(alpha).getByText('2/3')).toBeInTheDocument();
});

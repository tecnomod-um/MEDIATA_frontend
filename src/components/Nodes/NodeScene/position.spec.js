import { Position } from './position';
import * as THREE from 'three';

describe('Position', () => {
  it('creates a Position object that extends THREE.Group', () => {
    const position = new Position();
    
    expect(position).toBeInstanceOf(THREE.Group);
  });

  it('initializes with white color', () => {
    const position = new Position();
    
    expect(position.color).toBeInstanceOf(THREE.Color);
    expect(position.color.getHexString()).toBe('ffffff');
  });

  it('can have its color modified', () => {
    const position = new Position();
    
    position.color.set('red');
    expect(position.color.getHexString()).toBe('ff0000');
  });

  it('inherits THREE.Group methods', () => {
    const position = new Position();
    
    expect(typeof position.add).toBe('function');
    expect(typeof position.remove).toBe('function');
    expect(typeof position.clear).toBe('function');
  });

  it('can be added to another THREE.Group', () => {
    const position = new Position();
    const group = new THREE.Group();
    
    group.add(position);
    expect(group.children).toContain(position);
  });

  it('maintains position property from THREE.Group', () => {
    const position = new Position();
    
    expect(position.position).toBeInstanceOf(THREE.Vector3);
    position.position.set(10, 20, 30);
    expect(position.position.x).toBe(10);
    expect(position.position.y).toBe(20);
    expect(position.position.z).toBe(30);
  });
});

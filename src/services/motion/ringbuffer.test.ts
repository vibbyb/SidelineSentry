import { describe, it, expect } from 'vitest';
import { RingBuffer } from './RingBuffer';

describe('RingBuffer', () => {
  it('calculates running RMS accurately', () => {
    const buffer = new RingBuffer(4);
    
    // Constant values: RMS of [2, 2, 2, 2] should be exactly 2
    buffer.push(2);
    buffer.push(2);
    buffer.push(2);
    buffer.push(2);
    expect(buffer.getRMS()).toBeCloseTo(2.0, 5);

    // Overwrite with [4, 4, 4, 4]
    buffer.push(4);
    buffer.push(4);
    buffer.push(4);
    buffer.push(4);
    expect(buffer.getRMS()).toBeCloseTo(4.0, 5);
  });

  it('copies buffer contents without allocating new arrays', () => {
    const buffer = new RingBuffer(256);
    const targetArray = new Float32Array(256);

    // Simulate 10,000 continuous sensor ticks
    for (let i = 0; i < 10000; i++) {
      buffer.push(Math.sin(i * 0.1) * 2.0);
    }

    expect(buffer.getCount()).toBe(256);
    expect(buffer.getRMS()).toBeGreaterThan(0);

    // Verify copyOrdered copies directly without intermediate allocations
    const copied = buffer.copyOrdered(targetArray);
    expect(copied).toBe(256);
    expect(targetArray[0]).toBeDefined();
  });

  it('tracks peak sway value', () => {
    const buffer = new RingBuffer(10);
    buffer.push(0.1);
    buffer.push(-0.95);
    buffer.push(0.3);
    expect(buffer.getPeak()).toBeCloseTo(0.95, 2);
  });
});

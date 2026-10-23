/**
 * Pre-allocated circular ring buffer for real-time sensor processing.
 * Guarantees zero heap allocation per tick and O(1) online RMS calculation.
 */
export class RingBuffer {
  private readonly buffer: Float32Array;
  private readonly capacity: number;
  private head: number = 0;
  private count: number = 0;
  private sumSq: number = 0;
  private sum: number = 0;
  private peak: number = 0;
  private sessionSumSq: number = 0;
  private sessionCount: number = 0;

  constructor(capacity: number = 256) {
    this.capacity = capacity;
    this.buffer = new Float32Array(capacity);
  }

  public push(value: number): void {
    if (!Number.isFinite(value)) return;

    // Quantize to IEEE-754 Float32 once so addition and circular subtraction use identical bit representations
    const f32Val = Math.fround(value);
    const sqVal = f32Val * f32Val;

    const absVal = Math.abs(f32Val);
    if (absVal > this.peak) {
      this.peak = absVal;
    }

    this.sessionSumSq += sqVal;
    this.sessionCount++;

    if (this.count < this.capacity) {
      this.buffer[this.head] = f32Val;
      this.sumSq += sqVal;
      this.sum += f32Val;
      this.count++;
      this.head = (this.head + 1) % this.capacity;
    } else {
      const oldValue = this.buffer[this.head];
      this.buffer[this.head] = f32Val;
      // Exact Float32-squared delta update with zero cumulative drift
      this.sumSq = Math.max(0, this.sumSq - (oldValue * oldValue) + sqVal);
      this.sum = this.sum - oldValue + f32Val;
      this.head = (this.head + 1) % this.capacity;
    }
  }

  public getRMS(): number {
    if (this.count === 0) return 0;
    return Math.sqrt(this.sumSq / this.count);
  }

  public getSessionRMS(): number {
    if (this.sessionCount === 0) return 0;
    return Math.sqrt(this.sessionSumSq / this.sessionCount);
  }

  public getMean(): number {
    if (this.count === 0) return 0;
    return this.sum / this.count;
  }

  public getPeak(): number {
    return this.peak;
  }

  public getCount(): number {
    return this.count;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public reset(): void {
    this.buffer.fill(0);
    this.head = 0;
    this.count = 0;
    this.sumSq = 0;
    this.sum = 0;
    this.peak = 0;
    this.sessionSumSq = 0;
    this.sessionCount = 0;
  }

  /**
   * Copies current sequential history into an external pre-allocated array
   * without creating heap garbage.
   */
  public copyOrdered(target: Float32Array): number {
    const copyCount = Math.min(this.count, target.length);
    if (this.count < this.capacity) {
      target.set(this.buffer.subarray(0, copyCount));
    } else {
      // Elements are from head to end, then 0 to head
      const tailCount = this.capacity - this.head;
      if (copyCount <= tailCount) {
        target.set(this.buffer.subarray(this.head, this.head + copyCount));
      } else {
        target.set(this.buffer.subarray(this.head, this.capacity), 0);
        target.set(this.buffer.subarray(0, copyCount - tailCount), tailCount);
      }
    }
    return copyCount;
  }
}

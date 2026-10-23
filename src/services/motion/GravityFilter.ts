// High-pass filter to isolate quick balance shifts from slow posture tilt
export class HighPassFilter {
  private alpha: number;
  private cutoffHz: number;
  private prevInput: number = 0;
  private prevOutput: number = 0;
  private initialized: boolean = false;

  constructor(alpha: number = 0.9502, cutoffHz: number = 0.5) {
    this.alpha = alpha;
    this.cutoffHz = Math.max(0.01, Number.isFinite(cutoffHz) ? cutoffHz : 0.5);
  }

  public filter(sample: number, dtSeconds?: number): number {
    if (!Number.isFinite(sample)) {
      return 0;
    }

    // Dynamic time-delta scaling: compute alpha if dtSeconds is provided
    if (typeof dtSeconds === 'number' && Number.isFinite(dtSeconds) && dtSeconds > 0) {
      // Clamped defensively between 5ms (200Hz) and 50ms (20Hz) to prevent division-by-zero or NaN
      const clampedDt = Math.min(Math.max(dtSeconds, 0.005), 0.05);
      const safeCutoff = Math.max(0.01, Number.isFinite(this.cutoffHz) ? this.cutoffHz : 0.5);
      this.cutoffHz = safeCutoff;
      const rc = 1.0 / (2.0 * Math.PI * safeCutoff);
      this.alpha = rc / (rc + clampedDt);
    }

    if (!this.initialized) {
      this.prevInput = sample;
      this.prevOutput = 0;
      this.initialized = true;
      return 0;
    }

    const output = this.alpha * (this.prevOutput + sample - this.prevInput);
    this.prevInput = sample;
    this.prevOutput = output;
    return output;
  }

  public getAlpha(): number {
    return this.alpha;
  }

  public getCutoffHz(): number {
    return this.cutoffHz;
  }

  public reset(): void {
    this.prevInput = 0;
    this.prevOutput = 0;
    this.initialized = false;
  }
}

// Filters accelerometer axes and computes planar sway magnitude
export class PosturalSwayFilter {
  private xFilter: HighPassFilter;
  private yFilter: HighPassFilter;
  private zFilter: HighPassFilter;

  constructor(alpha: number = 0.9502, cutoffHz: number = 0.5) {
    const safeCutoff = Math.max(0.01, Number.isFinite(cutoffHz) ? cutoffHz : 0.5);
    this.xFilter = new HighPassFilter(alpha, safeCutoff);
    this.yFilter = new HighPassFilter(alpha, safeCutoff);
    this.zFilter = new HighPassFilter(alpha, safeCutoff);
  }

  public process(
    ax: number,
    ay: number,
    az: number,
    dtSeconds?: number
  ): { x: number; y: number; z: number; magnitude: number; planarMagnitude: number } {
    const fx = this.xFilter.filter(ax, dtSeconds);
    const fy = this.yFilter.filter(ay, dtSeconds);
    const fz = this.zFilter.filter(az, dtSeconds);

    // Planar sway magnitude from horizontal axes
    const planarMagnitude = Math.sqrt(fx * fx + fz * fz);
    const magnitude = planarMagnitude;

    return { x: fx, y: fy, z: fz, magnitude, planarMagnitude };
  }

  public reset(): void {
    this.xFilter.reset();
    this.yFilter.reset();
    this.zFilter.reset();
  }
}

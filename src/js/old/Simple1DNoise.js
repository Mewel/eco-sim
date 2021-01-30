export class Simple1DNoise {

  constructor() {
    this.MAX_VERTICES = 256;
    this.MAX_VERTICES_MASK = this.MAX_VERTICES - 1;
    this.amplitude = 1;
    this.scale = 1;
    this.r = [];

    for (let i = 0; i < this.MAX_VERTICES; ++i) {
      this.r.push(Math.random());
    }
  }

  getVal(x) {
    let scaledX = x * this.scale;
    let xFloor = Math.floor(scaledX);
    let t = scaledX - xFloor;
    let tRemapSmoothstep = t * t * (3 - 2 * t);

    /// Modulo using &#038;
    let xMin = xFloor % this.MAX_VERTICES_MASK;
    let xMax = (xMin + 1) % this.MAX_VERTICES_MASK;
    let y = this.lerp(this.r[xMin], this.r[xMax], tRemapSmoothstep);
    return y * this.amplitude;
  }

  /**
   * Linear interpolation function.
   * @param a The lower integer value
   * @param b The upper integer value
   * @param t The value between the two
   * @returns {number}
   */
  lerp(a, b, t) {
    return a * (1 - t) + b * t;
  }

}
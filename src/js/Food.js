import * as THREE from "three";

export class Food {

  constructor(x, z, model) {
    this.tile = new THREE.Vector2(x, z);
    this.value = 1.;
    this.model = model;
    this.maxSize = 30;
  }

  tick(world) {
    this.value = Math.min(1.0, this.value + .005);
    const size = this.maxSize * this.value;
    this.model.scale.set(size, size, size);
  }

}

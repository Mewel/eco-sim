import {Object3D} from "three";

export class Food {

  constructor(index, x, z) {
    this.index = index;
    this.tile = [x, z];
    this.value = 1.;
    this.model = new Object3D();
    this.maxSize = 30;
  }

  tick(world) {
    this.updateSize();
    world.foodMesh.setMatrixAt(this.index, this.model.matrix);
    world.foodMesh.update();
  }

  getSize() {
    this.value = Math.min(1.0, this.value + .005);
    return this.maxSize * this.value;
  }

  updateSize() {
    const size = this.getSize();
    this.model.scale.set(size, size, size);
    this.model.updateMatrix();
  }

}

import * as THREE from "three";

export class DynamicInstancedMesh extends THREE.InstancedMesh {

  constructor(geometry, material, count, capacity) {
    super(geometry, material, count);
    this.bufferCapacity = capacity < count ? count : capacity;
    if (count < capacity) {
      this.updateCapacity();
    }
  }

  updateCapacity() {
    const matrixBuffer = new Float32Array(this.instanceMatrix.itemSize * this.bufferCapacity);
    matrixBuffer.set(this.instanceMatrix.array);
    this.instanceMatrix.count = this.bufferCapacity;
    this.instanceMatrix.array = matrixBuffer;
    if (this.instanceColor !== null) {
      const colorBuffer = new Float32Array(this.instanceColor.itemSize * this.bufferCapacity);
      colorBuffer.set(this.instanceColor.array);
      this.instanceColor.count = this.bufferCapacity;
      this.instanceColor.array = colorBuffer;
    }
  }

  addInstance(matrix4) {
    if (this.count >= this.bufferCapacity) {
      throw new Error("out of range exception: dynamic instanced mesh capacity reached " + this.bufferCapacity);
    }
    this.instanceMatrix.array.set(matrix4.elements, this.instanceMatrix.itemSize * this.count);
    this.count++;
  }

  removeInstance(i) {
    if (i >= this.count) {
      return false;
    }
    // matrix
    const endMatrix = this.instanceMatrix.itemSize * this.count;
    const lastMatrix = this.instanceMatrix.array.subarray(endMatrix - this.instanceMatrix.itemSize, endMatrix);
    this.instanceMatrix.array.set(lastMatrix, i * this.instanceMatrix.itemSize);
    // color
    if (this.instanceColor !== null) {
      const endColor = this.instanceColor.itemSize * this.count;
      const lastColor = this.instanceColor.array.subarray(endColor - this.instanceColor.itemSize, endColor);
      this.instanceColor.array.set(lastColor, i * this.instanceColor.itemSize);
    }
    this.count--;
    return true;
  }

  setColorAt(index, color) {
    if (this.instanceColor === null) {
      this.instanceColor = new THREE.BufferAttribute(new Float32Array(this.bufferCapacity * 3), 3);
    }
    color.toArray(this.instanceColor.array, index * 3);
  }

  update() {
    this.instanceMatrix.needsUpdate = true;
    this.instanceMatrix.updateRange = {
      offset: 0,
      count: this.instanceMatrix.count * 16
    }
    if (this.instanceColor) {
      this.instanceColor.updateRange = {
        offset: 0,
        count: this.instanceColor * 3
      }
    }
  }

}

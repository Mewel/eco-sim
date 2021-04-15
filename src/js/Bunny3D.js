import * as THREE from "three";

import {Settings} from "./Settings";
import {PathFinder} from "./PathFinder";

export class Bunny3D {

  static INVERSE_SQUARE_ROOT_2 = 1 / Math.sqrt(2);
  static JUMP_HEIGHT = 12;

  constructor(bunny) {
    this.bunny = bunny;
    this.index = null;
    this.object3D = new THREE.Object3D();
    this.distanceTraveled = null
    this.jump = {
      next: null,
      path: [],
      from: null,
      to: null,
      jumped: 0,
      hv: true,
      offset: [],
      n: 0
    }
  }

  jumpTo(to) {
    this.jump.next = to;
  }

  jumpN(n) {
    this.jump.n = n;
  }

  stop() {
    this.jump.next = null;
  }

  isMoving() {
    return this.jump.to !== null;
  }

  isJumping() {
    return this.isMoving() || this.jump.n > 0;
  }

  die() {
    this.stop();
    this.object3D.position.y = 0;
    this.object3D.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  }

  update(world, delta) {
    // check for new path options
    if (this.jump.next !== null && this.jump.to === null && this.jump.jumped === 0) {
      const to = this.jump.next;
      const from = world.toGrid(this.object3D.position.x, this.object3D.position.z);
      // check if we are already at the target
      if (to[0] !== from[0] || to[1] !== from[1]) {
        // get curve and jump to when finished
        PathFinder.find(from[0], from[1], to[0], to[1], (path) => {
          this.jump.path = path.reverse(); // reverse array for faster pop instead of shift
          this.jump.path.pop(); // remove first entry cause we don't need it
        }, () => {
          this.jump.next = null;
        });
      }
    }

    // a path exists -> lets check the next tile
    if (this.jump.to === null && this.jump.path.length > 0) {
      const from = world.toGrid(this.object3D.position.x, this.object3D.position.z);
      const target = this.jump.path.pop();
      this.jump.n = 0;
      this.jump.from = this.getPositionArray();
      this.jump.to = world.toScene(target.x, target.y);
      this.jump.offset = [target.x - from[0], target.y - from[1]]
      this.jump.hv = ((this.jump.offset[0] === 0) || (this.jump.offset[1] === 0));
      this.jump.jumped = 0;
      this.lookAt(new THREE.Vector3(this.jump.to[0], 0, this.jump.to[1]));
    }

    // do jump
    if (this.jump.to !== null) {
      const distance = delta * this.bunny.traits.speed * Settings.speed * (this.jump.hv ? 1 : Bunny3D.INVERSE_SQUARE_ROOT_2);
      this.jump.jumped = Math.min(world.tileSize, this.jump.jumped + distance);
      this.object3D.position.x = this.jump.from[0] + (this.jump.jumped * this.jump.offset[0]);
      this.object3D.position.z = this.jump.from[1] + (this.jump.jumped * this.jump.offset[1]);
      this.object3D.position.y = this.getY(world);
      if (this.jump.jumped >= world.tileSize) {
        this.jump.from = null;
        this.jump.to = null;
        this.jump.jumped = 0;
      }
    } else if (this.jump.n > 0) {
      const height = delta * this.bunny.traits.speed * Settings.speed;
      this.jump.jumped = Math.min(world.tileSize, this.jump.jumped + height);
      this.object3D.position.y = this.getY(world);
      if (this.jump.jumped >= world.tileSize) {
        this.jump.n--;
        this.jump.jumped = 0;
      }
    }
    const scale = this.getScale();
    this.object3D.scale.set(scale, scale, scale);
    this.object3D.updateMatrix();
    return this.object3D.matrix;
  }

  getY(world) {
    const halfTileSize = world.tileSize / 2;
    return Math.max(0, Math.min(Bunny3D.JUMP_HEIGHT, this.jump.jumped < halfTileSize ?
      (this.easeOutSine(this.jump.jumped / halfTileSize) * Bunny3D.JUMP_HEIGHT) :
      (this.easeOutSine((halfTileSize - (this.jump.jumped - halfTileSize)) / halfTileSize) * Bunny3D.JUMP_HEIGHT)
    ));
  }

  easeOutSine(x) {
    return Math.sin((x * Math.PI) / 2);
  }

  setPosition(x, y, z) {
    this.object3D.position.set(x, y, z);
  }

  getPositionArray() {
    return [this.object3D.position.x, this.object3D.position.z];
  }

  getPosition() {
    return this.object3D.position;
  }

  lookAt(target) {
    this.object3D.lookAt(target);
  }

  getScale() {
    const maxScale = this.bunny.traits.sex ? .5 : .45;
    return this.bunny.isAdult() ? maxScale : Math.min(1., (this.bunny.age / (this.bunny.traits.lifespan / 10)) + .2) * maxScale;
  }

}

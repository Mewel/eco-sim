import * as TWEEN from "@tweenjs/tween.js";
import * as THREE from "three";

import {Settings} from "./Settings";
import {PathFinder} from "./PathFinder";

export class Bunny3D {

  static JUMP_ANIMATION = {y: [20, 0]};
  static JUMP_DISTANCE = 20; // tile size is 20

  constructor(bunny) {
    this.bunny = bunny;
    this.index = null;
    this.matrix = new THREE.Matrix4();
    this.rescale();
    this.distanceTraveled = null
    this.curve = null;
    this.stopJump = false;
    this.jumpPosition = {y: 0};
    this.jumpTween = new TWEEN.Tween(this.jumpPosition).interpolation(TWEEN.Interpolation.Bezier);
    this.jumpTween.onRepeat(() => {
      if (this.stopJump) {
        this.jumpTween.stop();
      }
    });
  }

  jumpTo(to, world) {
    const from = world.toGrid(this.matrix.elements[12], this.matrix.elements[14]);
    // check if we are already at the target
    if (to.equals(from)) {
      this.stop(true);
      return Promise.resolve();
    }
    // get curve and jump to when finished
    return PathFinder.getCurve(from.x, from.y, to.x, to.y).then((curve) => {
      this.#follow(curve);
    });
  }

  jumpToIgnore(to, world) {
    return this.jumpTo(to, world).catch(ignore => {
    });
  }

  jump(n) {
    this.jumpPosition.y = 0;
    this.stopJump = false;
    this.jumpTween.repeat(n).start();
  }

  #follow(curve) {
    this.curve = curve;
    this.jumpTween.stop();
    this.jumpPosition.y = 0;
    this.curveLength = this.curve.getLength();
    const distance = this.curveLength / Math.ceil(this.curveLength / Bunny3D.JUMP_DISTANCE);
    const duration = (1000 / (this.bunny.traits.speed / distance)) / Settings.speed;
    this.jumpTween.to(Bunny3D.JUMP_ANIMATION, duration).repeat(Infinity).start();
    this.stopJump = false;
    this.distanceTraveled = 0.0;
  }

  stop() {
    this.jumpTween.stop();
    this.jumpPosition.y = 0;
    this.distanceTraveled = null;
    this.stopJump = true;
  }

  isMoving() {
    return this.distanceTraveled !== null;
  }

  isJumping() {
    return this.jumpTween.isPlaying();
  }

  die() {
    this.stop();
    this.matrix.elements[13] = 0;
    let p = this.getPosition();
    this.matrix.makeRotationAxis(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    this.rescale();
    this.setPosition(p.x, p.y, p.z);
  }

  update(delta) {
    this.matrix.elements[13] = this.jumpPosition.y;
    if (this.distanceTraveled !== null) {
      const speed = (1 / this.curveLength) * delta * this.bunny.traits.speed * Settings.speed;
      this.distanceTraveled = Math.min(1., this.distanceTraveled + speed);
      const newPosition = this.curve.getPointAt(this.distanceTraveled);
      this.matrix.elements[12] = newPosition.x;
      this.matrix.elements[14] = newPosition.z;
      if (this.distanceTraveled + speed <= 1) {
        const target = this.curve.getPointAt(this.distanceTraveled + speed);
        target.y = this.matrix.elements[13];
        this.lookAt(target);
      }
    }
    if (this.distanceTraveled >= 1) {
      this.stop(false);
    }
    return this.matrix;
  }

  setPosition(x, y, z) {
    this.matrix.elements[12] = x;
    this.matrix.elements[13] = y;
    this.matrix.elements[14] = z;
  }

  getPosition(yZero = true) {
    return new THREE.Vector3(this.matrix.elements[12], yZero ? 0 : this.matrix.elements[13], this.matrix.elements[14]);
  }

  lookAt(target) {
    this.matrix.lookAt(target, this.getPosition(false), new THREE.Vector3(0, 1, 0));
    this.rescale();
  }

  rescale() {
    const scale = this.getAgeScale();
    this.matrix.scale(new THREE.Vector3(scale, scale, scale));
  }

  getAgeScale() {
    const maxScale = .5;
    return this.bunny.isAdult() ? maxScale : Math.min(1., (this.bunny.age / (this.bunny.traits.lifespan / 10)) + .2) * maxScale;
  }

}

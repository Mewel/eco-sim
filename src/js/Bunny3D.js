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
    this.object3D = new THREE.Object3D();
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
    const from = world.toGrid(this.object3D.position.x, this.object3D.position.z);
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
    if(Settings.speed < 50) {
      this.jumpTween.repeat(n).start();
    }
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
    this.object3D.position.y = 0;
    this.object3D.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  }

  update(delta) {
    this.object3D.position.y = this.jumpPosition.y;
    if (this.distanceTraveled !== null) {
      const speed = (1 / this.curveLength) * delta * this.bunny.traits.speed * Settings.speed;
      this.distanceTraveled = Math.min(1., this.distanceTraveled + speed);
      const newPosition = this.curve.getPointAt(this.distanceTraveled);
      this.object3D.position.x = newPosition.x;
      this.object3D.position.z = newPosition.z;
      if(Settings.speed < 50) {
        if (this.distanceTraveled + speed <= 1) {
          const target = this.curve.getPointAt(this.distanceTraveled + speed);
          target.y = this.object3D.position.y;
          this.lookAt(target);
        }
      }
      if (this.distanceTraveled >= 1) {
        this.stop(false);
      }
    }
    let scale = this.getScale();
    this.object3D.scale.set(scale, scale, scale);
    this.object3D.updateMatrix();
    return this.object3D.matrix;
  }

  setPosition(x, y, z) {
    this.object3D.position.set(x, y, z);
  }

  getPosition(yZero = true) {
    if (yZero) {
      return new THREE.Vector3(this.object3D.position.x, 0, this.object3D.position.z);
    } else {
      return this.object3D.position;
    }
  }

  lookAt(target) {
    this.object3D.lookAt(target);
  }

  getScale() {
    const maxScale = this.bunny.traits.sex ? .5 : .45;
    return this.bunny.isAdult() ? maxScale : Math.min(1., (this.bunny.age / (this.bunny.traits.lifespan / 10)) + .2) * maxScale;
  }

}

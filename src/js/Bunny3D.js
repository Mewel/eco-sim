import * as THREE from "three";
import {ModelManager} from "./ModelManager";
import {Settings} from "./Settings";

export class Bunny3D extends THREE.Group {

  /**
   * Creates a new bunny instance. Requires that ModelManager is fully loaded.
   */
  constructor(name) {
    super();
    this.name = name;
    const bunny = ModelManager.create("rabbit");
    bunny.castShadow = true;
    bunny.receiveShadow = true;
    bunny.scale.set(.5, .5, .5);
    this.add(bunny);
    this.mixer = new THREE.AnimationMixer(bunny);
    this.jumpClip = ModelManager.getClip("rabbit", "jump");
    this.jumpAction = this.mixer.clipAction(this.jumpClip);
    this.jumpAction.stop();
    this.jumpUnitsPerTick = 50;
    this.clock = new THREE.Clock();
  }

  jumpTo(to, world, pathFinder) {
    if(this.died) {
      console.log("jumpTo");
    }
    const from = world.toGrid(this.position.x, this.position.z)
    return pathFinder.getCurve(from.x, from.y, to.x, to.y).then((curve) => {
      this.follow(world, curve);
    });
  }

  jumpToIgnore(to, world, pathFinder) {
    return this.jumpTo(to, world, pathFinder).catch(ignore => {
    });
  }

  jumpToDebug(to, world, pathFinder) {
    return this.jumpTo(to, world, pathFinder).then(() => {
      if (!this.showPath) {
        return;
      }
      if (this.pathHelper) {
        this.scene.remove(this.pathHelper);
      }
      const points = this.targetCurve.getPoints(200);
      points.forEach(p => p.y += 10);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({color: 0xff0000});
      this.pathHelper = new THREE.Line(geometry, material);
      this.scene.add(this.pathHelper);
    }).catch(ignore => {
    });
  }

  follow(world, curve) {
    if(this.died) {
      console.log("follow");
    }
    this.targetCurve = curve;
    this.totalDistance = curve.getLength();
    this.distanceTraveled = 0;
    this.jumpAction.reset();
    const jumpTimes = Math.ceil(this.totalDistance / (this.jumpUnitsPerTick / 2)) * Settings.speed;
    this.jumpAction.timeScale = jumpTimes / (this.totalDistance / this.jumpUnitsPerTick);
    this.jumpAction.play();
  }

  debugPath(scene) {
    this.scene = scene;
    this.showPath = true;
  }

  stop() {
    this.distanceTraveled = null;
    this.targetCurve = null;
    this.mixer.stopAllAction();
    this.jumpAction.stop();
  }

  isMoving() {
    return this.distanceTraveled !== null && this.distanceTraveled !== undefined;
  }

  die() {
    this.stop();
    this.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI / 2);

    this.died = true;
  }

  update() {
    const delta = this.clock.getDelta();
    this.mixer.update(delta);
    if (!this.isMoving()) {
      return;
    }
    if (this.distanceTraveled >= 1) {
      this.distanceTraveled = null;
      this.jumpAction.stop();
      return;
    }
    const speed = (1 / this.totalDistance) * delta * this.jumpUnitsPerTick * Settings.speed;
    this.distanceTraveled = Math.min(1., this.distanceTraveled + speed);
    const newPosition = this.targetCurve.getPointAt(this.distanceTraveled);
    const tangent = this.targetCurve.getTangent(this.distanceTraveled);
    this.position.copy(newPosition);
    if (this.distanceTraveled + speed <= 1) {
      this.rotation.x = tangent.x;
      this.rotation.y = tangent.y;
      this.rotation.z = tangent.z;
      this.lookAt(this.targetCurve.getPointAt(this.distanceTraveled + speed));
    }
  }

}

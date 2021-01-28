import * as THREE from "three";
import {ModelManager} from "./ModelManager";

export class Bunny3D {

  /**
   * Creates a new bunny instance. Requires that ModelManager is fully loaded.
   */
  constructor() {
    this.model = new THREE.Group();
    const bunny = ModelManager.create("rabbit");
    bunny.castShadow = true;
    bunny.receiveShadow = true;
    bunny.scale.set(.5, .5, .5);
    this.model.add(bunny);
    this.mixer = new THREE.AnimationMixer(bunny);
    this.jumpClip = ModelManager.getClip("rabbit", "jump");
    this.jumpAction = this.mixer.clipAction(this.jumpClip);
    this.jumpAction.stop();
    this.jumpUnitsPerSecond = 160;
    this.clock = new THREE.Clock();
  }

  jumpTo(point, world, pathFinder) {
    return pathFinder.getCurve(this.model.position.x, this.model.position.z, point.x, point.z).then((curve) => {
      this.follow(world, curve);
      if (!this.showPath) {
        return;
      }
      if (this.pathHelper) {
        this.scene.remove(this.pathHelper);
      }
      const points = curve.getPoints(200);
      points.forEach(p => p.y += 10);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({color: 0xff0000});
      this.pathHelper = new THREE.Line(geometry, material);
      this.scene.add(this.pathHelper);
    }).catch(ignore => {
    });
  }

  follow(world, curve) {
    this.targetCurve = curve;
    this.totalDistance = curve.getLength();
    this.distanceTraveled = 0;
    this.jumpAction.reset();
    const jumpTimes = Math.ceil(this.totalDistance / (this.jumpUnitsPerSecond / 2));
    this.jumpAction.timeScale = jumpTimes / (this.totalDistance / this.jumpUnitsPerSecond);
    this.jumpAction.play();
  }

  debugPath(scene) {
    this.scene = scene;
    this.showPath = true;
  }

  stop() {
    this.distanceTraveled = null;
    this.targetCurve = null;
    this.jumpAction.stop();
  }

  update() {
    const delta = this.clock.getDelta();
    this.mixer.update(delta);
    if (this.distanceTraveled === null || this.distanceTraveled === undefined) {
      return;
    }
    if (this.distanceTraveled >= 1) {
      this.distanceTraveled = null;
      this.jumpAction.stop();
      return;
    }
    const speed = (1 / this.totalDistance) * delta * this.jumpUnitsPerSecond;
    this.distanceTraveled = Math.min(1., this.distanceTraveled + speed);
    const newPosition = this.targetCurve.getPointAt(this.distanceTraveled);
    const tangent = this.targetCurve.getTangent(this.distanceTraveled);
    this.model.position.copy(newPosition);
    if (this.distanceTraveled + speed <= 1) {
      this.model.rotation.x = tangent.x;
      this.model.rotation.y = tangent.y;
      this.model.rotation.z = tangent.z;
      this.model.lookAt(this.targetCurve.getPointAt(this.distanceTraveled + speed));
    }
  }

}

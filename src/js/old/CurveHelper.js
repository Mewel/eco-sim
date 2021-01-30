import * as THREE from "three";

export class CurveHelper {

  constructor(bunny) {
    this.bunny = bunny;
    this.model = null;
  }

  update(parent) {
    if (this.model && this.model.parent) {
      this.model.geometry.dispose();
      this.model.material.dispose();
      this.model.parent.remove(this.model);
    }
    const points = this.bunny.targetCurve.getPoints(20);
    points.forEach(p => p.y += 10);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({color: 0xff0000});
    this.model = new THREE.Line(geometry, material);
    parent.add(this.model);
  }

}

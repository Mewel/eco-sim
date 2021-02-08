import * as THREE from 'three';

export class BunnyInfo {

  constructor(world) {
    this.world = world;
    const geometry = new THREE.CircleGeometry(1, 32);
    const material = new THREE.MeshPhongMaterial({color: 0xffff00, opacity: 0.5, transparent: true});
    this.rangeOfSightCircle = new THREE.Mesh(geometry, material);
    this.rangeOfSightCircle.rotateX(-Math.PI / 2);
    this.rangeOfSightCircle.position.y = 1;
  }

  assignBunny(bunny) {
    this.unassignBunny();
    this.bunny = bunny;
    if (!bunny.isDead()) {
      const rangeOfSight = this.bunny.traits.rangeOfSight * this.world.tileSize;
      this.rangeOfSightCircle.scale.set(rangeOfSight, rangeOfSight, rangeOfSight);
      this.world.worldGroup.add(this.rangeOfSightCircle);
    }
  }

  unassignBunny() {
    this.world.worldGroup.remove(this.rangeOfSightCircle);
    this.bunny = null;
  }

  isBunnyAssigned() {
    return this.bunny !== undefined && this.bunny !== null;
  }

  update() {
    if (this.isBunnyAssigned() && this.rangeOfSightCircle) {
      const p = this.bunny.model.getPosition();
      this.rangeOfSightCircle.position.set(p.x, 1, p.z);
    }
  }

}

import * as THREE from 'three';

import {CSS2DObject} from "three/examples/jsm/renderers/CSS2DRenderer";
import {Bunny} from "./Bunny";

export class BunnyInfo {

  constructor(world) {
    this.world = world;
    this.content = this.create();
    this.infoObject = new CSS2DObject(this.content);
    this.nameElement = this.content.getElementsByClassName("name")[0];
    this.aliveElement = this.content.getElementsByClassName("alive")[0];
    this.deadElement = this.content.getElementsByClassName("dead")[0];
    this.actionElement = this.content.getElementsByClassName("action")[0];
    this.exhaustionProgressElement = this.content.getElementsByClassName("exhaustion")[0].getElementsByClassName("progress-bar")[0];
    this.thirstProgressElement = this.content.getElementsByClassName("thirst")[0].getElementsByClassName("progress-bar")[0];
    this.hungerProgressElement = this.content.getElementsByClassName("hunger")[0].getElementsByClassName("progress-bar")[0];

    const geometry = new THREE.CircleGeometry(1, 32);
    const material = new THREE.MeshPhongMaterial({color: 0xffff00, opacity: 0.5, transparent: true});
    this.rangeOfSightCircle = new THREE.Mesh(geometry, material);
    this.rangeOfSightCircle.rotateX(-Math.PI / 2);
    this.rangeOfSightCircle.position.y = 1;
  }

  create() {
    let template = document.createElement('template');
    template.innerHTML = `
      <div class="info">
        <div class="name"></div>
        <div class="alive">
          <div class="exhaustion progress">
            <span style="width: 0%" class="progress-bar"></span>
            <span class="progress-text">exhaustion</span>
          </div>
          <div class="thirst progress">
            <span style="width: 0%" class="progress-bar"></span>
            <span class="progress-text">thirst</span>
          </div>
          <div class="hunger progress">
            <span style="width: 0%" class="progress-bar"></span>
            <span class="progress-text">hunger</span>
          </div>
          <div class="action"></div>
         </div>
         <div class="dead">
         </div>
      </div>;
    `.trim();
    return template.content.firstChild;
  }

  update(camera) {
    this.nameElement.textContent = this.bunny.name;
    let dead = this.bunny.isDead();
    this.aliveElement.style.display = dead ? "none" : "block";
    this.deadElement.style.display = dead ? "block" : "none";
    if (dead) {
      this.infoObject.position.set(0, 20 + camera.position.y / 10, 0);
      this.deadElement.textContent = "died because of " + this.bunny.dead.causeOfDeath;
      this.bunny.model.remove(this.rangeOfSightCircle);
    } else {
      this.infoObject.position.set(0, 20 + camera.position.y / 5, 0);
      this.actionElement.textContent = this.bunny.action.description;
      if (this.bunny.action === Bunny.Actions.searchFood) {
        this.actionElement.textContent = this.bunny.resourceFound ? "food found" : "search food";
      } else if (this.bunny.action === Bunny.Actions.searchWater) {
        this.actionElement.textContent = this.bunny.resourceFound ? "water found" : "search water";
      }
      this.thirstProgressElement.style.width = (this.bunny.thirst * 100) + "%";
      this.hungerProgressElement.style.width = (this.bunny.hunger * 100) + "%";
      this.exhaustionProgressElement.style.width = (this.bunny.exhaustion * 100) + "%";
    }
  }

  assignBunny(bunny) {
    this.unassignBunny();
    this.bunny = bunny;
    this.bunny.model.add(this.infoObject);
    if(!bunny.isDead()) {
      const rangeOfSight = this.bunny.rangeOfSight * this.world.tileSize;
      this.rangeOfSightCircle.scale.set(rangeOfSight, rangeOfSight, rangeOfSight);
      this.bunny.model.add(this.rangeOfSightCircle)
    }
  }

  unassignBunny() {
    if (this.bunny) {
      this.bunny.model.remove(this.infoObject);
      this.bunny.model.remove(this.rangeOfSightCircle);
    }
    this.bunny = null;
  }

  isBunnyAssigned() {
    return this.bunny !== undefined && this.bunny !== null;
  }

}

import * as THREE from "three";

import {AssetManager} from "./AssetManager";
import {DynamicInstancedMesh} from "./DynamicInstancedMesh";
import {getRandomInt} from "./util/util";
import {Bunny} from "./Bunny";

const AnimalHandler = {

  initialized: false,

  init() {
    this.group = new THREE.Group();
    this.maleBunnies = [];
    this.femaleBunnies = [];

    const bunnyMale = AssetManager.create("bunny_male");
    const bunnyFemale = AssetManager.create("bunny_female");
    this.maleBunniesMesh = new DynamicInstancedMesh(bunnyMale.geometry, bunnyMale.material, 0, 100000);
    this.femaleBunniesMesh = new DynamicInstancedMesh(bunnyFemale.geometry, bunnyFemale.material, 0, 100000);
    this.group.add(this.maleBunniesMesh);
    this.group.add(this.femaleBunniesMesh);
    this.maleBunniesMesh.userData.array = this.maleBunnies;
    this.femaleBunniesMesh.userData.array = this.femaleBunnies;
    this.initialized = true;
  },

  spawnBunnies(world, amount) {
    for (let i = 0; i < amount; i++) {
      let spawn = new THREE.Vector2(getRandomInt(0, world.tiles), getRandomInt(0, world.tiles));
      while (!world.isWalkable(spawn.x, spawn.y)) {
        spawn = new THREE.Vector2(getRandomInt(0, world.tiles), getRandomInt(0, world.tiles));
      }
      let bunny = this.createBunny(world, spawn);
      bunny.age = getRandomInt(0, bunny.traits.lifespan - 1000); // randomize starting age
    }
    /*let spawn;
    for (let i = 0; i < 1; i++) {
      spawn = new THREE.Vector2(getRandomInt(0, world.tiles), getRandomInt(0, world.tiles));
      while (!world.isWalkable(spawn.x, spawn.y)) {
        spawn = new THREE.Vector2(getRandomInt(0, world.tiles), getRandomInt(0, world.tiles));
      }
    }
    this.createBunny(world, spawn.set(spawn.x, spawn.y)).reproductionUrge = .95;
    setTimeout(() => {
      console.log("add bunny");
      this.createBunny(world, spawn.set(spawn.x + 1, spawn.y)).reproductionUrge = .95;
      let b = this.createBunny(world, spawn.set(spawn.x, spawn.y + 1));
      b.reproductionUrge = .95;
      AnimalHandler.remove(b);
    }, 1000);*/
  },

  createBunny(world, spawn) {
    const region = world.getRegion(spawn.x, spawn.y);
    let bunny = new Bunny();
    let pos = world.toScene(spawn.x, spawn.y);
    bunny.model.setPosition(pos.x, pos.y, pos.z);
    bunny.region = region;
    this.addBunny(bunny);
    return bunny;
  },

  addBunny(bunny) {
    if (bunny.traits.sex) {
      this.maleBunniesMesh.addInstance(bunny.model.object3D.matrix);
      this.maleBunnies.push(bunny.model);
      bunny.model.index = this.maleBunniesMesh.count - 1;
    } else {
      this.femaleBunniesMesh.addInstance(bunny.model.object3D.matrix);
      this.femaleBunnies.push(bunny.model);
      bunny.model.index = this.femaleBunniesMesh.count - 1;
    }
    bunny.region.animals.push(bunny);
  },

  remove(animal) {
    this.removeBunny(
      animal.traits.sex ? this.maleBunniesMesh : this.femaleBunniesMesh,
      animal.traits.sex ? this.maleBunnies : this.femaleBunnies,
      animal.model
    );
  },

  removeBunny(mesh, arr, model) {
    if (mesh.removeInstance(model.index)) {
      let removed = arr.pop();
      if (model.index < arr.length) {
        arr[model.index] = removed;
        arr[model.index].index = model.index;
      }
    }
  },

  update(delta) {
    for (let i = 0; i < this.maleBunnies.length; i++) {
      let matrix = this.maleBunnies[i].update(delta);
      this.maleBunniesMesh.setMatrixAt(i, matrix);
    }
    for (let i = 0; i < this.femaleBunnies.length; i++) {
      let matrix = this.femaleBunnies[i].update(delta);
      this.femaleBunniesMesh.setMatrixAt(i, matrix);
    }
    this.maleBunniesMesh.update();
    this.femaleBunniesMesh.update();
  }

}

export {AnimalHandler};

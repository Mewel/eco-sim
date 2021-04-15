import * as THREE from "three";
import {debugBox, distance} from "./util/util";
import {Food} from "./Food";

export class Region {

  constructor(world, regionId) {
    this.world = world;
    this.regionId = regionId;
    this.food = new Map();
    this.animals = [];
  }

  build(gridX, gridZ) {
    let toExploreStack = [[gridX, gridZ]];
    while (toExploreStack.length > 0) {
      const tile = toExploreStack.pop();
      if (this.#isValidTile(tile)) {
        this.expand(tile, toExploreStack);
      }
    }
  }

  expand(tile, toExploreStack) {
    this.world.regionTiles[tile[1]][tile[0]] = this.regionId;
    const sides = [
      1, 1, 0, 1, -1, 1,
      1, 0, -1, 0,
      1, -1, 0, -1, -1, -1,
    ];
    for (let i = 0; i < sides.length; i += 2) {
      let newTile = [tile[0] + sides[i], tile[1] + sides[i + 1]];
      if (this.#isValidTile(newTile)) {
        toExploreStack.push(newTile);
      }
    }
  }

  #isValidTile(tile) {
    return !(tile[0] < 0 || tile[0] > this.world.tiles || tile[1] < 0 || tile[1] > this.world.tiles ||
      this.isPartOf(tile[0], tile[1]) || this.world.isWater(tile[0], tile[1]) || this.world.hasObstacle(tile[0], tile[1]));
  }

  isPartOf(gridX, gridZ) {
    return this.world.regionTiles[gridZ][gridX] === this.regionId;
  }

  addFood(index, x, z) {
    const food = new Food(index, x, z);
    const scenePosition = this.world.toScene(x, z);
    food.model.position.set(scenePosition[0], 0, scenePosition[1]);
    food.updateSize();
    food.model.updateMatrix();
    this.food.set(x + "_" + z, food);
    return food;
  }

  getFood(gridX, gridZ, maxGridDistance) {
    const result = [];
    this.food.forEach(food => {
      const d = distance(gridX, gridZ, food.tile[0], food.tile[1]);
      if (d <= maxGridDistance && food.value >= .1) {
        result.push({d, food: food});
      }
    })
    if (result.length > 0) {
      result.sort((f1, f2) => (f1.distance / f1.food.value) - (f2.distance / f2.food.value));
      return result[0].food;
    } else {
      return null;
    }
  }

  hasFood(x, z) {
    return this.food.has(x + "_" + z);
  }

  debug() {
    /* TODO
    let color = new THREE.Color(Math.random(), Math.random(), Math.random());
    Object.keys(this.tiles).forEach(key => {
      const x = parseInt(key.split("_")[0]);
      const z = parseInt(key.split("_")[1]);
      debugBox(this.world, x, z, color)
    });*/
  }

  removeAnimal(animal) {
    // swap remove -> fast and we don't care about the order
    let index = this.animals.indexOf(animal);
    if (index >= 0) {
      this.animals[index] = this.animals[this.animals.length - 1];
      this.animals.pop();
    }
  }

  tick() {
    this.food.forEach(food => food.tick(this.world));
    this.animals.forEach(animal => animal.tick(this.world));
  }

}

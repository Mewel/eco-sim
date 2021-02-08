import * as THREE from "three";
import {debugBox} from "./util/util";
import {Food} from "./Food";

export class Region {

  constructor() {
    this.food = new Map();
    this.tiles = {};
    this.animals = [];
  }

  build(world, gridX, gridZ) {
    let toExploreStack = [new THREE.Vector2(gridX, gridZ)];
    while (toExploreStack.length > 0) {
      const tile = toExploreStack.pop();
      if (this.isValidTile(world, tile)) {
        this.expand(world, tile, toExploreStack);
      }
    }
  }

  expand(world, tile, toExploreStack) {
    this.tiles[tile.x + "_" + tile.y] = true;
    const sides = [
      1, 1, 0, 1, -1, 1,
      1, 0, -1, 0,
      1, -1, 0, -1, -1, -1,
    ];
    for (let i = 0; i < sides.length; i += 2) {
      let newTile = new THREE.Vector2(tile.x + sides[i], tile.y + sides[i + 1]);
      if (this.isValidTile(world, newTile)) {
        toExploreStack.push(new THREE.Vector2(newTile.x, newTile.y));
      }
    }
  }

  isValidTile(world, tile) {
    return !(tile.x < 0 || tile.x > world.tiles || tile.y < 0 || tile.y > world.tiles ||
      this.isPartOf(tile.x, tile.y) || world.isWater(tile.x, tile.y) || world.hasObstacle(tile.x, tile.y));
  }

  isPartOf(gridX, gridZ) {
    return this.tiles[gridX + "_" + gridZ];
  }

  addFood(x, z, model) {
    this.food.set(x + "_" + z, new Food(x, z, model));
  }

  getFood(gridX, gridZ, maxGridDistance) {
    const fromTile = new THREE.Vector2(gridX, gridZ);
    const result = [];
    this.food.forEach(food => {
      const distance = fromTile.distanceTo(food.tile);
      if (distance <= maxGridDistance && food.value >= .1) {
        result.push({distance, food: food});
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

  debug(world) {
    let color = new THREE.Color(Math.random(), Math.random(), Math.random());
    Object.keys(this.tiles).forEach(key => {
      const x = parseInt(key.split("_")[0]);
      const z = parseInt(key.split("_")[1]);
      debugBox(world, x, z, color)
    });
  }

  removeAnimal(animal) {
    // swap remove -> fast and we don't care about the order
    let index = this.animals.indexOf(animal);
    if (index >= 0) {
      this.animals[index] = this.animals[this.animals.length - 1];
      this.animals.pop();
    }
  }

  tick(world) {
    this.food.forEach(food => food.tick(world));
    this.animals.forEach(animal => animal.tick(world));
  }

}

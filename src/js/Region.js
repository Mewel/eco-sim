import * as THREE from "three";
import {debugBox} from "./util/util";

export class Region {

  constructor() {
    this.food = {};
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

  getFood(world, gridX, gridZ, maxGridDistance) {
    const fromTile = new THREE.Vector2(gridX, gridZ);
    const food = [];
    Object.keys(this.food).forEach(key => {
      const x = parseInt(key.split("_")[0]);
      const z = parseInt(key.split("_")[1]);
      const foodTile = new THREE.Vector2(x, z);
      const distance = fromTile.distanceTo(foodTile);
      if (distance <= maxGridDistance) {
        food.push({distance, tile: foodTile});
      }
    });
    food.sort((f1, f2) => f1.distance - f2.distance);
    return food;
  }

  debug(world) {
    let color = new THREE.Color(Math.random(), Math.random(), Math.random());
    Object.keys(this.tiles).forEach(key => {
      const x = parseInt(key.split("_")[0]);
      const z = parseInt(key.split("_")[1]);
      debugBox(world, x, z, color)
    });
  }

}

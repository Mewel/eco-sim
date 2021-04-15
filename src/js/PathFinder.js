import {js} from "easystarjs";

const PathFinder = {

  init(world) {
    this.world = world;
    this.buildTerrainGrid();
    this.easyStar = new js();
    this.easyStar.setAcceptableTiles([0]);
    this.easyStar.enableDiagonals();
    this.easyStar.enableCornerCutting();
    this.easyStar.enableSync();
    this.updateGrid();
  },

  find(fromX, fromZ, toX, toZ, resolve, reject) {
    this.easyStar.findPath(fromX, fromZ, toX, toZ, (path) => {
      if (path === null) {
        reject("no path found");
      } else {
        resolve(path);
      }
    });
    this.easyStar.calculate();
  },

  getGrid() {
    const grid = [];
    for (let z = 0; z < this.world.tiles; z++) {
      let row = [];
      grid.push(row);
      for (let x = 0; x < this.world.tiles; x++) {
        const terrainValue = (this.terrainGrid[z] && this.terrainGrid[z][x]) ? this.terrainGrid[z][x] : 0;
        const obstacleValue = this.world.hasObstacle(x, z) ? 2 : 0;
        row.push(terrainValue + obstacleValue);
      }
    }
    return grid;
  },

  buildTerrainGrid() {
    this.terrainGrid = [];
    for (let z = 0; z < this.world.tiles; z++) {
      let row = [];
      this.terrainGrid.push(row);
      for (let x = 0; x < this.world.tiles; x++) {
        row.push(this.world.isWater(x, z) ? 1 : 0);
      }
    }
    return this;
  },

  updateGrid() {
    this.easyStar.setGrid(this.getGrid());
  },

  update() {
    this.easyStar.calculate();
  }

}

export {PathFinder}

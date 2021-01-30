import {Bunny3D} from "./Bunny3D";

export class Bunny {

  static Actions = Object.freeze({
    idle: Symbol("idle"),
    drink: Symbol("drink"),
    eat: Symbol("eat"),
    searchFood: Symbol("searchFood"),
    searchWater: Symbol("searchWater"),
  });

  constructor() {
    this.action = Bunny.Actions.idle;
    this.exhaustion = 0.0;
    this.thirst = 0.0;
    this.hunger = 0.0;
    this.model = new Bunny3D();
  }

  tick(world, pathFinder) {
    this.update(world);
    const newAction = this.think();
    if (newAction !== this.action) {
      this.action = newAction;
      this.act(world, pathFinder);
    }
  }

  update(world) {
    this.thirst += .01;
    this.hunger += .005;
    this.exhaustion += .001;

    if (this.action === Bunny.Actions.searchWater) {
      const grid = world.toGrid(this.model.position.x, this.model.position.z);
      if (world.hasWater(grid.x, grid.y)) {
        this.action = Bunny.Actions.drink;
      }
    }
    if (this.action === Bunny.Actions.searchFood) {
      const grid = world.toGrid(this.model.position.x, this.model.position.z);
      if (world.hasFood(grid.x, grid.y)) {
        this.action = Bunny.Actions.eat;
      }
    }

    if (this.action === Bunny.Actions.idle) {
      this.exhaustion -= .05;
    } else if (this.action === Bunny.Actions.drink) {
      this.thirst -= .1;
    } else if (this.action === Bunny.Actions.eat) {
      this.hunger -= .05;
    }

    this.thirst = this.thirst <= 0 ? 0 : this.thirst;
    this.exhaustion = this.exhaustion <= 0 ? 0 : this.exhaustion;
    this.hunger = this.hunger <= 0 ? 0 : this.hunger;

    if (this.thirst > 1) {
      this.die("thirst");
    } else if (this.exhaustion > 1) {
      this.die("exhaustion");
    } else if (this.hunger > 1) {
      this.die("hunger");
    }
  }

  /**
   * Bunny thinks about what's important in life!
   * Set's the new action
   */
  think() {
    // danger first - run!

    // basic needs
    // doing something already
    const busy = (this.action === Bunny.Actions.eat && this.hunger > 0) ||
      (this.action === Bunny.Actions.drink && this.thirst > 0);

    const needs = [];
    if (!busy || this.exhaustion > .8) {
      needs.push({action: Bunny.Actions.idle, importance: this.exhaustion});
    }
    if (this.thirst > .8 || (!busy && this.thirst > .3)) {
      needs.push({
        action: (this.action === Bunny.Actions.drink) ? Bunny.Actions.drink : Bunny.Actions.searchWater,
        importance: this.thirst
      });
    }
    if (this.hunger > .8 || (!busy && this.hunger > .3)) {
      needs.push({
        action: (this.action === Bunny.Actions.eat) ? Bunny.Actions.eat : Bunny.Actions.searchFood,
        importance: this.hunger
      });
    }
    if (needs.length === 0) {
      return this.action;
    }
    // need
    const resultingNeed = needs.reduce((need, nextNeed) => (nextNeed.importance > need.importance ? nextNeed : need), needs[0]);
    return resultingNeed.action;
  }

  act(world, pathFinder) {
    if (this.action === Bunny.Actions.searchWater) {
      const grid = world.toGrid(this.model.position.x, this.model.position.z);
      const closestWaterTile = world.getClosestWaterTile(grid.x, grid.y);
      this.model.jumpToDebug(closestWaterTile, world, pathFinder);
    } else if (this.action === Bunny.Actions.searchFood) {
      const grid = world.toGrid(this.model.position.x, this.model.position.z);
      const closestFoodTile = world.getClosestFoodTile(grid.x, grid.y);
      this.model.jumpToDebug(closestFoodTile, world, pathFinder);
    }
  }

  die(cause) {
    // TODO
    console.log("bunny died due " + cause);
  }

}
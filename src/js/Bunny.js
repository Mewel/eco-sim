import * as THREE from 'three';
import {Bunny3D} from "./Bunny3D";
import {debugBox, debugLine, getRandomInt} from "./util/util";

export class Bunny {

  static Actions = Object.freeze({
    idle: Symbol("idle"),
    sleep: Symbol("sleep"),
    drink: Symbol("drink"),
    eat: Symbol("eat"),
    searchFood: Symbol("search food"),
    searchWater: Symbol("search water"),
  });

  constructor(i) {
    this.action = Bunny.Actions.idle;
    this.exhaustion = 0.0;
    this.thirst = 0.0;
    this.hunger = 0.0;
    this.rangeOfSight = 5.0; // grid range
    this.name = "bunny #" + i;
    this.resourceFound = false;
    this.model = new Bunny3D(this.name);
    this.dead = null;
  }

  tick(world, pathFinder) {
    if (this.update(world)) {
      return;
    }
    const newAction = this.think();
    if (newAction !== this.action) {
      this.resourceFound = false;
      this.action = newAction;
    }
    this.act(world, pathFinder);
  }

  update(world) {
    if (this.isDead()) {
      return true;
    }
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

    if (this.action === Bunny.Actions.sleep) {
      this.exhaustion -= .02;
      this.thirst -= .005;
      this.hunger -= .0025;
    } else if (this.action === Bunny.Actions.drink) {
      this.thirst -= .1;
    } else if (this.action === Bunny.Actions.eat) {
      this.hunger -= .05;
    }

    this.thirst = this.thirst <= 0 ? 0 : this.thirst;
    this.exhaustion = this.exhaustion <= 0 ? 0 : this.exhaustion;
    this.hunger = this.hunger <= 0 ? 0 : this.hunger;

    if (this.thirst > 1) {
      return this.die("thirst");
    } else if (this.exhaustion > 1) {
      return this.die("exhaustion");
    } else if (this.hunger > 1) {
      return this.die("hunger");
    }
    return false;
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
      (this.action === Bunny.Actions.drink && this.thirst > 0) ||
      (this.action === Bunny.Actions.sleep && this.exhaustion > 0);

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
    if (this.exhaustion > .7) {
      needs.push({
        action: Bunny.Actions.sleep, importance: this.exhaustion
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
    if (this.action === Bunny.Actions.searchWater && !this.resourceFound) {
      const grid = world.toGrid(this.model.position.x, this.model.position.z);
      const closestWaterTile = world.getClosestWaterTile(grid.x, grid.y, this.rangeOfSight);
      if (!closestWaterTile) {
        if (!this.model.isMoving()) {
          this.jumpRandom(world, pathFinder);
        }
        return;
      }
      this.resourceFound = true;
      this.model.jumpTo(closestWaterTile, world, pathFinder).catch(e => {
        console.log(e);
        console.error("couldn't find closest water tile for grid", grid.x, grid.y);
        debugBox(world, grid.x, grid.y, 0x0000ff);
      });
    } else if (this.action === Bunny.Actions.searchFood && !this.resourceFound) {
      const grid = world.toGrid(this.model.position.x, this.model.position.z);
      const availableFood = world.getAvailableFood(grid.x, grid.y, this.rangeOfSight);
      if (availableFood.length === 0 || !availableFood[0]) {
        if (!this.model.isMoving()) {
          this.jumpRandom(world, pathFinder);
        }
        return;
      }
      this.resourceFound = true;
      this.model.jumpTo(availableFood[0].tile, world, pathFinder).catch(e => {
        console.log(e);
        console.error("couldn't find closest food tile for grid", grid.x, grid.y);
        debugBox(world, grid.x, grid.y, 0xff0000);
        debugBox(world, availableFood.x, availableFood.y, 0xffff00);
        debugLine(world, grid.x, grid.y, availableFood.x, availableFood.y, 10, 0xff0000);
      });
    } else if (this.action === Bunny.Actions.idle && !this.model.isMoving() && Math.random() < .75) {
      this.jumpRandom(world, pathFinder);
    }
  }

  jumpRandom(world, pathFinder) {
    const offset = new THREE.Vector2(getRandomInt(-this.rangeOfSight, this.rangeOfSight), getRandomInt(-this.rangeOfSight, this.rangeOfSight));
    const pos = world.toGrid(this.model.position.x, this.model.position.z);
    this.model.jumpToIgnore(pos.add(offset), world, pathFinder);
  }

  isDead() {
    return this.dead !== null;
  }

  die(causeOfDeath) {
    this.dead = {
      causeOfDeath: causeOfDeath
    };
    this.model.die();
    return true;
  }

}
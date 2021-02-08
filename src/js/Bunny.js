import * as THREE from 'three';
import {debugBox, debugLine, DIAGONAL_DISTANCE, getClosestNeighborTile, getRandomInt} from "./util/util";
import {Bunny3D} from "./Bunny3D";

export class Bunny {

  static Traits = ["speed", "rangeOfSight", "lifespan"];

  static i = 0;

  static Actions = Object.freeze({
    idle: Symbol("idle"),
    sleep: Symbol("sleep"),
    drink: Symbol("drink"),
    eat: Symbol("eat"),
    searchFood: Symbol("search food"),
    searchWater: Symbol("search water"),
    searchMate: Symbol("search mate"),
    mate: Symbol("mate")
  });

  static getDefaultTraits() {
    return {
      speed: 40,
      sex: Math.random() > .5,
      rangeOfSight: 5.0,
      lifespan: getRandomInt(2500, 3500)
    }
  }

  constructor(traits, generation = 0) {
    this.traits = traits ? traits : Bunny.getDefaultTraits();

    // state
    this.exhaustion = 0.0;
    this.thirst = 0.0;
    this.hunger = 0.0;
    this.reproductionUrge = 0.0;
    this.pregnancy = null;

    // meta
    this.name = "bunny #" + ++Bunny.i;
    this.age = 0;
    this.generation = generation;
    this.adultAge = this.traits.lifespan / 10;

    // general
    this.action = Bunny.Actions.idle;
    this.model = new Bunny3D(this);
    this.resourceFound = null; // used if food is found, water is found or mate is found
    this.dead = null;
    this.deadTicks = 0;
    this.lastPartner = null;
    this.region = null;
  }

  tick(world) {
    if (this.update(world)) {
      return;
    }
    const newAction = this.think();
    if (newAction !== this.action) {
      this.resourceFound = null;
      this.action = newAction;
    }
    this.act(world);
  }

  update(world) {
    if (this.isDead()) {
      this.deadTicks++;
      if (this.deadTicks >= 100) {
        world.removeAnimal(this);
      }
      return true;
    }
    this.age++;
    this.thirst += .01;
    this.hunger += .005;
    this.exhaustion += .002;
    if (this.pregnancy !== null) {
      this.pregnancy += .01;
    } else if (this.isAdult()) {
      this.reproductionUrge += .003;
    }

    if (this.action === Bunny.Actions.searchWater) {
      const tile = this.getCurrentTile(world);
      if (world.hasWater(tile.x, tile.y)) {
        this.action = Bunny.Actions.drink;
      }
    } else if ((this.action === Bunny.Actions.searchFood || this.action === Bunny.Actions.eat) && this.resourceFound) {
      const tile = this.getCurrentTile(world);
      if (tile.equals(this.resourceFound.tile)) {
        this.action = Bunny.Actions.eat;
      }
    } else if (this.action === Bunny.Actions.searchMate && this.resourceFound) {
      const tile = this.getCurrentTile(world);
      const mateTile = this.lastPartner.getCurrentTile(world);
      if (tile.distanceTo(mateTile) <= DIAGONAL_DISTANCE) {
        this.action = Bunny.Actions.mate;
      }
    }

    if (this.action === Bunny.Actions.sleep) {
      this.exhaustion -= .02;
      this.thirst -= .005;
      this.hunger -= .0025;
    } else if (this.action === Bunny.Actions.drink) {
      this.thirst -= .1;
    } else if (this.action === Bunny.Actions.eat) {
      if (this.resourceFound.value >= .1) {
        this.hunger -= .1;
        this.resourceFound.value -= .1;
      } else {
        this.resourceFound = null;
        this.action = Bunny.Actions.searchFood;
      }
    } else if (this.action === Bunny.Actions.mate) {
      this.reproductionUrge -= .1;
      if (this.reproductionUrge <= 0) {
        this.reproductionUrge = 0;
        if (!this.traits.sex) {
          this.pregnancy = 0.0;
        }
      }
    }

    this.thirst = this.thirst <= 0 ? 0 : this.thirst;
    this.exhaustion = this.exhaustion <= 0 ? 0 : this.exhaustion;
    this.hunger = this.hunger <= 0 ? 0 : this.hunger;

    // stuff to die from
    if (this.thirst > 1) {
      return this.die("thirst");
    } else if (this.exhaustion > 1) {
      return this.die("exhaustion");
    } else if (this.hunger > 1) {
      return this.die("hunger");
    } else if (this.age >= this.traits.lifespan) {
      return this.die("age");
    }

    // reproduction
    if (this.reproductionUrge >= 1) {
      this.reproductionUrge = 1;
    }
    if (this.pregnancy >= 1) {
      this.pregnancy = null;
      const babies = this.giveBirth();
      world.spawnBabies(babies, this);
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
      (this.action === Bunny.Actions.sleep && this.exhaustion > 0) ||
      (this.action === Bunny.Actions.mate && this.reproductionUrge > 0);

    const needs = [];
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
    if ((!busy && this.exhaustion > .7) || this.exhaustion > .99) {
      needs.push({
        action: Bunny.Actions.sleep, importance: this.exhaustion
      });
    }
    if (!busy && this.reproductionUrge >= 1) {
      needs.push({
        action: Bunny.Actions.searchMate, importance: (this.reproductionUrge / 3)
      });
    }
    if (needs.length === 0) {
      return busy ? this.action : Bunny.Actions.idle;
    } else {
      const resultingNeed = needs.reduce((need, nextNeed) => (nextNeed.importance > need.importance ? nextNeed : need), needs[0]);
      return resultingNeed.action;
    }
  }

  act(world) {
    if (this.action === Bunny.Actions.searchWater && !this.resourceFound) {
      const tile = this.getCurrentTile(world);
      const closestWaterTile = world.getClosestWaterTile(tile.x, tile.y, this.traits.rangeOfSight);
      if (!closestWaterTile) {
        if (!this.model.isMoving()) {
          this.jumpRandom(world);
        }
        return;
      }
      this.resourceFound = closestWaterTile;
      this.model.jumpTo(closestWaterTile, world).catch(e => {
        console.log(e);
        console.error("couldn't find closest water tile for grid", tile.x, tile.y);
        debugBox(world, tile.x, tile.y, 0x0000ff);
      });
    } else if (this.action === Bunny.Actions.searchFood && !this.resourceFound) {
      const tile = this.getCurrentTile(world);
      const food = this.region.getFood(tile.x, tile.y, this.traits.rangeOfSight);
      if (food === null) {
        if (!this.model.isMoving()) {
          this.jumpRandom(world);
        }
        return;
      }
      this.resourceFound = food;
      this.model.jumpTo(food.tile, world).catch(e => {
        console.log(e);
        console.error("couldn't find closest food tile for grid", tile.x, tile.y);
        debugBox(world, tile.x, tile.y, 0xff0000);
        debugBox(world, food.x, food.y, 0xffff00);
        debugLine(world, tile.x, tile.y, food.x, food.y, 10, 0xff0000);
      });
    } else if (this.action === Bunny.Actions.searchMate && !this.resourceFound) {
      const tile = this.getCurrentTile(world);
      let mates = world.getAnimals(tile.x, tile.y, this.traits.rangeOfSight).filter(animal => {
        return animal.traits.sex !== this.traits.sex && !animal.isDead() && animal.reproductionUrge >= .5 &&
          animal.action === Bunny.Actions.searchMate && animal.resourceFound === null;
      });
      if (mates.length === 0) {
        if (!this.model.isMoving()) {
          this.jumpRandom(world);
        }
      } else {
        const mate = mates[0]; // should be good enough right?
        this.resourceFound = this.lastPartner = mate;
        mate.resourceFound = mate.lastPartner = this;
        mate.model.stop();
        const mateTile = mate.getCurrentTile(world);
        // jump to mate's neighbor tile
        const targetTile = getClosestNeighborTile(world, tile.x, tile.y, mateTile.x, mateTile.y);
        this.model.jumpTo(targetTile, world).catch(e => {
          console.log(e);
          console.error("couldn't find closest tile to mate ", mateTile.x, mateTile.y);
          debugBox(world, tile.x, tile.y, 0xff0000);
          debugBox(world, targetTile.x, targetTile.y, 0xffff00);
          debugLine(world, tile.x, tile.y, targetTile.x, targetTile.y, 10, 0xff0000);
        });
      }
    } else if (this.action === Bunny.Actions.mate && !this.model.isJumping()) {
      this.model.lookAt(this.lastPartner.model.getPosition());
      this.model.jump(10);
    } else if (this.action === Bunny.Actions.idle && !this.model.isMoving() && Math.random() < .75) {
      this.jumpRandom(world);
    }
  }

  jumpRandom(world) {
    const offset = new THREE.Vector2(
      getRandomInt(0, this.traits.rangeOfSight) * (Math.random() > .5 ? 1 : -1),
      getRandomInt(0, this.traits.rangeOfSight) * (Math.random() > .5 ? 1 : -1)
    );
    const scenePosition = this.model.getPosition();
    const tile = world.toGrid(scenePosition.x, scenePosition.z);
    this.model.jumpToIgnore(tile.add(offset), world);
  }

  isDead() {
    return this.dead !== null;
  }

  isAdult() {
    return this.age >= this.adultAge;
  }

  die(causeOfDeath) {
    this.dead = {
      causeOfDeath: causeOfDeath
    };
    this.model.die();
    return true;
  }

  giveBirth() {
    const babies = [];
    let numBabies = getRandomInt(1, 5);
    for (let i = 0; i < numBabies; i++) {
      let babyTraits = {
        sex: Math.random() > .5
      };
      Bunny.Traits.forEach(trait => {
        babyTraits[trait] = Math.random() > .5 ? this.traits[trait] : this.lastPartner.traits[trait];
      });
      babies.push(new Bunny(babyTraits, this.generation + 1));
    }
    return babies;
  }

  getCurrentTile(world) {
    const scenePosition = this.model.getPosition();
    return world.toGrid(scenePosition.x, scenePosition.z);
  }

}

import * as THREE from 'three';
import {
  DIAGONAL_DISTANCE,
  distance,
  getClosestNeighborTile,
  getRandomArbitrary,
  getRandomBoxMuller,
  getRandomInt
} from "./util/util";
import {Bunny3D} from "./Bunny3D";
import {Statistics} from "./Statistics";
import {Settings} from "./Settings";

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
      speed: getRandomInt(35, 45),
      sex: Math.random() > .5,
      rangeOfSight: parseFloat(getRandomArbitrary(4.5, 5.5)),
      lifespan: getRandomInt(2500, 3500)
    }
  }

  constructor(traits, generation = 0) {
    this.traits = traits ? traits : Bunny.getDefaultTraits();

    // state
    this.fatigue = 0.0;
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
    this.thirst += .005;
    this.hunger += .001 + this.traits.speed * .00004 + this.traits.rangeOfSight * .0005;
    this.fatigue += .002;
    if (this.pregnancy !== null) {
      this.pregnancy += .01;
    } else if (this.isAdult()) {
      this.reproductionUrge += this.traits.sex ? .1 : .003;
    }

    if (this.action === Bunny.Actions.searchWater) {
      const tile = this.getCurrentTile(world);
      if (world.hasWater(tile[0], tile[1])) {
        this.action = Bunny.Actions.drink;
      }
    } else if ((this.action === Bunny.Actions.searchFood || this.action === Bunny.Actions.eat) && this.resourceFound) {
      const tile = this.getCurrentTile(world);
      if (tile[0] === this.resourceFound.tile[0] && tile[1] === this.resourceFound.tile[1]) {
        this.action = Bunny.Actions.eat;
      }
    } else if (this.action === Bunny.Actions.searchMate && this.resourceFound) {
      const tile = this.getCurrentTile(world);
      const mateTile = this.lastPartner.getCurrentTile(world);
      if (distance(tile[0], tile[1], mateTile[0], mateTile[1]) <= DIAGONAL_DISTANCE) {
        this.action = Bunny.Actions.mate;
      }
    }

    if (this.action === Bunny.Actions.sleep) {
      this.fatigue -= .02;
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
      this.reproductionUrge -= this.traits.sex ? .2 : .103;
      if (this.reproductionUrge <= 0) {
        this.reproductionUrge = 0;
        if (!this.traits.sex) {
          this.pregnancy = 0.0;
        }
      }
    }

    this.thirst = this.thirst <= 0 ? 0 : this.thirst;
    this.fatigue = this.fatigue <= 0 ? 0 : this.fatigue;
    this.fatigue = this.fatigue >= 1 ? 1 : this.fatigue;
    this.hunger = this.hunger <= 0 ? 0 : this.hunger;

    // stuff to die from
    if (this.thirst > 1) {
      return this.die("thirst");
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
      (this.action === Bunny.Actions.sleep && this.fatigue > 0) ||
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
    if ((!busy && this.fatigue > .7) || this.fatigue > .99) {
      needs.push({
        action: Bunny.Actions.sleep, importance: this.fatigue
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
      const closestWaterTile = world.getClosestWaterTile(tile[0], tile[1], this.traits.rangeOfSight);
      if (!closestWaterTile) {
        this.jumpRandom(world);
        return;
      }
      this.resourceFound = closestWaterTile;
      this.model.jumpTo(closestWaterTile);
    } else if (this.action === Bunny.Actions.searchFood && !this.resourceFound) {
      const tile = this.getCurrentTile(world);
      const food = this.region.getFood(tile[0], tile[1], this.traits.rangeOfSight);
      if (food === null) {
        this.jumpRandom(world);
        return;
      }
      this.resourceFound = food;
      this.model.jumpTo(food.tile);
    } else if (this.action === Bunny.Actions.searchMate && !this.resourceFound) {
      // only males search actively for females. females just jump around waiting for the males to approach.
      if (!this.traits.sex) {
        this.jumpRandom(world);
        return;
      }
      // male here
      const tile = this.getCurrentTile(world);
      let femaleMatingPartner = world.getAnimals(tile[0], tile[1], this.traits.rangeOfSight).filter(animal => {
        return animal.traits.sex !== this.traits.sex && !animal.isDead() && animal.reproductionUrge >= .5 &&
          animal.action === Bunny.Actions.searchMate && animal.resourceFound === null;
      });
      if (femaleMatingPartner.length === 0) {
        this.jumpRandom(world);
      } else {
        for (let i = 0; i < femaleMatingPartner.length; i++) {
          let femaleMate = femaleMatingPartner[i];
          if (femaleMate.isValidMatingPartner(this)) {
            this.resourceFound = this.lastPartner = femaleMate;
            femaleMate.resourceFound = femaleMate.lastPartner = this;
            femaleMate.model.stop();
            const mateTile = femaleMate.getCurrentTile(world);
            // jump to females neighbor tile
            const targetTile = getClosestNeighborTile(world, tile[0], tile[1], mateTile[0], mateTile[1]);
            this.model.jumpTo(targetTile);
            return;
          } else {
            // you've got rejected :(
            // TODO
          }
        }
      }
    } else if (this.action === Bunny.Actions.mate && !this.model.isJumping()) {
      const p = this.lastPartner.model.getPositionArray();
      this.model.lookAt(new THREE.Vector3(p[0], 0, p[1]));
      this.model.jumpN(5);
    } else if (this.action === Bunny.Actions.idle && Math.random() < .75) {
      this.jumpRandom(world);
    }
  }

  jumpRandom(world) {
    if (this.model.isMoving()) {
      return;
    }
    const offset = [
      getRandomInt(0, this.traits.rangeOfSight) * (Math.random() > .5 ? 1 : -1),
      getRandomInt(0, this.traits.rangeOfSight) * (Math.random() > .5 ? 1 : -1)
    ];
    const scenePosition = this.model.getPositionArray();
    const from = world.toGrid(scenePosition[0], scenePosition[1]);
    const to = [from[0] + offset[0], from[1] + offset[1]];
    if(world.isReachable(from, to)) {
      this.model.jumpTo(to);
    }
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
    Statistics.data["cause of death (" + causeOfDeath + ")"]++;
    return true;
  }

  isValidMatingPartner(male) {
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
        // inherit
        babyTraits[trait] = Math.random() > .5 ? this.traits[trait] : this.lastPartner.traits[trait];
        // mutate
        if (Math.random() <= Settings.genetics.mutationChance) {
          babyTraits[trait] += babyTraits[trait] * Settings.genetics.mutationAmount * ((getRandomBoxMuller() * 2) - 1);
        }
        babyTraits["lifespan"] = Math.round(babyTraits["lifespan"]);
      });
      babies.push(new Bunny(babyTraits, this.generation + 1));
    }
    return babies;
  }

  getCurrentTile(world) {
    const scenePosition = this.model.getPositionArray();
    return world.toGrid(scenePosition[0], scenePosition[1]);
  }

}

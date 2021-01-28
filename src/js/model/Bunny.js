export class Bunny {

  static Actions = Object.freeze({
    idle: Symbol("idle"),
    drink: Symbol("drink"),
    searchWater: Symbol("searchWater")
  });

  constructor() {
    this.action = Bunny.Actions.idle;
    this.exhaustion = 0.0;
    this.thirst = 0.0;
  }

  update(world) {
    this.tick();
    const newAction = this.think();
    if (newAction !== this.action) {
      this.act(world);
    }
  }

  /**
   * Happens every time
   */
  tick() {
    this.thirst += .05;
    this.exhaustion += .01;

    if (this.action === Bunny.Actions.idle) {
      this.exhaustion -= .05;
    } else if (this.action === Bunny.Actions.drink) {
      this.thirst -= .1;
    }

    this.thirst = this.thirst <= 0 ? 0 : this.thirst;
    this.exhaustion = this.exhaustion <= 0 ? 0 : this.exhaustion;

    if (this.thirst > 1) {
      this.die("thirst");
    } else if (this.exhaustion > 1) {
      this.die("exhaustion");
    }
  }

  /**
   * Bunny thinks about what's important in life!
   * Set's the new action
   */
  think() {
    // danger first - run!

    // basic needs
    const needs = [];
    needs.push({action: Bunny.Actions.idle, importance: this.exhaustion});
    needs.push({
      action: (this.action === Bunny.Actions.drink) ? Bunny.Actions.drink : Bunny.Actions.searchWater,
      importance: this.thirst
    });
    const resultingNeed = needs.reduce((need, nextNeed) => (nextNeed.importance > need.importance ? nextNeed : need), needs[0]);
    return resultingNeed.action;
  }

  act(world) {
    if(this.action === Bunny.Actions.searchWater) {

    }
  }

  die(cause) {
    // TODO
    console.log("bunny died due " + cause);
  }

}
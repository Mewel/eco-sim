import {Bunny} from "./Bunny";

const ecoButton = document.getElementById("eco-info-button");
const ecoInfo = document.getElementById("eco-info");

// stats
const tickElement = ecoInfo.querySelector(".eco-tick");

const nameElement = ecoInfo.querySelector(".eco-name");
// state
const deadElement = ecoInfo.getElementsByClassName("eco-animal-dead")[0];
const actionElement = ecoInfo.getElementsByClassName("eco-animal-action")[0];
const exhaustionProgressElement = ecoInfo.getElementsByClassName("eco-animal-exhaustion")[0].getElementsByClassName("eco-progress-bar")[0];
const thirstProgressElement = ecoInfo.getElementsByClassName("eco-animal-thirst")[0].getElementsByClassName("eco-progress-bar")[0];
const hungerProgressElement = ecoInfo.getElementsByClassName("eco-animal-hunger")[0].getElementsByClassName("eco-progress-bar")[0];
const reproductionUrgeProgressElement = ecoInfo.getElementsByClassName("eco-animal-reproductionUrge")[0].getElementsByClassName("eco-progress-bar")[0];
const pregnancyProgressElement = ecoInfo.getElementsByClassName("eco-animal-pregnancy")[0].getElementsByClassName("eco-progress-bar")[0];
const pregnancyElement = ecoInfo.getElementsByClassName("eco-animal-pregnancy")[0];

// traits
const sexTraitValue = ecoInfo.querySelector(".eco-animal-sex > .eco-property-value");
const ageTraitValue = ecoInfo.querySelector(".eco-animal-age > .eco-property-value");
const speedTraitValue = ecoInfo.querySelector(".eco-animal-speed > .eco-property-value");
const rangeOfSightValue = ecoInfo.querySelector(".eco-animal-sight > .eco-property-value");

ecoButton.onclick = () => {
  EcoInfo.toggle();
}

ecoInfo.querySelectorAll(".eco-info-tab").forEach(tab => {
  tab.onclick = () => {
    EcoInfo.showTab(tab.dataset.target);
  }
});

const EcoInfo = {

  isOpen() {
    return !(ecoInfo.style.display !== "flex");
  },

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.show();
    }
  },

  show() {
    ecoButton.textContent = "x";
    ecoButton.style.bottom = "207px";
    ecoButton.style.lineHeight = "26px";
    ecoInfo.style.display = "flex";
  },

  close() {
    ecoButton.textContent = "i";
    ecoButton.style.bottom = "20px";
    ecoButton.style.lineHeight = "30px";
    ecoInfo.style.display = "none";
  },

  showTab(target) {
    ecoInfo.querySelectorAll(".eco-info-tab").forEach(tab => tab.style.background = "#333");
    ecoInfo.querySelector(".eco-info-tab[data-target='" + target + "']").style.background = "#000";

    ecoInfo.querySelectorAll(".eco-info-tab-content").forEach(tabContent => tabContent.style.display = "none");
    ecoInfo.querySelector(target).style.display = "flex";
  },

  update(stats) {
    this.updateStats(stats);
    if (this.isAnimalAssigned()) {
      this.updateAnimal();
    }
  },

  updateStats(stats) {
    tickElement.textContent = "Tick: " + stats.tick;
  },

  updateAnimal() {
    let dead = this.animal.isDead();
    deadElement.style.display = dead ? "block" : "none";
    if (dead) {
      deadElement.textContent = "died because of " + this.animal.dead.causeOfDeath;
    }
    actionElement.textContent = this.animal.action.description;
    if (this.animal.action === Bunny.Actions.searchFood) {
      actionElement.textContent = this.animal.resourceFound ? "food found" : "search food";
    } else if (this.animal.action === Bunny.Actions.searchWater) {
      actionElement.textContent = this.animal.resourceFound ? "water found" : "search water";
    }
    thirstProgressElement.style.width = (this.animal.thirst * 100) + "%";
    hungerProgressElement.style.width = (this.animal.hunger * 100) + "%";
    exhaustionProgressElement.style.width = (this.animal.exhaustion * 100) + "%";
    reproductionUrgeProgressElement.style.width = (this.animal.reproductionUrge * 100) + "%";
    pregnancyProgressElement.style.width = (this.animal.pregnancy ? (this.animal.pregnancy * 100) : 0) + "%";
    // traits
    ageTraitValue.textContent = this.animal.age + " / " + this.animal.traits.lifespan;
  },

  assignAnimal(animal) {
    this.unassignAnimal();
    this.animal = animal;

    // update single elements
    nameElement.textContent = this.animal.name + " (" + this.animal.generation + ". generation)";
    pregnancyElement.style.display = animal.traits.sex ? "none" : "block";
    sexTraitValue.textContent = animal.traits.sex ? "male" : "female";
    speedTraitValue.textContent = animal.traits.speed;
    rangeOfSightValue.textContent = animal.traits.rangeOfSight;
  },

  unassignAnimal() {
    this.bunny = null;
  },

  isAnimalAssigned() {
    return this.animal !== undefined && this.animal !== null;
  }

}

export {EcoInfo}
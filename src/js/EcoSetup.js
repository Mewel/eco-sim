import {Settings} from "./Settings";

const overlay = document.getElementById("eco-setup-backdrop");
const ecoSetupContainer = document.getElementById("eco-setup-container");
const ecoSetup = document.getElementById("eco-setup");

const startButton = document.getElementById("eco-setup-start-button");
const minimizeButton = document.getElementById("eco-setup-minimize");
const maximizeButton = document.getElementById("eco-setup-maximize");

startButton.onclick = () => {
  EcoSetup.start();
}

ecoSetup.querySelectorAll(".eco-setup-tab").forEach(tab => {
  tab.onclick = () => {
    EcoSetup.showTab(tab.dataset.target);
  }
});

minimizeButton.onclick = () => {
  EcoSetup.minimize();
}

maximizeButton.onclick = () => {
  EcoSetup.maximize();
}


const EcoSetup = {

  started: false,

  resolveAwaiters: [],

  controller: [],

  init() {
    document.querySelectorAll(".eco-setup-row-input").forEach((row) => {
      this.controller.push(new NumberController(row));
    });
  },

  start() {
    overlay.parentNode.removeChild(overlay);
    ecoSetupContainer.parentNode.removeChild(ecoSetupContainer);
    setTimeout(() => {
      this.resolveAwaiters.forEach(resolve => resolve());
    }, 1);
  },

  onStart() {
    const scope = this;
    return new Promise((resolve) => {
      if (scope.started) {
        resolve();
      } else {
        scope.resolveAwaiters.push(resolve);
      }
    });
  },

  showTab(target) {
    ecoSetup.querySelectorAll(".eco-setup-tab").forEach(tab => tab.style.background = "#333");
    ecoSetup.querySelector(".eco-setup-tab[data-target='" + target + "']").style.background = "#000";

    ecoSetup.querySelectorAll(".eco-setup-tab-content").forEach(tabContent => tabContent.style.display = "none");
    ecoSetup.querySelector(target).style.display = "flex";
  },

  minimize() {
    overlay.style.opacity = 0;
    ecoSetup.style.display = "none";
    maximizeButton.style.display = "block";
  },

  maximize() {
    overlay.style.opacity = .2;
    ecoSetup.style.display = "flex";
    maximizeButton.style.display = "none";
  }

}

class NumberController {

  constructor(parent) {
    this.min = parseInt(parent.dataset.min);
    this.max = parseInt(parent.dataset.max);
    this.type = parent.dataset.type;
    this.target = parent.dataset.target;
    this.resolveBinding();

    this.inputElement = document.createElement("input");
    this.inputElement.type = "text";
    this.inputElement.classList.add("eco-setup-row-input-text");
    this.sliderElement = document.createElement("div");
    this.sliderElement.classList.add("eco-setup-row-input-slider");
    this.sliderProgressElement = document.createElement("div");
    this.sliderProgressElement.classList.add("eco-setup-row-input-slider-progress");
    this.sliderElement.appendChild(this.sliderProgressElement);
    parent.appendChild(this.inputElement);
    parent.appendChild(this.sliderElement);
    this.updateText();
    this.updateSlider();

    this.inputElement.onchange = (e) => {
      try {
        const value = parseInt(e.target.value);
        this.change(value);
      } catch (ignore) {
      }
    }

    this.sliderElement.onmousedown = (e) => {
      this.onMouse(e);
    }

    this.sliderElement.onmousemove = (e) => {
      if (e.buttons === 1) {
        this.onMouse(e);
      }
    }

    return this;
  }

  resolveBinding() {
    const paths = this.target.split(".");
    this.object = Settings;
    for (let i = 0; i < paths.length - 1; i++) {
      this.object = this.object[paths[i]];
    }
    this.objectKey = paths[paths.length - 1];
  }

  updateText() {
    const value = this.getValue();
    this.inputElement.value = (this.type === "percentage" ? value * 100 : value).toFixed(0);
  }

  updateSlider() {
    const value = this.type === "percentage" ? this.getValue() * 100 : this.getValue();
    const progress = (value - this.min) / (this.max - this.min);
    this.sliderProgressElement.style.width = (progress * 100) + "%";
  }

  change(value) {
    if (value > this.max || value < this.min) {
      value = Math.max(Math.min(value, this.max), this.min)
    }
    if (value === this.value) {
      return;
    }
    this.object[this.objectKey] = this.type === "percentage" ? value / 100 : value;
    this.updateText();
    this.updateSlider();
    localStorage.setItem("eco." + this.target, this.getStringValue());
  }

  onMouse(e) {
    const progress = e.offsetX / this.sliderElement.offsetWidth;
    this.change(Math.round((this.max - this.min) * progress) + this.min);
  }

  getValue() {
    return this.object[this.objectKey];
  }

  getStringValue() {
    return this.getValue().toFixed(this.type === "percentage" ? 2 : 0);
  }

}

EcoSetup.init();

export {EcoSetup}

import Chart from 'chart.js';
import {AnimalHandler} from "./AnimalHandler";

export class ChartController {

  constructor(startingSet = "bunnies (sum)") {
    this.data = {
      "bunnies (sum)": {
        data: [],
        color: "#ffffff"
      },
      "male bunnies (sum)": {
        data: [],
        color: "#7699ec"
      },
      "female bunnies (sum)": {
        data: [],
        color: "#ffa2e8"
      },
      "kids (sum)": {
        data: [],
        color: "#a7ffab"
      }
    };
    let dataSet1 = document.getElementById("chartDataSet1");
    let dataSet2 = document.getElementById("chartDataSet2");
    ChartController.#addOption(dataSet1, dataSet2, "none");
    for (let key of Object.keys(this.data)) {
      ChartController.#addOption(dataSet1, dataSet2, key);
    }
    this.chart = new Chart(document.getElementById("chart").getContext("2d"), this.getChartConfig());
    this.select(startingSet, 0);

    dataSet1.value = startingSet;
    dataSet1.onchange = (e) => {
      this.select(e.target.value, 0);
    }
    dataSet2.onchange = (e) => {
      this.select(e.target.value, 1);
    }
    document.getElementById("chartDataUpdateFrequency").onchange = (e) => {
      this.updateFrequency = parseInt(e.target.value);
    }
    this.updateFrequency = 100;
  }

  static #addOption(dataSet1, dataSet2, key) {
    let option = document.createElement("option");
    option.textContent = key;
    option.value = key;
    dataSet1.append(option.cloneNode(true));
    dataSet2.append(option.cloneNode(true));
  }

  track(tick) {
    if (tick % this.updateFrequency === 0) {
      this.data["bunnies (sum)"].data.push(AnimalHandler.maleBunniesMesh.count + AnimalHandler.femaleBunniesMesh.count);
      this.data["male bunnies (sum)"].data.push(AnimalHandler.maleBunniesMesh.count);
      this.data["female bunnies (sum)"].data.push(AnimalHandler.femaleBunniesMesh.count);
      this.data["kids (sum)"].data.push([].concat(AnimalHandler.maleBunnies).concat(AnimalHandler.femaleBunnies).filter((model) => {
        return !model.bunny.isAdult();
      }).length);
      this.chart.data.labels.push(tick);
      this.chart.update();
    }
  }

  select(name, dataSet) {
    const data = this.data[name];
    this.chart.data.datasets[dataSet].data = data ? data.data : [];
    this.chart.data.datasets[dataSet].borderColor = data ? data.color : null;
    this.chart.update();
  }

  getChartConfig() {
    return {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          backgroundColor: "#000000",
          data: [],
          fill: false,
        }, {
          backgroundColor: "#000000",
          data: [],
          fill: false,
        }]
      },
      options: {
        responsive: false,
        legend: {
          display: false
        },
        animation: {
          duration: 0
        },
        responsiveAnimationDuration: 0,
        elements: {
          line: {
            tension: 0
          }
        }
      }
    };
  }

}

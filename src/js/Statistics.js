import Chart from 'chart.js';
import {AnimalHandler} from "./AnimalHandler";

const Collection = {
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
  },
  "speed (avg)": {
    data: [],
    color: "#2cf9fc"
  },
  "range of sight (avg)": {
    data: [],
    color: "#fffd5a"
  },
  "cause of death (thirst)": {
    data: [],
    color: "#0016c1"
  },
  "cause of death (hunger)": {
    data: [],
    color: "#ec0000"
  },
  "cause of death (age)": {
    data: [],
    color: "#08ab00"
  }
}

function addOption(dataSet1, dataSet2, key) {
  let option = document.createElement("option");
  option.textContent = key;
  option.value = key;
  dataSet1.append(option.cloneNode(true));
  dataSet2.append(option.cloneNode(true));
}

const Statistics = {

  init() {
    this.data = {
      "cause of death (thirst)": 0,
      "cause of death (hunger)": 0,
      "cause of death (age)": 0
    }
    let dataSet1 = document.getElementById("chartDataSet1");
    let dataSet2 = document.getElementById("chartDataSet2");
    addOption(dataSet1, dataSet2, "none");
    for (let key of Object.keys(Collection)) {
      addOption(dataSet1, dataSet2, key);
    }
    this.chart = new Chart(document.getElementById("chart").getContext("2d"), this.getChartConfig());

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
  },

  track(tick) {
    if (tick % this.updateFrequency === 0) {
      const bunniesArray = [].concat(AnimalHandler.maleBunnies).concat(AnimalHandler.femaleBunnies).map(model => model.bunny);

      Collection["bunnies (sum)"].data.push(AnimalHandler.maleBunniesMesh.count + AnimalHandler.femaleBunniesMesh.count);
      Collection["male bunnies (sum)"].data.push(AnimalHandler.maleBunniesMesh.count);
      Collection["female bunnies (sum)"].data.push(AnimalHandler.femaleBunniesMesh.count);
      Collection["kids (sum)"].data.push(bunniesArray.filter((bunny) => {
        return !bunny.isAdult();
      }).length);
      Collection["speed (avg)"].data.push(bunniesArray.reduce((sum, bunny) => {
        return sum + bunny.traits.speed;
      }, 0) / bunniesArray.length);
      Collection["range of sight (avg)"].data.push(bunniesArray.reduce((sum, bunny) => {
        return sum + bunny.traits.rangeOfSight;
      }, 0) / bunniesArray.length);
      Object.keys(this.data).forEach(key => {
        Collection[key].data.push(this.data[key]);
      });
      this.chart.data.labels.push(tick);
      this.chart.update();
    }
  },

  select(name, dataSet) {
    const data = Collection[name];
    this.chart.data.datasets[dataSet].data = data ? data.data : [];
    this.chart.data.datasets[dataSet].borderColor = data ? data.color : null;
    this.chart.update();
  },

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

export {Statistics}

import {deepProxy} from "./util/util";

const InternalSettings = {
  speed: 1,
  audio: localStorageWithDefault("eco.audio", "boolean", true),
  genetics: {
    mutationChance: localStorageWithDefault("eco.genetics.mutationChance", "float", .3),
    mutationAmount: localStorageWithDefault("eco.genetics.mutationAmount", "float", .2)
  },
  world: {
    tiles: localStorageWithDefault("eco.world.tiles", "int", 100),
    tileSize: 20,
    waterLandRatio: localStorageWithDefault("eco.world.waterLandRatio", "float", .5),
    disruption: localStorageWithDefault("eco.world.disruption", "float", .5),
    treeDensity: localStorageWithDefault("eco.world.treeDensity", "float", .15),
    foodDensity: localStorageWithDefault("eco.world.foodDensity", "float", .15),
    bunnies: localStorageWithDefault("eco.world.bunnies", "int", 50)
  },
  onChange: []
}
dwwwwwww
function localStorageWithDefault(key, type, defaultValue) {
  const result = localStorage.getItem(key) ?? defaultValue;
  if (type === "float" || type === "int") {
    return type === "float" ? parseFloat(result) : parseInt(result);
  } else if (type === "boolean") {
    return result === "true";
  }
  return defaultValue;
}

const Settings = deepProxy(InternalSettings, {
  set: function (target, keyArray, value, receiver) {
    Settings.onChange.forEach(cb => cb(keyArray.join("."), value));
  }
});

export {Settings};

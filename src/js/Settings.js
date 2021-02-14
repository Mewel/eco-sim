const InternalSettings = {
  speed: 1,
  audio: localStorageWithDefault("eco.audio", "boolean", true),
  genetics: {
    mutationChance: localStorageWithDefault("eco.genetics.mutationChance", "float", .25),
    mutationAmount: localStorageWithDefault("eco.genetics.mutationAmount", "float", .1)
  },
  world: {
    tiles: localStorageWithDefault("eco.world.tiles", "int", 200),
    tileSize: 20,
    waterLandRatio: localStorageWithDefault("eco.world.waterLandRatio", "float", .5),
    treeDensity: localStorageWithDefault("eco.world.treeDensity", "float", .1),
    foodDensity: localStorageWithDefault("eco.world.foodDensity", "float", .1),
    bunnies: localStorageWithDefault("eco.world.bunnies", "int", 100)
  },
  onChange: []
}

function localStorageWithDefault(key, type, defaultValue) {
  const result = localStorage.getItem(key) ?? defaultValue;
  if (type === "float" || type === "int") {
    return type === "float" ? parseFloat(result) : parseInt(result);
  } else if (type === "boolean") {
    return result === "true";
  }
  return defaultValue;
}

const Settings = new Proxy(InternalSettings, {
  set: function (target, key, value) {
    if (target[key] !== value) {
      const oldVal = target[key];
      target[key] = value;
      target.onChange.forEach(cb => cb(key, value, oldVal));
    }
    return true;
  }
});

export {Settings};

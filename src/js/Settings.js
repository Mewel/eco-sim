const InternalSettings = {
  speed: 1,
  onChange: []
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

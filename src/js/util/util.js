import * as THREE from "three";

const GRID_OFFSET = [-1, 0, 1, 0, 0, 1, 0, -1, 1, 1, -1, -1, 1, -1, -1, 1];
const DIAGONAL_DISTANCE = Math.sqrt(2) + 0.01;

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
 *
 * @return {number|*}
 */
function getRandomBoxMuller() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return getRandomBoxMuller(); // resample between 0 and 1
  return num;
}

function getMax(arr) {
  let len = arr.length;
  let max = -Infinity;
  while (len--) {
    max = arr[len] > max ? arr[len] : max;
  }
  return max;
}

function getMin(arr) {
  let len = arr.length;
  let min = Infinity;
  while (len--) {
    min = arr[len] < min ? arr[len] : min;
  }
  return min;
}

function debugBox(world, gridX, gridZ, color) {
  let mesh = new THREE.Mesh(new THREE.BoxGeometry(5, 50, 5), new THREE.MeshBasicMaterial({color: color}));
  const pos = world.toScene(gridX, gridZ);
  mesh.position.set(pos[0], 0, pos[1]);
  world.worldGroup.add(mesh);
}

function debugLine(world, fromGridX, fromGridZ, toGridX, toGridZ, y, color) {
  const from = world.toScene(fromGridX, fromGridZ);
  const to = world.toScene(toGridX, toGridZ);
  const geometry = new THREE.BufferGeometry()
    .setFromPoints([new THREE.Vector3(from[0], y, from[1]), new THREE.Vector3(to[0], y, to[1])]);
  let line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: color}));
  world.worldGroup.add(line);
}

function getClosestNeighborTile(world, fromX, fromZ, targetX, targetZ) {
  const region = world.getRegion(fromX, fromZ);
  const from = [fromX, fromZ];
  let closestTile = null;
  let closestDistance = Number.MAX_VALUE;
  for (let i = 0; i < GRID_OFFSET.length; i += 2) {
    const v = [targetX + GRID_OFFSET[i], targetZ + GRID_OFFSET[i + 1]];
    if (region.isPartOf(v[0], v[1])) {
      const d = distance(from[0], from[1], v[0], v[1]);
      if (d < closestDistance) {
        closestTile = v;
        closestDistance = d;
      }
    }
  }
  if (closestTile === null) {
    debugBox(world, fromX, fromZ, 0xff0000);
    debugBox(world, targetX, targetZ, 0x0000ff);
    console.error("no closest tile for ", fromX, fromZ, targetX, targetZ);
  }
  return closestTile;
}

/**
 * https://stackoverflow.com/questions/43177855/how-to-create-a-deep-proxy?answertab=active#tab-top
 */
function deepProxy(target, handler) {
  const preproxy = new WeakMap();

  function makeHandler(path) {
    return {
      set(target, key, value, receiver) {
        if (typeof value === 'object') {
          value = proxify(value, [...path, key]);
        }
        target[key] = value;

        if (handler.set) {
          handler.set(target, [...path, key], value, receiver);
        }
        return true;
      },

      deleteProperty(target, key) {
        if (Reflect.has(target, key)) {
          unproxy(target, key);
          let deleted = Reflect.deleteProperty(target, key);
          if (deleted && handler.deleteProperty) {
            handler.deleteProperty(target, [...path, key]);
          }
          return deleted;
        }
        return false;
      }
    }
  }

  function unproxy(obj, key) {
    if (preproxy.has(obj[key])) {
      // console.log('unproxy',key);
      obj[key] = preproxy.get(obj[key]);
      preproxy.delete(obj[key]);
    }

    for (let k of Object.keys(obj[key])) {
      if (typeof obj[key][k] === 'object') {
        unproxy(obj[key], k);
      }
    }

  }

  function proxify(obj, path) {
    for (let key of Object.keys(obj)) {
      if (typeof obj[key] === 'object') {
        obj[key] = proxify(obj[key], [...path, key]);
      }
    }
    let p = new Proxy(obj, makeHandler(path));
    preproxy.set(p, obj);
    return p;
  }

  return proxify(target, []);
}

/**
 * Easy distance method. No need to create expensive Vector2 instance!
 */
function distance(fromX, fromZ, toX, toZ) {
  const dx = fromX - toX, dy = fromZ - toZ;
  return Math.sqrt(dx * dx + dy * dy)
}

export {
  GRID_OFFSET,
  DIAGONAL_DISTANCE,
  getRandomArbitrary,
  getRandomInt,
  getRandomBoxMuller,
  getMax,
  getMin,
  debugBox,
  debugLine,
  getClosestNeighborTile,
  deepProxy,
  distance
}

import * as THREE from "three";

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
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

function radialSearch(from, scope, checkFunction) {
  let found = null;
  let offset = 1;
  let side = [1, -1]
  while (found === null) {
    let minDistance = Number.MAX_VALUE;
    // x-side
    for (let y = 0; y < side.length && minDistance !== 1; y++) {
      for (let x = -offset; x <= offset && minDistance !== 1; x++) {
        let target = new THREE.Vector2(from.x + x, from.y + (side[y] * offset));
        [minDistance, found] = checkFunction(scope, target, from, minDistance, found);
      }
    }
    // y-side
    for (let x = 0; x < side.length && minDistance !== 1; x++) {
      for (let y = -offset + 1; y < offset && minDistance !== 1; y++) {
        let target = new THREE.Vector2(from.x + side[x] * offset, from.y);
        [minDistance, found] = checkFunction(scope, target, from, minDistance, found);
      }
    }
    offset++;
  }
  return found;
}

export {getRandomArbitrary, getRandomInt, getMax, getMin, radialSearch}

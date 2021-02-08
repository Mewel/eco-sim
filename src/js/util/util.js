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
        let target = new THREE.Vector2(from.x + side[x] * offset, from.y + y);
        [minDistance, found] = checkFunction(scope, target, from, minDistance, found);
      }
    }
    offset++;
  }
  return found;
}

function debugBox(world, gridX, gridZ, color) {
  let mesh = new THREE.Mesh(new THREE.BoxGeometry(5, 50, 5), new THREE.MeshBasicMaterial({color: color}));
  mesh.position.copy(world.toScene(gridX, gridZ));
  world.worldGroup.add(mesh);
}

function debugLine(world, fromGridX, fromGridZ, toGridX, toGridZ, y, color) {
  const from = world.toScene(fromGridX, fromGridZ);
  const to = world.toScene(toGridX, toGridZ);
  from.y = y;
  to.y = y;
  const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  let line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: color}));
  world.worldGroup.add(line);
}

function getClosestNeighborTile(world, fromX, fromZ, targetX, targetZ) {
  const region = world.getRegion(fromX, fromZ);
  const from = new THREE.Vector2(fromX, fromZ);
  let closestTile = null;
  let closestDistance = Number.MAX_VALUE;
  for (let i = 0; i < GRID_OFFSET.length; i += 2) {
    const v = new THREE.Vector2(targetX + GRID_OFFSET[i], targetZ + GRID_OFFSET[i + 1]);
    if (region.isPartOf(v.x, v.y)) {
      const d = from.distanceTo(v);
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

export {
  GRID_OFFSET,
  DIAGONAL_DISTANCE,
  getRandomArbitrary,
  getRandomInt,
  getMax,
  getMin,
  radialSearch,
  debugBox,
  debugLine,
  getClosestNeighborTile
}

// Engine adapter. If window.planck is present, use Planck.js; else use local fallback.
import { LocalWorld } from "./local-physics.js";

export function createEngine() {
  if (typeof window.planck !== "undefined") {
    return createPlanckAdapter(window.planck);
  }
  return new LocalWorld();
}

function createPlanckAdapter(pl) {
  const SCALE = 50; // px per meter
  const world = new pl.World({ gravity: pl.Vec2(0, 9.8) });
  const ramps = [];
  let egg = null;

  function addRamp(x1,y1,x2,y2) {
    const body = world.createBody();
    const a = pl.Vec2(x1/SCALE, y1/SCALE);
    const b = pl.Vec2(x2/SCALE, y2/SCALE);
    body.createFixture(pl.Edge(a,b), { friction: 0.6, restitution: 0.1 });
    ramps.push({x1,y1,x2,y2,_body: body});
    return ramps[ramps.length-1];
  }
  function spawnEgg() {
    const body = world.createDynamicBody(pl.Vec2(80/SCALE, 80/SCALE));
    body.createFixture(pl.Circle(16/SCALE), { density: 1.0, friction: 0.4, restitution: 0.25 });
    egg = body;
  }
  function resetEgg() { egg = null; }
  function step(dt) { world.step(dt); }
  function snapshot() {
    return {
      ramps,
      egg: egg ? { x: egg.getPosition().x*SCALE, y: egg.getPosition().y*SCALE, r: 16 } : null
    };
  }
  return { addRamp, spawnEgg, resetEgg, step, snapshot, using: "planck" };
}

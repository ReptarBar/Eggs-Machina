// Local physics fallback: ramps as line segments, egg as a circle
const GRAVITY = 1200; // px/s^2
const FRICTION = 0.995;
const RESTITUTION = 0.25;

export class LocalWorld {
  constructor() {
    this.ramps = []; // {x1,y1,x2,y2}
    this.egg = null; // {x,y,vx,vy,r}
    this.staticObjects = []; // {type, x, y, width, height, id, angle, active}
  }
  addRamp(x1,y1,x2,y2) {
    const ramp = { x1,y1,x2,y2 };
    this.ramps.push(ramp);
    return ramp;
  }
  spawnEgg() { if (!this.egg) this.egg = { x: 80, y: 80, vx: 0, vy: 0, r: 16 }; }
  resetEgg() { this.egg = null; }
  step(dt, w=1280, h=720) {
    const egg = this.egg; if (!egg) return;
    egg.vy += GRAVITY * dt;
    egg.x += egg.vx * dt; egg.y += egg.vy * dt;
    if (egg.y + egg.r > h) { egg.y = h - egg.r; egg.vy = -egg.vy * RESTITUTION; egg.vx *= FRICTION; }
    if (egg.x - egg.r < 0) { egg.x = egg.r; egg.vx = -egg.vx * RESTITUTION; }
    if (egg.x + egg.r > w) { egg.x = w - egg.r; egg.vx = -egg.vx * RESTITUTION; }
    
    // Handle ramp collisions
    for (const r of this.ramps) {
      const vx = r.x2 - r.x1, vy = r.y2 - r.y1;
      const wx = egg.x - r.x1, wy = egg.y - r.y1;
      const len2 = vx*vx + vy*vy; if (!len2) continue;
      let t = (wx*vx + wy*vy)/len2; t = Math.max(0, Math.min(1, t));
      const px = r.x1 + t*vx, py = r.y1 + t*vy;
      const dx = egg.x - px, dy = egg.y - py;
      const rr = egg.r + 3; const dist2 = dx*dx + dy*dy;
      if (dist2 <= rr*rr) {
        const dist = Math.max(1e-4, Math.sqrt(dist2));
        const nx = dx/dist, ny = dy/dist;
        const overlap = rr - dist;
        egg.x += nx*overlap; egg.y += ny*overlap;
        const vn = egg.vx*nx + egg.vy*ny;
        egg.vx -= (1+RESTITUTION)*vn*nx;
        egg.vy -= (1+RESTITUTION)*vn*ny;
        egg.vx *= FRICTION; egg.vy *= FRICTION;
      }
    }
    
    // Handle static object collisions
    if (this.staticObjects && this.staticObjects.length > 0) {
      for (const obj of this.staticObjects) {
        this.handleStaticObjectCollision(egg, obj, dt);
      }
    }
  }
  
  handleStaticObjectCollision(egg, obj, dt) {
    const left = obj.x;
    const right = obj.x + obj.width;
    const top = obj.y;
    const bottom = obj.y + obj.height;
    
    // Check if egg is colliding with object using proper AABB collision
    const eggLeft = egg.x - egg.r;
    const eggRight = egg.x + egg.r;
    const eggTop = egg.y - egg.r;
    const eggBottom = egg.y + egg.r;
    
    if (eggRight > left && eggLeft < right && eggBottom > top && eggTop < bottom) {
      // Calculate collision response based on object type
      switch(obj.type) {
        case 'wall':
        case 'block':
          this.handleWallCollision(egg, obj);
          break;
        case 'platform':
          this.handlePlatformCollision(egg, obj);
          break;
        case 'spring':
          this.handleSpringCollision(egg, obj);
          break;
        case 'fan':
          this.handleFanCollision(egg, obj, dt);
          break;
        case 'pendulum':
          this.handlePendulumCollision(egg, obj, dt);
          break;
        case 'motor':
          this.handleMotorCollision(egg, obj, dt);
          break;
        case 'tiltable':
          this.handleTiltableCollision(egg, obj);
          break;
      }
    }
  }
  
  handleWallCollision(egg, obj) {
    const left = obj.x;
    const right = obj.x + obj.width;
    const top = obj.y;
    const bottom = obj.y + obj.height;
    
    // Calculate penetration depths
    const penetrationLeft = (egg.x + egg.r) - left;
    const penetrationRight = right - (egg.x - egg.r);
    const penetrationTop = (egg.y + egg.r) - top;
    const penetrationBottom = bottom - (egg.y - egg.r);
    
    // Find minimum penetration (the axis to resolve collision on)
    const minPenetration = Math.min(penetrationLeft, penetrationRight, penetrationTop, penetrationBottom);
    
    if (minPenetration === penetrationLeft) {
      // Collision from left side
      egg.x = left - egg.r;
      egg.vx = -Math.abs(egg.vx) * RESTITUTION;
    } else if (minPenetration === penetrationRight) {
      // Collision from right side
      egg.x = right + egg.r;
      egg.vx = Math.abs(egg.vx) * RESTITUTION;
    } else if (minPenetration === penetrationTop) {
      // Collision from top
      egg.y = top - egg.r;
      egg.vy = -Math.abs(egg.vy) * RESTITUTION;
    } else if (minPenetration === penetrationBottom) {
      // Collision from bottom
      egg.y = bottom + egg.r;
      egg.vy = Math.abs(egg.vy) * RESTITUTION;
    }
    
    egg.vx *= FRICTION;
    egg.vy *= FRICTION;
  }
  
  handlePlatformCollision(egg, obj) {
    const left = obj.x;
    const right = obj.x + obj.width;
    const top = obj.y;
    const bottom = obj.y + obj.height;
    
    // Calculate penetration depths
    const penetrationLeft = (egg.x + egg.r) - left;
    const penetrationRight = right - (egg.x - egg.r);
    const penetrationTop = (egg.y + egg.r) - top;
    const penetrationBottom = bottom - (egg.y - egg.r);
    
    const minPenetration = Math.min(penetrationLeft, penetrationRight, penetrationTop, penetrationBottom);
    
    // Special case: if egg is falling and hitting from above, let it land
    if (minPenetration === penetrationTop && egg.vy > 0) {
      egg.y = top - egg.r;
      egg.vy = 0;
      egg.vx *= FRICTION;
    } else {
      // Otherwise treat as wall collision
      this.handleWallCollision(egg, obj);
    }
  }
  
  handleSpringCollision(egg, obj) {
    const left = obj.x;
    const right = obj.x + obj.width;
    const top = obj.y;
    const bottom = obj.y + obj.height;
    
    // Calculate penetration depths
    const penetrationLeft = (egg.x + egg.r) - left;
    const penetrationRight = right - (egg.x - egg.r);
    const penetrationTop = (egg.y + egg.r) - top;
    const penetrationBottom = bottom - (egg.y - egg.r);
    
    const minPenetration = Math.min(penetrationLeft, penetrationRight, penetrationTop, penetrationBottom);
    
    // Push egg out first
    if (minPenetration === penetrationLeft) {
      egg.x = left - egg.r;
    } else if (minPenetration === penetrationRight) {
      egg.x = right + egg.r;
    } else if (minPenetration === penetrationTop) {
      egg.y = top - egg.r;
    } else if (minPenetration === penetrationBottom) {
      egg.y = bottom + egg.r;
    }
    
    // Add spring force - strong upward bounce
    egg.vy = -1200; // Very strong upward force
    egg.vx += (Math.random() - 0.5) * 300; // Add horizontal randomness
  }
  
  handleFanCollision(egg, obj, dt) {
    const left = obj.x;
    const right = obj.x + obj.width;
    const top = obj.y;
    const bottom = obj.y + obj.height;
    
    // Apply fan force when egg is near (not just when colliding)
    const distance = Math.sqrt((egg.x - (left + right)/2)**2 + (egg.y - (top + bottom)/2)**2);
    if (distance < 100) { // Influence radius
      const fanForce = 800; // Much stronger force
      egg.vx += fanForce * dt;
      egg.vy -= fanForce * 0.3 * dt; // Slight upward component
    }
  }
  
  handlePendulumCollision(egg, obj, dt) {
    const left = obj.x;
    const right = obj.x + obj.width;
    const top = obj.y;
    const bottom = obj.y + obj.height;
    
    // Apply pendulum force when egg is near
    const distance = Math.sqrt((egg.x - (left + right)/2)**2 + (egg.y - (top + bottom)/2)**2);
    if (distance < 80) {
      // Use a time-based oscillation for pendulum motion
      const time = performance.now() * 0.002;
      const pendulumForce = 600;
      egg.vx += pendulumForce * Math.sin(time) * dt;
      egg.vy += pendulumForce * Math.cos(time) * dt;
    }
  }
  
  handleMotorCollision(egg, obj, dt) {
    const left = obj.x;
    const right = obj.x + obj.width;
    const top = obj.y;
    const bottom = obj.y + obj.height;
    
    // Apply motor force when egg is near
    const distance = Math.sqrt((egg.x - (left + right)/2)**2 + (egg.y - (top + bottom)/2)**2);
    if (distance < 100) {
      const motorForce = 1000; // Very strong continuous force
      egg.vx += motorForce * dt;
    }
  }
  
  handleTiltableCollision(egg, obj) {
    const left = obj.x;
    const right = obj.x + obj.width;
    const top = obj.y;
    const bottom = obj.y + obj.height;
    
    // Calculate penetration depths
    const penetrationLeft = (egg.x + egg.r) - left;
    const penetrationRight = right - (egg.x - egg.r);
    const penetrationTop = (egg.y + egg.r) - top;
    const penetrationBottom = bottom - (egg.y - egg.r);
    
    const minPenetration = Math.min(penetrationLeft, penetrationRight, penetrationTop, penetrationBottom);
    
    // Handle collision based on angle
    if (minPenetration === penetrationTop && egg.vy > 0) {
      // Landing on top - apply tilt force
      egg.y = top - egg.r;
      egg.vy = 0;
      egg.vx += Math.sin(obj.angle) * 200; // Apply tilt force
      egg.vx *= FRICTION;
    } else {
      // Side collision - use wall collision
      this.handleWallCollision(egg, obj);
    }
  }
  snapshot() { return { ramps: this.ramps, egg: this.egg ? { ...this.egg } : null }; }
  get using() { return "local"; }
}

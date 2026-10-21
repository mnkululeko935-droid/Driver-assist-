const LEFT = [33, 160, 158, 133, 153, 144];
const RIGHT = [362, 385, 387, 263, 373, 380];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function ear(lm, ids) {
  const [p1, p2, p3, p4, p5, p6] = ids.map(i => lm[i]);
  return (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4));
}

// Eye Aspect Ratio: about 0.3 when open, under 0.2 when closed
export function getEAR(lm) {
  return (ear(lm, LEFT) + ear(lm, RIGHT)) / 2;
}

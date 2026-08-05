/**
 * Aurora field — the organic layer under the section blending.
 *
 * blend.css already ships a complete, always-on atmosphere built from
 * three drifting radial gradients. That is the design, and it is what
 * every phone, every reduced-motion visitor and every browser without
 * WebGL sees. This module adds one thing on top for capable desktops:
 * gradients slide, but they cannot *churn*. Domain-warped noise gives
 * the blooms an interior that folds and breathes, which is the
 * difference between a page that has a gradient on it and a page that
 * feels like it has weather.
 *
 * It is deliberately NOT another Three.js scene. Three is already in the
 * bundle for the hero prism, but a second scene would mean another
 * renderer, another RAF, another set of state changes. This is one
 * quad, one fragment shader, one draw call per frame — about 3 KB of
 * code and no new dependency.
 *
 * The cost controls are the point, so they are all explicit:
 *   · internal resolution is capped at 420px on the long edge. Every
 *     feature in the shader is a soft blob many times that size, so
 *     upscaling is free and invisible — this is ~1% of the fragments a
 *     full-res pass would shade.
 *   · ~30fps, not 60. Nothing here moves fast enough to tell.
 *   · paused entirely when the tab is hidden or the field scrolls out
 *     of reach, via IntersectionObserver + visibilitychange.
 *   · desktop + fine pointer only. Phones get the CSS field, which on a
 *     small screen is genuinely indistinguishable.
 *   · bails silently on any WebGL failure, context loss, or reduced
 *     motion, leaving the CSS field untouched.
 */
import { isPhoneClassTouch, prefersReducedMotion, motionEffectsDisabled } from '@lib/devicePolicy';

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

/* Value noise + two-step domain warp. Cheap, and at this resolution the
   difference between this and a gradient-noise implementation is not
   perceptible — but the FOLDING is, which is the whole reason we are
   here. Hues arrive as uniforms so the shader tracks the theme. */
const FRAG = `
precision mediump float;
uniform vec2  uRes;
uniform float uTime;
uniform float uScroll;
uniform vec3  uA;      // magenta
uniform vec3  uB;      // purple
uniform vec3  uC;      // cyan
uniform float uAlpha;

float hash(vec2 v) { return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 v) {
  vec2 i = floor(v), f = fract(v);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 v) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise(v); v *= 2.02; a *= 0.5; }
  return s;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv;
  p.x *= uRes.x / uRes.y;

  float t = uTime * 0.035;
  float sc = uScroll;

  // Domain warp — the fold. Two passes is enough to stop the field
  // reading as sliding gradients without turning it into soup.
  vec2 q = vec2(fbm(p * 1.6 + vec2(0.0, t)),
                fbm(p * 1.6 + vec2(5.2, 1.3 - t)));
  vec2 r = vec2(fbm(p * 1.8 + 3.0 * q + vec2(1.7, 9.2) + t * 0.6),
                fbm(p * 1.8 + 3.0 * q + vec2(8.3, 2.8) - t * 0.4));
  float f = fbm(p * 1.4 + 2.4 * r);

  // Three broad zones that travel with scroll, each keyed to a hue.
  float d1 = 1.0 - smoothstep(0.0, 0.95, distance(uv, vec2(0.20 + sc * 0.26, 0.24 + sc * 0.18)));
  float d2 = 1.0 - smoothstep(0.0, 0.90, distance(uv, vec2(0.86 - sc * 0.30, 0.62 - sc * 0.24)));
  float d3 = 1.0 - smoothstep(0.0, 1.00, distance(uv, vec2(0.48 + sc * 0.12, 0.96 - sc * 0.40)));

  float w = smoothstep(0.25, 0.85, f);
  vec3 col = uA * d1 * w
           + uB * d2 * mix(0.55, 1.0, w)
           + uC * d3 * (1.0 - w * 0.4);

  // Vignette so the field never fights type at the edges of the screen.
  float vig = 1.0 - smoothstep(0.55, 1.25, distance(uv, vec2(0.5)));

  // Intensity drives ALPHA, not just colour. Writing an opaque
  // near-black fragment where there is no bloom is the classic way to
  // wreck a blended layer: under multiply the neutral value is WHITE,
  // so an opaque dark pixel multiplies the page toward black. That
  // turned the entire cream theme grey and put body copy under a haze.
  // With intensity in alpha, "no bloom" means "fully transparent",
  // which is neutral in every blend mode, so the same shader is safe
  // on paper and on ink.
  // (No backticks in here: this is inside a JS template literal.)
  float inten = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
  vec3 hue = inten > 0.001 ? col / inten : vec3(0.0);
  gl_FragColor = vec4(hue, inten * uAlpha * vig);
}
`;

export function initAuroraField(): (() => void) | null {
  if (typeof document === 'undefined') return null;
  if (isPhoneClassTouch()) return null;
  if (!window.matchMedia('(pointer: fine)').matches) return null;
  if (!window.matchMedia('(min-width: 900px)').matches) return null;
  if (prefersReducedMotion() || motionEffectsDisabled()) return null;

  const host = document.querySelector<HTMLElement>('.flow-field');
  if (!host) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'flow-aurora';
  canvas.setAttribute('aria-hidden', 'true');

  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, powerPreference: 'low-power',
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const compile = (type: number, src: string): WebGLShader | null => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[KR8·aurora] shader:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[KR8·aurora] link:', gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uScroll = gl.getUniformLocation(prog, 'uScroll');
  const uAlpha = gl.getUniformLocation(prog, 'uAlpha');
  const uA = gl.getUniformLocation(prog, 'uA');
  const uB = gl.getUniformLocation(prog, 'uB');
  const uC = gl.getUniformLocation(prog, 'uC');

  /** Read the chapter hues straight out of blend.css so the shader can
   *  never drift from the stylesheet, in either theme. */
  const readHue = (name: string): [number, number, number] => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const p = raw.split(',').map((n) => parseFloat(n) / 255);
    return (p.length === 3 && p.every((n) => Number.isFinite(n)))
      ? [p[0], p[1], p[2]]
      : [1, 0.4, 0.8];
  };

  let alpha = 0.5;
  const applyTheme = (): void => {
    gl.uniform3fv(uA, readHue('--flow-magenta'));
    gl.uniform3fv(uB, readHue('--flow-purple'));
    gl.uniform3fv(uC, readHue('--flow-cyan'));
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    // Paper takes far less light than a dark ground before it muddies,
    // and it must be TINTED rather than darkened — `multiply` on cream
    // greys the page and eats type contrast. `normal` over a
    // low-alpha hue is the wash; `screen` lifts the same hue out of ink.
    alpha = light ? 0.20 : 0.42;
    canvas.style.mixBlendMode = light ? 'normal' : 'screen';
    gl.uniform1f(uAlpha, alpha);
  };

  const MAX_EDGE = 420;
  const resize = (): void => {
    const w = window.innerWidth, h = window.innerHeight;
    const scale = MAX_EDGE / Math.max(w, h);
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    if (canvas.width === cw && canvas.height === ch) return;
    canvas.width = cw;
    canvas.height = ch;
    gl.viewport(0, 0, cw, ch);
    gl.uniform2f(uRes, cw, ch);
  };

  host.appendChild(canvas);
  resize();
  applyTheme();

  let raf = 0;
  let running = false;
  let last = 0;
  let scroll = 0;
  const FRAME_MS = 1000 / 30;
  const t0 = performance.now();

  const readScroll = (): void => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scroll = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };

  const draw = (now: number): void => {
    if (!running) { raf = 0; return; }
    raf = requestAnimationFrame(draw);
    if (now - last < FRAME_MS) return;
    last = now;
    gl.uniform1f(uTime, (now - t0) / 1000);
    gl.uniform1f(uScroll, scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const start = (): void => {
    if (running) return;
    running = true;
    if (!raf) raf = requestAnimationFrame(draw);
  };
  const stop = (): void => {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  };

  readScroll();
  start();

  const onScroll = (): void => { readScroll(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  // Context loss is not a crash — drop back to the CSS field.
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    canvas.remove();
  });

  // Theme flips and the motion toggle both land as a class/attribute
  // change on <html>.
  const mo = new MutationObserver(() => {
    if (prefersReducedMotion() || motionEffectsDisabled()) {
      stop();
      canvas.style.opacity = '0';
    } else {
      canvas.style.opacity = '';
      applyTheme();
      start();
    }
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  return () => {
    stop();
    mo.disconnect();
    window.removeEventListener('scroll', onScroll);
    canvas.remove();
  };
}

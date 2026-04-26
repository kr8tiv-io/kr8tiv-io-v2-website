/**
 * Menu Lab · Concept 05 — Shader-Surface Rail.
 *
 * Six vertical slices on the left rail, each a small live WebGL
 * shader. Hover a slice → it grows and a label slides into view.
 * Each slice has a unique hue passed as a uniform so they read as
 * distinct sections.
 */

const VERT = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3  uColor;
  uniform float uIntensity;
  uniform vec2  uResolution;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    float a = hash(i); float b = hash(i + vec2(1,0));
    float c = hash(i + vec2(0,1)); float d = hash(i + vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv * vec2(3.0, 10.0) + vec2(uTime * 0.05, uTime * 0.18);
    float n = fbm(p);
    vec3 col = mix(vec3(0.02, 0.02, 0.04), uColor, pow(n, 1.6) * 1.4);
    col += uColor * smoothstep(0.85, 1.0, n) * (0.5 + uIntensity);
    // Gentle vignette along the slice
    float v = smoothstep(0.0, 0.25, uv.x) * smoothstep(1.0, 0.75, uv.x);
    col *= mix(0.7, 1.0, v);
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface Slice {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uTime: WebGLUniformLocation | null;
  uColor: WebGLUniformLocation | null;
  uIntensity: WebGLUniformLocation | null;
  uRes: WebGLUniformLocation | null;
  color: [number, number, number];
  hoverTarget: number;
  hoverCurrent: number;
}

export function initShaderRail(selector = '.ml-shader-rail'): void {
  const host = document.querySelector<HTMLElement>(selector);
  if (!host) return;

  const items = Array.from(host.querySelectorAll<HTMLElement>('.rail-item'));
  const slices: Slice[] = [];
  const COLORS: Array<[number, number, number]> = [
    [1.0, 0.42, 0.84],   // pink
    [0.55, 0.0, 1.0],    // purple
    [1.0, 0.82, 0.4],    // gold
    [1.0, 0.18, 0.29],   // red
    [0.45, 0.9, 0.95],   // cyan
    [0.9, 0.9, 0.9]      // ink
  ];

  items.forEach((item, i) => {
    const canvas = document.createElement('canvas');
    item.insertBefore(canvas, item.firstChild);
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;

    const compile = (src: string, type: number): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const vs = compile(VERT, gl.VERTEX_SHADER);
    const fs = compile(FRAG, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const color = COLORS[i % COLORS.length]!;
    const slice: Slice = {
      canvas, gl, program,
      uTime: gl.getUniformLocation(program, 'uTime'),
      uColor: gl.getUniformLocation(program, 'uColor'),
      uIntensity: gl.getUniformLocation(program, 'uIntensity'),
      uRes: gl.getUniformLocation(program, 'uResolution'),
      color,
      hoverTarget: 0,
      hoverCurrent: 0
    };
    slices.push(slice);

    item.addEventListener('pointerenter', () => { slice.hoverTarget = 1; });
    item.addEventListener('pointerleave', () => { slice.hoverTarget = 0; });
  });

  const resize = (): void => {
    slices.forEach((s) => {
      const parent = s.canvas.parentElement!;
      const r = parent.getBoundingClientRect();
      s.canvas.width = r.width;
      s.canvas.height = r.height;
      s.gl.viewport(0, 0, r.width, r.height);
      if (s.uRes) s.gl.uniform2f(s.uRes, r.width, r.height);
    });
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  const start = performance.now();
  function tick(): void {
    const t = (performance.now() - start) * 0.001;
    slices.forEach((s) => {
      s.hoverCurrent += (s.hoverTarget - s.hoverCurrent) * 0.1;
      s.gl.useProgram(s.program);
      if (s.uTime) s.gl.uniform1f(s.uTime, t);
      if (s.uColor) s.gl.uniform3f(s.uColor, s.color[0], s.color[1], s.color[2]);
      if (s.uIntensity) s.gl.uniform1f(s.uIntensity, s.hoverCurrent);
      s.gl.drawArrays(s.gl.TRIANGLES, 0, 6);
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ============================================================
   SKIN — a procedural skin shader for the hand model.

   The model has no textures, so detail is computed per pixel in
   the hand's rest (bind) pose, which means it bends with the
   fingers: nails, knuckle wrinkles, flexion creases, palm lines,
   veins, lighter palms, pink fingertips and a fine skin grain.
   Everything is drawn as colour plus a height field that tilts
   the surface normal, and thins out gracefully when it's smaller
   than a pixel.

   Rest space (metres): +X is the back of the hand, −Y points to
   the fingertips, −Z is the thumb side.
   ============================================================ */
import * as THREE from 'three';

const PARS = /* glsl */`
varying vec3 vRest;
varying vec3 vRestN;
uniform vec3 uNailC[5]; uniform vec3 uNailA[5]; uniform vec3 uNailN[5]; uniform vec2 uNailH[5];
uniform vec3 uJP[14]; uniform vec3 uJA[14]; uniform vec3 uJN[14]; uniform vec4 uJX[14];
uniform vec3 uTip[5];
uniform vec3 uDorsal; uniform vec3 uPalm; uniform vec3 uKnuckle; uniform vec3 uTipPink; uniform vec3 uVein;
uniform vec3 uNail; uniform vec3 uLunula; uniform vec3 uFree;
uniform float uWristY; uniform float uArm; uniform float uBump;

float skHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float skNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(skHash(i), skHash(i + vec3(1,0,0)), f.x), mix(skHash(i + vec3(0,1,0)), skHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(skHash(i + vec3(0,0,1)), skHash(i + vec3(1,0,1)), f.x), mix(skHash(i + vec3(0,1,1)), skHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float skSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
// a groove/ridge profile that fades (instead of shimmering) once it's thinner than a pixel
float skLine(float d, float w, float px) { float ww = max(w, px * 0.8); return (w / ww) * exp(-(d * d) / (ww * ww)); }

// palm creases, as polylines in (y, z)
const vec2 HEART[5] = vec2[5](vec2(-0.003, 0.052), vec2(-0.007, 0.038), vec2(-0.011, 0.024), vec2(-0.016, 0.011), vec2(-0.023, -0.001));
const vec2 HEAD[5]  = vec2[5](vec2( 0.003,-0.020), vec2( 0.008,-0.005), vec2( 0.012, 0.010), vec2( 0.016, 0.025), vec2( 0.021, 0.037));
const vec2 LIFE[5]  = vec2[5](vec2( 0.001,-0.021), vec2( 0.011,-0.016), vec2( 0.023,-0.013), vec2( 0.036,-0.011), vec2( 0.052,-0.007));
// veins on the back of the hand and forearm, as segments (y0, z0, y1, z1)
const int VN = 13;
const vec4 VEIN[13] = vec4[13](
  vec4(0.300, 0.012, 0.120, 0.011), vec4(0.120, 0.011, 0.070, 0.012), vec4(0.070, 0.012, 0.036, 0.010),
  vec4(0.036, 0.010, 0.008, 0.004), vec4(0.008, 0.004, -0.014, -0.002),
  vec4(0.300, 0.038, 0.110, 0.035), vec4(0.110, 0.035, 0.062, 0.031), vec4(0.062, 0.031, 0.030, 0.030),
  vec4(0.030, 0.030, 0.000, 0.033), vec4(0.000, 0.033, -0.012, 0.035),
  vec4(0.036, 0.010, 0.022, 0.020), vec4(0.022, 0.020, 0.012, 0.029),
  vec4(0.300, -0.010, 0.060, -0.011)
);

struct Skin { vec3 col; float h; float rough; float nail; };

Skin skinAt(vec3 p, vec3 n, float px) {
  Skin S; S.h = 0.0; S.nail = 0.0;
  float palmar = smoothstep(0.15, -0.5, n.x);
  vec3 col = mix(uDorsal, uPalm, palmar);

  // skin is never one flat colour or one flat sheen: blotchy tone, and a
  // roughness that varies so highlights break up instead of reading as plastic
  float m = skNoise(p * 70.0) * 0.5 + skNoise(p * 190.0) * 0.3 + skNoise(p * 520.0) * 0.2;
  col *= 0.93 + 0.13 * m;
  col = mix(col, col * vec3(1.04, 0.95, 0.93), skNoise(p * 45.0 + 3.0) * 0.5);        // faint redness in patches
  float rough = mix(0.66, 0.76, palmar) + (skNoise(p * 380.0 + 11.0) - 0.5) * 0.16;
  S.h += (skNoise(p * 2600.0) - 0.5) * 0.000012 * clamp(0.0004 / px, 0.0, 1.0);

  // fingertips flush pink on the palm side
  for (int i = 0; i < 5; i++) {
    float d = length(p - uTip[i]);
    col = mix(col, uTipPink, 0.45 * palmar * exp(-d * d / 0.000121));
  }

  // joints: wrinkles and darker skin on the back, flexion creases on the palm side
  for (int j = 0; j < 14; j++) {
    vec3 d = p - uJP[j];
    float u = dot(d, uJA[j]);
    vec3 side = normalize(cross(uJA[j], uJN[j]));
    float s = dot(d, side);
    float across = exp(-(s * s) / (uJX[j].x * uJX[j].x));
    float fd = dot(n, uJN[j]);

    float env = exp(-(u * u) / (0.0047 * 0.0047)) * across * smoothstep(0.1, 0.6, fd);
    col = mix(col, uKnuckle, env * 0.5);
    if (uJX[j].z > 0.0 && env > 0.01) {
      // wrinkles bow toward the fingertip; noise keeps them from reading as stripes
      float uu = u + s * s * 60.0 + (skNoise(p * 700.0) - 0.5) * 0.0011;
      float period = 0.0013;
      float dl = (fract(uu / period) - 0.5) * period;
      float line = skLine(dl, 0.0002, px) * smoothstep(0.0048, 0.0015, abs(u)) * (0.35 + skNoise(p * 520.0 + 7.0));
      S.h -= env * uJX[j].z * line * 0.00014;
      col *= 1.0 - env * uJX[j].z * line * 0.2;
    }

    float pe = across * smoothstep(0.0, -0.55, fd);
    if (pe > 0.01) {
      float dc = u - uJX[j].y;
      float line = skLine(dc, 0.0003, px) + 0.6 * skLine(dc - 0.0017, 0.00025, px);
      S.h -= pe * line * 0.0002;
      col *= 1.0 - pe * min(line, 1.0) * 0.3;
    }
  }

  // the three main palm lines
  if (uArm < 0.5) {
    float inPalm = palmar * smoothstep(0.064, 0.052, p.y) * smoothstep(-0.034, -0.026, p.y);
    if (inPalm > 0.01) {
      vec2 q = p.yz;
      float dH = 1.0, dD = 1.0, dL = 1.0;
      for (int k = 0; k < 4; k++) {
        dH = min(dH, skSeg(q, HEART[k], HEART[k + 1]));
        dD = min(dD, skSeg(q, HEAD[k], HEAD[k + 1]));
        dL = min(dL, skSeg(q, LIFE[k], LIFE[k + 1]));
      }
      float line = skLine(dH, 0.0007, px) + skLine(dD, 0.00065, px) + skLine(dL, 0.00075, px);
      S.h -= inPalm * line * 0.00026;
      col *= 1.0 - inPalm * min(line, 1.0) * 0.16;
    }
  }

  // veins, raised and faintly cool, on the back of the hand and forearm
  float dors = smoothstep(0.2, 0.6, n.x);
  if (dors > 0.01) {
    float dv = 1.0;
    for (int k = 0; k < VN; k++) dv = min(dv, skSeg(p.yz, VEIN[k].xy, VEIN[k].zw));
    float v = exp(-(dv * dv) / (0.0022 * 0.0022)) * dors * smoothstep(-0.02, 0.012, p.y);
    S.h += v * 0.00042;
    col = mix(col, uVein, v * 0.26);
  }

  // nails: a raised glossy plate with a pale lunula and free edge, set in a cuticle groove
  float nailMask = 0.0;
  vec3 nailCol = uNail;
  for (int i = 0; i < 5; i++) {
    vec3 d = p - uNailC[i];
    vec3 side = normalize(cross(uNailA[i], uNailN[i]));
    float a = dot(d, uNailA[i]) / uNailH[i].x;               // −1 at the base, +1 at the tip
    float b = dot(d, side) / uNailH[i].y;
    float facing = smoothstep(0.2, 0.55, dot(n, uNailN[i]));
    float r = pow(pow(abs(a), 3.0) + pow(abs(b), 3.0), 1.0 / 3.0);
    float aa = px / uNailH[i].y;
    float inside = (1.0 - smoothstep(1.0 - aa, 1.0 + aa, r)) * facing;
    if (inside > nailMask) {
      float lun = smoothstep(-0.5, -0.88, a) * (1.0 - smoothstep(0.45, 0.8, abs(b)));
      float fre = smoothstep(0.78, 0.95, a);
      nailCol = mix(mix(uNail, uLunula, lun * 0.8), uFree, fre) * (0.97 + 0.03 * sin(b * 19.0));
      nailMask = inside;
    }
    S.h += inside * 0.00022;
    float rim = exp(-pow((r - 1.02) / 0.08, 2.0)) * facing * (1.0 - smoothstep(0.35, 0.75, a));
    S.h -= rim * 0.00018;
    col *= 1.0 - rim * 0.18;
  }
  S.col = mix(col, nailCol, nailMask);
  S.rough = mix(rough, 0.38, nailMask);
  S.nail = nailMask;
  return S;
}

// bump from a height field, using screen-space derivatives (Mikkelsen)
vec3 skPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sx = dFdx(surfPos), sy = dFdy(surfPos);
  vec3 R1 = cross(sy, surfNorm), R2 = cross(surfNorm, sx);
  float det = dot(sx, R1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(det) * surfNorm - grad);
}
`;

/* rig: measured nail and joint frames in rest space (see hands.js) */
export function createSkinMaterials(rig, tones) {
  const c = hex => new THREE.Color(hex);
  const shared = {
    uNailC: { value: rig.nails.map(n => n.c) }, uNailA: { value: rig.nails.map(n => n.a) },
    uNailN: { value: rig.nails.map(n => n.n) }, uNailH: { value: rig.nails.map(n => n.h) },
    uJP: { value: rig.joints.map(j => j.p) }, uJA: { value: rig.joints.map(j => j.a) },
    uJN: { value: rig.joints.map(j => j.n) }, uJX: { value: rig.joints.map(j => j.x) },
    uTip: { value: rig.tips },
    uDorsal: { value: c(tones.dorsal) }, uPalm: { value: c(tones.palm) }, uKnuckle: { value: c(tones.knuckle) },
    uTipPink: { value: c(tones.tipPink) }, uVein: { value: c(tones.vein) },
    uNail: { value: c(tones.nail) }, uLunula: { value: c(tones.lunula) }, uFree: { value: c(tones.free) },
    uWristY: { value: rig.wristY }, uBump: { value: 1 }
  };

  function make(arm) {
    // matte: no clear coat, a weak specular and dimmed reflections — skin scatters light, it doesn't shine
    const m = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.7, metalness: 0,
      specularIntensity: 0.45, envMapIntensity: 0.5,
      sheen: 0.3, sheenRoughness: 0.7, sheenColor: new THREE.Color('#f4c4b0'),
      transparent: arm
    });
    m.fog = false;
    const uniforms = { ...shared, uArm: { value: arm ? 1 : 0 } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = 'varying vec3 vRest;\nvarying vec3 vRestN;\n' + sh.vertexShader
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  vRestN = objectNormal;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vRest = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + PARS)
        .replace('#include <color_fragment>', `#include <color_fragment>
  float skPx = max(length(fwidth(vRest)), 1e-6);
  Skin sk = skinAt(vRest, normalize(vRestN), skPx);
  diffuseColor.rgb = sk.col;
  if (uArm > 0.5) diffuseColor.a *= 1.0 - smoothstep(uWristY + 0.05, uWristY + 0.24, vRest.y);   // forearm fades into the page`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = sk.rough;')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  normal = skPerturb(-vViewPosition, normal, vec2(dFdx(sk.h), dFdy(sk.h)) * uBump, faceDirection);`);
    };
    m.customProgramCacheKey = () => 'skin-v1';
    return m;
  }

  return { hand: make(false), arm: make(true) };
}

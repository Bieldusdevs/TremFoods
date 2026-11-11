// Ajuste de tamanho real e "em pé" para modelos fora de escala ou deitados.
// Só embrulha a cena num nó raiz novo e copia o bloco binário intacto: instantâneo e sem perda.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;

export type Upright = { x: number; z: number }; // quartos de volta em X / Z

export async function loadScene(buf: ArrayBuffer) {
  return (await new GLTFLoader().parseAsync(buf.slice(0), '')).scene;
}

export function placeAtRealSize(buf: ArrayBuffer, scene: THREE.Object3D, widthCm: number, up: Upright) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((up.x * Math.PI) / 2, 0, (up.z * Math.PI) / 2, 'XYZ'));
  const holder = new THREE.Group();
  holder.quaternion.copy(q);
  holder.add(scene);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  holder.remove(scene);
  const size = box.getSize(new THREE.Vector3());
  const s = widthCm / 100 / Math.max(size.x, size.z, 1e-6);
  const c = box.getCenter(new THREE.Vector3());
  const glb = wrapRoot(buf, { scale: s, translation: [-c.x * s, -box.min.y * s, -c.z * s], rotation: [q.x, q.y, q.z, q.w] });
  const cm = (v: number) => Math.round(v * s * 1000) / 10;
  return { glb, dims: { w: cm(size.x), h: cm(size.y), d: cm(size.z) } };
}

function wrapRoot(buf: ArrayBuffer, t: { scale: number; translation: number[]; rotation: number[] }) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error('O arquivo não é um GLB válido.');
  const jsonLen = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== JSON_CHUNK) throw new Error('GLB sem bloco JSON.');
  const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
  const rest = new Uint8Array(buf, 20 + jsonLen); // chunk(s) BIN copiados como estão
  gltf.nodes ??= [];
  const scene = gltf.scenes[gltf.scene ?? 0];
  const root =
    gltf.nodes.push({
      name: 'real-size',
      children: scene.nodes ?? [],
      scale: [t.scale, t.scale, t.scale],
      translation: t.translation,
      rotation: t.rotation,
    }) - 1;
  scene.nodes = [root];
  const text = new TextEncoder().encode(JSON.stringify(gltf));
  const padded = new Uint8Array(Math.ceil(text.length / 4) * 4).fill(0x20);
  padded.set(text);
  const total = 20 + padded.length + rest.length;
  const out = new ArrayBuffer(total);
  const o = new DataView(out);
  o.setUint32(0, MAGIC, true);
  o.setUint32(4, 2, true);
  o.setUint32(8, total, true);
  o.setUint32(12, padded.length, true);
  o.setUint32(16, JSON_CHUNK, true);
  new Uint8Array(out, 20).set(padded);
  new Uint8Array(out, 20 + padded.length).set(rest);
  return out;
}

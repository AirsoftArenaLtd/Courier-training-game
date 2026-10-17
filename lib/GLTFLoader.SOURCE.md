# glTF loader

Three.js **r158**, matching the bundled `three.min.js`, downloaded 17 October 2026. MIT licence: `three.LICENSE`.
No second Three.js runtime, remote scripts, compression decoder or WebAssembly is bundled.

- https://raw.githubusercontent.com/mrdoob/three.js/r158/examples/jsm/loaders/GLTFLoader.js
  SHA-256 `b85db4109434f8eb1d1d51c5d46ce3fa2df01819f141ad395f7be5cc44529151`.
- https://raw.githubusercontent.com/mrdoob/three.js/r158/examples/jsm/utils/BufferGeometryUtils.js
  SHA-256 `9be041e96308775d00e2695cc607645b9a9b64fd7c0e759dd8f7c00a8d92becb`.

`test/tools/vendor-gltf.js` takes these two downloaded files, binds the loader's imports to the existing global
`THREE`, includes only the upstream `toTrianglesDrawMode` helper and registers `THREE.GLTFLoader`. It minifies the
result with pinned esbuild 0.25.12. The upstream parsing code is otherwise unchanged. Rebuild with:

```sh
node test/tools/vendor-gltf.js /path/to/GLTFLoader.js /path/to/BufferGeometryUtils.js
```

The game loads only `GLTFLoader.min.js`, locally and once, after Three.js. The owned `fpassets.js` validates file
paths, manifest byte budgets and self-contained GLB buffers/images before handing bytes to this parser. Missing
or unsupported files retain the procedural model.

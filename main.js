import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.137.0-X5O2PK3x44y1WRry67Kr/mode=imports/optimized/three.js';
import { EffectComposer } from 'https://unpkg.com/three@0.137.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.137.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.137.0/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.137.0/examples/jsm/postprocessing/SMAAPass.js';
import { GammaCorrectionShader } from 'https://unpkg.com/three@0.137.0/examples/jsm/shaders/GammaCorrectionShader.js';
import { EffectShader } from "./EffectShader.js";
import { OrbitControls } from 'https://unpkg.com/three@0.137.0/examples/jsm/controls/OrbitControls.js';
import { FullScreenQuad } from 'https://unpkg.com/three@0.137.0/examples/jsm/postprocessing/Pass.js';
import { AssetManager } from './AssetManager.js';
import { Stats } from "./stats.js";
import { HorizontalBlurShader } from './HorizontalBlurShader.js';
import { VerticalBlurShader } from './VerticalBlurShader.js';
const makeSDF = (image, clientWidth, clientHeight, renderer) => {
    image.minFilter = THREE.NearestFilter;
    image.maxFilter = THREE.NearestFilter;
    let uvRenderTarget = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        type: THREE.FloatType
    });
    let outsideRenderTarget = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        type: THREE.FloatType
    });
    let insideRenderTarget = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        type: THREE.FloatType
    }); {
        const uvRender = new FullScreenQuad(new THREE.ShaderMaterial({
            uniforms: {
                tex: { value: image }
            },
            vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `,
            fragmentShader: /*glsl*/ `
        uniform sampler2D tex;
        varying vec2 vUv;
        void main() {
            gl_FragColor = vec4(vUv * (1.0 - round(texture2D(tex, vUv).x)), 0.0, 1.0);
        }
        `
        }));
        renderer.setRenderTarget(outsideRenderTarget);
        uvRender.render(renderer);
        const jumpFloodRender = new FullScreenQuad(new THREE.ShaderMaterial({
            uniforms: {
                tex: { value: null },
                offset: { value: 0.0 },
                level: { value: 0.0 },
                maxSteps: { value: 0.0 }
            },
            vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `,
            fragmentShader: /*glsl*/ `
        varying vec2 vUv;
        uniform sampler2D tex;
        uniform float offset;
        uniform float level;
        uniform float maxSteps;
        void main() {
            float closestDist = 9999999.9;
            vec2 closestPos = vec2(0.0);
            for(float x = -1.0; x <= 1.0; x += 1.0)
            {
               for(float y = -1.0; y <= 1.0; y += 1.0)
               {
                  vec2 voffset = vUv;
                  voffset += vec2(x, y) * vec2(${1/clientWidth}, ${1/clientHeight}) * offset;
         
                  vec2 pos = texture2D(tex, voffset).xy;
                  float dist = distance(pos.xy, vUv);
         
                  if(pos.x != 0.0 && pos.y != 0.0 && dist < closestDist)
                  {
                    closestDist = dist;
                    closestPos = pos;
                  }
               }
            }
            gl_FragColor = vec4(closestPos, 0.0, 1.0);
        }
        `
        }));
        const passes = Math.ceil(Math.log(Math.max(clientWidth, clientHeight)) / Math.log(2.0));
        let lastTarget = outsideRenderTarget;
        let target;
        for (let i = 0; i < passes; i++) {
            const offset = Math.pow(2, passes - i - 1);
            target = lastTarget.clone();
            jumpFloodRender.material.uniforms.level.value = i;
            jumpFloodRender.material.uniforms.maxSteps.value = passes;
            jumpFloodRender.material.uniforms.offset.value = offset;
            jumpFloodRender.material.uniforms.tex.value = lastTarget;
            renderer.setRenderTarget(target);
            jumpFloodRender.render(renderer);
            lastTarget = target;
        }
        outsideRenderTarget = target.clone();
        const distanceFieldRender = new FullScreenQuad(new THREE.ShaderMaterial({
            uniforms: {
                tex: { value: target.texture }
            },
            vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `,
            fragmentShader: /*glsl*/ `
        varying vec2 vUv;
        uniform sampler2D tex;
        void main() {
            gl_FragColor = vec4(vec3(distance(texture2D(tex, vUv).xy, vUv)), 1.0);
        }
        `
        }));
        renderer.setRenderTarget(outsideRenderTarget);
        distanceFieldRender.render(renderer);
    } {
        const uvRender = new FullScreenQuad(new THREE.ShaderMaterial({
            uniforms: {
                tex: { value: image }
            },
            vertexShader: /*glsl*/ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
    `,
            fragmentShader: /*glsl*/ `
    uniform sampler2D tex;
    varying vec2 vUv;
    void main() {
        gl_FragColor = vec4(vUv * (round(texture2D(tex, vUv).x)), 0.0, 1.0);
    }
    `
        }));
        renderer.setRenderTarget(insideRenderTarget);
        uvRender.render(renderer);
        const jumpFloodRender = new FullScreenQuad(new THREE.ShaderMaterial({
            uniforms: {
                tex: { value: null },
                offset: { value: 0.0 },
                level: { value: 0.0 },
                maxSteps: { value: 0.0 }
            },
            vertexShader: /*glsl*/ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
    `,
            fragmentShader: /*glsl*/ `
    varying vec2 vUv;
    uniform sampler2D tex;
    uniform float offset;
    uniform float level;
    uniform float maxSteps;
    void main() {
        float closestDist = 9999999.9;
        vec2 closestPos = vec2(0.0);
        for(float x = -1.0; x <= 1.0; x += 1.0)
        {
           for(float y = -1.0; y <= 1.0; y += 1.0)
           {
              vec2 voffset = vUv;
              voffset += vec2(x, y) * vec2(${1/clientWidth}, ${1/clientHeight}) * offset;
     
              vec2 pos = texture2D(tex, voffset).xy;
              float dist = distance(pos.xy, vUv);
     
              if(pos.x != 0.0 && pos.y != 0.0 && dist < closestDist)
              {
                closestDist = dist;
                closestPos = pos;
              }
           }
        }
        gl_FragColor = vec4(closestPos, 0.0, 1.0);
    }
    `
        }));
        const passes = Math.ceil(Math.log(Math.max(clientWidth, clientHeight)) / Math.log(2.0));
        let lastTarget = insideRenderTarget;
        let target;
        for (let i = 0; i < passes; i++) {
            const offset = Math.pow(2, passes - i - 1);
            target = lastTarget.clone();
            jumpFloodRender.material.uniforms.level.value = i;
            jumpFloodRender.material.uniforms.maxSteps.value = passes;
            jumpFloodRender.material.uniforms.offset.value = offset;
            jumpFloodRender.material.uniforms.tex.value = lastTarget;
            renderer.setRenderTarget(target);
            jumpFloodRender.render(renderer);
            lastTarget = target;
        }
        insideRenderTarget = target.clone();
        const distanceFieldRender = new FullScreenQuad(new THREE.ShaderMaterial({
            uniforms: {
                tex: { value: target.texture }
            },
            vertexShader: /*glsl*/ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
    `,
            fragmentShader: /*glsl*/ `
    varying vec2 vUv;
    uniform sampler2D tex;
    void main() {
        gl_FragColor = vec4(vec3(distance(texture2D(tex, vUv).xy, vUv)), 1.0);
    }
    `
        }));
        renderer.setRenderTarget(insideRenderTarget);
        distanceFieldRender.render(renderer);
    }
    const compositeRender = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms: {
            inside: { value: insideRenderTarget.texture },
            outside: { value: outsideRenderTarget.texture }
        },
        vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `,
        fragmentShader: /*glsl*/ `
        varying vec2 vUv;
        uniform sampler2D inside;
        uniform sampler2D outside;
        void main() {
            float i = texture2D(inside, vUv).x;
            float o = texture2D(outside, vUv).x;
            if (i == 0.0) {
                gl_FragColor = vec4(vec3(o), 1.0);
            } else {
                gl_FragColor = vec4(vec3(-i), 1.0);
            }
            //gl_FragColor = vec4(vec3(i), 1.0);
        }
        `
    }));
    renderer.setRenderTarget(uvRenderTarget);
    compositeRender.render(renderer);
    return uvRenderTarget;
}
async function main() {
    // Setup basic renderer, controls, and profiler
    const clientWidth = window.innerWidth * 0.99;
    const clientHeight = window.innerHeight * 0.98;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
    camera.position.set(50, 75, 50);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(clientWidth, clientHeight);
    document.body.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 25, 0);
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    // Setup scene
    // Skybox
    const environment = new THREE.CubeTextureLoader().load([
        "skybox/Box_Right.bmp",
        "skybox/Box_Left.bmp",
        "skybox/Box_Top.bmp",
        "skybox/Box_Bottom.bmp",
        "skybox/Box_Front.bmp",
        "skybox/Box_Back.bmp"
    ]);
    scene.background = environment;
    // Lighting
    const ambientLight = new THREE.AmbientLight(new THREE.Color(1.0, 1.0, 1.0), 0.25);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.35);
    directionalLight.position.set(150, 200, 50);
    // Shadows
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.left = -75;
    directionalLight.shadow.camera.right = 75;
    directionalLight.shadow.camera.top = 75;
    directionalLight.shadow.camera.bottom = -75;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.bias = -0.001;
    directionalLight.shadow.blurSamples = 8;
    directionalLight.shadow.radius = 4;
    scene.add(directionalLight);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.15);
    directionalLight2.color.setRGB(1.0, 1.0, 1.0);
    directionalLight2.position.set(-50, 200, -150);
    scene.add(directionalLight2);
    // Objects
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100).applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2)), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }));
    ground.castShadow = true;
    ground.receiveShadow = true;
    scene.add(ground);
    const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: new THREE.Color(1.0, 0.0, 0.0) }));
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.y = 5.01;
    scene.add(box);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(6.25, 32, 32), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, envMap: environment, metalness: 1.0, roughness: 0.25 }));
    sphere.position.y = 7.5;
    sphere.position.x = 25;
    sphere.position.z = 25;
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);
    const torusKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(5, 1.5, 200, 32), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, envMap: environment, metalness: 0.5, roughness: 0.5, color: new THREE.Color(0.0, 1.0, 0.0) }));
    torusKnot.position.y = 10;
    torusKnot.position.x = -25;
    torusKnot.position.z = -25;
    torusKnot.castShadow = true;
    torusKnot.receiveShadow = true;
    scene.add(torusKnot);
    // Build postprocessing stack
    // Render Targets
    const defaultTexture = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        type: THREE.FloatType
    });
    defaultTexture.depthTexture = new THREE.DepthTexture(clientWidth, clientHeight, THREE.FloatType);
    // Post Effects
    const composer = new EffectComposer(renderer);
    const smaaPass = new SMAAPass(clientWidth, clientHeight);
    const effectPass = new ShaderPass(EffectShader);
    /*const effectHBlur = new ShaderPass(HorizontalBlurShader);
    const effectVBlur = new ShaderPass(VerticalBlurShader);
    effectHBlur.uniforms['h'].value = 2 / (clientWidth);
    effectVBlur.uniforms['v'].value = 2 / (clientHeight);*/
    composer.addPass(effectPass);
    //composer.addPass(effectHBlur);
    //composer.addPass(effectVBlur);
    composer.addPass(smaaPass);
    let worldSdf = { texture: null };
    let usSdf = { texture: null };
    const worldTex = new THREE.TextureLoader().load("world.jpeg", image => {
        //uvRenderTarget = insideRenderTarget;
        worldSdf = makeSDF(image, clientWidth, clientHeight, renderer);
    });
    const usTex = new THREE.TextureLoader().load("fantasymap.png", image => {
        //uvRenderTarget = insideRenderTarget;
        usSdf = makeSDF(image, clientWidth, clientHeight, renderer);
    });
    let mouseX, mouseY;
    let chosenLight = null;
    document.onmousemove = (e) => {
        mouseX = (e.clientX / window.innerWidth);
        mouseY = 1.0 - (e.clientY / window.innerHeight);
        if (chosenLight) {
            chosenLight.position.x = Math.max(Math.min(mouseX, 1), 0);
            chosenLight.position.y = Math.max(Math.min(mouseY, 1), 0);
        }
    }
    document.onmousedown = (e) => {
        mouseX = (e.clientX / window.innerWidth);
        mouseY = 1.0 - (e.clientY / window.innerHeight);
        /*lights.forEach(light => {
            if (light.position.distanceTo(new THREE.Vector2(mouseX, mouseY)) < )
        })*/
        let maxRadiance = 0.0;
        let cl = null;
        const resolution = new THREE.Vector2(clientWidth, clientHeight);
        lights.forEach(light => {
            if (light.range > 0) {
                // console.log(light.position.clone().multiply(resolution));
                const falloffDist = light.position.clone().multiply(resolution).distanceTo(new THREE.Vector2(mouseX, mouseY).multiply(resolution)); /*distance(lights[i].position * resolution, origin * resolution);*/
                const radiance = light.range / (falloffDist * falloffDist);
                if (radiance > maxRadiance) {
                    maxRadiance = radiance;
                    cl = light;
                }
                //console.log(falloffDist);
            }
        });
        if (maxRadiance > 1.0) {
            chosenLight = cl;
        }
    }
    document.onmouseup = (e) => {
        chosenLight = null;
    }
    const sdfPerFrame = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms: {
            'time': { value: 0.0 },
            'sdf1': { value: null },
            'sdf2': { value: null },
        },
        vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `,
        fragmentShader: /*glsl*/ `
		uniform sampler2D sdf1;
        uniform sampler2D sdf2;
        uniform float time;
        varying vec2 vUv;
        void main() {
            float dist1 = texture2D(sdf1, vUv).x;
            float dist2 = texture2D(sdf2, vUv).x;
            gl_FragColor = vec4(vec3(mix(dist1, dist2, 0.5 + sin(time * 0.5) * 0.5)), 1.0);
        }
        `
    }));
    const lights = [];
    for (let i = 0; i < 16; i++) {
        lights.push({
            position: new THREE.Vector2(Math.random(), Math.random()),
            color: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
            range: 1000 + 9000 * Math.random() * Math.random(),
            softness: 2 + 6 * Math.random() * Math.random(),
            velocity: new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.001)
        })
    }

    function animate() {
        renderer.setRenderTarget(defaultTexture);
        renderer.clear();
        sdfPerFrame.material.uniforms["sdf1"].value = worldSdf.texture;
        sdfPerFrame.material.uniforms["sdf2"].value = usSdf.texture;
        sdfPerFrame.material.uniforms["time"].value = performance.now() / 1000.0;
        sdfPerFrame.render(renderer);
        //renderer.render(scene, camera);
        effectPass.uniforms["sdf"].value = defaultTexture.texture;
        effectPass.uniforms["mousePos"].value = new THREE.Vector2(mouseX, mouseY);
        //const lights = [
        // { position: new THREE.Vector2(mouseX, mouseY), color: new THREE.Vector3(1.0, 1.0, 1.0), range: 1000 },
        /* { position: new THREE.Vector2(1.0 - mouseX, 1.0 - mouseY), color: new THREE.Vector3(0.0, 1.0, 0.0), range: 1000 },
         { position: new THREE.Vector2(mouseX, 1.0 - mouseY), color: new THREE.Vector3(0.0, 0.0, 1.0), range: 1000 },
         { position: new THREE.Vector2(1.0 - mouseX, mouseY), color: new THREE.Vector3(1.0, 0.0, 0.0), range: 1000 },*/
        // ];
        lights.forEach(light => {
            if (light !== chosenLight) {
                light.position.x += light.velocity.x;
                light.position.y += light.velocity.y;
            }
            if (light.position.x < 0 || light.position.x > 1) {
                light.velocity.x *= -1;
            }
            if (light.position.y < 0 || light.position.y > 1) {
                light.velocity.y *= -1;
            }
        })
        effectPass.uniforms["numLights"].value = lights.length;
        while (lights.length < 16) {
            lights.push({ position: new THREE.Vector2(), color: new THREE.Vector3(), velocity: new THREE.Vector2(), softness: 0, range: 0.0001 });
        }
        while (lights.length > 16) {
            lights.pop();
            //lights.push({ position: new THREE.Vector2(), color: new THREE.Vector3() });
        }
        effectPass.uniforms["lights"].value = lights;
        effectPass.uniforms["resolution"].value = new THREE.Vector2(clientWidth, clientHeight);
        effectPass.uniforms["time"].value = performance.now() / 1000.0;
        /*effectHBlur.uniforms["sdf1"].value = worldSdf.texture;
        effectHBlur.uniforms["sdf2"].value = usSdf.texture;
        effectHBlur.uniforms["time"].value = performance.now() / 1000.0;
        effectVBlur.uniforms["sdf1"].value = worldSdf.texture;
        effectVBlur.uniforms["sdf2"].value = usSdf.texture;
        effectVBlur.uniforms["time"].value = performance.now() / 1000.0;*/
        composer.render();
        controls.update();
        stats.update();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}
main();
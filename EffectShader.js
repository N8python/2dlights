import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.137.0-X5O2PK3x44y1WRry67Kr/mode=imports/optimized/three.js';
const EffectShader = {

    uniforms: {

        'sceneDiffuse': { value: null },
        'time': { value: 0.0 },
        'sdf': { value: null },
        'mousePos': { value: new THREE.Vector2() },
        'resolution': { value: new THREE.Vector2() },
        'lights': { value: [] },
        'numLights': { value: 1 }
    },

    vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,

    fragmentShader: /* glsl */ `
		uniform sampler2D sdf;
    uniform float time;
    uniform vec2 mousePos;
    uniform vec2 resolution;
        varying vec2 vUv;
    struct Light {
      vec2 position;
      vec3 color;
      float range;
      float softness;
    };
    #define MAX_LIGHTS 16
    uniform Light[MAX_LIGHTS] lights;
    uniform int numLights;
    vec2 toAspect(vec2 vec) {
      vec.x *= (resolution.x / resolution.y);
      return vec;
    }highp float random(vec2 co)
    {
        highp float a = 12.9898;
        highp float b = 78.233;
        highp float c = 43758.5453;
        highp float dt= dot(co.xy ,vec2(a,b));
        highp float sn= mod(dt,3.14);
        return fract(sin(sn) * c);
    }
    float seed = 0.0;
    float rand()
    {
        /*float result = fract(sin(seed + mod(time, 1000.0) + dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        //_Seed += 1.0;
        seed += 1.0;
        return result;*/
        float result = random(vUv + seed / 10.0/* + mod(time / 100.0, 100.0)*/);
        seed += 1.0;
        return result;
    }
    float sdfScene(vec2 uv) {
     /* float dist1 = texture2D(sdf1, uv).x;
      float dist2 = texture2D(sdf2, uv).x;
      float finalDist = mix(dist1, dist2, 0.5 + sin(time * 0.5) * 0.5);*/
      return texture2D(sdf, uv).x;
    }
		void main() {
      //float dist2 = texture2D(sdf2, vUv).x;
     //float dist = mix(dist1, dist2, 0.5 + sin(time * 0.5) * 0.5);
     float dist = sdfScene(vUv);
      /*gl_FragColor = vec4(vec3(dist < 0.0 ? 1.0 : 0.0), 1.0);
      if (distance(toAspect(mousePos), toAspect(vUv) ) < 0.025) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }*/
      vec3 col = vec3(0.0, 0.0, 0.0);
      //gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      if (dist > 0.0) {
        for(int i = 0; i < numLights; i++) {
          vec2 origin = vUv;
          vec2 dir = normalize(lights[i].position - vUv);
          float currentDist = 0.0;
          float maxDist = distance(lights[i].position, origin);
          bool hit = false;
          float shadow = 1.0;
          float ph = 1e20;
          float sAmount = 128.0;
          float samples = (sAmount * 0.75) + rand() * (sAmount + 0.5);
          float distanceFalloff = 1.0;
          float falloffDist = distance(lights[i].position * resolution, origin * resolution);
          if (lights[i].range > 0.0) {
            distanceFalloff = lights[i].range / (falloffDist * falloffDist);
          }
          if (distanceFalloff < 0.01) {
            continue;
          }
          for(float j = 0.0; j < samples; j++) {
            vec2 samplePoint = origin + dir * currentDist;
            float distToSurface = sdfScene(samplePoint);
            float y = distToSurface*distToSurface/(2.0*ph);
            float d = sqrt(distToSurface*distToSurface-y*y);
            shadow = min( shadow, lights[i].softness*d/max(0.0,currentDist-y) );
            ph = currentDist;
            //shadow = min(shadow, 4.0 * distToSurface/currentDist);
            currentDist += distToSurface * (64.0 / samples);
            if (distToSurface < 0.0) {
              hit = true;
              break;
            }
            if (currentDist > maxDist) {
              break;
            }
          }
          if (!hit) {
            col += lights[i].color * shadow * distanceFalloff;
          } 
        }
       
      } else {
        col = dist < -0.005 ? vec3(0.25) : vec3(0.375);
      }
      gl_FragColor = vec4(col, 1.0);
		}`

};

export { EffectShader };
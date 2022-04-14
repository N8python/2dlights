const VerticalBlurShader = {

    uniforms: {

        'tDiffuse': { value: null },
        'v': { value: 1.0 / 512.0 },
        'time': { value: 0.0 },
        'sdf1': { value: null },
        'sdf2': { value: null }
    },

    vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,

    fragmentShader: /* glsl */ `
		uniform sampler2D tDiffuse;
		uniform float v;
		uniform sampler2D sdf1;
		uniform sampler2D sdf2;
		uniform float time;
		varying vec2 vUv;
		float sdfScene(vec2 uv) {
			float dist1 = texture2D(sdf1, uv).x;
			float dist2 = texture2D(sdf2, uv).x;
			float finalDist = mix(dist1, dist2, 0.5 + sin(time * 0.5) * 0.5);
			return finalDist;
		  }
		void main() {
			vec4 sum = vec4( 0.0 );
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;
			gl_FragColor = sum;
		}`

};

export { VerticalBlurShader };
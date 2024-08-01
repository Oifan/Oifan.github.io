const	fragmentShader = "precision mediump float;\nuniform sampler2D img;\nuniform sampler2D depth;\nuniform mediump vec2 swag;\nvarying vec2 vpos;\nvoid main() {\n	vec4 depthDistortion = texture2D(depth, vpos);\n	float parallaxMult = depthDistortion.r;\n	vec2 parallax = swag * parallaxMult;\n	vec4 original = texture2D(img, vpos + parallax);\n	gl_FragColor = original;\n}\n",
	vertexShader = "precision mediump float;\nattribute vec2 pos;\nvarying vec2 vpos;\nuniform vec2 u_resolution;\nuniform vec2 u_image_resolution;\nuniform vec2 textureScale;\nuniform mediump vec2 swag;\nvoid main() {\n	// Scale the texture coordinates\n	vec2 scaledPos = pos * textureScale;\n\n	// Center the position\n	vpos = ((pos + 1.0) * 0.5);\n	vpos.y = 1.0 - vpos.y;\n\n	// Apply mouse offset for parallax effect to gl_Position\n	vec2 position = scaledPos + swag * 2.5; // Adjust the factor for more or less movement\n	gl_Position = vec4(position, 0.0, 1.0);\n}\n";

class Image3D {
	constructor(c, i, d) {
		if (!(c instanceof HTMLCanvasElement)) throw new Error("The first argument must be a canvas element.");
		this.canvas = c, this.imageUrl = i, this.depthUrl = d, this.mouseMoveListener = this.onMouseMove.bind(this), this.setup()
	}
	async loadImage(u) {
		const i = new Image;
		return i.crossOrigin = "anonymous", i.src = u, await new Promise((u => i.onload = u)), i
	}
	async setup() {
		const i = await this.loadImage(this.imageUrl),
			d = await this.loadImage(this.depthUrl);
		if (this.imageWidth = i.width, this.imageHeight = i.height, this.gl = this.canvas.getContext("webgl"),
				this.gl || (console.error("WebGL not supported, falling back on experimental-webgl"),
				this.gl = this.canvas.getContext("experimental-webgl")), !this.gl)
			throw new Error("Your browser does not support WebGL");
		const b = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, b), this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1]),
				this.gl.STATIC_DRAW), this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, !1, 0, 0), this.gl.enableVertexAttribArray(0);
		const v = this.gl.createShader(this.gl.VERTEX_SHADER);
		if (this.gl.shaderSource(v, vertexShader), this.gl.compileShader(v), !this.gl.getShaderParameter(v, this.gl.COMPILE_STATUS))
			return console.error("An error occurred compiling the vertex shader: ", this.gl.getShaderInfoLog(v)), void this.gl.deleteShader(v);
		const f = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		if (this.gl.shaderSource(f, fragmentShader), this.gl.compileShader(f), !this.gl.getShaderParameter(f, this.gl.COMPILE_STATUS))
			return console.error("An error occurred compiling the fragment shader: ", this.gl.getShaderInfoLog(f)), void this.gl.deleteShader(f);
		if (this.program = this.gl.createProgram(),
				this.gl.attachShader(this.program, v), this.gl.attachShader(this.program, f),
				this.gl.linkProgram(this.program), !this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS))
			return void console.error("Unable to initialize the shader program: ", this.gl.getProgramInfoLog(this.program));
		this.gl.useProgram(this.program),
				this.setTexture(i, "img", 0, this.gl.RGB), this.setTexture(d, "depth", 1, this.gl.LUMINANCE),
				this.uResolution = this.gl.getUniformLocation(this.program, "u_resolution"),
				this.uImageResolution = this.gl.getUniformLocation(this.program, "u_image_resolution"),
				this.textureScale = this.gl.getUniformLocation(this.program, "textureScale");
		this.gl.getUniformLocation(this.program, "swag");
		window.addEventListener("mousemove", this.mouseMoveListener), this.resize(this.canvas.clientWidth, this.canvas.clientHeight)
	}
	onMouseMove(e) {
		const p = getRelativeMousePosition(e);
		this.gl.uniform2fv(this.gl.getUniformLocation(this.program, "swag"), new Float32Array(p)), requestAnimationFrame((() => this.paint()))
	}
	setTexture(t, n, i, f) {
		const r = this.gl.createTexture();
		this.gl.activeTexture(this.gl.TEXTURE0 + i), this.gl.bindTexture(this.gl.TEXTURE_2D, r),
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR),
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE),
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE),
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, f, f, this.gl.UNSIGNED_BYTE, t),
				this.gl.uniform1i(this.gl.getUniformLocation(this.program, n), i)
	}
	paint() {
		this.gl && (this.gl.clearColor(0, .65, 1, 1), this.gl.clear(this.gl.COLOR_BUFFER_BIT), this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4))
	}
	resize(w, h) {
		if (this.canvas.width = w, this.canvas.height = h, !this.gl) return;
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		const a = this.imageWidth / this.imageHeight,
			r = w / h;
		let q;
		q = r > a ? [1, r / a] : [a / r, 1];
		q = q.map((w => 1.05 * w)), this.gl.uniform2f(this.uResolution, w, h),
				this.gl.uniform2f(this.uImageResolution, this.imageWidth, this.imageHeight),
				this.gl.uniform2fv(this.textureScale, q), this.paint()
	}
	delete() {
		if (!this.gl) return void console.error("WebGL context is not available.");
		if (window.removeEventListener("mousemove", this.mouseMoveListener), this.program) {
			const s = this.gl.getAttachedShaders(this.program);
			s && s.forEach((s => this.gl.deleteShader(s))), this.gl.deleteProgram(this.program), this.program = null
		}
		for (let i = 0; i < 2; i++) {
			this.gl.activeTexture(this.gl.TEXTURE0 + i);
			const t = this.gl.getParameter(this.gl.TEXTURE_BINDING_2D);
			t && this.gl.deleteTexture(t)
		}
		const b = this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING);
		b && this.gl.deleteBuffer(b), this.canvas.parentNode && this.canvas.parentNode.removeChild(this.canvas), this.gl = null
	}
}

function getRelativeMousePosition(e) {
	const w = window.innerWidth,
		h = window.innerHeight;
	return [.04 * (e.clientX / w - .5), .04 * (.5 - e.clientY / h)]
}

window.Image3D = Image3D;
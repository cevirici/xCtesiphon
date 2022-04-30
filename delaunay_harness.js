

let pts = [];
let mesh;
let regenerate = () => {
	pts = [];
	let n = parseInt(document.getElementById("vertexCount").value);
	for (let i = 0; i < n; i++) {
		pts.push([1 - Math.random() * 2, 1 - Math.random() * 2]);
	}
	pts.sort((a, b) => a[1] - b[1]);
	mesh = new DelaunayMesh(pts);
	mesh.initialize();
	rerender();
}

let rerender = () => {
	resetColors();
	redraw();	
}

let tick = () => {
	if (mesh.unprocessedPositions.length > 0)
		mesh.addPoint(mesh.unprocessedPositions.shift());
	else if (!mesh.isCapped) {
		mesh.capTop();
	}
	rerender();
}

let finish = () => {
	let startTime = Date.now();
	mesh.unprocessedPositions.forEach(mesh.addPoint.bind(mesh));
	mesh.capTop();
	mesh.unprocessedPositions = [];
	let elapsed = Date.now() - startTime;
	rerender();
	document.getElementById('time').innerHTML = `Elapsed time: ${elapsed}ms`;
}

let delaunate = () => {
	let flattened = [];
	pts.forEach(pt => {flattened.push(...pt)});
	let startTime = Date.now();
	console.log(new Delaunator(flattened));
	let elapsed = Date.now() - startTime;
	document.getElementById('time').innerHTML = `Elapsed time: ${elapsed}ms`;	
}

let fastdelaunate = () => {
	let startTime = Date.now();
	Delaunay.triangulate(pts);
	let elapsed = Date.now() - startTime;
	document.getElementById('time').innerHTML = `Elapsed time: ${elapsed}ms`;	
}

// document.addEventListener("mousedown", tick, false)
var uniforms = {
	u_mouse : {
		type : "v2",
		value : [0.7 * window.innerWidth, window.innerHeight]
	}
};

var prog, canvas, gl;
function init() {
	canvas = document.getElementById('testCanvas');
	gl = canvas.getContext('webgl');
	gl.viewport(0,0,canvas.width,canvas.height);

	const vertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertShader, `
		attribute vec3 c;
		attribute vec4 a_color;
		varying vec4 v_color;
		varying vec4 v_c;
		uniform mat4 rotation_matrix;
		uniform mat4 irotation_matrix;
		void main(void) {
			gl_Position = vec4(c, 1.1);
			gl_PointSize = 5.0;
			v_color = a_color;
			v_c = vec4(c, 1.1);
		}
	`);
	gl.compileShader(vertShader);
	const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, `
		precision mediump float;
		varying vec4 v_color;
		varying vec4 v_c;
		void main(void) {
			gl_FragColor = v_color;
		}`
	);
	gl.compileShader(fragShader);
	prog = gl.createProgram();
	gl.attachShader(prog, vertShader);
	gl.attachShader(prog, fragShader);
	gl.enable(gl.CULL_FACE);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LESS);
	gl.linkProgram(prog);
	gl.useProgram(prog);
}

let coords, color_array, vertex_count, edge_count;
function resetColors () {
	// Rendering shizz

	coords = [];
	color_array = [];
	vertex_count = 0;
	edge_count = 0;

	Object.values(mesh.vertices).forEach((v, i) => {
		coords.push(...v.pos, 1);
		color_array.push(0, 0, 1, 1);
		vertex_count++;
	})
	Object.values(mesh.unprocessedPositions).forEach((pos, i) => {
		coords.push(...pos, 1);
		if (i === 0)
			color_array.push(0, 1, 0, 1);
		else
			color_array.push(1, 0, 0, 1);
		vertex_count++;
	})
	Object.values(mesh.edges).forEach((e, i) => {
		coords.push(...e.halfedge.vertex.pos, 1);
		coords.push(...e.halfedge.twin.vertex.pos, 1);
		color_array.push(0, 0, 1, 1);
		color_array.push(0, 0, 1, 1);
		edge_count++;
	})
}

function redraw(event) {
	canvas = document.getElementById('testCanvas');

	let location = gl.getUniformLocation(prog, "rotation_matrix");
	let ilocation = gl.getUniformLocation(prog, "irotation_matrix");
	let theta = 0; //uniforms.u_mouse.value[0] / 500;
	let matrix = [
		Math.cos(theta), 0, Math.sin(theta), 0,
		0, 1, 0, 0,
		-Math.sin(theta), 0, -Math.cos(theta), 0,
		0, 0, 0, 1
	];
	let imatrix = [
		Math.cos(-theta), 0, Math.sin(-theta), 0,
		0, 1, 0, 0,
		-Math.sin(-theta), 0, -Math.cos(-theta), 0,
		0, 0, 0, 1
	];
	gl.uniformMatrix4fv(location, false, matrix);
	gl.uniformMatrix4fv(ilocation, false, imatrix);

	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	const vertexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);

	const coord = gl.getAttribLocation(prog, "c");
	gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(coord);

    var color = new Float32Array(color_array);
	var color_buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color_buf);
    gl.bufferData(gl.ARRAY_BUFFER, color, gl.STATIC_DRAW);
    var color = gl.getAttribLocation(prog, "a_color");
    gl.enableVertexAttribArray(color);
    gl.vertexAttribPointer(color, 4, gl.FLOAT, false, 0, 0);

	gl.drawArrays(gl.POINTS, 0, vertex_count);
	gl.drawArrays(gl.LINES, vertex_count, edge_count * 2);
};
document.addEventListener('DOMContentLoaded', () => {
	init();
	regenerate();
});
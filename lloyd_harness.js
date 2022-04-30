

let pts = [];
let mesh;
let regenerate = () => {
	rawPts = [];
	let n = parseInt(document.getElementById("vertexCount").value);
	for (let i = 0; i < n; i++) {
		rawPts.push(...invertToPlane(randomSpherePoint()));
	}
	mesh = new Delaunator(rawPts);
	rerender();
}

let rerender = () => {
	resetColors();
	redraw();	
}

let tick = () => {
	let startTime = Date.now();
	relax(mesh);
	let postRelaxTime = Date.now();
	mesh.update();
	document.getElementById('time').innerHTML = `Relaxation time: ${postRelaxTime - startTime}ms
	Triangulation time: ${Date.now() - postRelaxTime}ms`;
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
	new Delaunator(flattened);
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
		uniform mat3 rotation_matrix;
		void main(void) {
			gl_Position = vec4(rotation_matrix * c, 1.1);
			v_color = a_color;
			v_c = vec4(rotation_matrix * c, 1.1);
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

	canvas = document.getElementById('testCanvas');
}

let coords, color_array, vertex_count, edge_count;
function resetColors () {
	// Rendering shizz

	coords = [];
	color_array = [];
	vertex_count = 0;
	edge_count = 0;

	for (let i = 0; i < mesh.coords.length / 2; i++) {
		coords.push(...invertFromPlane([mesh.coords[2 * i], mesh.coords[2 * i + 1]]));
		color_array.push(0, 0, 1, 1);
		vertex_count++;
	}
	coords.push(0, 0, 1);
	color_array.push(0, 0, 1, 1);
	vertex_count++;

	for (let i = 0; i < mesh.triangles.length; i+=3) {
		for (let j = 0; j < 3; j++) {
			let idx = mesh.triangles[i + j];
			let idx2 = mesh.triangles[i + (j+1)%3];
			coords.push(...invertFromPlane([mesh.coords[2 * idx], mesh.coords[2 * idx + 1]]));
			coords.push(...invertFromPlane([mesh.coords[2 * idx2], mesh.coords[2 * idx2 + 1]]));
			color_array.push(0, 0, 0.5, 1);
			color_array.push(0, 0, 0.5, 1);
			edge_count++;
		}
	}
	mesh.hull.forEach(idx => {
		coords.push(...invertFromPlane([mesh.coords[2 * idx], mesh.coords[2 * idx + 1]]));
		coords.push(0, 0, 1);
		color_array.push(0, 0, 0.5, 1);
		color_array.push(0, 0, 0.5, 1);
		edge_count++;
	})

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
}

let fixedPerspective = [
	1, 0, 0,
	0, 1, 0,
	0, 0, 1,
];
let scrollMatrix = [
	1, 0, 0,
	0, 1, 0,
	0, 0, 1,
];

function redraw(event) {

	let location = gl.getUniformLocation(prog, "rotation_matrix");
	let theta = 0; //uniforms.u_mouse.value[0] / 500;
	let matrix = mmult(fixedPerspective, scrollMatrix);
	gl.uniformMatrix3fv(location, false, matrix);

	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.drawArrays(gl.POINTS, 0, vertex_count);
	gl.drawArrays(gl.LINES, vertex_count, edge_count * 2);
};

document.addEventListener('DOMContentLoaded', () => {
	init();
	regenerate();
});

let scrolling = false;
let anchorX = null;
let anchorY = null;
document.addEventListener('mousedown', event => {
	scrolling = true;
	let elt = document.getElementById("testCanvas");
	let midptX = elt.clientLeft + elt.clientWidth / 2;
	let midptY = elt.clientTop + elt.clientHeight / 2;
	anchorX = event.clientX - midptX;
	anchorY = midptY - event.clientY;
});

document.addEventListener('mousemove', event => {
	if (scrolling) {
		let elt = document.getElementById("testCanvas");
		let midptX = elt.clientLeft + elt.clientWidth / 2;
		let midptY = elt.clientTop + elt.clientHeight / 2;
		let anchor = [anchorX, anchorY, 500];
		let scrollPt = [event.clientX - midptX, midptY - event.clientY, 500];
		let axis = normalize(cross(anchor, scrollPt));
		let theta = Math.acos(dot(anchor, scrollPt) / norm(scrollPt) / norm(anchor));
		scrollMatrix = rotationMatrix(theta, axis[0], axis[1], axis[2]);
		redraw();
	}
});

document.addEventListener('mouseup', event => {
	scrolling = false;
	fixedPerspective = mmult(fixedPerspective, scrollMatrix);
});
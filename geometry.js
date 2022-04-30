let sum = l => l.reduce((a, b) => a + b, 0)

function sumVectors(vectors) {
	if (vectors.length === 0)
		return [0, 0, 0];
	let l = vectors[0].length;
	let output = [];
	for (let i = 0; i < l; i++) {
		output[i] = sum(vectors.map(v => v[i]));
	}
	return output;
}
let scale = factor => vector => vector.map(i => i * factor);
let sub = (a, b) => sumVectors([a, scale(-1)(b)])

let norm2 = vector => sum(vector.map(x => x ** 2));
let norm = vector => Math.sqrt(norm2(vector));
let normalize = vector => {
	let vNorm = Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
	return vNorm === 0 ? vector : [vector[0] / vNorm, vector[1] / vNorm, vector[2] / vNorm];
}
let dot = (A, B) => sum(A.map((x, i) => x * B[i]));
let cross = (A, B) => A.map((_, i) =>
	A[(i+1) % 3] * B[(i+2) % 3] - B[(i+1) % 3] * A[(i+2) % 3]
);
let signedArea = (vectors) => 0.5 * sum(vectors.map((v, i) =>
	v[0] * (vectors[(i+1) % vectors.length][1] -
		vectors[(vectors.length + (i-1) % vectors.length) % vectors.length][1])
));

let randomSpherePoint = () => {
	let theta = Math.random() * 2 * Math.PI;
	let phi = Math.asin(1 - Math.random() * 2);
	return [Math.cos(phi) * Math.cos(theta), Math.cos(phi) * Math.sin(theta), Math.sin(phi)];
}

let invertToPlane = pt => {
	let factor = 1 / (1 - pt[2]);
	return [factor * pt[0], factor * pt[1]];
}

let invertFromPlane = pt => {
	let factor = 1 / (pt[0] ** 2 + pt[1] ** 2 + 1);
	return [2 * pt[0] * factor, 2 * pt[1] * factor, (pt[0] ** 2 + pt[1] ** 2 - 1) * factor];
}

function mmult(a, b) {
	let out = [];
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			out[3 * i + j] = 0;
			for (let k = 0; k < 3; k++) {
				out[3 * i + j] += a[3 * i + k] * b[3 * k + j];
			}
		}
	}
	return out;
}

function mmult4(a, b) {
	let out = [];
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			out[4 * i + j] = 0;
			for (let k = 0; k < 4; k++) {
				out[4 * i + j] += a[4 * i + k] * b[4 * k + j];
			}
		}
	}
	return out;
}

function msum(matrices) {
	return matrices[0].map((_, i) => matrices.map(m => m[i]).reduce((a, b) => a + b, 0));
}

function mscale(scalar, matrix) {
	return matrix.map(i => i * scalar);
}

function apply (matrix) {
	let out = input => {
		let result = [];
		for (let i = 0; i < 3; i++) {
			result[i] = matrix[3 * i + 0] * input[0] + matrix[3 * i + 1] * input[1] + matrix[3 * i + 2] * input[2];
		}
		return result;
	}
	return out;
}

function pivotAroundPoint(pivot) {
	let v = [pivot[1], -pivot[0], 0];
	let matrix = [
		0, 0, -pivot[0],
		0, 0, -pivot[1],
		pivot[0], pivot[1], 0
	];
	let c = pivot[2];
	let rotation_matrix = msum([[
		1, 0, 0,
		0, 1, 0,
		0, 0, 1
	], matrix, mscale(1 / (1 + c), mmult(matrix, matrix))]);

	return apply(rotation_matrix);
}

function dist2(p1, p2) {
	return (p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2;
}

function getCircumcenter(a, b, c) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const ex = c[0] - a[0];
    const ey = c[1] - a[1];
    const ez = c[2] - a[2];

    const bl = dx * dx + dy * dy + dz * dz;
    const cl = ex * ex + ey * ey + ez * ez;
    const dot = dx * ex + dy * ey + dz * ez;

    const k1 = 0.5 * cl * (bl - dot) / (bl * cl - dot * dot);
    const k2 = 0.5 * bl * (cl - dot) / (bl * cl - dot * dot);

	return [a[0] + k1 * dx + k2 * ex,
			a[1] + k1 * dy + k2 * ey,
			a[2] + k1 * dz + k2 * ez];
}

function rotationMatrix(angle, ax, ay, az) {
	let cos = Math.cos(angle);
	let sin = Math.sin(angle);
	return [
		cos + ax * ax * (1 - cos), ax * ay * (1-cos) - az * sin, ax * az * (1 - cos) + ay * sin,
		ay * ax * (1-cos) + az * sin, cos + ay * ay * (1-cos), ay * az * (1-cos) - ax * sin,
		az * ax * (1-cos) - ay * sin, az * ay * (1-cos) + ax * sin, cos + az * az * (1-cos)
	];
}
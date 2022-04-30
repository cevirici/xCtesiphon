
function randomSpherePoint() {
	let theta = Math.random() * 2 * Math.PI;
	let phi = Math.asin(1 - Math.random() * 2);
	return [Math.cos(phi) * Math.cos(theta), Math.cos(phi) * Math.sin(theta), Math.sin(phi)];
}

function invertToPlane(x, y, z) {
	let factor = 1 / (1 - z);
	return [factor * x, factor * y];
}

function genPts(n) {
	let buf = new ArrayBuffer(8 * n);
	let pts = new Float32Array(buf);
	for (let i = 0; i < n; i++) {
		let pt = invertToPlane(...randomSpherePoint());
		pts[2 * i] = pt[0];
		pts[2 * i + 1] = pt[1];
	}
	return pts;
}

function invertFromPlane(x, y) {
	let factor = 1 / (x ** 2 + y ** 2 + 1);
	return [2 * x * factor, 2 * y * factor, (x ** 2 + y ** 2 - 1) * factor];
}

function dist(a, b) {
	return Math.pow(a.map((c, i) => (c - b[i]) ** 2).reduce((x, y) => x + y, 0), 0.5);
}

function dot(a, b) {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vadd(a, b) {
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vsub(a, b) {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0]
	];
}

function getCircumcenter(a, b, c) {
	let lenA = dist(b, c);
	let lenB = dist(a, c);
	let lenC = dist(a, b);

	let factorA = lenA ** 2 * (lenB ** 2 + lenC ** 2 - lenA ** 2);
	let factorB = lenB ** 2 * (lenA ** 2 + lenC ** 2 - lenB ** 2);
	let factorC = lenC ** 2 * (lenA ** 2 + lenB ** 2 - lenC ** 2);
	let factorSum = factorA + factorB + factorC;

	let out = [];
	for (let i = 0; i < a.length; i++) {
		out[i] = (a[i] * factorA + b[i] * factorB + c[i] * factorC) / factorSum;
	}
	return out;
}

function projectToSphere(x, y, z) {
	let r = Math.pow(x ** 2 + y ** 2 + z ** 2, 0.5);
	return [x / r, y / r, z / r];
}

function getCentroid(points) {
	let out = points[0].map(_ => 0);
	points.forEach(point => {
		point.forEach((_, i) => out[i] += point[i] / points.length);
	})
	return out;
}

// PROBLEM: zero point not being shifted under lloyd relaxation is causing weirdness
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

function lloydRelaxation(del) {
	let circumcenters = {};
	for (let i = 0; i < del.triangles.length; i += 3) {
		let pts = [i, i+1, i+2].map(j => [del.coords[2 * del.triangles[j]], del.coords[2 * del.triangles[j] + 1]]).map(c => invertFromPlane(...c));
		let circumcenter = projectToSphere(...getCircumcenter(...pts));

		[i, i+1, i+2].forEach(j => {
			if (!(del.triangles[j] in circumcenters))
				circumcenters[del.triangles[j]] = [];
			circumcenters[del.triangles[j]].push(circumcenter);
		});
	}

	let zeroCircumcenters = [];

	for (let i = 0; i < del.hull.length; i++) {
		let nextIdx = (i+1) % del.hull.length;
		let pts = [i, nextIdx].map(j => [del.coords[2 * del.hull[j]], del.coords[2 * del.hull[j] + 1]]).map(c => invertFromPlane(...c));
		let circumcenter = projectToSphere(...getCircumcenter(...pts, [0, 0, 1]));

		[i, nextIdx].forEach(j => {
			if (!(del.hull[j] in circumcenters))
				circumcenters[del.hull[j]] = [];
			circumcenters[del.hull[j]].push(circumcenter);
		});
		zeroCircumcenters.push(circumcenter);
	}

	let zeroCentroid = projectToSphere(...getCentroid(zeroCircumcenters));
	let rotator = pivotAroundPoint(zeroCentroid);

	Object.keys(circumcenters).forEach(i => {
		let centroid = invertToPlane(...projectToSphere(...rotator(getCentroid(circumcenters[i]))));
		del.coords[2 * i] = centroid[0];
		del.coords[2 * i + 1] = centroid[1];
	})
	test.update();
}

class Province {
	constructor(index, coords) {
		this.index = index;
		this.coords = coords;
	}
}

function getVoronois(del) {
	let circumcenters = [];
	for (let i = 0; i < del.triangles.length; i += 3) {
		let pts = [i, i+1, i+2].map(j => [del.coords[2 * del.triangles[j]], del.coords[2 * del.triangles[j] + 1]]).map(c => invertFromPlane(...c));
		let circumcenter = projectToSphere(...getCircumcenter(...pts));
		circumcenters.push(circumcenter);
	}

	let hullCircumcenters = [];
	for (let i = 0; i < del.hull.length; i++) {
		let nextIdx = (i+1) % del.hull.length;
		let pts = [i, nextIdx].map(j => [del.coords[2 * del.hull[j]], del.coords[2 * del.hull[j] + 1]]).map(c => invertFromPlane(...c));
		let circumcenter = projectToSphere(...getCircumcenter(...pts, [0, 0, 1]));
		hullCircumcenters.push(circumcenter);
	}

	let hullToIndex = {};
	// Register correspondences for halfedges on hull
	del.halfedges.forEach((h, i) => {
		if (h === -1) {
			let nextIdx = i % 3 === 2 ? i - 2 : i + 1;
			let key = [del.triangles[i], del.triangles[nextIdx]];
			if (key[0] > key[1])
				key = [key[1], key[0]];
			hullToIndex[key] = i;
		}
	})

	let voronois = [];
	let adjacencies = [];
	let n = del.coords.length / 2;
	for (let i = 0; i < n; i++) {
		adjacencies[i] = [];
	}
	adjacencies[n] = [];

	let logAdjacency = (a, b) => {
		if (!adjacencies[a].includes(b)) {
			adjacencies[a].push(b);
			adjacencies[b].push(a);
		}
	}

	for (let centerIdx = 0; centerIdx < del.hull.length; centerIdx++) {
		let center = del.hull[centerIdx];
		let halfEdge = del._hullTri[center];
		let newVertex = del._hullNext[center];
		voronois[center] = [-(newVertex + 1)];
		logAdjacency(center, n);
		let vertices = [];
		while(!(vertices.includes(newVertex)) && halfEdge !== -1) {
			vertices.push(newVertex);
			logAdjacency(center, newVertex);
			let triangleStart = halfEdge - (halfEdge % 3);
			voronois[center].push(triangleStart);
			let vertexIndex = [triangleStart, triangleStart + 1, triangleStart + 2].find(idx => ![center, newVertex].includes(del.triangles[idx]));
			newVertex = del.triangles[vertexIndex];
			halfEdge = del.halfedges[vertexIndex];
		}
		voronois[center].push(-(newVertex + 1));
		logAdjacency(center, newVertex);
	}

	for (let i = 0; i < del.halfedges.length; i++) {
		let center = del.triangles[i];
		if (!(center in voronois)) {
			voronois[center] = [];
			let halfEdge = i;
			let newVertex = del.triangles[del.halfedges[i]];
			let vertices = [];
			while(!(vertices.includes(newVertex))) {
				vertices.push(newVertex);
				logAdjacency(center, newVertex);
				let triangleStart = halfEdge - (halfEdge % 3);
				voronois[center].push(triangleStart);
				let vertexIndex = [triangleStart, triangleStart + 1, triangleStart + 2].find(idx => ![center, newVertex].includes(del.triangles[idx]));
				newVertex = del.triangles[vertexIndex];
				halfEdge = del.halfedges[vertexIndex];
			}
		}
	}

	let provinces = voronois.map((v, center) => {
		let coords = [];
		v.forEach(t => {
			if (t >= 0) {
				let pts = [t, t+1, t+2].map(j => [del.coords[2 * del.triangles[j]], del.coords[2 * del.triangles[j] + 1]]).map(c => invertFromPlane(...c));
				coords.push(projectToSphere(...getCircumcenter(...pts)));
			} else {
				let pts = [center, -t - 1].map(j => [del.coords[2 * j], del.coords[2 * j + 1]]).map(c => invertFromPlane(...c));
				pts.push([0, 0, 1]);
				coords.push(projectToSphere(...getCircumcenter(...pts)));
			}
		})
		coords.push(invertFromPlane(del.coords[2 * center], del.coords[2 * center + 1]));
		return new Province(center, coords);
	})
	let poleProvPoints = hullCircumcenters.map(pt => projectToSphere(...pt)).reverse();
	poleProvPoints.push([0, 0, 1]);
	provinces[n] = new Province(n, poleProvPoints);
	provinces.forEach(p => {
		p.adjacencies = adjacencies[p.index].map(idx => provinces[idx]);
	})
	provinces[n].adjacencies = [];
	del.hull.forEach(idx => {
		provinces[n].adjacencies.push(provinces[idx]);
	});

	return provinces;
}

class Plate {
	constructor(index) {
		this.index = index;
		this.provinces = [];
		this.adjacencies = [];
	}

	addProvince(province) {
		this.provinces.push(province);
		province.plate = this;
		let newAdjacencies = province.adjacencies;
		newAdjacencies.forEach(newAdjacency => {
			if (!this.provinces.includes(newAdjacency) && !this.adjacencies.includes(newAdjacency))
				this.adjacencies.push(newAdjacency);
		});
		let index = this.adjacencies.indexOf(province);
		if (index > -1)
			this.adjacencies.splice(index, 1);
	}

	removeProvince(province) {
		this.provinces.splice(this.provinces.indexOf(province));
		province.adjacencies.forEach(neighbor => {
			let index = this.adjacencies.includes(neighbor);
			if (index > -1 && !neighbor.adjacencies.some(p => this.provinces.includes(p))) {
				this.adjacencies.splice(index, 1);
			}
		})
	}
}

function generatePlates(provinces, n) {
	let centers = [];
	if (n >= provinces.length) {
		console.error("too many plates");
		return;
	}
	for (let i = 0; i < n; i++) {
		let center;
		do {
			center = Math.floor(Math.random() * provinces.length);
		} while (center in centers);
		centers.push(center);
	}
	
	let plates = [];
	let count = centers.length;
	centers.forEach((i, idx) => {
		plates.push(new Plate(idx));
		plates[idx].addProvince(provinces[i]);
	});
	while (count < provinces.length) {
		let oldCount = count;
		plates.forEach(plate => {
			let possibleNeighbors = plate.adjacencies.filter(neighbor => typeof(neighbor.plate) === "undefined");
			possibleNeighbors.forEach(neighbor => {
				plate.addProvince(neighbor);
				count++
			});
		})
	}

	return plates;
}

function smoothPlates () {
	provinces.forEach(p => {
		freqs = {};
		p.adjacencies.forEach(neighbor => {
			if (typeof(neighbor.plate) === "undefined")
				console.log(neighbor)
			let plateIdx = neighbor.plate.index;
			if (!(plateIdx in freqs))
				freqs[plateIdx] = 0;
			freqs[plateIdx]++;
		})
		let plateIndices = Object.keys(freqs);
		plateIndices.sort((a, b) => freqs[b] - freqs[a]);
		if (!(p.plate.index in freqs) || freqs[p.plate.index] < freqs[plateIndices[0]]) {
			p.plate.removeProvince(p);
			plates[plateIndices[0]].addProvince(p);
		}
	})
}

let OCEAN_FREQUENCY = 0.5;
let VARIANCE = 0.1;
let BASE_HEIGHT = 0.05;

function smoothing(neighbor_weight, internal=false) {
	provinces.forEach(province => {
		let relevantNeighbors = internal ? province.adjacencies.filter(n => n.plate === province.plate) : province.adjacencies;
		province._averagedElevation = (province.elevation + neighbor_weight * relevantNeighbors.map(p => p.elevation).reduce((a, b) => a + b, 0)) / (1 + neighbor_weight * relevantNeighbors.length);

	})

	provinces.forEach(province => {
		province.elevation = province._averagedElevation;
	});
}

function tectonics(plates) {
	plates.forEach(plate => {
		plate.isOceanic = Math.random() < OCEAN_FREQUENCY;
		plate.avgElevation = (plate.isOceanic ? -Math.random() * BASE_HEIGHT - 0.5 : (Math.random() - 0.2) * BASE_HEIGHT);
		plate.axis = randomSpherePoint();
		plate.rate = Math.random();
	})

	provinces.forEach(province => {
		province._tectonicVector = mscale(province.plate.rate, cross(province.plate.axis, province.coords[province.coords.length - 1]));
	})
	provinces.forEach(province => {
		let relevantNeighbors = province.adjacencies//.filter(n => n.plate !== province.plate);
		if (relevantNeighbors.length > 0) {
			province._tectonicStress = relevantNeighbors.map(n => {
				let displacement = vsub(province.coords[province.coords.length - 1], n.coords[n.coords.length - 1]);
				return Math.pow(dot(vsub(n._tectonicVector, province._tectonicVector), displacement), 2) / dot(displacement, displacement);
			}).reduce((a, b) => a + b, 0);
			province._tectonicStress /= relevantNeighbors.length;
		} else
			province._tectonicStress = 0;
	})

	provinces.forEach(province => {
		province.elevation = province.plate.avgElevation + 4 * VARIANCE * (Math.random() - 0.5);
	})

	for (let i = 0; i < 10; i++) {
		smoothing(0.3, true);
	}

	provinces.forEach(province => {
		province.elevation = province.elevation + VARIANCE * (Math.random() - 0.5);
	})

	smoothing(0.2);

	provinces.forEach(province => {
		province.elevation = province.elevation + Math.sqrt(province._tectonicStress) * (Math.random() ** 2) ;
	})

	smoothing(0.1);

	provinces.forEach(province => {
		province.elevation = Math.min(Math.max(province.elevation, -1), 1);
	})
}

function smooth_currents(neighbor_weight) {
	provinces.forEach(province => {
		province._averagedWind = mscale(1/ (1 + neighbor_weight),
			vadd(province.windVector,
					mscale(neighbor_weight / province.adjacencies.length, province.adjacencies.map(p => p.windVector).reduce(vadd, [0, 0, 0]))));
	})

	provinces.forEach(province => {
		province.windVector = province._averagedWind;
	});

}

function currents(provinces) {
	provinces.forEach(province => {
		let alt = province.coords[province.coords.length - 1][1];
		let elevationFactor = province.elevation < 0 ? 0.5 : province.elevation ** 0.5;
		province.pressure = Math.sqrt((elevationFactor + (2 * (0.5 - Math.abs(Math.abs(alt) - 0.5))) ** 3) / 2);
	})

	provinces.forEach(province => {
		let windVector = [0, 0, 0];
		let centerCoords = province.coords[province.coords.length - 1];
		province.adjacencies.forEach(n => {
			let displacement = vsub(centerCoords, n.coords[n.coords.length - 1]);
			let weight = 3 * (n.pressure - province.pressure);
			windVector = vadd(windVector, mscale(weight, displacement));
		})
		let hadley_deflection = dot(windVector, [0, centerCoords[1] > 0 ? 1 : -1, 0]);
		province.windVector = vadd(windVector, mscale(hadley_deflection, cross([0, 1, 0], centerCoords)));
	})
	for(let i = 0; i < 10; i++) {
		smooth_currents(1);
	}

}

function smooth_temp(neighbor_weight) {
	provinces.forEach(province => {
		province._averagedTemp = (province.temperature + neighbor_weight * province.adjacencies.map(p => p.temperature).reduce((a, b) => a + b, 0)) / (1 + neighbor_weight * province.adjacencies.length);
	})

	provinces.forEach(province => {
		province.temperature = province._averagedTemp;
	});
}

function spread_moisture() {
	provinces.forEach(province => {
		if (province.elevation < 0)
			province.moisture = 0.6 + 0.4 * province.temperature;
		province._incomingMoisture = 0;
	});
	provinces.forEach(province => {
		province.moisture *= (province.elevation < 0 ? 1 : 1 - 0.3 * province.elevation ** 2);
		let totalOutgoingWeight = province.adjacencies.map(n => {
			let displacement = vsub(n.coords[n.coords.length - 1], province.coords[province.coords.length - 1]);
			let dot_weight = dot(displacement, province.windVector) + 0.001;
			return dot_weight > 0 ? dot_weight : 0;
		}).reduce((a, b) => a + b, 0);
		province.adjacencies.forEach(n => {
			let displacement = vsub(n.coords[n.coords.length - 1], province.coords[province.coords.length - 1]);
			let dot_weight = dot(displacement, province.windVector) + 0.001;
			if (dot_weight > 0)
				n._incomingMoisture += province.moisture * dot_weight / totalOutgoingWeight * 2 * Math.pow(dot(province.windVector, province.windVector), 0.1);
		})
	})

	provinces.forEach(province => {
		province.moisture = province._incomingMoisture;
	});
}

function climate(provinces) {
	provinces.forEach(province => {
		province.temperature = 0.55 + 0.45 * Math.cos(Math.PI * province.coords[province.coords.length - 1][1]);
		if (province.elevation < 0)
			province.temperature = (0.5 + province.temperature) / 2
		else if (province.elevation > 0.1)
			province.temperature -= 6 * (province.elevation - 0.1);
	})

	for (let i = 0; i < 2; i++) {
		smooth_temp(0.3);
	}
	provinces.forEach(province => {
		province.moisture = 0;
	});

	for (let i = 0; i < 10; i++) {
		spread_moisture();
	}
}

function color_provinces(provinces) {
	provinces.forEach(province => { 
		if (province.temperature < 0.2) {
			province.color = [1 - 2 * province.temperature, 1 - 2 * province.temperature, 1 - 2 * province.temperature, 1];
		} else if (province.elevation < 0) {
			province.color = [0.4 + 0.4 * province.elevation, 0.4 + 0.4 * province.elevation, 0.9 + 0.7 * province.elevation, 1];
		} else if (province.elevation > 0.3) {
			province.color = [0.2 + 0.6 * province.elevation, 0.2 + 0.6 * province.elevation, 0.2 + 0.6 * province.elevation, 1];
		} else if (province.moisture * province.temperature > 0.4) {
			province.color = [0.2 - 0.2 * province.moisture * province.temperature, 0.4, 0.2 - 0.2 * province.moisture * province.temperature, 1];
		} else if (province.moisture < 0.02) {
			province.color = [0.9 + 0.1 * province.temperature, 0.7 + 0.2 * province.temperature, 0.5 + 0.1 * province.temperature, 1];			
		} else if (province.moisture < 0.07) {
			province.color = [0.7 + 0.1 * province.temperature, 0.7 + 0.2 * province.temperature, 0.5 + 0.1 * province.temperature, 1];			
		} else {
			province.color = [0.2, 0.5 + 0.2 * province.moisture * province.temperature, 0.2, 1];		
		}
	});
}

let NUM_PROVS = 10000;
let RELAXATIONS = 20;
let PLATES = 40;
let PLATE_SMOOTHINGS = 10;
let test = new Delaunator(genPts(NUM_PROVS));
console.log("lloyd relaxation");
for (let i = 0; i < RELAXATIONS; i++) {
	lloydRelaxation(test);
}
console.log("computing coords");
let provinces = getVoronois(test);
console.log("plate generation");
let plates = generatePlates(provinces, PLATES);
console.log("plate smoothing");
for (let i = 0; i < PLATE_SMOOTHINGS; i++) {
	smoothPlates();
}
console.log("tectonics");
tectonics(plates);

console.log("climate");
currents(provinces);
climate(provinces);

color_provinces(provinces);

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
			gl_Position = rotation_matrix * vec4(c, 1.1);
			v_color = a_color;
			v_c = irotation_matrix * vec4(c, 1.1);
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

let coords, color_array, triangle_count;
function resetColors () {
	// Rendering shizz

	coords = [];
	lines = [];
	color_array = [];
	triangle_count = 0;

	Object.values(provinces).forEach((p, i) => {
		let v = p.coords;
		let factor = p.elevation < 0 ? 1 : 1;
		for (let i = 0; i < v.length - 1; i++) {
			coords.push(...mscale(factor, v[v.length - 1]));
			coords.push(...v[i]);
			coords.push(...v[(i + 1) % (v.length - 1)]);
			color_array.push(...p.color);
			color_array.push(...p.color);
			color_array.push(...p.color);
			triangle_count++;
		}
	})

	// Object.values(provinces).forEach((p, i) => {
	// 	let v = p.coords;
	// 	for (let i = 0; i < v.length - 1; i++) {
	// 		coords.push(...v[i]);
	// 		coords.push(...v[(i + 1) % (v.length - 1)]);
	// 		color_array.push(0, 0, 0, 1);
	// 		color_array.push(0, 0, 0, 1);
	// 	}
	// })

	Object.values(provinces).forEach((p, i) => {
		let c = p.coords[p.coords.length - 1];
		let cross_prod = mscale(0.5, cross(c, p.windVector));
		coords.push(...vsub(c, cross_prod));
		coords.push(...vadd(c, mscale(2, p.windVector)));
		coords.push(...vadd(c, cross_prod));
		color_array.push(0, 0, 0.5, 1);
		color_array.push(0, 0, 0.5, 1);
		color_array.push(0, 0, 0.5, 1);
	})
}

function redraw(event) {
	canvas = document.getElementById('testCanvas');

	let location = gl.getUniformLocation(prog, "rotation_matrix");
	let ilocation = gl.getUniformLocation(prog, "irotation_matrix");
	let theta = uniforms.u_mouse.value[0] / 500;
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

	gl.drawArrays(gl.TRIANGLES, 0, triangle_count * 3);
	// gl.drawArrays(gl.LINES, triangle_count * 3, triangle_count * 2);
	gl.drawArrays(gl.TRIANGLES, triangle_count * 3, provinces.length * 3);

};
document.addEventListener('DOMContentLoaded', () => {
	init();
	resetColors();
	redraw();

	setTimeout(() => {
		setInterval(spinny, 20);
	}, 1000);

	// document.addEventListener("mousemove", onMouseMove, false);
});

// spinny

function onMouseMove(event) {
	// Update the mouse uniform
	uniforms.u_mouse.value[0] = event.pageX;
	uniforms.u_mouse.value[1] = window.innerHeight - event.pageY;
	redraw();
}

function spinny() {
	uniforms.u_mouse.value[0] += 1;
	redraw();
}
let computePole = delaunayMesh => {
	let points = [];
	delaunayMesh.hull.forEach(idx => {
		let point = [delaunayMesh.coords[2 * idx], delaunayMesh.coords[2 * idx + 1]];
		points.push(invertFromPlane(point));
	});
	return normalize(sumVectors(points));
}

let computeProjections = delaunayMesh => {
	let correctionMatrix = pivotAroundPoint(computePole(delaunayMesh));
	let projections = [];
	for (let i = 0; i < delaunayMesh.coords.length / 2; i++) {
		projections.push(correctionMatrix(invertFromPlane(
			[delaunayMesh.coords[2 * i], delaunayMesh.coords[2 * i + 1]]
		)));
	}
	return projections;
}

let computeCircumcenters = (delaunayMesh, projections) => {
	let circumcenters = [];
	let incidences = {};
	for (let i = 0; i < delaunayMesh.triangles.length; i += 3) {
	    circumcenters.push(normalize(getCircumcenter(
	        projections[delaunayMesh.triangles[i]],
	        projections[delaunayMesh.triangles[i + 1]],
	        projections[delaunayMesh.triangles[i + 2]]
	    )));

	    for (let idx = i; idx < i + 3; idx++) {
	    	let n = delaunayMesh.triangles[idx];
	    	if (!(n in incidences))
	    		incidences[n] = [];
	    	incidences[n].push(i / 3);
	    }
	}
	return [circumcenters, incidences];
}

let computePolarCircumcenters = (delaunayMesh, projections) => {
	let circumcenters = [];
	let incidences = {};
	let totalTime = 0;
	for (let i = 0; i < delaunayMesh.hull.length; i++) {
	    circumcenters.push(normalize(getCircumcenter(
	        [0, 0, 1],
	        projections[delaunayMesh.hull[i]],
	        projections[delaunayMesh.hull[(i+1) % delaunayMesh.hull.length]]
	    )));

	    for (let idx = i; idx < i + 2; idx++) {
	    	let n = delaunayMesh.hull[idx % delaunayMesh.hull.length];
	    	if (!(n in incidences))
	    		incidences[n] = [];
	    	incidences[n].push(i);
	    }
	}
	return [circumcenters, incidences];
}

let getRelaxedPoint = (mesh) => {
	let projections = computeProjections(mesh);
	const [circumcenters, incidences] = computeCircumcenters(mesh, projections);
	const [polarCircumcenters, polarIncidences] = computePolarCircumcenters(mesh, projections);
	return i => {
		let total = [0, 0, 0];
		incidences[i].forEach(idx => {
			let center = circumcenters[idx];
			for (let j = 0; j < 3; j++)
				total[j] += center[j];
		});

		if (i in polarIncidences) {
			polarIncidences[i].forEach(idx => {
				let center = polarCircumcenters[idx];
				for (let j = 0; j < 3; j++)
					total[j] += center[j];
			});
		}
		return invertToPlane(normalize(total));
	};
}

let relax = mesh => {
	let relaxer = getRelaxedPoint(mesh);
	for (let i = 0; i < mesh.coords.length / 2; i++) {
		let relaxedPoint = relaxer(i);
		mesh.coords[2 * i] = relaxedPoint[0];
		mesh.coords[2 * i + 1] = relaxedPoint[1];
	}
}
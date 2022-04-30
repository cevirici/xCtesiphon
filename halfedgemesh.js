class GeometricObject {
	constructor(index) {
		this.index = index;
	}
}

class Halfedge extends GeometricObject {
	constructor(index) {
		super(index);
		this.vertex = null;
		this.edge = null;
		this.triangle = null;
		this.twin = null;
		this.next = null;
	}
}
class Vertex extends GeometricObject {
	constructor(index, pos) {
		super(index);
		this.pos = pos;
	}

	// Finds a halfedge "pointing" to that. If there isn't one return null.
	seek(that) {
		let h = this.halfedge;
		while (h.next.vertex !== that) {
			h = h.twin.next;
			if (h === this.halfedge)
				return null;
		}
		return h;
	}

	dist2(that) {
		let p1 = this.pos;
		let p2 = that.pos;
		return (p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2;
	}
}
let isClockwise = vertices => signedArea(vertices.map(x => x.pos)) < 0;
class Edge extends GeometricObject {
	get length2() {
		let p1 = this.halfedge.vertex.pos;
		let p2 = this.halfedge.twin.vertex.pos;
		return (p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2;
	}
	get length() {
		let p1 = this.halfedge.vertex.pos;
		let p2 = this.halfedge.twin.vertex.pos;
		return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
	}
}
class Triangle extends GeometricObject {
	get vertices() {
		let vertices = [];
		let h = this.halfedge;
		do {
			vertices.push(h.vertex);
			h = h.next;
		} while (h !== this.halfedge);
		return vertices;
	}
	area() {
		return signedArea(this.vertices.map(x => x.pos));
	}
}

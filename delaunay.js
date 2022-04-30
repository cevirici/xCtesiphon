SMALL_NUMBER = 10e-5;
// Todo - collinear edgecase on initialization

class DelaunayMesh {
	constructor(positions) {
		this.lowConvexHull = new DLL();
		this.advancingFront = new AdvancingFront(5);
		this.halfedges = [];
		this.vertices = [];
		this.edges = [];
		this.triangles = [];

		this.unprocessedPositions = positions;
		this.isCapped = false;

		this.times = {};
	}

	clock(label, time) {
		if (!(label in this.times)) {
			this.times[label] = time;
		} else {
			this.times[label] += time;
		}
	}

	addHalfedge() {
		let h = new Halfedge(this.halfedges.length);
		this.halfedges.push(h);
		return h;
	}

	addEdge() {
		let e = new Edge(this.edges.length);
		this.edges.push(e);
		return e;
	}

	addVertex(position) {
		let v = new Vertex(this.vertices.length, position);
		this.vertices.push(v);
		return v;
	}

	addTriangle() {
		let t = new Triangle(this.triangles.length);
		this.triangles.push(t);
		return t;
	}

	addVertexToFront(vertex, preH, postH) {
		let node = new AdvancingFrontNode(vertex, preH);
		this.advancingFront.insert(node, postH);
		return node;
	}

	prependVertexToLCH(vertex) {
		let node = new DLLNode();
		node.vertex = vertex;
		this.lowConvexHull.prepend(node);
	}

	appendVertexToLCH(vertex) {
		let node = new DLLNode();
		node.vertex = vertex;
		this.lowConvexHull.append(node);
	}

	initialize() {
		if (this.unprocessedPositions.length <= 2)
			return;
		let n = 3;
		let initialSlice = this.unprocessedPositions.slice(0, 3);
		// while (Math.abs(signedArea(initialSlice)) < SMALL_NUMBER) {
		// 	initialSlice.push(this.unprocessedPositions[n]);
		// 	n++;
		// 	if (n > this.unprocessedPositions.length)
		// 		return;
		// }

		this.unprocessedPositions = this.unprocessedPositions.slice(n);
		let initialVertices = initialSlice.map(this.addVertex.bind(this));
		let l = initialVertices.length;
		let a = initialVertices[0];
		let b = initialVertices[l-2];
		let c = initialVertices[l-1];
		let vL, vR, vM;

		if (a.pos[0] < b.pos[0]) {
			if (a.pos[0] < c.pos[0]) {
				vL = a;
				[vR, vM] = b.pos[0] < c.pos[0] ? [c, b] : [b, c];
			} else {
				[vL, vR, vM] = [c, b, a];
			}
		} else {
			if (b.pos[0] < c.pos[0]) {
				vL = b;
				[vR, vM] = a.pos[0] < c.pos[0] ? [c, a] : [a, c];
			} else {
				[vL, vR, vM] = [c, a, b];
			}			
		}

		let tri = this.addTriangle();
		this.vertices.forEach((v, i) => {
			let n = this.vertices[(i+1) % this.vertices.length];

			let h1 = this.addHalfedge();
			let h2 = this.addHalfedge();
			let e = this.addEdge();

			e.halfedge = h1;
            v.halfedge = h1;
            h1.twin = h2;
            h2.twin = h1;
            h1.edge = e;
            h2.edge = e;
            h1.triangle = tri;
            h1.vertex = v;
            h2.vertex = n;
            tri.halfedge = h1;
		});

		this.vertices.forEach((v, i) => {
			let n = this.vertices[(i+1) % this.vertices.length];
			v.halfedge.next = n.halfedge;
			n.halfedge.twin.next = v.halfedge.twin;
		});

		if (tri.area() < 0) {
			tri.halfedge.triangle = null;
			tri.halfedge.next.triangle = null;
			tri.halfedge.next.next.triangle = null;

			tri.halfedge = tri.halfedge.twin;
			tri.halfedge.triangle = tri;
			tri.halfedge.next.triangle = tri;
			tri.halfedge.next.next.triangle = tri;
		}

		let hL2M = vL.seek(vM);
		let hM2L = hL2M.twin;
		let hM2R = vM.seek(vR);
		let hR2M = hM2R.twin;
		let hR2L = vR.seek(vL);
		let hL2R = hR2L.twin;

		if (isClockwise([vL, vR, vM])) {
			this.addVertexToFront(vL, hM2L, hL2R);
			this.addVertexToFront(vR, hL2R, hR2M);
			[vL, vM, vR].forEach(this.appendVertexToLCH.bind(this));
		} else {
			this.addVertexToFront(vL, hR2L, hL2M);
			this.addVertexToFront(vM, hL2M, hM2R);
			this.addVertexToFront(vR, hM2R, hR2L);
			[vL, vR].forEach(this.appendVertexToLCH.bind(this));
		}
	}

	legalize(v1, v2) {
		let h = v1.seek(v2);
		if (h === null || h.triangle === null || h.twin.triangle === null)
			return;

		let h1 = h.twin;
        let h2 = h.next;
        let h3 = h2.next;
        let h4 = h1.next;
        let h5 = h4.next;

        let e1 = h1.edge;
        let e2 = h2.edge;
        let e3 = h3.edge;
        let e4 = h4.edge;
        let e5 = h5.edge;

        let v3 = h3.vertex;
        let v4 = h5.vertex;

        let t1 = h.triangle;
        let t2 = h1.triangle;
        let cosA = (e2.length2 + e3.length2 - e1.length2) / (2.0 * e2.length * e3.length);
        let cosB = (e4.length2 + e5.length2 - e1.length2) / (2.0 * e4.length * e5.length);
        let sinA = Math.sqrt(1 - cosA ** 2);
        let sinB = Math.sqrt(1 - cosB ** 2);

        if (cosA * sinB + cosB * sinA < 0) {
            v1.halfedge = h4;
            v2.halfedge = h2;

            h2.next = h;
            h.next = h5;
            h5.next = h2;
            h.vertex = v3;

            h1.next = h3;
            h3.next = h4;
            h4.next = h1;
            h1.vertex = v4;

            h3.triangle = t2;
            h4.triangle = t2;
            h2.triangle = t1;
            h5.triangle = t1;

            t1.halfedge = h;
            t2.halfedge = h1;

            this.legalize(v1, v3);
            this.legalize(v3, v2);
            this.legalize(v2, v4);
            this.legalize(v4, v1);
        }
	}

	extrude(v, prev) {
		let h = prev.next;
		let h1 = this.addHalfedge();
        let h2 = this.addHalfedge();
        let h3 = this.addHalfedge();
        let h4 = this.addHalfedge();
        let e1 = this.addEdge();
        let e2 = this.addEdge();
        let tri = this.addTriangle();

        let v1 = h.vertex;
        let v2 = h.twin.vertex;

        h1.twin = h2;
        h2.twin = h1;
        h3.twin = h4;
        h4.twin = h3;

        prev.next = h2;
        h2.next = h4;
        h4.next = h.next;
        h.next = h3;
        h3.next = h1;
        h1.next = h;

        v.halfedge = h1;
        h1.vertex = v;
        h2.vertex = v1;
        h3.vertex = v2;
        h4.vertex = v;
        h1.edge = e1;
        h2.edge = e1;
        h3.edge = e2;
        h4.edge = e2;
        e1.halfedge = h1;
        e2.halfedge = h3;

        h.triangle = tri;
        h1.triangle = tri;
        h3.triangle = tri;
        tri.halfedge = h1;

        this.legalize(v1, v2);
        return [h2, h4];
	}

	bridge(prev) {
        let h = prev.next;
        let v = h.vertex;
        let n = h.next;
        let v1 = n.vertex;
        let v2 = n.next.vertex;

        if (h.triangle !== null || n.triangle !== null || h === null || n === null) {
        	console.log(h);
        	console.log(n);
        	console.log(v);
        	console.log(v1);
        	console.log(v2);
            console.error("bad bridge");
            return;
        }

        // h should be outward-facing, and h.next should be the other halfedge to be bridged.
        let h1 = this.addHalfedge();
        let h2 = this.addHalfedge();
        let e = this.addEdge();
        let tri = this.addTriangle();
        prev.next = h2;
        h2.next = n.next;
        n.next = h1;
        h1.next = h;
        h1.twin = h2;
        h2.twin = h1;

        h1.vertex = v2;
        h2.vertex = v;
        h1.edge = e;
        h2.edge = e;
        e.halfedge = h1;
        h.triangle = tri;
        n.triangle = tri;
        h1.triangle = tri;
        tri.halfedge = h1;

        this.legalize(v, v1);
        this.legalize(v1, v2);

        return h2;
    }

    rightBasinCheck(vNode) {
        let rNode = vNode.next;
        let v = vNode.vertex;
        if (rNode === null)
            return;
        let vR = rNode.vertex;
        let rrNode = rNode.next;
        if (rrNode === null)
            return;
        let vRR = rrNode.vertex;
        let yDiff = v.pos[1] - vRR.pos[1];
        let xDiff = vRR.pos[0] - v.pos[0];
        if (yDiff > xDiff) {
            let basinL = signedArea([v, vR, vRR].map(x => x.pos)) < 0 ? rNode : rrNode;
            let basinB = basinL;
            if (basinB.next === null)
                return;
            while (basinB.next.vertex.pos[1] < basinB.vertex.pos[1]) {
                basinB = basinB.next;
                if (basinB.next === null) {
                    return;
                }
            }

            let basinR = basinB;
            do {
                basinR = basinR.next;
                if (basinR.next === null)
                    break;
            } while (basinR.next.vertex.pos[1] > basinR.vertex.pos[1]);

            while (basinR !== basinB && basinL !== basinB) {
                // Fill basin
                basinB.next.halfedge = this.bridge(basinB.prev.halfedge);
                let newBasinB;
                if (basinB.next.vertex.pos[1] < basinB.prev.vertex.pos[1])
                    newBasinB = basinB.next;
                else
                    newBasinB = basinB.prev;
                basinB.remove();
                basinB = newBasinB;
            }
        }
    }

    fillRightFrom(vNode) {
        let v = vNode.vertex;
        let rNode = vNode.next;
        if (rNode === null)
            return;
        let w = rNode;
        let n = w.next;

        while (n !== null) {
            let v_i = w.vertex;
            let v_j = n.vertex;
            let shouldDraw = v.dist2(v_j) < v.dist2(v_i) + v_i.dist2(v_j)
                && isClockwise([v, v_j, v_i]);
            if (!shouldDraw)
                break;

            n.halfedge = this.bridge(w.prev.halfedge);
            w.remove();
            w = n;
            n = n.next;
        }

        this.rightBasinCheck(vNode);
    }

    leftBasinCheck(vNode) {
        let lNode = vNode.prev;
        let v = vNode.vertex;
        if (lNode === null)
            return;
        let vL = lNode.vertex;
        let llNode = lNode.prev;
        if (llNode === null)
            return;
        let vLL = llNode.vertex;
        let yDiff = v.pos[1] - vLL.pos[1];
        let xDiff = v.pos[0] - vLL.pos[0];
        if (yDiff > xDiff) {
            let basinR = isClockwise([v, vL, vLL]) ? lNode : llNode;
            let basinB = basinR;
            if (basinB.prev === null)
                return;
            while (basinB.prev.vertex.pos[1] < basinB.vertex.pos[1]) {
                basinB = basinB.prev;
                if (basinB.prev === null) {
                    return;
                }
            }

            let basinL = basinB;
            do {
                basinL = basinL.prev;
                if (basinL.prev === null)
                    break;
            } while (basinL.prev.vertex.pos[1] > basinL.vertex.pos[1]);

            let moveRight = false;
            while (basinR !== basinB && basinL !== basinB) {
                // Fill basin
                basinB.next.halfedge = this.bridge(basinB.prev.halfedge);
                let newBasinB;
                if (basinB.next.vertex.pos[1] < basinB.prev.vertex.pos[1])
                    newBasinB = basinB.next;
                else
                    newBasinB = basinB.prev;
                basinB.remove();
                basinB = newBasinB;
            }
        }
    }

    fillLeftFrom(vNode) {
        let v = vNode.vertex;
        let lNode = vNode.prev;
        if (lNode === null)
            return;

        let w = lNode;
        let n = w.prev;
        if (n === null)
            return;
        while (w.prev !== null) {
            n = w.prev;
            let v_i = n.vertex;
            let v_j = w.vertex;
            let shouldDraw = v.dist2(v_i) < v.dist2(v_j) + v_i.dist2(v_j)
                && isClockwise([v, v_j, v_i]);
            if (!shouldDraw)
                break;

            vNode.halfedge = this.bridge(n.halfedge);
            w.remove();
            w = n;
        }

        this.leftBasinCheck(vNode);
    }

    maintainConvexity(movingRight) {
        if (movingRight) {
            let lNode = this.lowConvexHull.start;
            let wNode = lNode.next;
            if (wNode === null)
                return;
            let nNode = wNode.next;
            let frontEdge = null;
            while (nNode !== null
                	&& isClockwise([lNode.vertex, wNode.vertex, nNode.vertex])) {
            	if (nNode.next !== null)
	                frontEdge = this.bridge(nNode.next.vertex.seek(nNode.vertex));
	            else
	            	frontEdge = this.bridge(this.advancingFront.end.halfedge);
                wNode.remove();
                wNode = nNode;
                nNode = nNode.next;
            }
            if (frontEdge !== null)
            	this.advancingFront.start.halfedge = frontEdge;
        } else {
            let rNode = this.lowConvexHull.end;
            let wNode = rNode.prev;
            if (wNode === this.lowConvexHull.start)
                return;
            let nNode = wNode.prev;
            while (nNode !== null 
                	&& isClockwise([rNode.vertex, nNode.vertex, wNode.vertex])) {
                this.bridge(this.advancingFront.end.halfedge);
                wNode.remove();
                wNode = nNode;
                nNode = nNode.prev;
            }
        }
    }

    bifurcate(h, v){
        let oh3 = h.twin.next.next;
        let h1 = this.addHalfedge();
        let h2 = this.addHalfedge();
        let h3 = this.addHalfedge();
        let h4 = this.addHalfedge();
        let e1 = this.addEdge();
        let e2 = this.addEdge();
        let tri = this.addTriangle();

        h1.next = h2;
        h2.next = h3;
        h3.next = h1;
        h4.next = h.next;
        h.next = h4;

        h1.twin = h4;
        h4.twin = h1;
        h3.twin = oh3.twin;
        oh3.twin.twin = h3;
        h2.twin = oh3;
        oh3.twin = h2;

        h1.vertex = h.twin.vertex;
        h.twin.vertex.halfedge = h1;
        h.twin.vertex = v;
        h2.vertex = v;
        h4.vertex = v;
        h3.vertex = oh3.vertex;
        v.halfedge = h2;

        h3.edge = oh3.edge;
        oh3.edge.halfedge = h3;
        h2.edge = e1;
        oh3.edge = e1;
        h1.edge = e2;
        h4.edge = e2;

        h1.triangle = tri;
        h2.triangle = tri;
        h3.triangle = tri;

        e1.halfedge = h2;
        e2.halfedge = h1;
        tri.halfedge = h1;

        this.legalize(h.vertex, oh3.vertex);
        this.legalize(oh3.vertex, h1.vertex);
        return [h, h4];
    }

    addPoint(pos) {
    	let v = this.addVertex(pos);
    	let vNode = new AdvancingFrontNode(v);
        let upperBound = this.advancingFront.upperBound(vNode);
        let preH, postH;

        if (upperBound === this.advancingFront.start) {
            let lowerBound = upperBound;
            upperBound = upperBound.next;
            let v_l = lowerBound.vertex;
            let v_r = upperBound.vertex;
            let p = lowerBound.halfedge;
            [preH, postH] = this.extrude(v, p);
            lowerBound.remove();
            let vNode = this.addVertexToFront(v, preH, postH);
            this.prependVertexToLCH(v);
            this.fillRightFrom(vNode);
            this.maintainConvexity(true);
        } else if (upperBound === null) {
        	upperBound = this.advancingFront.end;
        	let lowerBound = upperBound.prev;
            let v_l = lowerBound.vertex;
            let v_r = upperBound.vertex;
            let p = lowerBound.halfedge;
            [preH, postH] = this.extrude(v, p);
            upperBound.remove();
            let vNode = this.addVertexToFront(v, preH, postH);
            this.appendVertexToLCH(v);
            this.fillLeftFrom(vNode);
            this.maintainConvexity(false);
        } else {
        	let lowerBound = upperBound.prev;
            let v_l = lowerBound.vertex;
            let v_r = upperBound.vertex;
            let p = lowerBound.halfedge;
            
            if (v.pos[1] < v_l.pos[1] + SMALL_NUMBER && v.pos[1] < v_r.pos[1] + SMALL_NUMBER) {
                [preH, postH] = this.bifurcate(p.next, v);
                this.addVertexToFront(v, preH, postH);
            } else {
                [preH, postH] = this.extrude(v, p);
                let vNode = this.addVertexToFront(v, preH, postH);
                this.fillLeftFrom(vNode);
                this.fillRightFrom(vNode);
            }
        }
    }

    capTop() {
        let stack = new DLL();
        let p = this.advancingFront.start;
        while (p !== null) {
        	let stackNode = new DLLNode();
        	stackNode.pointer = p;
            stack.append(stackNode);
            while (stack.length > 2) {
                let kNode = stack.end;
                let jNode = kNode.prev;
                let iNode = jNode.prev;

                if (isClockwise([iNode.pointer.vertex, kNode.pointer.vertex, jNode.pointer.vertex])) {
                    kNode.pointer.halfedge = this.bridge(iNode.pointer.halfedge);
                    jNode.remove();
                } else {
                    break;
                }
            }
            p = p.next;
        }
        this.isCapped = true;
    }

    triangulate () {
    	this.initialize();
    	this.unprocessedPositions.forEach(this.addPoint.bind(this));
    	this.capTop();
    	this.unprocessedPositions = [];
    }
}
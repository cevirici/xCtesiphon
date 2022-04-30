class DLLNode {
	constructor() {
		this.prev = null;
		this.next = null;
		this.list = null;
	}

	remove() {
		if (this.prev !== null)
			this.prev.next = this.next;
		if (this.next !== null)
			this.next.prev = this.prev;
		if (this.list.start === this)
			this.list.start = this.next;
		if (this.list.end === this)
			this.list.end = this.prev;
		this.list.length--;
	}

	prepend(that) {
		this.list.length++;
		that.list = this.list;
		that.prev = this.prev;
		if (this.prev === null)
			this.list.start = that;
		else
			this.prev.next = that;
		that.next = this;
		this.prev = that;
	}

	append(that) {
		this.list.length++;
		that.list = this.list;
		that.next = this.next;
		if (this.next === null)
			this.list.end = that;
		else
			this.next.prev = that;
		that.prev = this;
		this.next = that;
	}
}

class DLL {
	constructor() {
		this.start = null;
		this.end = null;
		this.length = 0;
	}

	prepend(node) {
		this.length++;
		node.list = this;
		if (this.start !== null) {
			this.start.prev = node;
		} else {
			this.end = node;
		}
		node.next = this.start;
		this.start = node;
	}

	append(node) {
		this.length++;
		node.list = this;
		if (this.end !== null) {
			this.end.next = node;
		} else {
			this.start = node;
		}
		node.prev = this.end;
		this.end = node;
	}
}

class ShortcutNode extends DLLNode {}
class AdvancingFrontNode extends DLLNode {
	constructor(vertex, halfedge) {
		super();
		this.vertex = vertex;
		this.halfedge = halfedge;
		this.shortcutNode = null;
	}

	remove() {
		super.remove();
		if (this.shortcutNode !== null
				&& this.next !== null
				&& this.next.shortcutNode == null) {
			this.shortcutNode.node = this.next;
			this.next.shortcutNode = this.shortcutNode;
		} else if (this.shortcutNode !== null) {
			this.shortcutNode.remove();
		}
	}
}

class AdvancingFront extends DLL {
	constructor(shortcutCount = 10) {
		super();
		this.shortcuts = new DLL();
		this.maxShortcutCount = shortcutCount;
	}

	insert(node, postH) {
		node.list = this;
		let newShortcutNode = null;
		if (this.shortcuts.length < this.maxShortcutCount) {
			newShortcutNode = new ShortcutNode();
			newShortcutNode.node = node;
			node.shortcutNode = newShortcutNode;
		}
		let lowerShortcut = this.shortcuts.end;
		while (lowerShortcut !== null) {
			if (lowerShortcut.node.vertex.pos[0] < node.vertex.pos[0]) {
				if (newShortcutNode !== null)
					lowerShortcut.append(newShortcutNode);
				let upperBound = lowerShortcut.node;
				while (upperBound !== null) {
					if (upperBound.vertex.pos[0] > node.vertex.pos[0]) {
						upperBound.prepend(node);
						upperBound.halfedge = postH;
						return;
					}
					upperBound = upperBound.next;
				}
				this.append(node);
				return;
			}
			lowerShortcut = lowerShortcut.prev;
		}
		if (newShortcutNode !== null)
			this.shortcuts.prepend(newShortcutNode);
		let upperBound = this.start;
		while (upperBound !== null) {
			if (upperBound.vertex.pos[0] > node.vertex.pos[0]) {
				upperBound.prepend(node);
				upperBound.halfedge = postH;
				return;
			}
			upperBound = upperBound.next;
		}
		this.append(node);
	}

	upperBound(node) {
		node.list = this;
		let lowerShortcut = this.shortcuts.end;
		while (lowerShortcut !== null) {
			if (lowerShortcut.node.vertex.pos[0] < node.vertex.pos[0]) {
				let upperBound = lowerShortcut.node;
				while (upperBound !== null) {
					if (upperBound.vertex.pos[0] > node.vertex.pos[0]) {
						return upperBound;
					}
					upperBound = upperBound.next;
				}
				return null;
			}
			lowerShortcut = lowerShortcut.prev;
		}
		let upperBound = this.start;
		while (upperBound !== null) {
			if (upperBound.vertex.pos[0] > node.vertex.pos[0]) {
				return upperBound;
			}
			upperBound = upperBound.next;
		}
		return null;
	}
}
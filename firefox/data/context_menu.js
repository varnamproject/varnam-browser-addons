// Content script for context menu
//
self.on('click', function(node, data) {
	self.postMessage({
		'data': data,
		'id': node.id
	});
});


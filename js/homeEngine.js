'use strict';

var homeEngine = {
	init: function() {
		$(".button-delete a").on('click', $.proxy(this.deleteTrail, this));
	},

	deleteTrail: function(e) {
		var id = $(e.target).data('id');
		var hash = $(e.target).data('hash');

		$.ajax({
			url: '/api/deletetrail/' + id,
			type: 'post',
			data: JSON.stringify({
				hash: hash
			}),
			contentType: 'application/json'
		}).success(function(result) {
			$(e.target).closest("li").remove();
		});

		
		
	}
}

$(function() {
	homeEngine.init();
});
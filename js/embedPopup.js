'use strict';

$(function() {
	embedPopupEngine.init();
});

var embedPopupEngine = {
	defaults: {
		width: 700,
		height: 400
	},
	init: function() {
		$('.button-embed a').on('click', $.proxy(this.openPopup, this));
		$(".modal-embed .button-close").on('click', $.proxy(this.closePopup, this));
		$(".modal-embed .button-generate-code").on('click', $.proxy(this.regenerateCode, this));
	},
	openPopup: function(e) {
		var trailId = $(e.target).data('trail-id');
		$(".modal-embed").data('trail-id', trailId);

		var code = this.generateCode(trailId);
		$(".modal-embed .embed-code").val(code);


		if ($("body").prop('id') == 'index') {
			$(e.target).closest('li').addClass('highlighted');
		} else {
			$(".button-embed").addClass('highlighted');
		}

		$(".modal-embed").removeClass('hide');
	},
	closePopup: function() {
		$("ul.trail-list li").removeClass('highlighted');
		$(".button-embed").removeClass('highlighted');
		$(".modal-embed").addClass('hide');
	},
	regenerateCode: function() {
		var trailId = $(".modal-embed").data('trail-id');
		var code = this.generateCode(trailId);
		$(".modal-embed .embed-code").val(code);
	},
	generateCode(trailId) {
		var tpl = '<iframe src="//prototype.trailcatalog.org/embedtrail/{{id}}/" width="{{width}}" height="{{height}}" frameborder="0"></iframe>';

		var width = +$(".modal-embed .embed-width input").val();
		if (isNaN(width)) {
			width = this.defaults.width;
			$(".modal-embed .embed-width input").val(width);
		}

		var height = +$(".modal-embed .embed-height input").val();
		if (isNaN(height)) {
			height = this.defaults.height;
			$(".modal-embed .embed-height input").val(height);
		}
		var vars = {
			width: width,
			height: height,
			id: trailId
		}
		if ($(".modal-embed .embed-100-percent").is(":checked"))
			vars.width = "100%";

		for (var n in vars) {
			tpl = tpl.replace('{{' + n + '}}', vars[n]);
		}

		return tpl;
	}
};
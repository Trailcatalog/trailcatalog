'use strict';

var tcLabel = L.Label.extend({

	onAdd: function() {
		L.Label.prototype.onAdd.apply(this, arguments);
	},

	onRemove: function() {
		if (this.trashLink)
			L.DomEvent.removeListener(this.trashLink, 'click', this._trashIconClicked);

		L.Label.prototype.onRemove.apply(this, arguments);
	},

	setHighlight: function(highLight) {
		if (highLight)
			L.DomUtil.addClass(this._container, 'highlight');
		else
			L.DomUtil.removeClass(this._container, 'highlight');
	},

	_updateContent: function() {
		if (!this._content || !this._map || this._prevContent === this._content) {
			return;
		}

		if (this.options.cssClass) {
			L.DomUtil.addClass(this._container, this.options.cssClass);
		}

		if (typeof this._content === 'string') {
			var span = L.DomUtil.create('span', '', this._container);
			span.innerHTML = this._content;

			if (this.options.cssClass != "marker-start") {

				if (this.trashLink)
					L.DomEvent.removeListener(this.trashLink, 'click', this._trashIconClicked);

				this.trashLink = L.DomUtil.create('a', '', this._container);
				this.trashLink.setAttribute('href', 'javascript:void(0);')
				this.trashLink.innerHTML = '<img src="img/edit-delete.svg" width="12" height="12"/>';

				L.DomEvent.addListener(this.trashLink, 'click', this._trashIconClicked, this);
			}

			this._prevContent = this._content;

			this._labelWidth = this._container.offsetWidth;
			this._labelHeight = this._container.offsetHeight;
		}
	},

	_setPosition: function(pos) {
		var map = this._map,
			container = this._container,
			centerPoint = map.latLngToContainerPoint(map.getCenter()),
			labelPoint = map.layerPointToContainerPoint(pos),
			direction = this.options.direction,
			labelWidth = this._labelWidth,
			labelHeight = this._labelHeight,
			offset = L.point(this.options.offset);

		// position to the right (right or auto & needs to)
		if (direction === 'right' || direction === 'auto' && labelPoint.x < centerPoint.x) {
			L.DomUtil.addClass(container, 'leaflet-label-right');
			L.DomUtil.removeClass(container, 'leaflet-label-left');

			offset.x -= labelWidth / 2;
			offset.y -= labelHeight / 2;

			pos = pos.add(offset);
		} else { // position to the left
			L.DomUtil.addClass(container, 'leaflet-label-left');
			L.DomUtil.removeClass(container, 'leaflet-label-right');

			pos = pos.add(L.point(-offset.x - labelWidth, offset.y));
		}

		L.DomUtil.setPosition(container, pos);
	},

	_trashIconClicked: function(e) {
		var self = this;

		L.DomEvent.stopPropagation(e);

		self.fire('remove', e);
		this.setHighlight(true);
	}
});


L.tc = L.tc || {};

L.tc.Label = function(options, source) {
	return new tcLabel(options, source);
}
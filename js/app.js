var tcIntersectionsAPI=L.Class.extend({intersections:{},bounds:null,initialize:function(a,b){L.setOptions(this,b);this._map=a;this.bounds=L.latLngBounds(this._map.getCenter(),this._map.getCenter());this.prepareIntersections();this._mapmoved=debounce(L.bind(this._mapmoved,this),1500);this._map.on("moveend",this._mapmoved,this)},getClosestInresection:function(a,b){var d=null,c=Infinity;if(b)var e=this._map.latLngToLayerPoint(a).add(L.point(0,b)),e=this._map.layerPointToLatLng(e),e=a.distanceTo(e);for(var f in this.intersections){var g=
a.distanceTo(this.intersections[f]);g<c&&(d=this.intersections[f],c=g)}b&&c>e&&(d=null);return d?{latLng:d,distance:c}:null},prepareIntersections:function(){var a=this;if(15<=this._map.getZoom()){var b=this._map.getBounds();this.bounds.contains(b)||(console.log("prepareIntersections"),this.inProcess=!0,this.bounds.extend(b),b="[bbox:"+b.getSouth()+","+b.getWest()+","+b.getNorth()+","+b.getEast()+"]",$.ajax({url:"https://www.overpass-api.de/api/interpreter",dataType:"json",type:"POST",data:{data:"[out:json][timeout:25]"+
b+';(way["highway"];);out body;>;out skel qt;'},async:!0,crossDomain:!0}).success(function(b){b=a._parseOverpassData(b);L.Util.extend(a.intersections,b);a.inProcess=!1;console.log("prepareIntersections done")}).error(function(b){a.inProcess=!1}))}},_parseOverpassData:function(a){for(var b=[],d={},c=0;c<a.elements.length;c++){var e=a.elements[c];"way"==e.type?b.push(e):"node"==e.type&&(d[e.id]={lat:e.lat,lng:e.lon})}a=[];for(c=0;c<b.length-1;c++)for(e=c+1;e<b.length;e++){var f;f=b[c];for(var g=b[e],
h=[],k=0;k<f.nodes.length;k++)-1<g.nodes.indexOf(f.nodes[k])&&h.push(f.nodes[k]);f=h;a=a.concat(f)}f={};for(c=0;c<a.length;c++)b=d[a[c]],f[a[c]]=L.latLng(b.lat,b.lng);return f},_mapmoved:function(){self.inProcess||this.prepareIntersections()}});L.tc=L.tc||{};L.tc.IntersectionsAPI=function(a,b){return new tcIntersectionsAPI(a,b)};var tcDirectionsAPI=L.Class.extend({initialize:function(a){L.setOptions(this,a)},getRoute:function(a,b){if(a&&a.length&&1<a.length){var d=this._getDirectionsAPIUrl(a);$.get(d).success(function(a){var d=[];if(0<a.routes.length){a=polyline.decode(a.routes[0].geometry);for(var f=0;f<a.length;f++){var g=[a[f][0]/10,a[f][1]/10];d.push(new L.LatLng(g[0],g[1]))}}b(null,d)}).error(function(a){return b(a)})}else return b("No points")},_getDirectionsAPIUrl:function(a){for(var b="",d=0;d<a.length;d++)0<b.length&&
(b+=";"),b+=a[d].lng+","+a[d].lat;return"https://api.tiles.mapbox.com/v4/directions/mapbox.walking/"+b+".json?access_token="+this.options.mapBoxApiKey+"&steps=false&geometry=polyline"}});L.tc=L.tc||{};L.tc.DirectionsAPI=function(a){return new tcDirectionsAPI(a)};var tcSurfaceAPI=L.Class.extend({initialize:function(a){L.setOptions(this,a)},getElevations:function(a,b,d){if(30<a.length){for(var c=[a[0]],e=(a.length-2)/28,f=e;f<a.length-1;f+=e)c.push(a[Math.round(f)]);c.push(a[a.length-1]);a=c}a=a.map(function(a){return a.lat.toFixed(5)+","+a.lng.toFixed(5)}).join("|");$.getJSON(b?"/api/ele/?path="+a+"&samples=20":"/api/ele/?locations="+a,function(a){if(a&&"OK"==a.status)a=a.results.map(function(a){return a.elevation}),d(null,a);else return d("err")})}});
L.tc=L.tc||{};L.tc.SurfaceAPI=function(a){return new tcSurfaceAPI(a)};var tcLabel=L.Label.extend({onAdd:function(){L.Label.prototype.onAdd.apply(this,arguments)},onRemove:function(){this.trashLink&&L.DomEvent.removeListener(this.trashLink,"click",this._trashIconClicked);L.Label.prototype.onRemove.apply(this,arguments)},setHighlight:function(a){a?L.DomUtil.addClass(this._container,"highlight"):L.DomUtil.removeClass(this._container,"highlight")},_updateContent:function(){this._content&&this._map&&this._prevContent!==this._content&&(this.options.cssClass&&L.DomUtil.addClass(this._container,
this.options.cssClass),"string"===typeof this._content&&(L.DomUtil.create("span","",this._container).innerHTML=this._content,"marker-start"!=this.options.cssClass&&(this.trashLink&&L.DomEvent.removeListener(this.trashLink,"click",this._trashIconClicked),this.trashLink=L.DomUtil.create("a","",this._container),this.trashLink.setAttribute("href","javascript:void(0);"),this.trashLink.innerHTML='<img src="img/edit-delete.svg" width="12" height="12"/>',L.DomEvent.addListener(this.trashLink,"click",this._trashIconClicked,
this)),this._prevContent=this._content,this._labelWidth=this._container.offsetWidth,this._labelHeight=this._container.offsetHeight))},_setPosition:function(a){var b=this._map,d=this._container,c=b.latLngToContainerPoint(b.getCenter()),b=b.layerPointToContainerPoint(a),e=this.options.direction,f=this._labelWidth,g=this._labelHeight,h=L.point(this.options.offset);"right"===e||"auto"===e&&b.x<c.x?(L.DomUtil.addClass(d,"leaflet-label-right"),L.DomUtil.removeClass(d,"leaflet-label-left"),h.x-=f/2,h.y-=
g/2,a=a.add(h)):(L.DomUtil.addClass(d,"leaflet-label-left"),L.DomUtil.removeClass(d,"leaflet-label-right"),a=a.add(L.point(-h.x-f,h.y)));L.DomUtil.setPosition(d,a)},_trashIconClicked:function(a){L.DomEvent.stopPropagation(a);this.fire("remove",a);this.setHighlight(!0)}});L.tc=L.tc||{};L.tc.Label=function(a,b){return new tcLabel(a,b)};var tcSegment=L.FeatureGroup.extend({includes:L.Mixin.Events,options:{routeStyle:{color:"#FF8000",weight:4,opacity:.75},highlightStyle:{color:"#A70005",weight:4,opacity:.75},labelCssClass:"",state:"on",readOnly:!1},elevation:0,initialize:function(a,b,d,c,e,f){L.setOptions(this,e);L.FeatureGroup.prototype.initialize.call(this,[],e);this.markerStart=a;this.markerEnd=b;this.directionsAPI=d;this.surfaceAPI=c;this.path=f;this._draw()},_draw:function(){this.clearLayers();this.label=this.line=null;if(this.path)this.line=
L.polyline(this.path,this.options.routeStyle).addTo(this);else{var a=[this.markerStart.getLatLng(),this.markerEnd.getLatLng()];this.line=L.polyline(a,this.options.routeStyle).addTo(this)}this._calcDistance();this._calcElevation()},_calcDistance:function(){for(var a=this.line.getLatLngs(),b=0,d=0;d<a.length-1;d++)b+=a[d].distanceTo(a[d+1]);a=this._getSegmentCenter(a,b);this.label&&(this.label.off("remove",this._removeSegment,this),this.label=null);this.label=new L.tc.Label({offset:[0,0],segmentIndex:0,
cssClass:this.options.labelCssClass});this.distance=b=Math.round(b/10*.621371)/100;this.label.setContent(b+" Mi");this.label.setLatLng(a);this.addLayer(this.label);this.label.on("remove",this._removeSegment,this)},_calcElevation:function(){var a=this;if(this.surfaceAPI){var b=this.line.getLatLngs();this.surfaceAPI.getElevations(b,this instanceof tcStraightSegment,function(b,c){if(!b&&c&&c.length){for(var e=0,f=c[0],g=1;g<c.length;g++)f=c[g]-f,0<f&&(e+=f),f=c[g];a.elevation=3*e;28084}})}},_getSegmentCenter:function(a,
b){for(var d=0,c=0;c<=a.length-1;c++)if(d+=a[c].distanceTo(a[c+1]),d>b/2)return L.latLngBounds(a[c],a[c+1]).getCenter()},_removeSegment:function(a){var b=this;this.line.setStyle(this.options.highlightStyle);setTimeout(function(){b.clearLayers();b.options.state="off";b.fire("removed")},500)},getDistance:function(){return this.distance},getElevation:function(){return this.elevation}}),tcRouteSegment=tcSegment.extend({_draw:function(){var a=this;this.clearLayers();this.label=this.line=null;if(this.path)a.line=
L.polyline(this.path,a.options.routeStyle).addTo(a),a._calcDistance(),a._calcElevation();else{var b=[this.markerStart.getLatLng(),this.markerEnd.getLatLng()];this.directionsAPI.getRoute(b,function(d,c){!d&&c.length&&(c[0]=b[0],a.markerEnd.setLatLng(c[c.length-1]),a.line=L.polyline(c,a.options.routeStyle).addTo(a),a._calcDistance(),a._calcElevation(),"function"===typeof a.options.callback&&a.options.callback())})}}}),tcStraightSegment=tcSegment.extend({options:{routeStyle:{color:"#0674D7",weight:4,
opacity:.75},endMarkerIcon:L.divIcon({className:"marker-map-unsnapped"}),labelCssClass:"straightLable"},tempEndMarker:null,addPoint:function(a){this.line.addLatLng(a);this._setTempEndMarker()},endDraw:function(a){this.markerEnd=a;this._clearTempEndMarker();this._calcDistance();this._calcElevation()},_draw:function(){this.path?(this.line=L.polyline(this.path,this.options.routeStyle).addTo(this),this._calcDistance(),this._calcElevation()):this.line=L.polyline([this.markerStart.getLatLng()],this.options.routeStyle).addTo(this)},
_setTempEndMarker:function(){this._clearTempEndMarker();var a=this.line.getLatLngs();a.length&&(this.tempEndMarker=L.marker(a[a.length-1],{icon:this.options.endMarkerIcon}).addTo(this))},_clearTempEndMarker:function(){this.tempEndMarker&&(this.removeLayer(this.tempEndMarker),this.tempEndMarker=null)},getLastLatLng:function(){var a=null,b=this.line.getLatLngs();b.length&&1<b.length&&(a=b[b.length-1]);return a}});L.tc=L.tc||{};L.tc.Segment=function(a,b,d,c,e,f){return new tcSegment(a,b,d,e,f)};
L.tc.RouteSegment=function(a,b,d,c,e){return new tcRouteSegment(a,b,d,c,e)};L.tc.StraightSegment=function(a,b,d){return new tcStraightSegment(a,null,null,b,d)};L.tc.restoreSegment=function(a,b,d,c,e,f,g){return a?new tcStraightSegment(b,d,e,f,g,c):new tcRouteSegment(b,d,e,f,g,c)};var tcRouteLayer=L.FeatureGroup.extend({options:{snap2roads:!0,intersectionRaduis:12},waypoints:[],routeSegments:null,initialize:function(a,b,d,c){L.setOptions(this,c);L.FeatureGroup.prototype.initialize.call(this,[]);this.directionsAPI=a;this.intersectionsAPI=b;this.surfaceAPI=d;this.routeSegments=L.featureGroup().addTo(this);this.routeWaypoints=L.featureGroup().addTo(this);this.dragMarker=L.marker([0,0],{icon:this._dragIcon(),draggable:!0,riseOnHover:!0,riseOffset:1E3,zIndexOffset:1E3}).on("dragstart",
this._dragStart,this).on("drag",this._drag,this).on("dragend",this._dragEnd,this)},onAdd:function(){L.FeatureGroup.prototype.onAdd.apply(this,arguments);this._map.on("click",this._click,this).on("mousemove",this._mousemove,this)},onRemove:function(){this._map.off("click",this._click,this).off("mousemove",this._mousemove,this);L.FeatureGroup.prototype.onRemove.apply(this,arguments)},_click:function(a){this.justDragged||this._findIntersection(a.latlng)},_findIntersection:function(a,b){var d=this.intersectionsAPI.getClosestInresection(a,
this.options.intersectionRaduis);this.options.snap2roads?(d&&(a=d.latLng),this._addRoutePoint(a,b)):this._addStraightPoint(a,d,b)},_addWaypoint:function(a){a=L.marker(a,{icon:this._waypointIcon()}).addTo(this.routeWaypoints);a.relatedSegments=[];this.waypoints.push(a);1==this.waypoints.length&&this.showStartMarker();return a},_addRoutePoint:function(a,b){if(!this.waypoints.length||!this.waypoints[this.waypoints.length-1].getLatLng().equals(a))if(this._addWaypoint(a),1<this.waypoints.length){var d=
"undefined"!==typeof b?this.waypoints[b]:this.waypoints[this.waypoints.length-2],c=this.waypoints[this.waypoints.length-1],e=L.tc.RouteSegment(d,c,this.directionsAPI,this.surfaceAPI,{callback:$.proxy(this.hideDragMarker,this)});d.relatedSegments.push(e);c.relatedSegments.push(e);this.routeSegments.addLayer(e);e.on("removed",this._segmentRemoved,this)}},_addStraightPoint:function(a,b,d){this.waypoints.length||this._addWaypoint(a);if(!this.straightSegment){var c=this.waypoints[this.waypoints.length-
1];"undefined"!==typeof d&&(c=this.waypoints[d]);this.straightSegment=L.tc.StraightSegment(c,this.surfaceAPI).addTo(this.routeSegments);this.straightSegment.on("removed",this._segmentRemoved,this);this.waypoints[this.waypoints.length-1].relatedSegments.push(this.straightSegment)}this.waypoints[this.waypoints.length-1].getLatLng().equals(a)||(b?(this.straightSegment.addPoint(b.latLng),a=this._addWaypoint(b.latLng),this.straightSegment.endDraw(a),a.relatedSegments.push(this.straightSegment),this.straightSegment=
null):this.straightSegment.addPoint(a))},_segmentRemoved:function(a){this.routeSegments.removeLayer(a.target);this._checkLonelyWaypoints()},_checkLonelyWaypoints:function(){for(var a=[],b=0;b<this.waypoints.length;b++){for(var d=[],c=0;c<this.waypoints[b].relatedSegments.length;c++)"on"==this.waypoints[b].relatedSegments[c].options.state&&d.push(this.waypoints[b].relatedSegments[c]);d.length?(this.waypoints[b].relatedSegments=d,a.push(this.waypoints[b])):this.routeWaypoints.removeLayer(this.waypoints[b])}this.waypoints=
a;this.showStartMarker()},_mousemove:function(a){if(!this.dragProcess){a=this.closestWaypoint(a.layerPoint);if(!a||6<a.distance)return this.removeLayer(this.dragMarker);var b=this.waypoints[a.index].getLatLng();this.hasLayer(this.dragMarker)||this.addLayer(this.dragMarker);this.dragMarker.setLatLng(b);this.currentWaypoint=a.index}},hideDragMarker:function(){this.removeLayer(this.dragMarker)},_dragStart:function(a){this.dragProcess=!0},_drag:function(a){a=a.target.getLatLng();this.dragPolyline?this.dragPolyline.spliceLatLngs(1,
1,a):this.dragPolyline=L.polyline([a,a],this._dragPolylineStyle()).addTo(this)},_dragEnd:function(a){a=a.target.getLatLng();this._findIntersection(a,this.currentWaypoint);this.dragProcess=!1;this.currentWaypoint=null;this.removeLayer(this.dragPolyline);this.dragPolyline=null},closestWaypoint:function(a){for(var b=Infinity,d=null,c=0;c<this.waypoints.length;c++){var e=this._map.latLngToLayerPoint(this.waypoints[c].getLatLng()),e=a.distanceTo(e);e<b&&(b=e,d=c)}return null!=d?{distance:b,index:d}:null},
_waypointIcon:function(){return L.divIcon({className:"marker-map"})},_dragIcon:function(){return L.divIcon({className:"marker-map-drag"})},_dragPolylineStyle:function(){return{color:"#D30203",weight:4,opacity:.75}},getRouteForSave:function(){for(var a={type:"FeatureCollection",features:[]},b=this.routeSegments.getLayers(),d=0,c=0,e=0;e<b.length;e++){var f=b[e].line.toGeoJSON();f.properties.straight=b[e]instanceof tcRouteSegment?!1:!0;b[e].markerStart&&(f.properties.markerStart=L.stamp(b[e].markerStart));
b[e].markerEnd&&(f.properties.markerEnd=L.stamp(b[e].markerEnd));a.features.push(f);d+=b[e].getDistance();c+=b[e].getElevation()}b=this.routeWaypoints.toGeoJSON();f=this.routeWaypoints.getLayers();for(e=0;e<f.length;e++)b.features[e].properties.stamp=L.stamp(f[e]);return{waypoints:b,segments:a,distance:d,elevation:Math.round(c)}},restoreRouteFromJSON:function(a){var b=a.waypoints;a=a.segments;for(var d=null,c=L.geoJson(b).getLayers(),e={},f=0;f<c.length;f++){var g=c[f].getLatLng();d?d.extend(g):d=
L.latLngBounds(g,g);g=this._addWaypoint(g);e[b.features[f].properties.stamp]=g}b=L.geoJson(a).getLayers();for(f=0;f<b.length;f++){var h=a.features[f].properties.straight,c=e[a.features[f].properties.markerStart],g=e[a.features[f].properties.markerEnd],k=b[f].getLatLngs(),h=L.tc.restoreSegment(h,c,g,k,this.directionsAPI,this.surfaceAPI);this.routeSegments.addLayer(h);h.on("removed",this._segmentRemoved,this);c.relatedSegments.push(h);g.relatedSegments.push(h)}this._map.fitBounds(d)},clearAll:function(){this.routeSegments.clearLayers();
this.routeWaypoints.clearLayers();this.startLabel&&(this.removeLayer(this.startLabel),this.startLabel=null);this.waypoints=[]},showStartMarker:function(){this.startLabel&&(this.removeLayer(this.startLabel),this.startLabel=null);if(this.waypoints.length){var a=this.waypoints[0];this.startLabel=new L.tc.Label({offset:[0,-16],cssClass:"marker-start"});this.startLabel.setContent("START");this.startLabel.setLatLng(a.getLatLng());this.addLayer(this.startLabel)}},setSnap:function(a){(this.options.snap2roads=
a)&&null!=this.straightSegment&&((a=this.straightSegment.getLastLatLng())?(a=this._addWaypoint(a),this.straightSegment.endDraw(a),a.relatedSegments.push(this.straightSegment)):this.routeSegments.removeLayer(this.straightSegment),this.straightSegment=null)}});L.tc=L.tc||{};L.tc.RouteLayer=function(a,b,d){return new tcRouteLayer(a,b,d)};var mapEngine={options:{center:[42.221256,2.16877],zoom:15,tileLayerName:"runkeeper.4nc7syvi",mapContainerId:"map",mapBoxApiKey:"pk.eyJ1IjoiYXJzZW55biIsImEiOiI3YkwwSGpFIn0.sz_Ar78nUbUZc6Ic1aNhkQ"},init:function(a){L.setOptions(this,a);L.mapbox.accessToken=this.options.mapBoxApiKey;this.map=L.mapbox.map(this.options.mapContainerId,this.options.tileLayerName,{zoomControl:!1}).setView(this.options.center,this.options.zoom);this.directionsAPI=L.tc.DirectionsAPI({mapBoxApiKey:this.options.mapBoxApiKey});
this.intersectionsAPI=L.tc.IntersectionsAPI(this.map);this.surfaceAPI=L.tc.SurfaceAPI();this.routeLayer=L.tc.RouteLayer(this.directionsAPI,this.intersectionsAPI,this.surfaceAPI).addTo(this.map);this.setupGeocoding();$("#btnFinishTrail").on("click",$.proxy(this.saveTrail,this));$("#btnClearAll").on("click",$.proxy(this.clearAll,this));"undefined"!==typeof trailData&&this.restoreTrail()},setSnap:function(a){this.routeLayer.setSnap(a)},setupGeocoding:function(){this.geocoder=L.mapbox.geocoder("mapbox.places");
$("#tbxSearch").autocomplete({minChars:3,lookup:$.proxy(this.geocoderLookup,this),onSelect:$.proxy(this.geocoderSelect,this),deferRequestBy:150,width:210})},geocoderLookup:function(a,b){var d={suggestions:[]};this.geocoder.query(a,function(a,e){if(a)return b();e&&e.results&&e.results.features&&e.results.features.length&&(d.suggestions=e.results.features.map(function(a){return{value:a.text,data:a}}),b(d))})},geocoderSelect:function(a){a=a.data;if(a.bbox){var b=L.latLngBounds(L.latLng(a.bbox[1],a.bbox[0]),
L.latLng(a.bbox[3],a.bbox[2]));this.map.fitBounds(b)}a.center&&this.map.setView([a.center[1],a.center[0]],this.map.getZoom())},saveTrail:function(){var a=this.routeLayer.getRouteForSave(),b=$("#trailName").val();a.title=b;b="/api/saveTrail";"undefined"!==typeof trail_id&&(b+="/"+trail_id);$.ajax({url:b,type:"post",data:JSON.stringify(a),contentType:"application/json"}).success(function(a){a&&(window.location="/trail/"+a)})},clearAll:function(){this.routeLayer.clearAll()},restoreTrail:function(){this.routeLayer.restoreRouteFromJSON(trailData);
trailData.trail.title&&trailData.trail.title.length&&$("#trailName").val(trailData.trail.title)}};$(function(){mapEngine.init();$("#cbxSnap2Roads").prop("checked",!0);$("#cbxSnap2Roads").on("change",function(){mapEngine.setSnap($(this).is(":checked"))})});function debounce(a,b,d){var c;return function(){var e=this,f=arguments,g=d&&!c;clearTimeout(c);c=setTimeout(function(){c=null;d||a.apply(e,f)},b);g&&a.apply(e,f)}};
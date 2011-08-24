/*
CropZoom v1.1
Release Date: April 17, 2010

Copyright (c) 2010 Gaston Robledo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
(function($){

	$.cropzoom = function(element, options){
	
		var defaults = {
			top: 0,
			left: 0,
			width: 500,
			height: 375,
			selector: {
				top: 0,
				left: 0,
				width: 229,
				height: 100,
				aspectRatio: false,
				centered: false,
				showPositionsOnDrag: true,
				showDimetionsOnDrag: true,
				maxHeight: null,
				maxWidth: null,
				hidden: false,
				startWithOverlay: false,
				hideOverlayOnDragAndResize: true,
				hideOverlay: false,
				onSelectorDrag: null,
				onSelectorDragStop: null,
				onSelectorResize: null,
				onSelectorResizeStop: null,
				locked: false,
				enablePassThroughBorder: false
			},
			image: {
				source: '',
				rotation: 0,
				width: 0,
				height: 0,
				top: 0,
				left: 0,
				minZoom: 10,
				maxZoom: 150,
				startZoom: 0,
				useStartZoomAsMinZoom: false,
				snapToContainer: false,
				constrainToSelector: false,
				onZoom: null,
				onRotate: null,
				onImageDrag: null
			},
			enableOverlayImage: false,
			overlayImage: {
				imageSource: "",
				top: 0,
				left: 0,
				height: 0,
				width: 0,
				matchSelector: true
			},
			enableRotation: true,
			enableZoom: true,
			enableMovement: true,
			enableImageMatch: true,
			zoomSteps: 1,
			rotationSteps: 5,
			movementSteps: 5,
			singleMovementSteps: 1,
			movementSpeed: 100,
			controls: {
				orientation: 'vertical',
				zoomElement: '',
				rotationElement: '',
				movement_element: '',
				image_size_element: '',
				showMaxMin: true,
				showFit: true,
				showWidthAndHeightFit: false
			},
			onChange: null
		};
			
		// to avoid confusions, use "cropzoom" to reference the current instance of the object
		var cropzoom = this;
		
		cropzoom.settings = {};
			
		cropzoom.$element = $(element);  // reference to the jQuery version of DOM element the plugin is attached to
		var element = element;		   // reference to the actual DOM element (passed in)
			
		cropzoom.selector_data = {};
		cropzoom.image_data = {};
		
		var move_timeout = 500;		// Initial timeout for move
		var move_steps = cropzoom.settings.singleMovementSteps;
		var tMovement = null;
		
		cropzoom.init = function(options) {
	
			cropzoom.settings = $.extend(true, defaults, options);
	
			// Verify plugin dependencies
			if(!$.isFunction($.fn.draggable) || !$.isFunction($.fn.resizable) || !$.isFunction($.fn.slider)){
				alert("You must include ui.draggable, ui.resizable and ui.slider to use cropZoom");
				return;
			}
			if(cropzoom.settings.image.source == '' ||  cropzoom.settings.image.width == 0 || cropzoom.settings.image.height == 0){
				alert('You must set the source, witdth and height of the image element');
				return;
			}
			
			cropzoom.$element.empty();
			cropzoom.$element.addClass("cz-main-window");
			cropzoom.$element.css({
				'width': cropzoom.settings.width,
				'height': cropzoom.settings.height
			});
			
			cropzoom.selector_data = {
				left : cropzoom.settings.selector.left,
				top : cropzoom.settings.selector.top,
				width : (cropzoom.settings.selector.maxWidth != null ? (cropzoom.settings.selector.width > cropzoom.settings.selector.maxWidth ? cropzoom.settings.selector.maxWidth : cropzoom.settings.selector.width) : cropzoom.settings.selector.width),
				height : (cropzoom.settings.selector.maxHeight != null ? (cropzoom.settings.selector.height > cropzoom.settings.selector.maxHeight ? cropzoom.settings.selector.maxHeight : cropzoom.settings.selector.height) : cropzoom.settings.selector.height)
			};
			
			cropzoom.image_data = {
				height: cropzoom.settings.image.height,
				width: cropzoom.settings.image.width,
				top: cropzoom.settings.image.top,
				left: cropzoom.settings.image.left,
				scaleX: 0,
				scaleY: 0,
				rotation: cropzoom.settings.image.rotation,
				source: cropzoom.settings.image.source,
				id: 'image_to_crop_' + cropzoom.$element.attr("id")
			};
			setImageContainment();
	
			cropzoom.image_data.scaleX = (cropzoom.settings.image.width / cropzoom.image_data.width);
			cropzoom.image_data.scaleY = (cropzoom.settings.image.height / cropzoom.image_data.height);
			getCorrectSizes();
			
			if($.browser.msie){
				// Add VML includes and namespace
				cropzoom.$element[0].ownerDocument.namespaces.add('v', 'urn:schemas-microsoft-com:vml', "#default#VML");
				// Add required css rules
				var style = document.createStyleSheet();
				style.addRule('v\\:image', "behavior: url(#default#VML);display:inline-block");
				style.addRule('v\\:image', "antiAlias: false;");
	
				cropzoom.$svg = $("<div />").attr("id","k").css({
					width: cropzoom.settings.width,
					height: cropzoom.settings.height,
					position: 'absolute' 
				});
				if($.support.leadingWhitespace){
					cropzoom.$image = document.createElement('img');
				} else {
					cropzoom.$image = document.createElement('v:image');
				}
				cropzoom.$image.setAttribute('src',cropzoom.settings.image.source);
				cropzoom.$image.setAttribute('gamma','0');
				
				$(cropzoom.$image).css({
					position: 'absolute',
					left: cropzoom.image_data.left,
					top: cropzoom.image_data.top,
					width: cropzoom.image_data.width,
					height: cropzoom.image_data.height
				});
				cropzoom.$image.setAttribute('coordsize', '21600,21600');
				cropzoom.$image.outerHTML = cropzoom.$image.outerHTML;
	
				var ext = getExtensionSource();
				if(ext == 'png' || ext == 'gif')
					cropzoom.$image.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+cropzoom.settings.image.source+"',sizingMethod='scale');"; 
				cropzoom.$svg.append(cropzoom.$image);
			}else{
				cropzoom.$svg = cropzoom.$element[0].ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
				cropzoom.$svg.setAttribute('id', 'k');
				cropzoom.$svg.setAttribute('width', cropzoom.settings.width);
				cropzoom.$svg.setAttribute('height', cropzoom.settings.height);
				cropzoom.$svg.setAttribute('preserveAspectRatio', 'none');
				cropzoom.$image = cropzoom.$element[0].ownerDocument.createElementNS('http://www.w3.org/2000/svg','image');
				cropzoom.$image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', cropzoom.settings.image.source);
				cropzoom.$image.setAttribute('width', cropzoom.image_data.width);
				cropzoom.$image.setAttribute('height', cropzoom.image_data.height);
				cropzoom.$image.setAttribute('preserveAspectRatio', 'none');
				$(cropzoom.$image).attr('x', 0);
				$(cropzoom.$image).attr('y', 0);
				cropzoom.$svg.appendChild(cropzoom.$image);
			}
			cropzoom.$element.append(cropzoom.$svg);  
	
			calculateTranslationAndRotation(cropzoom.$image, cropzoom.image_data);
	
			//Bindear el drageo a la imagen a cortar
			$(cropzoom.$image).draggable({
				refreshPositions:true,
				start: function(event,ui){
					calculateTranslationAndRotation(cropzoom.$image, cropzoom.image_data);
				},
				drag: function(event,ui){ 
					cropzoom.image_data.top = ui.position.top;
					cropzoom.image_data.left = ui.position.left;
					calculateTranslationAndRotation(cropzoom.$image, cropzoom.image_data);
					//Fire the callback
					if(cropzoom.settings.image.onImageDrag != null)
						cropzoom.settings.image.onImageDrag(cropzoom.$image);
	
				}
			});
	
			//Creamos el selector  
			createSelector();
			//Creamos la Capa de oscurecimiento
			createOverlay(); 
	
			if(cropzoom.settings.selector.startWithOverlay){
				var ui_object = {
					position: {
						top: cropzoom.$selector.position().top,
						left: cropzoom.$selector.position().left
					}
				};
				setOverlayPositions();
			}
			if(cropzoom.settings.selector.locked)
				cropzoom.lockSelector();
			if(cropzoom.settings.selector.heightidden)
				cropzoom.$selector.hide();
	
			//Creamos el Control de Zoom 
			if(cropzoom.settings.enableZoom) 
				createZoomSlider();
			//Creamos el Control de rotation
			if(cropzoom.settings.enableRotation)
				createRotationSlider();
			if(cropzoom.settings.enableMovement)
				createMovementControls(); 
			if(cropzoom.settings.enableImageMatch)
				createImageMatchControls(); 
	
			// return this instance
			return this;
		};
		
		
		// Public functions
		// ============================================================
		cropzoom.lockSelector = function(){
			cropzoom.$selector.draggable("disable");
			cropzoom.$selector.find(".ui-resizable-handle").hide();
		};
		
		cropzoom.unlockSelector = function(){
			cropzoom.$selector.draggable("enable");
			cropzoom.$selector.find(".ui-resizable-handle").show();
		};
		
		//Function to set the selector position and sizes
		cropzoom.setSelector = function(options){
			if(undefined != options.match){
				switch(options.match){
					case "image":
						options.top = cropzoom.image_data.top;
						options.left = cropzoom.image_data.left;
						options.width = cropzoom.image_data.width;
						options.height = cropzoom.image_data.height;
						break;
					default:
						options.top = 0;
						options.left = 0;
						options.width = cropzoom.settings.width;
						options.height = cropzoom.settings.height;
				}
			}
			if(options.animate != undefined && options.animate == true){
				cropzoom.$selector.animate({
					'top': options.top,
					'left': options.left,
					'width': options.width,
					'height': options.height
				}, 'slow');
			}else{
				cropzoom.$selector.css({
					'top': options.top,
					'left': options.left,
					'width': options.width,
					'height': options.height
				});
			}
			cropzoom.selector_data = options;
			setOverlayPositions();
			if(cropzoom.settings.selector.onChange != null)
				cropzoom.settings.selector.onChange(cropzoom.getSettings());
				
			// constrainToSelector option restraining zoom
			setImageContainment();
		};
		
		//Restore the Plugin
		cropzoom.restore = function(options){
			$(this).empty();
			cropzoom.image_data = {};
			cropzoom.selector_data = {};
			if(cropzoom.settings.controls.zoomElement != ""){
				$(cropzoom.settings.controls.zoomElement).empty();
			}
			if(cropzoom.settings.controls.rotationElement != ""){
				$(cropzoom.settings.controls.rotationElement).empty();
			}
			if(cropzoom.settings.controls.movement_element != ""){
				$(cropzoom.settings.controls.movement_element).empty(); 
			}
			$(this).cropzoom(cropzoom.settings);
			if(cropzoom.settings.selector.onChange != null)
				cropzoom.settings.selector.onChange(cropzoom.getSettings());
		};
		
		cropzoom.resizeImage = function(options){
			if(!$.browser.msie){
				$(cropzoom.$image).attr('width',options.width + "px");
				$(cropzoom.$image).attr('height',options.height + "px");
			} else {
				$(cropzoom.$image).css({
					'width': options.width + "px",
					'height': options.height + "px"
				});
			}
			if(cropzoom.settings.selector.onChange != null)
				cropzoom.settings.selector.onChange(cropzoom.getSettings());
		};

		// Update the image
		cropzoom.updateImage = function(options){
			cropzoom.settings.image = $.extend(true, cropzoom.settings.image, options);
			cropzoom.restore();
			$(this).init();
			if(cropzoom.settings.selector.onChange != null)
				cropzoom.settings.selector.onChange(cropzoom.getSettings());
		};
		
		cropzoom.adjustImage = function(options){
			
			if(undefined != options.height && undefined == options.width){
				options.match_dimension = "height";
				
			} else if(undefined != options.width && undefined == options.height){
				options.match_dimension = "width";
				
			} else if(options.match_element == "selector"){
				options.height = cropzoom.selector_data.height;
				options.width = cropzoom.selector_data.width;
				options.left = cropzoom.selector_data.left;
				options.top = cropzoom.selector_data.top;
				
			} else if(options.match_element == "container" && options.match_method == "contain"){
				if(cropzoom.image_data.width > cropzoom.settings.width || cropzoom.image_data.height > cropzoom.settings.height){
					options.height = cropzoom.settings.height;
					options.width = cropzoom.settings.width;
				} else {
					options.height = cropzoom.image_data.height;
					options.width = cropzoom.image_data.width;
					options.match_dimension = "none";
				}
				options.left = 0;
				options.top = 0;
				
			} else if(options.match_element == "container") {
				// match the container area
				options.height = cropzoom.settings.height;
				options.width = cropzoom.settings.width;
				options.left = 0;
				options.top = 0;
			}
			
			// set image to actual size
			if(options.match_method == "actual"){
				options.height = cropzoom.settings.image.height;
				options.width = cropzoom.settings.image.width;
				options.left = cropzoom.image_data.left + (cropzoom.image_data.width - cropzoom.settings.image.width);
				options.top = cropzoom.image_data.top + (cropzoom.image_data.height - cropzoom.settings.image.height);
				
			// image height and width is unchanged if it fits in the container
			} else if(options.match_method == "contain" 
			&& (cropzoom.image_data.width < options.width && cropzoom.image_data.height < options.height)){
				options.height = cropzoom.image_data.height;
				options.width = cropzoom.image_data.width;
				
			// Check for limiting dimension
			} else if(undefined == options.match_dimension 
			&& (options.match_method == "fit" || options.match_method == "fill" || options.match_method == "contain")){
				var is_width_larger = (options.width / options.height) * cropzoom.settings.image.height < cropzoom.settings.image.width;
				options.match_dimension = (options.match_method != "fill" && is_width_larger) || (options.match_method == "fill" && !is_width_larger)?"width":"height";
			}

			var old_height = cropzoom.image_data.height;
			var old_width = cropzoom.image_data.width;
			
			if(options.match_dimension == "width") {
				cropzoom.image_data.height = Math.round(cropzoom.settings.image.height * (cropzoom.selector_data.width / cropzoom.settings.image.width));
				cropzoom.image_data.width = options.width;
				cropzoom.image_data.left = options.left;
				if(undefined != options.center && options.center)
					cropzoom.image_data.top = options.top + Math.round((options.height - cropzoom.image_data.height) / 2);
				else
					cropzoom.image_data.top = cropzoom.image_data.top + ((old_height - cropzoom.image_data.height) / 2);
					
			} else if(options.match_dimension == "height") {
				cropzoom.image_data.width = Math.round(cropzoom.settings.image.width * (options.height / cropzoom.settings.image.height));
				cropzoom.image_data.height = options.height;
				cropzoom.image_data.top = options.top;
				if(undefined != options.center && options.center)
					cropzoom.image_data.left = options.left + Math.round((options.width - cropzoom.image_data.width) / 2);
				else
					cropzoom.image_data.left = cropzoom.image_data.left + ((old_width - cropzoom.image_data.width) / 2);
					
			} else if(undefined != options.height && undefined != options.width) {
				cropzoom.image_data.width = options.width;
				cropzoom.image_data.height = options.height;
				if(undefined != options.center && options.center) {
					cropzoom.image_data.left = options.left + Math.round((cropzoom.settings.width - options.width) / 2);
					cropzoom.image_data.top = options.top + Math.round((cropzoom.settings.height - options.height) / 2);
				} else if(undefined != options.left && undefined != options.top) {
					cropzoom.image_data.left = options.left;
					cropzoom.image_data.top = options.top;
				} else {
					cropzoom.image_data.left = cropzoom.image_data.left + ((old_width - cropzoom.image_data.width) / 2);
					cropzoom.image_data.top = cropzoom.image_data.top + ((old_height - cropzoom.image_data.height) / 2);
				}
			}
			// ensure the image is properly positioned to the match element
			if(options.match_method == "fill"){
				if(cropzoom.image_data.left + cropzoom.image_data.width < options.left + options.width)
					cropzoom.image_data.left = options.left - (cropzoom.image_data.width - options.width);
				else if(cropzoom.image_data.left > options.left)
					cropzoom.image_data.left = options.left;
					
				if(cropzoom.image_data.top + cropzoom.image_data.height < options.top + options.height)
					cropzoom.image_data.top = options.top - (cropzoom.image_data.height - options.height);
				else if(cropzoom.image_data.top > options.top)
					cropzoom.image_data.top = options.top;
			}
			
			cropzoom.image_data.scaleX = (cropzoom.settings.image.width / cropzoom.image_data.width);
			cropzoom.image_data.scaleY = (cropzoom.settings.image.height / cropzoom.image_data.height);
			cropzoom.resizeImage({height: cropzoom.image_data.height, width: cropzoom.image_data.width});
			calculateTranslationAndRotation(cropzoom.$image, cropzoom.image_data);
			
			if(undefined != cropzoom.$zoom_slider_selector){
				var zoom_value = Math.round(100 * cropzoom.image_data.width / cropzoom.settings.image.width);
				zoom_value = (cropzoom.settings.controls.orientation == 'vertical' ? (cropzoom.settings.image.maxZoom - zoom_value) : zoom_value);
				cropzoom.$zoom_slider_selector.slider("value", zoom_value);
			}
			if(cropzoom.settings.selector.onChange != null)
				cropzoom.settings.selector.onChange(cropzoom.getSettings());
				
			setImageContainment();
		};
		
		cropzoom.getSettings = function(){
			return {
				image: {
					height: cropzoom.image_data.height,
					width: cropzoom.image_data.width,
					top: cropzoom.image_data.top,
					left: cropzoom.image_data.left,
					rotate: cropzoom.image_data.rotation
				},
				selector: {
					height: cropzoom.selector_data.height,
					width: cropzoom.selector_data.width,
					top: cropzoom.selector_data.top,
					left: cropzoom.selector_data.left
				}
			};
		};
		
		//Send the Data to the Server
		cropzoom.send = function(options){
			var response = "";
			if(undefined != options.custom)
				options.custom = {};
			$.ajax({
				url : options.url,
				type: options.type,
				data: (getParameters(options.custom)),
				success:function(r){ 
					cropzoom.$element.data('imageResult', r);
					if(options.onSuccess !== undefined && options.onSuccess != null)
						options.onSuccess(r);
				}
			});
		};
		
		// Private functions
		// ============================================================
		var limitBoundsToElement = function(position, element){
			var bottom = element.top-(cropzoom.image_data.height - element.height),
				right  = element.left-(cropzoom.image_data.width - element.width);
				
			if (position.top > element.top)
				cropzoom.image_data.top = element.top;
			else if (position.top < bottom)
				cropzoom.image_data.top = bottom;
			else
				cropzoom.image_data.top = position.top;
				
			if (position.left > element.left)
				cropzoom.image_data.left = element.left;
			else if (position.left < right)
				cropzoom.image_data.left = right;
			else
				cropzoom.image_data.left = position.left
			calculateTranslationAndRotation(cropzoom.$image, cropzoom.image_data);
		};
	
		var getExtensionSource = function(){
			var parts = cropzoom.settings.image.source.split('.');
			return parts[parts.length-1];	
		};
	
		var getCorrectSizes = function(){
			if(cropzoom.settings.image.startZoom != 0){
				var zoomInPx_width =  ((cropzoom.settings.image.width * Math.abs(cropzoom.settings.image.startZoom)) / 100);
				var zoomInPx_height =  ((cropzoom.settings.image.height * Math.abs(cropzoom.settings.image.startZoom)) / 100);
				cropzoom.image_data.height = zoomInPx_height;
				cropzoom.image_data.width = zoomInPx_width;
				if(cropzoom.image_data.height > cropzoom.settings.height)
					cropzoom.image_data.top = Math.abs((cropzoom.settings.height / 2) - (cropzoom.image_data.height / 2));
				else
					cropzoom.image_data.top = ((cropzoom.settings.height / 2) - (cropzoom.image_data.height / 2));
					
				if(cropzoom.image_data.width > cropzoom.settings.width)
					cropzoom.image_data.left = Math.abs((cropzoom.settings.width / 2) - (cropzoom.image_data.width / 2));
				else
					cropzoom.image_data.left = ((cropzoom.settings.width / 2) - (cropzoom.image_data.width / 2));
			}else{
				cropzoom.image_data.left = 0;
				cropzoom.image_data.top = 0;
				var scaleX = cropzoom.image_data.scaleX;
				var scaleY = cropzoom.image_data.scaleY;
				if(scaleY < scaleX){
					cropzoom.image_data.height = cropzoom.settings.height;
					cropzoom.image_data.width = Math.round(cropzoom.image_data.width * scaleY);
				}else{
					cropzoom.image_data.height = Math.round(cropzoom.image_data.height * scaleX); 
					cropzoom.image_data.width = cropzoom.settings.width;		
				}
			}
			
			//Disable snap to container if is little
			if(cropzoom.image_data.width < cropzoom.settings.width && cropzoom.image_data.height < cropzoom.settings.height){
				cropzoom.settings.image.snapToContainer = false;
			}
			calculateTranslationAndRotation(cropzoom.$image, cropzoom.image_data);
		};
	
		var setImageContainment = function(){
			var offset = cropzoom.$element.offset();
			if(cropzoom.settings.image.snapToContainer){
				cropzoom.image_data.containment = [
					offset.top,
					offset.left,
					offset.top + cropzoom.settings.height,
					offset.left + cropzoom.settings.width
				];
				$(cropzoom.$image).draggable("option", "containment", "parent");
			} else if(cropzoom.settings.image.constrainToSelector){
				// + 1 accounts for the border (I think)
				cropzoom.image_data.containment = [
					Math.ceil(offset.left) + cropzoom.selector_data.left - (cropzoom.image_data.width - cropzoom.selector_data.width) + 1,
					Math.ceil(offset.top) + cropzoom.selector_data.top - (cropzoom.image_data.height - cropzoom.selector_data.height) + 1,
					Math.floor(offset.left) + cropzoom.selector_data.left + 1,
					Math.floor(offset.top) + cropzoom.selector_data.top + 1
				];
				$(cropzoom.$image).draggable("option", "containment", cropzoom.image_data.containment);
			}
		};
		
		var createRotationSlider = function(){
	
			var rotationContainerSlider = $("<div />").addClass("cz-rotation-slider");
			rotationContainerSlider.addClass("cropzoom-controls");
	
			if(cropzoom.settings.controls.showMaxMin){
				var rotMin = $("<div />").addClass("rotationMin").html("0");
				var rotMax = $("<div />").addClass("rotationMax").html("360");
			}
	
			var $slider = $("<div />").addClass("rotationSlider");
			//Aplicamos el Slider  
			var orientation = 'vertical';
			var value = Math.abs(360 - cropzoom.settings.image.rotation);
	
	
			if(cropzoom.settings.controls.orientation == 'horizontal' ){
				orientation = 'horizontal';
				value = cropzoom.settings.image.rotation;
			}
	
			$slider.slider({
				orientation: orientation,  
				value: value,
				range:"max",
				min: 0,
				max: 360,
				step: ((cropzoom.settings.rotationSteps > 360 || cropzoom.settings.rotationSteps < 0) ? 1 : cropzoom.settings.rotationSteps),
				slide: function(event, ui) {
					// TODO: image.constrainToSelector and image.snapToContainer
					cropzoom.image_data.rotation = (value == 360 ? Math.abs(360 - ui.value) : Math.abs(ui.value));
					calculateTranslationAndRotation(cropzoom.$image, cropzoom.image_data); 
					if(cropzoom.settings.image.onRotate != null)
						cropzoom.settings.image.onRotate($slider, cropzoom.image_data.rotation);
				},
				change: function(event, ui){
					if(cropzoom.settings.selector.onChange != null)
						cropzoom.settings.selector.onChange(cropzoom.getSettings());
				}
			});
	
			if(cropzoom.settings.controls.showMaxMin){
				rotationContainerSlider.append(rotMin);
				rotationContainerSlider.append($slider);
				rotationContainerSlider.append(rotMax);
			} else {
				rotationContainerSlider.append($slider);
			}
	
			$slider.addClass(cropzoom.settings.controls.orientation);
			rotationContainerSlider.addClass(cropzoom.settings.controls.orientation);
			rotMin.addClass(cropzoom.settings.controls.orientation);
			rotMax.addClass(cropzoom.settings.controls.orientation);
			
			cropzoom.$rotation_slider_selector = $slider;
			if(cropzoom.settings.controls.rotationElement != ''){
				$(cropzoom.settings.controls.rotationElement).append(rotationContainerSlider);
			}else{
				cropzoom.$element.append(rotationContainerSlider);
			}
		};
	
		var createZoomSlider = function(){
	
			var zoomContainerSlider = $("<div />").addClass("cz-zoom-slider");
			zoomContainerSlider.addClass("cropzoom-controls");
	
			if(cropzoom.settings.controls.showMaxMin){
				var zoomMin = $("<div />").addClass("zoomMin").html("<b>-</b>");
				var zoomMax = $("<div />").addClass("zoomMax").html("<b>+</b>");
			}
	
			var $slider = $("<div />").addClass("zoomSlider");
	
			//Aplicamos el Slider 
			$slider.slider({
				orientation: (cropzoom.settings.controls.zoomElement != '' ? cropzoom.settings.controls.orientation : 'vertical'),
				value: (cropzoom.settings.image.startZoom != 0 ? cropzoom.settings.image.startZoom : getPercentOfZoom(cropzoom.image_data)),
				min: (cropzoom.settings.image.useStartZoomAsMinZoom ? cropzoom.settings.image.startZoom : cropzoom.settings.image.minZoom),
				max: cropzoom.settings.image.maxZoom,
				step: ((cropzoom.settings.zoomSteps > cropzoom.settings.image.maxZoom || cropzoom.settings.zoomSteps < 0) ? 1 : cropzoom.settings.zoomSteps),
				slide: function(event, ui) {
					var value = (cropzoom.settings.controls.orientation == 'vertical' ? (cropzoom.settings.image.maxZoom - ui.value) : ui.value);
					var zoomInPx_width =  (cropzoom.settings.image.width * Math.abs(value) / 100);
					var zoomInPx_height =  (cropzoom.settings.image.height * Math.abs(value) / 100);
					// constrainToSelector option restraining zoom
					if(cropzoom.settings.image.constrainToSelector 
					&& (zoomInPx_width < cropzoom.selector_data.width)){
						zoomInPx_width = cropzoom.selector_data.width;
						zoomInPx_height = cropzoom.settings.image.height / cropzoom.settings.image.width * cropzoom.selector_data.width;
					}
					if(cropzoom.settings.image.constrainToSelector 
					&& (zoomInPx_width < cropzoom.selector_data.width || zoomInPx_height < cropzoom.selector_data.height)){
						zoomInPx_height = cropzoom.selector_data.height;
						zoomInPx_width = cropzoom.settings.image.width / cropzoom.settings.image.height * cropzoom.selector_data.height;
					}
					cropzoom.resizeImage({height: zoomInPx_height, width: zoomInPx_width});
					
					var difX = (cropzoom.image_data.width / 2) - (zoomInPx_width / 2);
					var difY = (cropzoom.image_data.height / 2) - (zoomInPx_height / 2);
					
					var newX = (difX > 0 ? cropzoom.image_data.left + Math.abs(difX) : cropzoom.image_data.left - Math.abs(difX)); 
					var newY = (difY > 0 ? cropzoom.image_data.top + Math.abs(difY) : cropzoom.image_data.top - Math.abs(difY));
					// constrainToSelector option restraining zoom
					if(cropzoom.settings.image.constrainToSelector){
						if(newX > cropzoom.selector_data.left)
							newX = cropzoom.selector_data.left;
						if(newX + zoomInPx_width < cropzoom.selector_data.left + cropzoom.selector_data.width)
							newX = cropzoom.selector_data.left + cropzoom.selector_data.width - zoomInPx_width;
						if(newY > cropzoom.selector_data.top)
							newY = cropzoom.selector_data.top;
						if(newY + zoomInPx_height < cropzoom.selector_data.top + cropzoom.selector_data.height)
							newY = cropzoom.selector_data.top + cropzoom.selector_data.height - zoomInPx_height;
					}
					cropzoom.image_data.left = newX;
					cropzoom.image_data.top = newY;
					cropzoom.image_data.width = zoomInPx_width;
					cropzoom.image_data.height = zoomInPx_height;
					cropzoom.image_data.scaleX = (cropzoom.settings.image.width / cropzoom.image_data.width);
					cropzoom.image_data.scaleY = (cropzoom.settings.image.height / cropzoom.image_data.height);
					calculateTranslationAndRotation(cropzoom.$image, cropzoom.image_data);
					if(cropzoom.settings.image.onZoom != null){
						cropzoom.settings.image.onZoom(cropzoom.$image,cropzoom.image_data);
					}
				},
				stop: function(event, ui) {
					// constrainToSelector option correct zoom value
					if(cropzoom.settings.image.constrainToSelector){
						var zoom_value = Math.round(100 * cropzoom.image_data.width / cropzoom.settings.image.width);
						zoom_value = (cropzoom.settings.controls.orientation == 'vertical' ? (cropzoom.settings.image.maxZoom - zoom_value) : zoom_value);
						$(this).slider("value", zoom_value);
						setImageContainment();
					}
				},
				change: function(event, ui){
					if(cropzoom.settings.selector.onChange != null)
						cropzoom.settings.selector.onChange(cropzoom.getSettings());
				}
			});
	
			if(cropzoom.settings.controls.showMaxMin){
				if(cropzoom.settings.controls.orientation == 'vertical'){
					zoomContainerSlider.append(zoomMax);
					zoomContainerSlider.append($slider);
					zoomContainerSlider.append(zoomMin);
				}else{
					zoomContainerSlider.append(zoomMin);
					zoomContainerSlider.append($slider);
					zoomContainerSlider.append(zoomMax);
				}
				zoomMin.addClass(cropzoom.settings.controls.orientation);
				zoomMax.addClass(cropzoom.settings.controls.orientation);
			} else {
				zoomContainerSlider.append($slider);
			}
			$slider.addClass(cropzoom.settings.controls.orientation); 
	
			zoomContainerSlider.addClass(cropzoom.settings.controls.orientation);
			
			cropzoom.$zoom_slider_selector = $slider;
			
			if(cropzoom.settings.controls.zoomElement != ''){
				$(cropzoom.settings.controls.zoomElement).empty();
				$(cropzoom.settings.controls.zoomElement).append(zoomContainerSlider);
			}else{
				cropzoom.$element.append(zoomContainerSlider);
			}
		};
	
		var getPercentOfZoom = function(){
			var percent = 0;
			if(cropzoom.image_data.width > cropzoom.image_data.height){
				percent = cropzoom.settings.image.maxZoom - ((cropzoom.image_data.width * 100) / cropzoom.settings.image.width);
			}else{
				percent = cropzoom.settings.image.maxZoom - ((cropzoom.image_data.height * 100) / cropzoom.settings.image.height); 
			}
			return percent;
		};
	
		var createSelector = function(){
			if(cropzoom.settings.selector.centered){
				cropzoom.selector_data.top = (cropzoom.settings.height / 2) - (cropzoom.selector_data.height / 2);  
				cropzoom.selector_data.left = (cropzoom.settings.width / 2) - (cropzoom.selector_data.width / 2);  
			}
	
			cropzoom.$selector = $('<div />').attr('id',cropzoom.$element[0].id + '_selector').css({
				width: cropzoom.selector_data.width,
				height: cropzoom.selector_data.height,
				top: cropzoom.selector_data.top + 'px',
				left: cropzoom.selector_data.left + 'px'
			});
			cropzoom.$selector.addClass("cz-selector");
			
			//Aplicamos el drageo al selector
			cropzoom.$selector.draggable({
				containment: 'parent',
				iframeFix: true,
				refreshPositions: true,
				start: function(event,ui){
					if(cropzoom.settings.selector.hideOverlayOnDragAndResize && !cropzoom.settings.selector.hideOverlay)
						showOverlay();
				},
				drag: function(event,ui){
					//Actualizamos las posiciones de la mascara
					var selector = cropzoom.selector_data;
					cropzoom.selector_data.left = ui.position.left;
					cropzoom.selector_data.top = ui.position.top;
					setOverlayPositions();
					showInfo();
					if(cropzoom.settings.selector.onSelectorDrag != null)
						cropzoom.settings.selector.onSelectorDrag(cropzoom.$selector, cropzoom.selector_data); 
				},
				stop: function(event,ui){
					//Ocultar la mascara
					if(cropzoom.settings.selector.hideOverlayOnDragAndResize)
						hideOverlay();
					if(cropzoom.settings.selector.onSelectorDragStop != null)
						cropzoom.settings.selector.onSelectorDragStop(cropzoom.$selector, cropzoom.selector_data);
				},
				change: function(event, ui){
					if(cropzoom.settings.selector.onChange != null)
						cropzoom.settings.selector.onChange(cropzoom.getSettings());
				}
			});
			cropzoom.$selector.resizable({
				aspectRatio: cropzoom.settings.selector.aspectRatio,
				maxHeight: cropzoom.settings.selector.maxHeight, 
				maxWidth: cropzoom.settings.selector.maxWidth,
				minHeight : cropzoom.settings.selector.height,
				minWidth: cropzoom.settings.selector.width,
				containment: 'parent', 
				start: function(event,ui){
					if(cropzoom.settings.selector.hideOverlayOnDragAndResize && !cropzoom.settings.selector.hideOverlay)
						showOverlay();
				},
				resize: function(event,ui){
					//Actualizamos las posiciones de la mascara
					cropzoom.selector_data.height = ui.size.height;
					cropzoom.selector_data.width = ui.size.width;
					setOverlayPositions();
					showInfo();
					if(cropzoom.settings.selector.onSelectorResize != null)
						cropzoom.settings.selector.onSelectorResize(cropzoom.$selector,cropzoom.selector_data); 
				},
				stop:function(event,ui){
					if(cropzoom.settings.selector.hideOverlayOnDragAndResize)
						hideOverlay();
					if(cropzoom.settings.selector.onSelectorResizeStop != null)
						cropzoom.settings.selector.onSelectorResizeStop(cropzoom.$selector,cropzoom.selector_data);
					if(cropzoom.settings.selector.onChange != null)
						cropzoom.settings.selector.onChange(cropzoom.getSettings());
				},
				change: function(event, ui){
					if(cropzoom.settings.selector.onChange != null)
						cropzoom.settings.selector.onChange(cropzoom.getSettings());
				}
			});	 
	
			showInfo(cropzoom.$selector);
			if(cropzoom.settings.selector.hidden)
				cropzoom.$selector.hide();
			//Agregamos el selector al objeto contenedor
			cropzoom.$element.append(cropzoom.$selector);
		}
	
		var showInfo = function(){
			var _infoView = null;
			var alreadyAdded = false;
			if(cropzoom.$selector.find(".cz-info-view").length > 0){
				_infoView = cropzoom.$selector.find(".cz-info-view");
			}else{
				_infoView = $('<div />').addClass(".cz-info-view");
			}
			if(cropzoom.settings.selector.showPositionsOnDrag){
				_infoView.html("X:"+ cropzoom.selector_data.left + "px - Y:" + cropzoom.selector_data.top + "px");
				alreadyAdded = true;
			}
			if(cropzoom.settings.selector.showDimetionsOnDrag){
				if(alreadyAdded){
					_infoView.html(_infoView.html() + " | W:" + cropzoom.selector_data.width + "px - H:" + cropzoom.selector_data.height + "px");
				}else{
					_infoView.html("W:"+ cropzoom.selector_data.width + "px - H:" + cropzoom.selector_data.height + "px");
				}
			}
			cropzoom.$selector.append(_infoView);
		};
		
		var createOverlay = function(){
			var arr =['t cz-overlay', 'b cz-overlay', 'l cz-overlay', 'r cz-overlay'];
			if(cropzoom.settings.selector.enablePassThroughBorder)
				arr.push('t-border overlay-border', 'b-border overlay-border', 'l-border overlay-border', 'r-border overlay-border');
			if(cropzoom.settings.enableOverlayImage && cropzoom.settings.overlayImage.imageSource != "")
				arr.push('t-image overlay-image', 'b-image overlay-image', 'l-image overlay-image', 'r-image overlay-image');
				
			$.each(arr,function(){
				var overlay = $("<div />").attr("class",this);
				cropzoom.$element.append(overlay);  
			});
			if(cropzoom.settings.enableOverlayImage && cropzoom.settings.overlayImage.imageSource != "")
				$(".overlay-image").css("background-image", cropzoom.settings.overlayImage.imageSource);
		};
	
		var setOverlayPositions = function(){
			if(!cropzoom.settings.selector.hideOverlay)
				showOverlay();
			cropzoom.$element.find("div.cz-overlay.t").css({
				width: cropzoom.settings.width,
				height: cropzoom.selector_data.top,
				left: 0,
				top:0
			});
			cropzoom.$element.find("div.cz-overlay.b").css({
				width: cropzoom.settings.width,
				height: cropzoom.settings.height - (cropzoom.selector_data.top + cropzoom.selector_data.height),
				top: (cropzoom.selector_data.top + cropzoom.selector_data.height) + "px",
				left: 0
			});
			cropzoom.$element.find("div.cz-overlay.l").css({
				left: 0,
				top: cropzoom.selector_data.top,
				width: cropzoom.selector_data.left,
				height: cropzoom.selector_data.height
			});
			cropzoom.$element.find("div.cz-overlay.r").css({
				top: cropzoom.selector_data.top,
				left: (cropzoom.selector_data.left + cropzoom.selector_data.width) + "px",
				width: cropzoom.settings.width - (cropzoom.selector_data.left + cropzoom.selector_data.width),
				height: cropzoom.selector_data.height + "px"
			});
			
			if(cropzoom.settings.enableOverlayImage && cropzoom.settings.overlayImage.imageSource != ""){
				if(cropzoom.settings.overlayImage.matchSelector){
					cropzoom.settings.overlayImage.top = cropzoom.selector_data.top;
					cropzoom.settings.overlayImage.left = cropzoom.selector_data.left;
					cropzoom.settings.overlayImage.height = cropzoom.selector_data.height;
					cropzoom.settings.overlayImage.width = cropzoom.selector_data.width;
				}
				cropzoom.$element.find("div.cz-overlay.t-image").css({
					width: cropzoom.settings.width,
					height: cropzoom.overlayImage.top,
					left: 0,
					top:0,
					backgroundPosition: "0px 0px"
				});
				cropzoom.$element.find("div.cz-overlay.b-image").css({
					width: cropzoom.settings.width,
					height: cropzoom.settings.height - (cropzoom.overlayImage.top + cropzoom.overlayImage.height),
					top: (cropzoom.overlayImage.top + cropzoom.overlayImage.height) + "px",
					left: 0,
					backgroundPosition: "0px " + (cropzoom.overlayImage.top + cropzoom.overlayImage.height) + "px"
				});
				cropzoom.$element.find("div.cz-overlay.l-image").css({
					left: 0,
					top: cropzoom.overlayImage.top,
					width: cropzoom.overlayImage.left,
					height: cropzoom.overlayImage.height,
					backgroundPosition: "0px " + cropzoom.overlayImage.top + "px"
				});
				cropzoom.$element.find("div.cz-overlay.r-image").css({
					top: cropzoom.overlayImage.top,
					left: (cropzoom.overlayImage.left + cropzoom.overlayImage.width) + "px",
					width: cropzoom.settings.width - (cropzoom.overlayImage.left + cropzoom.overlayImage.width),
					height: cropzoom.overlayImage.height + "px",
					backgroundPosition: (cropzoom.overlayImage.left + cropzoom.overlayImage.width) + "px " + cropzoom.overlayImage.top + "px"
				});
			}
			
			if(cropzoom.settings.selector.enablePassThroughBorder){
				cropzoom.$element.find("div.cz-overlay.t-border").css({
					width: cropzoom.selector_data.width,
					height: cropzoom.selector_data.top,
					left: cropzoom.selector_data.left,
					top:0
				});
				cropzoom.$element.find("div.cz-overlay.b-border").css({
					width: cropzoom.selector_data.width,
					height: cropzoom.settings.height - (cropzoom.selector_data.top + cropzoom.selector_data.height),
					top: (cropzoom.selector_data.top + cropzoom.selector_data.height - 1) + "px",
					left: cropzoom.selector_data.left
				});
				cropzoom.$element.find("div.cz-overlay.l-border").css({
					left: 0,
					top: cropzoom.selector_data.top,
					width: cropzoom.selector_data.left,
					height: cropzoom.selector_data.height
				});
				cropzoom.$element.find("div.cz-overlay.r-border").css({
					top: cropzoom.selector_data.top,
					left: (cropzoom.selector_data.left + cropzoom.selector_data.width - 1) + "px",
					width: cropzoom.settings.width - (cropzoom.selector_data.left + cropzoom.selector_data.width),
					height: cropzoom.selector_data.height + "px"
				});
			}
		};
		
		var hideOverlay = function(){
			cropzoom.$element.find(".cz-overlay").hide();
		};
	
		var showOverlay = function(){
			cropzoom.$element.find(".cz-overlay").show();
		};
	
		var createMovementControls = function(){
			var table = $('<table>\
				<tr>\
					<td></td>\
					<td></td>\
					<td></td>\
				</tr>\
				<tr>\
					<td></td>\
					<td></td>\
					<td></td>\
				</tr>\
				<tr>\
					<td></td>\
					<td></td>\
					<td></td>\
				</tr>\
			</table>');
			var btns = [];
			btns.push($('<div />').addClass('mvn_no mvn mvn_corner'));
			btns.push($('<div />').addClass('mvn_n mvn'));
			btns.push($('<div />').addClass('mvn_ne mvn mvn_corner'));
			btns.push($('<div />').addClass('mvn_o mvn'));
			btns.push($('<div />').addClass('mvn_c mvn'));
			btns.push($('<div />').addClass('mvn_e mvn'));
			btns.push($('<div />').addClass('mvn_so mvn mvn_corner'));
			btns.push($('<div />').addClass('mvn_s mvn'));
			btns.push($('<div />').addClass('mvn_se mvn mvn_corner'));
			for(var i=0;i<btns.length;i++){
				btns[i].mousedown(function(){
					moveImage(this);			 
				}).mouseup(function(){
					clearTimeout(tMovement);
					move_timeout = 500;
					move_steps = cropzoom.settings.singleMovementSteps;
				}).mouseout(function(){
					if(tMovement != null)
						clearTimeout(tMovement);
					move_timeout = 500;
					move_steps = cropzoom.settings.singleMovementSteps;
				});
				table.find('td:eq('+i+')').append(btns[i]);
			}
			var movement_element = $("<div />");
			movement_element.addClass("cz-movement");
			movement_element.addClass("cropzoom-controls");
			movement_element.append(table);
			
			if(cropzoom.settings.controls.movement_element != "")
				$(cropzoom.settings.controls.movement_element).append(movement_element);
			else
				cropzoom.$element.append(movement_element);
		};
	
		var moveImage = function(obj){
	
			var newX = cropzoom.image_data.left;
			var newY = cropzoom.image_data.top;
			if($(obj).hasClass('mvn_no')){
				newX = (cropzoom.image_data.left - move_steps);
				newY = (cropzoom.image_data.top - move_steps);
			}else if($(obj).hasClass('mvn_n')){
				newY = (cropzoom.image_data.top - move_steps);
			}else if($(obj).hasClass('mvn_ne')){
				newX = (cropzoom.image_data.left + move_steps);
				newY = (cropzoom.image_data.top - move_steps);
			}else if($(obj).hasClass('mvn_o')){
				newX = (cropzoom.image_data.left - move_steps); 
			}else if($(obj).hasClass('mvn_c')){
				newX = (cropzoom.settings.width/2)-(cropzoom.image_data.width/2);
				newY = (cropzoom.settings.height/2)-(cropzoom.image_data.height/2);
			}else if($(obj).hasClass('mvn_e')){
				newX = (cropzoom.image_data.left + move_steps);
			}else if($(obj).hasClass('mvn_so')){
				newX = (cropzoom.image_data.left - move_steps);
				newY = (cropzoom.image_data.top + move_steps);
			}else if($(obj).hasClass('mvn_s')){
				newY = (cropzoom.image_data.top + move_steps);
			}else if($(obj).hasClass('mvn_se')){
				newX = (cropzoom.image_data.left + move_steps);
				newY = (cropzoom.image_data.top + move_steps);
			}
			
			if(cropzoom.settings.image.snapToContainer) {
				limitBoundsToElement({ top: newY, left: newX }, cropzoom.settings );
			} else if(cropzoom.settings.image.constrainToSelector) {
				limitBoundsToElement({ top: newY, left: newX }, cropzoom.selector_data);
			} else {
				cropzoom.image_data.left = newX;
				cropzoom.image_data.top = newY;
				calculateTranslationAndRotation(cropzoom.$image, cropzoom.image_data);
			}
				
			tMovement = setTimeout(function(){
				moveImage(obj);
			}, move_timeout);
			move_timeout = cropzoom.settings.movementSpeed;
			move_steps = cropzoom.settings.movementSteps;
		};
		
		var createImageMatchControls = function(){
			var image_size_element = $("<div />");
			image_size_element.addClass("cz-image-size-controls");
			image_size_element.addClass("cropzoom-controls");
			
			var btns = [];
			btns.push($('<div />').addClass("crop_control_button zoom_fill_btn").click(function(event){
				event.preventDefault();
				$('#image_crop_container').cropzoom("adjustImage", { match_element: "selector", match_method: "fill" });
			}));
			if(cropzoom.settings.controls.showWidthAndHeightFit){
				btns.push($('<div />').addClass("crop_control_button zoom_fit_height_btn").click(function(event){
					event.preventDefault();
					$('#image_crop_container').cropzoom("adjustImage", { match_element: "selector", match_dimension: "height" });
				}));
				btns.push($('<div />').addClass("crop_control_button zoom_fit_width_btn").click(function(event){
					event.preventDefault();
					$('#image_crop_container').cropzoom("adjustImage", { match_element: "selector", match_dimension: "width" });
				}));
			} else if(cropzoom.settings.controls.showFit) {
				btns.push($('<div />').addClass("crop_control_button zoom_fit_btn").click(function(event){
					event.preventDefault();
					$('#image_crop_container').cropzoom("adjustImage", { match_element: "selector", match_method: "fit" });
				}));
			}
			for(var i=0; i<btns.length; i++){
				btns[i].mousedown(function(){
					moveImage(this);			 
				}).mouseup(function(){
					clearTimeout(tMovement);
					move_timeout = 500;
				});
				image_size_element.append(btns[i]);
			}
			
			if(cropzoom.settings.controls.image_size_element != "")
				$(cropzoom.settings.controls.image_size_element).append(image_size_element);
			else
				cropzoom.$element.append(image_size_element);
		};
	
		var calculateTranslationAndRotation = function(){
			var rotation = "";
			var translation = "";
			$(function(){
				// console.log(imageData.id);
				if($.browser.msie){
					if($.support.leadingWhitespace){
						rotation = "rotate(" + cropzoom.image_data.rotation + "deg)";
						/* + (getData('image').posX + (getData('image').w / 2 )) + "," + (getData('image').posY + (getData('image').h / 2)) +*/
						$(cropzoom.$image).css({
							'msTransform': rotation,
							'top': cropzoom.image_data.top,
							'left': cropzoom.image_data.left
						});
					} else {
						rotation = cropzoom.image_data.rotation;
						$(cropzoom.$image).css({
							'rotation': rotation,
							'top': cropzoom.image_data.top,
							'left': cropzoom.image_data.left
						});
					}
				}else{
					rotation = "rotate(" + cropzoom.image_data.rotation + "," + (cropzoom.image_data.left + (cropzoom.image_data.width / 2 )) + "," + (cropzoom.image_data.top + (cropzoom.image_data.height / 2))  + ")";	
					translation = " translate(" + cropzoom.image_data.left + "," + cropzoom.image_data.top + ")"; 
					transformation = rotation + translation;
					$(cropzoom.$image).attr("transform", transformation);
				}
			});
		};
	
		var getParameters = function(custom){
			var fixed_data = {
				'viewPortW': cropzoom.settings.width,
				'viewPortH': cropzoom.settings.height,
				'imageX': cropzoom.image_data.left,
				'imageY': cropzoom.image_data.top,
				'imageRotate': cropzoom.image_data.rotation,
				'imageW': cropzoom.image_data.width,
				'imageH': cropzoom.image_data.height,
				'imageSource': cropzoom.image_data.source,
				'selectorX': cropzoom.selector_data.left,
				'selectorY': cropzoom.selector_data.top,
				'selectorW': cropzoom.selector_data.width,
				'selectorH': cropzoom.selector_data.height
			};
			return $.extend(fixed_data, custom);
		};
			
		// fire up the plugin!
		return cropzoom.init(options);
	};
	
	$.fn.cropzoom = function(options){
		// cache the arguments
		args = Array.prototype.slice.call(arguments, 1);
		if(undefined != $(this).data("cropzoom") && undefined != $(this).data("cropzoom")[options]){
			// reload state from the element
			var cropzoom = $(this).data("cropzoom");
			// call public functions as $(element).cropzoom("publicFunction", args)
			return cropzoom[options].apply(this, args);
		} else {
			return this.each(function(){
				if(undefined == $(this).data("cropzoom") && (typeof options === "object" || ! options)) {
					// create a new instance of cropzoom
					var cropzoom = new $.cropzoom(this, options);
					// in the jQuery version of the element
					// store a reference to the plugin object
					// you can later access the plugin and its methods and properties like
					// element.data('pluginName').publicMethod(arg1, arg2, ... argn) or
					// element.data('pluginName').settings.propertyName
					$(this).data("cropzoom", cropzoom);
					
				} else {
					$.error("Method " +  options + " does not exist in jQuery.cropzoom");
				}
			});
		}
	};
	
	/*Code taken from jquery.svgdom.js */
	/* Support adding class names to SVG nodes. */
	var origAddClass = $.fn.addClass;

	$.fn.addClass = function(classNames) {
		classNames = classNames || '';
		return this.each(function() {
			if (isSVGElem(this)) {
				var node = this;
				$.each(classNames.split(/\s+/), function(i, className) {
					var classes = (node.className ? node.className.baseVal : node.getAttribute('class'));
					if ($.inArray(className, classes.split(/\s+/)) == -1) {
						classes += (classes ? ' ' : '') + className;
						(node.className ? node.className.baseVal = classes :
						node.setAttribute('class',  classes));
					}
				});
			}
			else {
				origAddClass.apply($(this), [classNames]);
			}
		});
	};

	/* Support removing class names from SVG nodes. */
	var origRemoveClass = $.fn.removeClass;

	$.fn.removeClass = function(classNames) {
		classNames = classNames || '';
		return this.each(function() {
			if (isSVGElem(this)) {
				var node = this;
				$.each(classNames.split(/\s+/), function(i, className) {
					var classes = (node.className ? node.className.baseVal : node.getAttribute('class'));
					classes = $.grep(classes.split(/\s+/), function(n, i) { return n != className; }).
					join(' ');
					(node.className ? node.className.baseVal = classes :
					node.setAttribute('class', classes));
				});
			}
			else {
				origRemoveClass.apply($(this), [classNames]);
			}
		});
	};

	/* Support toggling class names on SVG nodes. */
	var origToggleClass = $.fn.toggleClass;

	$.fn.toggleClass = function(className, state) {
		return this.each(function() {
			if (isSVGElem(this)) {
				if (typeof state !== 'boolean') {
					state = !$(this).hasClass(className);
				}
				$(this)[(state ? 'add' : 'remove') + 'Class'](className);
			}
			else {
				origToggleClass.apply($(this), [className, state]);
			}
		});
	};

	/* Support checking class names on SVG nodes. */
	var origHasClass = $.fn.hasClass;

	$.fn.hasClass = function(className) {
		className = className || '';
		var found = false;
		this.each(function() {
			if (isSVGElem(this)) {
				var classes = (this.className ? this.className.baseVal :
				this.getAttribute('class')).split(/\s+/);
				found = ($.inArray(className, classes) > -1);
			}
			else {
				found = (origHasClass.apply($(this), [className]));
			}
			return !found;
		});
		return found;
	};

	/* Support attributes on SVG nodes. */
	var origAttr = $.fn.attr;

	$.fn.attr = function(name, value, type) {
		if (typeof name === 'string' && value === undefined) {
			var val = origAttr.apply(this, [name, value, type]);
			return (val && val.baseVal ? val.baseVal.valueAsString : val);
		}
		var options = name;
		if (typeof name === 'string') {
			options = {};
			options[name] = value;
		}
		return this.each(function() {
			if (isSVGElem(this)) {
				for (var n in options) {
					this.setAttribute(n,
					(typeof options[n] == 'function' ? options[n]() : options[n]));
				}
			}
			else {
				origAttr.apply($(this), [name, value, type]);
			}
		});
	};

	
	/* Support removing attributes on SVG nodes. */
	var origRemoveAttr = $.fn.removeAttr;

	$.fn.removeAttr = function(name) {
		return this.each(function() {
			if (isSVGElem(this)) {
				(this[name] && this[name].baseVal ? this[name].baseVal.value = '' :
				this.setAttribute(name, ''));
			}
			else {
				origRemoveAttr.apply($(this), [name]);
			}
		});
	}; 

	var isSVGElem = function(node) {
		return (node.nodeType == 1 && node.namespaceURI == 'http://www.w3.org/2000/svg');
	};

})(jQuery);

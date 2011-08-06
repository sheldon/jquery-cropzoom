/*
CropZoom v1.0.4
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

Modified by Magdiel Herrera
The tool was completly redesign from its original version to meet certain criterias
*/
(function($){
    
     var _self = null;
     var $options = null;
     var _selector = null;
     var _mimage = null;
     var flage=false;

        var is_time=true;
        var maxX1;
        var maxY1;
        var maxX2;
        var maxY2;
        var npx;
        var npy;
        var dragX;
        var dragY;
        var speedX = 2;
        var speedY = 2;

     $.fn.cropzoom = function(options){
        $options = $.extend(true,$.fn.cropzoom.defaults, options); 
        
        return this.each(function() {  
            
            //Verificamos que esten los plugins necesarios
            if(!$.isFunction($.fn.draggable) || !$.isFunction($.fn.resizable) || !$.isFunction($.fn.slider)){
                alert("You must include ui.draggable, ui.resizable and ui.slider to use cropZoom");
                return;
            }
            
            if($options.image.source == '' ||  $options.image.width == 0 || $options.image.height == 0){
                alert('You must set the source, witdth and height of the image element');
                return;
            }
            
            _self = $(this);
            _self.empty();
            _self.css({
                'width': $options.width,
                'height': $options.height,
                'background-color':$options.bgColor,
                'overflow':'hidden',
                'position':'relative'
            });
            
            
            setData('image',{ 
                h: $options.image.height,
                w: $options.image.width,
                posY: 0,
                posX: 0,
                scaleX: 0,
                scaleY: 0,
                rotation: 0,
                source: $options.image.source
            });
            
           
            calculateFactor();
            getCorrectSizes();

            getData('image').posX = Math.abs(($options.width / 2) - (getData('image').w / 2));
            getData('image').posY = Math.abs(($options.height / 2) - (getData('image').h/ 2));
            
            setData('selector',{
                x : $options.selector.x,
                y : $options.selector.y,
                w : ($options.selector.maxWidth != null ? ($options.selector.w > $options.selector.maxWidth ? $options.selector.maxWidth : $options.selector.w) : $options.selector.w),
                h : ($options.selector.maxHeight != null ? ($options.selector.h > $options.selector.maxHeight ? $options.selector.maxHeight : $options.selector.h) : $options.selector.h)
            });
            var $svg = null;
            var $image = null;
            if(!$.browser.msie){
                $svg = _self[0].ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
                $svg.setAttribute('id', 'k');
                $svg.setAttribute('width', $options.width);
                $svg.setAttribute('height', $options.height);
                $svg.setAttribute('preserveAspectRatio', 'none');
                $image = _self[0].ownerDocument.createElementNS('http://www.w3.org/2000/svg','image');
                $image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', $options.image.source);
                $image.setAttribute('width', getData('image').w);
                $image.setAttribute('height', getData('image').h);
                $image.setAttribute('id', 'img_to_crop');
                $image.setAttribute('preserveAspectRatio', 'none');
                $($image).attr('x', 0);
                $($image).attr('y', 0);
                $svg.appendChild($image);
            }else{
                // Add VML includes and namespace
                _self[0].ownerDocument.namespaces.add('v', 'urn:schemas-microsoft-com:vml', "#default#VML");
                
                // Add required css rules
                var style = document.createStyleSheet();
                //document.getElementsByTagName("head")[0].appendChild(document.createElement("style"));
                //var style = document.styleSheets[document.styleSheets.length - 1];
                
                style.addRule('v\\:image', "behavior: url(#default#VML);display:inline-block");
                style.addRule('v\\:image', "antiAlias: false;");
                
                $svg = $("<div />").attr("id","k").css({
                    'width':$options.width,
                    'height':$options.height,
                    'position':'absolute' 
                });
				if ($.support.leadingWhitespace) {
					$image = document.createElement('img');
				} else {
					$image = document.createElement('v:image');
				}

                
                $image.setAttribute('id','img_to_crop');
                $image.setAttribute('src',$options.image.source);
                $image.setAttribute('gamma','0');
                
                $($image).css({
                    'position':'absolute',
                    'left': '0px',
                    'top': '0px,
                    'margin':'0px',
                    'padding':'0px',
                    'width': getData('image').w,
                    'height':getData('image').h
                });
                $image.setAttribute('coordsize', '21600,21600');
                $image.outerHTML = $image.outerHTML;
                
                
                var ext = getExtensionSource();
                if(ext == 'png' || ext == 'gif')
                    $image.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+$options.image.source+"',sizingMethod='scale');"; 
                $svg.append($image);
            }
          _self.append($svg);
          calculateTranslationAndRotation(); 
          //Bindear el drageo a la imagen a cortar
          /*
          $($('#img_to_crop'),$image).draggable({
                drag:function(event,ui){ 
                    getData('image').posY = ui.position.top;
                    getData('image').posX = ui.position.left; 
                    calculateTranslationAndRotation();
                    //Fire the callback
                    if($options.onImageDrag != null)
                        $options.onImageDrag($('#img_to_crop'),getData('image'));
                }
          });
          */
          _mimage = $($('#img_to_crop'),$image);
            
            _self
             .mouseup(function(){
                if (flage) {
          		   getData('image').posY = npy;
                 getData('image').posX = npx; 
                 calculateTranslationAndRotation();
                 makeOverlayPositions1('selector');
                }
          	    flage=false;
             })
             .mousemove(function(event,ui){
                updateImagePos(event);
             });
            _mimage.
              mouseup(function(){
                if (flage) {
          		   getData('image').posY = npy;
                 getData('image').posX = npx; 
                 calculateTranslationAndRotation();
                 makeOverlayPositions1('selector');
                }
          	    flage=false;
             })
             .mousemove(function(event,ui){
                updateImagePos(event);               
             });


          //Creamos el selector  
          createSelector();
                    //Cambiamos el resizable por un color solido
          _self.find('.ui-icon-gripsmall-diagonal-se').css({
              'background':'#FFF',
              'border':'1px solid #000',
              'width':8,
              'height':8
          });
          //Creamos la Capa de oscurecimiento
          createOverlay(); 
          //Creamos el Control de Zoom 
          if($options.enableZoom) 
            createZoomSlider();
          //Creamos el Control de Rotacion
          if($options.enableRotation)
            createRotationSlider(); 
          //Maintein Chaining 
          return this;
        });
        
     }
     
     function updateImagePos(event) {
          	if (flage) {
          		if (is_time) {
          		 npx = getData('image').posX+Math.round((event.pageX-dragX)*speedX);
          		 npy = getData('image').posY+Math.round((event.pageY-dragY)*speedY);
          		 
          		 if (npx > maxX2) { npx = maxX2; }
          		 if (npy > maxY2) { npy = maxY2; }
               if (npx+getData('image').w < maxX1) { npx = maxX1-getData('image').w+1; }
               if (npy+getData('image').h < maxY1) { npy = maxY1-getData('image').h+1; }

          		 getData('image').posY = npy;
                 getData('image').posX = npx; 
                 calculateTranslationAndRotation();
                 //Fire the callback
                 if($options.onImageDrag != null)
                   $options.onImageDrag($('#img_to_crop'),getData('image'));
          	  }
              dragX = event.pageX;
          	  dragY = event.pageY;
            }
     }
     
     function getExtensionSource(){
        var parts = $options.image.source.split('.');
        return parts[parts.length-1];    
     }
     
     
     function calculateFactor(){  
        getData('image').scaleX = parseFloat($options.width / getData('image').w);
        getData('image').scaleY = parseFloat($options.height / getData('image').h); 
     }
     
     function getCorrectSizes(){
           
           var scaleX = getData('image').scaleX;
           var scaleY = getData('image').scaleY;
           if(scaleY < scaleX){
               getData('image').h = $options.height;
               getData('image').w = Math.round(getData('image').w * scaleY);
           }else{
               getData('image').h = Math.round(getData('image').h * scaleX); 
               getData('image').w = $options.width;        
           }
         
     }
     
     function calculateTranslationAndRotation(){
          var rotacion = "";
          var traslacion = "";
          $(function() {
				// console.log(imageData.id);
				if ($.browser.msie) {
					if ($.support.leadingWhitespace) {
						rotacion = "rotate("
								+ getData('image').rotation
								+ "deg)";
						$('#img_to_crop').css({
							'msTransform' : rotacion,
							'top' : getData('image').posY + "px",
							'left' : getData('image').posX + "px"
						});

					} else {
						rotacion = getData('image').rotation;
						$('#img_to_crop').css({
							'rotation' : rotacion,
							'top' : getData('image').posY + "px",
							'left' : getData('image').posX + "px"
						});
					}
				} else {
					rotacion = "rotate("
							+ getData('image').rotation
							+ ","
							+ (getData('image').posX + (getData('image').w / 2))
							+ ","
							+ (getData('image').posY + (getData('image').h / 2))
							+ ")";
					traslacion = " translate("
							+ getData('image').posX + ","
							+ getData('image').posY + ")";
					rotacion += traslacion;
					$('#img_to_crop').attr("transform", rotacion);
				}
			});
     }
     
     function createRotationSlider(){
         var rotationContainerSlider = $("<div />").css({
             'z-index':3,
             'opacity':1,
             'width':$(".sliderRotatorControlFacet").width()+45,
             'height': $(".sliderRotatorControlFacet").height(),
             'top': 5,
             'left': 5
         }).mouseover(function(){
             $(this).css('opacity',1);
         }).mouseout(function(){
             $(this).css('opacity',1);
         });
         
        /* var rotMin = $('<div />').css({
             'color':'#fff',
             'font':'700 14px Arial',
             'margin':'auto',
             'float':'left',
             'vertical-align':'middle',
             'padding-top':'3px',
             'height':25,
             'width':10
         });
         var rotMax = $('<div />').css({
             'color':'#fff',
             'font':'700 14px Arial',
             'margin':'auto',
             'float':'left', 
             'vertical-align':'middle',
             'padding-top':'3px',            
             'padding-left':'5px',            
             'height':25,
             'width':25
         });
         rotMin.html("0");
         rotMax.html("360");*/
         
         var $slider = $("<div />");
         //Aplicamos el Slider            
         $slider.slider({
            orientation: "horizontal",  
            value: 180,
            min: 0,
            max: 360,
            step: (($options.rotationSteps > 360 || $options.rotationSteps < 0) ? 1 : $options.rotationSteps),
            slide: function(event, ui) {
                getData('image').rotation = Math.abs(540 - ui.value);
                calculateTranslationAndRotation(); 
                if($options.onRotate != null)
                      $options.onRotate($('#img_to_crop'),getData('image').rotation);
            }
         })
         //rotationContainerSlider.append(rotMin);
         rotationContainerSlider.append($slider);
         //rotationContainerSlider.append(rotMax);
         $slider.css({
             'margin':' 7px auto',
             'height': 7,
             'position':'relative',
             'float':'left',
             'width':$(".sliderRotatorControlFacet").width()
         });
         
         //_self.append(rotationContainerSlider);
         $(".sliderRotatorControlFacet").append(rotationContainerSlider);       
     }
     
     function createZoomSlider(){
         //(_self.height() / 2),
         var zoomContainerSlider = $("<div />").css({  
             'z-index':3,
             'opacity':1,
             'width':$(".sliderZoomControlFacet").width()+ 45,
             'height': $(".sliderZoomControlFacet").height(),
             'top': 5,
             'right': 5
         }).mouseover(function(){
             $(this).css('opacity',1);
         }).mouseout(function(){
             $(this).css('opacity',1);
         });
         
        /* var zoomMin = $('<div />').css({
             'color':'#fff',
             'font':'700 16px Arial',
             'margin':'auto',
             'float':'left',
             'width':'20px',             
             'text-align':'center'
         }).html("<b>+</b>");
         var zoomMax = $('<div />').css({
             'color':'#fff',
             'font':'700 16px Arial',
             'margin':'auto',
             'width':'20px', 
             'float':'left',            
             'text-align':'center'
         }).html("<b>-</b>");*/
         
         var $slider = $("<div />");
         //Aplicamos el Slider
         //$(".sliderControlFacet").height()   
         $slider.slider({
            orientation: "horizontal",  
            value: getPercentOfZoom(),
            min: $options.image.minZoom,
            max: $options.image.maxZoom,
            step: (($options.zoomSteps > $options.image.maxZoom || $options.zoomSteps < 0) ? 1 : $options.zoomSteps),
            slide: function(event, ui) {
                var zoomInPx_width =  (($options.image.width * Math.abs(ui.value)) / 100);
                var zoomInPx_height =  (($options.image.height * Math.abs(ui.value)) / 100);
                if(!$.browser.msie){
                    $('#img_to_crop').attr('width',zoomInPx_width + "px");
                    $('#img_to_crop').attr('height',zoomInPx_height + "px");
                }else{
                    $('#img_to_crop').css({
                        'width': zoomInPx_width + "px",
                        'height': zoomInPx_height + "px"
                    });
                }
                
                getData('image').w = zoomInPx_width;
                getData('image').h = zoomInPx_height;
                calculateFactor(); 
                getData('image').posX =  (($options.width / 2) - (getData('image').w / 2));   
                getData('image').posY =  (($options.height / 2) - (getData('image').h / 2));   
                calculateTranslationAndRotation();
                if($options.onZoom != null){
                    $options.onZoom($('#img_to_crop'),getData('image'));
                }
                
            }
         })
         
         //zoomContainerSlider.append(zoomMax);
         zoomContainerSlider.append($slider);
         //zoomContainerSlider.append(zoomMin);
         $slider.css({
             'margin':' 7px auto',
             'height': 7,
             'width': $(".sliderZoomControlFacet").width(),
             'float':'left',
             'position':'relative'
         });
         
         /*
                var zoomInPx_width =  (($options.image.width * Math.abs(ui.value)) / 100);
                var zoomInPx_height =  (($options.image.height * Math.abs(ui.value)) / 100);         
         */
         
        //_self.append(zoomContainerSlider);
        $(".sliderZoomControlFacet").append(zoomContainerSlider);       
       
     }
     
     function getPercentOfZoom(){
         var percent = 0;
         if(getData('image').w > getData('image').h){
            percent = ((getData('image').w * 100) / $options.image.width);
         }else{
            percent = ((getData('image').h * 100) / $options.image.height); 
         }
         return percent;
     }
     
     function createSelector(){
        if($options.selector.centered){
           getData('selector').y = ($options.height / 2) - (getData('selector').h / 2);  
           getData('selector').x = ($options.width / 2) - (getData('selector').w / 2);  
        }
        _selector = $('<div />').attr('id','selector').css({
            'width': getData('selector').w,
            'height': getData('selector').h,
            'top': getData('selector').y + 'px',
            'left': getData('selector').x + 'px',
            'border':'0px solid ' + $options.selector.borderColor,
            'position':'absolute'
        }).mouseover(function(){
             $(this).css({
                'border':'0px solid '+ $options.selector.borderColorHover,
                'cursor':'move'
            })
         }).mouseout(function(){
             $(this).css({
                'border':'0px solid '+ $options.selector.borderColor,
                'cursor':'default'
            })
         });
        
        
        maxX1 = getData('selector').x;
        maxY1 = getData('selector').y;
        maxX2 = maxX1+getData('selector').w-1;
        maxY2 = maxY1+getData('selector').h-1;
        npx = 0;
        npy = 0;
        dragX=0;
        dragY=0;
        _selector
          .mousedown(function(event,ui){
          	flage=true;
          	hideOverlay();
          	dragX = event.pageX;
          	dragY = event.pageY;
          })
          .mouseup(function(){
            if (flage) {
          		   getData('image').posY = npy;
                 getData('image').posX = npx; 
                 calculateTranslationAndRotation();
                 makeOverlayPositions1('selector');
            }
          	flage=false;
          })
          .mousemove(function(event,ui){
          	updateImagePos(event);
          });
        
        //Aplicamos el drageo al selector
        
            /*
        _selector.draggable({
            containment: _self,
            iframeFix: true,
            refreshPositions: true,
            drag: function(event,ui){
              //Actualizamos las posiciones de la mascara 
              getData('selector').x = ui.position.left;
              getData('selector').y = ui.position.top;
              makeOverlayPositions(ui);
              showInfo(_selector);
              if($options.onSelectorDrag != null)
              $options.onSelectorDrag(_selector,getData('selector')); 
            },
            stop: function(event,ui){
                //Ocultar la mascara
                hideOverlay();
                if($options.onSelectorDragStop != null)
                    $options.onSelectorDragStop(_selector,getData('selector'));
            } 
        });
            */
        /*
         _selector.resizable({
            aspectRatio: $options.selector.aspectRatio,
            maxHeight: $options.selector.maxHeight, 
            maxWidth: $options.selector.maxWidth,
            minHeight : $options.selector.h,
            minWidth: $options.selector.w,
            containment: 'parent', 
            resize: function(event,ui){
                 //Actualizamos las posiciones de la mascara
               getData('selector').w = _selector.width();
               getData('selector').h = _selector.height();
               makeOverlayPositions(ui);
               showInfo(_selector);
               if($options.onSelectorResize != null)
                   $options.onSelectorResize(_selector,getData('selector')); 
            },
            stop:function(event,ui){
                if($options.onSelectorResizeStop != null)
                   $options.onSelectorResizeStop(_selector,getData('selector'));
            }
        });  */   
        
        showInfo(_selector);
        //Agregamos el selector al objeto contenedor
        _self.append(_selector);
     };
     
     function showInfo(_selector){
         
         var _infoView = null;
         var alreadyAdded = false;
         if(_selector.find("#infoSelector").length > 0){
             _infoView = _selector.find("#infoSelector");
         }else{
             _infoView = $('<div />').attr('id','infoSelector').css({
                'position':'absolute',
                'top':0,
                'left':0,
                'background':$options.selector.bgInfoLayer,
                'opacity':0.6,
                'font-size':$options.selector.infoFontSize + 'px',
                'font-family':'Arial',
                'color':$options.selector.infoFontColor,
                'width':'100%'
            });
         }
        if($options.selector.showDimetionsOnDrag){
           _infoView.html("X:"+ getData('selector').x + "px - Y:" + getData('selector').y + "px");
           alreadyAdded = true;
        }
        if($options.selector.showPositionsOnDrag){
            if(alreadyAdded)
                _infoView.html(_infoView.html() + " | W:"+ getData('selector').w + "px - H:" + getData('selector').h + "px");
            else
                _infoView.html("W:"+ getData('selector').w + "px - H:" + getData('selector').h + "px");
        }
        _selector.append(_infoView);
      }
     
     function createOverlay(){
        var arr =['t','b','l','r']
        $.each(arr,function(){
            var divO = $("<div />").attr("id",this).css({
             'overflow':'hidden',
             'background':$options.overlayColor,
             'opacity':0.6,
             'position':'absolute',
             'z-index':2,
             'visibility':'visible'   
            });
            _self.append(divO);  
        });
     }
     function makeOverlayPositions(ui){
            $("#t").css({
                "display":"block",
                "width":$options.width,
                'height': ui.position.top,
                'left': 0,
                'top':0
            });
            $("#b").css({
                "display":"block",
                "width":$options.width,
                'height': $options.height,
                'top': (ui.position.top + $("#selector").height()) + "px",
                'left': 0
            })
            $("#l").css({
                "display":"block",
                'left':0,
                'top': ui.position.top,
                'width': ui.position.left,
                'height': $("#selector").height()
            })
            $("#r").css({
                "display":"block",
                'top': ui.position.top,
                'left': (ui.position.left + $("#selector").width()) + "px",
                'width': $options.width,
                'height': $("#selector").height() + "px"
            })
     }
     function makeOverlayPositions1(tname){
            $("#t").css({
                "display":"block",
                "width":$options.width,
                'height': getData(tname).y,
                'left': 0,
                'top':0
            });
            $("#b").css({
                "display":"block",
                "width":$options.width,
                'height': $options.height,
                'top': (getData(tname).y + $("#selector").height()) + "px",
                'left': 0
            })
            $("#l").css({
                "display":"block",
                'left':0,
                'top': getData(tname).y,
                'width': getData(tname).x,
                'height': $("#selector").height()
            })
            $("#r").css({
                "display":"block",
                'top': getData(tname).y,
                'left': (getData(tname).x + $("#selector").width()) + "px",
                'width': $options.width,
                'height': $("#selector").height() + "px"
            })
     }
     function hideOverlay(){
         $("#t,#b,#l,#r").hide();
     }
     
     function setData(key,data){
         _self.data(key,data);
     }
     function getData(key){
        return _self.data(key);
     }
     
     
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

    function isSVGElem(node) {
        return (node.nodeType == 1 && node.namespaceURI == 'http://www.w3.org/2000/svg');
    }
    
    function getParameters(custom){
        var image = getData('image');
        var selector = getData('selector');
        var fixed_data = {
             'viewPortW': _self.width(),
             'viewPortH': _self.height(),
             'imageX':image.posX,
             'imageY': image.posY,
             'imageRotate': image.rotation,
             'imageW': image.w,
             'imageH': image.h,
             'imageSource': image.source,
             'selectorX': selector.x,
             'selectorY': selector.y,
             'selectorW': selector.w,
             'selectorH': selector.h
        };
        return $.extend(fixed_data,custom);
    }
     
    /* Defaults */ 
     $.fn.cropzoom.defaults = {  
           width: 500,  
           height: 375,
           bgColor: '#000',
           overlayColor: '#666',    
           selector: {
               x:0,
               y:0,
               w:229,
               h:100,
               aspectRatio:false,
               centered:false,
               borderColor: 'yellow',
               borderColorHover: 'red',
               bgInfoLayer: '#FFF',
               infoFontSize: 10,
               infoFontColor: 'blue',
               showPositionsOnDrag: true,
               showDimetionsOnDrag: true,
               maxHeight:null,
               maxWidth:null
           },
           image: {source:'',rotation:0,width:0,height:0,minZoom:10,maxZoom:150},
           enableRotation: true,
           enableZoom: true,
           zoomSteps: 1,
           rotationSteps: 5,
           onSelectorDrag:null,
           onSelectorDragStop: null,
           onSelectorResize: null,
           onSelectorResizeStop: null,
           onZoom: null,
           onRotate:null,
           onImageDrag:null
           
     };
     
     $.fn.extend({
        //Function to set the selector position and sizes
        setSelector: function(x,y,w,h,animate){
            if(animate != undefined && animate == true){
                $('#selector').animate({
                    'top': y,
                    'left': x,
                    'width': w,
                    'height': h
                },'slow');
            }else{
                $('#selector').css({
                    'top': y,
                    'left': x,
                    'width': w,
                    'height': h
                });
            }
            setData('selector',{
                x: x,
                y: y,
                w: w,
                h: h
            });
        },
        //Restore the Plugin
        restore: function(){
             _self.empty();
             $(".sliderZoomControlFacet").html(''); 
             $(".sliderRotatorControlFacet").html('');            
             setData('image',{});
             setData('selector',{});
            _self.cropzoom($options);
            _self.applymask('selector');            
        },
        //Send the Data to the Server
        send : function(url,type,custom,onSuccess){
             
             var response = "";
             $.ajax({
                 url : url,
                 type: type,
                 data: (getParameters(custom)),
                 success:function(r){ 
                    setData('imageResult',r);
                    if(onSuccess !== undefined && onSuccess != null)
                        onSuccess(r);
                 }
             });
             
         },
         applymask: function(tname) {
           makeOverlayPositions1(tname);
         }
     });

})(jQuery);
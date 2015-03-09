/** 
 *  SVGPan library 1.2.1
 * ======================
 *
 * Given an unique existing element with id "viewport" (or when missing, the first g 
 * element), including the the library into any SVG adds the following capabilities:
 *
 *  - Mouse panning
 *  - Mouse zooming (using the wheel)
 *  - Object dragging
 *
 * You can configure the behaviour of the pan/zoom/drag with the variables
 * listed in the CONFIGURATION section of this file.
 *
 * Known issues:
 *
 *  - Zooming (while panning) on Safari has still some issues
 *
 * Releases:
 *
 * 1.2.1, Mon Jul  4 00:33:18 CEST 2011, Andrea Leofreddi
 *	- Fixed a regression with mouse wheel (now working on Firefox 5)
 *	- Working with viewBox attribute (#4)
 *	- Added "use strict;" and fixed resulting warnings (#5)
 *	- Added configuration variables, dragging is disabled by default (#3)
 *
 * 1.2, Sat Mar 20 08:42:50 GMT 2010, Zeng Xiaohui
 *	Fixed a bug with browser mouse handler interaction
 *
 * 1.1, Wed Feb  3 17:39:33 GMT 2010, Zeng Xiaohui
 *	Updated the zoom code to support the mouse wheel on Safari/Chrome
 *
 * 1.0, Andrea Leofreddi
 *	First release
 *
 * This code is licensed under the following BSD license:
 *
 * Copyright 2009-2010 Andrea Leofreddi <a.leofreddi@itcharm.com>. All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 * 
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 * 
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY Andrea Leofreddi ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Andrea Leofreddi OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * The views and conclusions contained in the software and documentation are those of the
 * authors and should not be interpreted as representing official policies, either expressed
 * or implied, of Andrea Leofreddi.
 */

"use strict";

/// CONFIGURATION 
/// ====>

var enablePan = 1; // 1 or 0: enable or disable panning (default enabled)
var enableZoom = 1; // 1 or 0: enable or disable zooming (default enabled)
var enableDrag = 1; // 1 or 0: enable or disable dragging (default disabled)
//Labels should be visible when they are at least, say, 8 pixels.
var minVisTextSize=8; //Minimum visible text size on labels.
/// <====
/// END OF CONFIGURATION 

var root = document.getElementById("workspace");
var htmlBody=document.body;

var state = 'none', connected = '',svgRoot, stateTarget, stateOrigin, stateTf
var mapScaleX=1,mapScaleY=1,mapPosX=0,mapPosY=0,zoomLevel=1;
var lodFactor=1;var prevLodFactor=1;
var mapMatrix=document.getElementById("viewport").getCTM();

var collectedConns;


//Monitoring and performance variables
var shuffleCount=0;
var numberOfEvents=0;
var positionCount=0;
var sortCount=0;
var dragPipesCount=0
var compareCount=0;
var positionItemCount=0;

setupHandlers(root);

/**
 * Register handlers
 */
function setupHandlers(root){
	setAttributes(root, {
		"onmouseup" : "handleMouseUp(evt)",
		"onmousedown" : "handleMouseDown(evt)",
		"onmousemove" : "handleMouseMove(evt)",
		"onmousewheel" : "handleMouseWheel(evt)",
		//"onkeydown" : "handleKeyDown(evt)",
		//"onkeypress" : "handleKeyPress(evt)"
		//"onmouseout" : "handleMouseUp(evt)", // Decomment this to stop the pan functionality when dragging out of the SVG element
	});

	if(navigator.userAgent.toLowerCase().indexOf('webkit') >= 0){
		window.addEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
		window.addEventListener("keydown",handleKeyDown,false);
		window.addEventListener("keypress",handleKeyPress,false);
		window.addEventListener("keyup",handleKeyUp,false);
		window.addEventListener("resize",
				function(){
					console.log("resizing");
					root.setAttribute("width",0);root.setAttribute("height",0);
					root.setAttribute("width",window.getComputedStyle(htmlBody).width);
					root.setAttribute("height",window.getComputedStyle(htmlBody).height)},
				false);
		workspace.setAttribute("width",window.getComputedStyle(htmlBody).width);workspace.setAttribute("height",window.getComputedStyle(htmlBody).height)
	}
		
	else{
		window.addEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
		window.addEventListener("keydown",handleKeyDown,false);
		window.addEventListener("keypress",handleKeyPress,false);
		window.addEventListener("keyup",handleKeyUp,false);
		workspace.setAttribute("width","100%");workspace.setAttribute("height","100%")
	}
	
	

}

/**
 * Retrieves the root element for SVG manipulation. The element is then cached into the svgRoot global variable.
 */
function getRoot(root) {
	if(typeof(svgRoot) == "undefined") {
		var g = null;

		g = root.getElementById("viewport");

		if(g == null)
			g = root.getElementsByTagName('g')[0];

		if(g == null)
			alert('Unable to obtain SVG root element');

		setCTM(g, g.getCTM());

		g.removeAttribute("viewBox");

		svgRoot = g;
	}

	return svgRoot;
}

/**
 * Instance an SVGPoint object with given event coordinates.
 */
function getEventPoint(evt) {
	var p = root.createSVGPoint();

	p.x = evt.clientX;
	p.y = evt.clientY;
	
	return p;
}

/**
 * Sets the current transform matrix of an element.
 */
function setCTM(element, matrix) {
	var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";

	element.setAttribute("transform", s);
}

/**
 * Dumps a matrix to a string (useful for debug).
 */
function dumpMatrix(matrix) {
	var s = "[A: ScaleX: " + matrix.a.toFixed(2) + ", C: SkewX: " + matrix.c.toFixed(2) + ", E: MoveX: " + matrix.e.toFixed(2) + "\n\r  B: SkewY: " + matrix.b.toFixed(2) + ", D: ScaleY: " + matrix.d.toFixed(2) + ", F: MoveY: " + matrix.f.toFixed(2) + "\n  0, 0, 1 ]";

	return s;
}

/**
 * Sets attributes of an element.
 */
function setAttributes(element, attributes){
	for (var i in attributes)
		//element.setAttributeNS(null, i, attributes[i]);
		//IE FIX
		element.setAttribute(i, attributes[i]);
}

/**
 * Handle mouse wheel event.
 */
function handleMouseWheel(evt) {
	//console.log("Wheelin!...")
	if(!enableZoom)
		return;

	if(evt.preventDefault)
		evt.preventDefault();

	evt.returnValue = false;

	var svgDoc = evt.target.ownerDocument;

	var delta;

	if(evt.wheelDelta)
		delta = evt.wheelDelta / 1000; // Chrome/Safari (original factor 3600)
	else
		delta = evt.detail / -40; // Mozilla (original factor -90)

	var z = 1 + delta; // Zoom factor: 0.9/1.1

	var g = getRoot(svgDoc);
	
	var p = getEventPoint(evt);

	p = p.matrixTransform(g.getCTM().inverse());//console.log(p)

	// Compute new scale matrix in current mouse position
	var k = root.createSVGMatrix().translate(p.x, p.y).scale(z).translate(-p.x, -p.y);//console.log(k)
	//var k = root.createSVGMatrix().scale(z);console.log(k)

        setCTM(g, g.getCTM().multiply(k));

	if(typeof(stateTf) == "undefined")
		stateTf = g.getCTM().inverse();

	stateTf = stateTf.multiply(k.inverse());
	mapMatrix = document.getElementById("viewport").getCTM();
	//Try to do LOD as a separate "thread" so that the UI doesn't stutter
	lod();
	
	//setTimeout(lod,10);
	
	//mapScaleX=mapMatrix.a;//console.log(scaleA)
	//mapScaleY=mapMatrix.d;
	//mapPosX=mapMatrix.e;
	//mapPosY=mapMatrix.f;
}

/**
 * Handle mouse move event.
 */
function handleMouseMove(evt) {
	numberOfEvents++;
	if(evt.preventDefault)
		evt.preventDefault();
	
	evt.returnValue = false;

	var svgDoc = evt.target.ownerDocument;

	var g = getRoot(svgDoc);

	if(state == 'pan' && enablePan) {
		// Pan mode
		var p = getEventPoint(evt).matrixTransform(stateTf);

		setCTM(g, stateTf.inverse().translate(p.x - stateOrigin.x, p.y - stateOrigin.y));
		mapMatrix = viewport.getCTM();
		mapScaleX=mapMatrix.a;//console.log(scaleA)
		mapScaleY=mapMatrix.d;
		mapPosX=mapMatrix.e;
		mapPosY=mapMatrix.f;
		
	} else if(state == "dragGroup" && enableDrag){
		var p = getEventPoint(evt).matrixTransform(g.getCTM().inverse());
		//console.log(numberOfEvents)
		
		setCTM(stateTarget, root.createSVGMatrix()
		       .translate(p.x - stateOrigin.x, p.y - stateOrigin.y)
		       .multiply(stateTarget.parentNode.getCTM().inverse())//Yes!! not viewport CTM - parent CTM!
		       .multiply(stateTarget.getCTM())
		       );
		if (connected == "true"/* && (numberOfEvents % 2 === 0)*/){
			//shuffleCount=0;
			collectedConns=positionPipesNew(collectedConns);
			dragPipes(collectedConns.pipes);
			//for(var i=0,pl=pipes.length;i<pl;i++)
			//{
			//	setCTM(pipes[i].pipe,root.createSVGMatrix()
			//	.translate(-(pipes[i].pipe.parentNode.getCTM().e/mapMatrix.a-mapMatrix.e/mapMatrix.a)
			//	,-(pipes[i].pipe.parentNode.getCTM().f/mapMatrix.d-mapMatrix.f/mapMatrix.d)))
			//}
			
		}
		stateOrigin = p;
	} else if(state=="resizePipe" && appMode=="whatIf"){
		console.log("state: ",state)
		
		var p = getEventPoint(evt).matrixTransform(g.getCTM().inverse());
		
		var diff = p.y-stateOrigin.y;
		
		console.log("Diff is ",diff);
		
		var bw=Number(stateTarget.getAttribute("bw"));
		
		var bw1=Number(stateTarget.getAttribute("bw1"));
		
		bw=bw+diff;
		bw1=bw1+diff;
		
		stateTarget.setAttribute("bw",bw);stateTarget.setAttribute("bw1",bw1);
		
		var origin=document.getElementById(stateTarget.getAttribute("origin"));
		
		var c=collectConnsUpdate([origin]);
		
		c=positionPipesNew(c);
		
		stateTarget.setAttribute("d",dragMovingPipe(stateTarget))
		
	} else if(state == 'drag' && enableDrag) {
		// Drag mode
		var p = getEventPoint(evt).matrixTransform(g.getCTM().inverse());

		setCTM(stateTarget, root.createSVGMatrix().translate(p.x - stateOrigin.x, p.y - stateOrigin.y).multiply(g.getCTM().inverse()).multiply(stateTarget.getCTM()));

		stateOrigin = p;
		//mapMatrix = viewport.getCTM();
		//mapScaleX=mapMatrix.a;//console.log(scaleA)
		//mapScaleY=mapMatrix.d;
		//mapPosX=mapMatrix.e;
		//mapPosY=mapMatrix.f;
	}
	
//	document.getElementById("mousePos").innerHTML="Mouse XY: "+evt.clientX+" : "+evt.clientY

}

/**
 * Handle click event.
 */
function handleMouseDown(evt) {
	if(evt.preventDefault)
		evt.preventDefault();
	//console.log(evt)
	connected="false";
	console.log('ID: ',evt.target.id);
	var targetDesc=null,targetInfo=null;
	targetDesc = evt.target.getAttribute("desc");
	if (targetDesc == null) {
		targetDesc = 'no description';
	}
	//if (evt.target.__data__ && evt.target.__data__.desc) {
	//	targetInfo = evt.target.__data__.desc;
	//}
	var datum = d3.select(evt.target).datum();
	if (datum && datum.desc) {
		targetInfo = datum.desc;
	}
	else if (datum && datum[0] && datum[0].desc) {
		targetInfo = datum[0].desc;
	}
	
	if (targetInfo == null) {
		targetInfo = 'no info';
	}
	console.log("Description: ",targetDesc);
	console.log("Info: ",targetInfo)
	console.log(document.getElementById(evt.target.id))
	console.log(document.getElementById(evt.target.id).parentNode)
	evt.returnValue = false;

	var svgDoc = evt.target.ownerDocument;

	var g = getRoot(svgDoc);//alert(g.id) - viewport
	
	if(
		evt.target.tagName == "svg" 
		|| !enableDrag // Pan anyway when drag is disabled and the user clicked on an element 
	) {
		// Pan mode
		state = 'pan';
		//console.log(evt.target.id);
		stateTf = g.getCTM().inverse();

		stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
	} else if(evt.target.parentNode.tagName == "g" && evt.target.parentNode.id != "viewport" && evt.target.getAttribute("class")!="pipe"){
		
		state = "dragGroup";//console.log(state);
		if (evt.target.parentNode.getAttribute("connected") == "true"){
			collectedConns=collectConns(evt.target);
			//mConns=collectedConns.mConns;
			//sConns=collectedConns.sConns;
			//sConnsR=collectedConns.sConnsR;
			//pipes=collectedConns.pipes;
			if(collectedConns.pipes.length==0){connected="false"};
		}
		//console.log(p);console.log(mConns);console.log(sConns);console.log(sConnsR);console.log(pipes);console.log(pipes.length);
		//if(collectedConns.pipes.length==0){connected="false"};
		numberOfEvents=0;
		positionCount=0;
		stateTarget = evt.target.parentNode;//console.log("State Target: ");console.log(stateTarget)
		stateTf = g.getCTM().inverse();
		stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
		select(stateTarget,evt);
	} else if (evt.target.getAttribute("class")=="pipe"){
		state="resizePipe";
		
		stateTarget=evt.target;
		
		stateTf = g.getCTM().inverse();

		stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
		
		select(stateTarget,evt);
		
	} else {
		// Drag mode
		state = 'drag';console.log(state);
	
		stateTarget = evt.target;
	
		stateTf = g.getCTM().inverse();

		stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
	}
}

/**
 * Handle mouse button release event.
 */
function handleMouseUp(evt) {
	if(evt.preventDefault)
		evt.preventDefault();

	evt.returnValue = false;

	var svgDoc = evt.target.ownerDocument;

	if(state == 'pan' || state == 'drag' || state == 'dragGroup' || state == "resizePipe") {
		// Quit pan mode
		state = '';connected = '';//console.log(numberOfEvents);numberOfEvents=0;		
		//console.log("Pipes processed: "+mConns.length)
		//console.log("Function reshuffle was called this many times: "+shuffleCount);
		shuffleCount=0;
		//console.log("Mouse moved this many times: "+numberOfEvents);
		numberOfEvents=0;
		//console.log("Function dragPipes was called this many times: "+dragPipesCount);
		dragPipesCount=0;
		//console.log("Function positionPipes was called this many times: "+positionCount);
		positionCount=0;
		//console.log("Function sortDragPipes was called this many times: "+sortCount);
		sortCount=0;
		//console.log("Sorting iteration was done this many times: "+compareCount);
		compareCount=0;
		
		//pipes.length=0;mConns.length=0;sConns.length=0;sConnsR.length=0;
		//setTimeout(flexPipe(document.getElementById("rect_1"),document.getElementById("rect_0"),30,"pipe_2"),2000)
	}
}
function select(tgt,evt){
	//This function "selects" an item that was clicked (changes appearance)
	//In addition it calculates the stream this item may belong to
	
	//return;
	//Clear previous selections - unless CTRL is pressed
	
	//Fix this to reflect item template configuration
	d3.selectAll("[selected='true']")
		.each(function(){
			var item = d3.select(this);
			var template = item.attr("template");
			var attrs = {};
			attrs["stroke-width"] = itemTemplate[template]["stroke-width"];
			attrs["stroke"] = itemTemplate[template]["stroke"];
			attrs["fill"] = itemTemplate[template]["fill"];
			attrs["fill-opacity"] = itemTemplate[template]["fill-opacity"];
			attrs["selected"] = "false";
			//debugger;
			item.attr(attrs);
		})
	
	var streamItems = [];
	
	traceStream(d3.select(tgt).attr("id"));
	
	colorStream(streamItems);
	
	
	function traceStream(item,connId){
		
		var target = d3.select("#"+item)
		
		//Figure out if the clicked item is pipe or device/sample
		if(target.attr("class")=="pipe"){
			//It's a pipe. Identify left and right parents, and trace both
			
			var connA=target.attr("leftparent");
			var connB=target.attr("rightparent");
			
			//var lparent = d3.select("#"+lp).attr("parent");
			//var rparent = d3.select("#"+rp).attr("parent");
			
			
			
			//var lparent = lconn.attr("parent");
			//var rparent = rconn.attr("parent");
			
			streamItems.push(target.attr("id"));
			//debugger;
			if (connId) {
				if (connId == connA) {
					traceStream(connB);
				}
				if (connId == connB) {
					traceStream(connA);
				}
			}
			else{
				traceStream(connA);//Trace stream from connector out
				traceStream(connB);
			}
		}
		else{
			//It's a pipe connector - a sample or a device
			//Find all other connectors, and trace pipes out of them
			//var connector = d3.select("#" + target);
			//debugger;
			var itemClass = target.attr("class");
			
			if (itemClass == "connector") {
				var parent = target.attr("parent");
				var parentGroup = target.property("parentNode");
			}
			else{
				if (target.property("nodeName") == "g") {//the target is a group
					var parentGroup = target.node();
					var parent = target.select("rect[parent="+target.attr("parent")+"]").attr("id")
				}
				else{//the target is RECT - unlikely?
					var parentGroup = target.property("parentNode");
					var parent = target.attr("id");
				}
			}
				
			
			
			
			//Select sibling connectors that have pipes attached. 
			var connectors = d3
					.select(parentGroup)
					.selectAll(".connector[pipes]") //Should only be maximum of 2 usually I think. Select all dependents
					//.selectAll(".connector[parent="+parent+"][pipes]") //Should only be maximum of 2 usually I think //Select only direct dependents
					.filter(function(){return this.id != target.attr("id")});//Filter out the connector that started this function
					
			streamItems.push(parent); //Add the sample/device to list
			
			connectors
				.each(function(){
					var connId = this.id;
					
					var pipes = d3.selectAll(".pipe[rightparent="+connId+"],.pipe[leftparent="+connId+"]")
					
					pipes.each(function(){traceStream(this.id,connId)})
					
					})
			
		}
		
		
	}
	
	function colorStream(streamItems){
		
		for (var z = 0; z < streamItems.length; z++){
			var item = d3.select("#"+streamItems[z]);
			var template = item.attr("template");
			var selectedAttrs = itemAttrs[template].selectedAttrs;
			item
				.attr("selected","true")
				.attr(selectedAttrs)
		}
		
		//streams.attr("stroke-width",1).attr("selected","true");
		//parents.attr("stroke-width",1).attr("stroke","red").attr("selected","true");
	}
	
	return;
	
	var target=d3.select(tgt);
	var pipes=[];
	var streams=[];var tmpStreams=[];
	var parents=[];var tmpParents=[];
	
	if(target.attr("class")=="pipe"){
		var lp=target.attr("leftparent");
		var rp=target.attr("rightparent");
		var connectors=d3.selectAll("#"+lp+",#"+rp);
		pipes=target;
	}
	else{
		//Get all connectors belonging to the clicked object
		var connectors=target.selectAll(".connector[pipes]");
		connectors.each(function(){
			var z = d3.selectAll(".pipe[rightparent="+this.id+"],.pipe[leftparent="+this.id+"]");
			z.each(function(){pipes.push(this);});
			}
		)
		console.log("Connectors selected: ",connectors.length)
		//Get all pipes connected to these connectors
		pipes=d3.selectAll(pipes);
	}
	
	
	
	//Find all streams
	pipes.each(function(){
		var stream=d3.select(this).attr("stream");
		if (tmpStreams.indexOf(stream)==-1){
			tmpStreams.push(stream);
			var x=d3.selectAll(".pipe[stream='"+stream+"']")
			x.each(function(){streams.push(this);});
		}
		}
	)
	streams=d3.selectAll(streams);
	streams.each(function(){
		//Select Left parent CONNECTOR
		var parent=this.getAttribute("leftparent");
		parent=document.getElementById(parent);
		//Get the actual item this connector belongs to
		parent=document.getElementById(parent.getAttribute("parent"))
		if(tmpParents.indexOf(parent.id)==-1){
			tmpParents.push(parent.id);
			parents.push(parent)
		}
		var parent=this.getAttribute("rightparent")
		parent=document.getElementById(parent);
		parent=document.getElementById(parent.getAttribute("parent"))
		if(tmpParents.indexOf(parent.id)==-1){
			tmpParents.push(parent.id);
			parents.push(parent)
		}
	})
	parents=d3.selectAll(parents);
	streams.attr("stroke-width",1).attr("selected","true");
	parents.attr("stroke-width",1).attr("stroke","red").attr("selected","true");
}
function handleKeyDown(evt){
	console.log("key down: "+evt.keyIdentifier)
	console.log("key code: "+evt.keyCode)
	console.log("key",String.fromCharCode(evt.keyCode))
	if(evt.keyCode == 27){//ESC key pressed
		//d3.selectAll(".pipe[selected='true']").attr("stroke-width",0.005).attr("selected","false");
		//d3.selectAll("rect[selected='true']").attr("stroke-width",0.2).attr("stroke","black").attr("selected","false");
		
		
		d3.selectAll("[selected='true']")
		.each(function(){
			var item = d3.select(this);
			var template = item.attr("template");
			var attrs = {};
			attrs["stroke-width"] = itemTemplate[template]["stroke-width"];
			attrs["stroke"] = itemTemplate[template]["stroke"];
			attrs["fill"] = itemTemplate[template]["fill"];
			attrs["fill-opacity"] = itemTemplate[template]["fill-opacity"];
			attrs["selected"] = "false";
			//debugger;
			item.attr(attrs);
		})
		
	}
}
function handleKeyPress(evt){
	//console.log("key pressed")
	if(evt.keyCode == 27){//ESC key pressed
	}
	var event=evt;
}
function handleKeyUp(evt){
	//console.log("key up")
	var event=evt;
}
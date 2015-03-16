$(function() {

	function getDevicesFromTrace(device_data) {
		console.log(device_data);
		for (key in device_data) {
			//device_names.push(device_data[key]['name']);	
			$("#deviceList").append("<li>" + device_data[key]['name'] + "</li>");
		}
	}

	function parseMap(map_result) {
		var sources = map_result.id_cluster_default.id_clientContainer_id_cluster_default.id_25614da7;
		console.log(sources);
	}

	function parseTrace(trace_result) {
		getDevicesFromTrace(trace_result.devices);
	}

	function retrieveMap() {
		d3.json("http://raptor:8888/map", parseMap)
	}

	function retrieveTrace() {
		d3.json("http://raptor:8888/trace", parseTrace);
	}

	function getData() {
		retrieveMap();
		retrieveTrace();
	}	

	function init() {
		$( "[class^='span']" ).sortable({
		  connectWith: "[class^='span']",
		  handle: ".portlet-header",
		  cancel: ".portlet-toggle",
		  placeholder: "portlet-placeholder ui-corner-all"
		});

		$( ".portlet" )
		  .addClass( "ui-widget ui-widget-content ui-helper-clearfix ui-corner-all" )
		  .find( ".portlet-header" )
			.addClass( "ui-widget-header ui-corner-all" )
			.prepend( "<span class='ui-icon ui-icon-minusthick portlet-toggle'></span>");

		$( ".portlet-toggle" ).click(function() {
		  var icon = $( this );
		  icon.toggleClass( "ui-icon-minusthick ui-icon-plusthick" );
		  icon.closest( ".portlet" ).find( ".portlet-content" ).toggle();
		});

		$('.portletConfig').click(function() {
			//console.log($(this).next());
			$(this).append($('.configMenu')).html();
			$('.configMenu').show();
		});

		$('.deviceSource').click(function() {
			$('.configOption').hide();
			$('.deviceSources').show();
		});

		$('.dataSource').click(function() {
			$('.configOption').hide();
			$('.dataSources').show();
		});

		$('.graphType').click(function() {
			$('.configOption').hide();
			$('.graphTypes').show();
		});

		$('.closeConfig').on("click", function () {
			$(this).parents('.configMenu').fadeOut();
		});

		$('.remove').on("click", function () {
			$(this).parents('.portlet').fadeOut();
		});

		getData();
	}

	document.onreadystatechange = function() {
		if(this.readyState == "complete") {
			init();
		}
	}

	//var controllers = sources.controllers;
	//var cpus = sources.cpus;
	//var nics = sources.nics;
	//var raids = sources.raids;
	//console.log(controllers);
	//console.log(cpus);
	//console.log(nics);
	//console.log(raids);
});

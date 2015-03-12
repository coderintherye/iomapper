$(function() {
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
		$('.configMenu').show();
	});

	$('.dataSource').click(function() {
		$('.configOption').hide();
		$('.dataSources').show();
	});

	$('.graphType').click(function() {
		$('.configOption').hide();
		$('.graphTypes').show();
	});

	$('.remove').click(function() {
		// @todo
	});

	$('.closeConfig').click(function() {
		$('.configMenu').hide();
	});
});

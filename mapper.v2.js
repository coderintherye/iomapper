var child = require('child_process'),
        fs = require('fs'),
	http = require('http'),
	events = require('events'),
	eventEmitter = new events.EventEmitter(),
	DB = require('node-cassandra-cql').Client,
	dbhosts = ['localhost'],//Database host
	db = new DB({hosts:dbhosts,keyspace:'iomapper'});
	//traceInterval = 10000,
	//configInterval = 60000;
        
global.map = {};
global.trace = {};
global.selectCounter = 0;
global.resultCounter = 0;
global.traceInterval = 15000;
global.configInterval = 60000;
global.intervals = new Array();
global.ids = new Object();
global.zeroIds = new Object();
global.mapReady = false;
//global.parents = [];


http.createServer(function (request, response) {
    console.log('request starting...');
	var url = request.url;
	var content = '';
	var badRequest = false;
	switch(url){
		case '/map':
			content = JSON.stringify(map);
			respond(content);
			break;
		case '/trace':
			content = JSON.stringify(trace);
                        respond(content);
			break;
		default:
			content = 'Unknown URL: '+url;
			badRequest = true;
			break;
	}
	if(badRequest){
		reject(content);
	}
	function reject(err){
		response.writeHead(500);
		console.log("error: ",err);
		console.log("Response failure. URL: ",url)
		response.end();
	}
	
	function respond(data){
		//response.writeHead(200, { 'Content-Type': 'application/json' });
                //REMOVE THAT HEADER later
                response.writeHead(200, { 'Content-Type': 'application/json','Access-Control-Allow-Origin':'*' });

		response.end(data, 'utf-8');
		//console.log("Machine config sent")
		console.log("Response success. URL: ",url);
	}
	
}).listen(8888);
console.log('Server listening on port 8888');

function buildMap(base,parent){
        selectCounter++;
        function data(base){//Define closure function to pass current variables to callback. Don't ask how
                return base;
        }
        
        var query = "select parent,html_id,template,json from mapper where parent='" + parent + "'";
        db.execute(query,function(err,result){
                resultCounter++;
                var obj = data(base)
                //debugger;
                if (err) {console.log('ERROR: ',err)}
                else if (result.rows.length == 0) {
                        console.log('No more children for this item, done');
                        console.log('ID: ',obj.id)
                        console.log('Map Ready');
                        if (resultCounter==selectCounter) {
                                eventEmitter.emit('map_done');
                               // debugger;
                        }
                        //Populate ids list:
                        //First clean up old map ids in case they changed. Should be very infrequent (e.g. device removed)
                        ids.map = [];
                        function walk(obj){
                                for(var leaf in obj){
                                        if(obj.hasOwnProperty(leaf)){
                                                var value = obj[leaf];
                                                //console.log('Field: ', leaf,' Value: ',value, ' Parent: ',obj.id, ' Depth: ',depth);
                                                if(typeof value === 'object' && leaf!="__config__"){
                                                        if(value.id){
                                                                if (ids.map.indexOf(value.id) == -1) {
                                                                        ids.map.push(value.id);
                                                                }
                                                                
                                                                
                                                        }
                                                        walk(value);
                                                }
                                        }
                                }
                        }
                        walk(map)
                        //debugger;
                        mapReady = true;
                        return;
                }
                else{
                        
                        var parents = [];
                        for (var z = 0;z< result.rows.length;z++){  
                                obj[result.rows[z]['html_id']] = {};
                                if (result.rows[z]['json']) {//JSON field not empty. Parse and stop looking for children?
                                        obj[result.rows[z]['html_id']] = JSON.parse(result.rows[z]['json']);
                                }
                                obj[result.rows[z]['html_id']].parent = result.rows[z]['parent'];
                                obj[result.rows[z]['html_id']].id = result.rows[z]['html_id'];
                                obj[result.rows[z]['html_id']].template = result.rows[z]['template'];
                                
                                var leaf = obj[result.rows[z]['html_id']];
                                var id = result.rows[z]['html_id'];
                                buildMap(leaf,id);
                        }
                        
                }
                //debugger;
        })
    
    
    
}

process.on('SIGINT',function(){
        db.shutdown(function(){console.log("Shutting down database connection");
		    console.log("about to exit");
		    process.exit();
		    })
	
	
	//writeOut(rawData);
        //hwmon.kill('SIGINT');
	
	
})

buildMap(map,'viewport');

getTrace();

intervals.push(setInterval(getTrace,traceInterval));

intervals.push(setInterval(buildMap,configInterval,map,'viewport')); 

eventEmitter.on('map_done',function(){
        //debugger;        
        
})
        

function getTrace(){
        
        var query = "select ts from tempio limit 1";//Retrieve one timestamp from DB. The table is sorted with latest entries on top
        db.execute(query,function(err,result){
                
                if (!mapReady) {
                        console.log('Map not ready, aborting trace');
                        return;
                }
                //debugger;
                if (err) {console.log('ERROR: ',err)}
                else if (result.rows.length == 0) {
                        console.log('No results, aborting trace retrieval');
                        return;
                }
                var timestamp = result.rows[0]['ts'];
                if(!timestamp) {
					console.log('No timestamp, aborting');
					return;
				}
				else {
	                console.log('Trace time: ',timestamp)
				}
                
                
                //Retrieve CPU samples, RAM Samples, and Live Sockets
                var query = "select type,host,device_id,uuid,metric_value,json from tempio where type in ('procmem','proccpu','socket') and ts=?";
                //Debug - only CPU metrics
                //var query = "select type,host,device_id,uuid,metric_value,json from tempio where type in ('proccpu','socket') and ts=?";
                var props = [timestamp];
                
                db.execute(query,props,function(err,result){
                        //debugger;
                        //if (!trace.hosts) {
                        //        trace.hosts = {};
                        //}
                        var rows = result.rows;
                        
                        //Clean previous trace;
                       
                        delete trace.proccpu;
                        delete trace.procmem;
                        delete trace.socket;
                        delete trace.devices;
                        zeroIds = {};
                        ids.samples = [];
                        
                        for(var i = 0, r=result.rows.length;i < r;i++){
                                var type = rows[i]['type'];
                                var host = rows[i]['host'];
                                var parent = rows[i]['device_id'];
                                var id = rows[i]['uuid'];
                                var value = rows[i]['metric_value'];
                                var json = rows[i]['json'];
                                var desc = 'Desc';
                                
                                //Confirm if parent exists and add sample. These parents are devices, not samples
                                if (ids.map.indexOf(parent) == -1) {
                                        console.log('Parent not found in map, skipping... ',parent)
                                        continue;
                                }
                                //Some samples are zero-value, and contain a list of all samples that are zero-value under that parent
                                //For those, create a separate list of IDs with mapping to the actual parent ID. This is necessary
                                //because some pipes will have those zero-samples listed as endpoints
                                if (value == 0 && json != null) {
                                        //debugger;
                                        var list = JSON.parse(json);
                                        
                                        for(var z = 0, ll = list.length; z<ll; z++){
                                                if (!zeroIds[list[z]]) {
                                                        zeroIds[list[z]] = {};
                                                }
                                                zeroIds[list[z]]['parent'] = id;
                                        }
                                        
                                        //debugger;
                                }
                                
                                //Zero values don't show... fix it here?
                                if (value == 0) {
                                        //debugger;
                                        value = 0.5;
                                }
                                else{
                                        //console.log('Type: ',type,' Parent: ',parent,' Value: ',value)
                                }
                                //Create one array per sample type
                                if (!trace.devices) {
                                        trace.devices = {};
                                }
                                //Create one array member per PARENT
                                if (!trace.devices[parent]) {
                                        trace.devices[parent] = {};
                                        trace.devices[parent].name = parent;
                                        trace.devices[parent].template = type;
                                }
                                if (!trace.devices[parent].samples) {
                                        trace.devices[parent].samples = [];
                                }
                               
                                var sample = {'name':id,'parent':parent,'sizePercent':value,'x':0,'y':value,'desc':desc,'template':type}
                                if (json != null) {
                                        sample.samples = JSON.parse(json);
                                }
                                //create an array containg a single member - sample. D3 idiosyncrasies
                                sample = [sample];
                                
                                
                                trace.devices[parent].samples.push(sample);
                                
                                
                                //Add this ID to the list, so pipes can use it as endpoints
                                if (ids.samples.indexOf(id) == -1) {
                                        ids.samples.push(id);
                                }
                                
                        }
                        //debugger;
                        //Push all parents into arrays
                        //for (var type in trace) {
                        //        var arr = new Array();
                        //        for(var parent in trace[type]){
                        //                arr.push(trace[type][parent]);
                        //        }
                        //        trace[type] = arr;
                        //}
                        //for (var type in trace) {
                        var arr = new Array();
                        //debugger;
                        for(var parent in trace.devices){
                                //var arr = new Array();
                                arr.push(trace.devices[parent]);
                                
                        }
                        trace.devices = arr;
                        //debugger;
                        //}
                        
                        console.log('Sample Trace Ready');
                })
                
                
                //Retrieve pipes
                var query = "select type,html_id,bwa,bwb,origin,parentb,stream_id from pipes where type in ('procpipe','mempipe','netpipe','nicpipe','volpipe') and ts=?";
                var props = [timestamp];
                db.execute(query,props,function(err,result){
                        
                        //debugger;
                        
                        var rows = result.rows;
                        
                        delete trace.pipes;
                        
                        for(var i = 0, r=result.rows.length;i < r;i++){
                                var type = rows[i]['type'];
                                var html_id = rows[i]['html_id'];
                                var bwa = rows[i]['bwa'];
                                var bwb = rows[i]['bwb'];
                                var origin = rows[i]['origin'];
                                var parentB = rows[i]['parentb'];
                                var stream_id = rows[i]['stream_id'];
                                
                                //Confirm if parent exists and add sample
                                if (ids.samples.indexOf(origin) == -1 && ids.map.indexOf(origin) == -1) {
                                        //Iterate through zeroIds - maybe the parent is there
                                        if (zeroIds[origin]) {
                                                origin = zeroIds[origin].parent
                                        }
                                        else{
                                                console.log('Pipe Origin not found in map, skipping... ',origin)
                                                debugger;
                                                continue;
                                        }
                                        //Verify the found endpoint exists
                                        if (ids.samples.indexOf(origin) == -1 && ids.map.indexOf(origin) == -1){
                                                console.log("Pipe Zero Origin not found in map, skipping... ",origin)
                                                //debugger;
                                                continue;
                                        }
                                }
                                if (ids.samples.indexOf(parentB) == -1 && ids.map.indexOf(parentB) == -1) {
                                        //Iterate through zeroIds - maybe the parent is there
                                        if (zeroIds[parentB]) {
                                                parentB = zeroIds[parentB].parent
                                        }
                                        else{
                                                console.log('Pipe Endpoint not found in map, skipping... ',parentB)
                                                debugger;
                                                continue;
                                        }
                                        if (ids.samples.indexOf(parentB) == -1 && ids.map.indexOf(parentB) == -1){
                                                console.log("Pipe Zero Endpoint not found in map, skipping... ",parentB);
                                                //debugger;
                                                continue;
                                        }
                                }
                                
                                if (bwa == 0) {
                                        bwa = 0.5;
                                }
                                if (bwb == 0) {
                                        bwb = 0.5;
                                }
                                
                                if (!trace.pipes) {
                                        trace.pipes = [];
                                }   
                                
                                var pipe = {};
                                pipe.name = html_id;
                                pipe.lbw = bwa;
                                pipe.leftparent = origin;
                                pipe.origin = origin;
                                pipe.rightparent = parentB;
                                pipe.rbw = bwb;
                                pipe.stream = stream_id;
                                
                                //Debug - disable pipes
                                trace.pipes.push(pipe);
                        }
                        console.log('Pipe Trace Ready');
                        //debugger;
                        
                })
                
                
        })
        
}

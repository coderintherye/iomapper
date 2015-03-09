var child = require('child_process'),
        fs = require('fs'),
	http = require('http'),
	events = require('events'),
	eventEmitter = new events.EventEmitter(),
	DB = require('node-cassandra-cql').Client,
	dbhosts = ['raptor'],//Database host
	db = new DB({hosts:dbhosts,keyspace:'iomapper'});
	//traceInterval = 10000,
	//configInterval = 60000;
        
global.map = {};
global.hosts = [];
global.trace = {};
global.selectCounter = 0;
global.resultCounter = 0;
global.traceInterval = 15000;
global.configInterval = 60000;
global.intervals = new Array();
global.ids = new Object();
global.zeroIds = new Object();
global.mapReady = false;
global.mapRoot = 'viewport';
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

process.on('SIGINT',function(){
        db.shutdown(function(){console.log("Shutting down database connection");
		    console.log("about to exit");
		    process.exit();
		    })
	
	
	//writeOut(rawData);
        //hwmon.kill('SIGINT');
	
	
})

//buildMap(map,'viewport');
buildMap();

//2/22/2015: a hack to replay a period of samples
//remove when done

var timeStamps = [],tsIndex = 0;

getTrace();

intervals.push(setInterval(getTrace,traceInterval));

//intervals.push(setInterval(buildMap,configInterval,map,'viewport'));
intervals.push(setInterval(buildMap,configInterval)); 

eventEmitter.on('map_done',function(){
        //debugger;        
        
})



function buildMap(){
        //Get latest timestamp:
        
        var query = "select ts from mapper limit 1";
        var props = [];
        db.execute(query,props,function(err,result){
                
                if (err) {console.log('ERROR: ',err)}
                else if (result.rows.length == 0) {console.log('No timestamp data')}
                else{
                        var ts = result.rows[0][0];
                
                        var query = "select html_id,json,parent,template from mapper where ts=? ALLOW FILTERING";
                
                        var props = [ts];
                        
                        db.execute(query,props,function(err,result){
                                
                                if (err) {console.log('ERROR: ',err)}
                                else if (result.rows.length == 0) {console.log('No map data for timestamp')}
                                else{
                                        //Build Map
                                        map = {};
                                        hosts = [];
                                        ids.map = [];
                                        parseRows(map,mapRoot);
                                        walk(map)//Populate all device IDs
                                        eventEmitter.emit('map_done');
                                        console.log('Map Ready');
                                        mapReady = true;
                                }
                                function parseRows(obj,startId){
                                        for (var z = 0;z< result.rows.length;z++){
                                                var html_id = result.rows[z][0];
                                                var json = result.rows[z][1];
                                                var parent = result.rows[z][2];
                                                var template = result.rows[z][3];
                                                if (parent == startId) {
                                                        //Found a child that belongs to this parent
                                                        //Add to map, and look for child's children
                                                        if (!obj[html_id]) {
                                                                obj[html_id] = {};
                                                        }
                                                        if (json != null) {
                                                                obj[html_id] = JSON.parse(json);
                                                        }
                                                        if (template == 'client' || template == 'server') {
                                                                hosts.push(html_id);
                                                        }
                                                        obj[html_id].id = html_id;
                                                        obj[html_id].parent = parent;
                                                        obj[html_id].template = template
                                                        //Look for children
                                                        parseRows(obj[html_id],html_id)
                                                }
                                        }
                                }
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
                        })
                }   
        })
}
      

function getTrace(){
        
        //var query = "select ts from io limit 1";
        
        var query = "select ts from io";
        
        db.execute(query,function(err,result){
                
                if (!mapReady) {
                        console.log('Map not ready, aborting trace');
                        return;
                }
                if (err) {console.log('ERROR: ',err)}
                else if (result.rows.length == 0) {
                        console.log('No results, aborting trace retrieval');
                        return;
                }
                //2/22/2015: hack
                if (timeStamps.length == 0) {
                        for (var zz = 0; zz < result.rows.length; zz++){
                                var t = result.rows[zz][0].getTime();
                                
                                timeStamps.push(t);
                        }
                        console.log('Unfiltered timeStamps: ', timeStamps.length);
                        debugger;
                        timeStamps = timeStamps.filter (function (v, i, a) { return a.indexOf (v) == i });
                        
                        for(var xx = 0; xx < timeStamps.length; xx++){
                                
                                var d = new Date(timeStamps[xx])
                                timeStamps[xx] = d;
                        }
                        
                        console.log('Unique timeStamps: ', timeStamps.length);
                }
                
                var ts = timeStamps[tsIndex];
                
                console.log('Timestamp Index: ',tsIndex)
                
                console.log('Timestamp: ',ts)
                
                tsIndex++;
                
                if (tsIndex == timeStamps.length - 1) {
                        tsIndex = 0;
                }
                
                //var ts = result.rows[0][0];
                
                var date = (ts.getMonth()+1).toString() + '-' + ts.getDate().toString() + '-' + ts.getFullYear().toString();
                
                //var hosts = ['id_ec4f352c','id_217a965c','id_80d3e154'];
                
                var props = [date].concat(hosts).concat([ts]);
                
                var params = [];
			
                for (var a = 0; a<hosts.length; a++){params.push('?')};
                
                var params = params.join();
                
                var query = 'select date,host,ts,json from IO where date=? and host in (' + params + ') and ts=?';
                
                
                
                db.execute(query,props,function(err,result){
                        if (err) {console.log('ERROR: ',err)}
                        else if (result.rows.length == 0) {
                                console.log('No results, aborting trace retrieval');
                                return;
                        }
                        else{
                                //if (!trace.devices) {
                                trace.devices = []
                                //}
                                //if (!trace.io) {
                                trace.io = []
                                
                                trace.lod = {};
                                //}
                                for(var i = 0, r=result.rows.length;i < r;i++){
                                        var samples = JSON.parse(result.rows[i][3])
                                        trace.devices = trace.devices.concat(samples.devices);
                                        trace.io = trace.io.concat(samples.io)
                                }
                        }
                        
                        
                        //debugger;
                        //some error control:
                        ids.samples = [];
                        for(var x = 0;x<trace.devices.length;x++){
                                for(var y = 0;y < trace.devices[x].samples.length;y++){
                                        ids.samples.push(trace.devices[x].samples[y][0].name);  //Add an ID of the sample to list of IDs
                                        //if (trace.devices[x].samples[y][0].y == 0) {
                                        //        trace.devices[x].samples[y][0].y = 0.1;         //This fixes zero-value samples, which behave horribly in the UI
                                        //                                                        //Need to fix corresponding pipes too, looks a bit ugly (bw = 0 >> bw = 0.1)
                                        //        //console.log('Fixed zero-size sample: ',trace.devices[x].samples[y][0].name)
                                        //}
                                }
                        }
                        for(var z = 0; z < trace.io.length;z++){
                                if (ids.map.indexOf(trace.io[z].leftparent) == -1 &&
                                    ids.samples.indexOf(trace.io[z].leftparent) == -1) {
                                        debugger;
                                        console.log('Pipe endpoint not found WTF...',trace.io[z].leftparent);
                                }
                                if (ids.map.indexOf(trace.io[z].rightparent) == -1 &&
                                    ids.samples.indexOf(trace.io[z].rightparent) == -1) {
                                        debugger;
                                        console.log('Pipe endpoint not found WTF...',trace.io[z].rightparent);
                                }
                        }
                        
                        //debugger;
                        //Create net pipes:
                        var sockets = [];
                        var netPipes = [];
                        
                        //Create a list of all sockets
                        for(var y = 0;y < trace.devices.length;y++){
                                
                                if (trace.devices[y].template == 'socket' && trace.devices[y].samples && trace.devices[y].samples.length > 0) {
                                        for(var w = 0; w < trace.devices[y].samples.length; w++){
                                                //First, determine if this is an actual socket or a group:
                                                if (trace.devices[y].samples[w][0].socket) {//This is an actual socket. Just add it to the list
                                                        sockets.push(trace.devices[y].samples[w][0])
                                                }
                                                else if (trace.devices[y].samples[w][0].samples && trace.devices[y].samples[w][0].samples.length > 0) {
                                                        //This is not a socket, but likely a group of sockets. Split it into individual members
                                                        //And change name and percent values to parent's
                                                        
                                                        for(var z = 0; z < trace.devices[y].samples[w][0].samples.length; z++){
                                                                //Iterate through children sockets
                                                                if (trace.devices[y].samples[w][0].samples[z][0].socket) {
                                                                        var socket = {};
                                                                        socket.socket = trace.devices[y].samples[w][0].samples[z][0].socket;
                                                                        socket.name = trace.devices[y].samples[w][0].name;
                                                                        socket.template = trace.devices[y].samples[w][0].template;
                                                                        socket.sizePercent = trace.devices[y].samples[w][0].sizePercent;
                                                                        socket.y = trace.devices[y].samples[w][0].y;
                                                                        socket.desc = trace.devices[y].samples[w][0].samples[z][0].desc;
                                                                        sockets.push(socket);
                                                                }
                                                        }
                                                        
                                                }
                                                else {continue;}//This sample isn't a socket, and isn't a group
                                        }
                                        
                                        
                                }
                                
                        }
                        
                        //Scan all sockets
                        for(var y = 0;y < sockets.length;y++){
                                //Find this socket properties
                                
                                var laddr = sockets[y].socket.laddr;
                                var lport = sockets[y].socket.lport;
                                var raddr = sockets[y].socket.raddr;
                                var rport = sockets[y].socket.rport;
                                
                                //scan the REMAINDER of sockets...
                                for(var w = y+1; w < sockets.length; w++){
                                        
                                        //...and look for a peer socket
                                        if (sockets[w].socket.laddr == raddr && sockets[w].socket.lport == rport) {
                                                var netPipe = {};
                                                netPipe.leftparent = sockets[y].name;
                                                netPipe.origin = sockets[y].name; // Fix this - Origin needs to be determined on whether the socket is server or client. Bit more work on agent
                                                netPipe.rightparent = sockets[w].name;
                                                netPipe.name = netPipe.leftparent + '_' + netPipe.rightparent;
                                                netPipe.lbw = sockets[y].y//sizePercent;
                                                netPipe.rbw = sockets[w].y//sizePercent; - Fix this - use percentage and not y. 0 values don't play well
                                                netPipes.push(netPipe)
                                        }
                                        
                                }
                                
                        }
                        trace.io = trace.io.concat(netPipes);
                        
                        //debugger;
                
                        
                        lod(trace);
                        
                })
                
        })
        
        return;
        
}


/* Server-side LOD:
 *      At this point we have a raw list of all samples, and the map with all devices at full detail.
 *      The idea is to pre-compute several sample traces with different Levels Of Detail (LOD)
 *      The client will request different LOD depending on the zoom level the user currently desires
 *              There will be a corresponding client-side LOD function that will figure out what to request, and what to show/hide
 *      The raw trace we have now will never be displayed - no way to elegantly deal with zero-size metrics, and, there's just too many of them. Hence, the raw trace
 *      will be recalculated into a user-consumable format. Specifically, the base trace (and map) will be considered LOD "0", like so:
 *              1. LOD 0: most detailed map, and trace, with zero-size metrics collapsed into single samples
 *              2. LOD -1: zero-size "samples" display a group of children (stacked on top of each other), with topmost being the one currently selected by user
 *              3. LOD 1: CPUCore, Membank, and NIC samples collapsed into consolidated groups (potentially disk/fs samples if I end up making them, which I will)
 *              4. LOD 2: All CPUCore samples collapsed into one group per socket
 *                      4.1. Client-side LOD hides individual cores
 *              5. LOD 3: CPU Socket samples collapsed into one sample for all CPUs. NIC samples collapsed into one for all NICs
 *                      5.1. Client-side LOD hides individual sockets, NICs
 *
*/

function lod(trace){
        //The "trace" argument should be an object {devices:[],io:[]}
        
        //zeroSamples(trace); //Migrated to agent
        
        lod_level_1(trace);
        
        function lod_level_1(trace){
                //LOD 1: CPUCore, Membank, and NIC samples collapsed into consolidated groups (potentially disk/fs samples if I end up making them, which I will)
                //Creates a new trace, maybe add to existing one?
                
                var lod_level = 'lod_1'
                
                var suffix = '_lod_1';
                
                
                var newPipeParents = {}; //This variable will hold a map of sample IDs against IDs of groups they were collapsed into
                                         //e.g. {sample_name:lod_group_name}
                                         //will be used to find which pipes need to be created
                
                for(var a = 0; a < trace.devices.length; a++){  //Iterate through all devices
                        if (!trace.devices[a].samples || trace.devices[a].samples.length == 0) {
                                continue;
                        }
                        
                        var lod_1 = 0;
                        var lod_1_sum_value = 0;
                        
                        for (var b = 0; b < trace.devices[a].samples.length; b++){//Iterate through this device's samples
                                
                                lod_1_sum_value = lod_1_sum_value + trace.devices[a].samples[b][0].sizePercent;
                                
                                //if (trace.devices[a].samples[b][0].sizePercent <= minSampleValue) {
                                if (lod_1 == 0) { //Create zero-sample for the first time;
                                        var lod_1_Sample = {};
                                        lod_1_Sample.name = trace.devices[a].name + suffix;
                                        lod_1_Sample.template = trace.devices[a].template;
                                        lod_1_Sample.parent = trace.devices[a].name;
                                        lod_1_Sample.sizePercent = lod_1_sum_value;
                                        lod_1_Sample.y = lod_1_sum_value;
                                        lod_1_Sample.x = 0;
                                        lod_1_Sample.desc = {'description':'LOD 1 Group'};
                                        
                                        
                                        //lod_1_Sample.samples = [];
                                        
                                        
                                        lod_1 = 1;
                                }
                                
                                
                                lod_1_Sample.sizePercent = lod_1_sum_value;
                                lod_1_Sample.y = lod_1_sum_value;
                                //lod_1_Sample.samples.push(trace.devices[a].samples[b]);
                                
                                newPipeParents[trace.devices[a].samples[b][0].name] = lod_1_Sample.name;
                                
                                //trace.devices[a].samples.splice(b,1);
                                //b = b-1;
                                        
                                        
                                //}
                        }
                        //Create LOD section in the global trace object:
                        if (!trace.lod) {
                                trace.lod = {};
                        }
                        if (!trace.lod[lod_level]) {
                                trace.lod[lod_level] = {};
                        }
                        if (!trace.lod[lod_level].devices) {
                                trace.lod[lod_level].devices = [];
                        }
                        if (!trace.lod[lod_level].io) {
                                trace.lod[lod_level].io = [];
                        }
                        
                        var device = {};
                        
                        device.samples = [];
                        
                        device.name = trace.devices[a].name;
                        device.template = trace.devices[a].template;
                        
                        device.samples.push([lod_1_Sample]);
                        
                        trace.lod[lod_level].devices.push(device);
                        
                        //trace.devices[a].samples.push([lod_1_Sample]);//Add zero-sample group to this device. Hope everything's there!
                }
                
                //debugger;
                
                var lodPipes = {};
                
                for(var a = 0; a < trace.io.length; a++){       //Iterate through existing pipes (maybe only netpipes if you want to offload it to agents). netPipes variable isn't visible
                                                                //here, but we can expose it via argument or somesuch
                        
                        var pipe = {};
                        
                        var lp = trace.io[a].leftparent;
                        var rp = trace.io[a].rightparent;
                        var origin = trace.io[a].origin;
                        
                        if (newPipeParents[lp]) {
                                pipe.leftparent = newPipeParents[lp];
                        }
                        if (newPipeParents[rp]) {
                                pipe.rightparent = newPipeParents[rp];
                        }
                        if (newPipeParents[origin]) {
                                pipe.origin = newPipeParents[origin];
                        }
                        if(!newPipeParents[lp] || !newPipeParents[rp]){
                                //debugger;
                                continue;
                        }
                        
                        var parentA = pipe.origin;
                        var parentB = pipe.leftparent;
                        if (parentA == parentB) {
                                parentB = pipe.rightparent;
                        }
                        
                        var pipeName = parentA + '_' + parentB + suffix;
                        
                        if (!lodPipes[pipeName]) {      //LOD pipe doesn't exist, create first placeholder
                                lodPipes[pipeName]  = {};
                                lodPipes[pipeName].name = pipeName;
                                lodPipes[pipeName].leftparent = pipe.leftparent;
                                lodPipes[pipeName].rightparent = pipe.rightparent;
                                lodPipes[pipeName].origin = pipe.origin;
                                lodPipes[pipeName].lbw = trace.io[a].lbw;
                                lodPipes[pipeName].rbw = trace.io[a].lbw;
                        }
                        else{
                                lodPipes[pipeName].lbw = lodPipes[pipeName].lbw + trace.io[a].lbw;
                                lodPipes[pipeName].rbw = lodPipes[pipeName].rbw + trace.io[a].lbw;
                        }
                        
                }
                for (var pipe in lodPipes){
                        
                        trace.lod[lod_level].io.push(lodPipes[pipe])
                }
                
                debugger;
        }
        
        function zeroSamples(trace,value){
                //Function to collapse zero-value (or some small value) samples into a group
                //Should be reusable as I may want to migrate it off to the agents
                //Should fix both device samples and IO pipes?
                //Modifies the existing trace
                
                //The "trace" argument should be an object {devices:[],io:[]}
                
                var suffix = '_zeroSamples'; //Suffix to add to create the unique ID of the group;
                
                var minSampleValue = 0.05;
                var minPipeBw = 0.05;
                var zeroSampleArbitraryValue = 0.5;
                
                var newPipeParents = {}; //This variable will hold a map of zero-value sample IDs against IDs of groups they were collapsed into
                                         //e.g. {sample_name:zero_group_name}
                                         //will be used to find which pipes need their endpoints updated
                
                for(var a = 0; a < trace.devices.length; a++){  //Iterate through all devices
                        if (!trace.devices[a].samples || trace.devices[a].samples.length == 0) {
                                continue;
                        }
                        
                        var zero = 0;
                        
                        for (var b = 0; b < trace.devices[a].samples.length; b++){//Iterate through this device's samples
                                
                                if (trace.devices[a].samples[b][0].sizePercent <= minSampleValue) {
                                        if (zero == 0) { //Create zero-sample for the first time;
                                                var zeroSample = {};
                                                zeroSample.name = trace.devices[a].name + suffix;
                                                zeroSample.template = trace.devices[a].template;
                                                zeroSample.parent = trace.devices[a].name;
                                                zeroSample.sizePercent = zeroSampleArbitraryValue;
                                                zeroSample.y = zeroSampleArbitraryValue;
                                                zeroSample.x = 0;
                                                zeroSample.desc = {'description':'zero-footprint samples'};
                                                
                                                
                                                zeroSample.samples = [];
                                                
                                                
                                                zero = 1;
                                        }
                                        
                                        zeroSample.samples.push(trace.devices[a].samples[b]);
                                        
                                        newPipeParents[trace.devices[a].samples[b][0].name] = zeroSample.name;
                                        
                                        trace.devices[a].samples.splice(b,1);
                                        b = b-1;
                                        
                                        
                                }
                        }
                        
                        trace.devices[a].samples.push([zeroSample]);//Add zero-sample group to this device. Hope everything's there!
                }
                //Stopped here 2/5/2015. The function zeroSamples works, should work on the agent too. Need to write function to fix pipe endpoints
                var newPipeNames = [];
                for (var c = 0; c < trace.io.length; c++){
                        var changePipe = 0;
                        
                        if (newPipeParents[trace.io[c].leftparent]) {
                                trace.io[c].leftparent = newPipeParents[trace.io[c].leftparent];
                                trace.io[c].lbw = minPipeBw;
                                changePipe = 1;
                        }
                        
                        if (newPipeParents[trace.io[c].rightparent]) {
                                trace.io[c].rightparent = newPipeParents[trace.io[c].rightparent]
                                trace.io[c].rbw = minPipeBw;
                                changePipe = 1;
                        }
                        
                        if (newPipeParents[trace.io[c].origin]) {
                                trace.io[c].origin = newPipeParents[trace.io[c].origin]
                                changePipe = 1;
                        }
                        
                        if (changePipe == 0) {  //Stop processing if pipe remains unchanged
                                continue;
                        }
                        
                        var parentA = trace.io[c].origin;
                        var parentB = trace.io[c].leftparent;
                        if (parentA == parentB) {
                                parentB = trace.io[c].rightparent;
                        }
                        
                        var pipeName = parentA + '_' + parentB;
                        
                        if (newPipeNames.indexOf(pipeName) == -1) {     //This is the first pipe created between these endpoints. Change its name and add to list
                                newPipeNames.push(pipeName);
                                trace.io[c].name = parentA + '_' + parentB + '_pipe'
                        }
                        else{                                           //Pipe already exists between the two endpoints. Remove from array as duplicate
                                trace.io.splice(c,1);
                                c = c - 1;
                        }
                }
        }
        
}
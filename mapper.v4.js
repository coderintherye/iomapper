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
global.trace = [];	//Array of LOD levels
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
                        var ts = result.rows[0]['ts'];
                
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
                                                var html_id = result.rows[z]['html_id'];
                                                var json = result.rows[z]['json'];
                                                var parent = result.rows[z]['parent'];
                                                var template = result.rows[z]['template'];
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
        
	
	
        var query = "select ts from io limit 1";
        
	//To replay all samples currently in database, uncomment:
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
		//To replay all samples currently in database, uncomment:
		//#########################################
                if (timeStamps.length == 0) {
                        for (var zz = 0; zz < result.rows.length; zz++){
                                var t = result.rows[zz]['ts'].getTime();
                                
                                timeStamps.push(t);
                        }
                        console.log('Unfiltered timeStamps: ', timeStamps.length);
                        //debugger;
                        timeStamps = timeStamps.filter (function (v, i, a) { return a.indexOf (v) == i });
			
			//sort timestamps so oldest are first
			timeStamps.sort(function(a,b){return a - b});
                        
			//debugger;
			
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
                //#############################################
		
		
                //var ts = result.rows[0]['ts'];
                
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
                                //trace.devices = []
                                //}
                                //if (!trace.io) {
                                //trace.io = []
                                
                                //trace.lod = {};
                                //}
				//Clear out previous samples:
				trace = [];
				
                                for(var i = 0, r=result.rows.length;i < r;i++){	//Each row is trace from an individual agent
                                        var samples = JSON.parse(result.rows[i]['json']);
					
					//Needs to be an array of LOD levels
					if (samples.constructor != Array) {
					    console.log('Samples for host not an Array, host: ',result.rows[i]['host']);
					    continue;
					}
					for (var f = 0; f < samples.length; f++){
					    //"f" is lod level. If this lod level doesn't exist yet in global trace, create it;
					    if (!trace[f]) {
						trace[f] = {};
						trace[f].devices = [];
						trace[f].io = [];
					    }
					    trace[f].devices = trace[f].devices.concat(samples[f].devices)
					    trace[f].io = trace[f].io.concat(samples[f].io)
					}
					
                                        //trace.devices = trace.devices.concat(samples.devices);
                                        //trace.io = trace.io.concat(samples.io)
                                }
                        }
                        
                        
                        //debugger;
                        //some error control:
			//debugger;
                       
			var newPipeParents = {};	//Array to hold relations between pipe endpoints between levels
			//Iterate through lod levels
			for (var lodLevel = 0; lodLevel < trace.length; lodLevel++){
				
				
				ids.samples = [];
				//Error control (and some prep work)
				var traceLodLevel = trace[lodLevel];
				for(var x = 0;x<traceLodLevel.devices.length;x++){
					for(var y = 0;y < traceLodLevel.devices[x].samples.length;y++){
						ids.samples.push(traceLodLevel.devices[x].samples[y][0].name);  //Add an ID of the sample to list of IDs
						//Update endpoint of the next level. For now, only sockets. As we add other inter-node pipes, this needs to be expanded
						//Or, you could only do it on levels 1 and up, which could cover all samples as there aren't too many
						if (traceLodLevel.devices[x].template == 'socket'){
							newPipeParents[traceLodLevel.devices[x].samples[y][0].name] = traceLodLevel.devices[x].samples[y][0].lodParent;
						}
					}
				}
				for(var z = 0; z < traceLodLevel.io.length;z++){
					if (ids.map.indexOf(traceLodLevel.io[z].leftparent) == -1 &&
					    ids.samples.indexOf(traceLodLevel.io[z].leftparent) == -1) {
						debugger;
						console.log('Pipe endpoint not found WTF...',traceLodLevel.io[z].leftparent);
						traceLodLevel.io.splice(z,1);
						z = z-1;
					}
					if (ids.map.indexOf(traceLodLevel.io[z].rightparent) == -1 &&
					    ids.samples.indexOf(traceLodLevel.io[z].rightparent) == -1) {
						debugger;
						console.log('Pipe endpoint not found WTF...',traceLodLevel.io[z].rightparent);
						traceLodLevel.io.splice(z,1);
						z = z-1;
					}
				}
				//End error control
				
				//debugger;
				//Create net pipes ONLY on LOD 0:
				
				if (lodLevel == 0) {
					
					var sockets = [];
					var netPipes = [];
					var netPipeNames = [];
					
					
					//Create a list of all sockets
					for(var y = 0;y < traceLodLevel.devices.length;y++){
						
						//Find devices that hold socket samples
						if (traceLodLevel.devices[y].template == 'socket' && traceLodLevel.devices[y].samples && traceLodLevel.devices[y].samples.length > 0) {
							
							//Iterate through sockets attached to device
							for(var w = 0; w < traceLodLevel.devices[y].samples.length; w++){
								//Update endpoint of the next level
								//newPipeParents[traceLodLevel.devices[y].samples[w][0].name] = traceLodLevel.devices[y].samples[w][0].lodParent;
								
								//First, determine if this is an actual socket or a group:
								if (traceLodLevel.devices[y].samples[w][0].socket) {//This is an actual socket. Just add it to the list
									sockets.push(traceLodLevel.devices[y].samples[w][0]);									
								}
								else if (traceLodLevel.devices[y].samples[w][0].samples && traceLodLevel.devices[y].samples[w][0].samples.length > 0) {
									//This is not a socket, but likely a group of sockets. Split it into individual members
									//And change name and percent values to parent's
									//debugger;
									for(var z = 0; z < traceLodLevel.devices[y].samples[w][0].samples.length; z++){
										//Iterate through children sockets
										if (traceLodLevel.devices[y].samples[w][0].samples[z][0].socket) {
											var socket = {};
											socket.socket = traceLodLevel.devices[y].samples[w][0].samples[z][0].socket;
											
											//Here, name of the socket should be the name of the group											
											socket.name = traceLodLevel.devices[y].samples[w][0].name;
											socket.template = traceLodLevel.devices[y].samples[w][0].template;
											socket.sizePercent = traceLodLevel.devices[y].samples[w][0].sizePercent;
											socket.y = traceLodLevel.devices[y].samples[w][0].y;
											socket.desc = traceLodLevel.devices[y].samples[w][0].samples[z][0].desc;
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
								//Only add pipe if parents are different (not part of same group for example)
								if (netPipe.rightparent != netPipe.leftparent) {
								    //debugger;
								    
								    //See if we already have a pipe like this... If yes, just increase its bandwidth
								    if (netPipeNames.indexOf(netPipe.name) != -1) {
									var pos = netPipeNames.indexOf(netPipe.name);
									if (netPipes[pos].name != netPipe.name) {
									    console.log('Weird... thought the same pipe was at this position...');
									    debugger;
									}
									netPipes[pos].lbw += netPipe.lbw;
									netPipes[pos].rbw += netPipe.rbw;
								    }
								    else{
									netPipeNames.push(netPipe.name);
									netPipes.push(netPipe)
									//console.log(netPipe.name)
								    }
								    
								}
								
								
							}
							
						}
						
					}
					traceLodLevel.io = traceLodLevel.io.concat(netPipes);
				}
				
				//Calculate LOD netpipes on higher LOD levels:
				
				if (lodLevel > 0) {
					debugger;
					var lodPipes = {};
					
					for(var a = 0; a < netPipes.length; a++){       //Iterate through existing pipes (maybe only netpipes if you want to offload it to agents). netPipes variable isn't visible
											//here, but we can expose it via argument or somesuch
						
						var pipe = {};
						
						var lp = netPipes[a].leftparent;
						var rp = netPipes[a].rightparent;
						var origin = netPipes[a].origin;
						
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
						
						if (pipe.rightparent == pipe.leftparent) {
							//Eventually samples connected by pipe will merge on higher lod levels. Need to skip connecting pipe;
							continue;
						}
						
						var parentA = pipe.origin;
						var parentB = pipe.leftparent;
						if (parentA == parentB) {
							parentB = pipe.rightparent;
						}
						
						
						var pipeName = parentA + '_' + parentB;// + suffix;
						
						if (!lodPipes[pipeName]) {      //LOD pipe doesn't exist, create first placeholder
							lodPipes[pipeName]  = {};
							lodPipes[pipeName].name = pipeName;
							lodPipes[pipeName].leftparent = pipe.leftparent;
							lodPipes[pipeName].rightparent = pipe.rightparent;
							lodPipes[pipeName].origin = pipe.origin;
							lodPipes[pipeName].lbw = netPipes[a].lbw;
							lodPipes[pipeName].rbw = netPipes[a].rbw;
						}
						else{
							lodPipes[pipeName].lbw = lodPipes[pipeName].lbw + netPipes[a].lbw;
							lodPipes[pipeName].rbw = lodPipes[pipeName].rbw + netPipes[a].rbw;
						}
						
					}
					netPipes = [];
					for (var pipe in lodPipes){
						
						traceLodLevel.io.push(lodPipes[pipe]);
						netPipes.push(lodPipes[pipe]);
					}
					
					
				}
				
				//debugger;
				var duplicates = findDuplicateSamples(traceLodLevel);
				if (duplicates.length > 0) {
					console.log('Duplicates Found!!: ');
					debugger;
				}
                        
			}
			
			//Four levels of LOD from agent complete with netpipes. In the future enable further lod up the containers tree.
                        //lod(trace);
                        
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
 *              		Partitions disappear; individual LVs disappear; samples consolidated
 *              4. LOD 2: All CPUCore samples collapsed into one group per socket; Individual volumes, and disks disappear; all VOL and Disk samples collapsed into one per parent
 *                      4.1. Client-side LOD hides individual cores
 *              5. LOD 3: CPU Socket samples collapsed into one sample for all CPUs. NIC samples collapsed into one for all NICs
 *                      5.1. Client-side LOD hides individual sockets, NICs
 *
 *      3/13: Migrating LOD to agent
 *      3/19: LOD migrated to agent up to level 4. Higher levels to be implemented in Mapper later as needed
 *
*/


	




function findSample(name,where){

        //Debugging: if you have a sample you need to find in an array
        var count = 0;
        var result ={};
        if (where.io) {
                var io = where.io
                for(var a = 0;a<io.length;a++){
                
                        if(io[a].name == name){
                                count++;
                                //console.log('IO Position: ',a)
                                //console.log('io['+a.toString()+']');
                                result['IO Position'] = a;
                                result['Position'] = 'io['+a.toString()+']'
                                result.count = count;
                                
                        }
                
                }
        }
        if (where.devices) {
                var devices = where.devices
                for(var a = 0; a < devices.length;a++){
                        for(var b = 0; b < devices[a].samples.length; b++){
                                if(devices[a].samples[b][0].name == name){
                                        //console.log('Device Position: ',a);
                                        //console.log('Sample Position: ',b);
                                        //console.log('devices['+a.toString()+'].samples['+b.toString()+']');
                                        count++;
                                        result['Device Position'] = a;
                                        result['Sample Position'] = b;
                                        result['Position'] = 'devices['+a.toString()+'].samples['+b.toString()+']';
                                        result.count = count;
                                }
                        }
                }
        }
        if (!where.devices && !where.io){       //Find a sample in "FlatData"
                for (var a = 0; a < where.length; a++){
                        if (where[a][0].name == name) {
                                //console.log('Array Position: ',a);
                                count++;
                                result['Array Position'] = a;
                                result.count = count;
                        }
                }
        }
        return result;
}

function findDuplicateSamples(where){
        var duplicates = [];
        if (where.io) {
                var io = where.io
                for(var a = 0;a<io.length;a++){
                        var name = io[a].name;
                        var foundSampleCount = findSample(name,where);
                        if (foundSampleCount.count > 1) {
                                console.log('Duplicate Found! Sample ',name);
                                duplicates.push(name);
                        }
                }
        }
        if (where.devices) {
                var devices = where.devices
                for(var a = 0; a < devices.length;a++){
                        for(var b = 0; b < devices[a].samples.length; b++){
                                var name = devices[a].samples[b][0].name;
                                var foundSampleCount = findSample(name,where);
                                if (foundSampleCount.count > 1) {
                                        console.log('Duplicate Found! Sample ',name);
                                        duplicates.push(name);
                                }
                        }
                }
        }
        if (!where.devices && !where.io){       //Find a sample in "FlatData"
                for (var a = 0; a < where.length; a++){
                        var name = where[a][0].name;
                        var foundSampleCount = findSample(name,where);
                        if (foundSampleCount.count > 1) {
                                console.log('Duplicate Found! Sample ',name);
                                duplicates.push(name);
                        }
                }
        }
        return duplicates;
}

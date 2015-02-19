var child = require('child_process'),
        fs = require('fs'),
	http = require('http'),
	events = require('events'),
	eventEmitter = new events.EventEmitter(),
	DB = require('node-cassandra-cql').Client,
	dbhosts = ['localhost'],//Database host
	db = new DB({hosts:dbhosts,keyspace:'iomapper'});
	global.traceInterval = 15; //In seconds;
	global.configInterval = 60; //In seconds;
	global.intervals = new Array();
        
	global.mapRoot = 'viewport';
	global.defaultClusterId = 'id_cluster_default';
	global.hostConfigs = {};
	global.hostAttrs = {};
	global.agents = [
			 'raptor' //raptor
			 ,
			 //'172.16.1.123'
			 //,
			 'charger' //charger
			 ,
			 'challenger'
			 ,
			 'dart'
			 ,
			 'lightning'
			 ,
			 'thunderbird'
			 ,
			 'corvette'
			 ]
	//var config = {};
	//var trace = {};
	//var ids = {};
	//sample = {};
	
	








//eventEmitter.on('config',function(cfg){storeObject(cfg)});
//eventEmitter.on('trace',function(trc){storeObject(trc)});

eventEmitter.on('exitParser',function(){process.exit()})//Must initialize event loop
eventEmitter.on('config',function(cfg,host){storeObject(cfg,host)});
eventEmitter.on('trace',function(trc,host){storeObject(trc,host)});


//setInterval(getData,configInterval,configOpts);

//setInterval(getData,traceInterval,traceOpts)

function getData(opts){
	//var o = opts.host;
	//debugger;
	//var z = 'z';
	var req = http.request(opts,callback);
	req.__opts__ = {};
	req.__opts__.host = opts.host;//The callback above is an event listener, doesn't have access to any scope variables. Add request-related info to associate response with request
	req.__opts__.path = opts.path
	
	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
		console.log('IP: ',opts.host)
		console.log('URL: ',req.url);
		//debugger;
	});
	req.end();
	
	function callback(response) {
		var str = '';
		//debugger;
		//another chunk of data has been recieved, so append it to `str`
		response.on('data', function (chunk) {
			str += chunk;
			//debugger;
		});
	
		//the whole response has been recieved, so we just print it out here
		response.on('end', function () {
		try{
			var sample=JSON.parse(str);
			//console.log("Parsed");
			//console.log(Object.keys(sample))
			if(sample.__config__){
				//debugger;
				config = JSON.parse(str);
				var cfg = str;
				var host = this.req.__opts__.host;
				eventEmitter.emit('config',cfg,host);
			};
			if(sample.processes){
				//debugger;
				trace = JSON.parse(str);
				var trc = str;
				var host = this.req.__opts__.host;
				eventEmitter.emit('trace',trc,host);
			};
			
			//var clusters;
			//var subnets = new Array();
			
			
			//storeObject(sample);
			//debugger;
			//process.kill(process.pid, 'SIGINT');
		}
		catch(err){
			//debugger;
			console.log("Error parsing JSON: "+err);	
			return;
		}
		//sample = JSON.parse(str);
		//console.log(sample)
		});
	  
		response.on('error', function(err){console.log("ERROR: ",err)})
	}
}

function sampleMachine(ip,options){
	//var configOpts = {host:'172.16.1.233',port:8125,path:'/config',method:'GET'};//HWMON Agent host
	//var traceOpts = {host:'172.16.1.233',port:8125,path:'/trace',method:'GET'};//HWMON Agent host
	var configOpts = {host:ip,port:8125,path:'/config',method:'GET'};//HWMON Agent host
	var traceOpts = {host:ip,port:8125,path:'/trace',method:'GET'};//HWMON Agent host
	
	//var config = 'asdf';
	//var trace = 'fdsa';
	
	
	getData(configOpts);
	getData(traceOpts);
	//debugger;
	
}

function run(){
	for (var agent in agents){
		sampleMachine(agents[agent]);
	}
}

run();
intervals.push(setInterval(run,(traceInterval*1000))); 


process.on('SIGINT',function(){
        db.shutdown(function(){console.log("Shutting down database connection");
		    console.log("about to exit");
		    for (var i=0;i<intervals.length;i++){
			clearInterval(intervals[i]);
			}
		    process.exit();
		    })
	
	
	//writeOut(rawData);
        //hwmon.kill('SIGINT');
	
	
})

function writeOut(data){
        //var traceOut = JSON.stringify(sockets);
        var filename = '/root/file01.txt'
        fs.writeFile(filename,data,'utf8',function(err){if(err){console.log('ERROR')}else console.log('Done writing trace file '+ filename)});
}

function storeObject(obj,agent){
	//debugger;
	var originalString = obj;
	
	obj = JSON.parse(obj);
	var traceCounter = 0;//Counts number of items to insert;
	var insertCounter = 0;//Counts number of successful inserts;
	var insertDone = false;//Set to true when json fully processed and we're only waiting on DB to finish
	var ids = {};
	
	//Handle system scan
	//debugger;
	if(obj.__config__){
		//config = JSON.stringify(obj);
		//debugger;
		if (!hostConfigs[agent]) {
			hostConfigs[agent] = {};
			hostConfigs[agent] = JSON.parse(originalString);
		}
		else{
			hostConfigs[agent] = JSON.parse(originalString);
		}
		var config = hostConfigs[agent];
		var host = config.id;
		
		if (!hostAttrs[config.id]) {
			hostAttrs[config.id] = {};
		}
		
		hostAttrs[config.id].config = JSON.parse(originalString);
		
		hostAttrs[config.id].subnets = new Array();
		//var clusters = {'a':'b'};
		var insertIpQuery = "INSERT INTO ips (ip,host,html_id,device_name) values (?,?,?,?)";
		//Insert IP addresses to match sockets against;
		for(var nic in obj.nics){
			if(obj.nics[nic].__config__ && obj.nics[nic].__config__.ips){
				var ips = obj.nics[nic].__config__.ips;
				for (var a in ips){
					if(ips[a].family == 'IPv4'){
						var ip = ips[a].address;
						var html_id = obj.nics[nic].id;
						var device_name = nic;
						var props = [ip,host,html_id,device_name];
						insert(insertIpQuery,props)
					}
				}
			}
			if(obj.nics[nic].__config__ && obj.nics[nic].__config__.ip && obj.nics[nic].__config__.mask){
				var ipcalc = new IPv4_Address(obj.nics[nic].__config__.ip,obj.nics[nic].__config__.mask);
				var subnet = ipcalc.netaddressDotQuad;
				hostAttrs[config.id].subnets.push(subnet);
			}
		}
		
		
		
		//return;
		
		/*
		 * Identify the cluster and the client/server container:
		 * 
		 * Figure out if the host has a parent - lookup the most recent entry in hosts table. Maybe not the most recent... just overwrite them as new relationships are made
		 * 	If yes, figure out parent chain - from container to cluster
		 * 		Insert into TIME MAP database using the current timestamp. Insert all parents up to and including cluster
		 * 			Insert rest of config using simple loop. Or maybe insert the whole JSON for the host as one line to save time
		 *
		 * 	If NOT: the host doesn't have a parent. Need to determine the cluster - how?
		 * 		Step 0: Identify IPs (done above) and subnets of the host
		 * 		Step 1 - worst: lookup subnets each cluster is responsible for. If found - use that cluster
		 * 				What if several subnets are found belonging to different clusters?
		 * 		Step 2 - better: lookup "unknown peers" IPs created when sockets are recorded, and remote is not found. If found, Use cluster of known peer
		 * 				This is bad idea. Sockets could be very remote... strike step 2
		 * 		Step 3 - best: lookup "unknown peers" WWNs created when disk (FC/IB) I/O is recored. If found, use cluster of known peer
		 * 				Only works for storage devices
		 * 		Step 4: If not found - use default cluster
		 * 		
		 *
		*/
		
		
		function retrieveClusters(currentId){
			function data(currentId){//Define closure function to pass current variables to callback. Don't ask how
				//debugger;
				return currentId;
			}
			var params = [];
			for (var a = 0; a<hostAttrs[currentId].subnets.length; a++){params.push('?')};
			var params = params.join();
			var subnetClusterQuery = 'select subnet,cluster_id,parent from subnets where subnet in (' + params + ')';
			
			db.execute(subnetClusterQuery,hostAttrs[currentId].subnets,function(err,result){
					
					var id = data(currentId);
					//debugger;
					//currentData.originalString = JSON.parse(currentData.originalString);
					var cluster = '';
					var parent;
					//debugger;
					
					if(err){console.log('Could not select clusters; Error: ',err);debugger}
					else{
						//console.log(clusters);
						var clusters = result.rows;
						//debugger;
						
						if (clusters.length == 0) {
							//cluster = 'defaut';
							//insertConfig()
						}
						else{
							for (var z = 0; z < clusters.length; z++){
								if (hostAttrs[id].subnets.indexOf(clusters[z]['subnet']) == -1) {
									var error = new Error('DB result is not in list of subnets...');
									//debugger;
									console.log(error);
									//console.log(currentData);
									console.log(result);
								}
								
								else if (clusters[z]['cluster_id'] == null) {
									//cluster = 'id_default_cluster';
								}
								else{
									cluster = clusters[z]['cluster_id'];
									parent = clusters[z]['parent'];
								}
							}
						}
					}
					if (cluster == '') {
						cluster = defaultClusterId;//'id_cluster_default';
						parent = mapRoot;//'viewport'
					}
					hostAttrs[id].cluster = {'id':cluster,'parent':parent};
					
					retrieveContainers(id);
					
					//debugger;
				})
		}
		
		function retrieveContainers(currentId){
			function data(currentId){//Define closure function to pass current variables to callback. Don't ask how
				//debugger;
				return currentId;
			}
			
			var clusterContainersQuery = "select template,parent,html_id from containers where template in ('clientContainer','serverContainer') and parent=?";
			db.execute(clusterContainersQuery,[hostAttrs[currentId].cluster.id],function(err,result){
					
					var id = data(currentId);
					//debugger;
					
					if(err){console.log('Could not select containers; Error: ',err);debugger}
					else{
						//console.log(clusters);
						var containers = result.rows;
						//debugger;
						
						if (containers.length == 0) {
							if(!hostAttrs[id].containers){hostAttrs[id].containers = {};};
							if (!hostAttrs[id].containers.clientContainer) {hostAttrs[id].containers.clientContainer={};}
							if (!hostAttrs[id].containers.serverContainer) {hostAttrs[id].containers.serverContainer={};}
							
							hostAttrs[id].containers.clientContainer.parent = hostAttrs[id].cluster.id;
							hostAttrs[id].containers.clientContainer.id = 'id_clientContainer_' + hostAttrs[id].cluster.id;
							hostAttrs[id].containers.serverContainer.parent = hostAttrs[id].cluster.id;
							hostAttrs[id].containers.serverContainer.id = 'id_serverContainer_' + hostAttrs[id].cluster.id;
							var containerInsertQuery  = 'INSERT INTO CONTAINERS (template,parent,html_id) values(?,?,?)';
							var containerProps = ['clientContainer',hostAttrs[id].containers.clientContainer.parent,hostAttrs[id].containers.clientContainer.id]
							insert(containerInsertQuery,containerProps);
							var containerProps = ['serverContainer',hostAttrs[id].containers.serverContainer.parent,hostAttrs[id].containers.serverContainer.id]
							insert(containerInsertQuery,containerProps);
						}
						else{
							for (var z = 0; z < containers.length; z++){
								if (hostAttrs[id].cluster.id != containers[z]['parent']) {
									var error = new Error('DB result is not the right cluster...');
									//debugger;
									console.log(error);
									//console.log(currentData);
									console.log(result);
								}
								else if (containers[z]['html_id'] == null) {//No html_id
									//cluster = 'default';
								}
								else{
									if(!hostAttrs[id].containers){hostAttrs[id].containers = {};};
									if (!hostAttrs[id].containers[containers[z]['template']]) {hostAttrs[id].containers[containers[z]['template']]={};}
									hostAttrs[id].containers[containers[z]['template']]['id'] = containers[z]['html_id'];
									hostAttrs[id].containers[containers[z]['template']]['parent'] = containers[z]['parent'];
								}
							}
						}
					}
					//debugger;
					insertConfig(id);
				})
		}
		
		function retrieveHosts(currentId){
			function data(currentId){//Define closure function to pass current variables to callback. Don't ask how
				//debugger;
				return currentId;
			}

			var hostQuery = 'select host,parent from hosts where host=?';
			
			db.execute(hostQuery,[currentId],function(err,result){
					
					var id = data(currentId);
					//debugger;
					//currentData.originalString = JSON.parse(currentData.originalString);
					var parent = '';
					//debugger;
					
					if(err){console.log('Could not select hosts; Error: ',err);debugger}
					else{
						//console.log(clusters);
						var parents = result.rows;
						//debugger;
						
						if (parents.length == 0) {
							//cluster = 'defaut';
							//insertConfig()
						}
						else{
							for (var z = 0; z < parents.length; z++){
								if (id != parents[z]['host']) {
									var error = new Error('DB result is not the right host...');
									//debugger;
									console.log(error);
									console.log(result);
								}
								
								else if (parents[z]['parent'] == null) {
									
								}
								else{
									parent = parents[z]['parent'];
									
								}
							}
						}
					}
					if (parent == '') {
						//debugger;
						retrieveClusters(id);
					}
					else{
						hostAttrs[id].parent = parent;
						//Insert config here;
					}
					//debugger;
				})
		}
		
		//retrieveClusters(config.id);
		retrieveHosts(config.id);

		
		//######################################################################
		//return;
		function insertConfig(id){
		
			//var time = new Date().getTime();
			var parent;
			var html_id;
			var template;
			var json;
			//var query = "INSERT INTO MAPPER (parent,time,html_id,template) values (?,?,?,?)";
			var query = "INSERT INTO MAPPER (parent,html_id,template) values (?,?,?)";
			//var props = [parent,time,html_id];
			//var props = [parent,html_id];
			
			//Insert cluster
			parent = hostAttrs[id].cluster.parent;
			html_id = hostAttrs[id].cluster.id;
			template = 'cluster';
			
			//props = [parent,time,html_id,template];
			var props = [parent,html_id,template];
			db.execute(query,props,function(err){if(err){console.log("ERROR: ",err)}});
			
			//Insert container
			parent = html_id;
			switch (hostAttrs[id].config.template) {
				case 'client':
					html_id = hostAttrs[id].containers.clientContainer.id;
					template = 'clientContainer';
					break;
				case 'server':
					html_id = hostAttrs[id].containers.serverContainer.id;
					template = 'serverContainer';
					break;
			}
			//props = [parent,time,html_id,template];
			props = [parent,html_id,template];
			db.execute(query,props,function(err){if(err){console.log("ERROR: ",err)}});
			
			//Insert host:
			parent = html_id;
			html_id = id;
			template = hostAttrs[id].config.template;
			json = JSON.stringify(hostAttrs[id].config)
			//query = "INSERT INTO MAPPER (parent,time,html_id,template,json) values (?,?,?,?,?)";
			query = "INSERT INTO MAPPER (parent,html_id,template,json) values (?,?,?,?)";
			//props = [parent,time,html_id,template,json];
			props = [parent,html_id,template,json];
			db.execute(query,props,function(err){if(err){console.log("ERROR: ",err)}});
			//debugger;
		};
		//debugger;
	}
	
	//Handle sample metrics
	
	else if(obj.processes){
		//Make sure CONFIG is there
		if (!hostConfigs[agent]) {
			console.log("No config present, can't process trace");
			return;
		}
		var config = hostConfigs[agent];
		//if(!config || !config.__config__ || !config.id){
		//	
		//}
		var date = new Date();
				
		//Calculate unique "Time Period" key. This will be the primary key upon insert.
		//Every sample which falls into the same period will have an identical key
		//Find the nearest "tick" and set the key to it
		var timeKey = new Date(date);
		timeKey.setMilliseconds(0);
		var s = timeKey.getSeconds();
		if (s<traceInterval) {s = 0}
		else{s = s-(s%traceInterval)};
		timeKey.setSeconds(s);
		//console.log('Time: ',date)
		//console.log('Time Key: ',timeKey)
		
		var realTimestamp = date.getTime();
		var timestamp = timeKey.getTime();
		console.log('Time: ',timeKey)
		//debugger;
		
		
		//IF I want to convert from Unix epoch:
		//var utcSeconds = 1234567890;
		//var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
		//d.setUTCSeconds(utcSeconds);
		//How to select timestamp with milliseconds:
		//select type,blobAsBigint(timestampAsBlob(ts)) AS val from iomapper.tempio limit 20;
		/*
		 * How to get a TIMESTAMP field from Cassandra and convert it to milliseconds string in Javascript:
		 * select ts from table;
		 * var a = ts string (Sun Dec 22 2013 18:02:32 GMT-0800 (PST));
		 * a automatically becomes a Date Object
		 * a.getTime() - gives you the exact string you have in DB
		 *
		*/
		
		//Types:
		//disk
		//proccpu
		//procmem
		//procdisk
		//net
		var type,
		host = config.id,//THE HTML ID of the host from config
		ts = timestamp,
		device_id = '',
		metric_name,
		uuid,
		metric_value = '';
		var laddr = '',
		lport = '',
		raddr = '',
		rport = '',
		pid = '',
		html_id,
		origin,
		parentB,
		bwa,bwb,stream_id,
		attrs = {};
		ids.raids = new Object();
		ids.vols = new Object();
		var procPipes = [];
		//tag1 = '',
		//tag2 = '',
		//tag3 = '',
		//tag4 = '',
		//tag5 = '',
		//tag6 = '',
		//tag7 = '',
		//tag8 = '',
		
		//var tempIoQuery = "INSERT INTO tempio (type,ts,host,device_id,metric_name,uuid,device_name,metric_value) values (?,?,?,?,?,?,?,?)";
		//var tempIoQuery = "INSERT INTO tempio (type,ts,host,device_id,uuid,metric_value,json) values (?,?,?,?,?,?,?)";
		var tempIoQuery = "INSERT INTO tempio (type,ts,host,device_id,uuid,metric_value) values (?,?,?,?,?,?)";
		var pipesQuery = "INSERT INTO pipes (type,ts,html_id,origin,parentB,bwa,bwb,stream_id) values (?,?,?,?,?,?,?,?)";
		var socketsQuery = "INSERT INTO sockets (laddr,lport,raddr,rport,html_id,read,write) values (?,?,?,?,?,?,?)";
		var liveSocketsQuery = "SELECT laddr,lport,raddr,rport,html_id,read,write FROM sockets WHERE laddr=? AND lport=? AND raddr=? AND rport=?"
		var liveIpQuery = "SELECT host,html_id,device_name FROM ips WHERE ip=?"
		var query = tempIoQuery;
		//var props = [ts,host,device,m_value,name,uuid,tag1,tag2,tag3,tag4,tag5,tag6,tag7,tag8,ts];
		if(obj.PhysIO){
			for (var a in obj.PhysIO){
				type = 'volpipe';
				device_name = a;
				var dev = a;//Find the actual device ID from config; dev is used in matchDiskId function();
				if(!ids.raids[dev]){//If ID hasn't been found yet
					walk(config,matchDiskId);//Find ID - only look in physical devices (skip dm-0 kind of devices)
					if(!ids.raids[dev] || !ids.raids[dev].origin || !ids.raids[dev].parentB){continue}//If ID still not found - skip
				}
				origin = ids.raids[dev].origin;
				parentB = ids.raids[dev].parentB;
				html_id = htmlId(type,origin,parentB,'readBytesSec');
				bwa = obj.PhysIO[a]['readBytesSec'];bwb = bwa;
				stream_id = '0';
				//debugger;
				if(bwa != 0){
					var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
					//debugger;
					insert(pipesQuery,props);
				}
				
				html_id = htmlId(type,origin,parentB,'writeBytesSec');
				bwa = obj.PhysIO[a]['writeBytesSec'];bwb = bwa;
				if(bwa != 0){
					//debugger;
					var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
					insert(pipesQuery,props);
				}
			}
		}
		if(obj.network){
			for (var a in obj.network){
				type = 'socket';
				//device = obj.network[a].MAC;
				//name = "bytesReceivedPerSec";
				var dev = obj.network[a].local;
				if(!ids[dev]){//If ID hasn't been found yet
					walk(config.nics,matchNicId);//Find ID
					//debugger;
					if(!ids[dev]){continue}//If ID still not found - skip
					else{device_id = ids[dev].id}
				}
				device_id = ids[dev].id
				metric_name = "netSocket";
				//var socketId = ipToNum(obj.network[a].local).toString()+'_'+obj.network[a].localport.toString();//Maybe later when this becomes a problem
				var socketId = obj.network[a].local+'_'+obj.network[a].localport.toString();
				uuid = htmlId(type,host,metric_name,socketId);
				obj.network[a].uuid = uuid;
				device_name = ids[dev].device_name;
				//debugger;
				//if(!ids[a]){continue}
				//else{device_id = ids[a].id};
				//walk(config,matchNicId);
				//console.log("NAME: ",name)
				//debugger;
				//Figure out percentage value for the socket traffic
				var speed = config.nics[device_name].__config__.speed;
				
				metric_value = obj.network[a].bytesReceivedPerSec+obj.network[a].bytesSentPerSec;
				
				//In bits per second:
				metric_value = metric_value*8;
				
				//In percent:
				metric_value = metric_value/(speed/100)
				
				//if(metric_value != 0){
					//var props = [type,ts,host,device_id,metric_name,uuid,device_name,metric_value];
					var props = [type,ts,host,device_id,uuid,metric_value];
					//traceCounter++;
					insert(tempIoQuery,props);
				//}
				laddr = obj.network[a].local;
				lport = obj.network[a].localport.toString();
				raddr = obj.network[a].remote;
				rport = obj.network[a].remoteport.toString();
				var read = obj.network[a].bytesReceivedPerSec;
				var write = obj.network[a].bytesSentPerSec;
				var props = [laddr,lport,raddr,rport,uuid,read,write];
				insert(socketsQuery,props);
				//metric_name = "bytesSentPerSec";
				//metric_value = obj.network[a].bytesSentPerSec;
				//if(metric_value != 0){
				//	var props = [type,ts,host,device_id,metric_name,uuid,device_name,metric_value];
				//	//traceCounter++;
				//	insert(query,props);
				//}
				origin = uuid;
				parentB = htmlId('proccpu',host,'processCpuUtil',obj.network[a].PID);
				type = 'nicpipe';
				html_id = htmlId(type,origin,parentB,'read');
				bwa = obj.network[a].bytesReceivedPerSec;bwb = bwa;
				stream_id = '0';
				if(bwa != 0){
					var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
					insert(pipesQuery,props);
				}
				html_id = htmlId(type,origin,parentB,'write');
				bwa = obj.network[a].bytesSentPerSec;bwb = bwa;
				if(bwa != 0){
					var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
					insert(pipesQuery,props);
				}
				//Create NETPIPE;
				//debugger;
				createNetPipe(obj.network[a])
			}
		}
		if(obj.processes){
			for (var a in obj.processes){
				//device = 'cpu'+obj.processes[a].processor.toString();
				
				type = 'proccpu'
				var dev = obj.processes[a].processor;
				if(!ids.cpus){ids.cpus = new Object();}
				if(!ids.cpus[dev]){//If ID hasn't been found yet
					walk(config.cpus,matchCpuId);//Find ID
					//debugger;
					if(!ids.cpus[dev]){debugger;continue}//If ID still not found - skip
					else{device_id = ids.cpus[dev].id;
						device_name = ids.cpus[dev].device_name;
					}
				}
				
				device_id = ids.cpus[dev].id;
				device_name = ids.cpus[dev].device_name;
				
				metric_name = 'processCpuUtil';
				//uuid = obj.processes[a].PID.toString();
				var pid = obj.processes[a].PID.toString();
				uuid = htmlId(type,host,metric_name,pid);
				origin = uuid;
				metric_value = obj.processes[a].procCpuUtil;
				
				//if (!metric_value) {
				//	debugger;
				//}
				if (metric_value == null) {
					debugger;
				}
				
				bwa = metric_value;
				//var props = [type,ts,host,device_id,metric_name,uuid,device_name,metric_value];
				var props = [type,ts,host,device_id,uuid,metric_value];
				//traceCounter++;
				if (metric_value == 0) {
					//Coalesce zero-value metrics
					if (!zero) {
						var zero = new Object();
					}
					if (!zero[type]) {
						zero[type] = new Object();
					}
					if (!zero[type][device_id]) {
						zero[type][device_id] = new Array();
					}
					zero[type][device_id].push(uuid);
					//Create new ORIGIN for connecting pipe;
					origin = htmlId(type,host,device_id,'zero');
				}
				else{
					insert(tempIoQuery,props);
				}
				
				
				type = 'procmem'
				metric_name = 'processMemUtil';
				//metric_value = obj.processes[a].memoryKB; //Replacing with percentage
				metric_value = obj.processes[a].memUtilPct;
				
				if(!ids.ram){//If ID hasn't been found yet
					walk(config.ram,matchRamId);//Find ID
					//debugger;
					if(!ids.ram){continue}//If ID still not found - skip
					else{device_id = ids.ram.id;
						device_name = ids.ram.device_name;
					}
				}
				device_id = ids.ram.id;
				device_name = ids.ram.device_name;
				uuid = htmlId(type,host,metric_name,pid);
				parentB = uuid;
				bwb = metric_value;
				//var props = [type,ts,host,device_id,metric_name,uuid,device_name,metric_value];
				var props = [type,ts,host,device_id,uuid,metric_value];
				
				if (metric_value == 0) {
					//Coalesce zero-value metrics
					if (!zero) {
						var zero = new Object();
					}
					if (!zero[type]) {
						zero[type] = new Object();
					}
					if (!zero[type][device_id]) {
						zero[type][device_id] = new Array();
					}
					zero[type][device_id].push(uuid);
					//Change Parent B designation for connecting pipe;
					parentB = htmlId(type,host,device_id,'zero');
				}
				else{
					insert(tempIoQuery,props);
				}
				
				//Create pipe between process and mem
				
				
				type = 'procpipe';
				html_id = htmlId(type,origin,parentB,'pipe');
				
				stream_id = '0';
				var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
				
				if (procPipes.indexOf(html_id) == -1) {
					insert(pipesQuery,props);
				}
				//else{console.log('Pipe ',html_id,' exists, skipping insert')}
				
				//Add Pipe name to an array to prevent duplicate creations
				procPipes.push(html_id);
				
				
				
				if(obj.processes[a].diskio){
					type = 'mempipe'
					origin = parentB;//From the MEM sample
					for (var b in obj.processes[a].diskio){
						var dev = b.replace('/dev/','');
						if(!ids.vols[dev]){//If ID hasn't been found yet
							walk(config.vols,matchVolId);//Find ID
							if(!ids.vols[dev]){continue}//If ID still not found - skip
							else{parentB = ids.vols[dev].id}
						}
						
						parentB = ids.vols[dev].id;
						//device_name = dev; //ids[dev].device_name;
						//metric_name = 'processDiskUtil';
						
						html_id = htmlId(type,origin,parentB,'readBytesSec');
						bwa = obj.processes[a].diskio[b]['readBytesSec'];bwb = bwa;
						stream_id = '0';
						//debugger;
						if(bwa != 0){
							var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
							//debugger;
							insert(pipesQuery,props);
						}
						
						html_id = htmlId(type,origin,parentB,'writeBytesSec');
						bwa = obj.processes[a].diskio[b]['writeBytesSec'];bwb = bwa;
						if(bwa != 0){
							//debugger;
							var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
							insert(pipesQuery,props);
						}
					}
				}
			}
			if (zero) {
				//debugger;
				metric_value = 0;
				for (var type in zero) {
					for(var device_id in zero[type]){
						//for(var u = 0; u < zero[type][device_id].length; u++){}
						var json = JSON.stringify(zero[type][device_id]);
						var tempIoQuery = "INSERT INTO tempio (type,ts,host,device_id,uuid,metric_value,json) values (?,?,?,?,?,?,?)";
						uuid = htmlId(type,host,device_id,'zero');
						var props = [type,ts,host,device_id,uuid,metric_value,json];
						//debugger;
						insert(tempIoQuery,props);
					}
				}
			}
		}
		//console.log("Traces to Insert: ",traceCounter);
		insertDone = true;
		eventEmitter.once('trace_insert_complete',function(){console.log("Traces Inserted: ",insertCounter)})
	}
	else{return}
	//debugger;
	function walk(obj,action){
		for(var leaf in obj){
			if(obj.hasOwnProperty(leaf)){
				var value = obj[leaf];
			      
				if(typeof value === 'object'){//do stuff
					action(value,leaf,obj);
					walk(value,action);
				}
			}
		}
	}
	function matchVolId(value,leaf,obj){
		//if(leaf == dev){
			//console.log(leaf);console.log(obj);
		if(value.id){
			var id = value.id;
			if (value.__config__ && value.__config__.kdevice && value.__config__.kdevice == dev){
				if(!ids.vols[dev]){
					ids.vols[dev] = new Object();
					
				}
				ids.vols[dev].id = id;
			}
		}
	};
	function matchDiskId(value,leaf,obj){
		
			//console.log(leaf);console.log(obj);
			if(value.id){
				var id = value.id;
				if(leaf == dev){
					if(!ids.raids[dev]){
						ids.raids[dev] = new Object();
					}
					ids.raids[dev].id = id;
					ids.raids[dev].parentB = id;
				}
				if (value.__config__ && value.__config__.dst && value.__config__.dst[dev] && value.__config__.dst[dev].kname == dev){
					if(!ids.raids[dev]){
						ids.raids[dev] = new Object();
					}
					ids.raids[dev].origin = id;
				}
			}
		
		//else if(value.kdevice && value.kdevice == dev){
		//	//console.log(leaf);console.log(obj);
		//	var id = obj.id;
		//	if(!ids[dev]){ids[dev] = new Object(); ids[dev].id = id;}
		//}
	};
	function matchNicId(value,leaf,obj){
		//if(leaf == dev){
			//console.log(leaf);console.log(obj);
		if(value.id){
			var id = value.id;
			if (value.__config__ && value.__config__.ips && value.__config__.ips instanceof Array){
				for (var a = 0; a < value.__config__.ips.length; a++){
					if(value.__config__.ips[a].address == dev){
						if(!ids[dev]){ids[dev] = new Object(); ids[dev].id = id;ids[dev].device_name = leaf}
					}
				}
			}
			//if(!ids[dev]){ids[dev] = new Object(); ids[dev].id = id;}
		}
	};
	function matchCpuId(value,leaf,obj){
		//if(leaf == dev){
			//console.log(leaf);console.log(obj);
		if(value.id){
			//console.log("ID: ",value.id)
			var id = value.id;
			//console.log("Value: ",value)
			if (value.__config__ && value.__config__.processor == dev){
				//for (var a = 0; a < value.__config__.ips.length; a++){
				//console.log("Processor ",value.__config__.processor)
					//if(value.__config__.processor == dev){
						//console.log("dev ",dev)
						if(!ids.cpus[dev]){ids.cpus[dev] = new Object(); ids.cpus[dev].id = id;ids.cpus[dev].device_name = leaf}
					//}
				//}
			}
			//if(!ids[dev]){ids[dev] = new Object(); ids[dev].id = id;}
		}
	};
	function matchRamId(value,leaf,obj){
		//if(leaf == dev){
			//console.log(leaf);console.log(obj);
		if(value.id){
			var id = value.id;
			if (value.template && value.template == 'ram'){
				//for (var a = 0; a < value.__config__.ips.length; a++){
					//if(value.__config__.processor == dev){
						
				if(!ids.ram){ids.ram = new Object(); ids.ram.id = id;ids.ram.device_name = leaf}
					//}
				//}
			}
			//if(!ids[dev]){ids[dev] = new Object(); ids[dev].id = id;}
		}
	};
	function createNetPipe(socket){
		var laddr = socket.local,
		lport = socket.localport.toString(),
		raddr = socket.remote,
		rport = socket.remoteport.toString(),
		read = socket.bytesReceivedPerSec,
		write = socket.bytesSentPerSec,
		type = 'netpipe';
		//Figure out if this machine is server or client
		var srv = false;
		if(trace.netstat){
			if(trace.netstat['0.0.0.0']){
				if(trace.netstat['0.0.0.0'][lport]){srv = true}
			}
			else if(trace.netstat[laddr]){
				if(trace.netstat[laddr][lport]){srv = true}
			}
		}
		//Search existing sockets for the opposing match
			//If found:
				//If SERVER - create two pipes with the opposite being ORIGIN
					//BWA is remote, BWB is local
				//If CLIENT - create two pipes with THIS being origin
					//BWA is local, BWB is remote
			//If socket not found:
				//Search the IPs for a remote match
				//If found:
					//Create socket with remote/local flipped, read and write BWs are taken from local trace
					//Assign proper HTML ID to it
						//If SERVER - create two pipes with the opposite being ORIGIN
							//BWA is remote, BWB is local
						//If CLIENT - create two pipes with THIS being origin
							//BWA is local, BWB is remote
			//If IP not found:
				//Do nothing at this point.
					//Later - create a new IP entry, with unknown host - so pipes can still be created
		
		
		
		//if(srv){
		//parentB = uuid;
		//var props = [laddr,lport,raddr,rport];
		var props = [raddr,rport,laddr,lport];//This is the right statement, the one above if for debugging single machine
		socket.srv = srv;
		select(liveSocketsQuery,props,socket,function(err,socket,result){
			
			if(err){
				console.log(err);
			}//Error
			
			else{//No error, select successful
				if(result.rows.length != 0){//There is a matching socket
					var peer = result.rows[0]['html_id'];//HTML ID - 4th position in array
					if(socket.srv == true){
						var parentB = socket.uuid;
						var origin = peer;
						type = 'netpipe';
						html_id = htmlId(type,origin,parentB,'read');
						bwa = result.rows[0]['read'];
						bwb = socket.bytesReceivedPerSec;
						stream_id = '0';
						if(bwa != 0 || bwb !=0){
							var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
							insert(pipesQuery,props);
						}
						html_id = htmlId(type,origin,parentB,'write');
						bwa = result.rows[0]['write'];
						bwb = socket.bytesSentPerSec;
						if(bwa != 0 || bwb !=0){
							var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
							insert(pipesQuery,props);
						}
					}
					else if(socket.srv == false){
						var origin = socket.uuid;
						var parentB = peer;
						type = 'netpipe';
						html_id = htmlId(type,origin,parentB,'read');
						bwb = result.rows[0]['read'];
						bwa = socket.bytesReceivedPerSec;
						stream_id = '0';
						if(bwa != 0 || bwb !=0){
							var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
							insert(pipesQuery,props);
						}
						html_id = htmlId(type,origin,parentB,'write');
						bwb = result.rows[0]['write'];
						bwa = socket.bytesSentPerSec;
						if(bwa != 0 || bwb !=0){
							var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
							insert(pipesQuery,props);
						}
					}
				}
				else{//Socket not found! Search for source IP and corresponding NIC
					var props = [raddr];
					select(liveIpQuery,props,socket,function(err,socket,result){
						if(err){console.log(err)}//Error
						else{
							if(result.rows.length != 0){//There is a matching IP
								var host = result.rows[0]['host'];//Host ID - 0th position in array
								var device_id = result.rows[0]['html_id'];//HTML ID - 1st position in array
								var device_name = result.rows[0]['device_name'];//Device Name - 2nd position in array
								//####################Create Peer Socket#################
								type = 'socket';
								//device = obj.network[a].MAC;
								//name = "bytesReceivedPerSec";
								//var dev = obj.network[a].local;
								//if(!ids[dev]){//If ID hasn't been found yet
									//walk(config.nics,matchNicId);//Find ID
									//debugger;
									//if(!ids[dev]){continue}//If ID still not found - skip
									//else{device_id = ids[dev].id}
								//}
								//device_id = ids[dev].id
								metric_name = "netSocket";
								//var socketId = ipToNum(obj.network[a].local).toString()+'_'+obj.network[a].localport.toString();//Maybe later when this becomes a problem
								var socketId = socket.remote+'_'+socket.remoteport.toString();
								uuid = htmlId(type,host,metric_name,socketId);
								//obj.network[a].uuid = uuid;
								//device_name = ''//ids[dev].device_name;
								//debugger;
								//if(!ids[a]){continue}
								//else{device_id = ids[a].id};
								//walk(config,matchNicId);
								//console.log("NAME: ",name)
								metric_value = socket.bytesReceivedPerSec+socket.bytesSentPerSec;
								//if(metric_value != 0){
									//var props = [type,ts,host,device_id,metric_name,uuid,device_name,metric_value];
									var props = [type,ts,host,device_id,uuid,metric_value];
									tempIoQuery = "INSERT INTO tempio (type,ts,host,device_id,uuid,metric_value) values (?,?,?,?,?,?)";
									//traceCounter++;
									insert(tempIoQuery,props);
								//}
								//Create socket entry - reverse
								laddr = socket.remote;
								lport = socket.remoteport.toString();
								raddr = socket.local;
								rport = socket.localport.toString();
								var read = socket.bytesReceivedPerSec;
								var write = socket.bytesSentPerSec;
								var props = [laddr,lport,raddr,rport,uuid,read,write];
								insert(socketsQuery,props);
								//####################Create Peer Socket#################
								
								if(socket.srv == true){
									var parentB = socket.uuid;
									var origin = uuid;//The HTML ID of newly created socket
									type = 'netpipe';
									html_id = htmlId(type,origin,parentB,'read');
									//bwa = result.rows[0]['read'];
									bwb = socket.bytesReceivedPerSec;
									bwa = bwb;
									stream_id = '0';
									if(bwa != 0 || bwb !=0){
										var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
										insert(pipesQuery,props);
									}
									html_id = htmlId(type,origin,parentB,'write');
									//bwa = result.rows[0]['write'];
									bwb = socket.bytesSentPerSec;
									bwa = bwb;
									if(bwa != 0 || bwb !=0){
										var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
										insert(pipesQuery,props);
									}
								}
								else if(socket.srv == false){
									var origin = socket.uuid;
									var parentB = uuid;
									type = 'netpipe';
									html_id = htmlId(type,origin,parentB,'read');
									//bwb = result.rows[0]['read'];
									bwa = socket.bytesReceivedPerSec;
									bwb = bwa;
									stream_id = '0';
									if(bwa != 0 || bwb !=0){
										var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
										insert(pipesQuery,props);
									}
									html_id = htmlId(type,origin,parentB,'write');
									//bwb = result.rows[0]['write'];
									bwa = socket.bytesSentPerSec;
									bwb = bwa;
									if(bwa != 0 || bwb !=0){
										var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
										insert(pipesQuery,props);
									}
								}
							}	
						}
						})
				}
			}
		       
		       });
		//}
	}
	function insert(query,props){
		traceCounter++;
		for (var a in props){
			if (props[a] == undefined){
				console.log('Error: props not defined correctly: ',props);
				return;
			}
		}
		//db.executeAsPrepared(query,props,
		db.execute(query,props,
			function(err){if(err){
					console.log("Error: ",err)}
				else{
					insertCounter++;
					//console.log("Insert Counter: ",insertCounter)
					
					
					if(insertDone == true && insertCounter == traceCounter){
						eventEmitter.emit('trace_insert_complete');
					}
				}
			})
	}
	function select(query,props,opts,callback){
		//traceCounter++;
		for (var a in props){
			if (props[a] == undefined){
				console.log('Error: props not defined correctly: ',props);
				return;
			}
		}
		//db.executeAsPrepared(query,props,
		db.execute(query,props,
			function(err,result){if(err){
					console.log("Error: ",err)}
				else{
					callback(null,opts,result);
					//insertCounter++;
					//console.log("Insert Counter: ",insertCounter)
					//if(insertCounter == traceCounter){
						//eventEmitter.emit('trace_insert_complete');
					//}
				}
			})
	}
	function htmlId(type,base,suffix,uid){
		var id;
		switch(type){
			case 'proccpu':
				id = base+'_'+suffix+'_'+uid;
				return id;
				break;
			case 'procmem':
				id = base+'_'+suffix+'_'+uid;
				return id;
				break;
			case 'procdisk':
				id = base+'_'+suffix+'_'+uid;
				return id;
				break;
			case 'socket':
				id = base+'_'+suffix+'_'+uid;
				id = id.replace(/\./g,'_');
				return id;
				break;
			case 'disk':
				return id;
				break;
			case 'volpipe':
				id = base+'_'+suffix+'_'+uid;
				return id;
				break;
			case 'procpipe':
				id = base+'_'+suffix+'_'+uid;
				break;
			case 'nicpipe':
				id = base+'_'+suffix+'_'+uid;
				break;
			case 'mempipe':
				id = base+'_'+suffix+'_'+uid;
				break;
			case 'netpipe':
				id = base+'_'+suffix+'_'+uid;
				break;
			default:
				return id;
		}
		return id;
	}
	function ipToNum(ip){
		var d = dot.split('.');
		return ((((((+d[0])*256)+(+d[1]))*256)+(+d[2]))*256)+(+d[3]);
	}
		
	function numToIp(num){
		var d = num%256;
		for (var i = 3; i > 0; i--) 
		{ 
			num = Math.floor(num/256);
			d = num%256 + '.' + d;
		}
		return d;
	}
	
}




//FOR LOOP with callbacks
//repeater(i) {
//  if( i < length ) {
//     asyncwork( function(){
//       repeater( i + 1 )
//     })
//  }
//}
//repeater(0)

//http.request(opts,function(res){console.log("Got response: " + res.statusCode);res.on('data',function(chunk){console.log(chunk)})})
//
//http.request(opts,function(res){console.log("Got response: " + res.statusCode)})
//
//
//var opts = {host:'www.google.com',port:80,path:'/index.html',method:'GET'}

//var opts = {host:'172.16.1.133',port:8080,path:'/report',method:'GET'}


/*
Copyright (c) 2010, Michael J. Skora
All rights reserved.
Source: http://www.umich.edu/~parsec/information/code/ip_calc.js.txt

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions of source code packaged with any other code to form a distributable product must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of the author or other identifiers used by the author (such as nickname or avatar) may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/


function IPv4_Address( addressDotQuad, netmaskBits ) {
	var split = addressDotQuad.split( '.', 4 );
	var byte1 = Math.max( 0, Math.min( 255, parseInt( split[0] ))); /* sanity check: valid values: = 0-255 */
	var byte2 = Math.max( 0, Math.min( 255, parseInt( split[1] )));
	var byte3 = Math.max( 0, Math.min( 255, parseInt( split[2] )));
	var byte4 = Math.max( 0, Math.min( 255, parseInt( split[3] )));
	if( isNaN( byte1 )) {	byte1 = 0;	}	/* fix NaN situations */
	if( isNaN( byte2 )) {	byte2 = 0;	}
	if( isNaN( byte3 )) {	byte3 = 0;	}
	if( isNaN( byte4 )) {	byte4 = 0;	}
	addressDotQuad = ( byte1 +'.'+ byte2 +'.'+ byte3 +'.'+ byte4 );

	this.addressDotQuad = addressDotQuad.toString();
	this.netmaskBits = Math.max( 0, Math.min( 32, parseInt( netmaskBits ))); /* sanity check: valid values: = 0-32 */
	
	this.addressInteger = IPv4_dotquadA_to_intA( this.addressDotQuad );
//	this.addressDotQuad  = IPv4_intA_to_dotquadA( this.addressInteger );
	this.addressBinStr  = IPv4_intA_to_binstrA( this.addressInteger );
	
	this.netmaskBinStr  = IPv4_bitsNM_to_binstrNM( this.netmaskBits );
	this.netmaskInteger = IPv4_binstrA_to_intA( this.netmaskBinStr );
	this.netmaskDotQuad  = IPv4_intA_to_dotquadA( this.netmaskInteger );
	
	this.netaddressBinStr = IPv4_Calc_netaddrBinStr( this.addressBinStr, this.netmaskBinStr );
	this.netaddressInteger = IPv4_binstrA_to_intA( this.netaddressBinStr );
	this.netaddressDotQuad  = IPv4_intA_to_dotquadA( this.netaddressInteger );
	
	this.netbcastBinStr = IPv4_Calc_netbcastBinStr( this.addressBinStr, this.netmaskBinStr );
	this.netbcastInteger = IPv4_binstrA_to_intA( this.netbcastBinStr );
	this.netbcastDotQuad  = IPv4_intA_to_dotquadA( this.netbcastInteger );
}

/* In some versions of JavaScript subnet calculators they use bitwise operations to shift the values left. Unfortunately JavaScript converts to a 32-bit signed integer when you mess with bits, which leaves you with the sign + 31 bits. For the first byte this means converting back to an integer results in a negative value for values 128 and higher since the leftmost bit, the sign, becomes 1. Using the 64-bit float allows us to display the integer value to the user. */
/* dotted-quad IP to integer */
function IPv4_dotquadA_to_intA( strbits ) {
	var split = strbits.split( '.', 4 );
	var myInt = (
		parseFloat( split[0] * 16777216 )	/* 2^24 */
	  + parseFloat( split[1] * 65536 )		/* 2^16 */
	  + parseFloat( split[2] * 256 )		/* 2^8  */
	  + parseFloat( split[3] )
	);
	return myInt;
}

/* integer IP to dotted-quad */
function IPv4_intA_to_dotquadA( strnum ) {
	var byte1 = ( strnum >>> 24 );
	var byte2 = ( strnum >>> 16 ) & 255;
	var byte3 = ( strnum >>>  8 ) & 255;
	var byte4 = strnum & 255;
	return ( byte1 + '.' + byte2 + '.' + byte3 + '.' + byte4 );
}

/* integer IP to binary string representation */
function IPv4_intA_to_binstrA( strnum ) {
	var numStr = strnum.toString( 2 ); /* Initialize return value as string */
	var numZeros = 32 - numStr.length; /* Calculate no. of zeros */
	if (numZeros > 0) {	for (var i = 1; i <= numZeros; i++) { numStr = "0" + numStr }	} 
	return numStr;
}

/* binary string IP to integer representation */
function IPv4_binstrA_to_intA( binstr ) {
	return parseInt( binstr, 2 );
}

/* convert # of bits to a string representation of the binary value */
function IPv4_bitsNM_to_binstrNM( bitsNM ) {
	var bitString = '';
	var numberOfOnes = bitsNM;
	while( numberOfOnes-- ) bitString += '1'; /* fill in ones */
	numberOfZeros = 32 - bitsNM;
	while( numberOfZeros-- ) bitString += '0'; /* pad remaining with zeros */
	return bitString;
}

/* The IPv4_Calc_* functions operate on string representations of the binary value because I don't trust JavaScript's sign + 31-bit bitwise functions. */
/* logical AND between address & netmask */
function IPv4_Calc_netaddrBinStr( addressBinStr, netmaskBinStr ) {
	var netaddressBinStr = '';
	var aBit = 0; var nmBit = 0;
	for( pos = 0; pos < 32; pos ++ ) {
		aBit = addressBinStr.substr( pos, 1 );
		nmBit = netmaskBinStr.substr( pos, 1 );
		if( aBit == nmBit ) {	netaddressBinStr += aBit.toString();	}
		else{	netaddressBinStr += '0';	}
	}
	return netaddressBinStr;
}

/* logical OR between address & NOT netmask */
function IPv4_Calc_netbcastBinStr( addressBinStr, netmaskBinStr ) {
	var netbcastBinStr = '';
	var aBit = 0; var nmBit = 0;
	for( pos = 0; pos < 32; pos ++ ) {
		aBit = parseInt( addressBinStr.substr( pos, 1 ));
		nmBit = parseInt( netmaskBinStr.substr( pos, 1 ));
		
		if( nmBit ) {	nmBit = 0;	}	/* flip netmask bits */
		else{	nmBit = 1;	}
		
		if( aBit || nmBit ) {	netbcastBinStr += '1'	}
		else{	netbcastBinStr += '0';	}
	}
	return netbcastBinStr;
}

/* included as an example alternative for converting 8-bit bytes to an integer in IPv4_dotquadA_to_intA */
function IPv4_BitShiftLeft( mask, bits ) {
	return ( mask * Math.pow( 2, bits ) );
}

/* used for display purposes */
function IPv4_BinaryDotQuad( binaryString ) {
	return ( binaryString.substr( 0, 8 ) +'.'+ binaryString.substr( 8, 8 ) +'.'+ binaryString.substr( 16, 8 ) +'.'+ binaryString.substr( 24, 8 ) );
}

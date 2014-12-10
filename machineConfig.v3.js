/*
 *Version 2: removed Windows, and added homegrown trace collector - no HWMON
 */


var spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	child = require('child_process'),
	util = require('util'),
	rl = require('readline'),
	os = require ('os'),
	fs = require('fs'),
	http = require('http'),
	events = require('events'),
	eventEmitter = new events.EventEmitter();
	
global.ids = [];
//global.ready = false;

//var xml2js = require('xml2js');
//var parser = new xml2js.Parser({mergeAttrs:true,explicitArray:false});

//OUTPUT:
global.commands = new Object();

global.machineConfig = new Object();

global.status = new Object();

fs.writeFileSync('/proc/sys/vm/block_dump','1');

global.traceInterval = 15000;

global.pollInterval = 3000; //For various trace commands, how often to poll counters for avg

global.configInterval = 60000

global.traceCmds = new Object();

global.tmp = new Object();

global.PROC = '/proc/';
global.page_size = 4096;
global.sector_size = 512;

tmp.result = {};
tmp.result.pids = {};
tmp.result.pidlist = [];
//result.first_run = true;
tmp.result.last_sys_times = 0;
tmp.result.sys_times = 0;

global.num_procs = 0;

global.trace = {};

global.proc_stat_cols = ['pid','comm','state','ppid','pgrp',
                          'session','tty_nr','tpgid','flags',
                          'minflt','cminflt','majflt','cmajflt',
                          'utime','stime','cutime','cstime',
                          'priority','nice','num_threads',
                          'itrealvalue','starttime','vsize','rss',
                          'rsslim','startcode','endcode','startstack',
                          'kstkesp','kstkeip','signal','blocked',
                          'sigignore','sigcatch','wchan','nswap',
                          'cnswap','exit_signal','processor','rt_priority',
                          'policy','delayacct_blkio_ticks',
                          'guest_time','cguest_time',
                          'start_data','end_data','start_brk',
                          'arg_start','arg_end','env_start',
                          'env_end','exit_code'];

switch (os.type()){
	case "Linux":
		//commands.uuid = {cmd:'dmidecode -s system-uuid',out:''};
		//commands.hostname = {cmd:'hostname',out:''};
		commands.cpu = {cmd:'lscpu',out:''}
		//commands.disk = {cmd:'lsblk --ascii --include 8 --bytes --fs --list --nodeps --output NAME,SIZE --noheadings',out:''};
		//commands.controller = {cmd:'/usr/sbin/lshw -quiet -xml',out:''};
		commands.topo = {cmd:'lstopo -v --output-format xml',out:''}
		commands.bonds = {cmd:'cat /sys/class/net/bonding_masters',out:''};
		commands.bonds =
		//commands.usbcontroller = {cmd:'',out:''};
		//map disk to scsi or usb controller
		//NO need for Linux - part of lstopo output from above
		//commands.diskmap = {cmd:'',out:''}; //Look for "Dependent"
		//commands.usbmap = {cmd:'',out:''}; //Look for "Dependent"
		commands.memory = {cmd:'cat /proc/meminfo',out:''};
		//commands.membank = {cmd:'free -b',out:''};
		
		commands.nic = {cmd:'/sbin/ip -o addr',out:''};//No need for Linux - part of lstopo
		commands.pnic = {cmd:'for int in `ls /sys/class/net`; do /sbin/ethtool $int; done',out:''};
		//commands.partition = {cmd:'',out:''};
		commands.ldisk = {cmd:'/bin/lsblk --ascii --include 8 --include 253 --bytes --fs --nodeps -s --output MOUNTPOINT,NAME,KNAME,UUID,SIZE,FSTYPE,TYPE,MAJ:MIN --raw',out:''};
		commands.pdisk = {cmd:'/bin/lsblk --ascii --include 8 --include 253 --bytes --nodeps --output NAME,KNAME,SIZE,TYPE,MAJ:MIN --raw',out:''};
		commands.lvs = {cmd:'/sbin/lvs -o lv_name,vg_name,vg_size,lv_size,lv_uuid,vg_uuid,lv_kernel_major,lv_kernel_minor --units b --nosuffix --separator ::',out:''};
		commands.vgs = {cmd:'/sbin/vgs -o vg_name,vg_size,vg_uuid --units b --nosuffix --separator ::',out:''};
		commands.pvs = {cmd:'/sbin/pvs -o pv_name,vg_name,pv_size,pv_uuid,vg_uuid --units b --nosuffix --separator ::',out:''};
		commands.partitions = {cmd:'/bin/lsblk --ascii --include 8 --bytes --output NAME,KNAME,SIZE,TYPE,MAJ:MIN --raw | grep -v lvm',out:''};
		//commands.netstat = {cmd:'/bin/netstat -npt -A inet --listening',out:''};
		//commands.mem = {cmd:'/usr/sbin/smem -H -c "pid pss"',out:''};
		
		
		
		process.on('SIGINT',function(){
			console.log("about to exit");
			//writeOut(rawData);
			//hwmon.kill('SIGINT');
			fs.writeFileSync('/proc/sys/vm/block_dump','0');
			
			for (var traceCommand in traceCmds) {
				traceCmds[traceCommand].proc.kill('SIGINT');
			}
			process.exit();
			
			
			
			//db.shutdown(function(){console.log("Shutting down database connection")})
		})
		
		var env = {env:{"COLUMNS":"200"}};
		break;
	default:
		console.log('Unknown operating system, exiting');
		process.exit();
		break;
}

var cnt = 0;
var cmdCount = Object.keys(commands).length;
function run(command){
	//exec(commands[command].cmd,{env:{"COLUMNS":"200"}},function(err,stdout,stderr){
	exec(commands[command].cmd,env,function(err,stdout,stderr){
		if(err){/*console.log("Command Failed: ",command," Error: ",err);*/commands[command].out = ''}
		else{commands[command].out=stdout;}
		cnt++;
		if(cnt == cmdCount){//All commands have finished, parse, assemble and write out
			parseOut();
			assemble();
			status.configReady = true;
			cnt = 0;
			console.log('Config Ready');
			eventEmitter.emit('configReady');
			setTimeout(runConfig,configInterval);
		}
		
	})
}

function runConfig(){
	for (var command in commands){
		run(command);
	}
}

runConfig();

eventEmitter.once('configReady',function(){
	
	//debugger;
	
	if (!status.traceRunning) {//If there is no running trace, run once
		runTrace();
		
		
		status.traceRunning = true;
	}
	else{
		console.log("Trace already running somehow, can't run another..")
	}
})

function parseOut(){
	switch (os.type()){
		case "Linux":
			var xml2js = require('xml2js');
			var parser = new xml2js.Parser({mergeAttrs:true,explicitArray:false});
			parser.parseString(commands.topo.out,function(err,result){commands.topo.out = result;
					   //debugger;
					   parseOutLinux();
				})
			break;
		default:
			console.log('Unknown operating system, exiting');
			process.exit();
			break;
	}
}

function assemble(){
	switch (os.type()){
		case "Linux":
			assembleLinux();
			break;
		default:
			console.log('Unknown operating system, exiting');
			process.exit();
			break;
	}
}

function parseOutLinux(){
	var out;
	for (var command in commands){
	if(commands[command].out == ''){console.log("EMPTY, command: ",command)}
	switch(command){
		case "controller":
			commands[command].res = {};
			parseLshw(commands[command].out,commands[command].res);
			out = commands[command].res;
			break;
		case "bonds":
			var arr = commands[command].out.split(/\s/);
			out = [];
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				out.push(arr[i]);
			}
			break;
		case "memory":
			var arr = commands[command].out.replace(/ kB/g,'').split('\n');
			out = {};
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				arr[i] = arr[i].split(/:\s{3,}/);
				//if (arr[i][0] == 'Node'){columns = arr[i];continue;};
				//var o ={};
				out[arr[i][0]]=arr[i][1]
			}
			
			break;
		case "topo":
			commands[command].res = {};
			parseLstopo(commands[command].out,commands[command].res);
			out = commands[command].res;
			break;
		case "cpu":
			var arr = commands[command].out.replace(/\(/g,'').replace(/\)/g,'').replace(/\:/g,'').split('\n');
			//var columns = [];
			out = {};
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				arr[i] = arr[i].split(/\s{3,}/);
				//if (arr[i][0] == 'Node'){columns = arr[i];continue;};
				//var o ={};
				out[arr[i][0]]=arr[i][1]
				//for (var z=0;z<columns.length;z++){
				//	o[columns[z]]=arr[i][z];
				//};
				//out.push(o);
			}
			break;
		case "nic":
			var arr = commands[command].out.replace(/\\/g,'').split('\n');
			//var columns = [];
			out = {};
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				
				arr[i] = arr[i].split(/\s{1,}/);
				//if (arr[i][0] == 'Node'){columns = arr[i];continue;};
				arr[i][1] = arr[i][1].replace(/\:/g,'')//Remove a fucking colon from the interface name
				if(!out[arr[i][1]]){out[arr[i][1]] = new Object();}//Create a leaf for the interface
				for(var z = 0;z<arr[i].length;z++){//Parse the output
					if(arr[i][z] == 'link/ether'){out[arr[i][1]].mac = arr[i][z+1]}//Mac address
					if(arr[i][z] == 'inet'){out[arr[i][1]].ip = arr[i][z+1].split('/')[0];//IP address
								out[arr[i][1]].mask = arr[i][z+1].split('/')[1];//Mask bits
					}
					if(arr[i][z] == 'state'){out[arr[i][1]].state = arr[i][z+1]}//State
					if(arr[i][z].indexOf('LOOPBACK') != -1){out[arr[i][1]].loopback = true}//Loopback
					if(arr[i][z].indexOf('MASTER') != -1){out[arr[i][1]].master = true}//Master
					if(arr[i][z].indexOf('SLAVE') != -1){out[arr[i][1]].slave = true}//Slave
					if(arr[i][z] == 'master'){out[arr[i][1]].master = arr[i][z+1]//Bonding master. This Interface is slave.
						if(!out[arr[i][z+1]]){out[arr[i][z+1]] = new Object()};
						if(!out[arr[i][z+1]].slaves){out[arr[i][z+1]].slaves = new Array()}
						out[arr[i][z+1]].slaves.push(arr[i][1])
					}
				}
			}
			break;
		case "pnic":
			var arr = commands[command].out.replace(/\t/g,'').toLowerCase().split('\n');
			//var columns = [];
			out = {};
			var iface = ''
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				if(arr[i]=='no data available')continue;
				if(arr[i].indexOf('settings for')!= -1){//Interface name
					if(arr[i+1]=='no data available'){continue;}//If next line has this, that is a bogus file. Likely 'bonding_masters'
					else{
						iface = arr[i].replace('settings for ','').replace(':','');
						if(!out[iface]){out[iface] = new Object()}
					}
				}
				if(arr[i].indexOf('speed:') == 0){var pair = arr[i].split(': ');out[iface][pair[0]] = pair[1]};//Speed
				if(arr[i].indexOf('duplex:') == 0){var pair = arr[i].split(': ');out[iface][pair[0]] = pair[1]};//Duplex
				if(arr[i].indexOf('port:') == 0){var pair = arr[i].split(': ');out[iface][pair[0]] = pair[1]};//Port
				if(arr[i].indexOf('auto-negotiation:')== 0){var pair = arr[i].split(': ');out[iface][pair[0]] = pair[1]};//Autoneg
				if(arr[i].indexOf('link detected:') == 0){var pair = arr[i].split(': ');out[iface]['link'] = pair[1]};//Link
			}
			break;
		case "ldisk":
			//var arr = commands[command].out.replace(/&amp;/g,'&').replace(/\r/g,'').replace(/",",/g,'",').split('\n');
			var arr = commands[command].out.split('\n');
			var columns = [];
			out = [];
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				arr[i] = arr[i].split(/\s+/);
				if (arr[i][0] == 'MOUNTPOINT'){columns = arr[i];continue;};
				if (arr[i][0] == ''){continue;};//No FS, continue
				var o ={};
				for (var z=0;z<columns.length;z++){
					if(columns[z].indexOf(':')!=-1){
						var col = columns[z].split(':');//FUCKING FIX THIS!!! SPLIT MAJ:MIN INTO TWO FIELDS!
						columns.splice(z,1,col[0],col[1])
					}
					//debugger;
					if(arr[i][z].indexOf(':')!=-1){
						//var maj = columns[z].split(':');//FUCKING FIX THIS!!! SPLIT MAJ:MIN INTO TWO FIELDS!
						var col = arr[i][z].split(':');
						arr[i].splice(z,1,col[0],col[1])
					}
					o[columns[z]]=arr[i][z];
				};
				//debugger;
				out.push(o);
			}
			break;
		case "pdisk":
			//var arr = commands[command].out.replace(/&amp;/g,'&').replace(/\r/g,'').replace(/",",/g,'",').split('\n');
			var arr = commands[command].out.split('\n');
			var columns = [];
			out = [];
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				arr[i] = arr[i].split(/\s+/);
				if (arr[i][0] == 'NAME'){columns = arr[i];continue;};
				var o ={};
				for (var z=0;z<columns.length;z++){
					if(columns[z].indexOf(':')!=-1){
						var col = columns[z].split(':');//FUCKING FIX THIS!!! SPLIT MAJ:MIN INTO TWO FIELDS!
						columns.splice(z,1,col[0],col[1])
					}
					if(arr[i][z].indexOf(':')!=-1){
						//var maj = columns[z].split(':');//FUCKING FIX THIS!!! SPLIT MAJ:MIN INTO TWO FIELDS!
						var col = arr[i][z].split(':');
						arr[i].splice(z,1,col[0],col[1])
					}
					o[columns[z]]=arr[i][z];
				};
				//debugger;
				out.push(o);
			}
			break;
		case "partitions":
			//var arr = commands[command].out.replace(/&amp;/g,'&').replace(/\r/g,'').replace(/",",/g,'",').split('\n');
			var arr = commands[command].out.split('\n');
			var columns = [];
			out = [];
			var disk = 'none';
			var len = 0;
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				arr[i] = arr[i].split(/\s+/);
				if (arr[i][0] == 'NAME'){columns = arr[i];continue;};
				var o ={};
				for (var z=0;z<columns.length;z++){
					if(columns[z].indexOf(':')!=-1){
						var col = columns[z].split(':');//FUCKING FIX THIS!!! SPLIT MAJ:MIN INTO TWO FIELDS!
						columns.splice(z,1,col[0],col[1])
					}
					if(arr[i][z].indexOf(':')!=-1){
						//var maj = columns[z].split(':');//FUCKING FIX THIS!!! SPLIT MAJ:MIN INTO TWO FIELDS!
						var col = arr[i][z].split(':');
						arr[i].splice(z,1,col[0],col[1])
					}
					o[columns[z]]=arr[i][z];
				};
				if(o.TYPE == 'disk'){//If this is a disk entry
					disk = o.KNAME;//Remember disk name
					len = out.push(o);//Remember its position in the array
				}
				else if(o.TYPE == 'part'){//If this is a partition
					if(o.KNAME.indexOf(disk)!=-1){//And its name is like disk name
						if(!out[len-1].slaves){out[len-1].slaves = new Array();}//Create a disk slave entry if it's not there
						out[len-1].slaves.push(o); 
					}
				}
			}
			break;
		case "lvs":
			var arr = commands[command].out.split('\n');
			var columns = [];
			out = [];
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				arr[i]=arr[i].replace(/^\s+/,'');//trim leading spaces - who writes output like this?
				arr[i] = arr[i].split('::');
				if (arr[i][0] == 'LV'){columns = arr[i];continue;};
				var o ={};
				for (var z=0;z<columns.length;z++){
					o[columns[z]]=arr[i][z];
				};
				//debugger;
				out.push(o);
			}
			break;
		case "vgs":
			var arr = commands[command].out.split('\n');
			var columns = [];
			out = [];
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				arr[i]=arr[i].replace(/^\s+/,'');//trim leading spaces - who writes output like this?
				arr[i] = arr[i].split('::');
				if (arr[i][0] == 'VG'){columns = arr[i];continue;};
				var o ={};
				for (var z=0;z<columns.length;z++){
					o[columns[z]]=arr[i][z];
				};
				//debugger;
				out.push(o);
			}
			break;
		case "pvs":
			var arr = commands[command].out.split('\n');
			var columns = [];
			out = [];
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				arr[i]=arr[i].replace(/^\s+/,'');//trim leading spaces - who writes output like this?
				arr[i] = arr[i].split('::');
				if (arr[i][0] == 'PV'){columns = arr[i];continue;};
				var o ={};
				for (var z=0;z<columns.length;z++){
					o[columns[z]]=arr[i][z];
				};
				//debugger;
				out.push(o);
			}
			break;
		case "mem":
			//debugger;
			var arr = commands[command].out.split('\n');
			//var columns = [];
			out = [];
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				arr[i]=arr[i].replace(/^\s+/,'').replace(/\s+$/,'');//trim leading spaces - who writes output like this?
				arr[i] = arr[i].split(/\s+/);
				//if (arr[i][0] == 'PV'){columns = arr[i];continue;};
				var o ={'pid':arr[i][0],'pss':arr[i][1]};
				//debugger;
				out.push(o);
			}
			break;
		case "netstat":
			var arr = commands[command].out.toLowerCase().split('\n');
			var columns = [];
			out = {};
			for (var i=0;i<arr.length;i++){
				if(arr[i]=='')continue;
				if(arr[i].search(/^proto/)!=-1)continue;
				if(arr[i].indexOf('active internet')!=-1)continue;//Columns:Proto Recv-Q Send-Q Local Address Foreign Address State PID/Program name
				columns = ['proto','rq','sq','laddr','raddr','state','pid']
				arr[i] = arr[i].split(/\s+/);
				//if (arr[i][0] == 'Node'){columns = arr[i];continue;};
				var o ={};
				//out[arr[i][0]]=arr[i][1]
				var addr = arr[i][3].split(':')[0];
				var port = arr[i][3].split(':')[1];
				var pid = arr[i][6].split('/')[0];
				var proc = arr[i][6].split('/')[1];
				if(!out[addr]){out[addr] = {}}
				if(!out[addr][port]){out[addr][port] = {}}
				out[addr][port].pid = pid;
				out[addr][port].proc = proc;
				
				//for (var z=0;z<columns.length;z++){
				//	if(arr[i][z] == '')continue; 
				//	o[columns[z]]=arr[i][z];
				//};
				//out.push(o);
			}
			//debugger;
			break;
	}
	commands[command].res = out;
	}
	return out;
}

function assembleLinux(){
	//Serial number
	machineConfig.__config__ = new Object();
	machineConfig.__config__.version = 0;
	machineConfig.__config__.uuid = commands.topo.res.node.__config__.dmiproductuuid;
	machineConfig.__config__.hostname = commands.topo.res.node.__config__.hostname; // os.hostname();
	machineConfig.__config__.platform = os.arch();
	machineConfig.__config__.release = os.release();
	machineConfig.__config__.os = os.type();
	machineConfig.template = 'client';//Need to determine dynamically here if it's a server or a client;
	machineConfig.vector = 1;//Need to determine dynamically here if it's a server or a client;
	
	//Unique persistent HTML ID: grab part of HOST UUID
	var uuid = 'id_'+machineConfig.__config__.uuid.toLowerCase().split('-')[0];
	
	machineConfig.id = uuid;
	
	//Hardware:
	machineConfig.cpus = cc();
	//debugger;
	machineConfig.ram = mb();
	//debugger;
	machineConfig.nics = nn();
	//debugger;
	//machineConfig.vnics = vnn();
	//debugger;
	machineConfig.raids = pd();
	//debugger;
	
	machineConfig.vols = ld()
	//debugger;

	machineConfig.controllers = cr();
	//debugger;
	ids = [];
	addId(machineConfig,uuid);
	
	debugger;

	function cc(){//CPU Configuration
		var o = new Object();
		o.template = 'componentContainer';
		o.type = 'cpus'
		o.__config__ = {}
		var numSockets = parseInt(commands.cpu.res.Sockets)
		if(numSockets != commands.topo.res.sockets.length){console.log("Number of sockets doesn't match");return o;}
		var procNum = 0;
		for (var x=0;x<numSockets;x++){
			o['cpu'+x] = new Object();
			o['cpu'+x].__config__ = new Object();
			for(var a in commands.cpu.res){
				o['cpu'+x].__config__[a] = commands.cpu.res[a];
			}
			o['cpu'+x].__config__.desc = commands.topo.res.sockets[x].cpuset;
			o['cpu'+x].__config__.socket = commands.topo.res.sockets[x].os_index
			o['cpu'+x].template = 'cpu';
			var numCores = parseInt(commands.cpu.res['Cores per socket']);
			
			for (var y = 0;y<numCores;y++){
				o['cpu'+x]['cpuCore'+procNum] = {'template':'cpuCore','desc':'CPU Core '+y}
				o['cpu'+x]['cpuCore'+procNum].__config__ = {'model':commands.topo.res.sockets[x].cpuset,
									'freq':(parseFloat(commands.cpu.res['CPU MHz'])*1000000),'processor':procNum}
				procNum++;
			}
		}
		//addId(o,uuid);
		return o;
	}
	function mb(){//Physical Memory - Mem Banks
		var o = new Object();
		o.template = 'componentContainer';
		o.type = 'ram'
		o.__config__ = commands.memory.res;
		var cap = parseInt(commands.memory.res.MemTotal)*1024;//In bytes
		//o.membank1 = new Object();
		//for (var x=0;x<commands.controller.res.memory[0].node.length;x++){
			//Combine the membanks into one, keep separate items in __config__
			if(!o['membank1']){o['membank1'] = new Object();}
			o['membank1'].template = 'ram';
			if(!o['membank1'].__config__){o['membank1'].__config__ = new Object();}
			//if(!commands.controller.res.memory[0].node[x].size){continue;}
			o['membank1'].__config__.size = cap;//parseInt(commands.memory.res.MemTotal)*1024;
			
			//cap = o['membank1'].__config__.size;
			o['membank1'].cap = o['membank1'].__config__.size/1024/1024;//Size in MB for MAP
			//o['membank1'].desc = commands.membank.res[x].BankLabel;
			o['membank1'].desc = 'Physical Memory';
			
			//o['membank1'].__config__['membank'+x] = new Object();
			//o['membank1'].__config__['membank'+x] = {'cap':parseInt(commands.controller.res.memory[0].node[x].size._),'desc':commands.controller.res.memory[0].node[x].description};
			//debugger;
		//}
		//addId(o,uuid);
		return o;
	}
	function nn(){//Physical Network Interfaces
		var o = new Object();
		o.template = 'componentContainer';
		o.type = 'nics'
		o.__config__ = {}
		var totalBw = 0; //Calculate total BW of the machine - for example to determine total iSCSI BW
		var i = os.networkInterfaces();
		var nics = commands.nic.res;
		var pnics = commands.pnic.res;
		if(Object.keys(nics).length != Object.keys(pnics).length){console.log("Number of physical NICs doesn't match");return o;}
		var x = 0;
		for (var iface in nics){
			if (nics[iface].loopback){continue}//Determine if it's a loopback
			if (iface.indexOf('virbr')==0){continue}//Determine if it's a virtual NIC
			if (nics[iface].slave == true){continue;}
			if (nics[iface].master == true){//Determine if it's a bonded interface
				var bondSpeed = 0;
				o[iface] = new Object();
				o[iface].__config__ = new Object();
				o[iface].template = 'bond';
				o[iface].__config__.devName = iface;
				o[iface].__config__.slaves = nics[iface].slaves;
				o[iface].__config__.mac = nics[iface].mac;
				o[iface].__config__.ips = i[iface];
				o[iface].__config__.ip = nics[iface].ip;//MAIN IP
				o[iface].__config__.mask = nics[iface].mask;//MAIN IP MASK BITS
				//Separate virtual and physical
				o[iface].__config__.virtual = 'false'
				o[iface].__config__.link = pnics[iface].link;
				o[iface].__config__.state = nics[iface].state;
				//o[iface].slaves = new Object();
				if(nics[iface].slaves) {
					for(var a = 0;a < nics[iface].slaves.length;a++){
						var slave = nics[iface].slaves[a];
						//debugger;
						
						o[iface][slave] = new Object();
						o[iface][slave].__config__ = new Object();
						o[iface][slave].template = 'nic';
						o[iface][slave].__config__.devName = slave;
						for(var b = 0;b<commands.topo.res.network.length;b++){
							for(var c = 0;c<commands.topo.res.network[b].slaves.length;c++){
								if(commands.topo.res.network[b].slaves[c].name == slave){
									o[iface][slave].__config__.vendor = commands.topo.res.network[b].__config__.pcivendor;
									o[iface][slave].__config__.product = commands.topo.res.network[b].__config__.pcidevice;
								}
							}
						}
						var speed = parseInt(pnics[slave].speed)*1000000;
						if(isNaN(speed)){speed = 1000000000}  //1Gbit/sec
						//o[iface][slave].__config__.speed = parseInt(pnics[slave].speed)*1000000;totalBw=totalBw+o[iface][slave].__config__.speed;
						o[iface][slave].__config__.speed = speed;totalBw=totalBw+o[iface][slave].__config__.speed;bondSpeed=bondSpeed+o[iface][slave].__config__.speed
						o[iface][slave].__config__.speedReadable = pnics[slave].speed
						o[iface][slave].__config__.mac = nics[slave].mac;
						//o[iface][slave].__config__.ips = i[slave];
						//Separate virtual and physical
						o[iface][slave].__config__.virtual = 'false'
						o[iface][slave].__config__.link = pnics[slave].link;
						o[iface][slave].__config__.state = nics[slave].state;
						o[iface][slave].bw = o[iface][slave].__config__.speed/10000000 
					}
				}
				o[iface].__config__.speed = bondSpeed;
				x++;
				continue;
			}
			o[iface] = new Object();
			o[iface].__config__ = new Object();
			o[iface].template = 'nic';
			o[iface].__config__.devName = iface;
			
			if(commands.topo.res.network) {
				for(var b = 0;b<commands.topo.res.network.length;b++){
					for(var c = 0;c<commands.topo.res.network[b].slaves.length;c++){
						if(commands.topo.res.network[b].slaves[c].name == iface){
							o[iface].__config__.vendor = commands.topo.res.network[b].__config__.pcivendor;
							o[iface].__config__.product = commands.topo.res.network[b].__config__.pcidevice;
						}
					}
				}
			}
			//commands.topo.res.network.forEach(function(el,i,arr){el.slaves.forEach(function(e,id,ar){if(e.name == 'eth3'){console.log(e.__config__.address)}})})
			var speed = parseInt(pnics[iface].speed)*1000000;
			if(isNaN(speed)){speed = 1000000000}
			//o[iface].__config__.speed = parseInt(pnics[iface].speed)*1000000;totalBw=totalBw+o[iface].__config__.speed;
			o[iface].__config__.speed = speed;totalBw=totalBw+o[iface].__config__.speed;
			o[iface].__config__.speedReadable = pnics[iface].speed
			o[iface].__config__.mac = nics[iface].mac;
			o[iface].__config__.ips = i[iface];
			o[iface].__config__.ip = nics[iface].ip;//MAIN IP
			o[iface].__config__.mask = nics[iface].mask;//MAIN IP MASK BITS
			//Separate virtual and physical
			o[iface].__config__.virtual = 'false'
			o[iface].__config__.link = pnics[iface].link;
			o[iface].__config__.state = nics[iface].state;
			o[iface].bw = o[iface].__config__.speed/10000000 //This is a manual adjustment for map builder consumption. Divide by ten million
			//debugger;
			x++;
			
		}
		
		o.__config__.speed = totalBw;
		//addId(o,uuid);
		return o;
	}
	function vnn(){//Virtual Network Interfaces
		var o = new Object();
		o.template = 'componentContainer';
		o.type = 'vnics'
		o.__config__ = {}
		var totalBw = 0; //Calculate total BW of the machine - for example to determine total iSCSI BW
		var i = os.networkInterfaces();
		for (var x=0;x<commands.nic.res.length;x++){
			if(commands.nic.res[x].PNPDeviceID.search(/^ROOT/) == -1){continue;}//Physical NIC
			o['nic'+x] = new Object();
			o['nic'+x].__config__ = new Object();
			o['nic'+x].template = 'vnic';
			o['nic'+x].__config__.nicType = commands.nic.res[x].AdapterType;
			o['nic'+x].__config__.devName = commands.nic.res[x].Name;
			o['nic'+x].__config__.connName = commands.nic.res[x].NetConnectionID;
			o['nic'+x].__config__.speed = parseInt(commands.nic.res[x].Speed);totalBw=totalBw+o['nic'+x].__config__.speed;
			o['nic'+x].__config__.speedReadable = o['nic'+x].__config__.speed/1000000 + 'Mb/s'
			o['nic'+x].desc = commands.nic.res[x].Description;
			o['nic'+x].__config__.mac = commands.nic.res[x].MACAddress;
			o['nic'+x].__config__.nicIndex = commands.nic.res[x].Index;
			o['nic'+x].__config__.deviceId = commands.nic.res[x].PNPDeviceID;
			o['nic'+x].__config__.ips = i[o['nic'+x].__config__.connName];
			//Separate virtual and physical
			o['nic'+x].__config__.virtual = 'true'
			//if(o['nic'+x].__config__.deviceId.search(/^ROOT/) != -1){
			//	o['nic'+x].__config__.virtual = 'true';
			//	totalBw=totalBw-o['nic'+x].__config__.speed; //Since this is a virtual NIC, doesn't count towards total machine BW
			//	o['nic'+x].template = 'vnic';
			//}
			o['nic'+x].bw = o['nic'+x].__config__.speed/10000000 //This is a manual adjustment for map builder consumption. Divide by ten million
			//debugger;
		}
		o.__config__.speed = totalBw;
		//addId(o,uuid);
		return o;
	}
	function ld(){//Logical Disks - C: or D:... In Linux - mounts like /var
		var o = new Object();
		o.template = 'componentContainer';
		o.type = 'vols';
		o.__config__ = {};
		o.vols = {};
		o.vols.template = 'vols';
		o.vols.__config__ = new Object();
		o.vols.__config__.size = commands.ldisk.res.reduce(function(a,b){return a + parseInt(b.SIZE)},0)
		o.vols.cap = o.vols.__config__.size/1000000;//Capacity for MAP in Megabytes
		for (var x=0;x<commands.ldisk.res.length;x++){
			
			if(commands.ldisk.res[x].TYPE == 'lvm'){//Handle LVM. Find owner VG and wrap the LV in it
				var vg = '',lv;
				for(var l = 0;l < commands.lvs.res.length;l++){
					if(commands.lvs.res[l].KMaj == commands.ldisk.res[x].MAJ && commands.lvs.res[l].KMin == commands.ldisk.res[x].MIN){
						vg = commands.lvs.res[l].VG;
						lv = commands.lvs.res[l];continue;
					}
				}
				//debugger;
				if(!o.vols[vg]){//Create VG Entry
					o.vols[vg] = new Object();
					o.vols[vg].template = 'vg';
					o.vols[vg].__config__ = new Object();
					o.vols[vg].__config__.size = parseInt(lv.VSize);
					o.vols[vg].cap = o.vols[vg].__config__.size/1000000;//Capacity for MAP in Megabytes
					o.vols[vg].__config__.uuid = lv['VG UUID']
					o.vols[vg].__config__.type = 'lvm';
				};
				if(!o.vols[vg].__config__.dst){//Create a listing of SOURCE and DESTINATION devices (i.e. PVs)
					o.vols[vg].__config__.dst = new Object();
					for(var p = 0;p < commands.pvs.res.length; p++){
						if(commands.pvs.res[p].VG == vg){
							var pv = commands.pvs.res[p].PV.replace('/dev/','');
							o.vols[vg].__config__.dst[pv] = new Object();
							o.vols[vg].__config__.dst[pv] = commands.pvs.res[p];
							o.vols[vg].__config__.dst[pv].name = pv;
							o.vols[vg].__config__.dst[pv].kname = pv;
						}
					}
				}
				//var vol = commands.ldisk.res[x].KNAME;
				var vol = commands.ldisk.res[x].MOUNTPOINT;
				o.vols[vg][vol] = new Object();
				o.vols[vg][vol].template = 'vol';
				o.vols[vg][vol].__config__ = new Object();
				o.vols[vg][vol].template = 'vol';
				o.vols[vg][vol].__config__.size = parseInt(commands.ldisk.res[x].SIZE);
				o.vols[vg][vol].cap = o.vols[vg][vol].__config__.size/1000000;//Capacity for MAP in Megabytes
				//o.vols[vg][vol].desc = commands.ldisk.res[x].Description;
				o.vols[vg][vol].__config__.fs = commands.ldisk.res[x].FSTYPE;
				//o.vols[vg][vol].free = commands.ldisk.res[x].FreeSpace;
				o.vols[vg][vol].__config__.volname = commands.ldisk.res[x].MOUNTPOINT;
				o.vols[vg][vol].__config__.serial = commands.ldisk.res[x].UUID;
				//o.vols[vg][vol].__config__.path = commands.ldisk.res[x].DeviceID;
				o.vols[vg][vol].__config__.device = commands.ldisk.res[x].NAME;
				o.vols[vg][vol].__config__.kdevice = commands.ldisk.res[x].KNAME;//Kernel Name
				o.vols[vg][vol].__config__.type = commands.ldisk.res[x].TYPE;
				o.vols[vg][vol].__config__.kmaj = commands.ldisk.res[x].MAJ;
				o.vols[vg][vol].__config__.kmin = commands.ldisk.res[x].MIN;
				continue;//Done handling LVM, move to the next
			}
			//Handle regular volumes
			var vol = commands.ldisk.res[x].MOUNTPOINT;
			o.vols[vol] = new Object();
			o.vols[vol].__config__ = new Object();
			o.vols[vol].template = 'vol';
			o.vols[vol].__config__.size = parseInt(commands.ldisk.res[x].SIZE);
			o.vols[vol].cap = o.vols[vol].__config__.size/1000000;;//Capacity for MAP in Megabytes
			//o.vols[vol].desc = commands.ldisk.res[x].Description;
			o.vols[vol].__config__.fs = commands.ldisk.res[x].FSTYPE;
			//o.vols[vol].free = commands.ldisk.res[x].FreeSpace;
			o.vols[vol].__config__.volname = commands.ldisk.res[x].MOUNTPOINT;
			o.vols[vol].__config__.serial = commands.ldisk.res[x].UUID;
			//o.vols[vol].__config__.path = commands.ldisk.res[x].DeviceID;
			o.vols[vol].__config__.device = commands.ldisk.res[x].NAME;
			o.vols[vol].__config__.kdevice = commands.ldisk.res[x].KNAME;//Kernel Name
			o.vols[vol].__config__.type = commands.ldisk.res[x].TYPE;
			o.vols[vol].__config__.kmaj = commands.ldisk.res[x].MAJ;
			o.vols[vol].__config__.kmin = commands.ldisk.res[x].MIN;
			
			//List destination drive(s):
			o.vols[vol].__config__.dst = new Object();
			for (var p = 0; p < commands.partitions.res.length; p++){
				if (commands.partitions.res[p].KNAME == o.vols[vol].__config__.kdevice){
					var dsk = commands.partitions.res[p].KNAME;
					o.vols[vol].__config__.dst[dsk] = new Object();
					o.vols[vol].__config__.dst[dsk] = commands.partitions.res[p];
					o.vols[vol].__config__.dst[dsk].name = dsk;
					o.vols[vol].__config__.dst[dsk].kname = dsk;
					//And... update the pd section - machineConfig.raids.raids
					//if(!machineConfig.raids.raids[dsk].src){machineConfig.raids.raids[dsk].src = new Object();}
					//machineConfig.raids.raids[dsk].src[vol] = new Object();
					//machineConfig.raids.raids[dsk].src[vol].__config__ = new Object();
					//machineConfig.raids.raids[dsk].src[vol] = o.vols[vol].__config__;
					continue;
				}
				else if (commands.partitions.res[p].slaves && commands.partitions.res[p].slaves.length > 0){
					for(var s = 0; s < commands.partitions.res[p].slaves.length;s++){
						if(commands.partitions.res[p].slaves[s].KNAME == o.vols[vol].__config__.kdevice){
							var dsk = commands.partitions.res[p].slaves[s].KNAME;
							o.vols[vol].__config__.dst[dsk] = new Object();
							o.vols[vol].__config__.dst[dsk] = commands.partitions.res[p].slaves[s];
							o.vols[vol].__config__.dst[dsk].name = dsk;
							o.vols[vol].__config__.dst[dsk].kname = dsk;
							//if(!machineConfig.raids.raids[dsk].src){machineConfig.raids.raids[dsk].src = new Object();}
							//machineConfig.raids.raids[dsk].src[vol] = new Object();
							//machineConfig.raids.raids[dsk].src[vol].__config__ = new Object();
							//machineConfig.raids.raids[dsk].src[vol] = o.vols[vol].__config__;
						}
					}
				}
			}
		}
		//addId(o,uuid);
		return o;
	}
	function pd(){//Physical disks - individual drives or LUNs
		var o = new Object();
		o.template = 'componentContainer';
		o.type = 'raids';
		o.__config__ = {};
		o.raids = {};
		o.raids.template = 'raids';
		o.raids.__config__ = new Object();
		o.raids.__config__.size = commands.partitions.res.reduce(function(a,b){return a + parseInt(b.SIZE)},0)
		o.raids.cap = o.raids.__config__.size/1000000;//Capacity for MAP in Megabytes
		//var dm = commands.diskmap.res.concat(commands.usbmap.res)
		//var cr = commands.controller.res.concat(commands.usbcontroller.res)
		for (var x=0;x<commands.partitions.res.length;x++){
			//o['membank'+x] = commands.cpu.res[x];
			var disk = commands.partitions.res[x].KNAME;
			//o.raids[lun] = new Object();
			//o.raids[lun].__config__ = new Object();
			//o.raids[lun].template = 'raid';
			//o.raids[lun].__config__.size = parseInt(commands.pdisk.res[x].SIZE);
			//o.raids[lun].cap = o.raids[lun].__config__.size/1000000;//Capacity for MAP in Megabytes
			//o.raids[lun].desc = commands.disk.res[x].Caption;
			//o.raids[lun].__config__.index = commands.disk.res[x].Index;
			//o.raids[lun].__config__.iface = commands.disk.res[x].InterfaceType;
			//o.raids[lun].__config__.deviceId = commands.disk.res[x].PNPDeviceID;
			//o.raids[lun].__config__.scsibus = commands.disk.res[x].SCSIBus;
			//o.raids[lun].__config__.scsilun = commands.disk.res[x].SCSILogicalUnit;
			//o.raids[lun].__config__.scsiport = commands.disk.res[x].SCSIPort;
			//o.raids[lun].__config__.scsitarget = commands.disk.res[x].SCSITargetId;
			
			//Insert RAID logic and loop here. Meanwhile - a single disk;
			o.raids[disk] = new Object();
			o.raids[disk].__config__ = new Object();
			o.raids[disk].template = 'disk';
			o.raids[disk].__config__.size = parseInt(commands.partitions.res[x].SIZE);
			o.raids[disk].cap = o.raids[disk].__config__.size/1000000;//Capacity for MAP in Megabytes
			//o.raids[disk].desc = commands.disk.res[x].Caption;
			//o.raids[disk].__config__ = o.raids[lun].__config__
			//var z = 0;
			//for (var y = 0; y < commands.partition.res.length; y++){
			//	if(commands.partition.res[y].DiskIndex == o.raids[disk].__config__.index){
			//		o.raids[disk].__config__['partition'+z] = new Object();
			//		o.raids[disk].__config__['partition'+z].desc = commands.partition.res[y].Caption;
			//		o.raids[disk].__config__['partition'+z].index = commands.partition.res[y].Index;
			//		o.raids[disk].__config__['partition'+z].size = parseInt(commands.partition.res[y].Size);
			//		o.raids[disk].__config__['partition'+z].offset = parseInt(commands.partition.res[y].StartingOffset);
			//	}
			//}
			//var z = 0;
			if(commands.partitions.res[x].slaves && commands.partitions.res[x].slaves.length > 0){//Handle partitions
				//o.raids[disk].parts = new Object();
				//o.raids[disk].parts.__config__ = new Object();
				//o.raids[disk].parts.__config__.size = commands.partitions.res[x].slaves.reduce(function(a,b){return a + parseInt(b.SIZE)},0);
				//o.raids[disk].parts.cap = o.raids[disk].parts.__config__.size/1000000;
				for(var y = 0; y < commands.partitions.res[x].slaves.length; y++){
					var part = commands.partitions.res[x].slaves[y].KNAME;
					o.raids[disk][part] = new Object();
					o.raids[disk][part].__config__ = new Object();
					o.raids[disk][part].template = 'partition';
					o.raids[disk][part].__config__.size = parseInt(commands.partitions.res[x].slaves[y].SIZE);
					o.raids[disk][part].cap = o.raids[disk][part].__config__.size/1000000;//Capacity for MAP in Megabytes
					
				}
			}
			
			
		}
		//addId(o,uuid);
		return o;
	}
	function cr(){//SCSI and other Storage Controllers - Internal at this stage
		var o = new Object();
		o.template = 'componentContainer';
		o.type = 'controllers';
		o.__config__ = {};
		var c = commands.topo.res.storage;
		//var dm = commands.diskmap.res.concat(commands.usbmap.res)
		for (var x=0;x<c.length;x++){
			//if(!c[x].slaves)
			o['controller'+x] = new Object();
			o['controller'+x].__config__ = new Object();
			o['controller'+x].template = 'controller';
			o['controller'+x].__config__.name = c[x].__config__.pcidevice;
			o['controller'+x].__config__.vendor = c[x].__config__.pcivendor;
			o['controller'+x].__config__.speed = 3000000000 //3 Gb/s
			o['controller'+x].__config__.deviceId = c[x].pci_busid;
			o['controller'+x].__config__.location = 'internal';
			o['controller'+x].__config__.protocol = 'scsi';
			//if(o['controller'+x].desc.indexOf('iSCSI') != -1){o['controller'+x].__config__.protocol = 'iscsi';o['controller'+x].__config__.speed = machineConfig.nics.__config__.speed;}//iSCSI BW equals total network BW
			//if(o['controller'+x].desc.indexOf('USB') != -1){o['controller'+x].__config__.protocol = 'usb';o['controller'+x].__config__.speed = 300000000}//300 Mb/s
			o['controller'+x].bw = o['controller'+x].__config__.speed/10000000 //This is a manual adjustment for map builder consumption. Divide by ten million
			//Find dependent disks
			if(!c[x].slaves || !c[x].slaves.length){continue;}
			for(var s = 0; s < c[x].slaves.length; s++){
				var dsk = c[x].slaves[s].name;
				var pdIndex = 0;
				if(!commands.pdisk.res.some(function(e,i,a){pdIndex = i;return (e.KNAME == dsk)})){continue;}//If this disk is not listed in our block devices
				if(!o['controller'+x].__config__.disks){o['controller'+x].__config__.disks = new Object();}
				o['controller'+x].__config__.disks[dsk] = new Object();
				o['controller'+x].__config__.disks[dsk] = commands.pdisk.res[pdIndex];
			}
			
			
		}
		//addId(o,uuid);
		return o;
	}

}


function runTrace() {
	/*********************** TRACE *************************/
	//debugger;	
		
	fs.writeFileSync('/proc/sys/vm/block_dump','1');
	
	num_procs = 0;
	
	for (var cpu in machineConfig.cpus){
		if (typeof(machineConfig.cpus[cpu]) == 'object' && machineConfig.cpus[cpu].template && machineConfig.cpus[cpu].template == 'cpu') {
			for (var cpuCore in machineConfig.cpus[cpu]){
				if (typeof(machineConfig.cpus[cpu][cpuCore]) == 'object' && machineConfig.cpus[cpu][cpuCore].template && machineConfig.cpus[cpu][cpuCore].template == 'cpuCore'){
					num_procs++;
				}
			}
		}
	}
	
	//traceCmds.pidstat = {'done':false,'cmd':'/usr/bin/pidstat','args':['-d','-h','-u','-l','-p','ALL',traceInterval,'1'],'out':'','proc':{}}

	//traceCmds.jnettop = {'done':false,'cmd':'/usr/bin/jnettop','args':['-i','any','--display','text','-n','--format','$src$,$srcport$,$dst$,$dstport$,$srcbps$,$dstbps$,$totalbps$','-t',traceInterval,'--filter','tcp'],'out':'','proc':{}}

	//traceCmds.dmesg = {'done':'init','cmd':'/bin/dmesg','args':['-c'],'out':'','proc':{}}
	
	traceCmds.klog = {'done':'init','cmd':'/root/klog','out':'','proc':{}};
	
	for (var a in machineConfig.nics){
		var nic = machineConfig.nics[a]
		if (typeof(nic) === 'object' && nic.template && nic.template == 'nic') {
			if (machineConfig.nics[a].__config__.ip != undefined) {
				traceCmds[a] = {'done':'init','cmd':'/root/sniffex','args':[a],'out':'','proc':{}};
			}
			
		}
	}
	
	for(var traceCommand in traceCmds){
		//debugger;
		runTraceCmds(traceCmds[traceCommand]);
	}
	
	tmp.result.run_count = 0;
	
	//Initialize values
	getSysStats();
	
	
	setInterval(getSysStats,pollInterval);
	setInterval(buildTrace,traceInterval);
	
	
	//debugger;
	
	//traceCmds.netstat = {'done':false,'cmd':'/bin/netstat','args':['-npt','-A', 'inet','-e','-c',pollInterval],'out':'','proc':{}}
}


function runTraceCmds(bin){
    
    //debugger;
    bin.proc = spawn(bin.cmd, bin.args);
    
    //
    
    bin.proc.stdout.setEncoding('utf8');
    
    bin.linereader = rl.createInterface(bin.proc.stdout,bin.proc.stdin);
    
    
    //bin.linereader.on('SIGINT',function(){console.log('Line Reader Got SIGINT')});
    
    bin.linereader.on('line',function(line){
	
	if (line.indexOf('#BEGIN#') != -1) {
		bin.out = '';
	}
	else if (line.indexOf('#END#') != -1) {
		bin.done = true;
		var c = 0;
		for (var cmd in traceCmds){
			if (traceCmds[cmd].done == true) {
				c++;
			}
		}
		if (c == Object.keys(traceCmds).length) {
			eventEmitter.emit('traceCmdDone');
		}
		
	}
	else{
		bin.out = bin.out + line + '\n';
	}
	//debugger;
	//console.log('######################')
	try{
		//debugger;
	}
	catch(err){
	    console.log("Line output/parse error,",err);

	}
    })
     
    bin.proc.stderr.on('data', function (data) {
	//data += '';
	console.log('Command Error. Command: ',bin.proc.cmd,' Error: ',data)
	//console.log(data.replace("n", "nstderr: "));
    });
    
    bin.proc.on('exit', function (code) {
	console.log('Command Exited. Command: ',bin.cmd,'Exit code: ' + code);
	console.log('Restarting command: ',bin.cmd);
	runTraceCmds(bin);
    });
};


function getSysStats() {
	tmp.result.run_count++;
	var proc_dir = new Array();
	var pids = new Array();
	
	var sys_stat = new String();
	
	var sys_netstat = new String();
	
	var sys_uptime = new String();
	
	
	    try {
		    
	    } catch(e) {
		var uptime_err = e;
	    }
	
	    if(!uptime_err){
    
	    }
	
	try {
	    
	    proc_dir = fs.readdirSync(PROC);
	    
	    sys_stat = fs.readFileSync(PROC+'stat',{encoding:"utf8"});
	    
	    sys_netstat = fs.readFileSync(PROC+'net/tcp',{encoding:"utf8"});
	    sys_uptime = fs.readFileSync(PROC+'uptime',{encoding:"utf8"});
	    
	} catch(e) {
	    console.log(e);
	    console.log("Exiting, can't read /proc/...")
	    debugger;
	    return;
	}
	
	for (var a = 0, pl = proc_dir.length;a < pl; a++){
	    if (isNumber(proc_dir[a]) == true) {
		pids.push(parseInt(proc_dir[a]));
		
	    }
	}
	tmp.result.pidlist = pids;

	tmp.result.sys_uptime = parseFloat(sys_uptime.split('\n')[0].split(' ')[0]) * 1000;//In milliseconds
    
    //for (var a = 0, pl = pids.length;a < pl; a++){

        //var z = fs.readdirSync('/proc/'+pids[a]+'/task/');
        //if (z.length > 1) {
        //    console.log('Multi-thread PID: ',a);
        //    console.log('Tasks: ',z)
       // }
    //}
    
    var arr = sys_stat.split('\n')[0].split(/\s+/)
    
    /*Sum the first 7 numbers from this line:
     *cpu  63057 71 9696 68801550 1065 34 3866 0 0 0
     */
    
    var sys_times = 0;
    for(var i = 1;i<8;i++){
        sys_times = sys_times + parseInt(arr[i]);
    };
    
    tmp.result.last_sys_times = tmp.result.sys_times;
    tmp.result.sys_times = sys_times;
    
    //debugger;
    parseNetstat(sys_netstat);
    
    for (var b = 0, pidl = pids.length; b < pidl; b++){
        getProcStats(pids[b]);
    }
    //debugger;
}

function parseNetstat(string){
    var arr = string.split('\n');
    var netstat_cols = ['idx','laddr','raddr','status','tx','rx','tr','retrans','uid','timeo','inode'];
    //Socket status:
    //0A: Listen, 01: ESTABLISHED, 08: CLOSE_WAIT
    //var sockets = {};
    for (var c = 1; c < arr.length; c++){
        if (arr[c] == '') {continue}
        //console.log('LINE:',arr[c])
        var line = arr[c].split(/\s+/);
        var state = line[4];
        if (state != '0A' && state != '01') {//Only listening and established sockets
            //console.log('crap socket, state:',state)
            continue;
        }
        var laddr = line[2].split(':')[0];
        var raddr = line[3].split(':')[0];

        var lport = parseInt(line[2].split(':')[1],16);
        var rport = parseInt(line[3].split(':')[1],16);
        var socket_id = line[10];
	if (!tmp.result.socket_ids) {
		tmp.result.socket_ids = [];
	}
        
        laddr = parseInt(laddr.substr(6,2),16).toString().concat('.',
                                                                parseInt(laddr.substr(4,2),16).toString(),'.',
                                                                parseInt(laddr.substr(2,2),16).toString(),'.',
                                                                parseInt(laddr.substr(0,2),16).toString());
        
        raddr = parseInt(raddr.substr(6,2),16).toString().concat('.',
                                                                parseInt(raddr.substr(4,2),16).toString(),'.',
                                                                parseInt(raddr.substr(2,2),16).toString(),'.',
                                                                parseInt(raddr.substr(0,2),16).toString());
        //console.log('LADDR:',laddr,':',lport,'INODE:',socket_id)
        //console.log('RADDR:',raddr,':',rport,'INODE:',socket_id)
        
	if (state == '0A') {//Listening socket
		if (laddr == '127.0.0.1') {
			continue;
		}
		if (!tmp.result.netstat) {
			tmp.result.netstat = {};
		}
		if (!tmp.result.netstat[laddr]) {
			tmp.result.netstat[laddr] = {};
		}
		if (!tmp.result.netstat[laddr][lport]) {
			tmp.result.netstat[laddr][lport] = {};
		}
		tmp.result.netstat[laddr][lport].socket_id = socket_id;
		if(tmp.result.socket_ids.indexOf(socket_id) == -1){
			tmp.result.socket_ids.push(socket_id);
		}
	}
        if (state == '01') {//Established socket
		if (laddr == '127.0.0.1' && raddr == '127.0.0.1') {
			continue;
		}
		if (!tmp.result.network) {
			tmp.result.network = {};
		}
		if (!tmp.result.network[socket_id]) {
			tmp.result.network[socket_id] = {};
		}
		tmp.result.network[socket_id].local = laddr;
		tmp.result.network[socket_id].remote = raddr;
		tmp.result.network[socket_id].localport = lport;
		tmp.result.network[socket_id].remoteport = rport;
		tmp.result.network[socket_id].bytesSentPerSec = 0;
		tmp.result.network[socket_id].bytesReceivedPerSec = 0;
		if(tmp.result.socket_ids.indexOf(socket_id) == -1){
			tmp.result.socket_ids.push(socket_id);
		}
	}
    }
    //debugger;
}

function getProcStats(pid){
    
    
    //var sys_uptime = new String();
    
    //debugger;
    
    var pid_stat = new String();
    
    var smaps = new String();
    
    var io = new String();
    
    var proc_info = {};
    
    try {
        //sys_uptime = fs.readFileSync(PROC+'uptime',{encoding:"utf8"});
    
        pid_stat = fs.readFileSync(PROC + pid.toString() + '/stat',{encoding:"utf8"});
        
        //smaps = fs.readFileSync(PROC + pid.toString() + '/smaps',{encoding:"utf8"});
        
        
    } catch(e) {
        console.log(e);
        //debugger;
        return;
    }
    
    //var sys_uptime = parseFloat(sys_uptime.split('\n')[0].split(' ')[0]);
    
    
    //PID CPU Times
    var arr = pid_stat.split('\n')[0].split(' ');
    
    for (var i = 0;i < proc_stat_cols.length; i++){
        proc_info[proc_stat_cols[i]] = arr[i];
    }
    
    var proc_times = parseInt(proc_info.utime) + parseInt(proc_info.stime);
    
    //PID IO info
    
    var read_bytes = 0;
    var write_bytes = 0;
    var c_write_bytes = 0;
    var rchar = 0;
    var wchar = 0;
    var syscr = 0; //System Calls - Read
    var syscw = 0; //System Calls - Write
    try {
            io = fs.readFileSync(PROC + pid.toString() + '/io',{encoding:"utf8"});
        } catch(e) {
            //console.log(e);
            //debugger;
            //return;
            var io_err = e;
        }
        
        if (!io_err) {
            var ioarr = io.split('\n');
        
            for (var a = 0, iol = ioarr.length; a < iol; a++){
                if (ioarr[a].indexOf('rchar:') != -1) {
                    rchar = parseInt(ioarr[a].split(/\s+/)[1])
                }
		if (ioarr[a].indexOf('wchar:') != -1) {
                    wchar = parseInt(ioarr[a].split(/\s+/)[1])
                }
		if (ioarr[a].indexOf('syscr:') != -1) {
                    syscr = parseInt(ioarr[a].split(/\s+/)[1])
                }
		if (ioarr[a].indexOf('syscw:') != -1) {
                    syscw = parseInt(ioarr[a].split(/\s+/)[1])
                }
		
		if (ioarr[a].indexOf('read_bytes:') != -1) {
                    read_bytes = parseInt(ioarr[a].split(/\s+/)[1])
                }
                if (ioarr[a].indexOf('write_bytes:') != -1) {
                    write_bytes = parseInt(ioarr[a].split(/\s+/)[1])
                }
                if (ioarr[a].indexOf('cancelled_write_bytes:') != -1) {
                    c_write_bytes = c_write_bytes + parseInt(ioarr[a].split(/\s+/)[1]);
                    write_bytes = write_bytes - c_write_bytes;
                }
            }
        }
    
    //PID Memory Info
    
    var pss = 0;
    var rss = 0;
    
    
    //We only measure PSS once per trace period, since parsing smaps is quite demanding
//    if (proc_info.pss > 0) {
//	pss = proc_info.pss;
//    }
    if (proc_info.rss != '0') {
        //debugger;
	
	if (tmp.result.pids[pid] && tmp.result.pids[pid].pss != 0) {
		//rss = tmp.result.pids[pid].rss;
		//pss = tmp.result.pids[pid].pss;
	}
	else{
		try {
			smaps = fs.readFileSync(PROC + pid.toString() + '/smaps',{encoding:"utf8"});
		    
		    } catch(e) {
			//console.log(e);
			//debugger;
			//return;
			var smap_err = e;
		    }
		    
		    if (!smap_err) {
			var marr = smaps.split('\n');
		    
			for (var a = 0, ml = marr.length; a < ml; a++){
			    if (marr[a].indexOf('Pss:') != -1) {
				pss = pss + parseInt(marr[a].split(/\s+/)[1])
			    }
			    if (marr[a].indexOf('Rss:') != -1) {
				rss = rss + parseInt(marr[a].split(/\s+/)[1])
			    }
			}
		    }
	}
        
	//if (proc_info.comm.indexOf('sniff') != -1) {
	//	console.log('PSS:',pss);
	//}
        
        //debugger;
    }
    
    //PID FDs and sockets
    var sockets = new Array();
    
    try {
    
        var proc_fds = fs.readdirSync(PROC + pid.toString() + '/fd/');
        
    
    } catch(e) {
        console.log(e);
        //debugger;
        //return;
        var fd_err = e;
    }
    
    if (proc_fds && proc_fds.length > 0) {
	for (var d = 0; d < proc_fds.length; d++){
		try{
			var fd = fs.readlinkSync(PROC + pid.toString() + '/fd/' + proc_fds[d]);
			if (fd.indexOf('socket:') != -1) {
			    var socket = fd.split(':[')[1].replace(/\]/g,'');
			    sockets.push(socket);
			}
		    
		} catch(err){
		    //console.log(err);
		}
	}
    }
    
    if (!fd_err && sockets.length > 0) {
	
	for (var s = 0; s < sockets.length; s++){
		if(tmp.result.socket_ids.indexOf(sockets[s]) != -1){
			for (var ip in tmp.result.netstat){
				for (var port in tmp.result.netstat[ip]){
					//for (var s = 0; s < sockets.length; s++){
					if (sockets[s] == tmp.result.netstat[ip][port].socket_id) {
						tmp.result.netstat[ip][port].pid = pid.toString();
						tmp.result.netstat[ip][port].proc = proc_info.comm;
						//debugger;
					}
					//}
				}
			}
	
			for(var socket_id in tmp.result.network){
				//for (var s = 0; s < sockets.length; s++){
				if (sockets[s] == socket_id){
					tmp.result.network[socket_id].PID = pid;
					tmp.result.network[socket_id].prog = proc_info.comm;
					tmp.result.network[socket_id].socketid = socket_id;
					//debugger;
				}
				//}
			}
		}
	}
	
	
	
	//debugger;
	
    }
    
    
    
    //Prep result
    
    
    //Handle first run:
    
	if (tmp.result.run_count == 1) {
		tmp.result.pids[pid] = {};
	    
		//Determine if it's a completely new process, or a new run:
		
		tmp.result.pids[pid].last_proc_times = 0;
		//result[pid].proc_times = 0;
		//result[pid].last_proc_times = result[pid].proc_times;
		tmp.result.pids[pid].proc_times = proc_times;
		tmp.result.pids[pid].pid = pid;
		tmp.result.pids[pid].command = proc_info.comm;
		tmp.result.pids[pid].util = 0;
		tmp.result.pids[pid].rss = rss;
		tmp.result.pids[pid].pss = pss;
		tmp.result.pids[pid].last_read_bytes = read_bytes;
		tmp.result.pids[pid].last_write_bytes = write_bytes;
		tmp.result.pids[pid].read_bytes = 0;
		tmp.result.pids[pid].write_bytes = 0;
		
		tmp.result.pids[pid].last_rchar = rchar;
		tmp.result.pids[pid].last_wchar = wchar;
		tmp.result.pids[pid].last_syscr = syscr;
		tmp.result.pids[pid].last_syscw = syscw;
		
		tmp.result.pids[pid].rchar = 0;
		tmp.result.pids[pid].wchar = 0;
		tmp.result.pids[pid].syscr = 0;
		tmp.result.pids[pid].syscw = 0;
		
		tmp.result.pids[pid].sockets = sockets;
		tmp.result.pids[pid].sample_count = 0;//This is KEY. Since this is the first time we see the PID, this sample shouldn't be considered in calculations of average
		tmp.result.pids[pid].starttime = proc_info.starttime;
		tmp.result.pids[pid].runtime = tmp.result.sys_uptime - (proc_info.starttime * 10);
		
		return;
	}
	
	
	if (!tmp.result.pids[pid]) {
		tmp.result.pids[pid] = {};
		
		//We haven't seen this process during initialization. Means it's younger than our trace process:
		
		tmp.result.pids[pid].last_proc_times = 0;
		//result[pid].proc_times = 0;
		//result[pid].last_proc_times = result[pid].proc_times;
		tmp.result.pids[pid].proc_times = proc_times;
		tmp.result.pids[pid].pid = pid;
		tmp.result.pids[pid].command = proc_info.comm;
		tmp.result.pids[pid].util = 0;
		tmp.result.pids[pid].rss = 0;
		tmp.result.pids[pid].pss = 0;
		tmp.result.pids[pid].last_read_bytes = 0;
		tmp.result.pids[pid].last_write_bytes = 0;
		tmp.result.pids[pid].read_bytes = 0;
		tmp.result.pids[pid].write_bytes = 0;
	    
		tmp.result.pids[pid].last_rchar = 0;
		tmp.result.pids[pid].last_wchar = 0;
		tmp.result.pids[pid].last_syscr = 0;
		tmp.result.pids[pid].last_syscw = 0;
		
		tmp.result.pids[pid].rchar = 0;
		tmp.result.pids[pid].wchar = 0;
		tmp.result.pids[pid].syscr = 0;
		tmp.result.pids[pid].syscw = 0;    
	    
		tmp.result.pids[pid].sample_count = 1;
		tmp.result.pids[pid].starttime = proc_info.starttime;
		tmp.result.pids[pid].runtime = tmp.result.sys_uptime - (proc_info.starttime * 10);
		tmp.result.pids[pid].processor = parseInt(proc_info.processor);

	}
	
	tmp.result.pids[pid].last_proc_times = tmp.result.pids[pid].proc_times;
	tmp.result.pids[pid].proc_times = proc_times;
	

	
	//Calculate CPU usage of process:
	//(number of processors) * (proc_times2 - proc_times1) * 100 / (total_cpu_usage2 - total_cpu_usage1)
	//Maybe not. Why multiply by num_cpu?
    
	var util = num_procs * (tmp.result.pids[pid].proc_times - tmp.result.pids[pid].last_proc_times) * 100 / (tmp.result.sys_times - tmp.result.last_sys_times);
	//var util = (tmp.result.pids[pid].proc_times - tmp.result.pids[pid].last_proc_times) * 100 / (tmp.result.sys_times - tmp.result.last_sys_times);
    
	//if (pid == '1') {
	//	debugger;
	//}
	
	tmp.result.pids[pid].util += util;
	tmp.result.pids[pid].rss += rss;
	tmp.result.pids[pid].pss += pss;
	tmp.result.pids[pid].read_bytes = tmp.result.pids[pid].read_bytes + (read_bytes - tmp.result.pids[pid].last_read_bytes)
	tmp.result.pids[pid].write_bytes = tmp.result.pids[pid].write_bytes + (write_bytes - tmp.result.pids[pid].last_write_bytes);
	tmp.result.pids[pid].last_read_bytes = read_bytes;
	tmp.result.pids[pid].last_write_bytes = write_bytes;
	
	tmp.result.pids[pid].rchar = tmp.result.pids[pid].rchar + (rchar - tmp.result.pids[pid].last_rchar);
	tmp.result.pids[pid].wchar = tmp.result.pids[pid].wchar + (wchar - tmp.result.pids[pid].last_wchar);
	tmp.result.pids[pid].syscr = tmp.result.pids[pid].syscr + (syscr - tmp.result.pids[pid].last_syscr);
	tmp.result.pids[pid].syscw = tmp.result.pids[pid].syscw + (syscw - tmp.result.pids[pid].last_syscw);
	
	tmp.result.pids[pid].last_rchar = rchar;
	tmp.result.pids[pid].last_wchar = wchar;
	tmp.result.pids[pid].last_syscr = syscr;
	tmp.result.pids[pid].last_syscw = syscr;
	
	 
	
	tmp.result.pids[pid].sockets = sockets;
	tmp.result.pids[pid].sample_count++;
	tmp.result.pids[pid].processor = parseInt(proc_info.processor);
	//debugger;
	
	//tmp.result.pids[pid].debug.util.push(util);
	//tmp.result.pids[pid].debug.read_bytes.push(read_bytes);
	//tmp.result.pids[pid].debug.write_bytes.push(write_bytes);
    

}

function buildTrace(){
	//debugger;
	//Send signal to running collectors to get results:
	//console.log("Run count:", tmp.result.run_count);
	for(var traceCommand in traceCmds){
		//debugger;
		//runTraceCmds(traceCmds[traceCommand]);
		traceCmds[traceCommand].proc.kill('SIGALRM');
	}
	
	eventEmitter.once('traceCmdDone',function(cmd){
		
		//for (var cmd in traceCmds) {
		parseTrace(traceCmds)
		
		//debugger;
		//####################### TRACE PREP ################################
		
		trace.id = machineConfig.id;
		trace.hostname = machineConfig.__config__.hostname;
		trace.period = (traceInterval/1000)//.toString();
		trace.PhysIO = tmp.result.PhysIO;
		trace.netstat = tmp.result.netstat;
		trace.processes = {};
		for(var pid in tmp.result.pids){
			if (tmp.result.pids[pid].sample_count == 0) {//If sample count is 0, means this is a leftover from previous run,
				continue;				//this process died before the first sample. Skip.
			}
			trace.processes[pid] = {};
			trace.processes[pid].PID = tmp.result.pids[pid].pid;
			trace.processes[pid].procCpuUtil = tmp.result.pids[pid].util/tmp.result.pids[pid].sample_count;
			if (tmp.result.pids[pid].diskio) {
				trace.processes[pid].diskio = tmp.result.pids[pid].diskio;
			}
			if (tmp.result.pids[pid].read_bytes > 0 || tmp.result.pids[pid].write_bytes > 0) {
				if(!trace.processes[pid].io){
					trace.processes[pid].io = {};
				};
				trace.processes[pid].io.readBytesSec = Math.round(tmp.result.pids[pid].read_bytes / (traceInterval/1000));
				trace.processes[pid].io.writeBytesSec = Math.round(tmp.result.pids[pid].write_bytes / (traceInterval/1000));
				trace.processes[pid].io.totalReadBytes = tmp.result.pids[pid].read_bytes;
				trace.processes[pid].io.totalWriteBytes = tmp.result.pids[pid].write_bytes;
			}
			trace.processes[pid].memoryKB = tmp.result.pids[pid].pss;
			trace.processes[pid].memUtilPct = trace.processes[pid].memoryKB/parseInt(machineConfig.ram.__config__.MemTotal)*100;
			trace.processes[pid].name = tmp.result.pids[pid].command;
			trace.processes[pid].processor = tmp.result.pids[pid].processor;
			//if (tmp.result.pids[pid].rchar != 0 && tmp.result.run_count >15) {
			//	debugger;
			//}
			
		}
		
		trace.network = tmp.result.network;
		for (var socket in trace.network) {
			trace.network[socket].protocol = 'tcp';
			if (!trace.network[socket].MAC) {
				var laddr = trace.network[socket].local;
				for(var nic in machineConfig.nics){
					if (typeof(machineConfig.nics[nic]) == 'object' && machineConfig.nics[nic].template == 'nic') {
						var addr = machineConfig.nics[nic].__config__.ip;
						if (addr == laddr) {
							trace.network[socket].MAC = machineConfig.nics[nic].__config__.mac;
						}
					}
				}
			}
			
		}
		status.traceReady = true;
		//debugger;
		
		
		//for(var pid in tmp.result.pids){if(tmp.result.pids[pid].command.indexOf('(dd)') != -1){
		//	console.log(tmp.result.pids[pid]);
		//}}
		//
		//for(var pid in tmp.result.pids){if(tmp.result.pids[pid].diskio){
		//	console.log(' ');
		//	console.log(' ');
		//	console.log(tmp.result.pids[pid].command);
		//	console.log("Cache Read Bytes " + tmp.result.pids[pid].read_bytes)
		//	console.log("Disk Read Bytes " + tmp.result.pids[pid].phys_read_bytes)
		//	console.log("Cache Write Bytes " + tmp.result.pids[pid].write_bytes)
		//	console.log("Disk Write Bytes " + tmp.result.pids[pid].phys_write_bytes)
		//	
		//	}};
		//	
		//for(var pid in tmp.result.pids){if(tmp.result.pids[pid].read_bytes != 0 || tmp.result.pids[pid].write_bytes != 0){
		//	console.log(' ');
		//	console.log(' ');
		//	console.log(tmp.result.pids[pid].command);
		//	console.log("Cache Read Bytes " + tmp.result.pids[pid].read_bytes)
		//	//console.log("Disk Read Bytes " + tmp.result.pids[pid].phys_read_bytes)
		//	console.log("Cache Write Bytes " + tmp.result.pids[pid].write_bytes)
		//	//console.log("Disk Write Bytes " + tmp.result.pids[pid].phys_write_bytes)
		//	
		//	}};
		
		//Clear old results:
		for (var pid in tmp.result.pids){
			
			if (tmp.result.pidlist.indexOf(parseInt(pid)) == -1) {
				//debugger;
				delete tmp.result.pids[pid];
				
				continue;
			}
			
			tmp.result.pids[pid].util = 0;
			tmp.result.pids[pid].rss = 0;
			tmp.result.pids[pid].pss = 0;
			tmp.result.pids[pid].read_bytes = 0;
			tmp.result.pids[pid].write_bytes = 0;
			tmp.result.pids[pid].rchar = 0;
			tmp.result.pids[pid].wchar = 0;
			tmp.result.pids[pid].syscr = 0;
			tmp.result.pids[pid].syscw = 0;
			//tmp.result.pids[pid].last_read_bytes = read_bytes;
			//tmp.result.pids[pid].last_write_bytes = write_bytes;
			tmp.result.pids[pid].sockets = [];
			tmp.result.pids[pid].sample_count = 0;
			if (tmp.result.pids[pid].diskio) {
				delete tmp.result.pids[pid].diskio;
				delete tmp.result.pids[pid].phys_write_bytes
				delete tmp.result.pids[pid].phys_read_bytes
			}
		}
		tmp.result.socket_ids = [];
		
		tmp.result.network = {};
		tmp.result.PhysIO = {};
		for (var cmd in traceCmds){
			traceCmds[cmd].done = false;
			traceCmds[cmd].out = '';
		}
		//}
	})
	
	//Build actual trace:
	
	
	
	
	//debugger;
}


function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}


function parseTrace(bin){
    
    //debugger;
    for (var cmd in bin) {
	switch(bin[cmd].cmd){
	//case '/usr/bin/pidstat':
	//    parsePidstat(bin[cmd].out);
	//    bin[cmd].out = '';
	//    break;
	//case '/usr/bin/jnettop':
	//    //console.log(bin[cmd].out)
	//    parseJnettop(bin[cmd].out);
	//    bin[cmd].out = '';
	//    break;
	//case '/bin/dmesg':
	//    //debugger;
	//    //console.log(bin[cmd].out)
	//    parseDmesg(bin[cmd].out)
	//    bin[cmd].out = '';
	//    break;
	//case '/bin/netstat':
	//    //debugger;
	//    //console.log(bin[cmd].out)
	//    //parseSockets(bin[cmd].out)
	//    bin[cmd].out = '';
	//    break;
	case ('/root/klog'):
		parseKlog(bin[cmd].out);
		break;
	case ('/root/sniffex'):
		parseSniffex(bin[cmd].out);
		break;
	default:
	    break;
	}
    }
    
    
    function parseKlog(data){
	var arr = data.split('\n');
	
	var devs = [];
	//Build a list of devices we're interested in
	for (var vol in machineConfig.vols.vols){
		if (typeof machineConfig.vols.vols[vol] === 'object' && machineConfig.vols.vols[vol].template && machineConfig.vols.vols[vol].template == 'vol') {
			 devs.push(machineConfig.vols.vols[vol].__config__.kdevice)
		}
		else if (typeof machineConfig.vols.vols[vol] === 'object' && machineConfig.vols.vols[vol].template && machineConfig.vols.vols[vol].template == 'vg') {
			
			for(var dst in machineConfig.vols.vols[vol].__config__.dst){
				if (typeof machineConfig.vols.vols[vol].__config__.dst[dst] === 'object' && machineConfig.vols.vols[vol].__config__.dst[dst].kname) {
					devs.push(machineConfig.vols.vols[vol].__config__.dst[dst].kname)
				}
			}
			for (var lv in machineConfig.vols.vols[vol]){
				if (typeof machineConfig.vols.vols[vol][lv] === 'object' && machineConfig.vols.vols[vol][lv].template && machineConfig.vols.vols[vol][lv].template == 'vol') {
					 devs.push(machineConfig.vols.vols[vol][lv].__config__.kdevice)
				}
			}
		}
	}
	for (var raid in machineConfig.raids.raids){
		if (typeof machineConfig.raids.raids[raid] === 'object' && machineConfig.raids.raids[raid].template && machineConfig.raids.raids[raid].template == 'disk') {
			devs.push(raid);
			for (var part in machineConfig.raids.raids[raid]){
				if (typeof machineConfig.raids.raids[raid][part] === 'object' && machineConfig.raids.raids[raid][part].template && machineConfig.raids.raids[raid][part].template == 'partition') {
					devs.push(part);
				}
			}
		}
	}
	
	//debugger;
	for (var a = 0; a < arr.length; a++){
		if (arr[a] == '') {
			continue;
		}
		var cols = arr[a].split(',');
		var pid = cols[0];
		var dev = cols[1];
		var cmd = cols[2];
		var readBlocks = parseInt(cols[3]);
		var writeBlocks = parseInt(cols[4]);
		
		//Find if the device should be included - skip ram devices etc.
		
		if (devs.indexOf(dev) == -1) {
			continue;
		}
		
		if (!tmp.result.PhysIO) {
			tmp.result.PhysIO = {};
		}
		if (!tmp.result.PhysIO[dev]) {
			tmp.result.PhysIO[dev] = {};
		}
		tmp.result.PhysIO[dev].readOpsSec = Math.round(readBlocks / (traceInterval/1000));
		tmp.result.PhysIO[dev].writeOpsSec = Math.round(writeBlocks / (traceInterval/1000));
		tmp.result.PhysIO[dev].totalReadOps = readBlocks;
		tmp.result.PhysIO[dev].totalWriteOps = writeBlocks;
		tmp.result.PhysIO[dev].readBytesSec = Math.round(readBlocks * sector_size / (traceInterval/1000));
		tmp.result.PhysIO[dev].writeBytesSec = Math.round(writeBlocks * sector_size / (traceInterval/1000));
		
		//debugger;
		
		if (tmp.result.pids[pid]) {
			if (!tmp.result.pids[pid].diskio) {
				tmp.result.pids[pid].diskio = {};
			}
			if (!tmp.result.pids[pid].diskio[dev]) {
				tmp.result.pids[pid].diskio[dev] = {};
			}
			tmp.result.pids[pid].diskio[dev].readOpsSec = Math.round(readBlocks / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].writeOpsSec = Math.round(writeBlocks / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].totalReadOps = readBlocks;
			tmp.result.pids[pid].diskio[dev].totalWriteOps = writeBlocks;
			tmp.result.pids[pid].diskio[dev].readBytesSec = Math.round(readBlocks * sector_size / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].writeBytesSec = Math.round(writeBlocks * sector_size / (traceInterval/1000));
			//debug
			tmp.result.pids[pid].phys_write_bytes = writeBlocks * sector_size;
			tmp.result.pids[pid].phys_read_bytes = readBlocks * sector_size;
		}
		else if (!tmp.result.pids[pid]) {
			//console.log('short-lived process: ',arr[a])
			tmp.result.pids[pid] = {};
			if (!tmp.result.pids[pid].diskio) {
				tmp.result.pids[pid].diskio = {};
			}
			if (!tmp.result.pids[pid].diskio[dev]) {
				tmp.result.pids[pid].diskio[dev] = {};
			}
			tmp.result.pids[pid].diskio[dev].readOpsSec = Math.round(readBlocks / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].writeOpsSec = Math.round(writeBlocks / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].totalReadOps = readBlocks;
			tmp.result.pids[pid].diskio[dev].totalWriteOps = writeBlocks;
			tmp.result.pids[pid].diskio[dev].readBytesSec = Math.round(readBlocks * sector_size / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].writeBytesSec = Math.round(writeBlocks * sector_size / (traceInterval/1000));
			//debug
			tmp.result.pids[pid].phys_write_bytes = writeBlocks * sector_size;
			tmp.result.pids[pid].phys_read_bytes = readBlocks * sector_size;
			
			
			//We haven't seen this process during initialization. Means it's younger than our trace process:
		
			tmp.result.pids[pid].last_proc_times = 0;
			//result[pid].proc_times = 0;
			//result[pid].last_proc_times = result[pid].proc_times;
			tmp.result.pids[pid].proc_times = 0;
			tmp.result.pids[pid].pid = pid;
			tmp.result.pids[pid].command = cmd;
			tmp.result.pids[pid].util = 0;
			tmp.result.pids[pid].rss = 0;
			tmp.result.pids[pid].pss = 0;
			tmp.result.pids[pid].last_read_bytes = 0;
			tmp.result.pids[pid].last_write_bytes = 0;
			tmp.result.pids[pid].read_bytes = 0;
			tmp.result.pids[pid].write_bytes = 0;
		    
			tmp.result.pids[pid].last_rchar = 0;
			tmp.result.pids[pid].last_wchar = 0;
			tmp.result.pids[pid].last_syscr = 0;
			tmp.result.pids[pid].last_syscw = 0;
			
			tmp.result.pids[pid].rchar = 0;
			tmp.result.pids[pid].wchar = 0;
			tmp.result.pids[pid].syscr = 0;
			tmp.result.pids[pid].syscw = 0;    
		    
			tmp.result.pids[pid].sample_count = 1;
			//tmp.result.pids[pid].starttime = proc_info.starttime;
			//tmp.result.pids[pid].runtime = tmp.result.sys_uptime - (proc_info.starttime * 10);
			tmp.result.pids[pid].processor = '0';
			tmp.result.pids[pid].short_lived_process = true;
		
		}
	}
    }
    
    function parseSniffex(data){
	var arr = data.split('\n');
	for (var a = 0; a < arr.length; a++){
		if (arr[a] == '') {
			continue;
		}
		var cols = arr[a].split(',');
		var smac = fixMac(cols[0]);
		var sip = cols[1];
		var sport = cols[2];
		var dmac = fixMac(cols[3]);
		var dip = cols[4];
		var dport = cols[5];
		var length = cols[6];
		
		//Fix MACs:
		function fixMac(hwaddr) {
			var mac = hwaddr.split(':');
			for(var z = 0; z < mac.length; z++){
				if (mac[z].length == 1) {
					mac[z] = '0'+mac[z];
				}
			}
			return mac.join(':');
		}
		
		//debugger;
		
		for (var socket_id in tmp.result.network){
			if (tmp.result.network[socket_id].local == sip && tmp.result.network[socket_id].localport == sport && tmp.result.network[socket_id].remote == dip && tmp.result.network[socket_id].remoteport == dport) {
				tmp.result.network[socket_id].MAC = smac;
				tmp.result.network[socket_id].RMAC = dmac;
				if (!tmp.result.network[socket_id].bytesSentPerSec) {
					tmp.result.network[socket_id].bytesSentPerSec = 0;
				}
				tmp.result.network[socket_id].bytesSentPerSec += Math.round((length / (traceInterval/1000)));
			}
			
			if (tmp.result.network[socket_id].local == dip && tmp.result.network[socket_id].localport == dport && tmp.result.network[socket_id].remote == sip && tmp.result.network[socket_id].remoteport == sport) {
				tmp.result.network[socket_id].MAC = dmac;
				tmp.result.network[socket_id].RMAC = smac;
				if (!tmp.result.network[socket_id].bytesReceivedPerSec) {
					tmp.result.network[socket_id].bytesReceivedPerSec = 0;
				}
				tmp.result.network[socket_id].bytesReceivedPerSec += Math.round((length / (traceInterval/1000)));
			}
		}
		
	}
    }
    
    
//    function parsePidstat(data){
//	var arr = data.split('\n');
//	var columns = [];
//	for (var i = 0;i<arr.length;i++){
//	    
//	    if (arr[i].indexOf('Linux') != -1 && i == 0) {//First line, skip
//		continue;
//	    }
//	    else if (arr[i].indexOf('#') != -1 && arr[i].indexOf('%CPU') != -1) {//Header, create columns and skip
//		columns = arr[i].split(/\s+/);
//		columns.shift();
//		continue;
//	    }
//	    else if (arr[i] == '') {//Empty line, usually end, skip
//		continue;
//	    }
//	    else{
//		var line = arr[i].split(/\s{2,}/);
//		var process = {}
//		if (!trace.processes) {
//		    trace.processes = {};
//		}
//		
//		for (var z = 0;z < columns.length; z++){
//		    process[columns[z]] = line[z];
//		}
//		if (!trace.processes[process.PID]) {
//		    trace.processes[process.PID] = {};
//		    trace.processes[process.PID].PID = process.PID
//		    trace.processes[process.PID]['cpu_utilization%'] = process['%CPU'];
//		    trace.processes[process.PID].name = process.Command;
//		    trace.processes[process.PID].processor = process.CPU;
//		}    
//		//debugger;
//	    }
//	}
//    }
    
//    function parseJnettop(data){
//	//debugger;
//	//return;
//	var arr = data.split('\n');
//	//debugger;
//	for (var i = 0;i<arr.length;i++){
//	    
//	    if (arr[i] == '') {//Empty line, usually end, skip
//		continue;
//	    }
//	    else{
//		var line = arr[i].split(',');
//		
//		var laddr = line[0];
//		var lport = parseInt(line[1]);
//		var raddr = line[2];
//		var rport = parseInt(line[3])
//		var bytesSentPerSec = line[4]
//		var bytesReceivedPerSec = line[5];
//		
//		for (var s in tmp.trace.network){
//			if (tmp.trace.network[s].local == laddr &&
//			    tmp.trace.network[s].remote == raddr &&
//			    tmp.trace.network[s].localport == lport &&
//			    tmp.trace.network[s].remoteport == rport) {
//				
//				var socketId = s;
//				var socket = tmp.trace.network[s];
//			}
//		}
//		
//		
//		if (!trace.network) {
//		    trace.network = {};
//		}
//		if (!trace.network[socketId]) {
//		    trace.network[socketId] = {};
//		}
//		
//		trace.network[socketId].PID = socket.PID;
//		trace.network[socketId].local = socket.local;
//		trace.network[socketId].localport = socket.localport;
//		trace.network[socketId].remote = socket.remote;
//		trace.network[socketId].remoteport = socket.remoteport;
//		trace.network[socketId].prog = socket.prog;
//		trace.network[socketId].protocol = socket.protocol;
//		trace.network[socketId].socketid = socketId;
//		trace.network[socketId].bytesSentPerSec = bytesSentPerSec;
//		trace.network[socketId].bytesReceivedPerSec = bytesReceivedPerSec;
//		
// 
//		//debugger;
//	    }
//	}
//	debugger;
//    }
    
    
    
//    function parseDmesg(data){
//	var arr = data.split('\n');
//	//var columns = [];
//	//debugger;
//	for (var i = 0;i<arr.length;i++){
//	    
//	    if (arr[i] == '') {//Empty line, skip
//		continue;
//	    }
//	    else if (arr[i].indexOf('WRITE block') != -1 || arr[i].indexOf('READ block') != -1) {
//		//Get PID:
//		var PID = arr[i].substring(arr[i].indexOf('(')+1,arr[i].indexOf(')'));
//		var disk = arr[i].substring(arr[i].indexOf(' on ')+4);
//		
//		if (!trace.PhysIO) {
//		    trace.PhysIO = {};		    
//		}
//		
//		if (!trace.PhysIO[disk]) {
//		    trace.PhysIO[disk] = {};
//		    trace.PhysIO[disk].readBytesSec = 0;
//		    trace.PhysIO[disk].readOpsSec = 0;
//		    trace.PhysIO[disk].writeBytesSec = 0;
//		    trace.PhysIO[disk].writeOpsSec = 0;
//		}
//		if (!trace.processes) {
//		    trace.processes = {};
//		}
//		if (!trace.processes[PID]) {
//		    trace.processes[PID] = {};
//		}
//		if (!trace.processes[PID].diskio) {
//		    trace.processes[PID].diskio = {};
//		}
//		if (!trace.processes[PID].diskio['/dev/'+disk]) {
//		    trace.processes[PID].diskio['/dev/'+disk] = {};
//		    trace.processes[PID].diskio['/dev/'+disk].readBytesSec = 0;
//		    trace.processes[PID].diskio['/dev/'+disk].readOpsSec = 0;
//		    trace.processes[PID].diskio['/dev/'+disk].writeBytesSec = 0;
//		    trace.processes[PID].diskio['/dev/'+disk].writeOpsSec = 0;
//		}
//		
//		if (arr[i].indexOf('READ block') != -1){
//		    trace.PhysIO[disk].readBytesSec = trace.PhysIO[disk].readBytesSec + 4096; //One block... fix it to reflext the actual block size
//		    trace.PhysIO[disk].readOpsSec = trace.PhysIO[disk].readOpsSec + 1;
//		    trace.processes[PID].diskio['/dev/'+disk].readBytesSec = trace.processes[PID].diskio['/dev/'+disk].readBytesSec + 4096;
//		    trace.processes[PID].diskio['/dev/'+disk].readOpsSec = trace.processes[PID].diskio['/dev/'+disk].readOpsSec + 1;
//		}
//		if (arr[i].indexOf('WRITE block') != -1){
//		    trace.PhysIO[disk].writeBytesSec = trace.PhysIO[disk].writeBytesSec + 4096; //One block... fix it to reflext the actual block size
//		    trace.PhysIO[disk].writeOpsSec = trace.PhysIO[disk].writeOpsSec + 1;
//		    trace.processes[PID].diskio['/dev/'+disk].writeBytesSec = trace.processes[PID].diskio['/dev/'+disk].writeBytesSec + 4096;
//		    trace.processes[PID].diskio['/dev/'+disk].writeOpsSec = trace.processes[PID].diskio['/dev/'+disk].writeOpsSec +1;
//		}
//	    }
//	}
//    }
}

function writeOut(){
	var machineConfigOut = JSON.stringify(machineConfig);
	var filename = 'machineconfig.'+machineConfig.__config__.hostname+'.json'
	fs.writeFile(filename,machineConfigOut,'utf8',function(err){if(err){console.log('ERROR')}else console.log('Done writing configuration file '+ filename)});
}


http.createServer(function (request, response) {
    console.log('request starting...');
	var url = request.url;
	var content = '';
	var badRequest = false;
	switch(url){
		case '/config':
			if (!status.configReady) {
				reject('Config not ready')
			}
			else{
				content = JSON.stringify(machineConfig);
				respond(content);
			}
			break;
		case '/trace':
			if (!status.traceReady) {
				reject('Trace not ready');
			}
			else{
				//for(var pid in trace.processes){
				//	if (trace.processes[pid].procCpuUtil == null || isNaN(trace.processes[pid].procCpuUtil)) {
				//		debugger;
				//	}
				//}
				content = JSON.stringify(trace);
				respond(content);
			}
			break;
			
			//exec(commands.netstat.cmd,env,function(err,stdout,stderr){
			//	if(err){console.log("Command Failed: netstat, Error: ",err)}
			//	else{commands.netstat.out=stdout;}
			//	//parseNetstat('netstat');
			//	//debugger;
			//	exec(commands.mem.cmd,env,function(err,stdout,stderr){
			//		if(err){console.log("Command Failed: smem, Error: ",err)}
			//		else{commands.mem.out=stdout;}
			//		parseSmem('mem');
			//		//debugger;
			//		
			//		readHwmon(function(e,r){//MY FIRST CALLBACK :)
			//		if(e){console.log(e.message);reject(e.message);}
			//		else if(r.length == 0){reject("Zero-length response from hwmon")}
			//		else{
			//			var trace = JSON.parse(r);
			//			trace.netstat = commands.netstat.res;
			//			
			//			//debugger;
			//			//var totalHwmonMem = 0;
			//			//var smemMem = 0;
			//			var totalMem = parseInt(machineConfig.ram.__config__.MemTotal); //Total RAM in KB
			//			for (var a = 0; a < commands.mem.res.length; a++){
			//				var pid = commands.mem.res[a].pid;
			//				var pss = commands.mem.res[a].pss;
			//				if (trace.processes[pid]) {
			//					trace.processes[pid].wrongmem = trace.processes[pid].memoryKB;
			//					trace.processes[pid].memoryKB = parseInt(pss)
			//					//smemMem = smemMem + parseInt(pss);
			//				}
			//			}
			//			for(var pid in trace.processes){
			//				if (!trace.processes[pid].wrongmem) {
			//					trace.processes[pid].wrongmem = trace.processes[pid].memoryKB;
			//					trace.processes[pid].memerr = true;
			//					trace.processes[pid].memoryKB = 0;
			//				}
			//				trace.processes[pid].memUtilPct = Math.round(trace.processes[pid].memoryKB/(totalMem/100));//Calculate PCT utilization
			//			}
			//			debugger;
			//			var trace = JSON.stringify(trace);
			//			respond(trace);
			//			console.log("Response Length: ",trace.length);
			//		}
			//		});
			//		
			//	})
			//	
			//})
			break;
		default:
			content = 'specify what you need';
			badRequest = true;
			reject(content);
			break;
	}
	//if(!status.configReady || badRequest || !status.traceReady){
	//	reject(content);
	//}
	function reject(err){
		response.writeHead(500);
		console.log("error: ",err);
		console.log("Response failure. URL: ",url)
		response.end();
	}
	
	function respond(data){
		response.writeHead(200, { 'Content-Type': 'application/json' });
		response.end(data, 'utf-8');
		//console.log("Machine config sent")
		console.log("Response success. URL: ",url);
	}
	
}).listen(8125);
console.log('Server listening on port 8125');



//function readHwmon(cb){
//	var opts = {host:'127.0.0.1',port:8989,path:'/report',method:'GET'};//HWMON Agent host
//	var sample;
//	
//	var callback = function(response) {
//		var str = '';
//	
//		//another chunk of data has been recieved, so append it to `str`
//		response.on('data', function (chunk) {
//			str += chunk;
//		});
//	
//		//the whole response has been recieved, so we just print it out here
//		response.on('end', function () {
//		try{
//			sample = str;
//			cb(null,sample);
//		}
//		catch(err){
//			//debugger;
//			console.log("Error getting response: "+err);	
//			cb(new Error("something's wrong"));
//		}
//		//sample = JSON.parse(str);
//		//console.log(sample)
//		});
//	  
//		response.on('error', function(err){
//			console.log("ERROR: ",err)
//			cb(new Error("Response error: "+ err));
//			})
//	}
//	
//	var req = http.request(opts,callback);
//	
//	req.on('error', function(e) {
//	  console.log('problem with request: ' + e.message);
//	  cb(new Error("something's wrong: "+ e.message));
//	});
//	
//	req.end();
//}
	  
function parseLshw(object,result){
	//var classes = {}
	//debugger;
	//Fix the tree first
	fixObject(object)
	function fixObject(o){
		for(var key in o){
			if(o.hasOwnProperty(key)){
				var child = o[key];
				
				//FIX stuff
				if(typeof child === 'object' && key=='capabilities'){
					//console.log('Capabilities')
					if(child.capability && child.capability instanceof Array){
						//console.log('Capability')
						//console.log('Child: ',child)
						//var obj = new Object();
						for (var a = 0; a < child.capability.length;a++){
							var str = child.capability[a]['_']
							if(str == undefined){str = 'capability'+a}
							child[str]=child.capability[a].id
							//child[obj.capability[a]['_']]=obj.capability[a].id
						}
						
						//console.log('New Ocbject:',obj);
						delete child.capability;
						
						//child.newCap = obj;
						//console.log('Deleted. New Object:',obj);
						//console.log('Child: ',child)
						//child = obj; //MOTHERFUCKER doesn't want to replace the original object. wtf.
						//The problem is that Network, Memory, etc don't get parsed
						//console.log('Child after update: ',child)
					}
				}
				else if(typeof child === 'object' && key=='configuration'){
					//console.log('Capabilities')
					if(child.setting && child.setting instanceof Array){
						//console.log('Setting')
						//console.log('Child: ',child)
						//var obj = new Object();
						for (var a = 0; a < child.setting.length;a++){
							var str = child.setting[a]['id']
							if(str == undefined){str = 'setting'+a}
							child[str]=child.setting[a].value
							//child[obj.setting[a]['id']]=obj.setting[a].value
						}
						//console.log('New Ocbject:',obj);
						delete child.setting;
						//child = obj;
						//console.log('Deleted. New Object:',obj);
						//console.log('Child: ',child)
						//child = obj; //MOTHERFUCKER doesn't want to replace the original object. wtf.
						//console.log('Child after update: ',child)
					}
				}
				else if(typeof child === 'object' && key!='configuration' && key!='capabilities'){
					fixObject(child);
				}
			}
		}
	}
	//Parse Object
	for(var key in object){
		if(object.hasOwnProperty(key)){
			var child = object[key];
			if(typeof child === 'object' && key!='node'){
				//console.log("Object: ",key);
				//console.log("Class = ",child.class," Disabled: ",child.disabled," Claimed: ",child.claimed)
				if(child.disabled == 'true' && child.class != 'network'){continue}
				//if(child.class){result[child.class]=true}
				//walk(child);
			}
			if(key == 'node' && !(child instanceof Array)){
				//console.log("Non-Array Node: Class = ",child.class," Disabled: ",child.disabled," Claimed: ",child.claimed)
				if(child.disabled == 'true'){continue}
				if(child.class){
					if(!result[child.class]){result[child.class]=[]}
					var c = child.class;
					if(c == 'system' || c == 'storage'){
						result[child.class].push(child);
					}
					if(c == 'network' || c == 'processor'){
						result[child.class].push(child);
						continue;	//the buck stops here
					}
					if(c == 'memory'){
						if(child.id=='memory' && child.size){
							result[child.class].push(child);
							//continue;	//the buck stops here
						}
						else if(!child.size){
							//delete child;
						}
					}
				}
				parseLshw(child,result);
			}
			if(key == 'node' && (child instanceof Array)){
				//console.log("Array Node")
				for (var a=0;a<child.length;a++){
					//arr.push(child);
					//console.log(child[a])
					//console.log("Class = ",child[a].class," Disabled: ",child[a].disabled," Claimed: ",child[a].claimed)
					if(child[a].disabled == 'true'){continue}
					if(child[a].class){
						if(!result[child[a].class]){result[child[a].class]=[]}
						var c = child[a].class;
						if(c == 'system' || c == 'storage'){
							result[child[a].class].push(child[a]);
						}
						if(c == 'network' || c == 'processor'){
							result[child[a].class].push(child[a]);
							continue;	//the buck stops here
						}
						if(c == 'memory'){
							if(child[a].id=='memory' && child[a].size){
								result[child[a].class].push(child[a]);
								//continue;	//the buck stops here
							}
							else if(!child.size){
								//child.splice(a,1);
								
								//delete child[a];
								continue;
							}
						}
					}
					parseLshw(child[a],result);
				}
			}
		}
	}
	//Fix result
}


function parseLstopo(object,result){
	//Fix the tree first
	fixObject(object)
	function fixObject(o){
		for(var key in o){
			if(o.hasOwnProperty(key)){
				var child = o[key];
				//FIX stuff
				if(typeof child === 'object' && child.info && child.info instanceof Array){
					child.__config__ = new Object();
					for (var a = 0; a < child.info.length;a++){
						var str = child.info[a]['name'].toLowerCase();
						if(str == undefined){str = 'info'+a}
						child.__config__[str]=child.info[a].value
					}
					delete child.info;
					fixObject(child);
					
				}
				else if(typeof child === 'object' && child.info && !(child.info instanceof Array)){
					child.__config__ = new Object();
					for (var a in child.info){
						var str = child.info['name'].toLowerCase();
						if(str == undefined){str = a}
						child.__config__[str]=child.info.value
					}
					delete child.info;
					fixObject(child);
				}
				else if(typeof child === 'object' && !child.info){
					fixObject(child);
				}
			}
		}
	}
	//Parse Object
	parseObject(object,result);
	function parseObject(object,result){
		for(var key in object){
			if(object.hasOwnProperty(key)){
				var parent = object;
				var child = object[key];
				if(typeof child === 'object' && key!='object'){
					parseObject(child,result);
				}
				
				if(typeof child === 'object' && key=='object' && !(child instanceof Array)){
					if(child.type == 'Machine'){
						//console.log("Machine: ")
						if(!result.node){result.node={}}
						result.node.__config__ = child.__config__;
						result.node.__config__.local_memory = child.local_memory;
						parseObject(child,result);
					}
					else if(child.type == 'Socket'){
						//console.log("Non-Array Socket #: ",child.os_index)
						if(!result.sockets){result.sockets=[]}
						result.sockets.push(child);
						//parseObject(child,result);
					}
					else if(child.type == 'OSDev'){
						if(child.osdev_type == '0'){//Block Device
							if(!result.storage){result.storage=[]}
							var idx = result.storage.indexOf(parent);
							if(idx == -1){idx  = result.storage.push(parent);idx = idx-1;}
							if(!result.storage[idx].slaves){result.storage[idx].slaves = [];}
							result.storage[idx].slaves.push(child)
						}
						if(child.osdev_type == '2'){//Network
							if(!result.network){result.network=[]}
							var idx = result.network.indexOf(parent);
							if(idx == -1){idx  = result.network.push(parent);idx = idx-1;}
							if(!result.network[idx].slaves){result.network[idx].slaves = [];}
							result.network[idx].slaves.push(child)
							//continue;
						}
					}
					else{parseObject(child,result);}
				}
				if(typeof child === 'object' && key=='object' && (child instanceof Array)){
					for(var a = 0;a < child.length; a++){
						if(child[a].type == 'Machine'){
							console.log("Array Machine: ")
							if(!result.node){result.node={}}
							result.node.__config__ = child[a].__config__;
							result.node.__config__.local_memory = child[a].local_memory;
							parseObject(child[a],result);
						}
						else if(child[a].type == 'Socket'){
							//console.log("Array Socket #: ",child[a].os_index)
							if(!result.sockets){result.sockets=[]}
							//if()
							result.sockets.push(child[a]);
							//parseObject(child[a],result);
						}
						else if(child[a].type == 'OSDev'){
							if(child[a].osdev_type == '0'){//Block Device
								//console.log("Block: ",child[a].name)
								if(!result.storage){result.storage=[]}
								var idx = result.storage.indexOf(parent);
								if(idx == -1){idx  = result.storage.push(parent);idx = idx-1;}
								//console.log('IDX: ',idx)
								if(!result.storage[idx].slaves){result.storage[idx].slaves = [];}
								result.storage[idx].slaves.push(child[a])
								//continue;
							}
							if(child[a].osdev_type == '2'){//Network
								if(!result.network){result.network=[]}
								var idx = result.network.indexOf(parent);
								if(idx == -1){idx  = result.network.push(parent);idx = idx-1;}
								//console.log('IDX: ',idx)
								if(!result.network[idx].slaves){result.network[idx].slaves = [];}
								result.network[idx].slaves.push(child[a])
								//continue;
							}
						}
						else{parseObject(child[a],result);}
					}
				}
			}
		}
	}
	//Fix result
}

function addId(obj,base_id){
	
	walk(obj);
	
	function walk(obj){
		for(var leaf in obj){
			if(obj.hasOwnProperty(leaf)){
				var value = obj[leaf];
				//console.log('Field: ', leaf,' Value: ',value, ' Parent: ',obj.id);
				if(typeof value === 'object' && leaf!="__config__"){
					//depth++;
					
					var id = '';
					 
					if(obj[leaf].template){id = base_id + '_' + obj[leaf].template + '_'+ leaf}
					else{id = base_id +'_'+leaf;}
					
					id = id.replace(/\]/g,'').replace(/\[/g,'').replace(/\//,'slash_').replace(/-$/,'');//Clean bad characters
					
					z = 0;
					
					while(ids.indexOf(id) != -1){
						id = id + z.toString();
						z++;
					}
					obj[leaf].id = id;
					obj[leaf].parent = obj.id || 'viewport';
					//value.__config__=generateConfig(value.template);
					ids.push(id);
					walk(value);
				}
			}
		}
	}
}

//function parseNetstat(command){
//	var arr = commands[command].out.toLowerCase().split('\n');
//	var columns = [];
//	out = {};
//	for (var i=0;i<arr.length;i++){
//		if(arr[i]=='')continue;
//		if(arr[i].search(/^proto/)!=-1)continue;
//		if(arr[i].indexOf('active internet')!=-1)continue;//Columns:Proto Recv-Q Send-Q Local Address Foreign Address State PID/Program name
//		columns = ['proto','rq','sq','laddr','raddr','state','pid']
//		arr[i] = arr[i].split(/\s+/);
//		//if (arr[i][0] == 'Node'){columns = arr[i];continue;};
//		var o ={};
//		//out[arr[i][0]]=arr[i][1]
//		var addr = arr[i][3].split(':')[0];
//		var port = arr[i][3].split(':')[1];
//		var pid = arr[i][6].split('/')[0];
//		var proc = arr[i][6].split('/')[1];
//		if(!out[addr]){out[addr] = {}}
//		if(!out[addr][port]){out[addr][port] = {}}
//		out[addr][port].pid = pid;
//		out[addr][port].proc = proc;
//		
//		//for (var z=0;z<columns.length;z++){
//		//	if(arr[i][z] == '')continue; 
//		//	o[columns[z]]=arr[i][z];
//		//};
//		//out.push(o);
//	}
//	commands[command].res = out;
//}

function parseSockets(data){
	var arr = data.split('\n');
	//debugger;
	for (var i = 2;i<arr.length;i++){ //Start with the third line
	    
	    if (arr[i] == '') {//Empty line, usually end, skip
		continue;
	    }
	    if (arr[i].indexOf('Active Internet') != -1 && i == 0) {//First line, skip
		continue;
	    }
	    else if (arr[i].indexOf('Local Address') != -1) {//Header, create columns and skip
		continue;
	    }
	    else{
		var line = arr[i].split(/\s{1,}/);
		
		if (line[3].indexOf('127.0.0.1') != -1 && line[4].indexOf('127.0.0.1') != -1) { //Local socket, not interesting
			continue;
		}
		var socketId = line[7];//Socket Inode
		var laddr = line[3].split(':')[0];
		var lport = line[3].split(':')[1]
		var raddr = line[4].split(':')[0]
		var rport = line[4].split(':')[1]
		var pid = line[8].split('/')[0]
		var prog = line[8].split('/')[1]
		var proto = line[0];
		
		if (!tmp.trace) {
		    tmp.trace = {};
		}
		
		if (!tmp.trace.network) {
		    tmp.trace.network = {};
		}
		if (!tmp.trace.network[socketId]) {
		    tmp.trace.network[socketId] = {};
		}
		
		tmp.trace.network[socketId].PID = parseInt(pid);
		tmp.trace.network[socketId].local = laddr;
		tmp.trace.network[socketId].localport = parseInt(lport);
		tmp.trace.network[socketId].remote = raddr;
		tmp.trace.network[socketId].remoteport = parseInt(rport);
		tmp.trace.network[socketId].prog = prog;
		tmp.trace.network[socketId].protocol = proto;
		tmp.trace.network[socketId].socketid = socketId;
		//debugger;
	    }
	}
}

function parseSmem(command){
	//debugger;
	var arr = commands[command].out.split('\n');
	//var columns = [];
	out = [];
	for (var i=0;i<arr.length;i++){
		if(arr[i]=='')continue;
		arr[i]=arr[i].replace(/^\s+/,'').replace(/\s+$/,'');//trim leading spaces - who writes output like this?
		arr[i] = arr[i].split(/\s+/);
		//if (arr[i][0] == 'PV'){columns = arr[i];continue;};
		var o ={'pid':arr[i][0],'pss':arr[i][1]};
		//debugger;
		out.push(o);
	}
	commands[command].res = out;
}

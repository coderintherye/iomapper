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
global.oldTrace;

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


//Another take on matrix. Each cell indicates which template to target at that lod level. The search function will iterate
//up the config tree until that template is found, then stop
			//Device		LOD 0		LOD 1		LOD 2			LOD 3			LOD 4
global.lodMatrix =	{//'cluster':[		'self',		'self',		'parent',		'parent',		'node'],
			//'serverContainer':[	'self',		'self',		'parent',		'parent',		'node'],
			//'server':[		'self',		'self',		'self',			'self',			'node'],
			//'storage':[		'self',		'self',		'parent',		'parent',		'node'],
			//'clientContainer':[	'self',		'self',		'parent',		'parent',		'node'],
			'client':[		'self',		'self',		'self',			'self',			'node'],
			'componentContainer':[	'self',		'self',		'self',			'self',			'node'],
			'bond':[		'self',		'self',		'parent',		'componentContainer',	'node'],
			'nic':[			'self',		'self',		'componentContainer',	'componentContainer',	'node'],
			'socket':[		'self',		'self',		'componentContainer',	'componentContainer',	'node'],
			'vnic':[		'self',		'self',		'parent',		'componentContainer',	'node'],
			'cpu':[			'self',		'self',		'self',			'componentContainer',	'node'],
			'cpuCore':[		'self',		'self',		'cpu',			'componentContainer',	'node'],
			'proccpu':[		'self',		'self',		'cpu',			'componentContainer',	'node'],
			'ram':[			'self',		'self',		'self',			'componentContainer',	'node'],
			'procmem':[		'self',		'self',		'self',			'componentContainer',	'node'],
			'vms':[			'self',		'self',		'parent',		'componentContainer',	'node'],
			'vmserver':[		'self',		'self',		'parent',		'componentContainer',	'node'],
			'vmclient':[		'self',		'self',		'parent',		'componentContainer',	'node'],
			'vols':[		'self',		'self',		'parent',		'componentContainer',	'node'],
			'vg':[			'self',		'self',		'self',			'componentContainer',	'node'],
			'vgvol':[		'self',		'self',		'vg',			'componentContainer',	'node'],
			'vol':[			'self',		'self',		'self',			'componentContainer',	'node'],
			'procvol':[		'self',		'self',		'vols',			'componentContainer',	'node'],
			'raids':[		'self',		'self',		'self',			'componentContainer',	'node'],
			'lun':[			'self',		'self',		'parent',		'componentContainer',	'node'],
			'disk':[		'self',		'self',		'self',			'componentContainer',	'node'],
			'partition':[		'self',		'self',		'disk',			'componentContainer',	'node'],
			'procdisk':[		'self',		'self',		'raids',		'componentContainer',	'node'],
			'hba':[			'self',		'self',		'parent',		'componentContainer',	'node'],
			'controller':[		'self',		'self',		'parent',		'componentContainer',	'node']};


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
		commands.lvs = {cmd:'/sbin/lvs -o lv_name,vg_name,vg_size,lv_path,lv_size,lv_uuid,vg_uuid,lv_kernel_major,lv_kernel_minor --units b --nosuffix --separator ::',out:''};
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
	machineConfig.__config__.hostname = commands.topo.res.node.__config__.hostname;
	machineConfig.__config__.platform = os.arch();
	machineConfig.__config__.release = os.release();
	machineConfig.__config__.os = os.type();
	machineConfig.template = 'client';//Need to determine dynamically here if it's a server or a client;
	machineConfig.vector = -1;//Need to determine dynamically here if it's a server or a client;
	
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
	
	//debugger;

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
				//o.vols[vg][vol].template = 'vol';
				o.vols[vg][vol].template = 'vgvol';
				o.vols[vg][vol].__config__ = new Object();
				//o.vols[vg][vol].template = 'vol';
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
				o.vols[vg][vol].__config__.dst = o.vols[vg].__config__.dst;	//Copy VG destination PVs onto each volume
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
		
		tmp.result.netstat[laddr][lport].state = "LISTEN";
		
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
		tmp.result.network[socket_id].state = "ESTABLISHED";
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
    
    var cmd_line = new String();
    
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
    
    //PID Command Line - do only once per trace period:
    
    if (tmp.result.pids[pid] && tmp.result.pids[pid].cmdline) {
		//This process already has CMD Line, do nothing
		
	}
	else{
		try {
			//smaps = fs.readFileSync(PROC + pid.toString() + '/smaps',{encoding:"utf8"});
			cmd_line = fs.readFileSync(PROC + pid.toString() + '/cmdline',{encoding:"utf8"});
		    
		    } catch(e) {
			//console.log(e);
			//debugger;
			//return;
			var cmd_line_err = e;
		    }
		    
		    if (!cmd_line_err) {
			
			//var cmdline = cmd_line.split('\u0000');
			if (cmd_line == '') {
				var cmdline = proc_info.comm.replace('(','').replace(')','');
			}
			else{
				var cmdline = cmd_line.replace(/\u0000$/,'').replace(/\u0000/g,' ');
			}
			//debugger;
		    
		    }
	}
    
    
    
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
		//This process already has PSS calculated, do nothing
		//cmd_line = fs.readFileSync(PROC+'cmdline',{encoding:"utf8"});
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
		tmp.result.pids[pid].command = proc_info.comm.replace('(','').replace(')','');
		tmp.result.pids[pid].cmdline = cmdline;
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
		tmp.result.pids[pid].command = proc_info.comm.replace('(','').replace(')','');
		tmp.result.pids[pid].cmdline = cmdline;
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
			trace.processes[pid].cmd = tmp.result.pids[pid].cmdline;
			trace.processes[pid].processor = tmp.result.pids[pid].processor;
			//if (tmp.result.pids[pid].rchar != 0 && tmp.result.run_count >15) {
			//	debugger;
			//}
			
		}
		
		trace.network = tmp.result.network;
		//debugger;
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
		
		//Update in version 4: parse and convert old trace to format consumed by the GUI. Also calculate IO (pipes);
		
		prepTrace(trace);
		
		status.traceReady = true;
		//debugger;
		
		
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

function prepTrace(obj) {
	
	//Make sure CONFIG is there
	
	var traceHost = obj.id;
	//if (!hostConfigs[traceHost]) {
	//	console.log("No config present, can't process trace");
	//	return;
	//}
	var config = machineConfig;
	
	var newTrace = {};
	newTrace.devices = [];
	newTrace.io = [];
	var devices = {};
	//var oldTrace = JSON.stringify(obj);
	
	//New approach: insert the whole JSON into the DB, without disecting it first
	//Maybe later modify it a bit for easier reading/parsing - e.g. update HTML IDs, values, etc. before storing
	
	//var query = 'insert into IO (date,host,ts,json) values (?,?,?,?)';
	//var props = [date,traceHost,timestamp,oldTrace];
	//insert(query,props);
	//insertDone = true;
	//eventEmitter.once('trace_insert_complete',function(){console.log("Traces Inserted: ",insertCounter)})
	//return;
	
	//if(!config || !config.__config__ || !config.id){
	//	
	//}
	
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
	//ts = timestamp,
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
	attrs = {},
	ids = {};
	//io = [];
	
	ids.raids = new Object();
	ids.vols = new Object();
	var procPipes = [];
	

	if(obj.processes){
		//Some debugging - catching those pesky duplicate samples
		//var duplicateSamples = [];
		
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
			
			if (!devices[device_id]) {
				devices[device_id] = {};
				devices[device_id].samples = [];
				devices[device_id].name = '';
				devices[device_id].template = '';
			}
			
			devices[device_id].name = device_id;
			devices[device_id].template = type;
			//var desc = 'Process: '+obj.processes[a].name+' Util: '+metric_value;
			var desc = {'process':obj.processes[a].name,'command':obj.processes[a].cmd};
			var sample = {'name':uuid,'parent':device_id,'sizePercent':metric_value,'x':0,'y':metric_value,'desc':desc,'template':type};
			
			//if (duplicateSamples.indexOf(uuid) != -1) {
			//	debugger;
			//}
			//duplicateSamples.push(uuid);
			
			devices[device_id].samples.push([sample]);
			//}
			
			
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
			
			if (!devices[device_id]) {
				devices[device_id] = {};
				devices[device_id].samples = [];
				devices[device_id].name = '';
				devices[device_id].template = '';
			}
			
			devices[device_id].name = device_id;
			devices[device_id].template = type;
			//var desc = 'Process: '+obj.processes[a].name+' Util: '+metric_value;
			var desc = {'process':obj.processes[a].name,'command':obj.processes[a].cmd};
			var sample = {'name':uuid,'parent':device_id,'sizePercent':metric_value,'x':0,'y':metric_value,'desc':desc,'template':type};
			
		
			//
			devices[device_id].samples.push([sample]);
				
			//}
			
			//Create pipe between process and mem
			
			
			type = 'procpipe';
			html_id = htmlId(type,origin,parentB,'pipe');
			
			//stream_id = '0';
			//var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
			
			if (procPipes.indexOf(html_id) == -1) {
				//insert(pipesQuery,props);
				var pipe = {'name':html_id,'lbw':bwa,'origin':origin,'leftparent':origin,'rightparent':parentB,'rbw':bwb};
				newTrace.io.push(pipe);
			}

			
			//Add Pipe name to an array to prevent duplicate creations
			procPipes.push(html_id);
			
			
			
			if(obj.processes[a].diskio){				
				
				//debugger;
				//type = 'mempipe';
				var memSampleOrigin = parentB;
				
				for (var b in obj.processes[a].diskio){
					
					
					//If this is a volume with FS, create sample, and immediately create samples in all destinations
					//If this is not a volume, but direct-to-disk, create a sample on disk
					
					var dev = b.replace('/dev/','');
					
					walk(config.vols,matchVolId);
					
					walk(config,matchDiskId);
					
					if (ids.vols[dev]) {	//This is a volume
						
						//Create VOLUME sample:
						device_id = ids.vols[dev].id;
						type = 'procvol';
						metric_name = 'processVolReadUtil';
						metric_value = obj.processes[a].diskio[b].readOpsSec;	//Note: if it's zero, maybe calculate sum of read+write
						
						uuid = htmlId(type,host,metric_name,pid,dev);
						origin = memSampleOrigin;
						parentB = uuid;
						bwb = metric_value;
						if (!devices[device_id]) {
							devices[device_id] = {};
							devices[device_id].samples = [];
							devices[device_id].name = '';
							devices[device_id].template = '';
						}
						
						
						devices[device_id].name = device_id;
						devices[device_id].template = type;
						var desc = {'process':obj.processes[a].name,'command':obj.processes[a].cmd};
						var sample = {'name':uuid,'parent':device_id,'sizePercent':metric_value,'x':0,'y':metric_value,'desc':desc,'template':type};
						//if (duplicateSamples.indexOf(uuid) != -1) {
						//	debugger;
						//}
						//duplicateSamples.push(uuid);
						devices[device_id].samples.push([sample]);
						
						
						//Create PIPE between Memory and VOLUME sample:
						
						type = 'mempipe';
						html_id = htmlId(type,origin,parentB,'pipe');
						
						
						if (procPipes.indexOf(html_id) == -1) {
							var pipe = {'name':html_id,'lbw':bwa,'origin':origin,'leftparent':origin,'rightparent':parentB,'rbw':bwb};
							newTrace.io.push(pipe);
						}
						
						//Add Pipe name to an array to prevent duplicate creations
						procPipes.push(html_id);
						
						//Create VOLUME DESTINATION (disk) sample(s):
						
						if (!ids.vols[dev].dst) {
							console.log('Volume Destination not found');
						}
						
						var srcdev = dev;
						
						origin = parentB;	//Origin for all DST pipes is the current sample;
						
						for (var dst in ids.vols[srcdev].dst){
							var dev = ids.vols[srcdev].dst[dst].kname;
							
							if(!ids.raids[dev]){//If ID hasn't been found yet
								//debugger;
								walk(config,matchDiskId);//Find ID - only look in physical devices (skip dm-0 kind of devices)
								//if(!ids.raids[dev] || !ids.raids[dev].origin || !ids.raids[dev].parentB){continue}//If ID still not found - skip
								if(!ids.raids[dev]){console.log('Dest disk ID not found');continue}//If ID still not found - skip
								else{device_id = ids.raids[dev].id}
							}
							else{
								device_id = ids.raids[dev].id;
							}
							
							
							type = 'procdisk'
							metric_name = 'processDiskReadUtil';
							metric_value = obj.processes[a].diskio[b].readOpsSec;
							
							//
							//debugger;
							//BUG! here, process may be running to the volume AND to the device directly. Will create
							//duplicate IDs for two perfectly independent io streams
							//Add "srcdev" to the UUID string to prevent duplicates?
							uuid = htmlId(type,host,metric_name,pid,srcdev+'_'+dev);
							parentB = uuid;
							bwb = metric_value;
							
							if (!devices[device_id]) {
								devices[device_id] = {};
								devices[device_id].samples = [];
								devices[device_id].name = '';
								devices[device_id].template = '';
							}
							
							devices[device_id].name = device_id;
							devices[device_id].template = type;
							
							var desc = {'process':obj.processes[a].name,'command':obj.processes[a].cmd};
							var sample = {'name':uuid,'parent':device_id,'sizePercent':metric_value,'x':0,'y':metric_value,'desc':desc,'template':type};
							//if (duplicateSamples.indexOf(uuid) != -1) {
							//	debugger;
							//}
							//duplicateSamples.push(uuid);
							
							devices[device_id].samples.push([sample]);
							
							//Create pipe between Vol and Raid/Disk
							//Create PIPE(s) between VOLUME and its DESTINATION(s)
							
							type = 'volpipe';
							html_id = htmlId(type,origin,parentB,'pipe');
							
							//stream_id = '0';
							//var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
							
							if (procPipes.indexOf(html_id) == -1) {
								//insert(pipesQuery,props);
								var pipe = {'name':html_id,'lbw':bwa,'origin':origin,'leftparent':origin,'rightparent':parentB,'rbw':bwb};
								newTrace.io.push(pipe);
							}
							//else{console.log('Pipe ',html_id,' exists, skipping insert')}
							
							//Add Pipe name to an array to prevent duplicate creations
							procPipes.push(html_id);
						}
					}
					
					
					var dev = b.replace('/dev/','');	//Refresh "dev" as it may have changed recently
					
					if (!ids.vols[dev] && ids.raids[dev]) {	//This is NOT a volume, but it IS A RAW DISK (direct IO)
						
						//Create DISK sample:
						
						device_id = ids.raids[dev].id;
						type = 'procdisk';
						metric_name = 'processDiskReadUtil';
							
						origin = memSampleOrigin;//From the MEM sample
					
						metric_value = obj.processes[a].diskio[b].readOpsSec;	//Note: if it's zero, maybe calculate sum of read+write
						
						uuid = htmlId(type,host,metric_name,pid,dev);
						parentB = uuid;
						bwb = metric_value;
						if (!devices[device_id]) {
							devices[device_id] = {};
							devices[device_id].samples = [];
							devices[device_id].name = '';
							devices[device_id].template = '';
						}
						
						devices[device_id].name = device_id;
						devices[device_id].template = type;
						//var desc = 'Process: '+obj.processes[a].name+' Util: '+metric_value;
						var desc = {'process':obj.processes[a].name,'command':obj.processes[a].cmd};
						var sample = {'name':uuid,'parent':device_id,'sizePercent':metric_value,'x':0,'y':metric_value,'desc':desc,'template':type};
						//if (duplicateSamples.indexOf(uuid) != -1) {
						//	debugger;
						//}
						//duplicateSamples.push(uuid);
						
						devices[device_id].samples.push([sample]);
						
						//Create PIPE betwen MEMORY and DISK sample:
						
						type = 'mempipe';
						html_id = htmlId(type,origin,parentB,'pipe');
						
						//stream_id = '0';
						//var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
						
						if (procPipes.indexOf(html_id) == -1) {
							//insert(pipesQuery,props);
							var pipe = {'name':html_id,'lbw':bwa,'origin':origin,'leftparent':origin,'rightparent':parentB,'rbw':bwb};
							newTrace.io.push(pipe);
						}
						//else{console.log('Pipe ',html_id,' exists, skipping insert')}
						
						//Add Pipe name to an array to prevent duplicate creations
						procPipes.push(html_id);
					}
					
					if (!ids.vols[dev] && !ids.raids[dev]) {//This is not a volume, and disk not found. PANIC!
						
						console.log('No volume found, no destination disk, skipping...');
						
					}
					
					
					//debugger;
				}
			}
		}
		//debugger;
	}
	
	if(obj.network){
		//debugger;
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
			var socketId = obj.network[a].local+'_'+obj.network[a].localport.toString()+'_'+obj.network[a].socketid;
			uuid = htmlId(type,host,metric_name,socketId);
			obj.network[a].uuid = uuid;
			if (uuid.indexOf('undefined') != -1) {
				debugger;
			}
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
			
			var RXbps = obj.network[a].bytesReceivedPerSec;
			var TXbps = obj.network[a].bytesSentPerSec;
			
			//In bits per second:
			metric_value = metric_value*8;
			
			//In percent:
			metric_value = metric_value/(speed/100)
			
			laddr = obj.network[a].local;
			lport = obj.network[a].localport.toString();
			raddr = obj.network[a].remote;
			rport = obj.network[a].remoteport.toString();
			
			var pid = obj.network[a].PID;
			var cmd = obj.network[a].prog;
			var state = obj.network[a].state;
			var lmac = obj.network[a].MAC;
			var rmac = obj.network[a].RMAC; if (!rmac) {rmac = "none"};
			
			var read = obj.network[a].bytesReceivedPerSec;
			var write = obj.network[a].bytesSentPerSec;
			
			var socketid = obj.network[a].socketid;
			
			if (pid == undefined) {
				debugger;
			}
			
			if (!devices[device_id]) {
				devices[device_id] = {};
				devices[device_id].samples = [];
				devices[device_id].name = '';
				devices[device_id].template = '';
			}
			
			devices[device_id].name = device_id;
			devices[device_id].template = type;
			var socketProps = {'laddr':laddr,'lport':lport,'raddr':raddr,'rport':rport,'pid':pid,'cmd':cmdCount,'state':state,'lmac':lmac,'rmac':rmac,'socketid':socketid,'RXbps':RXbps,'TXbps':TXbps};
			var desc = 'Network Socket: Local:'+laddr+':'+lport+' Remote:'+raddr+':'+rport+' RXbps:'+RXbps+' TXbps:'+TXbps+' PID:'+pid+' CMD:'+cmd;
			var sample = {'name':uuid,'parent':device_id,'sizePercent':metric_value,'x':0,'y':metric_value,'desc':desc,'template':type,'socket':socketProps};
			
			//if (duplicateSamples.indexOf(uuid) != -1) {
			//	debugger;
			//}
			//duplicateSamples.push(uuid);
			
			devices[device_id].samples.push([sample]);
			
			//Bug here: target process could be part of the "zero" group
			
			origin = uuid;
			parentB = htmlId('proccpu',host,'processCpuUtil',obj.network[a].PID);
			type = 'nicpipe';
			html_id = htmlId(type,origin,parentB,'read');
			bwa = obj.network[a].bytesReceivedPerSec;bwb = bwa;
			//stream_id = '0';
			if(bwa != 0){
				//var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
				//insert(pipesQuery,props);
				var pipe = {'name':html_id,'lbw':bwa,'origin':origin,'leftparent':origin,'rightparent':parentB,'rbw':bwb};
				newTrace.io.push(pipe);
			}
			html_id = htmlId(type,origin,parentB,'write');
			bwa = obj.network[a].bytesSentPerSec;bwb = bwa;
			if(bwa != 0){
				//var props = [type,ts,html_id,origin,parentB,bwa,bwb,stream_id];
				//insert(pipesQuery,props);
				var pipe = {'name':html_id,'lbw':bwa,'origin':origin,'leftparent':origin,'rightparent':parentB,'rbw':bwb};
				newTrace.io.push(pipe);
			}
			//if (pid == 10178) {
			//	debugger;
			//}
			//Create NETPIPE;
			//debugger;
			//createNetPipe(obj.network[a])
		}
	}
	
	for (var device in devices){
		newTrace.devices.push(devices[device]);
	}
	
	
	
	oldTrace = JSON.stringify(trace)
	trace = [];
	trace[0] = newTrace;
	trace[0].id = config.id;
	
	lod(trace);
	
	
	var duplicates = findDuplicateSamples(trace[0]);
        if (duplicates.length > 0) {
                console.log('Duplicates Found!!: ');
		debugger;
        }
	for (var c = 0; c < trace[0].io.length; c++){
		if (trace[0].io[c].name.indexOf('undefined') != -1) {
			debugger;
		}
	}	
	
	//debugger;
	
	//console.log("Traces to Insert: ",traceCounter);
	//insertDone = true;
	//eventEmitter.once('trace_insert_complete',function(){console.log("Traces Inserted: ",insertCounter)})
	
	function lod(trace){
		//The "trace" argument should be an object {devices:[],io:[]}
		
		//debugger;
		
		zeroSamples(trace[0]);	//Run zero samples on basic LOD 0 trace
		
		
		lod_level(trace,1);
		lod_level(trace,2);
		lod_level(trace,3);
		lod_level(trace,4);
        
		function lod_level(trace,level){
			//LOD 1: CPUCore, Membank, and NIC samples collapsed into consolidated groups (potentially disk/fs samples if I end up making them, which I will)
			//Creates a new trace, maybe add to existing one?
			
			//	LOD 1: CPUCore, Membank, and NIC samples collapsed into consolidated groups (potentially disk/fs samples if I end up making them, which I will)
               		//	Partitions disappear; individual LVs disappear; samples consolidated
			
			//var lod_level = level;
			
			var base = trace[level - 1];	//The previous level to use to calculate this LOD from
			
			var suffix = '_lod_'+level.toString();
			
			//debugger;
			var newPipeParents = {}; //This variable will hold a map of sample IDs against IDs of groups they were collapsed into
						 //e.g. {sample_name:lod_group_name}
						 //will be used to find which pipes need to be created
			
			for(var a = 0; a < base.devices.length; a++){  //Iterate through all devices
				if (!base.devices[a].samples || base.devices[a].samples.length == 0) {
					continue;
				}
				
				var lod_exists = 0;
				var lod_sum_value = 0;
				//debugger;
				
				for (var b = 0; b < base.devices[a].samples.length; b++){//Iterate through this device's samples
					
					lod_sum_value = lod_sum_value + base.devices[a].samples[b][0].sizePercent;
					
					//if (trace.devices[a].samples[b][0].sizePercent <= minSampleValue) {
					if (lod_exists == 0) { //Create lod-group sample for the first time;
						var lodSample = {};
						//lodSample.name = base.devices[a].name + suffix;
						lodSample.template = base.devices[a].template;
						//lodSample.parent = trace.devices[a].name;
						lodSample.parent = getLodSampleParent(base.devices[a],level);
						
						lodSample.name = lodSample.parent + suffix;
						
						lodSample.sizePercent = lod_sum_value;
						lodSample.y = lod_sum_value;
						lodSample.x = 0;
						lodSample.desc = {'description':'LOD ' + level.toString() + ' Group'};
						
						
						//lodSample.samples = [];
						
						
						lod_exists = 1;
					}
					
					base.devices[a].samples[b][0].lodParent = lodSample.name;	//Keep pointer to LOD parent on every sample. Saves time later
					
					lodSample.sizePercent = lod_sum_value;
					lodSample.y = lod_sum_value;
					//lodSample.samples.push(trace.devices[a].samples[b]);
					
					//Update a list of pipe endpoints with a new endpoint name
					newPipeParents[base.devices[a].samples[b][0].name] = lodSample.name;
					
					//trace.devices[a].samples.splice(b,1);
					//b = b-1;
						
						
					//}
				}
				//Create LOD section in the global trace object:
				//if (!trace.lod) {
				//	trace.lod = {};
				//}
				if (!trace[level]) {
					trace[level] = {};
				}
				if (!trace[level].devices) {
					trace[level].devices = [];
				}
				if (!trace[level].io) {
					trace[level].io = [];
				}
				
				var parentName = getLodSampleParent(base.devices[a],level);
				
				//debugger;
				
				var device = {};	//Initialize device to reset on each loop iteration
				
				for(var c = 0; c < trace[level].devices.length; c++){
					if (trace[level].devices[c].name == parentName) {	//Device exists
						var device = trace[level].devices[c];
						
						//Starting with LOD 1, there should be only one sample per parent device.
						//Confirm if a sample exists, and if yes, expand it
						if (device.samples && device.samples.length > 0){
							device.samples[0][0].sizePercent += lodSample.sizePercent;
							//...and... update new pipe endpoints! crap!
							for(var p in newPipeParents){
								if (newPipeParents[p] == lodSample.name) {
									newPipeParents[p] = device.samples[0][0].name;
								}
							}
						}
						else{
							device.samples.push([lodSample]);
						}
						//debugger;
					}
				}
				
				if (!device.name) {		//Device not found, adding
					var device = {};
					device.samples = [];
					device.samples.push([lodSample]);
					device.name = parentName;//getLodSampleParent(base.devices[a],level);
					device.template = base.devices[a].template;
					trace[level].devices.push(device);
				}
				
			}
			
			//debugger;
			
			var lodPipes = {};
			
			for(var a = 0; a < base.io.length; a++){       //Iterate through existing pipes (maybe only netpipes if you want to offload it to agents). netPipes variable isn't visible
									//here, but we can expose it via argument or somesuch
				
				var pipe = {};
				
				var lp = base.io[a].leftparent;
				var rp = base.io[a].rightparent;
				var origin = base.io[a].origin;
				
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
				
				
				var pipeName = parentA + '_' + parentB + suffix;
				
				if (!lodPipes[pipeName]) {      //LOD pipe doesn't exist, create first placeholder
					lodPipes[pipeName]  = {};
					lodPipes[pipeName].name = pipeName;
					lodPipes[pipeName].leftparent = pipe.leftparent;
					lodPipes[pipeName].rightparent = pipe.rightparent;
					lodPipes[pipeName].origin = pipe.origin;
					lodPipes[pipeName].lbw = base.io[a].lbw;
					lodPipes[pipeName].rbw = base.io[a].rbw;
				}
				else{
					lodPipes[pipeName].lbw = lodPipes[pipeName].lbw + base.io[a].lbw;
					lodPipes[pipeName].rbw = lodPipes[pipeName].rbw + base.io[a].rbw;
				}
				
			}
			for (var pipe in lodPipes){
				
				trace[level].io.push(lodPipes[pipe])
			}
			
			//debugger;
		}
		
//		function lod_level_2(trace){
//			//	LOD 2: All CPUCore samples collapsed into one group per socket
//                        //	 Client-side LOD hides individual cores
//			
//			
//		}
		
		
		function zeroSamples(trace,value){
			//Function to collapse zero-value (or some small value) samples into a group
			//Should be reusable as I may want to migrate it off to the agents
			//Should fix both device samples and IO pipes?
			
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
						
						trace.devices[a].samples.splice(b,1);	//Remove this sample from device
						b = b - 1;
						
						
					}
				}
				if (zero == 1) {	//If zero-sample was created for this device...
					trace.devices[a].samples.push([zeroSample]);//Add zero-sample group to this device. Hope everything's there!
				}
				
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
		
		function getLodSampleParent(deviceSamples,lod_level){
			
			//Function determines where to attach the aggregated LOD sample
			
			//debugger;
			//Name of device the sample(s) are attached to
			//This 'name' key is actually a name of device the sample was collected from
			
			var name = deviceSamples.name;
			
			//The actual device
			var device = walk(config,findDevice,name);
			if (!device || !device.template) {
				console.log('Device not found! Name: ',name);
				debugger;
				return name;
			}
			//Template of the sample device, e.g. "cpuCore"
			var template = device.template;
			
			//Here, we determine which parent device we should attach the LOD sample to
			//It could be the original device (i.e. all samples collapsed into one)
			//Or it could be the parent, or the parent of the parent
			//lodMatrix is consulted to determine
			//debugger;
			if (!lodMatrix[template]) {
				console.log('lodMatrix miss, template: ',template);
				return name;
			}
			if (!lodMatrix[template][lod_level]) {
				console.log('lodMatrix miss, template: ',template,' lod level: ',lod_level);
				return name;
			}
			//if (!parent || !parent.id) {
			//	//Probably reached the highest level of config
			//	console.log('No parent found, template: ',template,' device ID: ',device.id);
			//	return device.id;
			//}
			var lodParent = lodMatrix[template][lod_level];
			
			if (lodParent == 'self') {
				return device.id;
			}
			if (lodParent == 'node') {
				return config.id;
			}
			
			//If we didn't return by now, need to search for lodParent up the tree:

			var parentId = device.parent;
			var parentTemplate = '';

			while(parentTemplate != lodParent){
				var parent = walk(config,findDevice,parentId);
				if (!parent || !parent.id) {
					//Probably reached the highest level of config
					console.log('No parent found, template: ',template,' device ID: ',parentId);
					debugger;
					return parentId;
				}
				parentId = parent.parent;
				parentTemplate = parent.template;
				
				if (!parent.template) {
					debugger;
				}
			}
			//debugger;
			return parent.id;
		}
		
	}
	
	
	function walk(obj,action,arg){
		for(var leaf in obj){
			if(obj.hasOwnProperty(leaf)){
				var value = obj[leaf];
			      
				if(typeof value === 'object'){//do stuff
					var result = action(value,leaf,obj,arg);	//Run the callback function 
					if (result == false || result == undefined) {	//If the callback function wants to continue
						result = walk(value,action,arg);
					}
					if (result != false && result != undefined){
						//debugger;
						return result;
					}
				}
			}
		}
		//return result;
	}
	function findDevice(value,leaf,obj,uuid){
		//debugger;
		if (obj.id) {
			var id = obj.id;
			if (id == uuid) {
				return obj;
			}
		}
		if(value.id){
			var id = value.id;
			if (id == uuid) {
				//var parentName = value.parent;
				//debugger;
				return value;	//Finished
			}
			else{
				return false;	//Keep going;
			}
		}
		return false;
	}
	
	function findParent(value,leaf,obj,uuid){
		//debugger;
		if(value.id){
			var id = value.id;
			if (id == uuid && value.parent) {
				//var parentName = value.parent;
				//debugger;
				return obj;	//Finished
			}
			else{
				return false;	//Keep going;
			}
		}
		return false;
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
				if (value.__config__.dst) {
					ids.vols[dev].dst = value.__config__.dst;
				}
				//debugger;
			}
		}
		return false;	//Keep going;
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
		return false;	//Keep going;
	};
	function matchNicId(value,leaf,obj){
		//if(leaf == dev){
			//console.log(leaf);console.log(obj);
		if(value.id){
			var id = value.id;
			if (value.__config__ && value.__config__.ips && value.__config__.ips instanceof Array){
				for (var a = 0; a < value.__config__.ips.length; a++){
					if(value.__config__.ips[a].address == dev){
						if(!ids[dev]){ids[dev] = new Object(); ids[dev].id = id;ids[dev].device_name = leaf};
						return true;	//Finished;
					}
				}
			}
			//if(!ids[dev]){ids[dev] = new Object(); ids[dev].id = id;}
		}
		return false;	//Keep going;
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
				if(!ids.cpus[dev]){ids.cpus[dev] = new Object(); ids.cpus[dev].id = id;ids.cpus[dev].device_name = leaf};
				return true;	//Finished
					//}
				//}
			}
			//if(!ids[dev]){ids[dev] = new Object(); ids[dev].id = id;}
		}
		return false;	//Keep going;
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
		return false;	//Keep going;
	};
	function htmlId(type,base,suffix,uid,uid2){
		var id;
		switch(type){
			case 'proccpu':
				id = base+'_'+suffix+'_'+uid;//uuid = htmlId(type,host,metric_name,pid);
				return id;
				break;
			case 'procmem':
				id = base+'_'+suffix+'_'+uid;
				return id;
				break;
			case 'procvol':
				id = base+'_'+suffix+'_'+uid+'_'+uid2;//uuid = htmlId(type,host,metric_name,pid,dev);
				return id;
				break;
			case 'procdisk':
				id = base+'_'+suffix+'_'+uid+'_'+uid2;//uuid = htmlId(type,host,metric_name,pid,dev);uuid = htmlId(type,host,metric_name,pid,dev);
				return id;
				break;
			case 'socket':
				id = base+'_'+suffix+'_'+uid; //htmlId(type,host,metric_name,socketId);
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
	};
	
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
			tmp.result.PhysIO[dev].readOpsSec = 0;
			tmp.result.PhysIO[dev].writeOpsSec = 0;
			tmp.result.PhysIO[dev].totalReadOps = 0;
			tmp.result.PhysIO[dev].totalWriteOps = 0;
			tmp.result.PhysIO[dev].readBytesSec = 0;
			tmp.result.PhysIO[dev].writeBytesSec = 0;
		}
		
		tmp.result.PhysIO[dev].readOpsSec = tmp.result.PhysIO[dev].readOpsSec + Math.round(readBlocks / (traceInterval/1000));
		tmp.result.PhysIO[dev].writeOpsSec = tmp.result.PhysIO[dev].writeOpsSec + Math.round(writeBlocks / (traceInterval/1000));
		tmp.result.PhysIO[dev].totalReadOps = tmp.result.PhysIO[dev].totalReadOps + readBlocks;
		tmp.result.PhysIO[dev].totalWriteOps = tmp.result.PhysIO[dev].totalWriteOps + writeBlocks;
		tmp.result.PhysIO[dev].readBytesSec = tmp.result.PhysIO[dev].readBytesSec + Math.round(readBlocks * sector_size / (traceInterval/1000));
		tmp.result.PhysIO[dev].writeBytesSec = tmp.result.PhysIO[dev].writeBytesSec + Math.round(writeBlocks * sector_size / (traceInterval/1000));
		
		//debugger;
		
		if (tmp.result.pids[pid]) {
			if (!tmp.result.pids[pid].diskio) {
				tmp.result.pids[pid].diskio = {};
			}
			if (!tmp.result.pids[pid].diskio[dev]) {
				tmp.result.pids[pid].diskio[dev] = {};
				tmp.result.pids[pid].diskio[dev].readOpsSec = 0;
				tmp.result.pids[pid].diskio[dev].writeOpsSec = 0;
				tmp.result.pids[pid].diskio[dev].totalReadOps = 0; 
				tmp.result.pids[pid].diskio[dev].totalWriteOps = 0;
				tmp.result.pids[pid].diskio[dev].readBytesSec = 0; 
				tmp.result.pids[pid].diskio[dev].writeBytesSec = 0;
				//debug
				tmp.result.pids[pid].phys_write_bytes = 0;
				tmp.result.pids[pid].phys_read_bytes = 0;
			}
			tmp.result.pids[pid].diskio[dev].readOpsSec = tmp.result.pids[pid].diskio[dev].readOpsSec + Math.round(readBlocks / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].writeOpsSec = tmp.result.pids[pid].diskio[dev].writeOpsSec + Math.round(writeBlocks / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].totalReadOps = tmp.result.pids[pid].diskio[dev].totalReadOps + readBlocks;
			tmp.result.pids[pid].diskio[dev].totalWriteOps = tmp.result.pids[pid].diskio[dev].totalWriteOps + writeBlocks;
			tmp.result.pids[pid].diskio[dev].readBytesSec = tmp.result.pids[pid].diskio[dev].readBytesSec + Math.round(readBlocks * sector_size / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].writeBytesSec = tmp.result.pids[pid].diskio[dev].writeBytesSec + Math.round(writeBlocks * sector_size / (traceInterval/1000));
			//debug
			tmp.result.pids[pid].phys_write_bytes = tmp.result.pids[pid].phys_write_bytes + (writeBlocks * sector_size);
			tmp.result.pids[pid].phys_read_bytes = tmp.result.pids[pid].phys_read_bytes + (readBlocks * sector_size);
		}
		else if (!tmp.result.pids[pid]) {
			//console.log('short-lived process: ',arr[a])
			tmp.result.pids[pid] = {};
			if (!tmp.result.pids[pid].diskio) {
				tmp.result.pids[pid].diskio = {};
			}
			if (!tmp.result.pids[pid].diskio[dev]) {
				tmp.result.pids[pid].diskio[dev] = {};
				tmp.result.pids[pid].diskio[dev].readOpsSec = 0;
				tmp.result.pids[pid].diskio[dev].writeOpsSec = 0;
				tmp.result.pids[pid].diskio[dev].totalReadOps = 0; 
				tmp.result.pids[pid].diskio[dev].totalWriteOps = 0;
				tmp.result.pids[pid].diskio[dev].readBytesSec = 0; 
				tmp.result.pids[pid].diskio[dev].writeBytesSec = 0;
				//debug
				tmp.result.pids[pid].phys_write_bytes = 0;
				tmp.result.pids[pid].phys_read_bytes = 0;
			}
			tmp.result.pids[pid].diskio[dev].readOpsSec = tmp.result.pids[pid].diskio[dev].readOpsSec + Math.round(readBlocks / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].writeOpsSec = tmp.result.pids[pid].diskio[dev].writeOpsSec + Math.round(writeBlocks / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].totalReadOps = tmp.result.pids[pid].diskio[dev].totalReadOps + readBlocks;
			tmp.result.pids[pid].diskio[dev].totalWriteOps = tmp.result.pids[pid].diskio[dev].totalWriteOps + writeBlocks;
			tmp.result.pids[pid].diskio[dev].readBytesSec = tmp.result.pids[pid].diskio[dev].readBytesSec + Math.round(readBlocks * sector_size / (traceInterval/1000));
			tmp.result.pids[pid].diskio[dev].writeBytesSec = tmp.result.pids[pid].diskio[dev].writeBytesSec + Math.round(writeBlocks * sector_size / (traceInterval/1000));
			//debug
			tmp.result.pids[pid].phys_write_bytes = tmp.result.pids[pid].phys_write_bytes + (writeBlocks * sector_size);
			tmp.result.pids[pid].phys_read_bytes = tmp.result.pids[pid].phys_read_bytes + (readBlocks * sector_size);
			
			
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
	//debugger;
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
				content = JSON.stringify(trace);
				respond(content);
			}
			break;
		case '/oldtrace':
			if (!status.traceReady) {
				reject('Trace not ready');
			}
			else{
				content = oldTrace;
				respond(content);
			}
			break;	

			//break;
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
		//Remove the access control header later;
		response.writeHead(200, { 'Content-Type': 'application/json','Access-Control-Allow-Origin':'*'  });
		response.end(data, 'utf-8');
		//console.log("Machine config sent")
		console.log("Response success. URL: ",url);
	}
	
}).listen(8125);
console.log('Server listening on port 8125');

	  
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








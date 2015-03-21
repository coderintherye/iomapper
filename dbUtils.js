var child = require('child_process'),
        fs = require('fs'),
	http = require('http'),
	events = require('events'),
	eventEmitter = new events.EventEmitter(),
	DB = require('node-cassandra-cql').Client,
	os = require('os'),
	dbhosts = [];//Database host
        
//debugger;

var usage = 'Usage: node dbUtils.js [action] <host>. Actions are: create, erase, drop, verify. Host is your Cassandra instance, default is local hostname.'

process.on('SIGINT',exit);

//Verify arguments
if (process.argv.length < 3) {
	console.log(usage);
	return;
}

if (process.argv[3]) {
	var hostname = process.argv[3];
	dbhosts.push(hostname);
	var db = new DB({hosts:dbhosts,keyspace:'iomapper'});
}
else{
	var hostname = os.hostname();
	dbhosts.push(hostname);
	var db = new DB({hosts:dbhosts,keyspace:'iomapper'});
}

var action = process.argv[2];

switch(action){
	case 'erase':
		eraseDb();
		break;
	case 'create':
		console.log('Not implemented yet');
		break;
	case 'drop':
		console.log('Not implemented yet');
		break;
	case 'verify':
		console.log('Not implemented yet');
		break;
	default:
		console.log(usage);
		return;
}

function exit(){
	db.shutdown(function(){console.log("Shutting down database connection");
		    console.log("about to exit");
		    process.exit();
		    })
}


function eraseDb(){
	
	var status = {'map':0,'io':0};
	eventEmitter.on('done',function(){
		done = 1;
		for (var task in status){
			if (status[task] == 0) {
				done = 0;
			}
		}
		if (done == 1) {
			console.log('All tasks done, exiting...');
			exit();
		}
	})
	
	
	eraseIo();
	
	eraseMapper();
	
	function eraseIo(){
		console.log('Erasing IO...')
		var query = 'select date,host from io limit 50';
		var props = [];
		db.execute(query,props,function(err,result){
			if (err) {console.log('ERROR: ',err);return}
			
			if (result.rows.length == 0) {
				//No more items left, exiting
				console.log('No more IO items left, exiting...');
				status.io = 1;
				eventEmitter.emit('done');
				return;
			}
			debugger;
			var date = result.rows[0]['date'];
			
			var hosts = [];
			for(var a = 0; a < result.rows.length; a++){
				hosts.push(result.rows[a]['host']);
			}
			
			hosts = hosts.filter (function (v, i, a) { return a.indexOf (v) == i });
			
			var props = [date].concat(hosts);
			
			var params = [];
				
			for (var a = 0; a<hosts.length; a++){params.push('?')};
			
			var params = params.join();
			
			var query = 'delete from io where date=? and host in (' + params + ')';				
			
			db.execute(query,props,function(err,res){
				if (err) {console.log('ERROR: ',err);return};
				//Rinse and repeat
				eraseIo();
				
			})
		
		})
	}
	function eraseMapper(){
		console.log('Erasing Mapper...')
		var query = 'select html_id from mapper limit 50';
		var props = [];
		db.execute(query,props,function(err,result){
			if (err) {console.log('ERROR: ',err);return}
			
			if (result.rows.length == 0) {
				//No more items left, exiting
				console.log('No more MAPPER items left, exiting...');
				status.map = 1;
				eventEmitter.emit('done');
				return;
			}
			debugger;
			//var date = result.rows[0]['date'];
			
			var html_ids = [];
			for(var a = 0; a < result.rows.length; a++){
				html_ids.push(result.rows[a]['html_id']);
			}
			
			html_ids = html_ids.filter (function (v, i, a) { return a.indexOf (v) == i });
			
			var props = html_ids;
			
			var params = [];
				
			for (var a = 0; a<html_ids.length; a++){params.push('?')};
			
			var params = params.join();
			
			var query = 'delete from mapper where html_id in (' + params + ')';				
			
			db.execute(query,props,function(err,res){
				if (err) {console.log('ERROR: ',err);return};
				//Rinse and repeat
				eraseMapper();
				
			})
		
		})
	}
}
//Map Build timers:
var timerStart=0;
var timerDelay=30; //Delay before start building the next object

//Redraw Timers:
var redrawTimer=15000;

var intervals=new Array();

var mapGenerator;

var globalTrace;

var updateLog = [];

var updateLogHistoryToKeep = 10; //The system keeps history for replay (debugging). How many refreshes to keep

var globalStatus = {};          //Keeps various status flags

var agentTrace = {};            //Will keep a trace downloaded directly from agent. Debug
//mapGenerator is the JSON blob being loaded
//d3.json("mapgenerator.full.json",function(blob){
//d3.json("http://raptor:8888/map",function(blob){
//        buildMap(blob);
//        mapGenerator=blob;
//        console.log("Time to build the Map : ",timerStart/1000," seconds");timerStart=timerStart+2000;
//        setTimeout(mapReady,timerStart);
//    }
//)

redrawMap();

function buildMap(blob){

    walk(blob);
    function walk(obj){
        for(var leaf in obj){
            if(obj.hasOwnProperty(leaf)){
              var value = obj[leaf];
              //console.log('Field: ', leaf,' Value: ',value, ' Parent: ',obj.id, ' Depth: ',depth);
              if(typeof value === 'object' && leaf!="__config__"){

                setTimeout(createItem,timerStart,value);timerStart=timerStart+timerDelay;
                setTimeout(position,timerStart,value.id,-1,-1,-1,-1);
                setTimeout(focusAndCenter,timerStart);

                walk(value);
              }
            }
        }
    }
}

function mapReady(){
    console.log("Map Ready...");
    
    document.addEventListener("webkitvisibilitychange", handleVisibilityChange, false);
    
    function handleVisibilityChange(){
        console.log("Changing visibility: "+document.webkitVisibilityState)
        if (document.webkitHidden) {
            pauseMap();
        } else {
            //unpauseMap();
        }
    }
        
    handleVisibilityChange();
    
    d3.select('.playback').select('img').on('click',unpauseMap);
    
}

function unpauseMap(){
        console.log("Map Updating...")
        pauseMap();
        globalStatus.mapPaused = 0;
        update();
        intervals.push(setInterval(update,redrawTimer))
        d3.select('.playback').select('img').on('click',pauseMap);
}
function pauseMap(){
        
        for (var i=0;i<intervals.length;i++){
                console.log("Map Paused...")
                clearInterval(intervals[i]);
        }
        intervals.length=0;
        globalStatus.mapPaused = 0;
        d3.select('.playback').select('img').on('click',unpauseMap);
}

//viewport.setAttribute("transform","scale(0.1,0.1)")

//viewport.setAttribute("transform","scale(1,1)")

function update(items){
    //CPU Cores
    //cpus=d3.select("#viewport").selectAll(".cpuCore");
    //RAM
    //ram=d3.select("#viewport").selectAll(".ram");
    //RAM
    //nics=d3.select("#viewport").selectAll(".nic");
    
    //var devices = d3.select("#viewport").selectAll(".cpuCoreGroup,.ramGroup,.nicGroup");
    //var devices = d3.select("#viewport").selectAll(".cpuCore,.ram,.nic");
    
    //Pipes
    //pipeCollection=d3.select("#viewport").selectAll(".pipe");
    
    //var metrics;
    //var template;
    //var cpuMetrics,ramMetrics,pipeMetrics;
    
    var trace = {};
    
    //Download the CSV data
    //var metricsUrl="cpuCoreSamples.csv";
    
    var traceUrl = "http://raptor:8888/trace"
    //Load first batch
    var lodLevel = 0;
    
    d3.json(traceUrl,function(json){
        
        trace=json;
        
        globalTrace = json;
        
        console.log(trace);
        
        //Keep ten latest sample updates:
        logUpdate(globalTrace);
        
        //paint(trace.proccpu,cpus,"proccpu");
        
        //paint(trace.procmem,ram,"procmem");
        
        //paint(trace.socket,nics,"socket");
        
        //paintPipes(trace.pipes,pipeCollection)
        
        //paint(trace.devices,devices)
            
        paintAll(trace[lodLevel]);
        
        });
    
    
    //function parseData(text){
    //    metrics=d3.csv.parseRows(text,function(o,i){
    //        var obj=new Object();
    //        var arr=new Array();
    //        if(i==0){return null;};
    //        obj.name=o[0];
    //        obj.desc=o[1];
    //        obj.parent=o[2];
    //        obj.y=parseInt(o[3]);
    //        obj.x=0;
    //        obj.sizePercent=obj.y;
    //        arr.push(obj);
    //        return arr;})
    //    return metrics;
    //}
    
}

function paint(data,items,template){//OBSOLETE. Replaced by paintAll(data)
        //Convert strings to numbers - optional?
        //csv1.forEach(function(o){o.sizePercent=parseInt(o.sizePercent);o.x=0;o.y=o.sizePercent})
        
        //Group items by parent. This should be taken outside...
        //var nest=d3.nest().key(function(d){return d.parent}).entries(csv1)
        //var nest=d3.nest().key(function(d){return d[0].parent}).entries(data)
        //nest.forEach(function(o){o.name=o.key})
        
        //Select a couple of items
        //var couple=d3.selectAll("#id0052,#id0051")
        var items = d3.select("#viewport").selectAll(".cpuCore,.ram,.nic");
        
        //Join the nest (data) to them - each item gets his own data by name
        items.data(data.devices,function(d){return d.name})
        items.each(function(d){redraw(this,d)})
    }
function paintAll(data,callback){       //Callback is an optional funciton that will run at the end of painted transitions
        
        //Error control:
        
         //A previous update is running:
        if (globalStatus.updateInProgress == 1) {
                
                console.log('A PREVIOUS UPDATE IS ALREADY RUNNING!!!');
                /*
                 * 2/22/15: Need to make the variables global variables. Then if another transition is in progress
                 * just run "interruptTransitions()" on the existing variables, which will complete previous transition instanteneously,
                 * and start a new one. Sounds like a plan.
                 *
                */
                
                return;
        }
        
        //No data:
        if (!data || !data.devices || !data.devices.length) {
                console.log("No sample data...");
                return;
        }
        
        //Groups vs. Sample counts:
        var allGroups = d3.select("#viewport").selectAll("g.ramprocessGroup,g.cpuprocessGroup,g.socketGroup,g.volprocessGroup,g.diskprocessGroup");
        var allSamples = d3.select("#viewport").selectAll(".ramprocess,.cpuprocess,.socket,.volprocess,.diskprocess")
        if (allGroups.size() != allSamples.size()) {
                console.log("Some samples are missing!");
                console.log("Sample groups count: ",allGroups.size());
                console.log("Sample count: ",allSamples.size());
                //pauseMap();
        }
        else{
                console.log("Sample groups count: ",allGroups.size());
                console.log("Sample count: ",allSamples.size());
        }
        
        //Pipes vs. endpoints:
        var allPipes = d3.selectAll("path.pipe")
        allPipes
                .each(function(){
                        var pipe = d3.select(this);
                        var lp = document.getElementById(pipe.attr("leftparent"));
                        var rp = document.getElementById(pipe.attr("rightparent"));
                        var origin = document.getElementById(pipe.attr("origin"));
                        if (!lp || !rp || !origin) {
                                console.log("Pipe Endpoint not Found!");
                                //debugger;
                                console.log(pipe.attr('id'));
                                console.log(pipe.attr('leftparent'));
                                console.log(pipe.attr('rightparent'));
                                //console.log(origin)
                        }
                        
                        })
        
        //Duplicate samples: disable unless debugging, too many loops
        var duplicates = findDuplicateSamples(data);
        if (duplicates.length > 0) {
                console.log('Duplicates Found!!: ',duplicates)
        }
        //End error control
        
        
        //var devices = d3.select("#viewport").selectAll(".cpuCoreGroup,.ramGroup,.nicGroup,.volGroup,.diskGroup,.partitionGroup");

        //Expanding group coverage to include LOD
        var devices = d3.select("#viewport").selectAll(".cpuCoreGroup,.ramGroup,.nicGroup,.vgGroup,.volGroup,.diskGroup,.partitionGroup,.cpuGroup,.compContainerGroup,.volsGroup,.raidsGroup,.nodeGroup");
       
        
        //Identify EXITING Samples. Need to merge all samples into a single array to find all samples
        //that don't appear in this refresh. Because NESTED data merge may not find old samples whose device
        //doesn't appear in this refresh:
        
        var flatData = [];
        for (var z = 0;z<data.devices.length;z++){
        
                flatData = flatData.concat(data.devices[z].samples)
        
        }
        
        //Join flattened sample data with existing samples to identify dead ones
        var deadSampleGroups = d3
                        .select("#viewport")
                        .selectAll("g.ramprocessGroup,g.cpuprocessGroup,g.socketGroup,g.volprocessGroup,.diskprocessGroup")
                        .data(flatData,(function(d){return d[0].name}))
                        .exit()
                        //ANOTHER HACK: Immediately change the ids of exiting samples
                        //Because new incoming samples could have duplicate IDs (e.g. PID moved to different core)
                        //Trade-off because better to preserve IDs of samples as they move accross devices
                        //than have unique per-device samples
                        .attr("id",function(){return this.id+"_dead"})
                        .property("__dead__",true)
        //Also select all children RECTs (samples) and connectors, and change their IDs as well
        deadSampleGroups
                .selectAll("line.connector,rect.ramprocess,rect.cpuprocess,rect.socket,rect.volprocess,rect.diskprocess")
                .attr("id",function(){return this.id+"_dead"})
                .property("__dead__",true)

        
        
        
        //Join new sample data with corresponding devices
        //There's a bug here. Sometimes perfectly good data is identified as EXIT() and messed with...
        //Might be related to samples on "sda" and samples on 'sda3' at the same time
        //OK so here's what I think is happening: the "selectAll" clause above, when applied to a device like disk (sda), selects all samples for the disk,
        //and for its children partitions. Next, when disk is joined with DATA, there are no entries for some of these children - as the data is only for disk,
        //not the children. Need to build a smarter SELECTOR to avoid grabbing children
        //3/11/2015: Fixed. Map should run now uninterrupted
        
        
        var sampleGroups = devices
                .data(data.devices,function(d){return d.name})
                .property("__positioning__",recordPositions)    //Save per-device positioning data
                //.selectAll("g.ramprocessGroup,g.cpuprocessGroup,g.socketGroup,g.volprocessGroup,g.diskprocessGroup")         //Select existing device samples
                .selectAll(function(){return this.querySelectorAll("#"+this.id+">g.ramprocessGroup,#"
                                                                   +this.id+">g.cpuprocessGroup,#"
                                                                   +this.id+">g.socketGroup,#"
                                                                   +this.id+">g.volprocessGroup,#"
                                                                   +this.id+">g.diskprocessGroup")})
                .data(function(d){return d.samples},function(d){return d[0].name})      //Join per-device sample data
        
        
        
        var newSampleGroups = sampleGroups.enter();
        
        //Grab exiting samples that weren't identified previously. Mostly samples that move between parents
        
        var deadSampleGroups1 = sampleGroups.exit()
                //Change ids of exiting samples - see above
                .attr("id",function(){
                        if (d3.select(this).property("__dead__") == true) {
                                 return this.id 
                        }
                        else{return this.id+"_dead"}
                        })
                .property("__dead__",true)
        
        //Also select all children RECTs (samples) and connectors, and change their IDs as well
        deadSampleGroups1
                .selectAll("line.connector,rect.ramprocess,rect.cpuprocess,rect.socket,rect.volprocess,rect.diskprocess")
                //These samples may already have their ID changed. Confirm
                .attr("id",function(){
                        if (d3.select(this).property("__dead__") == true) {
                                 return this.id 
                        }
                        else{return this.id+"_dead"}
                        })
                .property("__dead__",true)
        
        //Create new groups and entries
        newSampleGroups            
                .append("g")
                        .attr("id",function(d){return d[0].name+"_g"})
                        .attr("parent",function(d){return d[0].parent})
                        .attr("owner",function(d){return d3.select("#"+d[0].parent).attr("owner")})
                        .attr("class",function(d){return itemTemplate[d[0].template].class+"Group"})
                        .property("__positioning__",function(){return this.parentNode.__positioning__})
                        .property("__index__",function(d,i,j){return i})
                        .attr("transform", function(d,i,j) {
                                                var c = this.__positioning__;
                                                var idx = this.__index__;
                                                //console.log("New Group current: "+d3.select(this).attr("id") + ": "+d3.select(this).attr("transform"))
                                                //console.log("New Group positioning: "+c.width + " " + c.mx + " " + c.s + " " + c.r + " " + c.padding)
                                                //console.log("New Group index: "+idx)
                                                //debugger;
                                                var tr = "translate(" + ((c.width-(c.xFactor*c.width/c.mx))/2) + ","+(c.s+d[0].y0*c.r+(c.padding*idx))+")";
                                                //console.log("New Group new: "+tr)
                                                return tr;}
                                                )
                        .property("__trnsfrm__",function(){//Record old position - new one in this case as these are new samples
                                var o = {};
                                o.e = this.transform.animVal[0].matrix.e
                                o.f = this.transform.animVal[0].matrix.f
                                o.i = this.__index__;
                                return o;
                                })
                        .each(function(d,i,j){          //Create child items for each - Rect and connectors
                                var c = this.__positioning__;
                                createItem({"id":d[0].name,"parent":d[0].parent,"template":d[0].template,"bw":d[0].y,"height":0,"width":(c.xFactor*c.width/c.mx)})
                                })
        
        /*
         *There is a bug here for when you come back:
         *If a sample moves from one parent to another, the original sample gets selected for an exit (a group)
         *Then when a new sample is added, it gets created under the old parent group and not new one, since group IDs are the same
         *The old group still exists... now has 10 elements. The new group doesn't get anything.
         *Then the old group gets removed along with all 10 samples
         *              Solved by ANOTHER HACK: Immediately change the ids of exiting samples
                        Because new incoming samples could have duplicate IDs (e.g. PID moved to different core)
                        Trade-off because better to preserve IDs of samples as they move accross devices
                        than have unique per-device samples
        */
        
        //Move groups and associated connectors, rects to its future location (the one after transition)
        sampleGroups
                .property("__trnsfrm__",function(){//Record old postion
                        var o = {};
                        o.e = this.transform.animVal[0].matrix.e
                        o.f = this.transform.animVal[0].matrix.f
                        o.i = this.__index__;
                        return o;
                        })
                .property("__index__",function(d,i,j){return i})
                .property("__positioning__",function(){return this.parentNode.__positioning__})//This may have been the culprit?
                .attr("transform", function(d,i,j) {
                        var c = this.__positioning__;
                        var idx = this.__index__;
                        var tr =  "translate(" + ((c.width-(c.xFactor*c.width/c.mx))/2) + ","+(c.s+d[0].y0*c.r+(c.padding*idx))+")";
                        return tr;
                        })
        //Move samples (colored rectangles) back, so even though parent groups moved, the rect seems to stay in place.
        //This is because groups/connectors need to be in place immediately to properly calculate new paths for PIPES
        //And the rectangles appear moving during transition to join the group (translate becomes 0,0)
        var samples = sampleGroups
                        .selectAll(".ramprocess,.cpuprocess,.socket,.volprocess,.diskprocess")
                        .data(function(d){return d;},function(d){return d.name})
                        .property("__positioning__",function(){return this.parentNode.__positioning__})
                        .property("__index__",function(d,i,j){return j})
                        .attr("transform", calcNewSampleTransform)//Set reverse transform on the rect
                        .attr("bw",function(d){return d.y * this.__positioning__.r})
                        .attr("percent",function(d){return d.y})
                        .attr("width",function(d){var c = this.__positioning__; return (c.xFactor*c.width/c.mx)})        
        
        
        //Select connectors and change their BW and length to the new value
        var conns=sampleGroups.selectAll(".connector")
                        .property("__positioning__",function(){return this.parentNode.__positioning__})
                        .attr("y2",function(){return d3.select(this.parentNode).datum()[0].y*this.__positioning__.r;})
                        .attr("bw",function(){return d3.select(this.parentNode).datum()[0].y*this.__positioning__.r;})
                        
        /************** Pipes ****************/
        /*
         *Bugs so far:
         *If a process endpoint of a pipe becomes a zero-percent one, pipe doesn't get updated because endpoint ID changes
         *
         *If a pipe is marked for removal, and its endpoint is also being removed, can't calculate new path because by now
         *the id of the endpoint has changed. I if endpoint not found, need to check if endpoint_dead exist
         *
        */
        
        var pipeConnectors=[];//To hold list of pipe endpoints
        
        var pipeCollection = d3
                                .select("#viewport")
                                .selectAll(".pipe")
                                //Save old data sample to check if parent/origin changed
                                .each(function(){
                                        var d = d3.select(this).datum()
                                        var o = {};
                                        o.leftparent = d.leftparent;
                                        o.rightparent = d.rightparent;
                                        o.origin = d.origin;
                                        this.__olddata__ = o;
                                })
                                .data(data.io,function(d){return d.name;})
        
        
        var deadPipes = pipeCollection.exit();
        
        deadPipes
                .each(function(){
                        var origin=d3.select(this).attr("origin");
                        pipeConnectors.push(document.getElementById(origin));
                })
        
        var newPipes=pipeCollection.enter();

        newPipes = newPipes
                        .append("path")
                        .attr("id",function(d){return d.name});//Create object placeholders
        
        newPipes
                .each(function(d){
                        pipeManager("create",d)//Create new pipes with almost-zero bandwidth
                });
        
        //Update the entire pipe collection in case any endpoints changed (usually PID endpoint became zero)
        //For tomorrow: pipe manager refers to updatePipes function which isn't used today
        pipeCollection
                .each(function(d){
                        updatePipes(this,d);
                })
        
        //Collect Connectors
        //console.log("exit connectors: ",connectors.length)
        pipeCollection
                .each(function(){
                        var origin=d3.select(this)
                                        .attr("origin");
                        pipeConnectors.push(document.getElementById(origin));
                })
        
        //console.log("total connectors: ",connectors.length)
        
        //Remove duplicates:
        pipeConnectors = pipeConnectors.filter (function (v, i, a) { return a.indexOf (v) == i });
        
         //Calculate pipe positions - zero bandwidth;
        var pipeEndpoints = collectConnsUpdate(pipeConnectors)
        
        pipeEndpoints = positionPipesNew(pipeEndpoints)
        
        //Draw New pipes - zero bandwidth
        
        newPipes
                .attr("d",function(){return redrawPipe(this)})
        
        //Update pipe attributes with proper bandwidth:
        
        newPipes
                .attr("bw",function(d){return d.lbw})
                .attr("bw1",function(d){return d.rbw})
                .property("bw",function(d){return d.lbw})
                .property("bw1",function(d){return d.rbw});
        
        
        //This updates existing pipes with new bandwidth. For some reason I didn't do this before...?
        pipeCollection
                .attr("bw",function(d){return d.lbw})
                .attr("bw1",function(d){return d.rbw})
                .property("bw",function(d){return d.lbw})
                .property("bw1",function(d){return d.rbw});
        
        //Change stream if necessary
        //newPipes
        //        .attr("stream",function(d){return d.stream})
        
        
        //Update exiting pipes with minimal bandwidth so they shrink gracefully
        deadPipes
                .attr("bw",0.01).attr("bw1",0.01);
                
        //Try to fix bug when pipes don't shrink gracefully when endpoints are gone already
        
        deadPipes
                .property("bw",0.01).property("bw1",0.01);
        
        //Recalculate positions with proper bandwidth:
        var pipeEndpoints=collectConnsUpdate(pipeConnectors)
        
        pipeEndpoints=positionPipesNew(pipeEndpoints)
        
        deadPipes.each(updateConnectorPipeCount);
        
        //Chained transitions:
        //Chained transition #1: reposition samples, collapse old samples
        
        //Nice animation for transitions:
        globalStatus.updateInProgress = 1;
        console.log('Update Start: Status (1 - running, 0 - finished): ',globalStatus.updateInProgress)
        
        var tStartTime = new Date().getTime();
        d3.transition()
                        .duration(2000)
                        .each(function(){
                                samples.transition()
                                        .attr("transform","translate(0,0)")
                                        .attr("height",function(d){;return (d.y)*this.__positioning__.r})// Multiply Y (percentage)
                                deadSampleGroups.select("rect").transition()
                                        .attr("height",0);
                                deadSampleGroups1.select("rect").transition()
                                        .attr("height",0);
                        //Chained transition #2: redraw pipes and collapse old pipes
                                pipeCollection.transition()
                                        .attr("d",function(){return redrawPipe(this)})
                                        //.attr("d",function(){
                                        //        var d = dragMovingPipe(this);
                                        //        if(d.indexOf("NaN") != -1)
                                        //           {debugger;
                                        //           return d;}
                                        //        else{return d}})
                                deadPipes.transition()
                                        .attr("d",function(){return redrawPipe(this)})
                                        .attr("stroke-width",0)
                                        .remove()
                                })
                        //Chained transition #3: Remove old samples only after all related entries have finished their transitions
                        .transition()
                        //.delay(100)
                        .duration(100)
                        .each(function(){
                                deadSampleGroups.transition().remove();
                                deadSampleGroups1.transition().remove();
                                })
                        //Chained transition 4: wait for all other transitions to finish, then update status. To be used to prevent
                        //new updates/transitions while the old one is still running
                        .transition()
                        .duration(10)
                        .each('end',function(){
                                        var tEndTime = new Date().getTime();
                                        globalStatus.updateInProgress = 0;
                                        console.log('Update End: Status (1 - running, 0 - finished): ',globalStatus.updateInProgress);
                                        console.log('Transition took ',(tEndTime-tStartTime).toString(),' milliseconds');
                                        if(callback){
                                                callback();
                                        }
                                })
        
        
        //Instanteneous transitions
        
        function interruptTransitions(){
                
                //Interrupt existing transitions, and preempt any scheduled transitions.
                samples.interrupt().transition();
                deadSampleGroups.interrupt().transition();
                deadSampleGroups1.interrupt().transition();
                pipeCollection.interrupt().transition();
                deadPipes.interrupt().transition();
                
                samples//.transition()
                        .attr("transform","translate(0,0)")
                        .attr("height",function(d){;return (d.y)*this.__positioning__.r})// Multiply Y (percentage)
                deadSampleGroups.select("rect")//.transition()
                        .attr("height",0);
                deadSampleGroups1.select("rect")//.transition()
                        .attr("height",0);
                //Chained transition #2: redraw pipes and collapse old pipes
                pipeCollection//.transition()
                        .attr("d",function(){return redrawPipe(this)})
                deadPipes//.transition()
                        .attr("d",function(){return redrawPipe(this)})
                        .attr("stroke-width",0)
                        .remove()
        
                deadSampleGroups.remove();
                deadSampleGroups1.remove();
        }
        
        
        //"ENDALL" funciton that triggers an action when all transitions are done. NOT BEING USED 
        //function endall(transition, callback) { 
        //        var n = 0; 
        //        transition 
        //        .each(function() { ++n; })
        //        .each("end", function() { if (!--n) callback.apply(this, arguments); }); 
        //} 
}


function paintPipes(data,items){
        return;
        //This will be redone with chained transitions:
        //d3.transition().duration(4000).each(function(){controllers.transition().attr("fill","green")})
        //.transition().each(function(){nics.transition().attr("fill","red")})
        //.transition().duration(100).each(function(){controllers.transition().remove()})
        //.transition().duration(100).each(function(){nics.transition().remove()})
        
        var connectors=[];
        //items = d3.select("#viewport").selectAll(".pipe");
        //console.log(items)
        items = items.data(data,function(d){return d.name;});
        var exit = items.exit();
        //exit.attr("bw",0).attr("bw1",0);
        //Collect exiting connectors;
        exit.each(function(){var origin=d3.select(this).attr("origin");connectors.push(document.getElementById(origin));})
        
        //THERE IS A BUG HERE: one of the endpoints associated with the pipe can already be gone. The "EXITING" pipes would have their endpoints
        //already removed.... can't select connectors of removed endpoints.
        
        var enter=items.enter();
        //console.log(enter)
        enter=enter.append("path").attr("id",function(d){return d.name});//Create object placeholders
        enter.each(function(d){pipeManager("create",d)});//Create new pipes with zero bandwidth
        
        //Collect Connectors
        console.log("exit connectors: ",connectors.length)
        items.each(function(){var origin=d3.select(this).attr("origin");connectors.push(document.getElementById(origin));})
        console.log("total connectors: ",connectors.length)
        
        //Remove duplicates:
        connectors = connectors.filter (function (v, i, a) { return a.indexOf (v) == i });
        
        console.log("non-duplicate connectors: ",connectors.length)
        //Calculate pipe positions - zero bandwidth;
        var c=collectConnsUpdate(connectors)
        
        c=positionPipesNew(c)
        
        //Draw New pipes - zero bandwidth
        
        enter.attr("d",function(){return dragMovingPipe(this)})
        
        //Calculate positions again, with proper bandwidth:
        
        items.attr("bw",function(d){return d.lbw}).attr("bw1",function(d){return d.rbw})
        
        //Change stream if necessary
        items.attr("stream",function(d){return d.stream})
        
        exit.attr("bw",0.01).attr("bw1",0.01);
        
        var c=collectConnsUpdate(connectors)
        
        c=positionPipesNew(c)
        
        
        
        items.transition().duration(1000).attr("d",function(){return dragMovingPipe(this)})
        exit.transition().duration(1000).attr("d",function(){return dragMovingPipe(this)}).attr("stroke-width",0).remove();
        exit.each(function(){
                    //Handle connected pipe count on connectors
                    var lp=d3.select(this).attr("leftparent");lp=d3.select("#"+lp)
                    var rp=d3.select(this).attr("rightparent");rp=d3.select("#"+rp)
                    lp.attr("pipes",function(){var pipes=d3.select(this).attr("pipes");
                                                     pipes=pipes-1;
                                                     if(pipes==0){
                                                        return null}
                                                        else{return pipes}});
                    rp.attr("pipes",function(){var pipes=d3.select(this).attr("pipes");
                                                     pipes=pipes-1;
                                                     if(pipes==0){
                                                        return null}
                                                        else{return pipes}});
                  
                  })
        connectors.length=0;
        //items.each(function(d){pipeManager("update",d)})
    
    
}    



function recordPositions(d){
                var res = {};
                //var item = d3.select(this).select("rect#"+d.name);
                
                var stack=d3.layout.stack().offset("silhouette");
                var data = stack(d.samples);
                var template = d.template;
                
                var item = document.getElementById(d.name)
                var pWidth=item.width.animVal.value; //parent width
                var pHeight=item.height.animVal.value; //parent height
                var percent = pHeight/100;//One percent is equivalent to
                var margin=2
                var padding=(itemTemplate[template].padding)
                var xFactor=0.9
                var width = pWidth
                var height = pHeight// - .5 - margin,
                var mx = 1;//m;                
                
                var my = d3.max(data, function(d) {             //Find out the total height of the stack. I take it back: 
                        return d3.max(d, function(d) {          //find the total height of the highest stack (usually only 1)
                          return (d.y0 + d.y);                  //This is the total percentage you are to display;
                        });
                      });
                var p=padding*(data.length+1);
                
                var p=padding*(data.length+1);//Total hight padding (spaces between items) will take
    
                //There is a bug here. If there are too many samples, the total height of padding is bigger than the total item height
                //Gotta make padding varying height
                
                var r=Math.min(height/((my+p)*percent),1)*percent;//If total height of stack plus padding is bigger than the item height -
                padding=Math.min(padding*r,padding);              //calculate "r" to multiply every value by. "r" is <0
                p=padding*(data.length+1);
                
                var s=padding+(height-((my*r)+p))/2;
                    
                var x = function(d) { return d.x * width / mx; };
                
                
                res.pHeight = pHeight;
                res.pWidth = pWidth;
                res.percent = percent;
                res.margin = margin;
                res.padding = padding;
                res.xFactor = xFactor;
                res.width = width;
                res.height = height;
                res.mx = mx;
                res.my = my;
                res.p = p;
                res.r = r;
                res.s = s;
                res.x = x;
                return res;
}

function calcNewSampleTransform(d,i,j){

                var parent = this.parentNode; //The "G" element - group parent of this sample
                
                var currentTransform = parent.__trnsfrm__.f; //Grab old "Y" position of the Group from its property

                var newTransform = parent.transform.animVal[0].matrix.f         //Grab new "Y" position of the Group from its current
                                                                                //position. The group has already moved
                var diff=currentTransform-newTransform;         //Calculate the difference to move the RECT (sample) back

                return "translate(0,"+diff+")";
        
        }

//function updatePipeEnd

function updateConnectorPipeCount(){
        //Handle connected pipe count on connectors
        var lp=d3.select(this).attr("leftparent");lp=d3.select("#"+lp)
        var rp=d3.select(this).attr("rightparent");rp=d3.select("#"+rp)
        lp.attr("pipes",function(){var pipes=d3.select(this).attr("pipes");
                                         pipes=pipes-1;
                                         if(pipes==0){
                                            return null}
                                            else{return pipes}});
        rp.attr("pipes",function(){var pipes=d3.select(this).attr("pipes");
                                         pipes=pipes-1;
                                         if(pipes==0){
                                            return null}
                                            else{return pipes}});
                  
}


function logUpdate(data){
        
        if (updateLog.length == updateLogHistoryToKeep) {
                updateLog.shift()
        }
        updateLog.push(JSON.stringify(data))
        
}
function logUpdateParse(updateLog){
        var arr = []
        for (var z = 0; z < updateLog.length; z++){
               arr.push(JSON.parse(updateLog[z])) 
        }
        return arr;
}
//Debug helper stuff

//Find dead samples:
function findDeadSamples(){
        d3.selectAll(".cpuprocess,.ramprocess,.socket,g.volprocess,.diskprocess")
                .each(function(){
                        var id = d3.select(this).attr("id")
                        if (id.indexOf("_dead") != -1) {
                                console.log(id)
                        }
                        })
}
function findBadPipes(){
        d3.selectAll(".pipe")
                .each(function(){
                        var path = d3.select(this).attr("d")
                        var id = d3.select(this).attr("id")
                        if (path.indexOf("NaN") != -1) {
                                console.log(id)
                        }
                        })
}

function clearSamples(){
        d3.selectAll("g.ramprocessGroup,g.cpuprocessGroup,g.socketGroup,g.volprocessGroup,g.diskprocessGroup").remove();
        d3.selectAll('.pipe').remove();
        d3.selectAll('path').remove();
}

function clearMap() {
        d3.selectAll('rect').remove();
        d3.selectAll('path').remove();
        d3.select('#viewport').selectAll('g').remove();
}

function redrawMap(){
        
        clearMap();
        
        timerStart = 0;
        
        d3.json("http://raptor:8888/map",function(blob){
                buildMap(blob);
                mapGenerator=blob;
                console.log("Time to build the Map : ",timerStart/1000," seconds");timerStart=timerStart+2000;
                setTimeout(mapReady,timerStart);
            }
        )
        
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

function replayMap(count) {
        //Replays the last few samples. Used for debugging
        //Count is how many periods back to replay
        if (updateLog.length == 0) {
                console.log("No archived samples, can't replay...");
                return;
        }
        if (!count) {
                count = updateLog.length;
        }
        if (count > updateLog.length) {
                count = updateLog.length;
        }
        clearSamples();
        
        var replayHistory = [];
        
        for (var a = updateLog.length-count; a < updateLog.length; a++){
                
                replayHistory.push(JSON.parse(updateLog[a]));
                
        }
        //console.log(replayHistory)
        var b = 0;
        var callback = function(b,count){
        //function callback(b,count){        
                b++;
                console.log('Replay in progress, count: ',count,' iteration: ',b);
                if (!count || !b) {
                        return;
                }
                if (b == count) {
                        b = 0;
                        //return; //remove this once debugging finished - prevents endless loop
                }
                setTimeout(paintAll,redrawTimer,replayHistory[b],function(){callback(b,count)})

                //paintAll(replayHistory[b],function(){callback(b,count)});
        }
        
        console.log('Replay in progress, count: ',count,' iteration: ',b);
        //paintAll(replayHistory[b],callback);
        paintAll(replayHistory[b],function(){callback(b,count)});
        
}
function getAgentSamples(agent,port){
        //Convenience function, gets trace samples directly from agent
        //Port is optional. Default 8125
        if (!port) {
                port = '8125';
        }
        var url = 'http://'+agent+':'+port+'/trace';
        
        d3.json(url,function(blob){agentTrace = blob});
        console.log('If request successful, result will be available at agentTrace')
        
}

function showBBox(uuid){
        d3.select('#showbbox').remove();
        var item = document.getElementById(uuid);
        var box = item.getBBox();
        var bbox = d3.select('#viewport').append('rect').attr(box).attr('id','showbbox').attr({'fill':'none','stroke':'red','stroke-width':'4'});
        
        //d3.select(item.parentNode).append('rect').attr(box).attr('id','showbbox').attr({'fill':'none','stroke':'red','stroke-width':'4'});
        
        //setCTM(showbbox,item.parentNode.getCTM().inverse())
        
        //d3.select(root).append('rect').attr('id','asdfasdf').attr({'x':'191','y':'302','height':'4',width:'4','fill':'black','stroke':'red','stroke-width':'4'});
        return bbox;//.node();
}
function hideBBox(){
        d3.select('#showbbox').remove();
}

function focusAndCenter(){
        
        var bbox = viewport.getBBox();//showBBox('viewport');
        var bboxMatrix = viewport.getCTM();
        var x = bbox.x; var y = bbox.y;
        
        //Calculate viewport size, scaled:
        var boxHeight = bbox.height * bboxMatrix.a; var boxWidth = bbox.width * bboxMatrix.a;
        
        var rootHeight = root.height.animVal.value; var rootWidth = root.width.animVal.value;
        
        //Figure out if you need to re-scale viewport to fit into workspace:
        var hScale = 1,vScale = 1;
        if (boxHeight > rootHeight) {
                vScale = rootHeight/boxHeight;
        }
        if (boxWidth > rootWidth) {
                hScale = rootWidth/boxWidth;
        }
        var scale = Math.min(vScale,hScale);
        
        var scaleMatrix = bboxMatrix.scale(scale,scale);
        
        setCTM(viewport,scaleMatrix);
        
        
        var bbox = viewport.getBBox();//showBBox('viewport');
        var bboxMatrix = viewport.getCTM();
        var x = bbox.x; var y = bbox.y;
        
        //Get scaled position of the XY corner:
        
        var xPos = x + bboxMatrix.e; var yPos = y + bboxMatrix.f;
        
        //Get real position of XY corner in client pixels, relative to 0/0 of workspace:
        //var realX = xPos * bboxMatrix.a; var realY = yPos * bboxMatrix.a;
        
        
        
        //Find center of workspace - unscaled. If viewport got moved, subtract it's coordinates from center:
        var center = root.createSVGPoint();
        center.x = (root.width.animVal.value / 2) - bboxMatrix.e; center.y = (root.height.animVal.value / 2) - bboxMatrix.f;
        
        //Calculate center coordinated in scaled units. Either divide by matrix scale, or multiply by inverse() scale;
        center.x = center.x / bboxMatrix.a; center.y = center.y / bboxMatrix.a;
        
        //Mark center (debug):
        
        //d3.select(viewport).append('rect').attr({'x':center.x,'y':center.y,'width':25,'height':25}).attr('id','centermarker').attr({'fill':'black','stroke':'red','stroke-width':'4'});
        
        //Find center of Viewport: It comes in units that are already scaled
        var boxCenter = root.createSVGPoint();
        boxCenter.x = bbox.x + (bbox.width / 2); boxCenter.y = bbox.y + (bbox.height / 2);
        //boxCenter.x = (bbox.width) / 2; boxCenter.y = (bbox.height) / 2;
        
        //Mark box center (debug):
        //d3.select(viewport).append('rect').attr({'x':boxCenter.x,'y':boxCenter.y,'width':25,'height':25}).attr('id','boxcentermarker').attr({'fill':'black','stroke':'red','stroke-width':'4'});
        
        //Calculate how much to move
        var moveOffset = {};
        moveOffset.x = center.x - boxCenter.x; moveOffset.y = center.y - boxCenter.y;
        
        
        
        
        var newMatrix = bboxMatrix.translate(moveOffset.x,moveOffset.y);
        
        setCTM(viewport,newMatrix);
        
        //Update mapMatrix as it's being used by god knows what
        mapMatrix=viewport.getCTM();
        
        //Run special case of LOD to force cleanup of items that may have been created after zoom-out and shouldn't be shown
        //console.log('New Zoom',zoomLevel)
        lod(zoomLevel,minLodLevel);
        
}


//var data;d3.csv("nicPipeSamples.csv",function(d){data=d})
//pipeSamples.forEach(function(d){connect(d.name,d.leftparent,d.rightparent,d.lbw,d.rbw)})

/*
//How to create a RECT that covers a visible portion of the screen:
d3.select("#viewport").append("rect").attr("id","viewbox1").attr("stroke","red").attr("stroke-width",2).attr("fill","none");
d3.select("#viewbox1")
    .attr("width",function(){return workspace.getAttribute("width")})
    .attr("height",function(){return workspace.getAttribute("height")})
setCTM(viewbox1,viewport.getCTM().inverse());

//How to identify only the elements that are visible:
var rect=root.createSVGRect();
rect.x=0;rect.y=0;
rect.width=workspace.getAttribute("width")
rect.height=workspace.getAttribute("height")
root.getEnclosureList(rect,null)

//How to regester mouseover and mouseout event on an item:
id0021id002271.setAttribute("onmouseover","this.setAttribute('fill','red')")
id0021id002271.setAttribute("onmouseout","this.setAttribute('fill','green')")
id0021id002271.setAttribute("cursor","s-resize")
id0021id002271.setAttribute("pointer-events","stroke")

//How to clone a viewport to create a Minimap
var miniMap=viewport.cloneNode(true)
miniMap.setAttribute("id","minimap");
workspace.appendChild(miniMap)
*/
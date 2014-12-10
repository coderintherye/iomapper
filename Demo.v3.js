//Map Build timers:
var timerStart=0;
var timerDelay=30; //Delay before start building the next object

//Redraw Timers:
var redrawTimer=10000;

var intervals=new Array();

var mapGenerator;

var globalTrace;

var updateLog = [];

var d3 = require('d3');

//mapGenerator is the JSON blob being loaded
//d3.json("mapgenerator.full.json",function(blob){
d3.json("http://raptor:8888/map",function(blob){
        buildMap(blob);
        mapGenerator=blob;
        console.log("Time to build the Map : ",timerStart/1000," seconds");timerStart=timerStart+2000;
        setTimeout(mapReady,timerStart);
    }
)


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
}

function unpauseMap(){
    console.log("Map Updating...")
    pauseMap();
    //CPU Cores
    //cpus=d3.select("#viewport").selectAll(".cpuCore");
    //RAM
    //ram=d3.select("#viewport").selectAll(".ram");
    //Pipes
    //pipeCollection=d3.select("#viewport").selectAll(".pipe");

    //intervals.push(setInterval(update,redrawTimer,cpus));
    //intervals.push(setInterval(update,redrawTimer,ram));
    //intervals.push(setInterval(update,redrawTimer,pipeCollection));
    //intervals.push(setInterval(function(){update(cpus);update(ram);update(pipeCollection)},redrawTimer))
    update();
    intervals.push(setInterval(update,redrawTimer))    
}
function pauseMap(){
    for (var i=0;i<intervals.length;i++){
        console.log("Map Paused...")
        clearInterval(intervals[i]);
    }
    intervals.length=0;
}

viewport.setAttribute("transform","scale(0.2,0.2)")

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
            
        paintAll(trace);
        
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
function paintAll(data){
        
        //Error control:
        
        //No data:
        if (!data || !data.devices || !data.devices.length) {
                console.log("No sample data...");
                return;
        }
        
        //Groups vs. Sample counts:
        var allGroups = d3.select("#viewport").selectAll("g.ramprocessGroup,g.cpuprocessGroup,g.socketGroup");
        var allSamples = d3.select("#viewport").selectAll(".ramprocess,.cpuprocess,.socket")
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
                                console.log(pipe);
                        }
                        
                        })
        
        //End error control
        
        
        var devices = d3.select("#viewport").selectAll(".cpuCoreGroup,.ramGroup,.nicGroup");
       
        
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
                        .selectAll("g.ramprocessGroup,g.cpuprocessGroup,g.socketGroup")
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
                .selectAll("line.connector,rect.ramprocess,rect.cpuprocess,rect.socket")
                .attr("id",function(){return this.id+"_dead"})
                .property("__dead__",true)

        
        
        
        //Join new sample data with corresponding devices 
        var sampleGroups = devices
                .data(data.devices,function(d){return d.name})
                .property("__positioning__",recordPositions)    //Save per-device positioning data
                .selectAll("g.ramprocessGroup,g.cpuprocessGroup,g.socketGroup")         //Select existing device samples
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
                .selectAll("line.connector,rect.ramprocess,rect.cpuprocess,rect.socket")
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
                        .selectAll(".ramprocess,.cpuprocess,.socket")
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
                                .data(data.pipes,function(d){return d.name;})
        
        
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
                        pipeManager("create",d)//Create new pipes with zero bandwidth
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
        
        //Change stream if necessary
        //newPipes
        //        .attr("stream",function(d){return d.stream})
        
        
        //Update exiting pipes with minimal bandwidth so they shrink gracefully
        deadPipes
                .attr("bw",0.01).attr("bw1",0.01);
        
        //Recalculate positions with proper bandwidth:
        var pipeEndpoints=collectConnsUpdate(pipeConnectors)
        
        pipeEndpoints=positionPipesNew(pipeEndpoints)
        
        deadPipes.each(updateConnectorPipeCount);
        
        //Chained transitions:
        //Chained transition #1: reposition samples, collapse old samples
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
                        //.transition()
                        //.each()
        //Chained transition #3: Remove old samples only after all related entries have finished their transitions
                        .transition()
                        .each(function(){
                                deadSampleGroups.transition().remove();
                                deadSampleGroups1.transition().remove();
                                })
                        
}


function paintPipes(data,items){
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
        
        if (updateLog.length == 10) {
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
        d3.selectAll(".cpuprocess,.ramprocess,.socket")
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

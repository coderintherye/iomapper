var viewport = document.getElementById("viewport");
var workspace = document.getElementById("workspace");
var svgNS = workspace.getAttribute('xmlns');
var xlinkNS = workspace.getAttribute('xmlns:xlink');
var pt    = workspace.createSVGPoint();
var scaleFactor = 100;
//Monitoring and performance variables
var positionItemCount=0;

///////////////////////////////
///////////////////////////////
//   Templates for items
///////////////////////////////
///////////////////////////////

var itemTemplate={
"cluster":{"visibility":"hidden","padding":350,"itemsperrow":5,"type":"cluster","class":"cluster","height":5,"width":5,"fill":"white","fill-opacity":0.2,"stroke":"green","stroke-width":0.2},

"serverContainer":{"visibility":"hidden","pointer-events":"all","padding":550,"itemsperrow":5,"type":"servers","class":"nodeContainer","height":5,"width":5,"fill":"white","fill-opacity":0.2,"stroke":"blue","stroke-width":0.2},
"server":{"padding":140,"itemsperrow":1,"ry":0.5,"fpadding":0,"type":"server","class":"node","height":10,"width":10,"fill":"gray","fill-opacity":0.1,"stroke":"black","stroke-width":1},
"storage":{"padding":140,"itemsperrow":1,"ry":0.5,"fpadding":0,"type":"server","class":"node","height":10,"width":10,"fill":"gray","fill-opacity":0.1,"stroke":"black","stroke-width":1},


"clientContainer":{"visibility":"hidden","pointer-events":"all","padding":550,"itemsperrow":5,"type":"clients","class":"nodeContainer","height":5,"width":5,"fill":"white","fill-opacity":0.2,"stroke":"blue","stroke-width":0.2},
"client":{"padding":140,"itemsperrow":1,"ry":0.5,"type":"client","class":"node","height":10,"width":10,"fill":"gray","fill-opacity":0.1,"stroke":"black","stroke-width":1},

"componentContainer":{"padding":40,"itemsperrow":10,"ry":0.5,"type":"tbd","class":"compContainer","bw":9,"height":5,"width":5,"fill":"gray","fill-opacity":0,"stroke":"black","stroke-width":0.2},


"bond":{"padding":15,"itemsperrow":1,"ry":0.5,"type":"bond","class":"nic","bw":30,"height":30,"width":5,"fill":"blue","fill-opacity":0.1,"stroke":"black","stroke-width":0.2},
"nic":{"padding":5,"itemsperrow":1,"ry":0.5,"type":"nic","class":"nic","bw":30,"height":30,"width":5,"fill":"blue","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"socket":{"visibility":"visible","padding":1,"itemsperrow":1,"type":"socket","class":"socket","height":0,"width":0,"fill":"green","fill-opacity":0.2,"stroke":"black","stroke-width":0},

"vnic":{"padding":15,"itemsperrow":1,"ry":0.5,"type":"vnic","class":"vnic","bw":30,"height":30,"width":5,"fill":"blue","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},

"cpu":{"padding":20,"itemsperrow":1,"ry":0.5,"type":"cpu","class":"cpu","height":15,"width":15,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"cpuCore":{"padding":15,"itemsperrow":1,"ry":0.5,"type":"cpuCore","class":"cpuCore","height":50,"width":50,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"proccpu":{"visibility":"visible","padding":1,"itemsperrow":1,"type":"cpuprocess","class":"cpuprocess","height":0,"width":0,"fill":"green","fill-opacity":0.5,"stroke":"black","stroke-width":0},

"ram":{"padding":10,"itemsperrow":1,"ry":0.5,"type":"ram","class":"ram","height":0,"width":0,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"procmem":{"visibility":"visible","padding":1,"itemsperrow":1,"type":"ramprocess","class":"ramprocess","height":0,"width":0,"fill":"green","fill-opacity":0.5,"stroke":"black","stroke-width":0},

"vms":{"padding":0,"itemsperrow":1,"ry":0.5,"type":"vms","class":"vms","height":630,"width":240,"fill":"none","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"vmserver":{"padding":140,"itemsperrow":1,"ry":0.5,"fpadding":0,"type":"vmserver","class":"vmnode","height":10,"width":10,"fill":"gray","fill-opacity":0,"stroke":"black","stroke-width":2,"stroke-opacity":0.5,"fixed":1},
"vmclient":{"padding":140,"itemsperrow":1,"ry":0.5,"type":"vmclient","class":"vmnode","height":10,"width":10,"fill":"gray","fill-opacity":0,"stroke":"black","stroke-width":0.2,"fixed":1},

"vols":{"padding":0,"itemsperrow":1,"ry":0.5,"type":"vols","class":"vols","fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"vg":{"visibility":"visible","padding":100,"ry":2,"itemsperrow":1,"type":"vol","class":"vol","height":0,"width":0,"fill":"gray","fill-opacity":0.1,"stroke":"black","stroke-width":0.2,"stack":1},
"vol":{"visibility":"visible","padding":100,"ry":2,"itemsperrow":1,"type":"vol","class":"vol","height":0,"width":0,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2,"stack":1},
"procvol":{"visibility":"visible","padding":1,"itemsperrow":1,"type":"volprocess","class":"volprocess","height":0,"width":0,"fill":"green","fill-opacity":0.5,"stroke":"black","stroke-width":0},

"raids":{"padding":0,"itemsperrow":1,"ry":0.5,"type":"raids","class":"raids","height":0,"width":0,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"lun":{"visibility":"visible","padding":1,"itemsperrow":1,"ry":0.5,"type":"lun","class":"lun","bw":25,"height":0,"width":0,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"disk":{"visibility":"inherit","padding":30,"itemsperrow":1,"ry":0.5,"type":"disk","class":"disk","bw":30,"height":40,"width":25,"fixed":1,"stroke":"#000000","fill":"gray","fill-opacity":0.2,"stroke-width":0.2},
"partition":{"visibility":"visible","padding":115,"ry":2,"itemsperrow":1,"type":"partition","class":"partition","height":0,"width":0,"stroke":"#000000","fill":"red","fill-opacity":0.2,"stroke-width":0.2,"stack":1},
"procdisk":{"visibility":"visible","padding":1,"itemsperrow":1,"type":"diskprocess","class":"diskprocess","height":0,"width":0,"fill":"green","fill-opacity":0.5,"stroke":"black","stroke-width":0},

"hba":{"padding":15,"itemsperrow":1,"ry":0.5,"type":"hba","class":"hba","bw":30,"height":30,"width":5,"fill":"orange","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"controller":{"padding":15,"itemsperrow":4,"ry":0.5,"type":"controller","class":"controller","bw":30,"height":30,"width":5,"fill":"orange","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},

"externalPipe":{"type":"externalPipe","class":"pipe","stroke-width":0.005,"stroke":"red","fill":"green","fill-opacity":"0.5","stroke-opacity":"1","template":"externalPipe"},
"arcPipe":{"type":"arcPipe","class":"pipe","stroke-width":0.01,"stroke":"red","fill":"steelblue","fill-opacity":"0.5","stroke-opacity":"1","template":"arcPipe"}

};

///////////////////////////////
///////////////////////////////
//   Other Attributes
///////////////////////////////
///////////////////////////////

var itemAttrs={
"cluster":{"visibility":"hidden","padding":350,"itemsperrow":5,"type":"cluster","class":"cluster","height":5,"width":5,"fill":"white","fill-opacity":0.2,"stroke":"green","stroke-width":0.2},

"serverContainer":{"visibility":"hidden","pointer-events":"all","padding":550,"itemsperrow":5,"type":"servers","class":"nodeContainer","height":5,"width":5,"fill":"white","fill-opacity":0.2,"stroke":"blue","stroke-width":0.2},
"server":{"padding":140,"itemsperrow":1,"fpadding":0,"type":"server","class":"node","height":10,"width":10,"fill":"gray","fill-opacity":0,"stroke":"black","stroke-width":2,"stroke-opacity":0.5},
"storage":{"padding":140,"itemsperrow":1,"fpadding":0,"type":"server","class":"node","height":10,"width":10,"fill":"gray","fill-opacity":0,"stroke":"black","stroke-width":2,"stroke-opacity":0.5},


"clientContainer":{"visibility":"hidden","pointer-events":"all","padding":550,"itemsperrow":5,"type":"clients","class":"nodeContainer","height":5,"width":5,"fill":"white","fill-opacity":0.2,"stroke":"blue","stroke-width":0.2},
"client":{"padding":140,"itemsperrow":1,"ry":0.5,"type":"client","class":"node","height":10,"width":10,"fill":"gray","fill-opacity":0,"stroke":"black","stroke-width":0.2},

"componentContainer":{"padding":40,"itemsperrow":10,"ry":0.5,"type":"tbd","class":"compContainer","bw":9,"height":5,"width":5,"fill":"gray","fill-opacity":0,"stroke":"black","stroke-width":0.2},


"bond":{"padding":15,"itemsperrow":1,"ry":0.5,"type":"bond","class":"nic","bw":30,"height":30,"width":5,"fill":"blue","fill-opacity":0.1,"stroke":"black","stroke-width":0.2},
"nic":{"padding":5,"itemsperrow":1,"ry":0.5,"type":"nic","class":"nic","bw":30,"height":30,"width":5,"fill":"blue","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"socket":{"visibility":"visible","padding":1,"itemsperrow":1,"type":"socket","class":"socket","height":0,"width":0,"fill":"green","fill-opacity":0.2,"stroke":"black","stroke-width":0,"selectedAttrs":{"stroke-width":0.05,"fill-opacity":0.5}},

"vnic":{"padding":15,"itemsperrow":1,"ry":0.5,"type":"vnic","class":"vnic","bw":30,"height":30,"width":5,"fill":"blue","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},

"cpu":{"padding":20,"itemsperrow":1,"ry":0.5,"type":"cpu","class":"cpu","height":15,"width":15,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"cpuCore":{"padding":15,"itemsperrow":1,"ry":0.5,"type":"cpuCore","class":"cpuCore","height":50,"width":50,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"proccpu":{"visibility":"visible","padding":1,"itemsperrow":1,"type":"cpuprocess","class":"cpuprocess","height":0,"width":0,"fill":"green","fill-opacity":0.2,"stroke":"black","stroke-width":0,"selectedAttrs":{"stroke-width":0.05,"fill-opacity":0.5}},

"ram":{"padding":10,"itemsperrow":1,"ry":0.5,"type":"ram","class":"ram","height":0,"width":0,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"procmem":{"visibility":"visible","padding":1,"itemsperrow":1,"type":"ramprocess","class":"ramprocess","height":0,"width":0,"fill":"green","fill-opacity":0.2,"stroke":"black","stroke-width":0,"selectedAttrs":{"stroke-width":0.05,"fill-opacity":0.5}},

"vms":{"padding":0,"itemsperrow":1,"ry":0.5,"type":"vms","class":"vms","height":630,"width":240,"fill":"none","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"vmserver":{"padding":140,"itemsperrow":1,"ry":0.5,"fpadding":0,"type":"vmserver","class":"vmnode","height":10,"width":10,"fill":"gray","fill-opacity":0,"stroke":"black","stroke-width":2,"stroke-opacity":0.5,"fixed":1},
"vmclient":{"padding":140,"itemsperrow":1,"ry":0.5,"type":"vmclient","class":"vmnode","height":10,"width":10,"fill":"gray","fill-opacity":0,"stroke":"black","stroke-width":0.2,"fixed":1},

"vols":{"padding":0,"itemsperrow":1,"ry":0.5,"type":"vols","class":"vols","fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"vg":{"visibility":"visible","padding":100,"ry":2,"itemsperrow":1,"type":"vol","class":"vol","height":0,"width":0,"fill":"gray","fill-opacity":0.1,"stroke":"black","stroke-width":0.2,"stack":1,"selectedAttrs":{"stroke-width":0.5,"fill-opacity":0.5}},
"vol":{"visibility":"visible","padding":100,"ry":2,"itemsperrow":1,"type":"vol","class":"vol","height":0,"width":0,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2,"stack":1,"selectedAttrs":{"stroke-width":0.5,"fill-opacity":0.5}},
"procvol":{"visibility":"visible","padding":1,"itemsperrow":1,"type":"volprocess","class":"volprocess","height":0,"width":0,"fill":"green","fill-opacity":0.2,"stroke":"black","stroke-width":0,"selectedAttrs":{"stroke-width":0.05,"fill-opacity":0.5}},

"raids":{"padding":0,"itemsperrow":1,"ry":0.5,"type":"raids","class":"raids","height":0,"width":0,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"lun":{"visibility":"visible","padding":1,"itemsperrow":1,"ry":0.5,"type":"lun","class":"lun","bw":25,"height":0,"width":0,"fill":"gray","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"disk":{"visibility":"inherit","padding":30,"itemsperrow":1,"ry":0.5,"type":"disk","class":"disk","bw":30,"height":40,"width":25,"fixed":1,"stroke":"#000000","fill":"gray","fill-opacity":0.2,"stroke-width":0.2,"selectedAttrs":{"stroke-width":0.5,"fill-opacity":0.5}},
"partition":{"visibility":"visible","padding":115,"ry":2,"itemsperrow":1,"type":"partition","class":"partition","height":0,"width":0,"stroke":"#000000","fill":"red","fill-opacity":0.2,"stroke-width":0.2,"stack":1,"selectedAttrs":{"stroke-width":0.5,"fill-opacity":0.5}},
"procdisk":{"visibility":"visible","padding":1,"itemsperrow":1,"type":"diskprocess","class":"diskprocess","height":0,"width":0,"fill":"green","fill-opacity":0.2,"stroke":"black","stroke-width":0,"selectedAttrs":{"stroke-width":0.05,"fill-opacity":0.5}},

"hba":{"padding":15,"itemsperrow":1,"ry":0.5,"type":"hba","class":"hba","bw":30,"height":30,"width":5,"fill":"orange","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},
"controller":{"padding":15,"itemsperrow":4,"ry":0.5,"type":"controller","class":"controller","bw":30,"height":30,"width":5,"fill":"orange","fill-opacity":0.2,"stroke":"black","stroke-width":0.2},

"externalPipe":{"type":"externalPipe","class":"pipe","stroke-width":0.005,"stroke":"red","fill":"green","fill-opacity":"0.1","stroke-opacity":"1","template":"externalPipe","selectedAttrs":{"stroke-width":0.05,"fill-opacity":"0.5"}},
"arcPipe":{"type":"arcPipe","class":"pipe","stroke-width":0.01,"stroke":"red","fill":"steelblue","fill-opacity":"0.1","stroke-opacity":"1","template":"arcPipe","selectedAttrs":{"stroke-width":0.05,"fill-opacity":"0.5"}}

};



///////////////////////////////
///////////////////////////////
//   LOD Levels
///////////////////////////////
///////////////////////////////

itemTemplate.procmem.level=0;
itemTemplate.proccpu.level=0;
itemTemplate.cpuCore.level=1;
itemTemplate.disk.level=1;
itemTemplate.ram.level=2;
itemTemplate.cpu.level=2;
itemTemplate.nic.level=2;
itemTemplate.hba.level=2;

function createElement(name,prop){
    var element = document.createElementNS(svgNS,name);
    for (var a in prop) if (prop.hasOwnProperty(a)) element.setAttribute(a,prop[a]);
    return element;
}

function appendElement(root,element){
    root.appendChild(element);
}

function removeLabel(item){
    //Item is a group
    var labels=item.querySelectorAll("g#"+item.id+" > text[type='label']");
    for (var a=0,ll=labels.length;a<ll;a++){
        item.removeChild(labels[a]);
    }
}

function createLabel(item,label){
        
    var maxFontSize=48;
    //Get actual item scale, regardless of MAP scale
    var itemScale=item.getCTM().a/mapMatrix.a;
    
    //
    if(label==null){
        label=item.getAttribute("desc")
        if(label==null){label=item.id}
    }
    var box=item.getBBox();
    
    //console.log("Label item: "+item.id)
    
    var fontSize=(Math.min(box.width,box.height))/label.length;
    
    //Limit font size:
    fontSize=Math.min(fontSize,maxFontSize);
    
    //console.log(box);
    //console.log(label)
    //console.log("Font size: "+fontSize)
    
    //if (fontSize>=box.height){fontSize=box.height/4}
    
    var scaledFontSize=fontSize*itemScale;
    
    //Calculate Map Scale at which the label becomes first visible
    if(minVisTextSize/scaledFontSize>1){
        var mapScaleFactor=Math.floor(minVisTextSize/scaledFontSize);
    }
    else if(minVisTextSize/scaledFontSize<1){
        var mapScaleFactor=Math.floor((scaledFontSize/minVisTextSize))*-1;
    }
    else{var mapScaleFactor=1};
    
    var visibility="hidden";
    var x=box.width/2;//console.log("X: ",x)
    var y=fontSize+(fontSize/2);//console.log("Y: ",y)
    var text=createElement("text");
    var level=item.getAttribute("level")
    //setAttributes(text,{"id":item.id+"label","x":x,"y":y,"fill-opacity":1,"fill":"steelblue","text-anchor":"middle","font-size":fontSize,"level":level});
    setAttributes(text,{"id":item.id+"label","parent":item.id,"x":x,"y":y,//"transform":"translate("+x+","+y+")",
                  "fill-opacity":1,"fill":"steelblue","text-anchor":"middle",
                  "font-size":fontSize,"level":level,"showscale":mapScaleFactor,"visibility":visibility,"type":"label"});
    
    var textNode=document.createTextNode(label);
    text.appendChild(textNode);
    item.parentNode.appendChild(text);
    //var aaaaTmpbox = item.getBBox();
    //var aaabTmpbox = text.getBBox();
}

function pipeManager(action,args){
    //A dispatcher function to be used by D3 calls.
    //action could be one of the following: create,update,remove
    //args is an object:
    //Create arguments: uId,origin,parentB,rateA,rateB,streamId
    //Update arguments:uId,bw,bw1,props -- props is an object with new attributes
    //Remove arguments:uId
    
    var pipe=document.getElementById(args.name);
        if(pipe.getAttribute("rightparent") && action=="create"){//Pipe exists, update attributes and morph
            //console.log("Updating Pipe... function pipeManager.");
            //var props={"name":uId,"lbw":rateA,"rbw":rateB};
            //pipeManager("update",props)
            //return null;
            action="update";
        }
    
    switch(action){
        case "create":
            //console.log("creating pipe uId ",args.name)
            //var origin=args.origin;
            //var parentB=args.rightparent;
            //if(parentB==origin){parentB=args.leftparent}
            connect(args.name,args.origin,args.leftparent,args.rightparent,false,0.01,0.01,args.stream);
            break;
        //case "update":
        //    //console.log("updating pipe uId",args.name)
        //    //pipe.setAttribute("stream",args.stream);
        //    updatePipes(pipe,d);
        //    break;
        case "remove":
            //console.log("removing pipe uId ",args.name)
            removePipes(args.name);
            break;
        default:
            //console.log("Action not specified. Function pipeManager")
            return;
    }
    return;
}

function updatePipes(pipe,d){
    
    //This function checks if there's old data attached to the pipe, and if any of the key attributes are different
    //This is necessary in case a pipe is now connected to a different endpoint
    
    if (!pipe.__olddata__) {
        return;
    }
    
    var id = d3.select(pipe).attr("id");
    var leftparent = pipe.__olddata__.leftparent;
    var rightparent = pipe.__olddata__.rightparent;
    var origin = pipe.__olddata__.origin;
    
    if (!d || !d.leftparent || !d.rightparent || !d.origin) {
        console.log("Need to refresh pipe, but no data attached...");
        debugger;
        return;
    }
    if (leftparent != d.leftparent || rightparent != d.rightparent || origin != d.origin) {
        //Refresh pipe
        connect(id,d.origin,d.leftparent,d.rightparent,true);
    }
    
}

function connect(uId,origin,parentA,parentB,refresh,rateA,rateB,streamId){
    if(document.getElementById(uId)){//UID exists, let's check if the pipe is not new and needs to be updated
        //console.log("Pipe Exists... function connect.");
        var pipe=document.getElementById(uId);
        //if(pipe.getAttribute("rightparent")){//Pipe exists, update attributes and morph
        //    console.log("Updating Pipe... function connect.");
        //    var props={"name":uId,"lbw":rateA,"rbw":rateB};
        //    pipeManager("update",props)
        //    return null;
        //}
    }
    //var parentA=origin;
    var type,vectorA,vectorB,ownerA,ownerB,matrixA,matrixB,seqA,seqB,connectorA,connectorB,boxA,boxB,vm=0;
    if (typeof(parentA)=="string"){
        var parentA_id = parentA;
        parentA=document.getElementById(parentA);
    }
    if (typeof(parentB)=="string"){
        var parentB_id = parentB;
        parentB=document.getElementById(parentB);
    }
    
    if (!parentA || !parentB) {
        console.log('Parent not found, skipping pipe for now... pipe: ',uId);
        console.log('Parent A: ',parentA_id);
        console.log('Parent B: ',parentB_id);
        return;
    }
    
    vectorA=parentA.getAttribute("vector");
    vectorB=parentB.getAttribute("vector");
    ownerA=document.getElementById(parentA.getAttribute("owner"));
    ownerB=document.getElementById(parentB.getAttribute("owner"));
    //Figure out if it's a VM:
    if(ownerA.getAttribute("owner")==ownerB.id || ownerB.getAttribute("owner")==ownerA.id){
        vm=1;
    }
    
    ownerVectorA=ownerA.getAttribute("vector");
    ownerVectorB=ownerB.getAttribute("vector");
    matrixA=parentA.getCTM();
    matrixB=parentB.getCTM();
    //console.log("x-A: "+matrixA.e)
    //console.log("x-B: "+matrixB.e)
    //IE Fix: can't modify BBox()
	var boxA={};
	var tmpBoxA=parentA.getBBox();
    var boxB={};
	var tmpBoxB=parentB.getBBox();
    boxA.x=tmpBoxA.x;boxA.y=tmpBoxA.y;boxA.width=tmpBoxA.width;boxA.height=tmpBoxA.height;
    boxB.x=tmpBoxB.x;boxB.y=tmpBoxB.y;boxB.width=tmpBoxB.width;boxB.height=tmpBoxB.height;
    //boxA=parentA.getBBox();boxA.width=boxA.width*matrixA.a;boxA.height=boxA.height*matrixA.d;
    //boxB=parentB.getBBox();boxB.width=boxB.width*matrixB.a;boxB.height=boxB.height*matrixB.d;
    boxA.width=boxA.width*matrixA.a;boxA.height=boxA.height*matrixA.d;
    boxB.width=boxB.width*matrixB.a;boxB.height=boxB.height*matrixB.d;
    //console.log("box A width: "+boxA.width)
    //console.log("box B width: "+boxB.width)
    //If same owner AND same direction:
    if(ownerA.id==ownerB.id && vectorA==vectorB || vm==1){
        //First handle an "internal pipe" case
        if(parentA.getAttribute("parent")==parentB.id){
            //Internal pipe
            if(matrixA.e>matrixB.e){
                seqA=0;seqB=1;
            }
            else if(matrixB.e>matrixA.e){
                if(vectorA==1){seqA=0;seqB=3;}
                else if (vectorA==-1){seqA=3;seqB=0;}
            }
        }
        else if(parentB.getAttribute("parent")==parentA.id){
            //Internal pipe
            if(matrixA.e>matrixB.e){
                if(vectorA==1){seqA=3;seqB=0;}
                else if (vectorA==-1){seqA=0;seqB=3;}
            }
            else if(matrixB.e>matrixA.e){
                seqA=1;seqB=0;
            }
        }
        //If X position is the same
        else if(matrixA.e==matrixB.e){
            //console.log("ping")
            //Arc Pipe
            type="arcPipe";
            seqA=0;seqB=0;
        }
        //If parentA to the right of parentB
        else if(matrixA.e>matrixB.e){
            //If it's too close...
            if(matrixA.e-matrixB.e<boxB.width){type="arcPipe";seqA=0;seqB=0;}
            //If it's further to the right..
            else if(matrixA.e-matrixB.e>boxB.width){type="externalPipe";
            //Fix: determine which way it's facing
                if(vectorA==1){seqA=3;seqB=0;}
                else if (vectorA==-1){seqA=0;seqB=3;}
            }
        }
        //If parentB to the right of parentA
        else if(matrixB.e>matrixA.e){
            if(matrixB.e-matrixA.e<boxA.width){type="arcPipe";seqA=0;seqB=0;}
            else if(matrixB.e-matrixA.e>boxA.width){type="externalPipe";
            //Fix: determine which way it's facing
                if(vectorA==1){seqA=0;seqB=3;}
                else if (vectorA==-1){seqA=3;seqB=0;}
            }
        }
    }
    //If same owner AND OPPOSITE direction - e.g. HBAs have reverse direction:
    if(ownerA.id==ownerB.id && vectorA!=vectorB){
        type="externalPipe";
        seqA=3;seqB=3;
    }
    
    //##########DIFFERENT OWNERS
    //If DIFFERENT owners, facing SAME direction:
    if(ownerA.id!=ownerB.id && vectorA==vectorB && vm===0){//BUG HERE... WHAT if it's a VM?
        type="arcPipe";
        seqA=0;seqB=0;
    }
    //If DIFFERENT owners, facing OPPOSITE directions:
    if(ownerA.id!=ownerB.id && vectorA!=vectorB){
        type="externalPipe";
        seqA=0;seqB=0;
    }  
    connectorA=parentA.parentNode.querySelector(".connector[seq='"+seqA+"']").id;//console.log(connectorA);
    connectorB=parentB.parentNode.querySelector(".connector[seq='"+seqB+"']").id;//console.log(connectorB);
    //uId=parentA.id+"_"+parentB.id+"_"+Math.random();//console.log(uId);
    if(origin==parentA.id){origin=connectorA}else if(origin==parentB.id){origin=connectorB};
    //If only refresh is needed - don't create new pipe, just update parents
    if (refresh == true) {
        d3.select(pipe)
            .attr("leftparent",connectorA)
            .attr("rightparent",connectorB)
            .attr("origin",origin);
        
        var lp = d3.select("#"+connectorA);
        var rp = d3.select("#"+connectorB);
        
        if(lp.attr("pipes") === null){ 
            lp.attr("pipes",'1');
        }
        else{
            var lppipes=lp.attr("pipes");
            lppipes++;
            lp.attr("pipes",lppipes);
        }
        if(rp.attr("pipes") == null){ 
            rp.attr("pipes",'1');
        }
        else{
            var rppipes=rp.attr("pipes");
            rppipes++;
            rp.attr("pipes",rppipes);
        }
        
        
        
        
        
        return;
    }
    
    
    var e=createPipe(uId,connectorA,connectorB,origin,type,rateA,rateB,streamId);
    return e;
}

function createPipe(pipeUid,parentUidA,parentUidB,origin,type,rate1,rate2,streamId){
    //console.log("creating pipe...function create; uId ",pipeUid)
    var parentA,parentB,leftParent,rightParent,ownerA,ownerB,level=0;
    var e;
    if(document.getElementById(pipeUid)){
        //console.log("Pipe Exists... function createPipe.");
        e = document.getElementById(pipeUid);
    }
    else{
        e = createElement("path",{id:pipeUid});
    }
        
    //console.log("Pipe: "+pipeUid+" ParentA: "+parentUidA);console.log("ParentB: "+parentUidB);
    if(parentUidA==parentUidB){console.log("Trying to connect to itself - parentA "+parentUidA+" ParentUidB "+parentUidB+"; pipe "+pipeUid+" not created. Exiting function.");return -1;}
    
    parentA=document.getElementById(parentUidA); parentB=document.getElementById(parentUidB);
    leftParent=parentA;rightParent=parentB;
    lSeq=leftParent.getAttribute("seq");rSeq=rightParent.getAttribute("seq");
    var pair=[leftParent.id,rightParent.id];pair.sort();pair=pair.join("_");pair=pair+"_pipe";
    ownerA=document.getElementById(parentA.getAttribute("owner"));ownerB=document.getElementById(parentB.getAttribute("owner"));
    //Get common owner:
    
    if(parentA.id=="viewport"||parentB.id=="viewport"){var commonParent=document.getElementById("viewport");var commonParentG=commonParent;}
    else if(parentA.id==parentB.id){var commonParent=parentA;var commonParentG=commonParent.parentNode}    
    else{
        var parentsA=new Array();
        parentsA.push(parentA.id);var lp=parentA;
        while(lp.id!="viewport"){
            lp=document.getElementById(lp.getAttribute("parent"));
            parentsA.push(lp.id);
            //console.log(parentsA.length)
        }
        //console.log(parentsA);
        var rp=parentB;
        while(rp.id!="viewport"){
            //asdf++;console.log(rp.id);console.log(asdf); if(asdf>100){break};
            rp=document.getElementById(rp.getAttribute("parent"));
            if(parentsA.indexOf(rp.id)!=-1){var commonParent=rp;var commonParentG=commonParent.parentNode;break;}
        }
    }
    commonOwner=document.getElementById(commonParent.getAttribute("owner"));commonOwnerG=commonOwner.parentNode;
    //commonParentG=document.getElementById("viewport")
     //Find which parent has lower bandwidth - this is your pipe width
    var bw=0;var bw1=0;//maxBw = Math.min((leftParent.y2.animVal.value-leftParent.y1.animVal.value),(rightParent.y2.animVal.value-rightParent.y1.animVal.value))
    if (typeof(rate1)=='undefined') {bw = Math.min((leftParent.y2.animVal.value-leftParent.y1.animVal.value),(rightParent.y2.animVal.value-rightParent.y1.animVal.value));}
    //else if(rate1>maxBw){bw=maxBw}
    else{bw=rate1};
    if(rate2==null){bw1=bw}else{bw1=rate2}
    if(streamId==null){streamId=0}
    if(leftParent.getAttribute("pipes")==null){ 
        leftParent.setAttribute("pipes",'1');
        leftPipes=1;
    }
    else{
        leftPipes=leftParent.getAttribute("pipes");
        leftPipes++;
        leftParent.setAttribute("pipes",(leftPipes));
    }
    if(rightParent.getAttribute("pipes")==null){
        rightParent.setAttribute("pipes",'1')
        rightPipes=1;
    }
    else{
        rightPipes=rightParent.getAttribute("pipes");
        rightPipes++;
        rightParent.setAttribute("pipes",(rightPipes));
    }
    //pPair=[leftParent.id.id,rightParent.id];pPair.sort();pPair=pPair.join("_");pPair=pPair+"_pipe";
    if(type=="internalPipe"){
        setAttributes(e,{id:pipeUid,d:"M0,0","type":"internalPipe","class":"pipe","pair":pair,"origin":origin,
                         "stroke-width":0.01,stroke:"black","fill":"green","fill-opacity":"0.4","stroke-opacity":"1",
                         "bw":bw,"bw1":bw1,"leftparent":leftParent.id,"rightparent":rightParent.id,"level":level,"stream":streamId,"template":"internalPipe"});//console.log(e)
        if(ownerA.id==ownerB.id){e.setAttribute("owner",commonOwner.id);}//appendElement(commonOwnerG,e);}
        else{console.log("Doesn't look like an internal pipe... the owners are different: OwnerA: "+ownerA.id+" OwnerB: "+ownerB.id);e.setAttribute("owner",commonOwner.id);}//appendElement(commonOwnerG,e);}
        rightParent.parentNode.setAttribute("connected","true");leftParent.parentNode.setAttribute("connected","true");        
    }
    else if(type=="arcPipe"){
        setAttributes(e,{id:pipeUid,d:"M0,0","type":type,"class":"pipe","pair":pair,"origin":origin,
                         "stroke-width":0.01,stroke:"red","fill":"steelblue","fill-opacity":"0.4","stroke-opacity":"1",
                         "bw":bw,"bw1":bw1,"leftparent":leftParent.id,"rightparent":rightParent.id,"level":level,"stream":streamId,"template":"arcPipe"});//console.log(e)
        //Next statement tries to figure out if pipes belong to the same server - adds them to the server group to prevent unnecessary calulations        
        e.setAttribute("owner",commonOwner.id);
        rightParent.parentNode.setAttribute("connected","true");leftParent.parentNode.setAttribute("connected","true");
    }
    else{
        setAttributes(e,{id:pipeUid,d:"M0,0","type":"externalPipe","class":"pipe","pair":pair,"origin":origin,
                         "stroke-width":0.005,stroke:"red","fill":"green","fill-opacity":"0.4","stroke-opacity":"1",
                         "bw":bw,"bw1":bw1,"leftparent":leftParent.id,"rightparent":rightParent.id,"level":level,"stream":streamId,"template":"externalPipe"});//console.log(e)
                         
        e.setAttribute("owner",commonOwner.id);
    }
    var leftParentGroupNode=leftParent.parentNode;var rightParentGroupNode=rightParent.parentNode;
        leftParentGroupNode.setAttribute("connected","true");rightParentGroupNode.setAttribute("connected","true");   
    
    while (true){
        if (leftParentGroupNode.id!=commonOwnerG.id){
            leftParentGroupNode=leftParentGroupNode.parentNode;
            leftParentGroupNode.setAttribute("connected","true");
        }
        if (rightParentGroupNode.id!=commonOwnerG.id){
            rightParentGroupNode=rightParentGroupNode.parentNode;
            rightParentGroupNode.setAttribute("connected","true");
        }
        if(leftParentGroupNode.id==commonOwnerG.id && rightParentGroupNode.id==commonOwnerG.id){
            appendElement(commonParentG,e);break;
        }
    }
    appendElement(commonParentG,e)
    d3.select(e).datum(function(d){if(!d || d.name==null){
                                    var obj=new Object();obj.name=this.id;return obj;}
                                    else return d;});
    //Reshuffle existing pipes to evenly distribute them
    //collectedConns=collectConns(document.getElementById(origin));
    //collectedConns=positionPipesNew(collectedConns);
    //dragPipes(collectedConns.pipes);
    //updatePipes(pipeUid,bw,bw1);
    return e;
}

function createPipeObject(pipeUid,conn,loc){
    //console.log(pipeUid)
    var mPipe=new Object();
    mPipe.pipe=document.getElementById(pipeUid)//set an array member with pipe element
    //mPipe.pipeUid=mPipe.pipe.id;
    mPipe.id=mPipe.pipe.id;
    mPipe.origin=mPipe.pipe.getAttribute("origin");
    var lpattr = mPipe.pipe.getAttribute("leftparent");
    var rpattr = mPipe.pipe.getAttribute("rightparent");
    
    //console.log("Connected pipe: "+pipes[x].id)
    var lp=document.getElementById(lpattr);
    var rp=document.getElementById(rpattr);
    if (lp == null) {
        //Endpoint is potentially marked for removal
        var lp=document.getElementById(lpattr+"_dead");
        
        if (lp == null) {
            console.log("One of pipe parents can't be found...");
            //Endpoint is potentially marked for removal
        }
        else{
            mPipe.pipe.setAttribute("leftparent",lpattr+"_dead")
            if (mPipe.origin == lpattr) {
                mPipe.origin = lpattr+"_dead";
                mPipe.pipe.setAttribute("origin",lpattr+"_dead")
            }
        }
    }
    
    if (rp == null) {
        //Endpoint is potentially marked for removal
        var rp=document.getElementById(rpattr+"_dead");
        
        if (rp == null) {
            console.log("One of pipe parents can't be found...");
            //Endpoint is potentially marked for removal
        }
        else{
            mPipe.pipe.setAttribute("rightparent",rpattr+"_dead")
            if (mPipe.origin == rpattr) {
                mPipe.origin = rpattr+"_dead";
                mPipe.pipe.setAttribute("origin",rpattr+"_dead")
            }
        }
    }
    
    
    //console.log("Left,Right, and Conns");console.log(lp.id);console.log(rp.id);;console.log(sConns[i]);
    if(loc==1 || loc==3){
            //console.log("Location 1 or 3")
            if(lp==conn){mPipe.movingConnector=lp;mPipe.staticConnector=rp;mPipe.movingConnectorId=mPipe.movingConnector.id;mPipe.staticConnectorId=mPipe.staticConnector.id;}
            else if(rp==conn){mPipe.movingConnector=rp;mPipe.staticConnector=lp;mPipe.movingConnectorId=mPipe.movingConnector.id;mPipe.staticConnectorId=mPipe.staticConnector.id;}
    }
    if(loc==2){
            //console.log("Location 2")
            if(lp==conn){mPipe.movingConnector=rp;mPipe.staticConnector=lp;mPipe.movingConnectorId=mPipe.movingConnector.id;mPipe.staticConnectorId=mPipe.staticConnector.id;}
            else if(rp==conn){mPipe.movingConnector=lp;mPipe.staticConnector=rp;mPipe.movingConnectorId=mPipe.movingConnector.id;mPipe.staticConnectorId=mPipe.staticConnector.id;}
    }
    var mp=root.createSVGPoint();var sp=root.createSVGPoint();var start=root.createSVGPoint();var end=root.createSVGPoint();
    
    start.x=mPipe.pipe.raw_start_x || '';
    start.y=mPipe.pipe.raw_start_y || '';
    //console.log(start.y)
    end.x=mPipe.pipe.raw_end_x || '';
    end.y=mPipe.pipe.raw_end_y || '';
    
    mPipe.pipeScale=mPipe.pipe.parentNode.getCTM().a/mapMatrix.a;
    
    if(mPipe.origin==mPipe.staticConnectorId){
        //start=start.matrixTransform(mPipe.staticConnector.getCTM()).matrixTransform(mapMatrix.inverse());
        //end=end.matrixTransform(mPipe.movingConnector.getCTM()).matrixTransform(mapMatrix.inverse());
        start=start.matrixTransform(mPipe.staticConnector.getCTM()).matrixTransform(mPipe.pipe.getCTM().inverse());
        end=end.matrixTransform(mPipe.movingConnector.getCTM()).matrixTransform(mPipe.pipe.getCTM().inverse());
        //console.log(end.y)
        mPipe.scale=mPipe.staticConnector.getCTM().a/mapMatrix.a;
        mPipe.scale1=mPipe.movingConnector.getCTM().a/mapMatrix.a;
        if(mPipe.pipeScale==mPipe.scale && mPipe.pipeScale==mPipe.scale1){
            //console.log("Same scale: pipe "+mPipe.id);
            mPipe.scale=1;mPipe.scale1=1;
            //mPipe.pipe.setAttribute("transform","scale(8,8)")
        }
        mPipe.staticConnectorBw=mPipe.staticConnector.getAttribute("bw")*mPipe.scale;
        mPipe.movingConnectorBw=mPipe.movingConnector.getAttribute("bw")*mPipe.scale1;
        
        mp.x=mPipe.movingConnector.x1.animVal.value;mp.y=mPipe.movingConnector.y1.animVal.value+(mPipe.movingConnectorBw/2/mPipe.scale1);
        sp.x=mPipe.staticConnector.x1.animVal.value;sp.y=mPipe.staticConnector.y1.animVal.value+(mPipe.staticConnectorBw/2/mPipe.scale);
        
        mPipe.bw=Number(mPipe.pipe.getAttribute("bw"))*mPipe.scale;
        //console.log(mPipe.bw)
        mPipe.bw1=Number(mPipe.pipe.getAttribute("bw1"))*mPipe.scale1;
        //console.log(mPipe.bw1)
        if (mPipe.bw>mPipe.staticConnectorBw){
            //console.log("Too much bw for this connector! Shrinking pipe bw... Pipe: "+mPipe.id);
            nBw=mPipe.staticConnectorBw;
            //mPipe.pipe.setAttribute("bw",nBw);
            mPipe.bw=nBw;
        }
        if (mPipe.bw1>mPipe.movingConnectorBw){
            //console.log("Too much bw for this connector! Shrinking pipe bw... Pipe: "+mPipe.id);
            nBw=mPipe.movingConnectorBw;
            //mPipe.pipe.setAttribute("bw1",nBw);
            mPipe.bw1=nBw;
        }
    }
    else if(mPipe.origin==mPipe.movingConnectorId){
        //start=start.matrixTransform(mPipe.movingConnector.getCTM()).matrixTransform(mapMatrix.inverse());
        //end=end.matrixTransform(mPipe.staticConnector.getCTM()).matrixTransform(mapMatrix.inverse());
        start=start.matrixTransform(mPipe.movingConnector.getCTM()).matrixTransform(mPipe.pipe.getCTM().inverse());
        end=end.matrixTransform(mPipe.staticConnector.getCTM()).matrixTransform(mPipe.pipe.getCTM().inverse());
        //console.log(end.y)
        mPipe.scale1=mPipe.staticConnector.getCTM().a/mapMatrix.a;
        mPipe.scale=mPipe.movingConnector.getCTM().a/mapMatrix.a;
        if(mPipe.pipeScale==mPipe.scale && mPipe.pipeScale==mPipe.scale1){
            //console.log("Same scale: pipe "+mPipe.id);
            mPipe.scale=1;mPipe.scale1=1;
            //mPipe.pipe.setAttribute("transform","scale(8,8)")
        }
        mPipe.staticConnectorBw=mPipe.staticConnector.getAttribute("bw")*mPipe.scale1;
        mPipe.movingConnectorBw=mPipe.movingConnector.getAttribute("bw")*mPipe.scale;
        mp.x=mPipe.movingConnector.x1.animVal.value;mp.y=mPipe.movingConnector.y1.animVal.value+(mPipe.movingConnectorBw/2/mPipe.scale);
        sp.x=mPipe.staticConnector.x1.animVal.value;sp.y=mPipe.staticConnector.y1.animVal.value+(mPipe.staticConnectorBw/2/mPipe.scale1);
        
        mPipe.bw=Number(mPipe.pipe.getAttribute("bw"))*mPipe.scale;
        //console.log(mPipe.bw)
        mPipe.bw1=Number(mPipe.pipe.getAttribute("bw1"))*mPipe.scale1;
        //console.log(mPipe.bw1)
        if (mPipe.bw>mPipe.movingConnectorBw){
            //console.log("Too much bw for this connector! Shrinking pipe bw... Pipe: "+mPipe.id);
            nBw=mPipe.movingConnectorBw;
            //mPipe.pipe.setAttribute("bw",nBw);
            mPipe.bw=nBw;
        }
        if (mPipe.bw1>mPipe.staticConnectorBw){
            //console.log("Too much bw for this connector! Shrinking pipe bw... Pipe: "+mPipe.id);
            nBw=mPipe.staticConnectorBw;
            //mPipe.pipe.setAttribute("bw1",nBw);
            mPipe.bw1=nBw;
        }
    }    
    
    mPipe.movingXYPoint=mp;mPipe.staticXYPoint=sp;
    mPipe.movingPoint=mp.matrixTransform(mPipe.movingConnector.getCTM()).matrixTransform(mapMatrix.inverse());
    mPipe.staticPoint=sp.matrixTransform(mPipe.staticConnector.getCTM()).matrixTransform(mapMatrix.inverse());
    //console.log(start);console.log(end);

    mPipe.pipe.start_x=start.x;mPipe.pipe.start_y=start.y;
    mPipe.pipe.end_x=end.x;mPipe.pipe.end_y=end.y;
    mPipe.staticSiblings=mPipe.staticConnector.getAttribute("pipes");
    mPipe.movingSiblings=mPipe.movingConnector.getAttribute("pipes");
    //if(mPipe.movingPoint.y<mPipe.staticPoint.y) {mPipe.topBorder=viewportTop;mPipe.bottomBorder=mPipe.staticPoint.y};
    //if(mPipe.movingPoint.y>mPipe.staticPoint.y) {mPipe.topBorder=mPipe.staticPoint.y;mPipe.bottomBorder=viewportBottom};
    mPipe.type=mPipe.pipe.getAttribute("type");
    if(mPipe.type=="arcPipe"){
        mPipe.vector=mPipe.movingConnector.getAttribute("vector");
        mPipe.pipe.vector = mPipe.vector;
        }
    
    mPipe.flip=0;
    
    //Try to control scale
    //Test scaled down bw
    //mConns[i][k].q=mConns[i][k].movingConnector.getCTM().a*mapMatrix.inverse().a;
    mPipe.q=1;
    mPipe.pipe.bw=mPipe.bw;
    mPipe.pipe.bw1=mPipe.bw1;
    return mPipe;
}
        
function collectConns(evtTarget){
    //This function prepares lists of connections and associated pipes for move/reshuffle. 
    connected="true";//console.log("connected");//the group has connections to other groups			
    var x = 0;var u=0;var m=0;//var sc=0;			
    var p=new Array();var s = new Array();			
    var mConns = new Array();var sConns = new Array();var sConnsR = new Array();var pipes = new Array();
    pipes.length=0;p.length=0;mConns.length=0;sConns.length=0;sConnsR.length=0;
    
    //console.log(evtTarget.parentNode)
    
    var connectors=evtTarget.parentNode.querySelectorAll(".connector[pipes]");//console.log(connectorClass);
    
    //console.log("This many connectors: ",connectors.length)
    //console.log("Connectors: ",connectors)
    
    //for (var n=0,cl=connectorClass.length;n<cl;n++){connectors[n]=connectorClass[n]}
    for (var i=0,cl=connectors.length;i<cl;i++){
            if(connectors[i].hasAttribute("pipes")){
                //find connectors with pipes
                    var l=1;
                    var pp=document.querySelectorAll("path[rightparent="+connectors[i].id+"],path[leftparent="+connectors[i].id+"]");//console.log(pp);
                    for(var z=0,cp=pp.length;z<cp;z++){
                        //determine how many pipes the connector has and cycle through them - min one pipe
                            var ppo=pp[z].getAttribute("owner");
                            var pplp=pp[z].getAttribute("leftparent");
                            var pprp=pp[z].getAttribute("rightparent");
                            //console.log(evtTarget.parentNode.querySelector("#"+ppo))
                            if(evtTarget.parentNode.querySelector("#"+ppo)==null){l=0}//If the owner of the pipe doesn't belong to event target - the pipe isn't local
                            if(evtTarget.parentNode.querySelector("#"+pplp)!=null){
                                if(evtTarget.parentNode.querySelector("#"+pprp)!=null){l=1}//if both left and right parents are under target - the pipe is local
                            }
                    }
                    if(mConns.indexOf(connectors[i].id)==-1 && l==0){mConns.push(connectors[i].id)};
            }
    }
    for (var i=0,cl=mConns.length;i<cl;i++){
            var mc=document.getElementById(mConns[i]);
            var mp=document.querySelectorAll("path[rightparent="+mc.id+"],path[leftparent="+mc.id+"]");
            for (var e=0,mcp=mp.length;e<mcp;e++){
                    if(p.indexOf(mp[e].id)==-1){
                            p.push(mp[e].id);var px=pipes.push(createPipeObject(mp[e].id,mc,1));px=px-1;
                            var lp=pipes[px].pipe.getAttribute("leftparent");var rp=pipes[px].pipe.getAttribute("rightparent");
                            var sc=lp;if(lp==mc.id){sc=rp;}
                            if(sConns.indexOf(sc)==-1){sConns.push(sc)}//Note: could be arc connected to another sConn
                    }
                                    
            }
    }
    //This creates a second array of static connectors ids
    for (var i=0,cl=sConns.length;i<cl;i++){
        var sc=document.getElementById(sConns[i]);
        var sp=document.querySelectorAll("path[rightparent="+sc.id+"],path[leftparent="+sc.id+"]");
        for (var e=0,scp=sp.length;e<scp;e++){
            if(p.indexOf(sp[e].id)==-1){
                    p.push(sp[e].id);var px=pipes.push(createPipeObject(sp[e].id,sc,2));px=px-1;
                    var lp=pipes[px].pipe.getAttribute("leftparent");var rp=pipes[px].pipe.getAttribute("rightparent");
                    var scr=lp;if(lp==sc.id){scr=rp;}
                    if(sConnsR.indexOf(scr)==-1 && mConns.indexOf(scr)==-1){sConnsR.push(scr)}//Note: could be arc connected to another sConn
            }
        }
    }
    //This creates a third array of remote static connectors ids
    for (var i=0,cl=sConnsR.length;i<cl;i++){
        var rsc=document.getElementById(sConnsR[i]);
        var rsp=document.querySelectorAll("path[rightparent="+rsc.id+"],path[leftparent="+rsc.id+"]");
        for(var z=0,cp=rsp.length;z<cp;z++){
            if(p.indexOf(rsp[z].id)==-1){//This pipe will not have endx,y calculated. Need to do it now.
                p.push(rsp[z].id);var idx=pipes.push(createPipeObject(rsp[z].id,rsc,3));idx=idx-1;//console.log(pipes[idx])
                var lp=pipes[idx].pipe.getAttribute("leftparent");var rp=pipes[idx].pipe.getAttribute("rightparent");
                var scr=lp;if(lp==rsc.id){scr=rp;}
                //if(sConnsR.indexOf(scr)!=-1){pipes[idx].loop=1;}
                pipes[idx].start_x=pipes[idx].pipe.start_x;pipes[idx].start_y=pipes[idx].pipe.start_y;//console.log(pipes[idx].start_y)
                pipes[idx].end_x=pipes[idx].pipe.end_x;pipes[idx].end_y=pipes[idx].pipe.end_y;//console.log(pipes[idx].end_y);console.log(pipes[idx])
            }
        }
    }
    
    //Test scaled down bw
            //mConns[i][k].q=mConns[i][k].movingConnector.getCTM().a*mapMatrix.inverse().a;
            
    //Create three actual arrays with cross-reference to shared pipes
    for (var i=0,cl=mConns.length;i<cl;i++){
            var pp=document.getElementById(mConns[i]);
            mConns[i]=new Array;mConns[i].id=pp.id;mConns[i].scale=pp.getCTM().a*mapMatrix.inverse().a;mConns[i].bw=pp.getAttribute("bw")/**mConns[i].scale*/;mConns[i].actualBw=0;
            var pn=document.querySelectorAll("path[rightparent="+pp.id+"],path[leftparent="+pp.id+"]");
            for(var z=0,cp=pn.length;z<cp;z++){
                    mConns[i][z]=pipes[p.indexOf(pn[z].id)];//console.log(mConns[i][z-1])
                    if(mConns[i][z].origin==mConns[i].id){var pBw=mConns[i][z].bw}else{var pBw=mConns[i][z].bw1}
                    mConns[i].actualBw=mConns[i].actualBw+pBw;
            }
    }
    for (var i=0,cl=sConns.length;i<cl;i++){
            var pp=document.getElementById(sConns[i]);
            sConns[i]=new Array;sConns[i].id=pp.id;sConns[i].scale=pp.getCTM().a*mapMatrix.inverse().a;sConns[i].bw=pp.getAttribute("bw")/**sConns[i].scale*/;sConns[i].actualBw=0;
            var pn=document.querySelectorAll("path[rightparent="+pp.id+"],path[leftparent="+pp.id+"]");
            for(var z=0,cp=pn.length;z<cp;z++){
                    sConns[i][z]=pipes[p.indexOf(pn[z].id)];//console.log(mConns[i][z-1])
                    if(sConns[i][z].origin==sConns[i].id){var pBw=sConns[i][z].bw}else{var pBw=sConns[i][z].bw1}
                    sConns[i].actualBw=sConns[i].actualBw+pBw;
            }
    }
    for (var i=0,cl=sConnsR.length;i<cl;i++){
            var pp=document.getElementById(sConnsR[i]);
            sConnsR[i]=new Array;sConnsR[i].id=pp.id;sConnsR[i].scale=pp.getCTM().a*mapMatrix.inverse().a;sConnsR[i].bw=pp.getAttribute("bw")/**sConnsR[i].scale*/;sConnsR[i].actualBw=0;
            var pn=document.querySelectorAll("path[rightparent="+pp.id+"],path[leftparent="+pp.id+"]");
            for(var z=0,cp=pn.length;z<cp;z++){
                    sConnsR[i][z]=pipes[p.indexOf(pn[z].id)];//console.log(mConns[i][z-1])
                    if(sConnsR[i][z].origin==sConnsR[i].id){var pBw=sConnsR[i][z].bw}else{var pBw=sConnsR[i][z].bw1}
                    sConnsR[i].actualBw=sConnsR[i].actualBw+pBw;
            }
            
    }
    var collectedConns=new Object();
    collectedConns.mConns=mConns;
    collectedConns.sConns=sConns;
    collectedConns.sConnsR=sConnsR;
    collectedConns.pipes=pipes;
    return collectedConns;
}

function collectConnsUpdate(connectors){
    //This function prepares lists of connections and associated pipes for move/reshuffle. 
    connected="true";//console.log("connected");//the group has connections to other groups			
    var x = 0;var u=0;var m=0;//var sc=0;			
    var p=new Array();var s = new Array();			
    var mConns = new Array();var sConns = new Array();var sConnsR = new Array();var pipes = new Array();
    pipes.length=0;p.length=0;mConns.length=0;sConns.length=0;sConnsR.length=0;
    
    //console.log(evtTarget.parentNode)
    
    //var connectors=evtTarget.parentNode.querySelectorAll(".connector[pipes]");//console.log(connectorClass);
    
    //for (var n=0,cl=connectorClass.length;n<cl;n++){connectors[n]=connectorClass[n]}
    for (var i=0,cl=connectors.length;i<cl;i++){
            if(connectors[i] && connectors[i].hasAttribute("pipes")){//Confirm that connector exists
                //find connectors with pipes
                    var l=0;
                    var pp=document.querySelectorAll("path[rightparent="+connectors[i].id+"],path[leftparent="+connectors[i].id+"]");//console.log(pp);
                    for(var z=0,cp=pp.length;z<cp;z++){
                        //determine how many pipes the connector has and cycle through them - min one pipe
                            var ppo=pp[z].getAttribute("owner");
                            var pplp=pp[z].getAttribute("leftparent");
                            var pprp=pp[z].getAttribute("rightparent");
                            //console.log(evtTarget.parentNode.querySelector("#"+ppo))
                            //if(evtTarget.parentNode.querySelector("#"+ppo)==null){l=0}//If the owner of the pipe doesn't belong to event target - the pipe isn't local
                            //if(evtTarget.parentNode.querySelector("#"+pplp)!=null){
                            //    if(evtTarget.parentNode.querySelector("#"+pprp)!=null){l=1}//if both left and right parents are under target - the pipe is local
                            //}
                    }
                    if(mConns.indexOf(connectors[i].id)==-1 && l==0){mConns.push(connectors[i].id)};
            }
    }
    for (var i=0,cl=mConns.length;i<cl;i++){
            var mc=document.getElementById(mConns[i]);
            var mp=document.querySelectorAll("path[rightparent="+mc.id+"],path[leftparent="+mc.id+"]");
            for (var e=0,mcp=mp.length;e<mcp;e++){
                    if(p.indexOf(mp[e].id)==-1){
                            p.push(mp[e].id);var px=pipes.push(createPipeObject(mp[e].id,mc,1));px=px-1;
                            var lp=pipes[px].pipe.getAttribute("leftparent");var rp=pipes[px].pipe.getAttribute("rightparent");
                            var sc=lp;if(lp==mc.id){sc=rp;}
                            if(sConns.indexOf(sc)==-1){sConns.push(sc)}//Note: could be arc connected to another sConn
                    }
                                    
            }
    }
    //This creates a second array of static connectors ids
    for (var i=0,cl=sConns.length;i<cl;i++){
        var sc=document.getElementById(sConns[i]);
        var sp=document.querySelectorAll("path[rightparent="+sc.id+"],path[leftparent="+sc.id+"]");
        for (var e=0,scp=sp.length;e<scp;e++){
            if(p.indexOf(sp[e].id)==-1){
                    p.push(sp[e].id);var px=pipes.push(createPipeObject(sp[e].id,sc,2));px=px-1;
                    var lp=pipes[px].pipe.getAttribute("leftparent");var rp=pipes[px].pipe.getAttribute("rightparent");
                    var scr=lp;if(lp==sc.id){scr=rp;}
                    if(sConnsR.indexOf(scr)==-1 && mConns.indexOf(scr)==-1){sConnsR.push(scr)}//Note: could be arc connected to another sConn
            }
        }
    }
    //This creates a third array of remote static connectors ids
    for (var i=0,cl=sConnsR.length;i<cl;i++){
        var rsc=document.getElementById(sConnsR[i]);
        var rsp=document.querySelectorAll("path[rightparent="+rsc.id+"],path[leftparent="+rsc.id+"]");
        for(var z=0,cp=rsp.length;z<cp;z++){
            if(p.indexOf(rsp[z].id)==-1){//This pipe will not have endx,y calculated. Need to do it now.
                p.push(rsp[z].id);var idx=pipes.push(createPipeObject(rsp[z].id,rsc,3));idx=idx-1;//console.log(pipes[idx])
                var lp=pipes[idx].pipe.getAttribute("leftparent");var rp=pipes[idx].pipe.getAttribute("rightparent");
                var scr=lp;if(lp==rsc.id){scr=rp;}
                //if(sConnsR.indexOf(scr)!=-1){pipes[idx].loop=1;}
                pipes[idx].start_x=pipes[idx].pipe.start_x;pipes[idx].start_y=pipes[idx].pipe.start_y;//console.log(pipes[idx].start_y)
                pipes[idx].end_x=pipes[idx].pipe.end_x;pipes[idx].end_y=pipes[idx].pipe.end_y;//console.log(pipes[idx].end_y);console.log(pipes[idx])
            }
        }
    }
    
    //Test scaled down bw
            //mConns[i][k].q=mConns[i][k].movingConnector.getCTM().a*mapMatrix.inverse().a;
            
    //Create three actual arrays with cross-reference to shared pipes
    for (var i=0,cl=mConns.length;i<cl;i++){
            var pp=document.getElementById(mConns[i]);
            mConns[i]=new Array;mConns[i].id=pp.id;mConns[i].scale=pp.getCTM().a*mapMatrix.inverse().a;mConns[i].bw=pp.getAttribute("bw")/**mConns[i].scale*/;mConns[i].actualBw=0;
            var pn=document.querySelectorAll("path[rightparent="+pp.id+"],path[leftparent="+pp.id+"]");
            for(var z=0,cp=pn.length;z<cp;z++){
                    mConns[i][z]=pipes[p.indexOf(pn[z].id)];//console.log(mConns[i][z-1])
                    if(mConns[i][z].origin==mConns[i].id){var pBw=mConns[i][z].bw}else{var pBw=mConns[i][z].bw1}
                    mConns[i].actualBw=mConns[i].actualBw+pBw;
                    if (isNaN(mConns[i].actualBw)) {
                        debugger;
                    }
            }
    }
    for (var i=0,cl=sConns.length;i<cl;i++){
            var pp=document.getElementById(sConns[i]);
            sConns[i]=new Array;sConns[i].id=pp.id;sConns[i].scale=pp.getCTM().a*mapMatrix.inverse().a;sConns[i].bw=pp.getAttribute("bw")/**sConns[i].scale*/;sConns[i].actualBw=0;
            var pn=document.querySelectorAll("path[rightparent="+pp.id+"],path[leftparent="+pp.id+"]");
            for(var z=0,cp=pn.length;z<cp;z++){
                    sConns[i][z]=pipes[p.indexOf(pn[z].id)];//console.log(mConns[i][z-1])
                    if(sConns[i][z].origin==sConns[i].id){var pBw=sConns[i][z].bw}else{var pBw=sConns[i][z].bw1}
                    sConns[i].actualBw=sConns[i].actualBw+pBw;
                    if (isNaN(sConns[i].actualBw)) {
                        debugger;
                    }
            }
    }
    for (var i=0,cl=sConnsR.length;i<cl;i++){
            var pp=document.getElementById(sConnsR[i]);
            sConnsR[i]=new Array;sConnsR[i].id=pp.id;sConnsR[i].scale=pp.getCTM().a*mapMatrix.inverse().a;sConnsR[i].bw=pp.getAttribute("bw")/**sConnsR[i].scale*/;sConnsR[i].actualBw=0;
            var pn=document.querySelectorAll("path[rightparent="+pp.id+"],path[leftparent="+pp.id+"]");
            for(var z=0,cp=pn.length;z<cp;z++){
                    sConnsR[i][z]=pipes[p.indexOf(pn[z].id)];//console.log(mConns[i][z-1])
                    if(sConnsR[i][z].origin==sConnsR[i].id){var pBw=sConnsR[i][z].bw}else{var pBw=sConnsR[i][z].bw1}
                    sConnsR[i].actualBw=sConnsR[i].actualBw+pBw;
                    if (isNaN(sConnsR[i].actualBw)) {
                        debugger;
                    }
            }
            
    }
    var collectedConns=new Object();
    collectedConns.mConns=mConns;
    collectedConns.sConns=sConns;
    collectedConns.sConnsR=sConnsR;
    collectedConns.pipes=pipes;
    return collectedConns;
}


function lod(){
    
    //Disable for now...
    //return;
    
    //2/22/15 hack: create lod_0 just to see if it works
    //return;
    if (!globalTrace) {
        return;
    }
    else if (!globalTrace.lod) {
        return;
    }
    
    if (globalTrace) {
        globalTrace.lod.lod_0 = {};
        globalTrace.lod.lod_0.devices = globalTrace.devices
        globalTrace.lod.lod_0.io = globalTrace.io;
    }
    
    //zoomLevel is a global variable. It shows which zoom level the map was at BEFORE a zoom operation was initiated
    //showscale is a local variable, showing the current map zoom level AFTER the zoom operation (mouse wheel turn) was completed
    
    //if(mapMatrix.a>=1){
    //    //var showscale=Math.floor(mapMatrix.a);
    //    var showscale=Math.floor(mapMatrix.inverse().a);
    //}
    //else if(mapMatrix.a<1){
    //    //var showscale=Math.floor(mapMatrix.inverse().a)*-1
        var showscale=Math.floor(mapMatrix.inverse().a);
    //}
    console.log("Showscale: "+showscale," zoomLevel: "+zoomLevel);
    
    //console.log("zoomLevel: "+zoomLevel);
    
    if(zoomLevel==null){zoomLevel=showscale}
    
    var diff=Math.max(0,Math.abs(showscale-zoomLevel));
    if(diff==1){diff=0}
    var factor=lodFactor;
    var prevFactor=prevLodFactor;
    //factor=factor+diff;
    
    //Determine level
    var level=Math.max(0,(Math.floor(showscale/factor)));
   
    //Previous Level
    var prevLevel=Math.max(0,(Math.floor(zoomLevel/prevLodFactor)));
    
    console.log("Level: ",level," PrevLevel: ",prevLevel," LOD Factor: ",factor," DIFF: ",diff);
    //console.log("PrevLevel: ",prevLevel);
    //console.log("LOD Factor: ",factor)
    //console.log("DIFF: ",diff)
    
    
    if(level==prevLevel){
    
        console.log("no LOD");return;
    
    }
    else{console.log('LOD!')}
    
    //ZOOM IN:
    if(prevLevel > level){
        var d=prevLevel-level;//Level Difference from previous
        for(var a=0;a<=d;a++){
            var showLevel=prevLevel-a;
            paintNewLod(level);
            //d3.selectAll("[level='"+showLevel+"']").attr("visibility","visible");
        }
    }
    //ZOOM OUT
    if(level > prevLevel){
        var d = level - prevLevel;//Level Difference from previous
        for(var a=1; a <= d; a++){
            var hideLevel = level - a;
            //d3.selectAll("[level='"+hideLevel+"']").attr("visibility","hidden");
            paintNewLod(level);
        }
    }
    
    zoomLevel=showscale;
    prevLodFactor=lodFactor;
    
    function paintNewLod(level){
        
        var lod_level = "lod_" + level.toString();
        if (globalTrace.lod && globalTrace.lod[lod_level]) {
            
            paintAll(globalTrace.lod[lod_level])
            
        }
        
        
    }
    
}

function sortPipes(a,b){
    //console.log(a);console.log(b);
    //console.log("Parent X, Y: "+parentX+" "+parentY)
    var distanceYa=Math.abs(a.posY-parentY);var distanceXa=Math.abs(a.posX-parentX);
    var distanceYb=Math.abs(b.posY-parentY);var distanceXb=Math.abs(b.posX-parentX);
    if(a.type!="arcPipe" && b.type!="arcPipe"){
        if(a.posY>b.posY){return 1};
        if(a.posY<b.posY){return -1};
        if(a.posY==b.posY){if(a.id<b.id){return -1}else {return 1}}
    }
    if(a.type=="arcPipe" && b.type=="arcPipe"){
        if(a.posY<parentY && b.posY<parentY){/*console.log("up");*/
                //upper logic here
                //next line should take care of arc pipes connected to the same parents
                //if(distanceXa==distanceXb && distanceYa==distanceYb){/*console.log("up1");*/return -1};
                if(distanceXa==distanceXb && distanceYa==distanceYb){
                    if(a.id>b.id){return -1}else {return 1}
                    };            
                if(distanceYa>distanceYb){/*console.log("up2");*/return 1}
                if(distanceYa<distanceYb){/*console.log("up3");*/return -1}
        }
        else if (a.posY>parentY && b.posY>parentY){/*console.log("down");*/
                //lower logic here
                //next line should take care of arc pipes connected to the same parents
                //if(distanceXa==distanceXb && distanceYa==distanceYb){/*console.log("down1");*/return 1};
                if(distanceXa==distanceXb && distanceYa==distanceYb){
                    if(a.id>b.id){return 1}else {return -1}
                    }; 
                if(distanceYa>distanceYb){/*console.log("down2");*/return -1}
                if(distanceYa<distanceYb){/*console.log("down3");*/return 1}
        }
        else {//This is when the two compared items are in different directions from the parent - up and down
                //console.log("else");
                if(a.posY>b.posY){return 1};
                if(a.posY<b.posY){return -1};
        }
        return 0;
    }
    if(a.type!=b.type){
        if(a.type=="arcPipe"){
            if(a.posY>parentY){return 1};
            if(a.posY<parentY){return -1};
        }
        if(b.type=="arcPipe"){
            if(b.posY>parentY){return -1};
            if(b.posY<parentY){return 1};
        }
    }
}

function sortDragPipes(a,b){
    compareCount=compareCount+1;
    //console.log(a);console.log(b);
    //console.log("Parent X, Y: "+parentX+" "+parentY)
    //let the sort function know which point it opposite;0 means static point is opposite parent
    //console.log("Sort function determining the local connector: "+lConn);
    if(a.movingConnectorId==lConn){aposY=a.staticPoint.y;aposX=a.staticPoint.x;}
    if(a.staticConnectorId==lConn){aposY=a.movingPoint.y;aposX=a.movingPoint.x;}
    
    if(b.movingConnectorId==lConn){bposY=b.staticPoint.y;bposX=b.staticPoint.x;}
    if(b.staticConnectorId==lConn){bposY=b.movingPoint.y;bposX=b.movingPoint.x;}
    
    var distanceYa=Math.abs(aposY-parentY);var distanceXa=Math.abs(aposX-parentX);
    var distanceYb=Math.abs(bposY-parentY);var distanceXb=Math.abs(bposX-parentX);
    if(a.type!="arcPipe" && b.type!="arcPipe"){
        if(aposY>bposY){return 1};
        if(aposY<bposY){return -1};
        if(aposY==bposY){if(a.id<b.id){return -1}else {return 1}}
    }
    if(a.type=="arcPipe" && b.type=="arcPipe"){
        if(aposY<parentY && bposY<parentY){//console.log("up");
                //upper logic here
                //next line should take care of arc pipes connected to the same parents
                //if(distanceXa==distanceXb && distanceYa==distanceYb){/*console.log("up1");*/return -1};
                if(distanceXa==distanceXb && distanceYa==distanceYb){
                    if(a.id>b.id){return -1}else {return 1}
                    };            
                if(distanceYa>distanceYb){/*console.log("up2");*/return 1}
                if(distanceYa<distanceYb){/*console.log("up3");*/return -1}
        }
        else if (aposY>parentY && bposY>parentY){//console.log("down");
                //lower logic here
                //next line should take care of arc pipes connected to the same parents
                //if(distanceXa==distanceXb && distanceYa==distanceYb){/*console.log("down1");*/return 1};
                if(distanceXa==distanceXb && distanceYa==distanceYb){
                    if(a.id>b.id){return 1}else {return -1}
                    }; 
                if(distanceYa>distanceYb){/*console.log("down2");*/return -1}
                if(distanceYa<distanceYb){/*console.log("down3");*/return 1}
        }
        else {//This is when the two compared items are in different directions from the parent - up and down
                //console.log("else");
                if(aposY>bposY){return 1};
                if(aposY<bposY){return -1};
        }
        return 0;
    }
    if(a.type!=b.type){
        if(a.type=="arcPipe"){
            if(aposY>parentY){return 1};
            if(aposY<parentY){return -1};
        }
        if(b.type=="arcPipe"){
            if(bposY>parentY){return -1};
            if(bposY<parentY){return 1};
        }
    }
}

function dragPipes(pipes){
    //console.log(p[0].id)
    //positionPipesNew();
    for(var i=0,pl=pipes.length;i<pl;i++){
        if(pipes[i].pipe.getAttribute("type")=="internalPipe"){
            pipes[i].pipe.setAttribute("d",dragMovingPipe(pipes[i]));
            //pipes[i].setAttribute("d",flexFixedPipe(lConnectors[i],rConnectors[i],pBw[i],p[i].id,0.5,0,0));
            //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
        }
        else if(pipes[i].pipe.getAttribute("type")=="arcPipe"){
            pipes[i].pipe.setAttribute("d",dragArcPipe(pipes[i]));
            //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
            //var ptempA=d3.select("#"+pipes[i].id);
            
            //ptempA.transition().attr("d",dragArcPipe(pipes[i])).duration(2000);
        }        
        else if(pipes[i].pipe.getAttribute("type")=="externalPipe"){
            if(pipes[i].pipe.__transition__){continue;}
            pipes[i].pipe.setAttribute("d",dragMovingPipe(pipes[i]));
            //var ptempE=d3.select("#"+pipes[i].id);
            
            //ptempE.transition().attr("d",dragMovingPipe(pipes[i])).duration(2000);
            
            //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
        }
        else{console.log("No Pipe...")}
        //setCTM(p[i],root.createSVGMatrix()
        //.translate(-(p[i].parentNode.getCTM().e/mapMatrix.a-mapMatrix.e/mapMatrix.a)
        //,-(p[i].parentNode.getCTM().f/mapMatrix.d-mapMatrix.f/mapMatrix.d)))
    }
    //lConnectors.length=0;rConnectors.length=0;pBw.length=0;p.length=0;//var x=0;
    dragPipesCount=dragPipesCount+1;
}

function redrawPipe(pipe){
        
        if(pipe.getAttribute("type") == "externalPipe"){
            //if(pipe.__transition__){
            //    return pipe.getAttribute("d");
            //    ;}
            return dragMovingPipe(pipe);
            //pipes[i].pipe.setAttribute("d",dragMovingPipe(pipes[i]));
            //var ptempE=d3.select("#"+pipes[i].id);
            
            //ptempE.transition().attr("d",dragMovingPipe(pipes[i])).duration(2000);
            
            //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
        }
        if(pipe.getAttribute("type")=="arcPipe"){
            
            //if(pipe.__transition__){
            //    return pipe.getAttribute("d");
            //    ;}
            
            return dragArcPipe(pipe);
            
            //pipes[i].pipe.setAttribute("d",dragArcPipe(pipes[i]));
            //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
            //var ptempA=d3.select("#"+pipes[i].id);
            
            //ptempA.transition().attr("d",dragArcPipe(pipes[i])).duration(2000);
        }
        //else if(pipe.getAttribute("type") == "internalPipe"){
        //    return dragMovingPipe(pipe);
        //    //pipes[i].pipe.setAttribute("d",dragMovingPipe(pipes[i]));
        //    //pipes[i].setAttribute("d",flexFixedPipe(lConnectors[i],rConnectors[i],pBw[i],p[i].id,0.5,0,0));
        //    //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
        //}
              
        
        //else{console.log("No Pipe...")}
    
}

//function updatePipes(uId,bw,bw1){
//    return;
//    //console.log(p[0].id)
//    //positionPipesNew();
//    
//    var pipe=document.getElementById(uId);
//    var origin=document.getElementById(pipe.getAttribute("origin"));
//    pipe.setAttribute("bw",bw);
//    pipe.setAttribute("bw1",bw1);
//    var collectedConns=collectConns(origin);
//    collectedConns=positionPipesNew(collectedConns);
//    var pipes=collectedConns.pipes;
//    
//    for(var i=0,pl=pipes.length;i<pl;i++){
//        if(pipes[i].pipe.getAttribute("type")=="internalPipe"){
//            pipes[i].pipe.setAttribute("d",dragMovingPipe(pipes[i]));
//            //pipes[i].setAttribute("d",flexFixedPipe(lConnectors[i],rConnectors[i],pBw[i],p[i].id,0.5,0,0));
//            //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
//        }
//        else if(pipes[i].pipe.getAttribute("type")=="arcPipe"){
//            //pipes[i].pipe.setAttribute("d",dragArcPipe(pipes[i]));
//            //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
//            var path=dragMovingPipe(pipes[i]);
//            var ptempA=d3.select("#"+pipes[i].id);
//            ptempA.transition().attr("d",path).duration(2000);
//        }        
//        else if(pipes[i].pipe.getAttribute("type")=="externalPipe"){
//            //pipes[i].pipe.setAttribute("d",dragMovingPipe(pipes[i]));
//            var path=dragMovingPipe(pipes[i]);
//            var ptempE=d3.select("#"+pipes[i].id);
//            //if(ptempE.node().__transition__){continue;}//Check if there is another transition scheduled on this node. Transitions overwrite each other.
//            //ptempE.transition().attr("d",path).duration(2000);
//            ptempE.attr("d",path);
//            
//            //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
//        }
//        else{console.log("No Pipe...")}
//        //setCTM(p[i],root.createSVGMatrix()
//        //.translate(-(p[i].parentNode.getCTM().e/mapMatrix.a-mapMatrix.e/mapMatrix.a)
//        //,-(p[i].parentNode.getCTM().f/mapMatrix.d-mapMatrix.f/mapMatrix.d)))
//    }
//    //lConnectors.length=0;rConnectors.length=0;pBw.length=0;p.length=0;//var x=0;
//    //dragPipesCount=dragPipesCount+1;
//}

function removePipes(uId){
    //console.log(p[0].id)
    //positionPipesNew();
    
    var pipe=document.getElementById(uId);
    var origin=document.getElementById(pipe.getAttribute("origin"));
    pipe.setAttribute("bw",0);
    pipe.setAttribute("bw1",0);
    var collectedConns=collectConns(origin);
    collectedConns=positionPipesNew(collectedConns);
    var pipes=collectedConns.pipes;
    
    for(var i=0,pl=pipes.length;i<pl;i++){
        if(pipes[i].pipe.getAttribute("type")=="internalPipe"){
            pipes[i].pipe.setAttribute("d",dragMovingPipe(pipes[i]));
            //pipes[i].setAttribute("d",flexFixedPipe(lConnectors[i],rConnectors[i],pBw[i],p[i].id,0.5,0,0));
            //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
        }
        else if(pipes[i].pipe.getAttribute("type")=="arcPipe"){
            //pipes[i].pipe.setAttribute("d",dragArcPipe(pipes[i]));
            //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
            var path=dragMovingPipe(pipes[i]);
            var ptempA=d3.select("#"+pipes[i].id);
            ptempA.transition().duration(2000).attr("d",path)//.remove();
            //ptempA.transition().delay(2020).remove();
        }        
        else if(pipes[i].pipe.getAttribute("type")=="externalPipe"){
            //pipes[i].pipe.setAttribute("d",dragMovingPipe(pipes[i]));
            var path=dragMovingPipe(pipes[i]);
            var ptempE=d3.select("#"+pipes[i].id);
            //if(ptempE.node().__transition__){continue;}//Check if there is another transition scheduled on this node. Transitions overwrite each other.
            //ptempE.remove();
            ptempE.transition().duration(2000).attr("d",path).remove();
            //ptempE.transition().delay(2020).remove();
            
            //console.log("Reshuffle: Pipe ID: "+p[i].id+" Pipe Path: "+p[i].getAttribute("d"))
        }
        else{console.log("No Pipe...")}
        
        //setCTM(p[i],root.createSVGMatrix()
        //.translate(-(p[i].parentNode.getCTM().e/mapMatrix.a-mapMatrix.e/mapMatrix.a)
        //,-(p[i].parentNode.getCTM().f/mapMatrix.d-mapMatrix.f/mapMatrix.d)))
    }
    
    //var remove=d3.select("#"+uId)
    //console.log("removing ",uId);
    //remove.transition().delay(4050).remove();
    //console.log(document.getElementById(uId));
    //lConnectors.length=0;rConnectors.length=0;pBw.length=0;p.length=0;//var x=0;
    //dragPipesCount=dragPipesCount+1;
}

function positionPipesNew(collectedConns){
    
    var mConns = collectedConns.mConns;
    var sConns = collectedConns.sConns;
    var sConnsR = collectedConns.sConnsR;
    var pipes = collectedConns.pipes;
    positionCount=positionCount+1;
    var start_x,start_y,end_x,end_y,raw_start_x,raw_start_y,raw_end_x,raw_end_y,flip=0;
    for(var i=0,ml=mConns.length;i<ml;i++){
        var j=0;var connPipesOrigins=new Array();var actualBw=mConns[i].actualBw; var shift=0;var prevSiblingsBw=0;var j=0;
        for(var h=0,ml1=mConns[i].length;h<ml1;h++){
            //mConns[i][j].movingPoint=mConns[i][j].movingXYPoint.matrixTransform(mConns[i][j].movingConnector.getCTM()).matrixTransform(mapMatrix.inverse());
            mConns[i][j].movingPoint=mConns[i][j].movingXYPoint.matrixTransform(mConns[i][j].movingConnector.getCTM()).matrixTransform(mConns[i][j].pipe.getCTM().inverse());
            //p.matrixTransform(connector.getCTM()).matrixTransform(pipe.getCTM().inverse()) --- This gives you the postion without transforming pipes
            //mConns[i][j].staticPoint=mConns[i][j].staticXYPoint.matrixTransform(mConns[i][j].staticConnector.getCTM()).matrixTransform(mapMatrix.inverse());
            mConns[i][j].staticPoint=mConns[i][j].staticXYPoint.matrixTransform(mConns[i][j].staticConnector.getCTM()).matrixTransform(mConns[i][j].pipe.getCTM().inverse());
            j++;
        }
        lConn=mConns[i].id;
        parentY=mConns[i][j-1].movingPoint.y;parentX=mConns[i][j-1].movingPoint.x;
        if(mConns[i][j-1].staticConnectorId==lConn){parentY=mConns[i][j-1].staticPoint.y;parentX=mConns[i][j-1].staticPoint.x;}
        
        mConns[i].sort(sortDragPipes);sortCount=sortCount+1;
        //if(mConns[i][j-1].bw>mConns[i].bw){console.log("Too much bw for this connector! Shrinking...");mConns[i][j-1].bw=mConns[i].bw;mConns[i][j-1].pipe.setAttribute("bw",mConns[i].bw)}
        //if(actualBw==mConns[i][j-1].bw){nshift=1}else{nshift=Math.min(1,((mConns[i].bw-mConns[i][j-1].bw)/(actualBw-mConns[i][j-1].bw)))};
        //console.log("N-Shift - first Calc: "+nshift);
        //There's an infinite loop below somewhere. this is going to break it
        var br=0;var remainderBw=0;var prevStop=0;var eshift=1;var gshift=0;var lBw=0;var plBw=0;//var scale=mConns[i].scale;
        for(var k=0,mo=mConns[i].length;k<mo;k++){            
            
            if(mConns[i][k].origin==lConn){
                mConns[i][k].flip=0;flip=0;//Calculating start postion
                lBw=mConns[i][k].bw;var scale=mConns[i][k].scale;
            }
            else{mConns[i][k].flip=1;flip=1;lBw=mConns[i][k].bw1;var scale=mConns[i][k].scale1;};//Calculating end position
            
            //UNCOMMENT IF YOU NOTICE WEIRD PIPE BEHAVIOR
            //setCTM(mConns[i][k].pipe,root.createSVGMatrix().scale(1/mConns[i][k].pipeScale).translate(-(mConns[i][k].pipe.parentNode.getCTM().e/mapMatrix.a-mapMatrix.e/mapMatrix.a)
		//    ,-(mConns[i][k].pipe.parentNode.getCTM().f/mapMatrix.d-mapMatrix.f/mapMatrix.d)))
            
            if(k>0){prevStop=(prevStop)+plBw-gshift}else{prevStop=0}
            remainderBw=actualBw-prevSiblingsBw;
            if(k>0){eshift=Math.min((1),(mConns[i].bw*scale-prevStop)/remainderBw)}else{eshift=0}
            if(k==0){gshift=0}
            //else if(k==1){gshift=Math.min((lBw-lBw*eshift),(plBw-plBw*eshift))}
            else if(k==1){gshift=Math.min((lBw-lBw*eshift),(plBw))}
            //else{gshift=(lBw-lBw*eshift)}
            else{gshift=Math.min((lBw-lBw*eshift),(prevStop))}
            
            plBw=lBw;
            
            if(mConns[i][k].type=="arcPipe"){
                if(mConns[i][k].movingConnectorId==lConn){//console.log("1M-moving")
                    start_x = mConns[i][k].movingPoint.x
                    raw_start_x = mConns[i][k].movingXYPoint.x
                    if(flip==0){
                        start_y = mConns[i][k].movingPoint.y-Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)+prevStop-gshift
                        //start_y = mConns[i][k].movingPoint.y-Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)+(prevSiblingsBw*nshift);//works
                        raw_start_y = mConns[i][k].movingXYPoint.y-Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                    }
                    if(flip==1){
                        start_y = mConns[i][k].movingPoint.y+lBw-Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)+prevStop-gshift;
                        //start_y = mConns[i][k].movingPoint.y+mConns[i][k].bw-Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)+(prevSiblingsBw*nshift);//works
                        //end_y = sConns[i][k].movingPoint.y+sConns[i][k].bw+Math.min(actualBw/2,sConns[i][k].movingConnectorBw/2)+(prevSiblingsBw*nshift);
                        raw_start_y = mConns[i][k].movingXYPoint.y+lBw-Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                    }
                    //console.log(raw_start_y)
                    prevSiblingsBw=prevSiblingsBw+(lBw);
                    //mConns[i][k].pipe.start_x=mConns[i][k].start_x;mConns[i][k].pipe.start_y=mConns[i][k].start_y;
                    //continue;
                }
                
                else if(mConns[i][k].staticConnectorId==lConn){//console.log("WTF!!")
                    if(flip==0){
                        start_y = mConns[i][k].staticPoint.y-Math.min(actualBw/2,mConns[i][k].staticConnectorBw/2)+prevStop-gshift
                        //start_y = mConns[i][k].movingPoint.y-Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)+(prevSiblingsBw*nshift);//works
                        raw_start_y = mConns[i][k].staticXYPoint.y-Math.min(actualBw/2,mConns[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                    }
                    if(flip==1){
                        start_y = mConns[i][k].staticPoint.y+lBw-Math.min(actualBw/2,mConns[i][k].staticConnectorBw/2)+prevStop-gshift;
                        //start_y = mConns[i][k].movingPoint.y+mConns[i][k].bw-Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)+(prevSiblingsBw*nshift);//works
                        //end_y = sConns[i][k].movingPoint.y+sConns[i][k].bw+Math.min(actualBw/2,sConns[i][k].movingConnectorBw/2)+(prevSiblingsBw*nshift);
                        raw_start_y = mConns[i][k].staticXYPoint.y+lBw-Math.min(actualBw/2,mConns[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                    }
                    //console.log(raw_start_y)
                    prevSiblingsBw=prevSiblingsBw+(lBw);
                    //mConns[i][k].pipe.end_x=mConns[i][k].end_x;mConns[i][k].pipe.end_y=mConns[i][k].end_y;
                //    //continue;
                }
            }
            else{
                //console.log("Actual BW: "+actualBw);
                //console.log("N-Shift: "+nshift);
                //console.log("Eshift: "+eshift)
                //console.log("Prev BW: "+prevSiblingsBw)
                //console.log("Prev shifted BW: "+(prevSiblingsBw*nshift))
                //console.log("Pipe BW: "+mConns[i][k].bw)
                //console.log("Moving Connector BW: "+mConns[i][k].movingConnectorBw)
                //console.log("Conn BW: "+mConns[i].bw)
                //console.log("Starting Y Point: "+(mConns[i][k].movingPoint.y))
                //console.log("Starting Y Point: "+(Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)))
                //console.log("Scaled Starting Y Point: "+(Math.min(actualBw/2,mConns[i][k].movingConnectorBw*scale/2)))
                
                //prevSiblingsBw=prevSiblingsBw+(mConns[i][k].bw*nshift);
                start_x = mConns[i][k].movingPoint.x;
                start_y = mConns[i][k].movingPoint.y-Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)+prevStop-gshift
                //start_y = mConns[i][k].movingPoint.y-Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)+(prevSiblingsBw*nshift);//works!!!
                raw_start_x=mConns[i][k].movingXYPoint.x;
                raw_start_y=mConns[i][k].movingXYPoint.y-Math.min(actualBw/2,mConns[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                prevSiblingsBw=prevSiblingsBw+(lBw);
                //mConns[i][k].pipe.start_x=mConns[i][k].start_x;mConns[i][k].pipe.start_y=mConns[i][k].start_y;
                //continue;
            }
            //console.log(start_y)
            if(mConns[i][k].flip==1){//console.log("Flipping the whole mConn pipe");//flip(mConns[i][k])
                mConns[i][k].end_x=start_x
                mConns[i][k].end_y=start_y
                mConns[i][k].pipe.end_x=mConns[i][k].end_x;mConns[i][k].pipe.end_y=mConns[i][k].end_y;
                mConns[i][k].pipe.raw_end_x=raw_start_x;mConns[i][k].pipe.raw_end_y=raw_start_y;
            }
            else{
                mConns[i][k].start_x=start_x
                mConns[i][k].start_y=start_y
                mConns[i][k].pipe.start_x=mConns[i][k].start_x;mConns[i][k].pipe.start_y=mConns[i][k].start_y;
                mConns[i][k].pipe.raw_start_x=raw_start_x;mConns[i][k].pipe.raw_start_y=raw_start_y;
                
                //if (
                //    isNaN(start_x) ||
                //    isNaN(start_y) //||
                //    //isNaN(end_x) ||
                //    //isNaN(end_y) ||
                //    //isNaN(raw_start_x) ||
                //    //isNaN(raw_start_y) ||
                //    //isNaN(raw_end_x) ||
                //    //isNaN(raw_end_y))
                //   ){
                //        debugger
                //}
                
                
            }
            
            
        }
    }
    
    //if(positionCount>0){
        for(var i=0,ml=sConns.length;i<ml;i++){
            j=0;var connPipesOrigins=new Array();var actualBw=sConns[i].actualBw; var shift=0;var prevSiblingsBw=0;var j=0;
            for(var h=0,ml1=sConns[i].length;h<ml1;h++){//This is a single connector - cycling through pipes
                //sConns[i][j].staticPoint=sConns[i][j].staticXYPoint.matrixTransform(sConns[i][j].staticConnector.getCTM()).matrixTransform(mapMatrix.inverse())
                //sConns[i][j].movingPoint=sConns[i][j].movingXYPoint.matrixTransform(sConns[i][j].movingConnector.getCTM()).matrixTransform(mapMatrix.inverse())
                sConns[i][j].staticPoint=sConns[i][j].staticXYPoint.matrixTransform(sConns[i][j].staticConnector.getCTM()).matrixTransform(sConns[i][j].pipe.getCTM().inverse())
                sConns[i][j].movingPoint=sConns[i][j].movingXYPoint.matrixTransform(sConns[i][j].movingConnector.getCTM()).matrixTransform(sConns[i][j].pipe.getCTM().inverse())
                j++;
            }
            lConn=sConns[i].id;//console.log(lConn)
            parentY=sConns[i][j-1].staticPoint.y;parentX=sConns[i][j-1].staticPoint.x;
            //shift=0;if (actualBw>sConns[i][j-1].staticConnectorBw){shift=(actualBw-sConns[i][j-1].staticConnectorBw)/(sConns[i].length-1);}
            
            if(sConns[i][j-1].movingConnectorId==lConn){
                parentY=sConns[i][j-1].movingPoint.y;parentX=sConns[i][j-1].movingPoint.x;
                /*shift=0;if (actualBw>sConns[i][j-1].movingConnectorBw){shift=(actualBw-sConns[i][j-1].movingConnectorBw)/(sConns[i].length-1);}*/}

            sConns[i].sort(sortDragPipes);sortCount=sortCount+1;
            if(actualBw==sConns[i][j-1].bw){nshift=1}else{nshift=Math.min(1,((sConns[i].bw-sConns[i][j-1].bw)/(actualBw-sConns[i][j-1].bw)))};
            
            var br=0;var remainderBw=0;var prevStop=0;var eshift=1;var gshift=0;var lBw=0;var plBw=0;//var scale=sConns[i].scale;
            for(var k=0,mo=sConns[i].length;k<mo;k++){
                //var edgeFix=(prevSiblingsBw*nshift)+sConns[i][k].bw
                //if(Number(edgeFix.toFixed(10))>sConns[i].bw){
                ////if(((prevSiblingsBw*nshift)+sConns[i][k].bw)>sConns[i].bw){
                //    nshift=Math.min(1,((sConns[i].bw-sConns[i][k].bw)/(prevSiblingsBw)))
                //    prevSiblingsBw=0;k=-1;continue;
                //}
                
                             
                if(sConns[i][k].origin==lConn){
                    //console.log("Flip sconn")
                    sConns[i][k].flip=1;flip=1;lBw=sConns[i][k].bw;var scale=sConns[i][k].scale;//Calculating start postion
                }
                else{sConns[i][k].flip=0;flip=0;lBw=sConns[i][k].bw1;var scale=sConns[i][k].scale1;};//Calculating end position
                
                //UNCOMMENT IF YOU NOTICE WEIRD PIPE BEHAVIOR
                //setCTM(sConns[i][k].pipe,root.createSVGMatrix().scale(1/sConns[i][k].pipeScale).translate(-(sConns[i][k].pipe.parentNode.getCTM().e/mapMatrix.a-mapMatrix.e/mapMatrix.a)
		//		,-(sConns[i][k].pipe.parentNode.getCTM().f/mapMatrix.d-mapMatrix.f/mapMatrix.d)))   
                
                if(k>0){prevStop=(prevStop)+plBw-gshift}else{prevStop=0}
                remainderBw=actualBw-prevSiblingsBw;
                if(k>0){eshift=Math.min(1,(sConns[i].bw*scale-prevStop)/remainderBw)}else{eshift=0}
                if(k==0){gshift=0}
                else if(k==1){gshift=Math.min((lBw-lBw*eshift),(plBw))}
                //else{gshift=(lBw-lBw*eshift)}
                else{gshift=Math.min((lBw-lBw*eshift),(prevStop))}
                //console.log("#################SCONNS#############")
                //console.log("K: "+k);
                //console.log("Lconn: "+lConn);
                //console.log("Actual BW: "+actualBw);
                //console.log("Connector BW: "+sConns[i].bw)
                //console.log("Prev BW: "+prevSiblingsBw)
                //console.log("Pipe BW: "+lBw)
                //console.log("Prev Pipe BW: "+plBw)
                //console.log("remaining space: "+(lBw-prevStop))
                //console.log("remainder bw to squeeze: "+remainderBw);
                //console.log("Eshift: "+eshift);
                //console.log("G-Shift: "+gshift);
                //console.log("Prevstop: "+prevStop)
                plBw=lBw;
                
                if(sConns[i][k].type=="arcPipe"){
                    if(sConns[i][k].movingConnectorId==lConn){//console.log("1S-moving")
                        //console.log("Local Conn: "+lConn);
                        //console.log("Actual BW: "+actualBw);
                        //console.log("Shift: "+shift);
                        //console.log("Eshift: "+eshift)
                        //console.log("Prev BW: "+prevSiblingsBw)
                        //console.log("Pipe BW: "+sConns[i][k].bw)
                        end_x = sConns[i][k].movingPoint.x
                        raw_end_x = sConns[i][k].movingXYPoint.x
                        if(flip==0){
                            end_y = sConns[i][k].movingPoint.y+lBw+Math.min(actualBw/2,sConns[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                            raw_end_y = sConns[i][k].movingXYPoint.y+lBw+Math.min(actualBw/2,sConns[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        }
                        if(flip==1){
                            end_y = sConns[i][k].movingPoint.y-Math.min(actualBw/2,sConns[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                            raw_end_y = sConns[i][k].movingXYPoint.y-Math.min(actualBw/2,sConns[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        }
                        //sConns[i][k].pipe.start_x=sConns[i][k].start_x;sConns[i][k].pipe.start_y=sConns[i][k].start_y;
                        //console.log(end_y)
                        prevSiblingsBw=prevSiblingsBw+lBw;
                        //continue;
                    }
                    else if(sConns[i][k].staticConnectorId==lConn){//console.log("2S-static "+sConns[i][k].id);console.log(flip)
                        //console.log("Local Conn: "+lConn);
                        //console.log("Actual BW: "+actualBw);
                        //console.log("Shift: "+shift);
                        //console.log("Eshift: "+eshift)
                        //console.log("Prev BW: "+prevSiblingsBw)
                        //console.log("Pipe BW: "+sConns[i][k].bw)
                        end_x = sConns[i][k].staticPoint.x
                        raw_end_x = sConns[i][k].staticXYPoint.x
                        if(flip==0){
                            end_y = sConns[i][k].staticPoint.y+lBw-Math.min(actualBw/2,sConns[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                            raw_end_y = sConns[i][k].staticXYPoint.y+lBw-Math.min(actualBw/2,sConns[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        }
                        if(flip==1){
                            end_y = sConns[i][k].staticPoint.y-Math.min(actualBw/2,sConns[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                            raw_end_y = sConns[i][k].staticXYPoint.y-Math.min(actualBw/2,sConns[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        }
                        //sConns[i][k].pipe.end_x=sConns[i][k].end_x;sConns[i][k].pipe.end_y=sConns[i][k].end_y;
                        //console.log(end_y)
                        prevSiblingsBw=prevSiblingsBw+lBw;
                        //continue;
                    }
                }
                else{
                    //console.log("sConns Pipe. Creating end_x and end_y");;console.log("Prev Siblings BW: "+prevSiblingsBw)
                    if(sConns[i][k].movingConnectorId==lConn){
                        //console.log("Local Conn: "+lConn);
                        //console.log("Actual BW: "+actualBw);
                        //console.log("Shift: "+shift);
                        //console.log("Eshift: "+eshift)
                        //console.log("Prev BW: "+prevSiblingsBw)
                        //console.log("Pipe BW: "+sConns[i][k].bw)
                        end_x = sConns[i][k].movingPoint.x
                        end_y = sConns[i][k].movingPoint.y-Math.min(actualBw/2,sConns[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        raw_end_x = sConns[i][k].movingXYPoint.x
                        raw_end_y = sConns[i][k].movingXYPoint.y-Math.min(actualBw/2,sConns[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        //sConns[i][k].pipe.end_x=sConns[i][k].end_x;sConns[i][k].pipe.end_y=sConns[i][k].end_y;
                        prevSiblingsBw=prevSiblingsBw+lBw;
                        //continue;
                    }
                    else if(sConns[i][k].staticConnectorId==lConn){
                        //console.log("Local Conn: "+lConn);
                        //console.log("Actual BW: "+actualBw);
                        //console.log("Shift: "+shift);
                        //console.log("Nshift: "+nshift)
                        //console.log("Prev BW: "+prevSiblingsBw)
                        //console.log("Pipe BW: "+sConns[i][k].bw)
                        end_x = sConns[i][k].staticPoint.x
                        end_y = sConns[i][k].staticPoint.y-Math.min(actualBw/2,sConns[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        raw_end_x = sConns[i][k].staticXYPoint.x
                        raw_end_y = sConns[i][k].staticXYPoint.y-Math.min(actualBw/2,sConns[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        //sConns[i][k].pipe.end_x=sConns[i][k].end_x;sConns[i][k].pipe.end_y=sConns[i][k].end_y;
                        prevSiblingsBw=prevSiblingsBw+lBw;
                        //continue;
                    }
                }
                //console.log(end_y)
                if(sConns[i][k].flip==1){//console.log("Flipping the whole sConn pipe: "+sConns[i][k].pipe.id);//flip(sConns[i][k])
                    sConns[i][k].start_x=end_x;
                    sConns[i][k].start_y=end_y;
                    sConns[i][k].pipe.start_x=sConns[i][k].start_x;sConns[i][k].pipe.start_y=sConns[i][k].start_y;
                    sConns[i][k].pipe.raw_start_x=raw_end_x;sConns[i][k].pipe.raw_start_y=raw_end_y;
                }
                else{
                    sConns[i][k].end_x=end_x;
                    sConns[i][k].end_y=end_y;
                    sConns[i][k].pipe.end_x=sConns[i][k].end_x;sConns[i][k].pipe.end_y=sConns[i][k].end_y;
                    sConns[i][k].pipe.raw_end_x=raw_end_x;sConns[i][k].pipe.raw_end_y=raw_end_y;
                }
                //if (
                //    //isNaN(start_x) ||
                //    //isNaN(start_y) //||
                //    isNaN(end_x) ||
                //    isNaN(end_y) //||
                //    //isNaN(raw_start_x) ||
                //    //isNaN(raw_start_y) ||
                //    //isNaN(raw_end_x) ||
                //    //isNaN(raw_end_y))
                //   ){
                //        debugger
                //}

            }
        }
        for(var i=0,ml=sConnsR.length;i<ml;i++){
            var j=0;var connPipesOrigins=new Array();var actualBw=sConnsR[i].actualBw; var shift=0;var prevSiblingsBw=0;var j=0;
            for(var h=0,ml1=sConnsR[i].length;h<ml1;h++){//This is a single connector - cycling through pipes
                //sConnsR[i][j].movingPoint=sConnsR[i][j].movingXYPoint.matrixTransform(sConnsR[i][j].movingConnector.getCTM()).matrixTransform(mapMatrix.inverse())
                //sConnsR[i][j].staticPoint=sConnsR[i][j].staticXYPoint.matrixTransform(sConnsR[i][j].staticConnector.getCTM()).matrixTransform(mapMatrix.inverse())
                sConnsR[i][j].movingPoint=sConnsR[i][j].movingXYPoint.matrixTransform(sConnsR[i][j].movingConnector.getCTM()).matrixTransform(sConnsR[i][j].pipe.getCTM().inverse())
                sConnsR[i][j].staticPoint=sConnsR[i][j].staticXYPoint.matrixTransform(sConnsR[i][j].staticConnector.getCTM()).matrixTransform(sConnsR[i][j].pipe.getCTM().inverse())
                j++;
            }
            lConn=sConnsR[i].id
            parentY=sConnsR[i][j-1].movingPoint.y;parentX=sConnsR[i][j-1].movingPoint.x;
            if(sConnsR[i][j-1].staticConnectorId==lConn){
                parentY=sConnsR[i][j-1].staticPoint.y;parentX=sConnsR[i][j-1].staticPoint.x;
            }
            sConnsR[i].sort(sortDragPipes);sortCount=sortCount+1;
            if(actualBw==sConnsR[i][j-1].bw){nshift=1}else{nshift=Math.min(1,((sConnsR[i].bw-sConnsR[i][j-1].bw)/(actualBw-sConnsR[i][j-1].bw)))};
            
            var br=0;var remainderBw=0;var prevStop=0;var eshift=1;var gshift=0;var lBw=0;var plBw=0;//var scale=sConnsR[i].scale;
            for(var k=0,mo=sConnsR[i].length;k<mo;k++){
                //var edgeFix=(prevSiblingsBw*nshift)+sConnsR[i][k].bw
                //if(Number(edgeFix.toFixed(10))>sConnsR[i].bw){
                ////if(((prevSiblingsBw*nshift)+sConnsR[i][k].bw)>sConnsR[i].bw){
                //    nshift=Math.min(1,((sConnsR[i].bw-sConnsR[i][k].bw)/(prevSiblingsBw)))
                //    prevSiblingsBw=0;k=-1;continue;
                //}
                
                if(sConnsR[i][k].origin==lConn){
                    //console.log("Flip sconnR")
                    sConnsR[i][k].flip=0;flip=0;lBw=sConnsR[i][k].bw;var scale=sConnsR[i][k].scale;//Calculating start postion
                }
                else{sConnsR[i][k].flip=1;flip=1;lBw=sConnsR[i][k].bw1;var scale=sConnsR[i][k].scale1;};//Calculating end position
                
                //UNCOMMENT IF YOU NOTICE WEIRD PIPE BEHAVIOR
                //setCTM(sConnsR[i][k].pipe,root.createSVGMatrix().scale(1/sConnsR[i][k].pipeScale).translate(-(sConnsR[i][k].pipe.parentNode.getCTM().e/mapMatrix.a-mapMatrix.e/mapMatrix.a)
		//		,-(sConnsR[i][k].pipe.parentNode.getCTM().f/mapMatrix.d-mapMatrix.f/mapMatrix.d)))
                
                if(k>0){prevStop=(prevStop)+plBw-gshift}else{prevStop=0}
                remainderBw=actualBw-prevSiblingsBw;
                if(k>0){eshift=Math.min(1,(sConnsR[i].bw*scale-prevStop)/remainderBw)}else{eshift=0}
                if(k==0){gshift=0}
                else if(k==1){gshift=Math.min((lBw-lBw*eshift),(plBw))}
                //else{gshift=(lBw-lBw*eshift)}
                else{gshift=Math.min((lBw-lBw*eshift),(prevStop))}
                plBw=lBw;
                
                if(sConnsR[i][k].type=="arcPipe"){
                    if(sConnsR[i][k].movingConnectorId==lConn){//console.log("1R-moving "+sConnsR[i][k].id);console.log(flip)
                        //console.log("Local Conn: "+lConn);
                        //console.log("Actual BW: "+actualBw);
                        //console.log("Shift: "+shift);
                        //console.log("Prev BW: "+prevSiblingsBw)
                        //console.log("Pipe BW: "+sConnsR[i][k].bw)
                        start_x = sConnsR[i][k].movingPoint.x
                        raw_start_x = sConnsR[i][k].movingXYPoint.x
                        if(flip==0){
                            start_y = sConnsR[i][k].movingPoint.y-Math.min(actualBw/2,sConnsR[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                            raw_start_y = sConnsR[i][k].movingXYPoint.y-Math.min(actualBw/2,sConnsR[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        }
                        if(flip==1){
                            start_y = sConnsR[i][k].movingPoint.y+lBw-Math.min(actualBw/2,sConnsR[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                            raw_start_y = sConnsR[i][k].movingXYPoint.y+lBw-Math.min(actualBw/2,sConnsR[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        }
                        //console.log(start_y)
                        //sConnsR[i][k].start_x = sConnsR[i][k].movingPoint.x
                        //sConnsR[i][k].start_y = sConnsR[i][k].movingPoint.y-Math.min(actualBw/2,sConnsR[i][k].movingConnectorBw/2)+(prevSiblingsBw*nshift);
                        prevSiblingsBw=prevSiblingsBw+lBw;
                        //continue;
                    }
                    else if(sConnsR[i][k].staticConnectorId==lConn){//console.log("2R-static. WTF!!! "+sConnsR[i][k].id+" "+lConn);console.log(flip)
                        //console.log("Local Conn: "+lConn);
                        //console.log("Actual BW: "+actualBw);
                        //console.log("Shift: "+shift);
                        //console.log("Eshift: "+eshift)
                        //console.log("Prev BW: "+prevSiblingsBw)
                        //console.log("Pipe BW: "+sConnsR[i][k].bw)
                        start_x = sConnsR[i][k].staticPoint.x
                        raw_start_x = sConnsR[i][k].staticXYPoint.x
                        if(flip==0){
                            start_y = sConnsR[i][k].staticPoint.y-Math.min(actualBw/2,sConnsR[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                            raw_start_y = sConnsR[i][k].staticXYPoint.y-Math.min(actualBw/2,sConnsR[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        }
                        if(flip==1){
                            start_y = sConnsR[i][k].staticPoint.y+lBw-Math.min(actualBw/2,sConnsR[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                            raw_start_y = sConnsR[i][k].staticXYPoint.y+lBw-Math.min(actualBw/2,sConnsR[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        }
                        //console.log("start_y")
                        //sConnsR[i][k].end_x = sConnsR[i][k].staticPoint.x
                        //sConnsR[i][k].end_y = sConnsR[i][k].staticPoint.y+sConnsR[i][k].bw-Math.min(actualBw/2,sConnsR[i][k].staticConnectorBw/2)+(prevSiblingsBw*nshift);
                        prevSiblingsBw=prevSiblingsBw+lBw;
                        //continue;
                    }
                }
                else{
                    if(sConnsR[i][k].movingConnectorId==lConn){
                        //console.log("Local Conn: "+lConn);
                        //console.log("Actual BW: "+actualBw);
                        //console.log("Shift: "+shift);
                        //console.log("Eshift: "+eshift)
                        //console.log("Prev BW: "+prevSiblingsBw)
                        //console.log("Pipe BW: "+sConnsR[i][k].bw)
                        start_x = sConnsR[i][k].movingPoint.x
                        start_y = sConnsR[i][k].movingPoint.y-Math.min(actualBw/2,sConnsR[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        raw_start_x = sConnsR[i][k].movingXYPoint.x
                        raw_start_y = sConnsR[i][k].movingXYPoint.y-Math.min(actualBw/2,sConnsR[i][k].movingConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        prevSiblingsBw=prevSiblingsBw+lBw;
                        //continue;
                    }
                    else if(sConnsR[i][k].staticConnectorId==lConn){
                        //console.log("Local Conn: "+lConn);
                        //console.log("Actual BW: "+actualBw);
                        //console.log("Shift: "+shift);
                        //console.log("Eshift: "+eshift)
                        //console.log("Prev BW: "+prevSiblingsBw)
                        //console.log("Pipe BW: "+sConnsR[i][k].bw)
                        start_x = sConnsR[i][k].staticPoint.x
                        start_y = sConnsR[i][k].staticPoint.y-Math.min(actualBw/2,sConnsR[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        raw_start_x = sConnsR[i][k].staticXYPoint.x
                        raw_start_y = sConnsR[i][k].staticXYPoint.y-Math.min(actualBw/2,sConnsR[i][k].staticConnectorBw/2)+prevStop-gshift;//(prevSiblingsBw*nshift);
                        prevSiblingsBw=prevSiblingsBw+lBw;
                        //continue;
                    }
                }
                //console.log(start_y)
                if(sConnsR[i][k].flip==1){//console.log("Flipping the whole sConnR pipe: "+sConnsR[i][k].pipe.id);//flip(sConns[i][k])
                    sConnsR[i][k].end_x=start_x;
                    sConnsR[i][k].end_y=start_y;
                    sConnsR[i][k].pipe.end_x=sConnsR[i][k].end_x;sConnsR[i][k].pipe.end_y=sConnsR[i][k].end_y;
                    sConnsR[i][k].pipe.raw_end_x=raw_start_x;sConnsR[i][k].pipe.raw_end_y=raw_start_y;
                }
                else{
                    sConnsR[i][k].start_x=start_x;
                    sConnsR[i][k].start_y=start_y;
                    sConnsR[i][k].pipe.start_x=sConnsR[i][k].start_x;sConnsR[i][k].pipe.start_y=sConnsR[i][k].start_y;
                    sConnsR[i][k].pipe.raw_start_x=raw_start_x;sConnsR[i][k].pipe.raw_start_y=raw_start_y;
                }
            //if (
            //        isNaN(start_x) ||
            //        isNaN(start_y) //||
            //        //isNaN(end_x) ||
            //        //isNaN(end_y) ||
            //        //isNaN(raw_start_x) ||
            //        //isNaN(raw_start_y) ||
            //        //isNaN(raw_end_x) ||
            //        //isNaN(raw_end_y))
            //       ){
            //            debugger
            //    }
            
            }
        }
    //}
    return collectedConns;
}

function dragArcPipe(pipe){
    start_x=pipe.start_x;
    start_y=pipe.start_y;
    end_x=pipe.end_x;
    end_y=pipe.end_y;
    bw=pipe.bw//*pipe.scale;//console.log("Scaled down BW: "+bw)
    bw1=pipe.bw1//*pipe.scale1;
    vector=pipe.vector;
    //vector=Number(leftParent.getAttribute("vector"));    
   
    reverse_start_x=end_x;
    reverse_start_y=end_y-bw1;
    reverse_end_x=start_x;
    reverse_end_y=start_y+bw;
    
    //console.log(end_y)
    //console.log(reverse_start_y)
    
    //x_factor=0;//Math.abs(start_x-end_x);
    //reverse_x_factor=0;//Math.abs(end_x-start_x);
    c_x1 = start_x+(Math.abs(start_y-end_y)/2*vector);c_y1=start_y;
    c_x2 = end_x+(Math.abs(start_y-end_y)/2*vector);c_y2=end_y;
    
    if(start_x*vector>=end_x*vector){c_x2 = c_x1}
    else if(end_x*vector>start_x*vector){c_x1=c_x2}

    //q_x=start_x+(end_y-start_y)
    //q_y=start_y+((end_y-start_y)/2)
    
    //reverse_c_x=reverse_start_x-((reverse_start_x-reverse_end_x)/2)//+reverse_end_x;    
    //reverse_center_x=((reverse_start_x-reverse_end_x)/2)+reverse_end_x;
    reverse_c_x1=reverse_start_x+(Math.abs(reverse_start_y-reverse_end_y)/2*vector);reverse_c_y1=reverse_start_y;
    reverse_c_x2=reverse_end_x+(Math.abs(reverse_start_y-reverse_end_y)/2*vector);reverse_c_y2=reverse_end_y;
    
    if(reverse_start_x*vector>=reverse_end_x*vector){reverse_c_x2=reverse_c_x1}
    else if(reverse_end_x*vector>reverse_start_x*vector){reverse_c_x1=reverse_c_x2;}
    
    //Cubic Bezier Curve
    pathData="M"+(start_x)+","+(start_y)+" C"+(c_x1)+","+(c_y1)+" "+(c_x2)+","+(c_y2)+" "+end_x+","+end_y+" L"+reverse_start_x+","+reverse_start_y+
    " C"+(reverse_c_x1)+","+(reverse_c_y1)+" "+(reverse_c_x2)+","+(reverse_c_y2)+" "+reverse_end_x+","+reverse_end_y+" z"
    
    return(pathData)
 
}

function dragMovingPipe(pipe){

    //console.log("Pipes is not 0; ID is: "+pipeUid)
    //if(pipe.flip==1){console.log("Flip Pipe!")
    //    start_x=pipe.end_x;
    //    start_y=pipe.end_y;
    //    end_x=pipe.start_x;
    //    end_y=pipe.start_y;
    //}
    //else{
        start_x=pipe.start_x;
        start_y=pipe.start_y;
        end_x=pipe.end_x;
        end_y=pipe.end_y;
        
    //}
    bw=pipe.bw//*pipe.scale;
    bw1=pipe.bw1//*pipe.scale1;
    //q=pipe.q;console.log(q)
   
    reverse_start_x=end_x;
    reverse_start_y=end_y+bw1;
    reverse_end_x=start_x;
    reverse_end_y=start_y+bw;
    
    c_x = ((end_x-start_x)/2)+start_x
    center_x = c_x;
    
    reverse_c_x=c_x;
    reverse_center_x=reverse_c_x;
    pathData="M"+(start_x)+","+(start_y)+" C"+(c_x)+","+(start_y)+" "+(center_x)+","+(end_y)+" "+end_x+","+end_y+" L"+reverse_start_x+","+reverse_start_y+
    " C"+(reverse_c_x)+","+(reverse_start_y)+" "+(reverse_center_x)+","+(reverse_end_y)+" "+reverse_end_x+","+reverse_end_y+" z"    
    //if(isNaN(start_x) || isNaN(start_y) ||isNaN(end_x) ||isNaN(end_y) ||isNaN(reverse_start_x) ||isNaN(reverse_start_y) ||
    //   isNaN(reverse_end_x) ||isNaN(reverse_end_y) ||isNaN(center_x) ||isNaN(reverse_center_x) ||isNaN(c_x) ||isNaN(reverse_c_x)){
    //    console.log(pathData);console.log(pipe.id)
    //}
    //if (pathData.indexOf('undefined')!= -1 || pathData.indexOf('NaN') != -1) {
    //    debugger;
    //}
    return(pathData)
}

function createItem(itemRow){
    //Check if exists and exit if yes.
    var check=document.getElementById(itemRow.id);
    if(check){
        //Check if the current parent is the same of the existing element (sometmies elements move between parents)
        //If different parent - continue creating a DUPLICATE item
        var p = check.getAttribute("parent");
        if (p == itemRow.parent) {
            //console.log("Item exists, exiting: " + itemRow.id)
            return check;
            //debugger;
        }
        //debugger;
    }
    
    //Mandatory properties:
    var id=itemRow.id;

    var parentId=itemRow.parent;

    var template=itemTemplate[itemRow.template]
    //Optional properties:

    var props = new Object();

    for (var name in itemRow){

        if(name=="id"||name=="parent"||name=="template"||itemRow[name].length===0||typeof itemRow[name]==='object') continue;

        if (!itemRow.hasOwnProperty(name)) continue;

        props[name] = itemRow[name];
        
    }
    
    props.template=itemRow.template;
    var parent=document.getElementById(parentId);
    
    //Calculate capacity: if the item has "cap" attribute..
    //Say for RAM 1MB equals 1 square pixel. Then 1GB is 1000 square pixels
    //Say for Vols 1GB equals 1 square pixel. Then 1TB is 1000 square pixels
    //Then make a rough rectangle out of it
    if(props.cap){
        switch(template.class){
        case "ram":
            //1 MB is 1 sq. pixel
            //RAM is a narrow block
            var capacity=props.cap*2;
            var h=Math.round(Math.sqrt(capacity)*0.35);
            var v=Math.round(capacity/h);
            props.height=v;props.width=h;
            break;
        case "raids":
            //~100 MB is 1 sq. pixel
            //Vols are a wider block
            var capacity=props.cap///32;
            var h=Math.round(Math.sqrt(capacity)*0.75);
            var v=Math.round(capacity/h);
            props.height=v;props.width=h;
            break;
        case "vols":
            //~100 MB is 1 sq. pixel
            //Vols are a wider block
            var capacity=props.cap///32;
            var h=Math.round(Math.sqrt(capacity)*0.75);
            var v=Math.round(capacity/h);
            props.height=v;props.width=h;
            break;
        }
    }

    
    vector=parent.getAttribute("vector");

    var ownerId;//console.log(parent);console.log(vector)
    if(vector==null || vector=="null"){vector=-1};inverseVector=Number(vector)*-1;
    if (template.class=="node"||template.class=="nodeContainer"||template.class=="cluster"||parent.getAttribute("class")=="node"||parent.getAttribute("class")=="vmnode" || template.class=="vmnode"){
        if(props.template=="vmserver" || props.template=="vmclient"){
            ownerId=parent.getAttribute("owner")}
        else{
            ownerId=parentId
            }
    }
    else{ownerId=parent.getAttribute("owner")};
    if(template.class=="compContainer"){
        if(itemRow.type==null){console.log("Error: type not defined. Object: ");/*console.log(itemRow)*/}
        if(itemRow.type=="hbas"){vector=inverseVector}
    }
    //else if(parent.getAttribute("class")=="node"){}
    
    //if (typeof(template.bw)=="undefined"){template.bw=template.height}
    if (props.bw==null){
        if(props.height){props.bw=props.height}
        else{props.bw=template.height}
        }
    var item = createElement("rect",template);
    if(itemRow.__config__){item.__config__=itemRow.__config__};
    setAttributes(item,{"id":id,"owner":ownerId,"parent":parentId,"vector":vector});
    setAttributes(item,props);
    var connectors=createConnectors(item,item.getAttribute("bw"));
    var g=document.getElementById(id+"_g");
    if(g==null){
        g=createElement("g",{"id":id+"_g"});
        if(parent.nodeName!="g"){appendElement(parent.parentNode,g)}
        else{appendElement(parent,g)}
        //FUCKING HACK! Group name should be the device name, not the other way around. The "rect" should be just a component - "g" is the device
        d3.select(g).datum(function(){var obj=new Object(); obj.name=item.id;return obj;})
    }
    
    setAttributes(g,{"parent":parentId,"owner":ownerId,"type":template.type,"class":template.class+"Group","visibility":"hidden"});
    setAttributes(g,props)
    appendElement(g,item);for (var cn=0;cn<4;cn++){appendElement(g,connectors[cn])};
    //appendElement(g,connectors)
    
    //position(item.id,-1,-1)
    //createLabel(item)
       
   //Create initial data binding for D3. Associate item ID with its __data__ property 
   d3.select(item).datum(function(){var obj=new Object(); obj.name=this.id;return obj;}); //Obj inside array makes sense
   //d3.select(item).datum(function(){var obj=new Object(); obj.name=this.id;return obj;});
   
   return item; 
}

function createConnectors(parent,bw){
    var type=parent.getAttribute("type");vector=parent.getAttribute("vector");inverseVector=Number(vector)*-1;owner=parent.getAttribute("owner");
    var width=parent.getAttribute("width");
    if(vector==-1){var ex=parent.x.animVal.value;var ix=parent.x.animVal.value+width}
    else if(vector==1){var ex=parent.x.animVal.value+width;var ix=parent.x.animVal.value}
    var extConnectorE=createElement("line",{id:parent.id+"_extConnectorE","type":type,"class":"connector","bw":bw,"parent":parent.id,"owner":owner,"vector":vector,"seq":0,
                               x1:ex,"y1":parent.y.animVal.value,
                               x2:ex,"y2":(parent.height.animVal.value),
                               "stroke-width":0.1,"stroke":"red","visibility":"hidden","pointer-events":"all"})
    var extConnectorI=createElement("line",{id:parent.id+"_extConnectorI","type":type,"class":"connector","bw":bw,"parent":parent.id,"owner":owner,"vector":inverseVector,"seq":1,
                               x1:ex,"y1":parent.y.animVal.value,
                               x2:ex,"y2":(parent.height.animVal.value),
                               "stroke-width":0.1,"stroke":"red","visibility":"hidden","pointer-events":"all"})
    var intConnectorI=createElement("line",{id:parent.id+"_intConnectorI","type":type,"class":"connector","bw":bw,"parent":parent.id,"owner":owner,"vector":vector,"seq":2,
                               x1:ix,"y1":parent.y.animVal.value,
                               x2:ix,"y2":(parent.height.animVal.value),
                               "stroke-width":0.1,"stroke":"red","visibility":"hidden","pointer-events":"all"})
    var intConnectorE=createElement("line",{id:parent.id+"_intConnectorE","type":type,"class":"connector","bw":bw,"parent":parent.id,"owner":owner,"vector":inverseVector,"seq":3,
                               x1:ix,"y1":parent.y.animVal.value,
                               x2:ix,"y2":(parent.height.animVal.value),
                               "stroke-width":0.1,"stroke":"red","visibility":"hidden","pointer-events":"all"})
    //var g=createElement("g",{"id":parent.id+"_connectors"});
    var connectors = [extConnectorE,extConnectorI,intConnectorE,intConnectorI];
    //for (var cn=0;cn<4;cn++){appendElement(g,connectors[cn])};
    return connectors;
    //return g;
}

function position(childId,padding,itemsperrow,fixed,propagate){
    //return;
    //positionItemCount=positionItemCount+1;
    //How to get actual transformation matrix of an item:
    ////srv01disk031.parentNode.getCTM().inverse().multiply(srv01disk031.parentNode.parentNode.getCTM()).inverse()
    //How to scale an item in place:
    //asdf=srv01disk031.parentNode.getCTM().inverse().multiply(srv01disk031.parentNode.parentNode.getCTM()).inverse()
    //asdf.a=0.5;asdf.d=0.5
    //setCTM(srv01disk031.parentNode,asdf);
    

    
    
    
    var childItem=document.getElementById(childId);//console.log("Child: "+childItem.id)
    //if(childItem)
    if(padding==-1){
        padding=Number(childItem.getAttribute("padding"))
        //console.log("Calculated padding: "+padding)
    }
    if (itemsperrow==-1){
        itemsperrow=Math.max(1,Number(childItem.getAttribute("itemsperrow")))
        //console.log("Calculated itemsperrow: "+itemsperrow)
    }
    if(fixed==null){fixed=childItem.getAttribute("fixed");if (fixed==null){/*console.log("fixed? no attr...");*/fixed=0}}
    else if(fixed==-1){fixed=childItem.getAttribute("fixed");if (fixed==null){/*console.log("fixed? no attr...");*/fixed=0}}
    else{fixed=0}
    
    if(childItem.getAttribute("stack") == '1'){var stack = 1;fixed = null;}
    
    if(propagate==1){propagate=1}
    else if(propagate==null){propagate=childItem.getAttribute("propagate");if (propagate==null){/*console.log("fixed? no attr...");*/propagate=1}}
    else if(fixed==1){propagate=0}
    else if(propagate==-1){propagate=childItem.getAttribute("propagate");if (propagate==null){/*console.log("fixed? no attr...");*/propagate=1}}
    //else{propagate=0}
    
    var fpadding=padding;
    var backpadding=padding;
    var toppadding=padding;
    var bottompadding=padding;
    
    var parentItem=document.getElementById(childItem.getAttribute("parent"));//console.log("Parent: "+parentItem.id)
    var parentBw=parentItem.getAttribute("bw");
    var parentMatrix=parentItem.getCTM();
    var mapMatrix=document.getElementById("viewport").getCTM();
    var point=root.createSVGPoint();//point=matrixTransform(parentItem.getCTM())
    var matrix=root.createSVGMatrix();
    var childBox=childItem.getBBox();//console.log(childBox)
    var childClass=childItem.className.animVal;//getAttribute("class");//console.log("Parent Node Class: "+childClass)
    var groupClass=childItem.parentNode.className.animVal;//getAttribute("class");//console.log("Parent Node Class: "+childClass)
    var childType=childItem.getAttribute("type");
    //var parentBox=parentItem.getBBox();
    //IE Fix: doesn't let me modify the output of getBBox
    var parentBox=new Object();var tmpBox=parentItem.getBBox();
    parentBox.x=tmpBox.x;parentBox.y=tmpBox.y;parentBox.width=tmpBox.width;parentBox.height=tmpBox.height;
    if(parentItem.id=="viewport"){parentBox.x=0;parentBox.y=0;}
    var row=0;var column=0;var padding=padding; var width=parentBox.width;var height=parentBox.height;
    
    //if(childItem.getAttribute("owner")=="id00201"){console.log(childItem)}
    
    //Handle items that should be stacked - FS, Volumes, Raid Groups
    //This means proper positionining will not be executed, stacking logic will be applied instead
    //if(childClass=="vol"||childClass=="raid"){
    if(stack == 1){
        
        var siblings=parentItem.parentNode.querySelectorAll("g[parent='"+parentItem.id+"'] > ."+childClass);//Only select direct children
        //var siblings=d3.select(parentItem.parentNode).selectAll("."+childClass);
        var dataSet=new Array();
        
        var template=childClass;
        for(var i=0,sln=siblings.length;i<sln;i++){
            var datum=new Object();
            var arr=new Array();
            datum.x=0;
            datum.y=Number(siblings[i].getAttribute("cap"));
            datum.name=siblings[i].id;
            arr.push(datum);
            arr.name = datum.name;
            dataSet.push(arr)
            //dataSet.push(datum)
        }
        
        createStackedBars(parentItem,template,dataSet);
        //redraw(parentItem,template,dataSet)
        return;
    }
    
    //Select connectors - parent's and all children
    var connectors=parentItem.parentNode.querySelectorAll("g[parent='"+parentItem.id+"'] > [class='connector'],g[id='"+parentItem.parentNode.id+"'] > [class='connector']");

    for (var n=0,cl=connectors.length;n<cl;n++){
                    connectors[n].connectorParent=document.getElementById(connectors[n].getAttribute("parent"));
                    connectors[n].parentBw=connectors[n].connectorParent.getAttribute("bw");
                    connectors[n].connectorVector=connectors[n].getAttribute("vector");connectors[n].parentVector=connectors[n].connectorParent.getAttribute("vector");
                    connectors[n].connectorBw=Number(connectors[n].getAttribute("bw"));//console.log(connectorBw);console.log(height)
                    connectors[n].seq=connectors[n].getAttribute("seq");
                    //connectors[n].connectorBw=connectors[n].getAttribute("bw");//console.log(connectorBw);console.log(height)
                    //Get the parent to resize if the connector is longer than its height
                    if(connectors[n].parentBw>connectors[n].connectorBw){
                            connectors[n].setAttribute("bw",connectors[n].parentBw);
                            connectors[n].connectorBw=Number(connectors[n].getAttribute("bw"));
                        }  
                    
                    if(connectors[n].connectorBw>connectors[n].connectorParent.height.animVal.value){
                        //console.log("Parent: "+parentItem.id);console.log("Connector: "+connectors[n].id)
                        connectors[n].connectorParent.setAttribute("height",connectors[n].connectorBw)}
                      
                }
    
    //###########################
    //THIS WORKS:
    //var siblings=parentItem.parentNode.querySelectorAll("g[parent="+parentItem.id+"]");
    //###########################
    
    var siblings=document.querySelectorAll("g[parent="+parentItem.id+"]");
    
    if(groupClass=="compContainerGroup"){
        //Arrange the component containers properly
        //console.log("Siblings length at the start: "+siblings.length)
        var order = ["hbas","raids","vols","controllers","vms","vnics","ram","cpus","nics"];
        var tmpSiblings = new Array();
        if(parentItem.getAttribute("vector")==-1){order.reverse()}
        for (var a=0,cl=siblings.length;a<cl;a++){
            var type=siblings[a].getAttribute("type");
            var pos=order.indexOf(type);
            tmpSiblings[pos]=siblings[a];
        }
        siblings.length=0;siblings=new Array();
        for (var a=0,cl=tmpSiblings.length;a<cl;a++){
            if(tmpSiblings[a]==null){continue;}
            siblings.push(tmpSiblings[a])
        }
        //console.log("Siblings length at the end: "+siblings.length)
    }
    //console.log("siblings lenght: "+siblings.length)
    //for (ss=0;ss<sbl.length;ss++){siblings[ss]=sbl[ss]};
    //console.log("Child: "+childItem.id)
    //console.log(siblings)
    var m = 0;var mWidth=new Array();var mHeight=new Array();var totalWidth=new Array();var totalHeight = new Array();
    //for (var i=0,cnl=parentItem.parentNode.childNodes.length;i<cnl;i++){
    //            if (parentItem.parentNode.childNodes[i].nodeType!=1){}
    //            else if (//parentItem.parentNode.childNodes[i].nodeType==1 &&
    //                    parentItem.parentNode.childNodes[i].className.animVal == childClass){
    for (var m=0,cnl=siblings.length;m<cnl;m++){
        //Remove all labels as they interfere with getting an accurate BBox measurement.
        removeLabel(siblings[m])
        //Measure the box and save it
        siblings[m].box=siblings[m].getBBox();
        
        //Re-add the label, resizing it along the way
        //DISABLED because it screws up BBOX and scale
        //createLabel(siblings[m].querySelector("rect[parent='"+parentItem.id+"']"))
        column=m%itemsperrow;//console.log("Column: "+column)
        row=Math.floor(m/itemsperrow);//console.log("Row: "+row)
        
        //siblings[m]=parentItem.parentNode.childNodes[i];
        
        //console.log("Sibling["+m+"] ID "+siblings[m].id+" box: ");console.log(siblings[m].box)
        
        //if (typeof(mWidth[column])=="undefined"){mWidth[column]=siblings[m].getBBox().width;}//console.log("Max W:"+mWidth[column]+" Column: "+column)}
        if (typeof(mWidth[column])=="undefined"){mWidth[column]=siblings[m].box.width;}//console.log("Max W:"+mWidth[column]+" Column: "+column)}
        //if (typeof(mHeight[row])=="undefined"){mHeight[row]=siblings[m].getBBox().height;}//console.log("Max H: "+mHeight[row]+" Row: "+row)}
        if (typeof(mHeight[row])=="undefined"){mHeight[row]=siblings[m].box.height;}//console.log("Max H: "+mHeight[row]+" Row: "+row)}
        //mWidth[column]=Math.max(siblings[m].getBBox().width,mWidth[column]);
        mWidth[column]=Math.max(siblings[m].box.width,mWidth[column]);
        //mHeight[row]=Math.max(siblings[m].getBBox().height,mHeight[row]);
        mHeight[row]=Math.max(siblings[m].box.height,mHeight[row]);
    }
    //console.log(mWidth.reduce(function(pv,cv){return pv+cv}));
    //console.log(mHeight.reduce(function(pv,cv){return pv+cv}));
    //for (y=0;y<mHeight.length;y++){console.log("mHeight["+y+"]: ");console.log(mHeight[y])}
    //for (y=0;y<mWidth.length;y++){console.log("mWidth["+y+"]: ");console.log(mWidth[y])}
    var pBw=0;
    //Position and resize parent:
    if(fixed==0){
        for (var z=0,sl=siblings.length;z<sl;z++){
            column=z%itemsperrow;//console.log("Column: "+column)
            row=Math.floor(z/itemsperrow);//console.log("Row: "+row)
            //console.log[z];                
            if (column==0){
                //point.x=(parentBox.x+fpadding)+((mWidth[column]/2)-(siblings[z].getBBox().width/2));
                point.x=(parentBox.x+fpadding)+((mWidth[column]/2)-(siblings[z].box.width/2));
            }
            else {
                //point.x=(siblings[z-1].ctm.e)+(siblings[z-1].getBBox().width/2)+(mWidth[column-1]/2)+padding+((mWidth[column]/2)-(siblings[z].getBBox().width/2));;
                point.x=(siblings[z-1].ctm.e)+(siblings[z-1].box.width/2)+(mWidth[column-1]/2)+padding+((mWidth[column]/2)-(siblings[z].box.width/2));;
            }
            
            if (row==0){
                //point.y=(parentBox.y+toppadding)+((mHeight[row]/2)-(siblings[z].getBBox().height/2))
                point.y=(parentBox.y+toppadding)+((mHeight[row]/2)-(siblings[z].box.height/2))
            }
            else {
                //point.y=(siblings[z-itemsperrow].ctm.f)+(siblings[z-itemsperrow].getBBox().height/2)+(mHeight[row-1]/2)+padding+((mHeight[row]/2)-(siblings[z].getBBox().height/2));
                point.y=(siblings[z-itemsperrow].ctm.f)+(siblings[z-itemsperrow].box.height/2)+(mHeight[row-1]/2)+padding+((mHeight[row]/2)-(siblings[z].box.height/2));                    
            }
            siblings[z].setAttribute("transform","translate("+point.x+","+point.y+")");
            //These groups are hidden when created. This function removes this attribute so the group becomes visible unless its members have explicit "visibility" attributes
            siblings[z].removeAttribute("visibility");
            //console.log("row: "+row+" column: "+column+" child: "+childItem.id+" parent: "+parentItem.id+" parentbox: ");console.log(parentBox)
            //console.log(siblings[z].getAttribute("transform"))
            //console.log("######ViewPort X: "+viewport.getBBox().x)
            //siblings[z].ctm=siblings[z].getCTM();
            siblings[z].ctm=siblings[z].getCTM().inverse().multiply(parentMatrix).inverse()
            //siblings[z].ctm.e=siblings[z].ctm.e+point.x;siblings[z].ctm.f=siblings[z].ctm.f+point.y;//=siblings[z].getCTM();
            
            //There is an issue here that a text label changes the BBox of the items, causing the positioning to get mis-aligned.
            //A solution would be to remove and recreate the label
            
            if(z<mWidth.length){
                //width=(point.x+(siblings[z].getBBox().width/2)+(mWidth[column]/2)+backpadding)-parentBox.x;//parentItem.setAttribute("width",(width))
                width=(point.x+(siblings[z].box.width/2)+(mWidth[column]/2)+backpadding)-parentBox.x;//parentItem.setAttribute("width",(width))
            }
            //console.log("Sibling:")
            //console.log(siblings[z])
            //console.log("Point Y: ",point.y," Box: ",siblings[z].getBBox().height," max Height: ",mHeight[row]," Parent Box :",parentBox.y);
            //console.log("Retrieve the rect info - Height: ");
            //console.log(siblings[z].querySelector("rect").getAttribute("height"))
            //height=(point.y+(siblings[z].getBBox().height/2)+(mHeight[row]/2)+bottompadding)-parentBox.y;//parentItem.setAttribute("height",(height))
            height=(point.y+(siblings[z].box.height/2)+(mHeight[row]/2)+bottompadding)-parentBox.y;//parentItem.setAttribute("height",(height))
            if(column==(itemsperrow-1)){
                
                if(siblings[z].getBBox().height>=siblings[z-column].getBBox().height){
                    //pBw=pBw+siblings[z].getBBox().height;
                    pBw=pBw+siblings[z].box.height;
                }
                else{
                    //pBw=pBw+siblings[z-column].getBBox().height;
                    pBw=pBw+siblings[z-column].box.height;
                }
                //console.log("Case: 1; column: "+column+" child: "+childItem.id+" parent: "+parentItem.id+" z: "+z+" column: "+column+" pBw: "+pBw)
            }
            if(z==(sl-1) && column!=(itemsperrow-1)){
                
                if(siblings[z].getBBox().height>=siblings[z-column].getBBox().height){
                    //pBw=pBw+siblings[z].getBBox().height;
                    pBw=pBw+siblings[z].box.height;
                }
                else{
                    //pBw=pBw+siblings[z-column].getBBox().height;
                    pBw=pBw+siblings[z-column].box.height;
                }
                //console.log("Case: 2; column: "+column+" child: "+childItem.id+" parent: "+parentItem.id+" z: "+z+" column: "+column+" pBw: "+pBw)
            }
        }
        //console.log("Width: "+width);
        //console.log("Height: "+height);
        parentItem.setAttribute("width",(width));
        parentItem.setAttribute("height",(height));
    }
    //Position and don't resize parent; scale down the sibling
    //SCALE DOWN the item to fit into the fixed parent box
    else if(fixed==1){
        //console.log("FIXED!")
        var hScale=1;var vScale=1;
        
        hWidth=fpadding+backpadding+(padding*(mWidth.length-1))+(mWidth.reduce(function(pv,cv){return pv+cv}));//calculate total width
        vHeight=toppadding+bottompadding+(padding*(mHeight.length-1))+(mHeight.reduce(function(pv,cv){return pv+cv})); //calculate total height

        hScale=Math.min(1,parentBox.width/hWidth);
        vScale=Math.min(1,parentBox.height/vHeight);
        var scale=Math.min(hScale,vScale);
        //scale=scale.toFixed(1);
        //console.log("Scale: "+scale);
        padding=padding*scale;
        //fpadding=padding;
        backpadding=padding;
        //toppadding=padding;
        bottompadding=padding;
        if(hWidth*scale<parentBox.width){
            fpadding=(parentBox.width/2-((hWidth)*scale/2)+fpadding*scale)
        }
        else(fpadding=padding)
        if(vHeight*scale<parentBox.height){
            //console.log(hWidth);
            //console.log(parentBox.width)
            toppadding=(parentBox.height/2-((vHeight)*scale/2)+toppadding*scale)
        }
        else(toppadding=padding)
    
        for (var z=0,sl=siblings.length;z<sl;z++){
            column=z%itemsperrow;//console.log("Column: "+column)
            row=Math.floor(z/itemsperrow);//console.log("Row: "+row)
            if (column==0){
                point.x=(parentBox.x+fpadding)+((mWidth[column]*scale/2)-((siblings[z].getBBox().width*scale)/2));
            }
            else {
                point.x=(siblings[z-1].ctm.e)+((siblings[z-1].getBBox().width*scale)/2)+(mWidth[column-1]/2*scale)+padding+((mWidth[column]*scale/2)-((siblings[z].getBBox().width*scale)/2));;
            }
            
            if (row==0){
                point.y=(parentBox.y+toppadding)+((mHeight[row]*scale/2)-(siblings[z].getBBox().height*scale/2))
            }
            else {
                point.y=(siblings[z-itemsperrow].ctm.f)+(siblings[z-itemsperrow].getBBox().height*scale/2)+(mHeight[row-1]*scale/2)+padding+((mHeight[row]*scale/2)-(siblings[z].getBBox().height*scale/2));                    
            }
            siblings[z].setAttribute("transform","translate("+point.x+","+point.y+"),scale("+scale+")");
            //These groups are hidden when created. This function removes this attribute so the group becomes visible unless its members have explicit "visibility" attributes
            siblings[z].removeAttribute("visibility");
            siblings[z].ctm=siblings[z].getCTM().inverse().multiply(parentMatrix).inverse()
            //Reset labels showscale
            var labels=siblings[z].querySelectorAll("text");
            for(var l=0,ll=labels.length;l<ll;l++){
                var itemScale=labels[l].getCTM().a/mapMatrix.a;
                var scaledFontSize=labels[l].getAttribute("font-size")*itemScale;
                //Calculate Map Scale at which the label becomes first visible
                if(minVisTextSize/scaledFontSize>1){
                    var mapScaleFactor=Math.floor(minVisTextSize/scaledFontSize);
                }
                else if(minVisTextSize/scaledFontSize<1){
                    var mapScaleFactor=Math.floor((scaledFontSize/minVisTextSize))*-1;
                }
                else{var mapScaleFactor=1};
                labels[l].setAttribute("showscale",mapScaleFactor)
            }
        }
    }
    //else if(stack == 1){
    //    for (var z=0,sl=siblings.length;z<sl;z++){
    //        itemsperrow = 1;
    //        column=z%itemsperrow;//console.log("Column: "+column)
    //        row=Math.floor(z/itemsperrow);//console.log("Row: "+row)
    //            
    //        if (column==0){
    //            point.x=(parentBox.x+fpadding)+((mWidth[column]/2)-(siblings[z].box.width/2));
    //        }
    //        else {
    //            point.x=(siblings[z-1].ctm.e)+(siblings[z-1].box.width/2)+(mWidth[column-1]/2)+padding+((mWidth[column]/2)-(siblings[z].box.width/2));;
    //        }
    //        
    //        if (row==0){
    //            point.y=(parentBox.y+toppadding)+((mHeight[row]/2)-(siblings[z].box.height/2))
    //        }
    //        else {
    //            point.y=(siblings[z-itemsperrow].ctm.f)+(siblings[z-itemsperrow].box.height/2)+(mHeight[row-1]/2)+padding+((mHeight[row]/2)-(siblings[z].box.height/2));                    
    //        }
    //        siblings[z].setAttribute("transform","translate("+point.x+","+point.y+")");
    //        //These groups are hidden when created. This function removes this attribute so the group becomes visible unless its members have explicit "visibility" attributes
    //        siblings[z].removeAttribute("visibility");
    //
    //        siblings[z].ctm=siblings[z].getCTM().inverse().multiply(parentMatrix).inverse()
    //        
    //        //There is an issue here that a text label changes the BBox of the items, causing the positioning to get mis-aligned.
    //        //A solution would be to remove and recreate the label
    //        
    //        if(z<mWidth.length){
    //            width=(point.x+(siblings[z].box.width/2)+(mWidth[column]/2)+backpadding)-parentBox.x;//parentItem.setAttribute("width",(width))
    //        }
    //        
    //        height=(point.y+(siblings[z].box.height/2)+(mHeight[row]/2)+bottompadding)-parentBox.y;//parentItem.setAttribute("height",(height))
    //        if(column==(itemsperrow-1)){
    //            
    //            if(siblings[z].getBBox().height>=siblings[z-column].getBBox().height){
    //                pBw=pBw+siblings[z].box.height;
    //            }
    //            else{
    //                pBw=pBw+siblings[z-column].box.height;
    //            }
    //        }
    //        if(z==(sl-1) && column!=(itemsperrow-1)){
    //            
    //            if(siblings[z].getBBox().height>=siblings[z-column].getBBox().height){
    //                pBw=pBw+siblings[z].box.height;
    //            }
    //            else{
    //                pBw=pBw+siblings[z-column].box.height;
    //            }
    //        }
    //    }
    //
    //    //parentItem.setAttribute("width",(width));
    //    //parentItem.setAttribute("height",(height));
    //}

    
    for (var n=0,cl=connectors.length;n<cl;n++){
        var y1=connectors[n].connectorParent.y.animVal.value+(connectors[n].connectorParent.getAttribute("height")/2)-(connectors[n].connectorBw/2);
        var y2=y1+connectors[n].connectorBw;
		if(y1) {
	        connectors[n].setAttribute("y1",y1);
		}
		if(y2) {
			connectors[n].setAttribute("y2",y2);
		}
        if(connectors[n].parentVector==1){
            var extX=connectors[n].connectorParent.x.animVal.value+connectors[n].connectorParent.width.animVal.value;
            var intX=connectors[n].connectorParent.x.animVal.value;
            //console.log(extX)
        }
        if(connectors[n].parentVector==-1){
            //console.log(connectorParent)
            var intX=connectors[n].connectorParent.x.animVal.value+connectors[n].connectorParent.width.animVal.value;
            var extX=connectors[n].connectorParent.x.animVal.value;
            //console.log(intX)
        }
        //console.log(connectorVector)
        //if(connectors[n].connectorVector==connectors[n].parentVector){x1=extX;x2=x1}
        //if(connectors[n].connectorVector!=connectors[n].parentVector){x1=intX;x2=x1}
        if(connectors[n].seq==0 || connectors[n].seq==1){var x1=extX;var x2=x1}
        if(connectors[n].seq==2 || connectors[n].seq==3){var x1=intX;var x2=x1}
        connectors[n].setAttribute("x1",x1);connectors[n].setAttribute("x2",x2)
    }
    //console.log(pBw);console.log(parentItem.id)
    positionItemCount=positionItemCount+siblings.length+connectors.length;
    siblings.length=0;
    //mWidth.length=0;mHeight.length=0;
    if (parentItem.id!="viewport" && propagate==1){
        //console.log("Not viewport. parent: "+parentItem.id);
        if(parentBw<pBw){parentItem.setAttribute("bw",pBw)};
        position(parentItem.id,-1,-1,-1);//console.log(childItem.getAttribute("parent"))    
    }
    
}

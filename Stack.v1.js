function createStackedBars(item,template,dataSet){

/*  This function is used primarily to create stacked device views, such as Volumes and disk partitions
 *  It is NOT used for samples, only during map creation/refresh
 *  IIRC it's only used once
*/
  
    var data=d3.layout.stack().offset("silhouette")(dataSet)
    var color = d3.interpolateRgb("gray", "gray");
    
    var pWidth=item.width.animVal.value;
    var pHeight=item.height.animVal.value;
    var vector=item.getAttribute("vector");

    var margin = 2,
        padding=itemTemplate[template].padding,
        xFactor=0.8
        width = pWidth,
        height = pHeight// - .5 - margin,
        mx = 1;//m;
    var my = d3.max(data, function(d) { //Find out the total height of the stack
      return d3.max(d, function(d) {
        return (d.y0 + d.y);
      });
    });
        
    var p=padding*(data.length+1);
    
    var r=Math.min(height/(my+p),1);//If total height of stack plus padding is bigger than the item height - calculate "r" to multiply every value by. "r" is <0
    padding=padding*r;
    p=padding*(data.length+1);
    
    var s=padding+(height-((my*r)+p))/2;
        
    var x = function(d) { return d.x * width / mx; };
                    
    //var groups=d3.select(item.parentNode).selectAll("g."+itemTemplate[template].class+"Group")
    //Only select direct children - not the entire tree below
    //var groups=d3.select(item.parentNode).selectAll("g[id='" + item.parentNode.id + "'] > g."+itemTemplate[template].class+"Group")
    
    //Tiny hack to allow selection below to be non-class-specific. Sometimes a device will contain children of different classes,
    //e.g. "Vols" include both "vg" class and "vol" class
    var groups=d3.select(item.parentNode).selectAll("g[id='" + item.parentNode.id + "'] > g[parent='"+item.id+"']")

    groups    
        .data(data,function(d){return d.name;})
        .enter()
        .append("g")
        .attr("id",function(d){return d[0].name+"_g"})
        .attr("class",itemTemplate[template].class+"Group")
        .attr("parent",function(){return item.id})
        .attr("owner",function(){return item.getAttribute("owner")})
        //.attr("visiblity",null)
    
    //var items = [];
    groups.each(function(d,i,j){
              var w=x({x: xFactor});
              var thisTemplate = d3.select(this).attr('template');
              //var rect = createItem({"id":d[0].name,"parent":item.id,"template":template,"bw":d[0].y,width:w/*,"height":d[0].y*r,"width":x({x: xFactor})*/})
              var rect = createItem({"id":d[0].name,"parent":item.id,"template":thisTemplate,"bw":d[0].y,width:w/*,"height":d[0].y*r,"width":x({x: xFactor})*/})
              //items.push(rect);
              }
            )
    groups
        .attr("transform", function(d,i,j) {return "translate(" + ((width-x({x: xFactor}))/2) + ","+(s+d[0].y0*r+(padding*i))+")"; })
        .attr("visibility",null)//These groups aren't positioned - need to remove visibility attr now
    
    //var items=groups.selectAll("."+itemTemplate[template].class).data(function(d){return d;});
    var items=groups.selectAll("rect[parent='" + item.id + "']").data(function(d){return d;});
    items
        .attr("bw",function(d){return d.y*r})
        .attr("width",x({x: xFactor}))
    items
        .attr("height",function(d){;return d.y*r})
        
    items.each(function(){
            createLabel(this)
            });
    
    var conns=groups.selectAll(".connector[type='"+itemTemplate[template].type+"']")
          .attr("y2",function(){var a=d3.select(this.parentNode).data();return a[0][0].y*r;})
          .attr("bw",function(){var a=d3.select(this.parentNode).data();return a[0][0].y*r;})
    
    if(vector==1){var seq = "[seq='0'],[seq='1']"}
    if(vector==-1){var seq = "[seq='2'],[seq='3']"}
    
    conns=conns.filter(seq);
    conns.attr("x1",x({x: xFactor})).attr("x2",x({x: xFactor}))
    
    //Bug here because the selector also gets the children connectors - e.g. disks - and sets their width wrong
    //var c1=groups.selectAll("[seq='2']");
    //c1.attr("x1",x({x: xFactor})).attr("x2",x({x: xFactor}))
    //var c2=groups.selectAll("[seq='3']");
    //c2.attr("x1",x({x: xFactor})).attr("x2",x({x: xFactor}))
        
    groups.each(function(d)
                {var child=this.querySelector("rect[parent='"+d[0].name+"']");
                    if(child){
                            //createLabel(child);
                            position(child.id,-1,-1,-1,0);
                    }
                })
}

function redraw(item,newData){
    if (newData==null || newData.samples == null){return;}
    var stack=d3.layout.stack().offset("silhouette");
    var data = stack(newData.samples);
    var template = newData.template;
    
    var pWidth=item.width.animVal.value; //parent width
    var pHeight=item.height.animVal.value; //parent height
    var percent = pHeight/100;//One percent is equivalent to

    var margin=2,
        padding=(itemTemplate[template].padding),
        xFactor=0.9,
        width = pWidth,
        height = pHeight,// - .5 - margin,
        mx = 1;//m;
    var my = d3.max(data, function(d) { //Find the total height of the highest stack (usually only 1)
      return d3.max(d, function(d) {    //This is the total percentage you are to display;
        return (d.y0 + d.y);
      });
    });
        
    var p=padding*(data.length+1);//Total hight padding (spaces between items) will take
    
    //There is a bug here. If there are too many samples, the total height of padding is bigger than the total item height
    //Gotta make padding varying height
    
    var r=Math.min(height/((my+p)*percent),1)*percent;//If total height of stack plus padding is bigger than the item height -
    padding=Math.min(padding*r,padding);              //calculate "r" to multiply every value by. "r" is <0
    p=padding*(data.length+1);
    
    var s=padding+(height-((my*r)+p))/2;
        
    var x = function(d) { return d.x * width / mx; };
    
    //Select all groups that contain, or will contain, the samples. Join it to data to create enter and exit sections
    
    var groups=d3.select(item.parentNode).selectAll("g."+itemTemplate[template].class+"Group")

    groups=groups.data(data,function(d){return d[0].name;});
    
    //Create an Enter and Exit selections
    var enter=groups.enter();
    
    var exit=groups.exit();
    
    //Handle Exit: gracefully remove samples that don't appear in this refresh
    exit.select("rect").transition().duration(2000).attr("height",0)//.remove();
    //remove connected pipes
//    exit.each(function(){})
    exit.transition().delay(2120).remove();
    
    //Handle Enter:
    //Add group placeholders for new samples. Set the opacity to 0 so they are initially invisible
    //Position them properly
    enter
        .append("g")
        .attr("id",function(d){return d[0].name+"_g"})
        .attr("class",itemTemplate[template].class+"Group")
        .attr("parent",function(){return item.id})
        .attr("owner",function(){return item.getAttribute("owner")})
        //.attr("visiblity",null)
        .attr("transform", function(d,i,j) { return "translate(" + ((width-x({x: xFactor}))/2) + ","+(s+d[0].y0*r+(padding*i))+")"; })
        
    //Here the "enter" selection is already joined to the main "groups" selection.
    //Run createItem on each of them. New items will be created only for "new" items (from enter selection)
    //Items are created as "Hidden"
    groups.each(function(d,i,j){
            //createItem({"visibility":"hidden","id":item.id+d[0].name,"parent":item.id,"template":template,"bw":d[0].y,"height":d[0].y*r,"width":x({x: xFactor})})}
            createItem({"id":d[0].name,"parent":item.id,"template":template,"bw":d[0].y,"height":0,"width":x({x: xFactor})})}
            )
    
    var items=groups.selectAll("."+itemTemplate[template].class).data(function(d){return d;});
    items
        .attr("transform", function(d,i,j) {var str = d3.select(this.parentNode).attr("transform")
                                            var currentTransform=str.substring((str.indexOf(",")+1),str.indexOf(")"));
                                            var newTransform=(s+d.y0*r+(padding*j));//For some reason J and not I. Because it's subselection
                                            //var newTransform=(s+d.y0*r);
                                            var diff=currentTransform-newTransform;
                                            //if(diff!=0){console.log(diff)}
                                            return "translate(0,"+diff+")"; })//Set reverse transform on the rect
        .attr("bw",function(d){return d.y*r})
        .attr("percent",function(d){return d.y})
        .attr("width",x({x: xFactor}))
    
    groups//.transition()
        //.duration(2000)
        .attr("transform", function(d,i,j) {return "translate(" + ((width-x({x: xFactor}))/2) + ","+(s+d[0].y0*r+(padding*i))+")"; })
        
    //Resize connectors; BUG HERE - if these groups have children, their conns will be selected too
    var conns=groups.selectAll(".connector")
    //.transition().delay(500).duration(2000)
    .attr("y2",function(){var a=d3.select(this.parentNode).data();return a[0][0].y*r;})
    .attr("bw",function(){var a=d3.select(this.parentNode).data();return a[0][0].y*r;})    
   
    items.transition()
        //.delay(500)
        .duration(2000)
        .attr("transform","translate(0,0)")
        .attr("height",function(d){;return (d.y)*r})// Multiply Y (percentage)
}

function simple_data(samples,stacks,number,parentId){
   var arr=new Array();
   for(var a=0;a<samples;a++){//A is the stack number
       var arr1=new Array();
       for(var b=0;b<stacks;b++){
           var obj=new Object();
           obj.x=b;        //X is the position of the sample. In each array, x should range from 0 to the number of stacks
           //obj.y=Math.floor(Math.random()*5+1)
           obj.y=Math.random()*number+1
           //obj.y=Math.random();
           obj.name=parentId+"sample"+b+a;//+Math.random();
           arr1.push(obj)
       }
       arr.push(arr1)
   }
   return arr;
}
// Helper functions
function translation(x,y) {
    return 'translate(' + x + ',' + y + ')';
}

function parentWidth(elem){
    return elem.parentElement.clientWidth;
};

function widthCalc(id){
    return parentWidth(document.getElementById(id));
};
// end helper functions
var double_pyramid = {
    generate: function(data_url,graph_id,menu_id,load_callback){
	var graph = {
	    data_url: data_url,
	    graph_id: graph_id,
	    menu_id: menu_id,
	    h_ratio: 0.6,
	    margin: {top: 20, right: 10, bottom: 10, left: 55},
	    lbl_space: 100,
	    format: d3.format('.4s'),
	    categories: undefined,
	    menu: undefined,
	    opts: undefined,
	    svg: undefined,
	    altKey: undefined,
	    // Selector to order bars and create scales
	    sel_options: ['perLeft','perRight'],
	    selector: 'perLeft',
	    // Number to select top data to visualize
	    top_sel: 33,
	    createAxis: function(scale,ticks){
		return d3.svg.axis()
		    .scale(scale)
		    .orient("top")
		    .tickSize(-this.height - this.margin.bottom)
		    .tickFormat(this.format)
		    .ticks(ticks);
	    },
	    createBars: function(elem,classname){
		var that = this;
		return elem.enter().insert('g', '.axis')
		    .attr('class', classname)
		    .attr('transform',function(d){return translation(0,that.y(d.name)+that.height);})
		    .style('fill-opacity', 0);
	    },
	    appendBars: function(elem,data_sel,offset,mirror){
		var that = this;
		var appbars = elem.append('rect')
    		    .attr('x',offset)
		    .attr('width', function(d) {return that.xRight(d[data_sel]); })
		    .attr('height', that.y.rangeBand());
		if(mirror) appbars.attr('transform',translation(that.offset_left, 0)+' scale(-1,1)');
	    },
	    // need more refactoring
	    updateBars: function(elem,data_sel,offset,classname,isLeftColumn){
		var that = this;
		var upbar = d3.transition(elem)
		    .attr('transform', function(d){return translation(0,d.y0 = that.y(d.name));})
		    .style('fill-opacity', 1);
		upbar.select('rect')
		    .attr('width', function(d){return that.xRight(d[data_sel]);});
		upbar.select('.'+classname)
		    .attr('x',function(d){
			var label_len= 20;
			// ToDo: get the real equation to calculate label offset for negative x
			switch(that.format(d[data_sel]).length){
			case 4:
			    label_len = 25;break;
			case 5:
			    label_len = 32;break;
			case 6:
			    label_len = 42;break;
			case 7:
			    label_len = 42;break;
			case 8:
			    label_len = 52;break;
			default:
			    break;
			}
			return offset+(isLeftColumn ?
				       -(that.xRight(d[data_sel])+label_len) :
				       that.xRight(d[data_sel])+3);
		    })
		    .text(function(d){return that.format(d[data_sel]);});
		return upbar;
	    },
	    removeBars: function(elem,data_sel,offset,classname){
		var that = this;
		var exbar =  d3.transition(elem.exit())
		    .attr('transform',function(d) { return translation(0,d.y0+that.height);})
		    .style('fill-opacity', 0)
		    .remove();
		exbar.select('rect')
		    .attr('width',function(d){return d[data_sel] ? that.xRight(d[data_sel]):0});
		exbar.select('.'+classname)
		    .attr('x',function(d){return d[data_sel] ? offset + that.xRight(d[data_sel]) - 3:0})
		    .text(function(d) { return that.format(d[data_sel]);});
	    },
	    createLabels: function(elem,label_sel){
		elem.append('text')
		    .attr('class','label')
		    .attr('x', this.width/2)
		    .attr('y', this.y.rangeBand() / 2)
		    .attr('dy', '.35em')
		    .attr('text-anchor', 'end')
		    .text(function(d){return d[label_sel];})
	    },
	    createDataLabels: function(elem,data_sel,offset,classname){
		var that = this;
		elem.append('text')
		    .attr('class',classname)
		    .attr('x',function(d){return offset + that.xRight(d[data_sel]) - 3;})
		    .attr('y',that.y.rangeBand() / 2)
		    .attr('dy','.35em');
	    },
	    loadData: function(url,callback){
		var that = this;
		d3.csv(data_url, function(error,data) {
		    if (error) console.log(error);
		    that.categories = d3.nest().key(function(d){return d.category}).map(data);
		    
		    that.opts = [];
		    d3.keys(that.categories).forEach(function(d){
			var total_left = d3.sum(that.categories[d], function (d){return d.left});
			var total_right = d3.sum(that.categories[d], function (d){return d.right});
			that.categories[d].forEach(function(row){
			    row['perLeft'] = row['left'];
			    row['perRight'] = row['right'];
			});
			that.opts.push({'cod':d,'title':that.categories[d][0]['category_name']});
		    });
		    // Create menu options
		    that.menu.selectAll('option')
			.data(that.opts)
			.enter().append('option')
			.text(function(d){return d.title;})
			.attr('value',function(d){return d.cod});
		    // Set option selection to start
		    that.menu.property('value',Object.keys(that.categories)[0]);
		    that.redraw(that);
		    
		    if(callback) callback(that);
		});
	    },
	    // Change event for menu
	    change: function(graph,selector) {
		clearTimeout(this.timeout);
		d3.transition()
		    .duration(graph.altKey ? 7500 : 750)
		    .each(function(){graph.redraw(graph)});
	    },
	    reorder: function(graph,selector) {
		if(selector == undefined) return;
		if(graph.sel_options.indexOf(selector) < 0) return;
		clearTimeout(this.timeout);
		d3.transition()
		    .duration(graph.altKey ? 7500 : 750)
		    .each(function(){
			graph.selector = selector;
			graph.redraw(graph)
		    });
	    },
	    
	    // Draw/redraw elements
	    redraw: function(graph) {
		var sel = graph.menu.property('value');
		var top = graph.categories[sel]
		    .sort(function(a, b) { return b[graph.selector] - a[graph.selector]; })
		    .slice(0, graph.top_sel);
		graph.y.domain(top.map(function(d){return d.name;}));
		
		var barRight = graph.svg.selectAll(".barRight").data(top, function(d){return d.name; });
		var barLeft = graph.svg.selectAll(".barLeft").data(top,function(d){return d.name; });
		
		var barEnterRight = graph.createBars(barRight,'barRight');
		var barEnterLeft = graph.createBars(barLeft,'barLeft');
		
		graph.appendBars(barEnterRight,'perLeft',graph.offset_right,false);
		graph.appendBars(barEnterLeft,'perRight',0,true);
		
		graph.createLabels(barEnterRight,'name');
		
		graph.createDataLabels(barEnterRight,'perRight',graph.offset_right,'valueRight');
		graph.createDataLabels(barEnterLeft,'perLeft',0,'valueLeft');
		
		// Find max on both scales
		var max_left = d3.max(top,function(d){return parseFloat(d['perLeft'])});
		var max_right = d3.max(top,function(d){return parseFloat(d['perRight'])});
		var max_axis = d3.max([max_left,max_right]);
		graph.xRight.domain([0,max_axis]);
		graph.xLeft.domain([0,max_axis]);
		
		// Set update transition for bars
		graph.updateBars(barRight,'perRight',graph.offset_right,'valueRight',false);
		graph.updateBars(barLeft,'perLeft',graph.offset_left,'valueLeft',true);
		
		graph.removeBars(barRight,'parArea',graph.offset_right,'valueRight');
		graph.removeBars(barLeft,'parUpa',0,'valueLeft');
		
		// Axis transition
		d3.transition(graph.svg).select(".xRight.axis")
    		    .attr('transform', translation(graph.offset_right,0))
		    .call(graph.xAxisRight);
		d3.transition(graph.svg).select(".xLeft.axis")
		    .call(graph.xAxisLeft);
	    },
	    setInitVars: function(){
		// Calculate variables to render
		this.margin.right = 55; // Hack to work (??)
		this.width = widthCalc(graph_id) - this.margin.left - this.margin.right;
		this.height = (this.width*this.h_ratio) - this.margin.top - this.margin.bottom;
		this.mid_pnt = (this.width-this.lbl_space)/2;
		this.offset_right = this.mid_pnt+this.lbl_space;
		this.offset_left = this.mid_pnt-3;
		
		this.xRight = d3.scale.linear().range([0, this.mid_pnt]);
		this.xLeft = d3.scale.linear().range([this.mid_pnt,0]);
		this.y = d3.scale.ordinal().rangeRoundBands([0, this.height], .1);

		// Create axis
		var ticks;
		if(this.width < 400) ticks = 1;
		else if (this.width < 750) ticks = 3;
		else ticks = 6;
		this.xAxisRight = this.createAxis(this.xRight,ticks);
		this.xAxisLeft = this.createAxis(this.xLeft,ticks);

		// Create object
		graph.menu = d3.select('#'+graph.menu_id+' select');
		graph.menu.on('change', function(){graph.change(graph)});
		// Initialize graph object
		graph.svg = d3.select('#'+graph.graph_id).append('svg')
		    .attr('width', graph.width + graph.margin.left + graph.margin.right)
		    .attr('height', graph.height + graph.margin.top + graph.margin.bottom)
		    .append('g')
		    .attr('transform', translation(graph.margin.left, graph.margin.top));
		
		// Create axis DOM elements
		graph.svg.append('g').attr('class', 'xRight axis');
		graph.svg.append('g').attr('class', 'xLeft axis');
		
		graph.svg.append('g').attr('class', 'y axis')
		    .append('line')
		    .attr('class', 'domain')
		    .attr('y2', this.height);
	    },
	    resize: function(){
		// Clear svg before
		d3.select('#'+this.graph_id).selectAll('svg').remove();
		this.svg = undefined;
		// Render again
		this.setInitVars();
		this.redraw(this);
	    }
	};
	graph.setInitVars();
	
	// Arrange data
	graph.loadData(data_url,load_callback);
	graph.timeout = setTimeout(function() {
	    graph.change(graph);
	}, 5000)
	
	// ToDo: Check to remove
	d3.select(window)
	    .on('keydown', function() { altKey = d3.event.altKey; })
	    .on('keyup', function() { altKey = false; });

	return graph;
    }
}
var oas;
document.addEventListener("DOMContentLoaded",function(event){
    var graph = double_pyramid.generate('data/rnd_data.csv','graph','menu',function(graph){
	d3.select('#order-selector').selectAll('button')
	    .on('click',function(){
		d3.select('#order-selector').selectAll('button')
		    .classed('active',false);
		this.classList.add('active');
		graph.reorder(graph,this.value);
	    });
	window.onresize = function(event){graph.resize();}
    });
});

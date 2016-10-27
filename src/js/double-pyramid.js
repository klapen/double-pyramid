// Define variables
var margin = {top: 20, right: 40, bottom: 10, left: 40},
width = 800,
height = 600 - margin.top - margin.bottom,
lbl_space = 100,
mid_pnt = (width-lbl_space)/2;
var offset_right = mid_pnt+lbl_space;
var offset_left = mid_pnt-3;

var format = d3.format(".1%"),
    categories, menu, opts, svg;
var oas;

var xRight = d3.scale.linear().range([0, mid_pnt]);
var xLeft = d3.scale.linear().range([mid_pnt,0]);
var y = d3.scale.ordinal().rangeRoundBands([0, height], .1);

var xAxisRight = createAxis(xRight);
var xAxisLeft = createAxis(xLeft);

var altKey;
// Selector to order bars and create scales
var selector = 'perLeft';
// Number to select top data to visualize
var top_sel = 33;

// Helper functions
function translation(x,y) {
    return 'translate(' + x + ',' + y + ')';
}

function createAxis(scale){
    return d3.svg.axis()
	.scale(scale)
	.orient("top")
	.tickSize(-height - margin.bottom)
	.tickFormat(format);
};

function createBars(elem,classname){
    return elem.enter().insert('g', '.axis')
	.attr('class', classname)
	.attr('transform',function(d){return translation(0,y(d.name)+height);})
	.style('fill-opacity', 0);
};

function appendBars(elem,data_sel,offset,mirror){
    var appbars = elem.append('rect')
    	.attr('x',offset)
	.attr('width', function(d) {return xRight(d[data_sel]); })
	.attr('height', y.rangeBand());
    if(mirror) appbars.attr('transform',translation(offset_left, 0)+' scale(-1,1)');
};

// need more refactoring
function updateBars(elem,data_sel,offset,classname,isLeftColumn){
    var upbar = d3.transition(elem)
	.attr('transform', function(d){return translation(0,d.y0 = y(d.name));})
	.style('fill-opacity', 1);
    upbar.select('rect')
	.attr('width', function(d){return xRight(d[data_sel]);});
    upbar.select('.'+classname)
	.attr('x',function(d){
	    return offset+(isLeftColumn ? -(xRight(d[data_sel])+30):xRight(d[data_sel])+3);
	})
	.text(function(d){return format(d[data_sel]);});
    return upbar;
};

function removeBars(elem,data_sel,offset,classname){
    var exbar =  d3.transition(elem.exit())
	.attr('transform',function(d) { return translation(0,d.y0+height);})
	.style('fill-opacity', 0)
	.remove();
    exbar.select('rect')
	.attr('width',function(d){return d[data_sel] ? xRight(d[data_sel]):0});
    exbar.select('.'+classname)
	.attr('x',function(d){return d[data_sel] ? offset + xRight(d[data_sel]) - 3:0})
	.text(function(d) { return format(d[data_sel]);});
}

function createLabels(elem,label_sel){
    elem.append('text')
	.attr('class','label')
	.attr('x', width/2)
	.attr('y', y.rangeBand() / 2)
	.attr('dy', '.35em')
	.attr('text-anchor', 'end')
	.text(function(d){return d[label_sel];})
};

function createDataLabels(elem,data_sel,offset,classname){
    elem.append('text')
	.attr('class',classname)
	.attr('x',function(d){return offset + xRight(d[data_sel]) - 3;})
	.attr('y',y.rangeBand() / 2)
	.attr('dy','.35em');
}
//end helper function

$(document).ready(function(){
    menu = d3.select('#menu select').on('change', change);
    // Initialize graph object
    svg = d3.select('#graph').append('svg')
	.attr('width', width + margin.left + margin.right)
	.attr('height', height + margin.top + margin.bottom)
	.append('g')
	.attr('transform', translation(margin.left, margin.top));

    // Create axis DOM elements
    svg.append('g').attr('class', 'xRight axis'); //Right
    svg.append('g').attr('class', 'xLeft axis');

    svg.append('g').attr('class', 'y axis')
	.append('line')
	.attr('class', 'domain')
	.attr('y2', height);

    // Arrange data
    d3.csv('data/rnd_data.csv', function(error,data) {
	if (error) console.log(error);
	categories = d3.nest().key(function(d){return d.category}).map(data);

	opts = [];
	d3.keys(categories).forEach(function(d){
	    var total_left = d3.sum(categories[d], function (d){return d.left});
	    var total_right = d3.sum(categories[d], function (d){return d.right});
	    categories[d].forEach(function(row){
		row['perLeft'] = row['left'] / total_left;
		row['perRight'] = row['right'] / total_right;
	    });
	    opts.push({'cod':d,'title':categories[d][0]['category_name']});
	});
	// Create menu options
	menu.selectAll('option')
	    .data(opts)
	    .enter().append('option')
	    .text(function(d){return d.title;})
	    .attr('value',function(d){return d.cod});
	// Set option selection
	menu.property('value',Object.keys(categories)[0]);
	redraw();
    });

    d3.select(window)
	.on('keydown', function() { altKey = d3.event.altKey; })
	.on('keyup', function() { altKey = false; });
});

// Change event for menu
function change() {
    clearTimeout(timeout);
    d3.transition()
	.duration(altKey ? 7500 : 750)
	.each(redraw);
}

// Draw/redraw elements
function redraw() {
    var sel = menu.property('value');
    var top = categories[sel].sort(function(a, b) { return b[selector] - a[selector]; }).slice(0, top_sel);
    y.domain(top.map(function(d){return d.name;}));

    var barRight = svg.selectAll(".barRight").data(top, function(d){return d.name; });
    var barLeft = svg.selectAll(".barLeft").data(top,function(d){return d.name; });

    var barEnterRight = createBars(barRight,'barRight');
    var barEnterLeft = createBars(barLeft,'barLeft');

    appendBars(barEnterRight,'perLeft',offset_right,false);
    appendBars(barEnterLeft,'perRight',0,true);

    createLabels(barEnterRight,'name');
 
    createDataLabels(barEnterRight,'perRight',offset_right,'valueRight');
    createDataLabels(barEnterLeft,'perLeft',0,'valueLeft');

    // TODO: Find max on both scales
    xRight.domain([0, top[0][selector]]);
    xLeft.domain([0,top[0][selector]]);

    // Set update transition for bars
    updateBars(barRight,'perRight',offset_right,'valueRight',false);
    updateBars(barLeft,'perLeft',offset_left,'valueLeft',true);

    removeBars(barRight,'parArea',offset_right,'valueRight');
    removeBars(barLeft,'parUpa',0,'valueLeft');

    // Axis transition
    d3.transition(svg).select(".xRight.axis")
    	.attr('transform', translation(offset_right,0))
	.call(xAxisRight);
    d3.transition(svg).select(".xLeft.axis")
	.call(xAxisLeft);
}

var timeout = setTimeout(function() {
    menu.property('value',Objects.keys(categories)[0]).node().focus();
    change();
}, 5000);

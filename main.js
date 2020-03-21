function change_colour(el, row, col, i) {
    el.classList.add(active_colour);
    if (actions.length > 9) {
       actions.shift(); 
    }
    actions.push([row, col, active_colour]);
}

function select_colour(el) {
    active_colour = el.classList.value;
    active_colour = active_colour.split(' ')[1];
}

function undo() {
}
     
function clickableGrid(rows, cols, callback_change, callback_palette) {
    var i = 0;
    var grid = document.createElement('div');
    var palette_classes = ['colour_field', 'colour_town', 'colour_water', 'colour_forest', 'colour_monster', 'colour_null'];
    for (var r=0; r<rows; ++r) {
        var row = grid.appendChild(document.createElement('div'));
        for (var c=0; c<cols; ++c) {
            var cell = row.appendChild(document.createElement('div'));
            cell.classList.add('row_grid');
            cell.innerHTML = ++i;
            cell.addEventListener(
                'click',
                (function(el,r,c,i) {
                    return function() {
                        callback_change(el,r,c,i);
                    }
                }) (cell, r, c, i),false);
        }
        if (r <= 6) {
            var palette = grid.appendChild(document.createElement('div'));
            palette.classList.add('palette');
            palette.classList.add(palette_classes[r]);
            palette.addEventListener(
                'click',
                function (el) {
                    return function () {
                        callback_palette(el);
                    }
                } (palette)
            )
        }
    }
    return grid;
}

var active_colour = 'colour_null';
var actions = [];
var grid = clickableGrid(11, 11, change_colour, select_colour);
document.body.appendChild(grid);
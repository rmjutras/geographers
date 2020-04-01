function change_colour(el, row, col, i) {
    el.classList.add(active_colour);
    actions.push([row, col, palette_key[active_colour]].join(''));
}

function select_colour(el) {
    active_colour = el.classList.value;
    active_colour = active_colour.split(' ')[2];

    const newarr = selected_palette.classList.value;
    selected_palette.classList.remove(newarr.split(' ')[2]);
    selected_palette.classList.add(active_colour);
};

function undo_click() {
    console.log(actions[actions.length - 1]);
};

function share_click() {
    let sharelist = actions;
    console.log(sharelist.join(''))
};

function import_click() {
    console.log('import');
};
     
function clickableGrid(rows, cols, callback_change) {
    let i = 0;
    const grid = document.createElement('div');

    for (var r=0; r<rows; ++r) {
        var row = grid.appendChild(document.createElement('div'));
        for (var c=0; c<cols; ++c) {
            let cell = row.appendChild(document.createElement('div'));
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
    }
    return grid;
};

function generatePalette(callback_palette) {
    let palette_master = document.createElement('div');
    selected_palette = palette_master.appendChild(document.createElement('div'));
    selected_palette.classList.add('palette');
    selected_palette.classList.add('selected_palette');
    selected_palette.classList.add(active_colour);

    const palette_classes = Object.keys(palette_key);
    palette_classes.forEach(element => {
        let palette = palette_master.appendChild(document.createElement('div'));
        palette.classList.add('palette');
        palette.classList.add('palette_sub');
        palette.classList.add(element);
        palette.addEventListener(
            'click',
            function (el) {
                return function () {
                    callback_palette(el);
                }
            } (palette)
        );
    });
    return palette_master;
};

function generateButtons() {
    let buttons_master = document.createElement('div');
    undo_button = buttons_master.appendChild(document.createElement('button'));
    undo_button.innerHTML = 'Undo';
    undo_button.addEventListener(
        'click',
        function() {
            undo_click();
        }
    );
    share_button = buttons_master.appendChild(document.createElement('button'));
    share_button.innerHTML = 'Share';
    share_button.addEventListener(
        'click',
        function () {
            share_click();
        }
    )
    import_button = buttons_master.appendChild(document.createElement('button'));
    import_button.innerHTML = 'Import';
    import_button.addEventListener(
        'click',
        function () {
            import_click();
        }
    );
    return button_master;
};

function main() {
    const grid = clickableGrid(11, 11, change_colour, select_colour);
    const palette_master = generatePalette(select_colour);
    const button_master = generateButtons();
    document.getElementById('grid_master').appendChild(grid);
    document.getElementById('palette_master').appendChild(palette_master);
    document.getElementById('button_master').appendChild(button_master);
};

let active_colour = 'colour_null';
let actions = [];
let selected_palette = null;
const palette_key = {
    'colour_field': 'y',
    'colour_town': 'r',
    'colour_water': 'b',
    'colour_forest': 'g',
    'colour_monster': 'p',
    'colour_null': 'n'
};
main();


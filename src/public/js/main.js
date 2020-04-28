function change_colour(el, row, col, i) {
    const x = el.classList.value.split(' ');
    console.log(x);
    let colour;
    let terrain;
    x.forEach(element => {
        if (element.split("_")[0] === 'colour') {
            colour = element;
            if (active_colour.split('_')[0] === 'colour') {
                el.classList.remove(element);
                el.classList.add(active_colour);
                colour = active_colour;
            }
        } else if (element.split("_")[0] === 'terrain') {
            terrain = element;
            if (active_colour.split('_')[0] === 'terrain') {
                el.classList.remove(element);
                el.classList.add(active_colour);
                terrain = active_colour;
            }
        }
    });
    actions.push([row, col, palette_key[colour], terrain_key[terrain]].join(''));
    grid_state[row][col] = palette_key[colour] + terrain_key[terrain];
    console.log(grid_state);
    // stugame.setGameState({ grid: grid_state });
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
    console.log(grid_state);
};

function import_click() {
    console.log('import');
};
     
function clickableGrid(rows, cols, callback_change) {
    let i = 0;
    const grid = document.createElement('div');

    for (var r=0; r<rows; ++r) {
        var row = grid.appendChild(document.createElement('div'));
        grid_state.push([]);
        for (var c=0; c<cols; ++c) {
            let cell = row.appendChild(document.createElement('div'));
            cell.id = "cell_" + r + c;
            grid_state[r].push(palette_key['colour_null']+terrain_key['terrain_null']);
            cell.classList.add('row_grid');
            cell.classList.add('colour_null');
            cell.classList.add('terrain_null');
            // cell.innerHTML = ++i;
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

function redraw() {
    for (var i = 0; i < grid_state.length; i++) {
        var row = grid_state[i];
        for (var j = 0; j < row.length; j++) {
            var cell = document.getElementById("cell_" + i + j);
            resetCell(cell);
            cell.classList.add(palette_key_inverse[row[j][0]]);
            cell.classList.add(terrain_key_inverse[row[j][1]]);
        }
    }
}

function resetCell(cell) {
    Object.keys(palette_key).forEach(k => {
        cell.classList.remove(k);
    });
    Object.keys(terrain_key).forEach(k => {
        cell.classList.remove(k);
    });
}

function shareBoard() {
    var display = document.getElementById("board_code");
    var url = document.location.href;
    var hashPos = url.search("#");
    if (hashPos > -1) {
        url = url.substring(0, hashPos);
    }
    url += "#board=" + grid_state.map(function(row) {
        return row.join("");
    }).join("");
    display.value = url;
    console.log(url);
}

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
        if (element === 'colour_null') {
            palette.classList.add('colour_null_palette_only');
        }
        palette.addEventListener(
            'click',
            function (el) {
                return function () {
                    callback_palette(el, 'colour');
                }
            } (palette)
        );
    });

    // Object.keys(terrain_key).forEach(element => {
    //     if (element !== 'terrain_null') {
    //         let terrain_palette = palette_master.appendChild(document.createElement('div'));
    //         terrain_palette.classList.add('palette')
    //         terrain_palette.classList.add('terrain_sub');
    //         terrain_palette.classList.add(element);
    //         terrain_palette.addEventListener(
    //             'click',
    //             function (el) {
    //                 return function () {
    //                     callback_palette(el, 'terrain');
    //                 }
    //             } (terrain_palette)
    //         );
    //     }
    // })
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

function grid_str_to_array(str) {
    var array_out = [];
    for (var i = 0; i < 11; i++) {
      array_out.push([]);
      for (var j = 0; j < 11; j++) {
        array_out[i].push(str.substring(i * 22 + j * 2, i * 22 + j * 2 + 2));
      }
    }
    return array_out;
}

function main() {
    const grid = clickableGrid(11, 11, change_colour);
    const palette_master = generatePalette(select_colour);
    const button_master = generateButtons();
    document.getElementById('grid_master').appendChild(grid);
    document.getElementById('palette_master').appendChild(palette_master);
    // document.getElementById('button_master').appendChild(button_master);
    grid_state = grid_str_to_array('nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnonnnmnnnnnnnnnonmnnnnnnnnnnnnnnnnnnnnnnnnnvnnnnnnnnnnnnnnnnnnnvnvnonnnnnnnnnnnnnnnnnvnvnvnnnnnnnnnnnonnnnnnnvnnnnnnnnnnnnnnnnnnnnnmnnnnnonnnnnnnnnnnnnnnnnnnnnnnmnnnnnnnmnonnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn');
    redraw();
};

let active_colour = 'colour_null';
let actions = [];
let grid_state = [];
let selected_palette = null;
const palette_key = {
    'colour_field': 'y',
    'colour_town': 'r',
    'colour_water': 'b',
    'colour_forest': 'g',
    'colour_monster': 'p',
    'colour_null': 'n'
};

const terrain_key = {
    'terrain_mountain': 'm',
    'terrain_outpost': 'o',
    'terrain_null': 'n',
    'terrain_void': 'v'
}

const palette_key_inverse = {
    'y': 'colour_field',
    'r': 'colour_town',
    'b': 'colour_water',
    'g': 'colour_forest',
    'p': 'colour_monster',
    'n': 'colour_null',
    'm': 'colour_mountain',
    'o': 'colour_outpost'
};

const terrain_key_inverse = {
    'm': 'terrain_mountain',
    'o': 'terrain_outpost',
    'n': 'terrain_null',
    'v': 'terrain_void'
}
main();


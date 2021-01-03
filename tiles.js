/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function loadGroundTiles(offX, offZ) {
  for (let relX = -tilesFromCenter; relX <= tilesFromCenter; relX++) {
    for (let relZ = -tilesFromCenter; relZ <= tilesFromCenter; relZ++) {
      addTile(relX+offX, relZ+offZ);
    }
  }
  //console.log("Loaded " + count + " tiles.");
  //document.getElementById('info').innerHTML += "Loaded " + count + " tiles<br>";
}

function addTile(relX, relZ) {
  var id = "tile"+relX+"_"+relZ;
  var add = 1;
  try {
    if (document.querySelector("#"+id).id == id)
    {
      add = 0;
    }
  }
  catch(err){
    add = 1;
    //alert("new "+id);
  }

  if(add == 1) {
    return new Promise((resolve, reject) => {
      var tile = document.createElement("a-plane");
      tile.setAttribute("id", id);
      tile.setAttribute("class", "tile");
      tile.setAttribute("data-reltilex", relX);
      tile.setAttribute("data-reltiley", relZ);
      tile.setAttribute("rotation", {x: -90, y: 0, z: 0});
      tile.setAttribute("position", getPositionFromTilepos({x: relX, y: relZ}, {x: 0.5, y: 0.5}));
      tile.setAttribute("src", tileServer + tileZoom + "/" + (baseTileID.x + relX) + "/" + (baseTileID.y + relZ) + ".png");
      tile.setAttribute("crossorigin","Anonymous");
      tile.setAttribute("width", baseTileSize);
      tile.setAttribute("height", baseTileSize);
      tiles.appendChild(tile);
      
      resolve();
      // reject("whatever the error");
    });
  }
}

function deleteGroundTiles(offX, offZ) {
  for (let relX = -tilesFromCenterDelete; relX <= tilesFromCenterDelete; relX++) {
    for (let relZ = -tilesFromCenterDelete; relZ <= tilesFromCenterDelete; relZ++) {
      removeTile(relX+offX, relZ+offZ);
    }
  }
}

function removeTile(relX, relZ) {
  var id = "tile"+relX+"_"+relZ;
  var rem = 0;
  try {
    if (document.querySelector("#"+id).id == id)
    {
      rem = 1;
      //alert("del"+id);
    }
  }
  catch(err){
    rem = 0;
  }

  if(rem == 1) {
    var tile = document.querySelector("#"+id);
    //console.log(tiles);console.log("delete "+tile);

    tiles.removeChild(tile);
  }
}


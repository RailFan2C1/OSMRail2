/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var tileZoom = 19;
var presetsFile = "presets.json";
var centerPos;
var routeId, showTrees, showBuildings, showTunnels, startRevert, startYard;
var map, tiles, items;
var baseTileID, baseTileSize, centerOffset;
var tilesFromCenter = 1;
var tilesFromCenterDelete = 3;
var segCount = 0;
var cam = 1;
var segNext = new Array;
var segPrev = new Array;
var segDir = new Array;
var segCur, segOld;
var segDelCur, segDelOld;
var nextTrackLen = new Array;
var nt = 0;
var track = new Array;
var numberTrackSections = 0; 
var speed = 80;
var xmin=100000, xmax=-100000, zmin=100000, zmax=-100000, ymax=100;
var loaderX=0, loaderZ=0, loaderTX, loaderTZ, loaderTXOld=0, loaderTZOld=0;
var eraserX=0, eraserZ=0, eraserTX, eraserTZ, eraserTXOld=0, eraserTZOld=0;
var tileSize=50;
var init=1;
var doLoop=1, menu=1;
var debugEnabled;
var c11 = 0;

// Mapnik is the default world-wide OpenStreetMap style.
var tileServer = "https://tilecache.kairo.at/mapnik/";
// Basemap offers hires tiles for Austria.
//var tileServer = "https://tilecache.kairo.at/basemaphires/";
// Standard Overpass API Server
var overpassURL = "https://overpass-api.de/api/interpreter";
//var overpassURL = "https://lz4.overpass-api.de/api/interpreter";

window.onload = function() {
  let params = (new URL(document.location)).searchParams;
  routeId = parseInt(params.get("routeId")); 
  startRevert = params.get("startRevert"); 
  startYard = params.get("startYard"); 
  doErase = params.get("doErase"); 
  showTrees = params.get("showTrees"); 
  showBuildings = params.get("showBuildings"); 
  showTunnels = params.get("showTunnels"); 
  debugEnabled = params.get("debug"); 
  //alert(routeId+"r"+startRevert+"t"+showTrees+"b"+showBuildings);
   
  centerPos = { latitude: 48.7643004,
                longitude: 9.1686351 };

  loadScene();

  // Keyboard press
  document.querySelector("body").addEventListener("keydown", event => {
    if (event.key == "c") { toggleCamera(event); }
    else if (event.key == "+") { set_accelerate(); }
    else if (event.key == "-") { set_brake(); }
    else if (event.key == "r") { if(doErase != "on") set_reverse(); }
    else if (event.key == "i") { incrementTrain(); }
    else if (event.key == "l") { toggleLoop(event);  }
  });

}

function cabcontrols(botton) {
  if (botton == "but1") set_accelerate();
  else if (botton == "but2") set_brake();
  //update_display();
}

AFRAME.registerComponent("event-listener", {
  init: function() {
    this.el.addEventListener("click", function(e) {
      //console.log(e.target)
      //e.target.setAttribute('scale', {x: 2, y: 2, z: 2});
      cabcontrols(e.target.id);
      });
    /*
    this.el.addEventListener("mouseenter", function(e) {
      e.target.setAttribute('scale', {x: 1.5, y: 1.5, z: 1.5});
      });
    this.el.addEventListener("mouseleave", function(e) {
      e.target.setAttribute('scale', {x: 1, y: 1, z: 1});
      });
    */
    }
});

function update_display() {
  var board = document.querySelector("#board");
  remoT = document.querySelector("#dispSpeed");
  board.removeChild(remoT);

  var item = document.createElement("a-text");
  item.setAttribute("id", "dispSpeed");
  item.setAttribute("value", locomotiveSpeed);
  item.setAttribute("align", "center");
  item.setAttribute("color", "#ffffff" );
  board.appendChild(item);
}

function toggleCamera(event) {
  var cHead = document.querySelector("#head");
  var cDriver = document.querySelector("#driver");
  var cOver = document.querySelector("#cover");
  if (cam == 0) {
    cHead.setAttribute('camera', { active: "true" });
    cDriver.setAttribute('camera', { active: "false" });
    cOver.setAttribute('camera', { active: "false" });
    cam=1;
  }
  else if (cam == 1){
    cHead.setAttribute('camera', { active: "false" });
    cDriver.setAttribute('camera', { active: "false" });
    cOver.setAttribute('camera', { active: "true" });
    cam=2;
  }
  else {
    cHead.setAttribute('camera', { active: "false" });
    cDriver.setAttribute('camera', { active: "true" });
    cOver.setAttribute('camera', { active: "false" });
    cam=0;
  }
}

function toggleLoop(event) {
  if (doLoop == 0) {
    alert("loop started");
    doLoop=1;
    loop();
  }
  else {
    alert("loop stopped");
    doLoop=0;
  }
}

function loadScene() {
  
  // Set variables for base objects.
  map = document.querySelector("#map");
  tiles = document.querySelector("#tiles");
  items = document.querySelector("#items");

  scount=0;baseTileID=0; baseTileSize=0;centerOffset=0;nt=0;
  while (tiles.firstChild) { tiles.removeChild(tiles.firstChild); }
  while (items.firstChild) { items.removeChild(items.firstChild); }
  
  loadStartCoord();
  document.querySelector("#cameraRig").object3D.position.set(0, 0, 0);

  setTimeout(function(){
    baseTileID = tileIDFromLatlon(centerPos);
    baseTileSize = tilesizeFromID(baseTileID);
    //loadGroundTiles();
    loadRoute();
  }, 5000);
    
  setTimeout(function(){
	  var cOver = document.querySelector("#cover");
  	console.log("xmin: "+xmin+" xmax: "+xmax+" zmin: "+zmin+" zmax: "+zmax);
    var cx = xmax-((xmax-xmin)/2);
    var cz = zmax-((zmax-zmin)/2);
    var cy = 10000;
    if (xmax-xmin>zmax-zmin) {cy=xmax-xmin;}
    else {cy=zmax-zmin;}
    if (cy>10000) {cy=10000;}
    console.log("cx: "+cx+" cy: "+cy+" cz: "+cz);
    cOver.setAttribute('position', { x: cx, y: cy, z: cz});
    cOver.components['look-controls'].pitchObject.rotation.x = -1.57;
    //var cHead = document.querySelector("#head");
    //cHead.setAttribute('position', { x: track[0].PositionX, y: 0 , z: track[0].PositionZ});

    initialize();
    
    segOld = track[bogie[0].Current].Id;
    console.log(segOld);
    var loadNxt = segOld.substring(3, 30);
    loadRailways(loadNxt);
    if (showTrees=="on") { loadTrees(loadNxt) };
    if (showBuildings=="on") { loadBuildings(loadNxt) };

    
 
  }, 15000);

  setTimeout(function(){
    loop();
  }, 20000);


}

function loop() {
  setTimeout(function(){
    incrementTrain();
    
    //load new items infront of train
    segCur = track[bogie[0].Current].Id; 
    if(segCur != segOld) {
      console.log("load O "+segOld+" C "+segCur);
      var loadNxt = segCur.substring(3, 30);
      
      //check if allready exists
      var add = 1;
      try {
        if (document.querySelector("#"+loadNxt).id == loadNxt)
        {
          add = 0;
        }
      }
      catch(err){
        add = 1;
      }
      if (add == 1) {
        loadRailways(loadNxt);
        if (showTrees=="on") { loadTrees(loadNxt) };
        if (showBuildings=="on") { loadBuildings(loadNxt) };
      }

      segOld = segCur;

    }

    if(loaderTX != loaderTXOld) { 
      loadGroundTiles(loaderTX, -loaderTZ);
      loaderTXOld = loaderTX;
    }
    if(loaderTZ != loaderTZOld) { 
      loadGroundTiles(loaderTX, -loaderTZ);
      loaderTZOld = loaderTZ;
    }

    //erase items behind train
    if (doErase=="on" && init>2){
      try {
        segDelCur = track[bogie[1].Current].Id; 
        if(segDelCur != segDelOld) {
          console.log("delete O "+segDelOld+" C "+segDelCur);
          //console.log(tiles);
          var unloadRrv = "";var remoR="";var remoB="";var remoT="";
          unloadRrv = segDelCur.substring(3, 30);
          remoR = document.querySelector("#railway"+unloadRrv);
          remoR.parentNode.removeChild(remoR);
          remoB = document.querySelector("#building"+unloadRrv);
          remoB.parentNode.removeChild(remoB);
          remoT = document.querySelector("#tree"+unloadRrv);
          remoT.parentNode.removeChild(remoT);

          segDelOld = segDelCur;
        }
      }
      catch(err){}

      if(eraserTX != eraserTXOld){ 
        deleteGroundTiles(eraserTX, -eraserTZ);
        eraserTXOld = eraserTX;
      }
      if(eraserTZ != eraserTZOld){ 
        deleteGroundTiles(eraserTX, -eraserTZ);
        eraserTZOld = eraserTZ;
      }
    }

    //move train to first stop
    if((init==1 ) && (Math.abs( cabX - track[0].PositionX )  < 1) && ( Math.abs( cabZ - track[0].PositionZ )  < 1)){
      set_stop();
      var remoM = document.querySelector("#menuplane");
      remoM.parentNode.removeChild(remoM);
      init++;
    }

    //end of line
    if(locomotiveDirection == 1 && ( Math.abs( cabX - track[numberTrackSections-1].PositionX )  <= 1) && ( Math.abs( cabZ - track[numberTrackSections-1].PositionZ ) <= 1 )){
      //set_reverse();
      set_stop();
      toggleLoop(event);
    }
    if(locomotiveDirection == -1 && ( Math.abs( eraserX - track[0].PositionX )  <= 2) && ( Math.abs( eraserZ - track[0].PositionZ )  <= 2)){
      //set_reverse();
      set_stop();
      toggleLoop(event);
    }

    if(doLoop ==1 ) loop();
  }, 100); 
}

function getTagsForXMLFeature(xmlFeature) {
  var tags = {};
  for (tag of xmlFeature.children) {
    if (tag.nodeName == "tag") {
      tags[tag.attributes['k'].value] = tag.attributes['v'].value;
    }
  }
  return tags;
}

function getBoundingBoxString() {
  var startPos = latlonFromTileID({x: baseTileID.x - tilesFromCenter,
                                   y: baseTileID.y + tilesFromCenter + 1});
  var endPos = latlonFromTileID({x: baseTileID.x + tilesFromCenter + 1,
                                 y: baseTileID.y - tilesFromCenter});
  return startPos.latitude + "," + startPos.longitude + "," +
         endPos.latitude + "," + endPos.longitude;
}

function fetchFromOverpass(opQuery) {
  return new Promise((resolve, reject) => {
    //fetch(overpassURL + "?data=" + encodeURIComponent(opQuery))
    fetch(overpassURL, {
      method: 'POST',
      body: opQuery
    })
    .then((response) => {
      if (response.ok) {
        return response.text();
      }
      else {
        throw "HTTP Error " + response.status;
      }
    })
    .then((response) => {
      var parser = new DOMParser();
      var itemData = parser.parseFromString(response, "application/xml");
      var itemJSON = osmtogeojson(itemData);
      resolve(itemJSON);
    })
    .catch((reason) => { reject(reason); });
  });
}

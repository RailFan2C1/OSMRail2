/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

//var metersPerLevel = 3;

var itema;

function loadRailways(loadNext) {
  // we could think about including shelter=yes and maybe some amenity= types.
  //var rId=document.getElementById('routeId').value;
  var opQuery = "way("+loadNext+")->.bahn;(" +
	  			"way[railway](around.bahn:50););" +
                "out body;>;out skel qt;";
  /*
  var opQuery = "(way[railway]" + "(" + getBoundingBoxString() + ");" +
  				"node[railway]" + "(" + getBoundingBoxString() + ");" +
                "rel[railway]" + "(" + getBoundingBoxString() + "););" +
                "out body;>;out skel qt;";
  */
  return fetchFromOverpass(opQuery)
    .then((itemJSON) => {
      itema = document.createElement("a-entity");
      itema.setAttribute("id", "railway"+loadNext);
      var count = 0;
      for (feature of itemJSON.features) {
        if (feature.geometry.type == "Polygon") {
          addRailwayPolygon(feature);
          count++;
        }
        else if (feature.geometry.type == "Point") {
          addRailwayPoint(feature);
          count++;
        }
        else if (feature.geometry.type == "LineString") {
		      addRailwayLine(feature);
		      count++;
        }
        else {
          console.log("Couldn't draw railway with geometry type " +
                      feature.geometry.type + " (" + feature.id + ")");
        }
      }
      console.log("Loaded " + count + " railways.");
      items.appendChild(itema);
    })
    .catch((reason) => { console.log(reason); });
}

function addRailwayPolygon(jsonFeature) {
  return new Promise((resolve, reject) => {
    var itemPos = tileposFromLatlon(latlonFromJSON(jsonFeature.geometry.coordinates[0][0]));
    //console.log("poly: "+itemPos.x);
    var tags = jsonFeature.properties.tags ? jsonFeature.properties.tags : jsonFeature.properties;
    var btype = tags.railway;
    
    var height = tags.height ? tags.height : null;
    if (!height) {
      height = 1;
    }

    var minHeight = tags.min_height ? tags.min_height : null;
    if (!minHeight) {
      minHeight = 0;//height - 0.3;
    }

    var color = "#808080";

    var item = document.createElement("a-entity");
    item.setAttribute("class", "railway");
    var outerPoints = [];
    var innerWays = [];
    for (let way of jsonFeature.geometry.coordinates) {
      let wayPoints = [];
      for (let point of way) {
        let tpos = tileposFromLatlon(latlonFromJSON(point));
        let ppos = getRelativePositionFromTilepos(tpos, itemPos);
        wayPoints.push("" + ppos.x + " " + ppos.z);
      }
      if (!outerPoints.length) {
        outerPoints = wayPoints;
      }
      else {
        innerWays.push(wayPoints);
      }
    }
    // Note that for now only one inner way (hole) is supported.
    //item.setAttribute("geometry", "primitive: railway; outerPoints: " + outerPoints.join(", ") + "; " +
    item.setAttribute("geometry", "primitive: building; outerPoints: " + outerPoints.join(", ") + "; " +
                                  (innerWays.length ? "innerPaths: " + innerWays.map(x => x.join(", ")).join(" / ") + "; " : "") +
                                  (height ? "height: " + height + "; " : "") +
                                  (minHeight ? "minHeight: " + minHeight + "; " : ""));
    item.setAttribute("material", "color: " + color + ";");
    item.setAttribute("position", getPositionStringFromTilepos(itemPos));
    item.setAttribute("data-gpspos", jsonFeature.geometry.coordinates[0][0][1] + "/" + jsonFeature.geometry.coordinates[0][0][0]);
    itema.appendChild(item);
    resolve();
    // reject("whatever the error");
  });
}

function addRailwayPoint(jsonFeature) {
  return new Promise((resolve, reject) => {
    var itemPos = tileposFromLatlon(latlonFromJSON(jsonFeature.geometry.coordinates));
    var tags = jsonFeature.properties.tags ? jsonFeature.properties.tags : jsonFeature.properties;
    var item = document.createElement("a-entity");
    item.setAttribute("class", "tree");
    item.setAttribute("data-reltilex", Math.floor(itemPos.x));
    item.setAttribute("data-reltiley", Math.floor(itemPos.y));
    var trunk = document.createElement("a-entity");
    trunk.setAttribute("class", "trunk");
    var crown = document.createElement("a-entity");
    crown.setAttribute("class", "crown");
    var height = tags.height ? tags.height : 5;
    var trunkRadius = (tags.circumference ? tags.circumference : 1) / 2 / Math.PI;
    var crownRadius = (tags.diameter_crown ? tags.diameter_crown : 1.1) / 2;
    // leaf_type is broadleaved, needleleaved, mixed or rarely something else.
    if (tags["leaf_type"] == "needleleaved") { // special shape for needle-leaved trees
      var trunkHeight = height * 0.5;
      var crownHeight = height * 0.8;
      trunk.setAttribute("geometry", "primitive: cylinder; height: " + trunkHeight + "; radius: " + trunkRadius + ";");
      trunk.setAttribute("material", "color: #b27f36;");
      trunk.setAttribute("position", "0 " + (trunkHeight / 2) + " 0");
      crown.setAttribute("geometry", "primitive: cone; height: " + crownHeight + "; radiusBottom: " + crownRadius + "; radiusTop: 0;");
      crown.setAttribute("material", "color: #80ff80;");
      crown.setAttribute("position", "0 " + (height - crownHeight / 2) + " 0");
    }
    else { // use a simple typical broadleaved-type shape
      var trunkHeight = height - crownRadius;
      trunk.setAttribute("geometry", "primitive: cylinder; height: " + trunkHeight + "; radius: " + trunkRadius + ";");
      trunk.setAttribute("material", "color: #b27f36;");
      trunk.setAttribute("position", "0 " + (trunkHeight / 2) + " 0");
      crown.setAttribute("geometry", "primitive: sphere; radius: " + crownRadius + ";");
      crown.setAttribute("material", "color: #ff8080;");
      crown.setAttribute("position", "0 " + trunkHeight + " 0");
    }
    item.setAttribute("position", getPositionStringFromTilepos(itemPos));
    item.setAttribute("data-gpspos", jsonFeature.geometry.coordinates[1] + "/" + jsonFeature.geometry.coordinates[0]);
    item.appendChild(trunk);
    item.appendChild(crown);
    itema.appendChild(item);
    resolve();
    // reject("whatever the error");
  });
}

function addRailwayLine(jsonFeature) {
  return new Promise((resolve, reject) => {
    var itemPos = tileposFromLatlon(latlonFromJSON(jsonFeature.geometry.coordinates[0]));
    //console.log("line: "+itemPos.x);
    var tags = jsonFeature.properties.tags ? jsonFeature.properties.tags : jsonFeature.properties;
    var btype = tags.railway;
    if (tags.shelter == "yes") { btype = "shelter"; }
    if (ignoredTypes.includes(btype)) { resolve(); return; }

    var id = jsonFeature.id ? jsonFeature.id : 'track1';
    //console.log("id "+id);

    var height = tags.height ? tags.height : null;
    if (!height) {
      height = 1;
    }

    var minHeight = tags.min_height ? tags.min_height : null;
    if (!minHeight) {
      minHeight = 0;
    }

    var level = tags.level ? tags.level : null;

    var color = "#A0A0A0";
    //trackshape = "[0.578 -1.375, 0.578 1.375, 0 2.242, 0 -2.242]";
    trackshape = "[0 -2.242, 0 2.242, 0.578 1.375, 0.578 -1.375]";
    if (tags["bridge"]) {
      trackshape = "[0 -2.242, 0 2.242, 2 2.242, 2 2.042, 0.578 2.042, 0.578 -2.042, 2 -2.042, 2 -2.242]";
	    color = "#606060";
    }
    if (tags["tunnel"]) {
      //trackshape = "[0 -2.242, 0 2.242, 6 2.242, 6 -2.242] innerPoints: [0.578 -2.042, 5.578 -2.042, 5.578 2.042, 0.578 2.042, 0.578 -2.042]";
      trackshape = "[-6 -2.242, -6 2.242, 0.1 2.242, 0.1 -2.242]"; 
      //trackshape = "[0 -2.242, 0 2.242, 2 2.242, 2 2.042, 0.578 2.042, 0.578 -2.042, 2 -2.042, 2 -2.242]";
      color = "#101010";
    }
    if (tags["railway"]=="platform") {
      trackshape = "[0 -0.5, 0 0.5, 1 0.5, 1 -0.5]";
	    color = "#808080";
    }

	  var item = document.createElement("a-entity");
    
    var curve2 = document.createElement("a-entity");
    curve2.setAttribute("id", id);
    curve2.setAttribute("geometry","primitive: railway; outerPoints: "+trackshape);
    var curve2path = new Array;

    for (let point of jsonFeature.geometry.coordinates) {
      let tpos = tileposFromLatlon(latlonFromJSON(point));
      let ppos = getRelativePositionFromTilepos(tpos, itemPos);
      
      curve2path.push(ppos.x+" 0.1 "+(ppos.z*-1));
      //curve2path.push(ppos.x+" "+level*-7+" "+(ppos.z*-1));
    }
    curve2.setAttribute("geometry","pathPoints:"+curve2path);
    curve2.setAttribute("material", "color: " + color + ";");
    item.appendChild(curve2);

	  item.setAttribute("position", getPositionStringFromTilepos(itemPos));
    item.setAttribute("data-gpspos", jsonFeature.geometry.coordinates[0][1] + "/" + jsonFeature.geometry.coordinates[0][0]);
    itema.appendChild(item);
    resolve();
    // reject("whatever the error");
  });
}

AFRAME.registerGeometry('railway', {
  schema: {
    outerPoints: { type: 'array', default: ['0 -2', '0 2', '1 1', '1 -1'], },
    innerPoints: { type: 'array', default: [], },
    pathPoints: { type: 'array', default: ['0 0 0', '0 0 10', '5 0 20', '5 0 30'], },
  },

  init: function (data) {
    var opoints = data.outerPoints.map(function (opoint) {
        var coords = opoint.split(' ').map(x => parseFloat(x));
        return new THREE.Vector2(coords[0], coords[1]);
    });
    var shape = new THREE.Shape(opoints);
    var outerLength = shape.getLength();
    
    var ipoints = data.innerPoints.map(function (ipoint) {
      var coords = ipoint.split(' ').map(x => parseFloat(x));
      return new THREE.Vector2(coords[0], coords[1]);
    });
    if (ipoints.length) {
      var holePath = new THREE.Path(ipoints);
      shape.holes.push(holePath);
    }

    var ppoints = data.pathPoints.map(function (ppoint) {
      var coords2 = ppoint.split(' ').map(x => parseFloat(x));
      return new THREE.Vector3(coords2[0], coords2[1], coords2[2]);
    });
    var path = new THREE.CatmullRomCurve3(ppoints);
    
    var extrudeSettings = {
      steps: (data.pathPoints.length-1) * 1 ,
      bevelEnabled: false,
      extrudePath: path
    };
    
    var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // As Y is the coordinate going up, let's rotate by 90° to point Z up.
    //geometry.rotateX(-Math.PI / 2);
    // Rotate around Y and Z as well to make it show up correctly.
    geometry.rotateY(Math.PI);
    geometry.rotateZ(Math.PI);
    // Now we would point under ground, move up the height, and any above-ground space as well.
    geometry.translate (0 ,0 ,0);
    geometry.center;
    this.geometry = geometry;
  }
});
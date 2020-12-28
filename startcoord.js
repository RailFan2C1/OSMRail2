/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


function loadStartCoord() {
  
  var rId=routeId;   //rId=34809;

  var opQuery = "(rel("+rId+"););" +
                "out body;>;out meta qt;";
 
  return fetchFromOverpass(opQuery)
    .then((itemJSON) => {
		var fpos;
		for (feature of itemJSON.features) {
			if (feature.geometry.type == "LineString") {
			  fPos = latlonFromJSON(feature.geometry.coordinates[0]);
			}
		  }
    	centerPos.latitude=parseFloat(fPos.latitude);
		centerPos.longitude=parseFloat(fPos.longitude);
		console.log("StartPos " + centerPos.latitude + " "+centerPos.longitude);
		//document.getElementById('info').innerHTML = "Startposition  " + centerPos.latitude + " "+centerPos.longitude+"<br>";
    })
    .catch((reason) => { console.log(reason); });
}




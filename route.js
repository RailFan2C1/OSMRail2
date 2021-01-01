/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var segmentArray = new Array;
var wayArray = new Array;
var stopArray = new Array;
//var trackRange = 0.000000000001; to strict!
var trackRange = 0.0000000001;

function loadRouteXML() {
	var rId = routeId;   //rId=34809;
	
	var opQueryXML = "(rel(" + rId + "););" +
		"out body;";
	wayArray = [];stopArray = [];

	fetchFromOverpassXML(opQueryXML)
	.then((itemData) => {
		var member = itemData.getElementsByTagName("member");
		for (i = 0; i < member.length; i++) { 
			console.log(member[i].getAttribute("type")+" "+member[i].getAttribute("ref")+" "+member[i].getAttribute("role"));
			if (member[i].getAttribute("type") == "way" && member[i].getAttribute("role") == "") {
				wayArray.push(member[i].getAttribute("ref"));
			}
			if (member[i].getAttribute("role") == "stop") {
				stopArray.push(member[i].getAttribute("ref"));
			}			
		}
		//console.log(wayArray);
		//console.log(stopArray);
	})
	.catch((reason) => { console.log(reason); });
		
}

function loadRoute() {
	/*
	var opQuery = "(rel[route=train][ref=S2][to=Filderstadt]" + "(" + getBoundingBoxString() + "););" +
				  "out body;>;out meta qt;";
	*/
	var rId = routeId;   //rId=34809;
	
	var opQuery = "(rel(" + rId + "););" +
		"out body;>;out qt;";
	segmentArray = [];

	return fetchFromOverpass(opQuery)
	.then((itemJSON) => {
		console.log("load,type,nr,ver,id,firstX,firstZ,lastX,lastZ,");
		for (feature of itemJSON.features) {
			//console.log(feature);
			if (feature.geometry.type == "LineString") {
				if (feature.id.substring(0, 3) == "way") {
					addRouteSegment(feature);
				}
			}
			else {
				console.log("load,"+feature.geometry.type+",,,"+feature.id+",not used,,,,");
			}
		}
		console.log("Loaded " + segCount + " relevant tracks.");
		//document.getElementById('info').innerHTML += "Loaded " + segCount + " relevant tracks.<br>";
		sortSegments2();
	})
	.catch((reason) => { console.log(reason); });
	
}

function addRouteSegment(jsonFeature) {
	return new Promise((resolve, reject) => {
		var itemPos = tileposFromLatlon(latlonFromJSON(jsonFeature.geometry.coordinates[0]));
		var tags = jsonFeature.properties.tags ? jsonFeature.properties.tags : jsonFeature.properties;
		var id = jsonFeature.id ? jsonFeature.id : 'seg1';
		var segId = "seg" + id.substring(4, 30);

		var public_transport = tags.public_transport ? tags.public_transport : null;
		if (public_transport == "platform") {
			console.log("load,LineString,,,"+feature.id+",platform: " + tags.name+",,,,");
		}
		else {
			var color = "#80ff80";
			var i = 0;
			var firstX = 0;
			var firstZ = 0;
			var lastX = 0;
			var lastZ = 0;
			var absX1 = 0, prevX = 0;
			var absZ1 = 0, prevZ = 0;
			var absX = 0;
			var absZ = 0;
			var lenCurr = 0; lenTotal = 0;
			var angCurr = 0;
			var segPointArray = new Array;

			//showRoutePoints
			//var showRoutePoints = document.createElement("a-entity");

			for (let point of jsonFeature.geometry.coordinates) {
				let tpos = tileposFromLatlon(latlonFromJSON(point));
				let rpos = getRelativePositionFromTilepos(tpos, itemPos);
				let apos = getPositionFromTilepos(tpos, itemPos)

				if (i == 0) {
					firstX = point[1];
					firstZ = point[0];
					centerOffset = tileposFromLatlon(centerPos);
					absX1 = (apos.x * 0.5) - (centerOffset.x * (baseTileSize * 0.5));
					absZ1 = (apos.z * 0.5) - (centerOffset.y * (baseTileSize * 0.5));
					prevX = absX1;
					prevZ = absZ1;
				}
				lastX = point[1];
				lastZ = point[0];
				
				absX = rpos.x + absX1;
				absZ = rpos.z + absZ1;

				deltaX=prevX - absX;
				deltaZ=prevZ - absZ;

				if (i == 0) { lenTotal = 0; }
				else {
					lenCurr = Math.sqrt(Math.pow((deltaX), 2) + Math.pow((deltaZ), 2));
					lenTotal = lenTotal + lenCurr;
					angCurr = Math.atan((deltaX)/(deltaZ));
				}

				var cpObj = { segId: segId, absX: absX, absZ: absZ, px: prevX, pz: prevZ, i: i, len: lenCurr, ang: angCurr, deltaX: deltaX, deltaZ:deltaZ };
				segPointArray.push(cpObj);

				//showRoutePoints
				//var SRP = document.createElement('a-entity');
				//SRP.setAttribute('geometry', {primitive: 'box', height: 0.5, width: 0.5, depth: 0.5,});
				//SRP.setAttribute('material', 'color', 'green');
				//SRP.setAttribute('position', {x: absX, y: 1, z: absZ});
	  			//showRoutePoints.appendChild(SRP);
				
				prevX = absX;
				prevZ = absZ;

				if (absX < xmin) { xmin = absX; }
				if (absX > xmax) { xmax = absX; }
				if (absZ < zmin) { zmin = absZ; }
				if (absZ > zmax) { zmax = absZ; }

				i++;
			}

			//showRoutePoints
			//items.appendChild(showRoutePoints);

			var segObj = { segId: segId, firstX: firstX, firstZ: firstZ, lastX: lastX, lastZ: lastZ, lenTotal: lenTotal, num: i, segPointArray: segPointArray, segX1:absX1, segZ1:absZ1 };
			//console.log(segObj);
			console.log("load,LineString,"+segCount+",1,"+segId+","+firstX+","+firstZ+","+lastX+","+lastZ+",");
			console.log("load,LineString,"+segCount+",2,"+segId+","+lastX+","+lastZ+","+firstX+","+firstZ+",");
			segmentArray.push(segObj);
			segCount++;
		}
		resolve();
		// reject("whatever the error");

	});
}

function sortSegments2(){
	var sortArray = new Array;
	sortArray = [];
	console.log("find,,nr,temp1,dir1,temp2,dir2,temp3,dir3,");
	sortCount = wayArray.length;
	for (i = 0; i < sortCount; i++) {
		var segname = "seg"+wayArray[i];
		//console.log(segname+" "+segmentArray[0].segId );
		for (j = 0; j < segCount; j++) {
			if ( segname == segmentArray[j].segId) {
				//console.log("find,,"+j+","+segmentArray[j].segId);	
				sortArray.push(segmentArray[j]);
			}
		}
	}
	console.log(sortArray);

	var sortDir = new Array;
	sortDir = [];

	if (sortArray[0].lastX == sortArray[1].firstX && sortArray[0].lastZ == sortArray[1].firstZ) { sortDir[0] = 1 }
	if (sortArray[0].lastX == sortArray[1].lastX && sortArray[0].lastZ == sortArray[1].lastZ) { sortDir[0] = 1 }
	if (sortArray[0].firstX == sortArray[1].firstX && sortArray[0].firstZ == sortArray[1].firstZ) { sortDir[0] = -1 }
	if (sortArray[0].firstX == sortArray[1].lastX && sortArray[0].firstZ == sortArray[1].lastZ) { sortDir[0] = -1 }
	segNext[0] = 1;
	segPrev[0] = -1;
	
	for (i = 1; i < sortCount; i++) {	
		j = i-1;
		//roundabouts
		if (sortArray[i].lastX == sortArray[i].firstX && sortArray[i].lastZ == sortArray[i].firstZ) {
			alert("roundabout "+sortArray[i].segId);
			j = i-2;
		}
		//get directions
		if (sortArray[j].lastX == sortArray[i].firstX && sortArray[j].lastZ == sortArray[i].firstZ)   { sortDir[i] = sortDir[j]     ;}//"LF" }
		if (sortArray[j].lastX == sortArray[i].lastX && sortArray[j].lastZ == sortArray[i].lastZ)     { sortDir[i] = sortDir[j] * -1;}//"LL" }
		if (sortArray[j].firstX == sortArray[i].firstX && sortArray[j].firstZ == sortArray[i].firstZ) { sortDir[i] = sortDir[j] * -1;}//"FF" }
		if (sortArray[j].firstX == sortArray[i].lastX && sortArray[j].firstZ == sortArray[i].lastZ)   { sortDir[i] = sortDir[j]     ;}//"FL" }
	
		segNext[i] = i+1;
		segPrev[i] = i-1;
	}
	segNext[sortCount-1] = -1;
	console.log(sortDir);
	console.log(segNext);
	console.log(segPrev);

	//create tracks
	
	//first segment
	var tx=0;
	var tz=0;
	if(segCount==1){
		tx=sortArray[0].segPointArray[0].absX;
		tz=sortArray[0].segPointArray[0].absZ;
	}
	else{
		if( sortDir[0] == 1)			
		{	
			console.log("Start Segment 0 Point 0 "+sortArray[0].segPointArray[0].absX+","+sortArray[0].segPointArray[0].absZ);
			tx=sortArray[0].segPointArray[0].absX;
			tz=sortArray[0].segPointArray[0].absZ;
		}	
		else {
			console.log("Start Segment 0 Point N "+sortArray[0].segPointArray[sortArray[0].num-1].absX+","+sortArray[0].segPointArray[sortArray[0].num-1].absZ);
			tx=sortArray[0].segPointArray[sortArray[0].num-1].absX;
			tz=sortArray[0].segPointArray[sortArray[0].num-1].absZ;	
		}
		/*
		if (startYard=="on")  {
			console.log("Start Segment 0 Point N "+sortArray[0].segPointArray[0].absX+","+sortArray[0].segPointArray[0].absZ);
			tx=sortArray[0].segPointArray[sortArray[0].num-1].absX;
			tz=sortArray[0].segPointArray[sortArray[0].num-1].absZ;	
		}
		*/
	}

	//showRoutePoints2
	var showRoutePoints2 = document.createElement("a-entity");
	c4=0;c6=0;i1=0;
	console.log("track,seg,lon1,lat1,lonN,latN,absX,absZ,num,");
	while(true) {	
		console.log("track,"+sortArray[c4].segId+","	
							+sortArray[c4].firstX+","+sortArray[c4].firstZ+","
							+sortArray[c4].lastX+","+sortArray[c4].lastZ+","
							+sortArray[c4].segX1+","+sortArray[c4].segZ1+","
							+sortArray[c4].num+",");

		if(sortDir[c4]==1){
			for(c7=0;c7<sortArray[c4].num;c7++) {
				//showRoutePoints2
				var SRP2 = document.createElement('a-entity');
				SRP2.setAttribute('geometry', {primitive: 'sphere', radius: 0.3,});
				if(c7==0){SRP2.setAttribute('material', 'color', 'red');}
				else{SRP2.setAttribute('material', 'color', 'blue');}
				SRP2.setAttribute('position', {	x: sortArray[c4].segPointArray[c7].absX, 
												y: 1, 
												z: sortArray[c4].segPointArray[c7].absZ});
				showRoutePoints2.appendChild(SRP2);	
				
				console.log("trackf,"+sortArray[c4].segId+","+c6+","+c4+","+c7+",,"
				+(sortArray[c4].segPointArray[c7].absX)+","
				+(sortArray[c4].segPointArray[c7].absZ)+",,"
				);
				var trObj = { 	Id: sortArray[c4].segId,
								Prev: c6-1, 
								Next: c6+1, 
								PositionX: sortArray[c4].segPointArray[c7].absX, 
								PositionZ: -sortArray[c4].segPointArray[c7].absZ,
							 };
				track.push(trObj);
				c6++;
			}
			tx=sortArray[c4].segPointArray[sortArray[c4].num-1].absX;
			tz=sortArray[c4].segPointArray[sortArray[c4].num-1].absZ;
		}
		else{
			for(c7=sortArray[c4].num-1;c7>=0;c7--) {
				//showRoutePoints2
				var SRP2 = document.createElement('a-entity');
				SRP2.setAttribute('geometry', {primitive: 'sphere', radius: 0.3,});
				if(c7==0){SRP2.setAttribute('material', 'color', 'red');}
				else{SRP2.setAttribute('material', 'color', 'blue');}
				SRP2.setAttribute('position', {	x: sortArray[c4].segPointArray[c7].absX, 
												y: 1, 
												z: sortArray[c4].segPointArray[c7].absZ});
				showRoutePoints2.appendChild(SRP2);	
				
				console.log("trackb,"+sortArray[c4].segId+","+c6+","+c4+","+c7+",,"
				+(sortArray[c4].segPointArray[c7].absX)+","
				+(sortArray[c4].segPointArray[c7].absZ)+",,"
				);
				var trObj = { 	Id: sortArray[c4].segId, 
								Prev: c6-1, 
								Next: c6+1, 
								PositionX: sortArray[c4].segPointArray[c7].absX, 
								PositionZ: -sortArray[c4].segPointArray[c7].absZ,
							};
				track.push(trObj);				
				c6++;
			}
			tx=sortArray[c4].segPointArray[0].absX;
			tz=sortArray[c4].segPointArray[0].absZ;	
		}
				
		if(segNext[c4]==-1 || i1==1000){break;}
		c4=segNext[c4];

		i1++;
	}
	track[c6-1].Next = -1;
	track[c6-1].Length = 0;
	track[c6-1].DeltaX = 0; //track[c6-1].PositionX * -1;
	track[c6-1].DeltaZ = 0; //track[c6-1].PositionZ * -1;

	if(debugEnabled == "on") items.appendChild(showRoutePoints2);
	for( c8=0; c8<c6-1; c8++)
	{
		track[c8].DeltaX = track[c8].PositionX - track[c8+1].PositionX;
		track[c8].DeltaZ = track[c8].PositionZ - track[c8+1].PositionZ;
		
		track[c8].Length = lenCurr = Math.sqrt(Math.pow((track[c8].DeltaX), 2) + Math.pow((track[c8].DeltaZ), 2));
	}

	//console.log(track[0]);
	//console.log("track");
	//console.log(track);
	numberTrackSections = c6;

	//create yard 
	var yardId=0, yardLength=0, yardPrev=0, yardNext=0, yardPositionX=0, yardPositionZ=0, yardDeltaX=0, yardDeltaZ=0;
	yardId = track[0].Id;
	yardLength = 1000;
	yardPrev = -1;
	yardNext = 0;
	yardDeltaX = track[0].DeltaX * (yardLength/track[0].Length);
	yardDeltaZ = track[0].DeltaZ * (yardLength/track[0].Length);;
	yardPositionX = track[0].PositionX + yardDeltaX;
	yardPositionZ = track[0].PositionZ + yardDeltaZ;
	console.log(yardPositionX+","+yardPositionZ+","+yardDeltaX+","+yardDeltaZ)

	var yardObj = { 	
		Id: yardId,
		Length: yardLength,
		Prev: yardPrev,
		Next: yardNext,
		PositionX: yardPositionX,
		PositionZ: yardPositionZ,
		DeltaX: yardDeltaX,
		DeltaZ: yardDeltaZ
	};
	track.push(yardObj);
	track[0].Prev = c6;
	//console.log(track);

	console.log("Segments sorted");
	//document.getElementById('info').innerHTML += "Segments sorted<br>";

}

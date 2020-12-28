/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var segmentArray = new Array;
//var trackRange = 0.000000000001; to strict!
var trackRange = 0.0000000001;

function loadRoute() {
	/*
	var opQuery = "(rel[route=train][ref=S2][to=Filderstadt]" + "(" + getBoundingBoxString() + "););" +
				  "out body;>;out meta qt;";
	*/
	var rId = routeId;   //rId=34809;
	
	var opQuery = "(rel(" + rId + "););" +
		"out body;>;out meta qt;";
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
		sortSegments();
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

function sortSegments(){
	var segTemp1next = new Array;
	var segTemp2next = new Array;
	var segTemp3next = new Array;
	var segTemp1dir = new Array;
	var segTemp2dir = new Array;
	var segTemp3dir = new Array;
	//console.log(segTemp1next+":"+segTemp2next);
	
	//find prev and next
	console.log("find,,nr,temp1,dir1,temp2,dir2,temp3,dir3,");
	for (i = 0; i < segCount; i++) {
		var c1 = 0, temp1=-1, temp2=-1, temp3=-1, dir1="nv", dir2 ="nv", dir3 ="nv";
		for (j = 0; j < segCount; j++) {
			if (i != j){
				if (segmentArray[i].lastX == segmentArray[j].firstX && segmentArray[i].lastZ == segmentArray[j].firstZ) {
					if(c1==0){temp1 = j;dir1 = "LF";}
					else if(c1==1){temp2 = j;dir2 = "LF";}
					else{temp3 = j;dir3 = "LF";alert("temp3");}
					c1++;
				}
				if (segmentArray[i].lastX == segmentArray[j].lastX && segmentArray[i].lastZ == segmentArray[j].lastZ) {
					if(c1==0){temp1 = j;dir1 = "LL";}
					else if(c1==1){temp2 = j;dir2 = "LL";}
					else{temp3 = j;dir3 = "LL";alert("temp3");}
					c1++;
				}
				if (segmentArray[i].firstX == segmentArray[j].firstX && segmentArray[i].firstZ == segmentArray[j].firstZ) {
					if(c1==0){temp1 = j;dir1 = "FF";}
					else if(c1==1){temp2 = j;dir2 = "FF";}
					else{temp3 = j;dir3 = "FF";alert("temp3");}
					c1++;
				}
				if (segmentArray[i].firstX == segmentArray[j].lastX && segmentArray[i].firstZ == segmentArray[j].lastZ) {
					if(c1==0){temp1 = j;dir1 = "FL";}
					else if(c1==1){temp2 = j;dir2 = "FL";}
					else{temp3 = j;dir3 = "FL";alert("temp3");}
					c1++;
				}
			

			}
		}
		segTemp1next[i]=temp1;
		segTemp2next[i]=temp2;
		segTemp3next[i]=temp3;
		segTemp1dir[i]=dir1;
		segTemp2dir[i]=dir2;
		segTemp3dir[i]=dir3;
		console.log("find,,"+i+","+segTemp1next[i]+","+segTemp1dir[i]+","+segTemp2next[i]+","+segTemp2dir[i]+","+segTemp3next[i]+","+segTemp3dir[i]+",");
	}
	
	//sort segments
	var c2=0;cOld=0;
	var segCur=0;
	var segOld=0;
	var segStart=0;

	console.log("sort,type,nr,curr,,prev,,next,dir,");
	
	//first element
	if (startRevert!="on"){
		segNext[0]=segTemp1next[0];
		segPrev[0]=segTemp2next[0];	
		segDir[0]=1;
	}
	else {
		segNext[0]=segTemp2next[0];
		segPrev[0]=segTemp1next[0];	
		segDir[0]=-1;		
	}

	console.log("sort,start,"+c2+","+segCur+",,"+segPrev[c2]+",,"+segNext[c2]+",1,");
	segOld=segCur;
	cOld=c2;

	//go backward till prev=-1
	while (segPrev[segCur]!="-1") { 
		segCur = segPrev[segCur];
		c2++;
		if(segOld==segTemp1next[segCur]){
			segNext[segCur]=segTemp1next[segCur];
			segPrev[segCur]=segTemp2next[segCur];
		}
		else if(segOld==segTemp2next[segCur]){
			segNext[segCur]=segTemp2next[segCur];
			segPrev[segCur]=segTemp1next[segCur];
		}
		else {alert("error in segmentB: "+segCur+" t1: "+segTemp1next[segCur]+" t2: "+segTemp2next[segCur]);}
		console.log("sort,backward,"+c2+","+segCur+",,"+segPrev[segCur]+",,"+segNext[segCur]+",-1,");
		segOld=segCur;
		cOld=c2;
		//emregency breake
		if(c2>=2000){segPrev[csegCur]=-1;alert("bad route");}
	}
	segStart=segCur;
	//go forward till next=-1
	var hc1=0;
	while (segNext[segCur]!="-1") {
		segCur = segNext[segCur];
		if(segStart>0 && hc1==0) {
			segCur=segNext[0];
			segOld=0;hc1++;
			if(segCur=="-1"){break;}
		}
		c2++;
		if(segOld==segTemp1next[segCur]){
			segNext[segCur]=segTemp2next[segCur];
			segPrev[segCur]=segTemp1next[segCur];
		}
		else if(segOld==segTemp2next[segCur]){
			segNext[segCur]=segTemp1next[segCur];
			segPrev[segCur]=segTemp2next[segCur];
		}
		else {alert("error in segmentF: "+segCur+" t1: "+segTemp1next[segCur]+" t2: "+segTemp2next[segCur]);}
		console.log("sort,forward,"+c2+","+segCur+",,"+segPrev[segCur]+",,"+segNext[segCur]+",1,");
		segOld=segCur;
		cOld=c2;
		//emregency breake
		if(c2>=1000){segNext[segCur]=-1;alert("bad route");}
	}
	
	if(c2!=segCount-1){alert("bad route"+" c"+c2+" s"+segCount);}
	console.log("segStart: "+segStart);
	var i1=0;
	var c4=segStart,c6=0;
	
	//create tracks
	
	//first segment
	var tx=0;
	var tz=0;
	if(segCount==1){
		tx=segmentArray[c4].segPointArray[0].absX;
		tz=segmentArray[c4].segPointArray[0].absZ;
	}
	else{
		if(
			((Math.abs(segmentArray[c4].segPointArray[segmentArray[c4].num-1].absX)
			-Math.abs(segmentArray[segNext[c4]].segPointArray[0].absX)
			<trackRange)
			&&
			( Math.abs(segmentArray[c4].segPointArray[segmentArray[c4].num-1].absZ)
			-Math.abs(segmentArray[segNext[c4]].segPointArray[0].absZ)
			<trackRange))
			||
			((Math.abs(segmentArray[c4].segPointArray[segmentArray[c4].num-1].absX)
			-Math.abs(segmentArray[segNext[c4]].segPointArray[segmentArray[segNext[c4]].num-1].absX)
			<trackRange)
			&&
			( Math.abs(segmentArray[c4].segPointArray[segmentArray[c4].num-1].absZ)
			-Math.abs(segmentArray[segNext[c4]].segPointArray[segmentArray[segNext[c4]].num-1].absZ)
			<trackRange))			
		){	
			console.log("Start Segment 0 Point 0 "+segmentArray[c4].segPointArray[segmentArray[c4].num-1].absX+","+segmentArray[c4].segPointArray[segmentArray[c4].num-1].absZ);
			tx=segmentArray[c4].segPointArray[0].absX;
			tz=segmentArray[c4].segPointArray[0].absZ;
		}	
		else {
			console.log("Start Segment 0 Point N "+segmentArray[c4].segPointArray[0].absX+","+segmentArray[c4].segPointArray[0].absZ);
			tx=segmentArray[c4].segPointArray[segmentArray[c4].num-1].absX;
			tz=segmentArray[c4].segPointArray[segmentArray[c4].num-1].absZ;	
		}
		if (startYard=="on")  {
			console.log("Start Segment 0 Point N "+segmentArray[c4].segPointArray[0].absX+","+segmentArray[c4].segPointArray[0].absZ);
			tx=segmentArray[c4].segPointArray[segmentArray[c4].num-1].absX;
			tz=segmentArray[c4].segPointArray[segmentArray[c4].num-1].absZ;	
		}
	}
	
	//showRoutePoints2
	var showRoutePoints2 = document.createElement("a-entity");

	console.log("track,seg,lon1,lat1,lonN,latN,absX,absZ,num,");
	while(true) {	
		console.log("track,"+segmentArray[c4].segId+","	
							+segmentArray[c4].firstX+","+segmentArray[c4].firstZ+","
							+segmentArray[c4].lastX+","+segmentArray[c4].lastZ+","
							+segmentArray[c4].segX1+","+segmentArray[c4].segZ1+","
							+segmentArray[c4].num+",");

		if(Math.abs(tx-segmentArray[c4].segPointArray[0].absX)<trackRange && Math.abs(tz-segmentArray[c4].segPointArray[0].absZ)<trackRange){
			for(c7=0;c7<segmentArray[c4].num;c7++) {
				//showRoutePoints2
				var SRP2 = document.createElement('a-entity');
				SRP2.setAttribute('geometry', {primitive: 'sphere', radius: 0.3,});
				if(c7==0){SRP2.setAttribute('material', 'color', 'red');}
				else{SRP2.setAttribute('material', 'color', 'blue');}
				SRP2.setAttribute('position', {	x: segmentArray[c4].segPointArray[c7].absX, 
												y: 1, 
												z: segmentArray[c4].segPointArray[c7].absZ});
				showRoutePoints2.appendChild(SRP2);	
				
				console.log("trackf,"+segmentArray[c4].segId+","+c6+","+c4+","+c7+",,"
				+(segmentArray[c4].segPointArray[c7].absX)+","
				+(segmentArray[c4].segPointArray[c7].absZ)+",,"
				);
				var trObj = { 	Id: segmentArray[c4].segId,
								Prev: c6-1, 
								Next: c6+1, 
								PositionX: segmentArray[c4].segPointArray[c7].absX, 
								PositionZ: -segmentArray[c4].segPointArray[c7].absZ,
							 };
				track.push(trObj);
				c6++;
			}
			tx=segmentArray[c4].segPointArray[segmentArray[c4].num-1].absX;
			tz=segmentArray[c4].segPointArray[segmentArray[c4].num-1].absZ;
		}
		else{
			for(c7=segmentArray[c4].num-1;c7>=0;c7--) {
				//showRoutePoints2
				var SRP2 = document.createElement('a-entity');
				SRP2.setAttribute('geometry', {primitive: 'sphere', radius: 0.3,});
				if(c7==0){SRP2.setAttribute('material', 'color', 'red');}
				else{SRP2.setAttribute('material', 'color', 'blue');}
				SRP2.setAttribute('position', {	x: segmentArray[c4].segPointArray[c7].absX, 
												y: 1, 
												z: segmentArray[c4].segPointArray[c7].absZ});
				showRoutePoints2.appendChild(SRP2);	
				
				console.log("trackb,"+segmentArray[c4].segId+","+c6+","+c4+","+c7+",,"
				+(segmentArray[c4].segPointArray[c7].absX)+","
				+(segmentArray[c4].segPointArray[c7].absZ)+",,"
				);
				var trObj = { 	Id: segmentArray[c4].segId, 
								Prev: c6-1, 
								Next: c6+1, 
								PositionX: segmentArray[c4].segPointArray[c7].absX, 
								PositionZ: -segmentArray[c4].segPointArray[c7].absZ,
							};
				track.push(trObj);				
				c6++;
			}
			tx=segmentArray[c4].segPointArray[0].absX;
			tz=segmentArray[c4].segPointArray[0].absZ;	
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
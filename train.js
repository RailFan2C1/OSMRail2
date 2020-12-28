/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var locomotiveSpeed = 1;
var locomotiveDirection = 1;
var scaleSpeedFactor = 1.0;
var deltaTime = 1;
//var numberTrackSections = 41; //c6
var numberTrainBogies = 6;
var numberTrainCars = 2;
var trainCarSelected = -1;

var bogie = new Array;
var bogieObj = { Current: 0, Last: -1, Speed: 1, Distance: -100.0 };
bogie.push(bogieObj);
var bogieObj = { Current: 0, Last: -1, Speed: 1, Distance: -950.0 };
bogie.push(bogieObj);
var bogieObj = { Current: 0, Last: -1, Speed: 1, Distance: -203.52 };
bogie.push(bogieObj);
var bogieObj = { Current: 0, Last: -1, Speed: 1, Distance: -215.52 };
bogie.push(bogieObj);
var bogieObj = { Current: 0, Last: -1, Speed: 1, Distance: -222.12 };
bogie.push(bogieObj);
var bogieObj = { Current: 0, Last: -1, Speed: 1, Distance: -234.12 };
bogie.push(bogieObj);

var car = new Array;
var carObj = { Speed: 1, FrntCoupler: 1, RearCoupler: -1, FrntBogie: 2, RearBogie: 3};
car.push(carObj);
var carObj = { Speed: 1, FrntCoupler: -1, RearCoupler: 0, FrntBogie: 4, RearBogie: 5};
car.push(carObj);

function initialize()
{
    var tb0 = document.querySelector("#train_bogie0");
    var tb1 = document.querySelector("#train_bogie1");
    if(debugEnabled == "on")
    {
        tb0.setAttribute('scale', {x: 2000, y: 2000, z: 2000});
        tb1.setAttribute('scale', {x: 2000, y: 2000, z: 2000});  
    }
    if(doErase != "on")
    {
        bogie[1].Distance = bogie[numberTrainBogies-1].Distance;  
        tb1.setAttribute('scale', {x: 1, y: 1, z: 1});  
    } 

    var cDriver = document.querySelector("#driver");
    cDriver.components['look-controls'].yawObject.rotation.y = -1.57;
    eraserX = calcBogieX(1); 
    eraserZ = calcBogieZ(1);
    eraserTX = (eraserX / baseTileSize) - ((eraserX / baseTileSize) % 1);
    eraserTZ = (eraserZ / baseTileSize) - ((eraserZ / baseTileSize) % 1);
    //eraserTZ = (eraserZ / tileSize) - ((eraserZ / tileSize) % 1);
    
    update_speed();
    outputNodeTransformations();
}

function incrementTrain()
{
    //increment Train's position along track
    var newText;
    var i;

    loaderX = calcBogieX(0); 
    loaderZ = calcBogieZ(0);
    loaderTX = (loaderX / baseTileSize) - ((loaderX / baseTileSize) % 1);
    loaderTZ = (loaderZ / baseTileSize) - ((loaderZ / baseTileSize) % 1);
    //loaderTZ = (loaderZ / tileSize) - ((loaderZ / tileSize) % 1);

    eraserX = calcBogieX(1); 
    eraserZ = calcBogieZ(1);
    eraserTX = (eraserX / baseTileSize) - ((eraserX / baseTileSize) % 1);
    eraserTZ = (eraserZ / baseTileSize) - ((eraserZ / baseTileSize) % 1);
    //eraserTZ = (eraserZ / tileSize) - ((eraserZ / tileSize) % 1);

    cabX = calcBogieX(2); 
    cabZ = calcBogieZ(2);

    rearX = calcBogieX(numberTrainBogies-1); 
    rearZ = calcBogieZ(numberTrainBogies-1); 

    for(i = 0; i < numberTrainBogies; i++)
    {
        bogie[i].Distance += bogie[i].Speed * scaleSpeedFactor * deltaTime; 
        while(1)
        {
            if(debugEnabled == "on")
            {
                newText =   "Id: "+track[bogie[0].Current].Id+" Cur: "+bogie[0].Current+" Last: "+bogie[0].Last+" Speed: "+bogie[0].Speed+"<br>"+
                            "Dist: "+bogie[0].Distance+" Len: "+track[bogie[0].Current].Length+"<br>"+
                            "X: "+loaderX+" LX: "+loaderTX+" EX: "+eraserTX+"<br>"+
                            "Z: "+loaderZ+" LZ: "+loaderTZ+" EZ: "+eraserTZ;
                //document.getElementById('dDebug').innerHTML = newText;
            } 
            
            // Move to next track
            if(bogie[i].Distance > track[bogie[i].Current].Length)
            {
                //console.log(">C "+bogie[i].Distance);  
                if(track[bogie[i].Current].Next != -1)
                {
                    bogie[i].Distance -= track[bogie[i].Current].Length;
                    bogie[i].Last = bogie[i].Current;
                    bogie[i].Current = track[bogie[i].Current].Next;
                    continue;
                }
                else break;
            }

            // Move to previous track
            if(bogie[i].Distance < 0.0)
            {
                //console.log("<0 "+bogie[i].Distance);  
                if(track[bogie[i].Current].Prev != -1)
                {
                    bogie[i].Last = bogie[i].Current;
                    bogie[i].Current = track[bogie[i].Current].Prev;
                    bogie[i].Distance += track[bogie[i].Current].Length;
                    continue;
                }
                else break;
            }

            if(bogie[i].Distance > 0)
            {
                //console.log(">0 "+bogie[i].Distance);  
                if(bogie[i].Distance <= track[bogie[i].Current].Length)
                {
                    break;
                }
            }
                
        }
    }
    outputNodeTransformations();
}

function calcBogieX(i)
{
    var x, len;
    len = track[bogie[i].Current].Length;
    if(len == 0) len = 0.0001;
    x = track[bogie[i].Current].PositionX -
    (track[bogie[i].Current].DeltaX * ( bogie[i].Distance/len));
    return x;
}

function calcBogieZ(i)
{
    var z, len;
    len = track[bogie[i].Current].Length;
    if(len == 0) len = 0.0001;
    z = track[bogie[i].Current].PositionZ -
    (track[bogie[i].Current].DeltaZ * ( bogie[i].Distance/len));
    return z;
}

function calcBogieAngle(i)
{
    var angle, run;
    run = track[bogie[i].Current].DeltaX;
    if(run == 0) run = 0.001;
    angle = Math.atan((track[bogie[i].Current].DeltaZ) / run);
    if(run < 0) angle += Math.PI;
    return angle;
}

function outputNodeTransformations()
{
    var i, rise, run, theta;
    for (i = 0; i < numberTrainBogies; i++) {
        var train_bogie = document.querySelector("#train_bogie"+i);
        train_bogie.setAttribute('position', {x: calcBogieX(i), y: 1, z: calcBogieZ(i) * -1});
        //train_bogie.setAttribute('rotation', {x: 0, y: calcBogieAngle(i), z: 0});
        train_bogie.object3D.rotation.y = calcBogieAngle(i);
    }
    for (i = 0; i < numberTrainCars; i++) {
        var train_car = document.querySelector("#train_car"+i);
        train_car.setAttribute('position', {  x: (calcBogieX(car[i].FrntBogie) + calcBogieX(car[i].RearBogie)) / 2,
                                            y: 1, 
                                            z: (calcBogieZ(car[i].FrntBogie) + calcBogieZ(car[i].RearBogie)) / -2});
        
        run = calcBogieX(car[i].FrntBogie) - calcBogieX(car[i].RearBogie);
        if(run == 0) run = 0.001;
        rise = (calcBogieZ(car[i].FrntBogie) - calcBogieZ(car[i].RearBogie));
        theta = Math.atan(rise / run);
        if(run < 0) theta += Math.PI;
        //train_car.setAttribute('rotation', {x: 0, y: theta, z: 0}); 
        train_car.object3D.rotation.y = theta;
    }
}

function externalSpeed(v)
{
    set_speed_by_train(0, v);
    update_speed();
    update_display();
}

function set_accelerate()
{
    locomotiveSpeed++;
    if(locomotiveSpeed<0) locomotiveSpeed = 0;
    set_speed_by_train(0, locomotiveSpeed * locomotiveDirection);
    update_speed();
    update_display();
}

function set_brake()
{
    locomotiveSpeed--;
    if(locomotiveSpeed<0) locomotiveSpeed = 0;
    set_speed_by_train(0, locomotiveSpeed * locomotiveDirection);
    update_speed();
    update_display();
}

function set_reverse()
{
    locomotiveDirection *= -1;
    set_speed_by_train(0, locomotiveSpeed * locomotiveDirection);
    update_speed();
    update_display();
}

function set_stop()
{
    locomotiveSpeed = 0;
    set_speed_by_train(0, 0);
    update_speed();
    update_display();
}

function update_speed()
{
    var i;
    for(i = 0; i< numberTrainBogies; i++)
    {
        bogie[i].Speed = car[0].Speed;
    }
}

function set_speed_by_train(i, speed)
{
    for( i = 0; i < numberTrainCars; i++)
    {
        car[i].Speed = speed;  
    }
    
}

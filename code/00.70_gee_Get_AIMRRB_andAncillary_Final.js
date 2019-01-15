/* 
get ancillary data for study regions 
jill deines
april 18 2018

goal: 
  - get mean precip, etc, for study regions based on aim-hpa ancillary data composites (Deines et al. In Review ~2019)
- get irrigated area from aim-rrb (Deines et al. 2017, GRL).

Also exports map and stats of frequently irrigated areas per region

update 6/16/18: adds export of map from 2008-2017 to match the plots in figure 1

note: note AIM-RRB irrigated area is not available for years prior to 1999

*/
  
// user vars -----------------------------------------
  
//boundary extent
var aoi = ee.FeatureCollection('users/jdeines/vector/RRB/Sheridan_BufferNull9_indvl');
var aoi1 = ee.FeatureCollection('users/jdeines/vector/RRB/Sheridan_BufferNull9');

//  years to summarize
var startYear = 1995; // early for ancillary variables; fills in blank AIM-RRB prior to 1999
var endYear = 2017;


// AIM-RRB Irrigation map Imagery details and KS place of use tracts polygons to mask by
var interannualFolder = 'users/jdeines/classifiedRRB/interannualCleaned/';
var imageName = 'test5_randFor_cleaned1x_2017_binary'
var tracts = ee.FeatureCollection('users/jdeines/vector/RRB/KS_SheridanIsh_placeofUse');

// climate var assets derived from GRIDMET
var ancillaryFolder = 'users/jdeines/ancillaryData/AIM_HPA/';
var ancSuffixBase = '_ancillary_v001_';

// export info: tabular
var outputCRS = 'EPSG:5070';
var exportFolder = 'aimrrb_plusAncillary_lema';
var fNameSuffix = '_aimrrbTractMaskedGiFixed_ancillaryData_byRegion_SheridanNull9Buff';

// output CRS for map
var outputCRS = 'EPSG:5070';
var outputScale = 30;
var mapFolder = 'lema_rasterExports'
var mapName = 'aimrrb_frequency_1999-2017_TractMaskedGiFixed_10kmbuff'
var mapName2008 = 'aimrrb_frequency_2008-2017_TractMaskedGiFixed_10kmbuff'

// End user specs --------------------------------------------------------------------
  
// make year list
var years = []
for (var i = startYear; i <= endYear; i++) {
  years.push(i)
}

// load interannually cleaned image with annual bands
var interannual = ee.Image(interannualFolder + imageName)
// add dummy bands for pre-1999 years (just want enviro vars)
.addBands(ee.Image(0).rename('b1998'))
.addBands(ee.Image(0).rename('b1997'))
.addBands(ee.Image(0).rename('b1996'))
.addBands(ee.Image(0).rename('b1995'));

// rrb!
  var statsByYear = years.map(function (year) {
    
    var theMap = interannual.select([('b'+year)]).clip(tracts);
    
    // class area totals per polygon
    var aim0 = ee.Image.pixelArea().addBands(theMap).reduceRegions({
      collection: aoi,
      reducer: ee.Reducer.sum().group(1),
      scale: 30
    });
    
    var aim = aim0.map(function(feature){
      var list = ee.List(ee.Feature(feature).get('groups'))
      var keys = list.map(function(o) { return ee.Number(ee.Dictionary(o).get('group')).format('%d') })
      var values = list.map(function(o) { return ee.Dictionary(o).get('sum') })
      
      return ee.Feature(feature.geometry(), ee.Dictionary.fromLists(keys, values))
      .copyProperties(feature)
    });
    
    // add some ancillary variables by region
    var ancillary = ee.Image(ancillaryFolder + year + ancSuffixBase + '4000')
    
    // get mean values per region
    var withAncillary = ancillary.reduceRegions({
      collection: aim,
      reducer: ee.Reducer.mean(),
      scale: 150,
      crs: outputCRS
    });
    
    // select desired columns (nooo .geo!!)
    var dataOut = withAncillary.select(['.*'],null,false)
    
    var descript = year+fNameSuffix;
    
    Export.table.toDrive({
      collection: dataOut,
      description: descript,
      folder: exportFolder,
      fileFormat: 'CSV'
    });
    
  });


// get regional frequency stats ---------------------------------------
  
// 1999-2017 sum: mask with KS tracts----------------
var interannualSum0 = interannual
.reduce(ee.Reducer.sum());
var interannualSum = interannualSum0.updateMask(interannualSum0.gt(5)).toInt();                     
var tractMasked1999 = interannualSum.clip(tracts);

// Export masked, clipped frequency map for paper figures
Export.image.toDrive({
  image: tractMasked1999,
  description: mapName,
  scale: outputScale,
  region: aoi1,
  crs: outputCRS,
  folder: mapFolder
});  

// 2008-2017 sum: mask with KS tracts-------------------
  
// subset maps
var years2008 = []
for (var i = 2008; i <= 2017; i++) {
  years2008.push(i)
}

var interannual2008 = ee.Image(years2008.map(function(year){
  return interannual.select('b'+year)
}));


var sum08 = interannual2008.reduce(ee.Reducer.sum());
var sum08_02 = sum08.updateMask(sum08.gt(1)).toInt();                     
var tractMasked2008 = sum08_02.clip(tracts);

// Export masked, clipped frequency map for paper figures
Export.image.toDrive({
  image: tractMasked2008,
  description: mapName2008,
  scale: outputScale,
  region: aoi1,
  crs: outputCRS,
  folder: mapFolder
});  


// get area irrigated by region
var ones = tractMasked2008.where(tractMasked2008.gte(1),1);
var freqIrrArea0 = ee.Image.pixelArea().addBands(ones).reduceRegions({
  collection: aoi,
  reducer: ee.Reducer.sum().group(1),
  scale: 30
});

var freqIrrArea = freqIrrArea0.map(function(feature){
  var list = ee.List(ee.Feature(feature).get('groups'))
  var keys = list.map(function(o) { return ee.Number(ee.Dictionary(o).get('group')).format('%d') })
  var values = list.map(function(o) { return ee.Dictionary(o).get('sum') })
  
  return ee.Feature(feature.geometry(), ee.Dictionary.fromLists(keys, values))
  .copyProperties(feature)
});
//print(freqIrrArea);

// visualize ------------------------------------------
  var matplotlike = ["#0000CC", "#0000FF", "#0055FF", "#00AAFF", "#00FFFF",
                     "#2BFFD5", "#55FFAA", "#80FF80", "#AAFF55", "#D4FF2B",
                     "#FFFF00", "#FFAA00", "#FF5500", "#FF0000"]


//Map.addLayer(prelemaFreq, {min: 1, max: 18,palette: matplotlike}, 'years irrigated stringent');
Map.centerObject(aoi, 10);
Map.addLayer(aoi, {color: 'black'}, 'aoi base');
Map.addLayer(tractMasked1999, {min: 1, max: 18,palette: matplotlike}, 'track masked 1999');
Map.addLayer(tractMasked2008, {min: 1, max: 10,palette: matplotlike}, 'track masked 2008');
Map.addLayer(tracts, {}, 'tracks', false);
Map.addLayer(interannualSum0, {min: 1, max: 18,palette: matplotlike}, 'years irrigated - all', false);
Map.addLayer(aoi, {}, 'aoi', false);



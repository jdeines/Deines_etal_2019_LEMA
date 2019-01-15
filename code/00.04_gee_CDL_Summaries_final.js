/* 
CDL summary and extract 
Jill Deines
3 November 2017

Goal: Get area of each crop type denoted by the Cropland Data Layers by polygon 
regions including Sheridan 6, the Null 9 Control Study Area, and GMD4 counties

- tabulates crop types by irrigated area based on AIM-RRB
- restricts AIM-RRB to KS's irrigation place of use tracts

Inputs:
- GMD4_Plus_byCounty polygons
- sheridan and null outlines

Output:
- a csv for each year requested with rows per polygon and 
columns: masterid, all CDL codes. Variable = area per polygon in square meters


*/

// user specifications -------------------------------------------------------

// 1. set years of interest
var startYear = 2006; // first year CDL is available in KS 
var endYear = 2017;

// 2. set polygons (null9 = control region)
var gmd4counties = ee.FeatureCollection('users/jdeines/vector/RRB/GMD4_plus_byCounty');
var sheridan = ee.FeatureCollection('users/jdeines/vector/RRB/Sheridan6_fromKGS')
.map(function(feature){
return feature.set('masterID','sheridan')
});
var null9 =  ee.FeatureCollection('users/jdeines/vector/RRB/Sheridan_Null9')
.map(function(feature){
return feature.set('masterID','null_geo9')
});

// combine into 1
var userPolys = gmd4counties.select(['masterID'])
.merge(sheridan.select(['masterID']))
.merge(null9.select(['masterID']));
var userPolyIdColumn = 'masterID';  // a column giving unique id's

// 3. Irrigation map imagery details and KS place of use tracts polygons to mask by
var interannualFolder = 'users/jdeines/classifiedRRB/interannualCleaned/';
var imageName = 'test5_randFor_cleaned1x_2017_binary' // Deines et al. 2017, GRL, + 2017 update
var tracts = ee.FeatureCollection('users/jdeines/vector/RRB/KS_SheridanIsh_placeofUse');

// 4. Set Export details
// tabular data
var gDriveFolder = 'cdl_tables_lema'
var fNameSuffix = '_CDL_GMD4Plus_Sheridan_Null9_area_irrigationStatus_tractsOnly_giFixed_m2'  // filename prefix is the year



// end user specs ------------------------------------------------------------
  
  // rename  to 'masterid' 
var polys = userPolys.map(function(feature){
  return feature.set('masterid',feature.get(userPolyIdColumn));
});        

// load interannually cleaned image with annual bands
var interannual = ee.Image(interannualFolder + imageName);

// get CDL per polygons! ----------------------------------------
  // make year list
var years = []
for (var i = startYear; i <= endYear; i++) {
  years.push(i)
}

// for each year, 
// get total area for cdl class by polygon and export
// clip cdl to polygon and export
years.map(function(year){
  //var year = 2015;
  
  // load CDL
  var cdlName = 'USDA/NASS/CDL/' + year;
  if (year == 2005 || year == 2007){
    var cdlName = cdlName + 'a'; 
  }
  var cdl = ee.Image(cdlName).select('cropland');
  
  // get the scale for that CDL
  var nominalScale = cdl.projection().nominalScale().getInfo();
  
  // extract irrigation map, mask by tracts, and fill in masked areas with 0
  var theMap = interannual.select([('b'+year)]).clip(tracts).unmask(0);
  
  // use irrigation map to create irrigated and non-irrigated cdls
  var cdlIrrigated = cdl.updateMask(theMap.eq(1));
  var cdlDryland = cdl.updateMask(theMap.neq(1));
  
  // // visualize to ensure working as expected
  // Map.addLayer(sheridan, {}, 'sheridan');
  // Map.addLayer(null9, {}, 'null9')
  // Map.addLayer(cdlIrrigated, {}, 'cdl irrigaiton mask');
  // Map.addLayer(cdlDryland.clip(sheridan), {}, 'cdl dry mask');
  
  
  // get cdl area by type per polygon  -----------------------------------------
    
    // irrigated +++++++++++++++++++++++++
    var cdlIrrigated_area = ee.Image.pixelArea().addBands(cdlIrrigated).reduceRegions({
      collection: polys,
      reducer: ee.Reducer.sum().group(1),
      scale: nominalScale
    });
  
  // convert output column list to columns with some voodoo, thanks to Gennadii
  var areaIrr_wide = cdlIrrigated_area.map(function(feature){
    var list = ee.List(ee.Feature(feature).get('groups'))
    var keys = list.map(function(o) { return ee.Number(ee.Dictionary(o).get('group')).format('%d') })
    var values = list.map(function(o) { return ee.Dictionary(o).get('sum') })
    
    var feature2 = ee.Feature(feature.geometry(), ee.Dictionary.fromLists(keys, values))
    .copyProperties(feature);
    
    return feature2.set('status','irrigated') 
  });
  
  // drop .geo
  var areaIrrOut = areaIrr_wide.select(['.*'], null, false);
  
  // not irrigated +++++++++++++++++++++++++
    var cdlDryland_area = ee.Image.pixelArea().addBands(cdlDryland).reduceRegions({
      collection: polys,
      reducer: ee.Reducer.sum().group(1),
      scale: nominalScale
    });
  
  // convert output column list to columns with some voodoo, thanks to Gennadii
  var areaDry_wide = cdlDryland_area.map(function(feature){
    var list = ee.List(ee.Feature(feature).get('groups'))
    var keys = list.map(function(o) { return ee.Number(ee.Dictionary(o).get('group')).format('%d') })
    var values = list.map(function(o) { return ee.Dictionary(o).get('sum') })
    
    var feature2 = ee.Feature(feature.geometry(), ee.Dictionary.fromLists(keys, values))
    .copyProperties(feature);
    
    return feature2.set('status','rainfed') 
  });
  
  // drop .geo
  var areaDryOut = areaDry_wide.select(['.*'], null, false);
  
  
  // dummy feature -------------------------------------------------------------
    // so that first feature has all cdl classes in it for table export
  var fields = ee.List(cdl.get('cropland_class_values'));
  
  // to string
  function toString(format) { 
    return function(o) { return ee.Number(o).format(format) }
  }
  var field_names = fields.map(toString('%d'))
  
  // add id
  field_names = field_names.add('masterid').add('status');
  
  // empty field values
  var field_values = ee.List.repeat(0, field_names.size());
  
  var properties = ee.Dictionary.fromLists(field_names, field_values);
  var field_fc = ee.FeatureCollection([ee.Feature(null, properties)]);
  
  // combine and export ------------------------------------
    var fcIrrOut = field_fc.merge(areaIrrOut);
  var fcDryOut = field_fc.merge(areaDryOut);
  
  // add year column attribute
  fcIrrOut = fcIrrOut.map(function(f){
    return f.set('Year',year);
  });
  
  fcDryOut = fcDryOut.map(function(f){
    return f.set('Year',year);
  });
  
  // export
  var filenameIrr = year + fNameSuffix + '_irrigated';
  var filenameDry = year + fNameSuffix + '_rainfed';
  
  Export.table.toDrive({
    collection: fcIrrOut,
    description: filenameIrr,
    folder: gDriveFolder,
    fileFormat: 'CSV'
  });
  
  Export.table.toDrive({
    collection: fcDryOut,
    description: filenameDry,
    folder: gDriveFolder,
    fileFormat: 'CSV'
  });
  
  
  
});

/*
LEMA: BAU Study Area - Final
J Deines
2 April 2018

Goal: Define a "not LEMA" study area that has similar features to the
LEMA zone

*/
  
// years of comparison
var startYear = 2008;
var endYear = 2017;
var maxComparison = 2012; // take 5 year mean pre-lema

// visualization year
var visyear = 2008;

// export info
var gDriveFolder = 'lema_tableExports';
var statsName = 'StudyAreaCriteria_Candidate9_2008-2017';

var gDriveFolderVector = 'lema_vectorExports';
var polyName = 'NullStudyArea_Candidate9';

// LOAD SUPPORTING DATASETS ------------------------------------------
// and extract for the larger GMD4 boundary

// lema boundary 
var lema = ee.FeatureCollection('users/jdeines/vector/RRB/Sheridan6_fromKGS');
var gmd4 = ee.FeatureCollection('users/jdeines/vector/RRB/GMD4_plus_byCounty');

// aimrrb irrigation frequency map (derived from Deines et al. 2017, GRL)
var total0 = ee.Image('users/jdeines/classifiedRRB/interannualCleaned/test5_randFor_freqMap')
.clip(gmd4);
var total = total0.updateMask(total0.gt(5)); 

// greenness composite - background image
var gcvi = ee.Image('users/jdeines/HPA/'+visyear+'_14_c1t1_008')
.select('GCVI_max_14')
.clip(gmd4);

// well density - from KGS WIMAS originally
var wellsVis = ee.FeatureCollection('users/jdeines/vector/irrigData/KS_WIMAS_1990-2016')
.filterMetadata('year','equals',visyear)
.filterMetadata('volume','not_equals',null);

// precip - personal asset derived from GRIDMET
var ancFolder = 'users/jdeines/ancillaryData/AIM_HPA/';
var ancSuffixBase = '_ancillary_v001_';
var prVis = ee.Image(ancFolder + visyear + ancSuffixBase + '4000').select('pr_calendar');

// load CDL (public GEE asset)
var cdlNameVis = 'USDA/NASS/CDL/' + visyear;
var cdlVis = ee.Image(cdlNameVis).select('cropland').clip(gmd4);

// visualize ------------------------------------------
var matplotlike = ["#0000CC", "#0000FF", "#0055FF", "#00AAFF", "#00FFFF",
                     "#2BFFD5", "#55FFAA", "#80FF80", "#AAFF55", "#D4FF2B",
                     "#FFFF00", "#FFAA00", "#FF5500", "#FF0000"]
var eviPal = [
  'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
  '74A901', '66A000', '529400', '3E8601', '207401', '056201',
  '004C00', '023B01', '012E01', '011D01', '011301'];

Map.centerObject(lema, 10);  
Map.addLayer(gcvi,{min:0, max: 15, palette:eviPal}, 'gcvi');
Map.addLayer(cdlVis, {}, 'cdl');
Map.addLayer(total, {min: 1, max: 18,palette: matplotlike}, 'years irrigated');
Map.addLayer(total0, {min: 1, max: 18,palette: matplotlike}, 'years irrigated - all');

Map.addLayer(prVis.clip(gmd4), {min:440, max:700, palette: ['white','blue']}, 'pr', false);
Map.addLayer(lema, {}, 'lema', false);
Map.addLayer(wellsVis, {}, 'wells');

// ensure a 1.5 km buffer around lema
var lemabuffer1 = lema.map(function(f) {return f.buffer(1500)});
Map.addLayer(lemabuffer1, {}, 'lema buffer 1.5 km');

// Define Control Region ----------------------------------------------------
  
// was manually drawn and boundaries refined until stats matched
var candidate9 = /* color: #e80ff1 */ee.Geometry.Polygon(
  [[[-100.92551714509045, 39.423278919293026],
    [-100.9257131367956, 39.408793268948365],
    [-100.9664599445448, 39.40897740191607],
    [-100.98047214978158, 39.40887489029974],
    [-100.98014830004382, 39.38720128817748],
    [-100.99879692918279, 39.38718354584313],
    [-100.99911685597067, 39.357957427086085],
    [-100.97074985396353, 39.35809015567502],
    [-100.97143649849465, 39.35809015567683],
    [-100.94318751319503, 39.35801549635376],
    [-100.94283346155885, 39.3726140637304],
    [-100.92596775423715, 39.372556006802085],
    [-100.92632180636463, 39.35083951270631],
    [-100.86086527228099, 39.35073995653052],
    [-100.86039856795503, 39.38700435113075],
    [-100.81446177978961, 39.38700020591055],
    [-100.81452750181018, 39.38340418469796],
    [-100.8145650540003, 39.37980401709101],
    [-100.81460796061737, 39.37244818896546],
    [-100.801021230007, 39.37257241017856],
    [-100.77724211491585, 39.37241165475213],
    [-100.75344156461989, 39.37218156255897],
    [-100.73989781674078, 39.372280239439355],
    [-100.73977191427434, 39.37976514130116],
    [-100.73947428412686, 39.39413301025365],
    [-100.73945547885222, 39.42323139675401],
    [-100.73951576297543, 39.437776440044395],
    [-100.73945468967781, 39.44502824578288],
    [-100.73941502116878, 39.45264455813174],
    [-100.72273161689503, 39.452394246655615],
    [-100.71445967441889, 39.452341424984404],
    [-100.68317454191924, 39.45208122607647],
    [-100.68310479706918, 39.466634425343145],
    [-100.68327110166689, 39.4737827775343],
    [-100.74868472146437, 39.474329370538186],
    [-100.7486418066594, 39.48155890034734],
    [-100.78621413511428, 39.48153405771872],
    [-100.7861927374488, 39.488961160079555],
    [-100.78617122033415, 39.496305472626666],
    [-100.79520495538611, 39.49645360014795],
    [-100.82538522581916, 39.495896933990714],
    [-100.86921229414395, 39.49592463405757],
    [-100.86908354762517, 39.5032429801708],
    [-100.93470101569932, 39.503143641547744],
    [-100.9346151851525, 39.49592463494708],
    [-100.95183494136654, 39.49589979761851],
    [-100.95203343338187, 39.48870036182198],
    [-100.95188858588466, 39.48144296868659],
    [-100.9349585080264, 39.481451249481196],
    [-100.93506579581265, 39.459586421527796],
    [-100.87878240213928, 39.45968582242716],
    [-100.87882531745697, 39.43062151369731],
    [-100.88815939092626, 39.43052207123257],
    [-100.88818084891642, 39.42339498094441],
    [-100.90790042161132, 39.423361829077194]]]);

var geometry = candidate9;


// count things --------------------------------------------------------------
// average over time period

// get year list and map over it
var years = []
for (var i = startYear; i <= endYear; i++) {
  years.push(i)
}

// list columns for below 
var keyList = ['year','pr_mm_lema','pr_mm_geo','wells_lema','wells_geo',
               'vol_m3_lema','vol_m3_geo','area_m2_lema','area_m2_geo',
               'vpa_m_lema','vpa_m_geo','crop_m2_geo','crop_m2_lema',
               'cdl_corn_lema','cdl_soy_lema','cdl_wheat_lema',
               'cdl_grass_lema','cdl_alf_lema','cdl_sorghum_lema',
               'cdl_corn_geo','cdl_soy_geo','cdl_wheat_geo',
               'cdl_grass_geo','cdl_alf_geo','cdl_sorghum_geo'];


// crunch yearly stats                 
var statsByYear = years.map(function(year){
  
  // precip!
    var pr = ee.Image(ancFolder + year + ancSuffixBase + '4000').select('pr_calendar');
    
    var lemappt = pr.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: lema,
      scale: 100
    }).get('pr_calendar');
    
    var geoppt = pr.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: 100
    }).get('pr_calendar');
    
    // number of wells in each region
    var wells = ee.FeatureCollection('users/jdeines/vector/irrigData/KS_WIMAS_1990-2016')
    .filterMetadata('year','equals',year)
    .filterMetadata('volume','greater_than',0);
    
    var wellCoded = wells.map(function (feature) {
      return feature.set("inLema",
                         ee.Algorithms.If(feature.containedIn(lema.geometry()), 1, 0))
      .set('inGeo',
           ee.Algorithms.If(feature.containedIn(geometry), 1, 0));
    });
    
    var wellsLema = wellCoded.filter(ee.Filter.gte('inLema',1));
    var wellsGeo = wellCoded.filter(ee.Filter.gte('inGeo',1));
    
    // volume of wells (and convert from acre feet to cubic meters)
    var lema_vol = ee.Number(wellsLema.reduceColumns(ee.Reducer.sum(),['volume']).get('sum'))
    .multiply(1233.48);
    var geo_vol = ee.Number(wellsGeo.reduceColumns(ee.Reducer.sum(),['volume']).get('sum'))
    .multiply(1233.48);
    
    // area
    var lemaArea = lema.geometry().area();
    var geoArea = geometry.area();
    
    // volume per area
    var vpa_lema = ee.Number(lema_vol).divide(lemaArea);
    var vpa_geo = ee.Number(geo_vol).divide(geometry.area());
    
    // CDL, crop type, crop area
    
    // load CDL and keep just major crops
    var cdlName = 'USDA/NASS/CDL/' + year;
    var cdl0 = ee.Image(cdlName).select('cropland');
    var cropList = [1,4,5,24,36,176]; // [1,4,5,24,36,176];  corn, sorghum, soy, wheat, alfalfa, grassland
    var cdl = cdl0.remap(cropList, cropList);
    // and make a binary "major crops" layer
    var crop = cdl.remap([1,4,5,24,36],[1,1,1,1,1])
    
    
    var cdl_lema0 = ee.Image.pixelArea().addBands(cdl).reduceRegions({
      collection: lema,
      reducer: ee.Reducer.sum().group(1),
      scale: 30
    });
    var cdl_lema = cdl_lema0.map(function(feature){
      var list = ee.List(ee.Feature(feature).get('groups'))
      var keys = list.map(function(o) { return ee.Number(ee.Dictionary(o).get('group')).format('%d') })
      var values = list.map(function(o) { return ee.Dictionary(o).get('sum') })
      
      return ee.Feature(feature.geometry(), ee.Dictionary.fromLists(keys, values))
      .copyProperties(feature)
    });
    
    var cdl_geo0 = ee.Image.pixelArea().addBands(cdl).reduceRegions({
      collection: geometry,
      reducer: ee.Reducer.sum().group(1),
      scale: 30
    });
    var cdl_geo = cdl_geo0.map(function(feature){
      var list = ee.List(ee.Feature(feature).get('groups'))
      var keys = list.map(function(o) { return ee.Number(ee.Dictionary(o).get('group')).format('%d') })
      var values = list.map(function(o) { return ee.Dictionary(o).get('sum') })
      
      return ee.Feature(feature.geometry(), ee.Dictionary.fromLists(keys, values))
      .copyProperties(feature)
    });
    
    // total crop 
    var crop_lema0 = ee.Image.pixelArea().addBands(crop).reduceRegions({
      collection: lema,
      reducer: ee.Reducer.sum().group(1),
      scale: 30
    });
    var crop_lema = crop_lema0.map(function(feature){
      var list = ee.List(ee.Feature(feature).get('groups'))
      var keys = list.map(function(o) { return ee.Number(ee.Dictionary(o).get('group')).format('%d') })
      var values = list.map(function(o) { return ee.Dictionary(o).get('sum') })
      
      return ee.Feature(feature.geometry(), ee.Dictionary.fromLists(keys, values))
      .copyProperties(feature)
    }).first().get('1');
    
    
    var crop_geo0 = ee.Image.pixelArea().addBands(crop).reduceRegions({
      collection: geometry,
      reducer: ee.Reducer.sum().group(1),
      scale: 30
    });
    var crop_geo = crop_geo0.map(function(feature){
      var list = ee.List(ee.Feature(feature).get('groups'))
      var keys = list.map(function(o) { return ee.Number(ee.Dictionary(o).get('group')).format('%d') })
      var values = list.map(function(o) { return ee.Dictionary(o).get('sum') })
      
      return ee.Feature(null,ee.Dictionary.fromLists(keys, values))
    }).first().get('1');
    
    
    // build a thing ----------------------------------------
      
    var valuesList = [year, lemappt,geoppt,wellsLema.size(),wellsGeo.size(),
                        lema_vol, geo_vol, lemaArea, geoArea,
                        vpa_lema, vpa_geo, crop_geo, crop_lema,
                        cdl_lema.first().get('1'), cdl_lema.first().get('5'),
                        cdl_lema.first().get('24'), cdl_lema.first().get('176'),
                        cdl_lema.first().get('36'), cdl_lema.first().get('4'),
                        cdl_geo.first().get('1'), cdl_geo.first().get('5'),
                        cdl_geo.first().get('24'), cdl_geo.first().get('176'),
                        cdl_geo.first().get('36'), cdl_geo.first().get('4')];
    
    var tabulation = ee.Dictionary.fromLists(keyList,valuesList);
    
    return ee.Feature(null, tabulation);
});

var statsAllYears = ee.FeatureCollection(statsByYear);

// get the mean over the 5 year period
var meanStats = statsAllYears
.filterMetadata('year','less_than',maxComparison+1)
.reduceColumns({
  reducer: ee.Reducer.mean().repeat(25),
  selectors: keyList
});

// back to a dictionary for interpretation
var meanDictionary = ee.Dictionary.fromLists(keyList,meanStats.get('mean'));
print(meanDictionary);

// calculate shoreline density (perimeter length/area)
var SD_geo = geometry.perimeter().divide(geometry.area());
var SD_lema = lema.geometry().perimeter().divide(lema.geometry().area());
print(SD_geo, 'sd geo');
print(SD_lema, 'sd lema');

// print(geometry.perimeter(), 'geo perimeter')
// print(lema.geometry().perimeter(), 'lema perimeter')


// defaults

// circle: r = 9000m based on lema area, giving 56500 m perimeter
print(0.000221, 'sd of circle with lema area');

// rectangle with 1 km side
print(0.002, 'sd of long thin line with lema area');
// long thin line

// export stats by year --------------------------
  
  
  Export.table.toDrive({
    collection: statsAllYears,
    description: statsName,
    folder: gDriveFolder,
    fileFormat: 'CSV'
  });

// export null area geometry 

var geoOut = ee.FeatureCollection(ee.Feature(geometry))
.set('masterid','nullCandidate9');

Export.table.toDrive({
  collection: geoOut,
  description: polyName,
  folder: gDriveFolderVector,
  fileFormat: 'GeoJSON'
});



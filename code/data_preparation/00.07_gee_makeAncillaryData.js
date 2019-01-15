/* 
Ancillary Data Creator
19 March 2018
Jill Deines

Goal: create annual images containing ancillary data bands. 

Details:
  
  - removes parts related to Landsat data from AIM-HPA work to retain only parts applicable to 
    Deines et al. 2019, ERL

Note the band names assigned here are important to be consistent with downstream 
processing in subsequent codes.

update 08-24-2018: 

*/
  
// -------------------------------------------------------------------------------
// user parameters 
// -------------------------------------------------------------------------------
  
// 1. set extent
// select extent for processing: default = AIM-HPA study area + max buffers
var aoi = ee.FeatureCollection('users/jdeines/vector/HPA/aim_master_merged');
var setExtent = aoi;

// 2. set time specs
var startYear = 1984;
var endYear = 2017;

// "annual" time frame (but note that calendar year precip is also processed below)
var startDateAnnual = '-12-01';
var endDateAnnual = '-10-15'; 
var startDateInPreviousYear = 1;  // binary, 1 = yes, 0 = no

// "early" time frame
var startDateEarly = '-12-01';
var endDateEarly = '-04-30'; 
var startDateInPreviousYear = 1;  // binary, 1 = yes, 0 = no

// "main season" time frame
var startDateMain = '-05-01';
var endDateMain = '-10-15'; 

// scale to use to write out GRIDMET based rasters
var gridmetScaleAsset = 4000; // 4000 is native resolution

// 3. set output folders, crs for Drive export, etc


// adjust path for user's desired Assets location
var assetFolder = 'users/jdeines/ancillaryData/AIM_HPA/' // desired output folder
var assetSuffix = '_ancillary_v001' // base; scale appended to the end

// ------------------------------------------------------------------------
// End user specifications
// ------------------------------------------------------------------------

// make a vector for years desired
var years = []
for (var i = startYear; i <= endYear; i++) {
years.push(i)
}


// map ancillary data processing over years specified --------------
years.map(function(year) {

  // set time bounds ------------------------------------------
  
  // "annual" time dates
  var annualStart = ee.Algorithms.If({
    condition: startDateInPreviousYear,
    trueCase: ee.Date(ee.Number(year-1).format().cat(startDateAnnual)),
    falseCase: ee.Date(ee.Number(year).format().cat(startDateAnnual))
  });
  var annualEnd = ee.Date(ee.Number(year).format().cat(endDateAnnual));
  
  // "early" time dates
  var earlyStart = ee.Algorithms.If({
    condition: startDateInPreviousYear,
    trueCase: ee.Date(ee.Number(year-1).format().cat(startDateEarly)),
    falseCase: ee.Date(ee.Number(year).format().cat(startDateEarly))
  });
  var earlyEnd = ee.Date(ee.Number(year).format().cat(endDateEarly));
  
  // "main" season time dates
  var mainStart = ee.Date(ee.Number(year).format().cat(startDateMain));
  var mainEnd = ee.Date(ee.Number(year).format().cat(endDateMain));
  
  
  // get precipitation -----------------------------------------
  
  //// "Annual" Precip
  
  // load precip data (mm, daily total)
  var precipAnnualc = ee.ImageCollection('IDAHO_EPSCOR/GRIDMET')
    .select('pr')
    .filterDate(annualStart, annualEnd);
  
  // sum daily precip to get seasonal total
  var precipAnnual = precipAnnualc.sum().clip(setExtent).toFloat().rename('pr_ann');
  
  
  //// "Main growing season" precip:
  var precipMainc = ee.ImageCollection('IDAHO_EPSCOR/GRIDMET')
    .select('pr')
    .filterDate(mainStart, mainEnd);
  var precipMain = precipMainc.sum().clip(setExtent).toFloat().rename('pr_grow');
  
  //// "early season"
  var precipEarlyc = ee.ImageCollection('IDAHO_EPSCOR/GRIDMET')
    .select('pr')
    .filterDate(earlyStart, earlyEnd);
  var precipEarly = precipEarlyc.sum().clip(setExtent).toFloat().rename('pr_early');
  
  //// calendar year
  var precipCalendarc = ee.ImageCollection('IDAHO_EPSCOR/GRIDMET')
    .select('pr')
    .filterDate(year + "-01-01", year + "-12-31");
  var precipCalendar = precipCalendarc.sum().clip(setExtent).toFloat().rename('pr_calendar');
  
  // get PDSI -----------------------------------------
  
  //// mean "Annual" PDSI: 
  var pdsiAnnualc = ee.ImageCollection('IDAHO_EPSCOR/PDSI')
    .filterDate(annualStart, annualEnd);
  var pdsiAnnual = pdsiAnnualc.reduce(ee.Reducer.mean()).clip(setExtent).toFloat().rename('pdsi_ann');
  
  //// "Growing seeason" PDSI
  var pdsiMainc = ee.ImageCollection('IDAHO_EPSCOR/PDSI')
    .filterDate(mainStart, mainEnd);
  var pdsiMain = pdsiMainc.reduce(ee.Reducer.mean()).clip(setExtent).toFloat().rename('pdsi_grow');
  
  
  // seasonal aridity (precip/pet)------------------------------------------------
  // the gridmet dataset has changed since aim-rrb. Use eto (daily ref ET for grass)
  // instead of the former 'pet' band, which no longer exists
  
  
  // load precip and pet data (mm, daily total)
  var aridity0 = ee.ImageCollection('IDAHO_EPSCOR/GRIDMET')
    .select('pr','eto')
    .filterDate(mainStart, mainEnd);
  
  // sum to get seasonal total of each
  var ariditySum = aridity0.sum().clip(setExtent).toFloat();
  // divide precip by pet
  var aridity = ariditySum.select('pr').divide(ariditySum.select('eto')).rename('aridity');
  
  
  
  // combine and export --------------------------------------------------
  
  // 4000 resolution layers
  var layersOut4000 = ee.Image.cat(precipEarly, precipMain, precipAnnual, precipCalendar,
  pdsiAnnual, pdsiMain, aridity)
  // export 
  var assetID4000 = assetFolder+ year + assetSuffix + '_4000';
  var descript4000 = year + assetSuffix + '_4000'
  
  Export.image.toAsset({
    image: layersOut4000,
    description: descript4000,
    assetId: assetID4000,
    scale: 4000,
    region: setExtent,
    pyramidingPolicy: {'.default':'mean'},
    maxPixels: 2000000000000
  });
  
  
  

});



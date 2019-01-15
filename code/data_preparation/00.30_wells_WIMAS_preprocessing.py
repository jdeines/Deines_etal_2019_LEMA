# -*- coding: utf-8 -*-
"""
Format Downloaded WIMAS Data

script by anthony kendall

Raw WIMAS data downloaded from http://hercules.kgs.ku.edu/geohydro/wimas/query_setup.cfm
on 16 October 2018. Download included the full statewide database, annually.

Note: Script unlikely to run on other systems, but provides processing steps taken. Requires ArcGIS.
"""

import pandas, os, numpy, re, arcpy
#import seaborn
#import matplotlib.pyplot as plot
#------------------------------------------------------------------------------
#Specify input and output files
#------------------------------------------------------------------------------
#Input Information
inDir = 'S:\\Data\\Other_Data\\Kansas_WIMAS'
inStringData = '.txt'
inStringYearly = 'av3x'
inFeatureClip = 'S:/Data/GIS_Data/Derived/High_Plains_Aquifer/boundaries/Aquifer_Regions_dissolve.shp'

#Output Information
outDir = 'S:\\Users\\kendal30\\Project_Files\\2018\\Kansas_WIMAS'
#graphicsDir = 'S:\\Users\\kendal30\\Documents\\Graphics\\2017\\1_25_17_Kayla_Paper_Extra_Graphics'
outDBName = 'Kansas_WIMAS_2017.gdb'
outHDFStore = 'Kansas_WIMAS_2076.h5'
tempTable = 'temp_table'
tempLayer = 'temp_layer'
outClipRights = 'HPA_water_rights'
outPdiv = 'HPA_groundwater_points_of_diversion'
outSystem = 'HPA_irrigation_systems'
outSource = 'HPA_irrigation_water_source'
outAcres = 'HPA_irrigated_acres'
outCrops = 'HPA_irrigated_crops'
outVolume = 'HPA_irrigated_volume'
outDepth = 'HPA_irrigated_depth'

#Specify the irrigation source to number conversion
sourceNumDict = {'S':1,'G':2,'N':0}

#%% Prepare the environment
#------------------------------------------------------------------------------
#Prepare the environment, list files
#------------------------------------------------------------------------------
#Set up arcpy environment settings
arcpy.env.overwriteOutput = 1
arcpy.env.outputCoordinateSystem = inFeatureClip

#Create the output DB if it's not already there, set the workspace
outDB = os.path.join(outDir,outDBName)
if not os.path.exists(outDB):
    result = arcpy.CreateFileGDB_management(outDir,outDBName)
arcpy.env.workspace = outDB

#Set working directory for python
os.chdir(inDir) #python

#Get the file lists
allFiles = os.listdir(inDir)
dataFiles = [file for file in allFiles if inStringData in file]

#%% Helper functions

def product_generation(dfInput,colProduct,aggFunc):
    '''This function simplifies creating multiple output products'''

    #Create the output table by pivoting
    dfProduct = dfInput.copy()
    dropList = [col for col in dfInput.columns if col not in ['PDIV_ID','WUA_YEAR',colProduct]]
    dfProduct = dfProduct.drop(dropList,axis=1)
    dfProduct = dfProduct.groupby(['PDIV_ID','WUA_YEAR']).agg(aggFunc).reset_index().set_index('PDIV_ID')
    dfProduct = dfProduct.pivot(columns='WUA_YEAR',values=colProduct)

    return dfProduct

def product_write(dfProduct,outDB,featurePdiv,featureOut):
    '''This writes the output to the geodatabase'''

    tempTable = 'temp_table'
    #Write that table to the output geodatabase, in the current workspace
    recProduct = dfProduct.reset_index().to_records()
    arrayProduct= numpy.array(recProduct,dtype=recProduct.dtype)
    result = arcpy.da.NumPyArrayToTable(arrayProduct,os.path.join(outDB,tempTable))

    #Then, join that table to the points of diversion data
    result = arcpy.Copy_management(featurePdiv,featureOut)
    result = arcpy.JoinField_management(featureOut,'PDIV_ID',tempTable,'PDIV_ID')
    result = arcpy.Delete_management(tempTable)

    return result
#%% Calculations on Water Rights Table
#------------------------------------------------------------------------------
#Prepare a map of water rights, intersect with study region
#------------------------------------------------------------------------------
#Get the water rights file
rightsFile = [file for file in dataFiles if inStringYearly not in file]

#Open the water rights file
dfRightsFile = pandas.read_csv(rightsFile[0]).reset_index()

#Trim the table a bit, and clean up
keepCols = ['wr_id','longitude','latitude','source_of_supply','priority_date']

#First, strip the leading whitespace
dfRightsSubset = dfRightsFile[keepCols].set_index('wr_id')
for col in dfRightsSubset.columns:
    dfRightsSubset[col] = numpy.char.strip(numpy.array(dfRightsSubset[col],dtype=numpy.str))

#Then, remove blanks
testBlank = dfRightsSubset['longitude']==''
for col in dfRightsSubset.columns[1:]:
    testBlank = numpy.logical_or(testBlank,dfRightsSubset[col]=='')
dfRightsSubset = dfRightsSubset[~testBlank]

#Now, convert types to float
for col in dfRightsSubset.columns[0:2]:
    dfRightsSubset[col] = numpy.array(dfRightsSubset[col]).astype(dtype=numpy.float)

#Write out a few key details to a new temporary table
arrayRights = numpy.array(dfRightsSubset.to_records(),dtype=[('wr_id',numpy.int),('longitude',numpy.float),\
    ('latitude',numpy.float),('source_of_supply','<U1'),('priority_date','<U11')])
result = arcpy.da.NumPyArrayToTable(arrayRights,os.path.join(outDB,tempTable))

#Create a new feature layer from this
spatialRef = arcpy.SpatialReference("WGS 1984")
result = arcpy.MakeXYEventLayer_management(tempTable,'longitude','latitude',tempLayer,spatialRef)

#Intersect with region of interest
result = arcpy.Clip_analysis(tempLayer,inFeatureClip,outClipRights)

#Clean up
result = arcpy.Delete_management(tempLayer)
result = arcpy.Delete_management(tempTable)

#Bring intersected water rights features back in as a dataframe
arrayRightsClip = arcpy.da.TableToNumPyArray(outClipRights,['wr_id'])
dfRightsClip = pandas.DataFrame(arrayRightsClip)

#Get the unique rights
dfRightsUnique = pandas.DataFrame()
dfRightsUnique['wr_id'] = numpy.unique(dfRightsClip['wr_id'])

#%% Calculations on yearly files
#------------------------------------------------------------------------------
#Get the files and open them, appending to a single dataframe, then filter
#------------------------------------------------------------------------------
#Get the yearly files list
yearlyFiles = [file for file in dataFiles if inStringYearly in file]

#Change directories and read in files, some names have commas in a single field, so I
#chose to skip them, this generally omits four records or so per year
firstFile = True
for file in yearlyFiles:
    dfThisFile = pandas.read_csv(file,error_bad_lines=False, encoding = "ISO-8859-1")

    if firstFile:
        dfAllFiles = dfThisFile.copy()
        firstFile = False
    else:
        dfAllFiles = dfAllFiles.append(dfThisFile)

#Subselect columns of interest
keepColsYearly = ['WR_ID','PDIV_ID','FPDIV_KEY','SOURCE','LONGITUDE','LATITUDE','UMW_CODE','WUA_YEAR','SYSTEM','CROP_CODE',\
    'DPTH_WATER','DPTH_WELL','TACRES_IRR','NACRES_IRR','AF_USED','ACRES_IRR','HOURS_PUMP','PUMP_RATE']
convertColTypes = {'LONGITUDE':numpy.float,'LATITUDE':numpy.float,'WUA_YEAR':numpy.int,'SYSTEM':numpy.int,'CROP_CODE':numpy.int,'DPTH_WATER':numpy.float,'DPTH_WELL':numpy.float,\
    'TACRES_IRR':numpy.float,'NACRES_IRR':numpy.float,'AF_USED':numpy.float,'ACRES_IRR':numpy.float,'HOURS_PUMP':numpy.float,'PUMP_RATE':numpy.float}
dfYearlySubset = dfAllFiles[keepColsYearly]

#Select only those records within the study region
dfYearlyClip = dfRightsUnique.merge(dfYearlySubset,how='left',left_on='wr_id',right_on='WR_ID')

#Drop the lowercase ID
dfYearlyClip = dfYearlyClip.drop(['wr_id'],axis=1)

#Clean up the fields
for col in dfYearlyClip.columns:
    if dfYearlyClip.dtypes[col]=='O': #only for character types, stored as Object
        dfYearlyClip[col] = numpy.char.strip(numpy.array(dfYearlyClip[col],dtype=numpy.str))

#Replace blanks with NaN in numerical fields, some already numeric
for col in convertColTypes:
    if dfYearlyClip.dtypes[col]=='O': #only for character types, stored as Object
        if convertColTypes[col]==numpy.int:
            dfYearlyClip.loc[dfYearlyClip[col]=='',col] = '-99'
        else:
            dfYearlyClip.loc[dfYearlyClip[col]=='',col] = 'NaN'

#Need special handling for crop code, because it might be messy, just extract the numerical piece
r = re.compile('\-?[0-9]+')
vsearch = numpy.vectorize(lambda x:r.search(x).group(0) if r.search(x) else '-99')
dfYearlyClip['CROP_CODE'] = vsearch(dfYearlyClip['CROP_CODE'])

#Convert numerical types
for col in convertColTypes:
    dfYearlyClip[col] = numpy.array(dfYearlyClip[col]).astype(dtype=convertColTypes[col])

#Filter for IRR usage only
dfYearlyClip = dfYearlyClip.loc[dfYearlyClip['UMW_CODE']=='IRR']

#Replace NaN water use with 0
dfYearlyClip.loc[numpy.isnan(dfYearlyClip['AF_USED']),'AF_USED'] = 0
dfYearlyClip.loc[numpy.isnan(dfYearlyClip['ACRES_IRR']),'ACRES_IRR'] = 0

#In the interset of memory, clear a couple of variables
del dfAllFiles, dfRightsFile, dfThisFile, dfYearlySubset, dfRightsSubset

#Get a list of unique points of diversion
dropList = [col for col in dfYearlyClip.columns if col not in ['PDIV_ID','SOURCE','LONGITUDE','LATITUDE']]
dfPdiv = dfYearlyClip.copy()
dfPdiv = dfYearlyClip.drop(dropList,axis=1)
dfPdiv = dfPdiv.groupby('PDIV_ID').first()

#Write out a few key details to a new temporary table
arrayPdiv= numpy.array(dfPdiv.to_records(),dtype=[('PDIV_ID',numpy.int),('SOURCE',numpy.str),('LONGITUDE',numpy.float),\
    ('LATITUDE',numpy.float)])
result = arcpy.da.NumPyArrayToTable(arrayPdiv,os.path.join(outDB,tempTable))

#Create a new feature layer from this
spatialRef = arcpy.SpatialReference("WGS 1984")
result = arcpy.MakeXYEventLayer_management(tempTable,'LONGITUDE','LATITUDE',tempLayer,spatialRef)

#Intersect with region of interest
result = arcpy.CopyFeatures_management(tempLayer,outPdiv)

#Clean up
result = arcpy.Delete_management(tempLayer)
result = arcpy.Delete_management(tempTable)

#%% Write outputs
#------------------------------------------------------------------------------
#Make specific products, with yearly columns
#------------------------------------------------------------------------------
#Technology used
colProduct = 'SYSTEM'
colAggFunc = 'first'
outProdName = outSystem
dfSystem = product_generation(dfYearlyClip,colProduct,colAggFunc)
testNotNanSystem = numpy.logical_not(numpy.isnan(dfSystem))
result = product_write(dfSystem,outDB,outPdiv,outProdName)

#Source of water
colProduct = 'SOURCE_NUM'
colAggFunc = 'first'
outProdName = outSource
dfYearlyClip['SOURCE_NUM'] = [sourceNumDict[thisSource] for thisSource in dfYearlyClip['SOURCE']]
dfYearlyClip['SOURCE_NUM'] = dfYearlyClip['SOURCE_NUM'].fillna(0)
dfSource = product_generation(dfYearlyClip,colProduct,colAggFunc)
result = product_write(dfSource,outDB,outPdiv,outProdName)

#Crop type planted
colProduct = 'CROP_CODE'
colAggFunc = 'first'
outProdName = outCrops
dfCrops = product_generation(dfYearlyClip,colProduct,colAggFunc)
result = product_write(dfCrops,outDB,outPdiv,outProdName)

#Annual pumped volume
colProduct = 'AF_USED'
colAggFunc = 'sum'
outProdName = outVolume
dfVolume = product_generation(dfYearlyClip,colProduct,colAggFunc)
dfVolume[numpy.logical_and(numpy.isnan(dfVolume),testNotNanSystem)] = 0
result = product_write(dfVolume,outDB,outPdiv,outProdName)
testNanVol = numpy.isnan(dfVolume)

#Annual irrigated acres
colProduct = 'ACRES_IRR'
colAggFunc = 'sum'
outProdName = outAcres
dfAcres = product_generation(dfYearlyClip,colProduct,colAggFunc)
dfAcres[numpy.logical_and(numpy.isnan(dfAcres),testNotNanSystem)] = 0
result = product_write(dfAcres,outDB,outPdiv,outProdName)
testNanAcres = numpy.isnan(dfVolume)

#Calculate a derived product, write it out too
outProdName = outDepth
dfDepth = dfVolume / dfAcres
dfDepth = dfDepth.fillna(0)
dfDepth[numpy.isinf(dfDepth)] = 0
dfDepth[numpy.logical_or(testNanAcres,testNanVol)] = numpy.nan
result = product_write(dfDepth,outDB,outPdiv,outProdName)

#Save these out
store = pandas.HDFStore(os.path.join(outDir,outHDFStore))
store['system'] = dfSystem
store['source'] = dfSource
store['crops'] = dfCrops
store['volume'] = dfVolume
store['acres'] = dfAcres
store['depth'] = dfDepth
store.close()

#%% Read back in
#Alternately, read them in
store = pandas.HDFStore(os.path.join(outDir,outHDFStore))
dfSystem = store['system']
dfSource = store['source']
dfCrops = store['crops']
dfVolume = store['volume']
dfAcres = store['acres']
dfDepth = store['depth']
store.close()

##%% Make plots
##------------------------------------------------------------------------------
##Make specific plots, along with supporting dataframes
##------------------------------------------------------------------------------
##Set some defaults
#plot.rcParams['pdf.fonttype'] = 42 #truetype fonts
#
##This might be unecessary if I address is above, but delete the -99 column from each dataframe
#dfSystem = dfSystem.drop(-99,axis=1)
#dfCrops = dfCrops.drop(-99,axis=1)
#dfVolume = dfVolume.drop(-99,axis=1)
#dfAcres = dfAcres.drop(-99,axis=1)
#dfDepth = dfDepth.drop(-99,axis=1)
#
##Now, melt these dataframes back so that they can be merged
#dfSystem = pandas.melt(dfSystem.reset_index(),id_vars='PDIV_ID',value_name='SYSTEM')
#dfCrops = pandas.melt(dfCrops.reset_index(),id_vars='PDIV_ID',value_name='CROP_CODE')
#dfVolume = pandas.melt(dfVolume.reset_index(),id_vars='PDIV_ID',value_name='AF_USED')
#dfAcres = pandas.melt(dfAcres.reset_index(),id_vars='PDIV_ID',value_name='ACRES_IRR')
#dfDepth = pandas.melt(dfDepth.reset_index(),id_vars='PDIV_ID',value_name='IRR_DEPTH')
#
##Merge them into a single dataframe
#dfMerge = pandas.merge(dfSystem,dfCrops,how='outer',on=['PDIV_ID','WUA_YEAR'])
#dfMerge = dfMerge.merge(dfVolume,how='outer',on=['PDIV_ID','WUA_YEAR'])
#dfMerge = dfMerge.merge(dfAcres,how='outer',on=['PDIV_ID','WUA_YEAR'])
#dfMerge = dfMerge.merge(dfDepth,how='outer',on=['PDIV_ID','WUA_YEAR'])
#
##PLot of average depth of irrigation on corn and wheat by year
#dfGraphics = dfMerge.copy()
#dfGraphics = dfGraphics.groupby(['WUA_YEAR','CROP_CODE']).mean()
#dfGraphics = dfGraphics.drop(['PDIV_ID','SYSTEM','ACRES_IRR','AF_USED'],axis=1)
#dfGraphics = dfGraphics.reset_index()
#dfGraphics['IRR_DEPTH_mm'] = dfGraphics['IRR_DEPTH'] * 304.8
#dfGraphics = dfGraphics.loc[numpy.logical_or(dfGraphics['CROP_CODE']==2,dfGraphics['CROP_CODE']==5)] #corn is 2, wheat is 5
#seaborn.set_style('ticks',{'xtick.major.size':4,'xtick.direction':'in','ytick.major.size':4,'ytick.direction':'in'})
#figure= seaborn.lmplot(x='WUA_YEAR',y='IRR_DEPTH_mm',data=dfGraphics,hue='CROP_CODE',ci=False)
#figure.ax.spines['right'].set_visible(True)
#figure.ax.spines['top'].set_visible(True)
#figure.savefig(os.path.join(graphicsDir,'irrigated_depth_by_crop_type.pdf'))
#
##First, plot total irrigated acreage by year
#dfGraphics = dfMerge.copy()
#dfGraphics = dfGraphics.groupby('WUA_YEAR').sum()
#dfGraphics = dfGraphics.drop(['PDIV_ID','SYSTEM','CROP_CODE','IRR_DEPTH'],axis=1)
#dfGraphics.plot() #need to make this a lot fancier, and correct the units
#
#
##Second, plot irrigated acreage by system
#dfGraphics = dfMerge.copy()
#dfGraphics = dfGraphics.groupby(['WUA_YEAR','SYSTEM']).sum()
#dfGraphics = dfGraphics.drop(['PDIV_ID','CROP_CODE','IRR_DEPTH'],axis=1)
#dfAreaPlot = dfGraphics.copy()
#dfAreaPlot = dfGraphics.drop(['AF_USED'],axis=1).reset_index().set_index('WUA_YEAR')
#dfAreaPlot = dfAreaPlot.pivot(columns='SYSTEM',values='ACRES_IRR')
#dfAreaPlot = dfAreaPlot.drop([-99.0,2.0,5.0,7.0,8.0],axis=1)
#dfAreaPlot = dfAreaPlot[[1.0,6.0,3.0,4.0]] #reorder columns
#dfAreaPlot = dfAreaPlot[2:] #drop the first two years
#dfAreaPlot = dfAreaPlot * 0.40469/1e6 #convert to million ha
#figArea = dfAreaPlot.plot.area()
#figArea.set_ylabel('Irrigated Area (million ha)')
#figArea.set_xlabel('Year')
#figArea.axes.get_xaxis().set_tick_params(direction='in')
#figArea.axes.get_yaxis().set_tick_params(direction='in')
#figArea.figure.savefig(os.path.join(graphicsDir,'acres_irrigated_by_system.pdf'))
#
##test = seaborn.FacetGrid(data=dfGraphics.reset_index(),hue='SYSTEM')
##test = test.map(plot.stackplot,'WUA_YEAR','ACRES_IRR').add_legend()
##test.savefig(os.path.join(graphicsDir,'acres_irrigated_by_system.pdf'))
#
##Third, plot average depth by system
#dfGraphics['IRR_DEPTH'] = dfGraphics['AF_USED']/dfGraphics['ACRES_IRR']
#test = seaborn.FacetGrid(data=dfGraphics.reset_index(),hue='SYSTEM')
#test = test.map(plot.plot,'WUA_YEAR','IRR_DEPTH').add_legend()
#test.savefig(os.path.join(graphicsDir,'average_depth_by_system.pdf'))
#
##Fourth, plot average depth relative to that of LEPA for that year
#dfBaseDepth = dfGraphics.copy().reset_index().set_index('WUA_YEAR')
#dfBaseDepth = dfBaseDepth[dfBaseDepth['SYSTEM']==3]
#dfBaseDepth['BASE_DEPTH'] = dfBaseDepth['IRR_DEPTH']
#dfBaseDepth = dfBaseDepth.drop(['SYSTEM','AF_USED','ACRES_IRR','IRR_DEPTH'],axis=1).reset_index()
#dfGraphics = dfGraphics.reset_index()
#dfGraphics = dfGraphics.merge(dfBaseDepth,on='WUA_YEAR',how='left')
#dfGraphics['REL_DEPTH'] = dfGraphics['IRR_DEPTH']/dfGraphics['BASE_DEPTH']
#test = dfGraphics.groupby(['SYSTEM']).mean()
